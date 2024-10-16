import * as path from 'path';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { AuthorizationType } from 'aws-cdk-lib/aws-apigateway';
import { BaseService } from 'aws-cdk-lib/aws-ecs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { Constants } from './constants';
import { DiscordStateMachine } from './discord-state-machine';
import { DiscordBotCustomResource } from './discord_bot_custom_resource';

export interface DiscordBotOptions {
  commandName: string;
  secretName: string;
}

export interface DiscordBotConstructProps {
  service: BaseService;
  botOptions: DiscordBotOptions;
}

export class DiscordBotConstruct extends Construct {
  constructor(scope: Construct, id: string, props: DiscordBotConstructProps) {
    super(scope, id);

    const secret = Secret.fromSecretNameV2(this, 'SecretLookup', props.botOptions.secretName);

    new DiscordBotCustomResource(this, 'DiscordBotSetup', {
      commandName: props.botOptions.commandName,
      secret,
    });

    const f = new Function(this, 'DiscordBotFunction', {
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
      handler: 'discord.handler',
      tracing: Tracing.ACTIVE,
      environment: {
        CLUSTER_ARN: props.service.cluster.clusterArn,
        SERVICE_ARN: props.service.serviceArn,
        SECRET_NAME: secret.secretName,
      },
      initialPolicy: [
        new PolicyStatement({
          actions: ['ecs:DescribeServices', 'ecs:UpdateService'],
          resources: [props.service.serviceArn],
        }),
      ],
    });

    secret.grantRead(f);

    new ApiGatewayToLambda(this, 'DiscordBotListener', {
      existingLambdaObj: f,
      apiGatewayProps: {
        defaultMethodOptions: {
          authorizationType: AuthorizationType.NONE,
        },
      },
    });

    const dsm = new DiscordStateMachine(this, 'DiscordBotStateMachine', {
      service: props.service,
      discordSecret: secret,
    });

    dsm.grantStartExecution(f);
    f.addEnvironment('STATE_MACHINE', dsm.stateMachineArn);
  }
}
