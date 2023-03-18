import { PublicIPSupport } from '@raykrueger/cdk-fargate-public-dns';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as efs from 'aws-cdk-lib/aws-efs';
import { Construct } from 'constructs';
import * as shutdown from './auto_shutdown';
import { DiscordBotConstruct } from './discord';

const DEFAULT_VCPU = 2048;
const DEFAULT_MEMORY = 8192;

export { AutoShutdownProps } from './auto_shutdown';

export interface DiscordCommandOptions {
  readonly commandName: string;
  readonly secretName: string;
}

export interface GamePort {
  readonly protocol: ecs.Protocol;
  readonly portNumber: number;
}

export interface DomainProps {
  readonly assumedRole?: string;
  readonly hostzedZone: string;
  readonly domainName: string;
}

export interface GameServerProps {

  /**
   * Do we want to enable Cloudwatch Container Insights, and incur additional cost?
   *
   * @default false
   */
  readonly containerInsights?: boolean;

  /**
   * Provide an existing VPC to deploy into. If none is given a default `ec2.VPC` will be created.
   */
  readonly vpc?: ec2.IVpc;

  /**
   * vCpu amout to be granted to ECS Fargate task.
   *
   * @see https://aws.amazon.com/fargate/pricing/
   * @default DEFAULT_VCPU
   */
  readonly cpu?: number;

  /**
   * Memory limit in 1024 incrmements.
   * @see https://aws.amazon.com/fargate/pricing/
   * @default DEFAULT_VCPU
   */
  readonly memoryLimitMiB?: number;

  /**
   * Logging driver to use. The Cloudwatch logging driver will incur addtional costs.
   *
   * @example logging: new ecs.AwsLogDriver({ streamPrefix: 'EventDemo' })
   *
   * @default undefined
   */
  readonly logging?: ecs.LogDriver;

  /**
   * The container image to run.
   */
  readonly image: ecs.ContainerImage;

  readonly dnsConfig?: DomainProps;
  readonly autoShutdownConfig?: shutdown.AutoShutdownProps;
  readonly discord?: DiscordCommandOptions;
  readonly mountTarget: string;
  readonly gamePorts: GamePort[];
  readonly additionalArgs?: string[];
  readonly containerEnv?: { [key: string]: string };
}

/**
 * Builds a game server, running on ECS Fargate. This is designed to run as
 * cheaply as possible, which means some availability and reliability has been
 * sacrificed.
 *
 * Default configuration:
 *    Single AZ with a Single Public Subnet
 *    Fargate Spot capacity provider
 *    EFS General performance file system for storage
 */
export class GameServer extends Construct {

  //Offer properties for things we may have created
  readonly vpc?: ec2.IVpc;
  readonly cpu: number;
  readonly memoryLimitMiB: number;
  readonly image: ecs.ContainerImage;
  readonly containerInsights: boolean;
  readonly logging?: ecs.LogDriver;
  readonly dnsConfig?: DomainProps;
  readonly autoShutdownConfig?: shutdown.AutoShutdownProps;
  readonly discord?: DiscordCommandOptions;
  readonly mountTarget: string;
  readonly gamePorts: GamePort[];
  readonly additionalArgs?: string[];
  readonly steamArgs?: string;

  readonly containerEnv: { [key: string]: string };


  constructor(scope: Construct, id: string, props: GameServerProps) {
    super(scope, id);

    if (!this.vpc) {
      //Setup some defaults
      /**
       * Default VPC is designed to make this as cheap as possible.
       * The default vpc includes only public subnets.
       * This avoids the cost of the nat gateway used in private subnets
       */
      this.vpc = props.vpc || new ec2.Vpc(this, 'VPC', {
        subnetConfiguration: [
          {
            name: 'Public',
            subnetType: ec2.SubnetType.PUBLIC,
          },
        ],
      });
    }

    this.cpu = props.cpu || DEFAULT_VCPU;
    this.memoryLimitMiB = props.memoryLimitMiB || DEFAULT_MEMORY;
    this.image = props.image;
    this.containerInsights = !!props.containerInsights;
    this.logging = props.logging;
    this.dnsConfig = props.dnsConfig;
    this.autoShutdownConfig = props.autoShutdownConfig;
    this.discord = props.discord;
    this.mountTarget = props.mountTarget;
    this.gamePorts = props.gamePorts;
    this.additionalArgs = props.additionalArgs;
    this.containerEnv = props.containerEnv || {};

    //Define our EFS file system
    const fs = new efs.FileSystem(this, 'GameFileSystem', {
      vpc: this.vpc,
      encrypted: true,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      removalPolicy: RemovalPolicy.RETAIN,
      enableAutomaticBackups: true,
    });

    fs.addAccessPoint('AccessPoint');

    //Create our ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: this.vpc,
      containerInsights: this.containerInsights,
      enableFargateCapacityProviders: true,
    });

    //Create our ECS TaskDefinition using our cpu and memory limits
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: this.cpu,
      memoryLimitMiB: this.memoryLimitMiB,
      ephemeralStorageGiB: 40,
    });

    //Add our EFS volume to the task definition so it can be used as a mount point later
    taskDef.addVolume({
      name: 'efsVolume',
      efsVolumeConfiguration: {
        fileSystemId: fs.fileSystemId,
      },
    });


    /**
         * Add our container definition, map the ports, and setup our
         * mount point so that game saves our world to EFS
         */
    const containerDef = taskDef.addContainer('server', {
      image: this.image,
      logging: this.logging,
      command: this.additionalArgs,
      environment: this.containerEnv,
    });

    containerDef.addMountPoints({ sourceVolume: 'efsVolume', containerPath: this.mountTarget, readOnly: false });

    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: this.vpc,
    });

    this.gamePorts.forEach(gp => {
      containerDef.addPortMappings({ containerPort: gp.portNumber, hostPort: gp.portNumber, protocol: gp.protocol });
      const ec2Port = gp.protocol == ec2.Protocol.UDP ? ec2.Port.udp(gp.portNumber) : ec2.Port.tcp(gp.portNumber);
      securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2Port);
    });

    //Super important! Tell EFS to allow this SecurityGroup in to access the filesystem
    fs.connections.allowDefaultPortFrom(securityGroup);

    /**
         * Now we create our Fargate based service to run the game server
         * FargatePlatformVerssion VERSION1_4 or greater is required here!
         */
    const service = new ecs.FargateService(this, 'Service', {
      cluster: cluster,
      taskDefinition: taskDef,
      propagateTags: ecs.PropagatedTagSource.TASK_DEFINITION,
      desiredCount: 1,
      securityGroups: [securityGroup],
      platformVersion: ecs.FargatePlatformVersion.LATEST,
      assignPublicIp: true,
      maxHealthyPercent: 100,
      minHealthyPercent: 0,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 2,
        },
        {
          capacityProvider: 'FARGATE',
          weight: 1,
        },
      ],
    });

    if (this.dnsConfig) {
      new PublicIPSupport(this, 'PublicIPSupport', {
        cluster,
        service,
        dnsConfig: this.dnsConfig,
      });
    }

    new shutdown.AutoShutdown(this, 'AutoShutdown', this.autoShutdownConfig).addService(service);

    if (this.discord) {
      new DiscordBotConstruct(this, 'DiscordBot', {
        service,
        botOptions: this.discord,
      });
    }
  }
}