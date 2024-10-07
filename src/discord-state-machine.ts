import * as path from 'path';
import { BaseService, ICluster } from 'aws-cdk-lib/aws-ecs';
import { Grant, IGrantable } from 'aws-cdk-lib/aws-iam';
import { Code, Function } from 'aws-cdk-lib/aws-lambda';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Choice, Condition, DefinitionBody, Pass, Result, StateMachine, Succeed } from 'aws-cdk-lib/aws-stepfunctions';
import { CallAwsService, LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Constants } from './constants';

//new StateMachine(scope: Construct, id: string, props: StateMachineProps)

export interface DiscordStateMachineProps {
  service: BaseService;
  discordSecret: ISecret;
}

export class DiscordStateMachine extends Construct {

  private readonly service: BaseService;
  private readonly cluster: ICluster;
  private readonly stateMachine: StateMachine;
  readonly stateMachineArn: string;

  constructor(scope: Construct, id: string, props: DiscordStateMachineProps) {
    super(scope, id);

    this.service = props.service;
    this.cluster = this.service.cluster;

    const responseFunction = new Function(this, 'DiscordResponse', {
      runtime: Constants.LAMBDA_RUNTIME,
      architecture: Constants.LAMBDA_ARCH,
      code: Code.fromAsset(path.join(__dirname, '../resources/functions/discord'), {
        bundling: {
          image: Constants.LAMBDA_RUNTIME.bundlingImage,
          platform: Constants.LAMBDA_ARCH.dockerPlatform,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
          ],
        },
      }),
      handler: 'discord_response.handle',
      environment: {
        SECRET_NAME: props.discordSecret.secretName,
      },
    });
    props.discordSecret.grantRead(responseFunction);

    const success = new Succeed(this, 'Success');

    const sendDiscordResponse = new LambdaInvoke(this, 'SendResponse', {
      lambdaFunction: responseFunction,
    }).next(success);

    const serverIsUpMessage = new Pass(this, 'ServerIsUpMessage', {
      result: Result.fromObject({ Message: 'Server is up.' }),
      resultPath: '$.Discord',
    }).next(sendDiscordResponse);

    const serverIsDownMessage = new Pass(this, 'ServerIsDownMessage', {
      result: Result.fromObject({ Message: 'Server is down.' }),
      resultPath: '$.Discord',
    }).next(sendDiscordResponse);

    const wutMessage = new Pass(this, 'WutMessage', {
      result: Result.fromObject({ Message: 'Wut?' }),
      resultPath: '$.Discord',
    }).next(sendDiscordResponse);

    const serverStartingMessage = new Pass(this, 'ServerStartingMessage', {
      result: Result.fromObject({ Message: 'Server is starting up! Give it 10 minutes or so.' }),
      resultPath: '$.Discord',
    }).next(sendDiscordResponse);

    const describeServices = new CallAwsService(this, 'DescribeServices', {
      service: 'ecs',
      action: 'describeServices',
      parameters: {
        Cluster: this.cluster.clusterArn,
        Services: [this.service.serviceArn],
      },
      iamResources: [this.service.serviceArn],
      resultSelector: {
        'RunningCount.$': '$.Services[0].RunningCount',
        'DesiredCount.$': '$.Services[0].DesiredCount',
      },
      resultPath: '$.Service',
    }).next(
      new Choice(this, 'DescribeServicesChoice')
        .when(Condition.numberGreaterThan('$.Service.RunningCount', 0), serverIsUpMessage)
        .otherwise(serverIsDownMessage),
    );

    const startService = this.updateService('StartService', 1).next(
      new Choice(this, 'StartServiceChoice')
        .when(Condition.numberGreaterThan('$.Service.RunningCount', 0), serverIsUpMessage)
        .otherwise(serverStartingMessage),
    );

    const stopService = this.updateService('StopService', 0).next(describeServices);

    const subCommandChoice = new Choice(this, 'SubCommandChoice')
      .when(Condition.stringEquals('$.SubCommand', 'status'), describeServices)
      .when(Condition.stringEquals('$.SubCommand', 'start'), startService)
      .when(Condition.stringEquals('$.SubCommand', 'stop'), stopService)
      .otherwise(wutMessage);

    this.stateMachine = new StateMachine(this, 'StateMachine', {
      definitionBody: DefinitionBody.fromChainable(subCommandChoice),
    });

    this.stateMachineArn = this.stateMachine.stateMachineArn;
  }

  grantStartExecution(identity: IGrantable): Grant {
    return this.stateMachine.grantStartExecution(identity);
  }

  private updateService(id: string, desiredCount: number): CallAwsService {
    return new CallAwsService(this, id, {
      service: 'ecs',
      action: 'updateService',
      parameters: {
        Cluster: this.cluster.clusterArn,
        Service: this.service.serviceArn,
        DesiredCount: desiredCount,
      },
      iamResources: [this.service.serviceArn],
      resultSelector: {
        'DesiredCount.$': '$.Service.DesiredCount',
        'RunningCount.$': '$.Service.RunningCount',
      },
      resultPath: '$.Service',
    });
  }
}
