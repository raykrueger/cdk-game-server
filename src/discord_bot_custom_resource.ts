import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { CustomResource, RemovalPolicy } from 'aws-cdk-lib';
import { Architecture, Code, Function } from 'aws-cdk-lib/aws-lambda';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { Constants } from './constants';

export interface DiscordBotCustomResourceProps {
  secret: ISecret;
  commandName: string;
}

export class DiscordBotCustomResource extends Construct {

  constructor(scope: Construct, id: string, props: DiscordBotCustomResourceProps) {
    super(scope, id);

    //This 'version' concept is to force an update to the custom resource if we change the event handler function
    const hash = crypto.createHash('sha256');
    const body = fs.readFileSync(path.join(__dirname, '../resources/functions/discord_provider/discord_provider.py'), 'utf8');
    const version = hash.update(body).digest('hex');

    const commandName = props.commandName;

    const secret = props.secret;

    const code = Code.fromAsset(path.join(__dirname, '../resources/functions/discord_provider'), {
      bundling: {
        image: Constants.LAMBDA_RUNTIME.bundlingImage,
        command: [
          'bash', '-c',
          'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
        ],
      },
    });

    const f = new Function(this, 'DiscordBotCRHandler', {
      runtime: Constants.LAMBDA_RUNTIME,
      architecture: Architecture.ARM_64,
      code,
      handler: 'discord_provider.on_event',
      environment: {
        COMMAND_NAME: commandName,
        SECRET_NAME: secret.secretName,
      },
    });

    secret.grantRead(f);

    const provider = new Provider(this, 'DiscordBotCRProvider', {
      onEventHandler: f,
    });

    new CustomResource(this, 'DiscordBotCR', {
      serviceToken: provider.serviceToken,
      removalPolicy: RemovalPolicy.DESTROY,
      properties: {
        version: version,
      },
    });


  }
}
