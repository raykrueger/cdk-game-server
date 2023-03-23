import * as fs from 'fs';
import * as path from 'path';
import { StateMachine } from '@matthewbonig/state-machine';
import { BaseService } from 'aws-cdk-lib/aws-ecs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

//new StateMachine(scope: Construct, id: string, props: StateMachineProps)

export interface DiscordStateMachineProps {
  service: BaseService;
  discordSecret: ISecret;
}

export class DiscordStateMachine extends Construct {

  readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: DiscordStateMachineProps) {
    super(scope, id);

    const f = new Function(this, 'DiscordResponse', {
      code: Code.fromAsset(path.join(__dirname, '../resources/functions/discord'), {
        bundling: {
          image: Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
          ],
        },
      }),
      handler: 'discord_response.handle',
      runtime: Runtime.PYTHON_3_9,
      environment: {
        SECRET_NAME: props.discordSecret.secretName,
      },
    });
    props.discordSecret.grantRead(f);


    const sm = new StateMachine(this, 'DiscordStateMachine', {
      definition: JSON.parse(fs.readFileSync(path.join(__dirname, 'discord-bot-asl.json'), 'utf8').toString()),
      overrides: {
        DescribeServices: {
          Parameters: {
            Cluster: props.service.cluster.clusterArn,
            Services: [
              props.service.serviceArn,
            ],
          },
        },
        UpdateService: {
          Parameters: {
            Cluster: props.service.cluster.clusterArn,
            Service: props.service.serviceArn,
            DesiredCount: 1,
          },
        },
        SendDiscordResponse: {
          Parameters: {
            FunctionName: f.functionArn,
          },
        },
      },
    });

    sm.addToRolePolicy(new PolicyStatement({
      actions: ['ecs:DescribeServices', 'ecs:UpdateService'],
      resources: [props.service.serviceArn],
    }));

    f.grantInvoke(sm.grantPrincipal);

    this.stateMachine = sm;

  }
}