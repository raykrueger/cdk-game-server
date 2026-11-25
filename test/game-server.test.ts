import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ContainerImage, Protocol } from 'aws-cdk-lib/aws-ecs';
import { GameServer, GameServerProps } from '../src';

/**
 * The GameServer bundles its Python Lambdas with Docker (Code.fromAsset with a
 * `bundling` block), which GitHub Actions runners cannot do -- the actions user
 * has no permission on /var/run/docker.sock.
 *
 * `aws:cdk:bundling-stacks: []` tells the asset stage to skip bundling for every
 * stack, so the asset is staged unbundled and no Docker is ever invoked. The
 * resulting template is identical either way: the bundle only affects Lambda
 * code bytes, not the resource graph we assert on here.
 */
function synth(props: Partial<GameServerProps> = {}, id = 'Game'): Template {
  const app = new App({ context: { 'aws:cdk:bundling-stacks': [] } });
  const stack = new Stack(app, 'TestStack');

  new GameServer(stack, id, {
    image: ContainerImage.fromRegistry('example/game-server'),
    gamePorts: [{ portNumber: 7777, protocol: Protocol.UDP }],
    mountTarget: { mountTarget: '/home/steam/Saved' },
    ...props,
  } as GameServerProps);

  return Template.fromStack(stack);
}

describe('GameServer', () => {
  test('synthesizes the cheap-by-default shape', () => {
    const template = synth();

    // one VPC, public subnets only (no NAT gateway, that is the whole point)
    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.resourceCountIs('AWS::EC2::InternetGateway', 1);
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
    template.hasResourceProperties('AWS::ECS::Cluster', {});
    template.hasResourceProperties('AWS::ECS::ClusterCapacityProviderAssociations', {
      CapacityProviders: ['FARGATE', 'FARGATE_SPOT'],
    });
    template.resourceCountIs('AWS::EFS::FileSystem', 1);
    template.resourceCountIs('AWS::EFS::AccessPoint', 1);
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
    template.resourceCountIs('AWS::ECS::Service', 1);

    expect(template.toJSON()).toMatchSnapshot();
  });

  test('keeps game saves durable: EFS is encrypted, backed up and retained', () => {
    const template = synth();

    template.hasResourceProperties('AWS::EFS::FileSystem', {
      Encrypted: true,
      PerformanceMode: 'generalPurpose',
      BackupPolicy: { Status: 'ENABLED' },
    });
    // RETAIN: destroying the stack must not destroy anybody's world save.
    const fileSystem = Object.values(template.findResources('AWS::EFS::FileSystem'))[0];
    expect(fileSystem.DeletionPolicy).toEqual('Retain');
    expect(fileSystem.UpdateReplacePolicy).toEqual('Retain');
  });

  test('mounts the access point at the game save path with a writable POSIX acl', () => {
    const template = synth({ mountTarget: { mountTarget: '/saves', aclUserId: 1001, aclGroupId: 1002 } });

    // CDK puts the ACL on RootDirectory.CreationInfo; there is deliberately no
    // PosixUser, so the task can also write outside /data via the access point.
    template.hasResourceProperties('AWS::EFS::AccessPoint', {
      RootDirectory: {
        Path: '/data',
        CreationInfo: { OwnerUid: '1001', OwnerGid: '1002', Permissions: '755' },
      },
    });

    const taskDef = template.findResources('AWS::ECS::TaskDefinition');
    const props = Object.values(taskDef)[0].Properties;
    expect(props.Volumes).toEqual([
      expect.objectContaining({
        Name: 'efsVolume',
        EFSVolumeConfiguration: expect.objectContaining({
          TransitEncryption: 'ENABLED',
          AuthorizationConfig: expect.objectContaining({ IAM: 'ENABLED' }),
        }),
      }),
    ]);
    expect(props.ContainerDefinitions[0].MountPoints).toEqual([
      { ContainerPath: '/saves', ReadOnly: false, SourceVolume: 'efsVolume' },
    ]);
  });

  test('defaults to 2 vCPU / 8 GiB Fargate with 40 GiB of task storage', () => {
    const template = synth();

    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '2048',
      Memory: '8192',
      RequiresCompatibilities: ['FARGATE'],
      EphemeralStorage: { SizeInGiB: 40 },
    });
    template.hasResourceProperties('AWS::ECS::Service', {
      DesiredCount: 1,
      PropagateTags: 'TASK_DEFINITION',
      PlatformVersion: 'LATEST',
      DeploymentConfiguration: { MaximumPercent: 100, MinimumHealthyPercent: 0 },
    });
  });

  test('honours explicit cpu and memory', () => {
    const template = synth({ cpu: 4096, memoryLimitMiB: 16384 });
    template.hasResourceProperties('AWS::ECS::TaskDefinition', { Cpu: '4096', Memory: '16384' });
  });

  test('favour Fargate Spot, but never rely on it', () => {
    const template = synth();
    template.hasResourceProperties('AWS::ECS::Service', {
      CapacityProviderStrategy: [
        { CapacityProvider: 'FARGATE_SPOT', Weight: 20 },
        { CapacityProvider: 'FARGATE', Weight: 10 },
      ],
    });
  });

  test('useSpot: false drops the spot weight to zero', () => {
    const template = synth({ useSpot: false });
    template.hasResourceProperties('AWS::ECS::Service', {
      CapacityProviderStrategy: [
        { CapacityProvider: 'FARGATE_SPOT', Weight: 0 },
        { CapacityProvider: 'FARGATE', Weight: 10 },
      ],
    });
  });

  test('opens exactly one security group rule per game port, from anywhere', () => {
    const template = synth({
      gamePorts: [
        { portNumber: 7777, protocol: Protocol.UDP },
        { portNumber: 15000, protocol: Protocol.UDP },
        { portNumber: 27015, protocol: Protocol.TCP },
      ],
    });

    // Game ports land inline on the service security group.
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: [
        { CidrIp: '0.0.0.0/0', Description: 'from 0.0.0.0/0:UDP 7777', FromPort: 7777, ToPort: 7777, IpProtocol: 'udp' },
        { CidrIp: '0.0.0.0/0', Description: 'from 0.0.0.0/0:UDP 15000', FromPort: 15000, ToPort: 15000, IpProtocol: 'udp' },
        { CidrIp: '0.0.0.0/0', Description: 'from 0.0.0.0/0:27015', FromPort: 27015, ToPort: 27015, IpProtocol: 'tcp' },
      ],
    });
    // one for the game, one for EFS
    template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
    // and the EFS mount target is reachable from it on 2049 -- without this the
    // task mounts nothing and the game silently loses its saves.
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 2049,
      ToPort: 2049,
      Description: Match.stringLikeRegexp('from .*SecurityGroup.*:2049'),
    });
  });

  test('shuts the service down after it has been idle', () => {
    const template = synth();

    // default: <5% CPU for 6 x 5 minute periods
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Threshold: 5,
      EvaluationPeriods: 6,
      ComparisonOperator: 'LessThanThreshold',
      Namespace: 'AWS/ECS',
      MetricName: 'CPUUtilization',
    });
    // alarm -> SNS -> Lambda that sets desiredCount to 0
    template.resourceCountIs('AWS::SNS::Topic', 1);
    template.hasResourceProperties('AWS::SNS::Subscription', { Protocol: 'lambda' });
    template.hasResourceProperties('AWS::Lambda::Function', { Handler: 'autoshutdown.handler' });
    template.hasResourceProperties('AWS::IAM::Policy', Match.objectLike({
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({ Action: 'ecs:UpdateService', Effect: 'Allow' }),
        ]),
      }),
    }));
    // the task role gets the EFS client permissions, and nothing broader
    template.hasResourceProperties('AWS::IAM::Policy', Match.objectLike({
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['elasticfilesystem:ClientWrite', 'elasticfilesystem:ClientMount']),
          }),
        ]),
      }),
    }));
  });

  test('autoShutdownConfig retunes the alarm', () => {
    const template = synth({ autoShutdownConfig: { cpuUtilizationMin: 1, evaluationPeriods: 3 } });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', { Threshold: 1, EvaluationPeriods: 3 });
  });

  test('wires up the Discord bot only when asked', () => {
    const without = synth();
    without.resourceCountIs('AWS::StepFunctions::StateMachine', 0);
    without.resourceCountIs('AWS::ApiGateway::RestApi', 0);

    const withBot = synth({ discord: { commandName: 'game', secretName: 'GameBotSecret' } });
    withBot.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    withBot.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    withBot.hasResourceProperties('AWS::Lambda::Function', { Handler: 'discord.handler' });
    // the state machine authenticates to Discord through one Secrets-backed connection
    withBot.resourceCountIs('AWS::Events::Connection', 1);
  });

  test('keeps the cluster insights setting off by default and on when asked', () => {
    expect(clusterSettings(synth())).toEqual([{ Name: 'containerInsights', Value: 'disabled' }]);
    expect(clusterSettings(synth({ containerInsights: true }))).toEqual([{ Name: 'containerInsights', Value: 'enabled' }]);
  });
});

function clusterSettings(template: Template) {
  return Object.values(template.findResources('AWS::ECS::Cluster'))[0].Properties.ClusterSettings;
}
