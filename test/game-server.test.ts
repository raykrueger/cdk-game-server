import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ContainerImage, AwsLogDriver, Protocol } from 'aws-cdk-lib/aws-ecs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { GameServer } from '../src';


class GameStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new GameServer(this, 'Satisfactory', {
      cpu: 4096,
      memoryLimitMiB: 16384,
      image: ContainerImage.fromRegistry('raykrueger/satisfactory-dedicated-server'),
      discord: {
        commandName: 'satisfactory',
        secretName: 'Discord',
      },
      logging: new AwsLogDriver({
        streamPrefix: 'SatisfactoryLogs',
        logRetention: RetentionDays.THREE_DAYS,
      }),
      dnsConfig: {
        domainName: 'satisfactory.example.com',
        hostzedZone: 'xxxxxxxxxxxxxxxxxxxx',
        assumedRole: 'arn:aws:iam::1234567890:role/assumed-role',
      },
      gamePorts: [
        { portNumber: 7777, protocol: Protocol.UDP },
        { portNumber: 15000, protocol: Protocol.UDP },
        { portNumber: 15777, protocol: Protocol.UDP },
      ],
      mountTarget: '/home/steam/.config/Epic/FactoryGame/Saved/SaveGames',
    });
  }
}

function buildStack(): cdk.Stack {
  const app = new cdk.App();
  return new GameStack(app, 'Test');
}

// This does not work in github actions as the stack requires docker to build the Python lambdas.
// Currently github actions fails because the actions user doesn't have permission on the docker socket
// docker: permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Post "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/containers/create": dial unix /var/run/docker.sock: connect: permission denied.
// Usermod didn't help
// Until I can fix this I'll test locally
test('Function with no assumed role', () => {
  /*
  const stack = buildStack();
  const template = Template.fromStack(stack);
  template.hasResourceProperties('AWS::ECS::Cluster', {});
  */
});