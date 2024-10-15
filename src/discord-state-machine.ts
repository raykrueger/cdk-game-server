import * as path from 'path';
import { SecretValue } from 'aws-cdk-lib';
import { BaseService, ICluster } from 'aws-cdk-lib/aws-ecs';
import { Authorization, Connection } from 'aws-cdk-lib/aws-events';
import { Grant, IGrantable, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function } from 'aws-cdk-lib/aws-lambda';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Choice, Condition, CustomState, DefinitionBody, JsonPath, StateMachine, Succeed } from 'aws-cdk-lib/aws-stepfunctions';
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Constants } from './constants';

interface DiscordInteractionStateProps {
  connection: Connection;
  message: string;
}

class DiscordInteractionState extends CustomState {
  constructor(scope: Construct, id: string, props: DiscordInteractionStateProps) {
    super(scope, id, {
      stateJson: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          'ApiEndpoint.$': JsonPath.format('https://discord.com/api/v10/interactions/{}/{}/callback', JsonPath.stringAt('$.InteractionId'), JsonPath.stringAt('$.InteractionToken')),
          'Method': 'POST',
          'Authentication': {
            ConnectionArn: props.connection.connectionArn,
          },
          'RequestBody': {
            type: 4,
            data: {
              content: props.message,
            },
          },
        },
        ResultPath: null,
      },
    });
  }
}

interface DiscordUpdateStateProps extends DiscordInteractionStateProps {
  appId: SecretValue;
}

class DiscordUpdateState extends CustomState {
  constructor(scope: Construct, id: string, props: DiscordUpdateStateProps) {
    super(scope, id, {
      stateJson: {
        Type: 'Task',
        Resource: 'arn:aws:states:::http:invoke',
        Parameters: {
          'ApiEndpoint.$': JsonPath.format(`https://discord.com/api/v10/webhooks/${props.appId.unsafeUnwrap()}/{}/messages/@original`, JsonPath.stringAt('$.InteractionToken')),
          'Method': 'PATCH',
          'Authentication': {
            ConnectionArn: props.connection.connectionArn,
          },
          'RequestBody': {
            content: props.message,
          },
        },
        ResultPath: null,
      },
    });
  }
}

export interface DiscordStateMachineProps {
  service: BaseService;
  discordSecret: ISecret;
}

export class DiscordStateMachine extends Construct {

  private readonly service: BaseService;
  private readonly cluster: ICluster;
  private readonly stateMachine: StateMachine;
  readonly stateMachineArn: string;
  private readonly connection: Connection;
  private readonly responseFunction: Function;
  private readonly appId: SecretValue;

  constructor(scope: Construct, id: string, props: DiscordStateMachineProps) {
    super(scope, id);

    this.service = props.service;
    this.cluster = this.service.cluster;
    this.appId = props.discordSecret.secretValueFromJson('AppId');

    this.connection = new Connection(this, 'Connection', {
      authorization: Authorization.apiKey('Authorization', props.discordSecret.secretValueFromJson('Authorization')),
      description: 'Discord bot API Connection',
    });

    this.responseFunction = new Function(this, 'DiscordResponse', {
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
    props.discordSecret.grantRead(this.responseFunction);

    const success = new Succeed(this, 'Success');

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
        .when(Condition.numberGreaterThan('$.Service.RunningCount', 0), this.updateResponseMessage('ServerIsUp', 'The server is up!').next(success))
        .otherwise(this.updateResponseMessage('ServerIsDown', 'The Server is down.').next(success)),
    );

    const startService = this.updateService('StartService', 1).next(
      new Choice(this, 'StartServiceChoice')
        .when(Condition.numberGreaterThan('$.Service.RunningCount', 0), this.updateResponseMessage('StartServiceUp', 'The server is already running!').next(success))
        .otherwise(this.updateResponseMessage('StartServiceStarting', 'The Server is starting up!').next(success)),
    );

    const stopService = this.updateService('StopService', 0).next(describeServices);

    const subCommandChoice = new Choice(this, 'SubCommandChoice')
      .when(Condition.stringEquals('$.SubCommand', 'status'), this.newInitialResponse('DescribeResponse', 'Checking the server...').next(describeServices))
      .when(Condition.stringEquals('$.SubCommand', 'start'), this.newInitialResponse('StartServiceResponse', 'Starting the server...').next(startService))
      .when(Condition.stringEquals('$.SubCommand', 'stop'), this.newInitialResponse('StopServiceResponse', 'Stopping the server...').next(stopService))
      .otherwise(this.newInitialResponse('WutMessage', 'Wut?'));

    this.stateMachine = new StateMachine(this, 'StateMachine', {
      definitionBody: DefinitionBody.fromChainable(subCommandChoice),
      tracingEnabled: true,
    });

    this.stateMachineArn = this.stateMachine.stateMachineArn;

    this.stateMachine.role.attachInlinePolicy(
      new Policy(this, 'HttpPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['states:InvokeHTTPEndpoint'],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'states:HTTPMethod': ['POST', 'PATCH'],
              },
              StringLike: {
                'states:HTTPEndpoint': 'https://discord.com/api/*',
              },
            },
          }),

          new PolicyStatement({
            actions: ['events:RetrieveConnectionCredentials'],
            resources: [
              this.connection.connectionArn,
            ],
          }),

          new PolicyStatement({
            actions: [
              'secretsmanager:GetSecretValue',
              'secretsmanager:DescribeSecret',
            ],
            resources: [
              'arn:aws:secretsmanager:*:*:secret:events!connection/*',
            ],
          }),

        ],
      }),
    );
  }

  grantStartExecution(identity: IGrantable): Grant {
    return this.stateMachine.grantStartExecution(identity);
  }

  private updateResponseMessage(id: string, message: string) {
    return new DiscordUpdateState(this, id, {
      appId: this.appId,
      connection: this.connection,
      message: message,
    });
  }

  private newInitialResponse(id: string, message: string = 'Thinking') {
    return new DiscordInteractionState(this, id, {
      connection: this.connection,
      message: message,
    });
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
