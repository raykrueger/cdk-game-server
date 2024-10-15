# cdk-game-server

This AWS CDK Construct Library is designed to run dedicated game servers on
Amazon Elastic Container Service (Amazon ECS) and AWS Fargate as cheaply as
possible. However, it **will not** be free.

The simple description is we run a single instance of a game server container on
AWS Fargate. We scale the desired tasks to 0 if the CPU utilization drops below
5% for 30 minutes. We use a Discord /slash command to start the server when you
want to play. We deploy no Load Balancers, we rely on public IP addresses.

A slightly deeper description... We keep costs down by making a few
architectural decisions. Firstly, we are going to use a VPC with only public
subnets (similar to the default VPC in a new account). This eliminates the use
of NAT Gateways in a _proper_ VPC. Secondly, we do not deploy any load balancers
and simply expose the Fargate task with a public IP Address. The
[cdk-fargate-public-dns](https://github.com/raykrueger/cdk-fargate-public-dns)
library is used to add optional DNS updates for the Fargate public IP address.
Thirdly, we deploy a Cloudwatch Alarm that triggers if CPU Utilization falls
below 5% (configurable). The action for that alarm is an AWS Lambda function
(via an Amazon SNS Topic) that sets the desired tasks on the ECS Service to 0.
Game servers will have an EFS Filesystem created that is mounted game save data.
**Note** that game server files should be stored __in__ the container, and not
on EFS. Files inside the container are basically free as far as Fargate is
concerned. Storing files on EFS is not free, so we only mount the save game
paths. Finally, and optionally, a Discord slash command bot is deployed via AWS
Step Functions and AWS Lambda. The Discord _bot_ is entirely serverless and is
used to start the server if it is stopped, or check if the server is up.

We will publish instructions for a few game servers we have tested, namely
Valheim, Satisfactory, and Factorio.

## Prerequisites

This library requires working knowledge of the AWS Cloud. You will have to
create IAM Users, and navigate the AWS web console at times. If these are not
subjects you are comfortable with, this likely isn't the library for you.

This software is released without warranty. There is no commitment that the
costs of running this will be acceptable to your individual budget.

This software is released in a 0.0.x version state. Which means there
are no guarantees of backwards compatibility with future changes. It also means
there will be bugs.

You will be deploying this at your own risk.

Ok, let's go!

## Getting Started

You will need an AWS account, and an IAM User with [API
Access](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html).
Optionally, you may want the [AWS
CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)
installed.

You will need NodeJS installed, anything greater than 16.x should be fine. Now
make a directory, initialize a new cdk app, and install this library.

``` bash
mkdir cdk-my-server
cd cdk-my-server
npx cdk init app --language=typescript
npm install --save @raykrueger/cdk-game-server
```

Currently, we are only releasing the Typescript version of the library, in the
future, we may release Python support. The Typescript version _should_ work with a
Javascript-based application, but we'll use Typescript for this doc.

Next, we'll edit `bin/cdk-my-server.ts` and remove all the boilerplate. Replace
that with the following sample. We'll use Satisfactory as an example.

``` typescript
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Stack, Tags } from 'aws-cdk-lib';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { AwsLogDriver, ContainerImage, Protocol } from 'aws-cdk-lib/aws-ecs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import 'source-map-support/register';
import { GameServer } from '@raykrueger/cdk-game-server';

class GameStack extends Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    new GameServer(this, 'Satisfactory', {
      cpu: 2048, // 2 vcpu
      memoryLimitMiB: 8192, // 8 gb
      image: ContainerImage.fromRegistry("raykrueger/satisfactory-dedicated-server"),
      gamePorts: [
        { portNumber: 7777, protocol: Protocol.UDP },
        { portNumber: 7777, protocol: Protocol.TCP },
      ],
      mountTarget: {
        mountTarget: "/home/steam/.config/Epic/FactoryGame/Saved/SaveGames",
        aclGroupId: 1000,
        aclUserId: 1000
      },
    });
  }
}

const app = new cdk.App();
new GameStack(app, "Satisfactory", { env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-2' } });
```

This will deploy Satisfactory using the
[raykrueger/satisfactory-dedicated-server](https://github.com/raykrueger/satisfactory-dedicated-server)
container. We will initially give it 2 vCPUs and 4gb of memory (which will be
fine to start with for Satisfactory). We expose the necessary ports for the
server, which all use UDP. We then specify the _mountTarget_, which is where the
container stores the game save files.

Now let's deploy the application.

``` bash
npx cdk deploy
```

You will be prompted to accept the security changes that occur, including
creating IAM roles and Security Groups. If you accept that prompt, the
deployment will commence and it will take a while.

Once that deployment is complete, you can open the AWS Console and look at your
[Amazon ECS Clusters](https://console.aws.amazon.com/ecs/v2/clusters). You
should see a long _Satisfactory-something-something_ name. All of the names are
randomly generated from prefixes. Most aren't pretty.

1. Click into the Cluster, it will have one Service.
1. Click into the Service, and click on the "Configuration
and tasks" tab
1. There will be one running Task. Click on the task, it will
have an ID like 98adc2c0d39d428e81868e8e35bdf9ab.
1. In the "Configuration" table, on the right you will see the Public IP. Copy that IP Address.

Use that IP Address to connect to your server!

### Autoshutdown Support

Note that the server will shutdown in 30 minutes if it is idle. If it does, the _desired tasks_ count will be changed to 0 when that happens. To start the server again just update that _desired_ count to 1.

## Adding DNS Support

Copying the public IP address every time we start the server is annoying, so
let's add DNS Support.

If you have a Hosted Zone configured in Amazon Route 53, the
[cdk-fargate-public-dns](https://github.com/raykrueger/cdk-fargate-public-dns)
library support can update a DNS record for you. In your Hosted Zone, create a new
_A Record_ and set the value to the Public IP from above (or 1.1.1.1 if the
server isn't running). Be sure to set the TTL to 300 seconds (5 minutes), this
ensures you don't have to wait forever, but is also reasonable.

You'll add to the configuration above, after the `mountTarget`. The domainName is
your fully qualified A Record you created previously. The hostedZone is the ID
from Route 53, it usually starts with a _Z_.

``` typescript
//previous code cut for brevity
mountTarget: "/home/steam/.config/Epic/FactoryGame/Saved/SaveGames",
dnsConfig: {
  domainName: 'satisfactory.example.com',
  hostzedZone: 'ZXXXXXXXXXXXXXXXXXXXX',
  //optional: Delete this if using Route 53 the same account
  //assumedRole: 'arn:aws:iam::111111111111:role/cross-account-r53-update'
},
```

Optionally, we can update Route 53 in a different account, see 
[cdk-fargate-public-dns](https://github.com/raykrueger/cdk-fargate-public-dns)
docs for more details.

## Setting up Discord

### Create a Discord Bot

Logging into the AWS console and updating the desired tasks count, or doing it
from the AWS CLI, works, but we can do better. The `cdk-game-sever` construct
library can support deploying a Discord slash command bot that can start the
server for us. You'll need a Discord Server and permission to add bots to do
this.

You need to create a bot in Discord first. Log into the [Discord Developer
Portal](https://discord.com/developers/applications) and Create an application.
After accepting the agreement, you'll be presented with the _General
Information_ page for your Application.

Continuing with Satisfactory as our example, fill in the _Name_ as Satisfactory.
You'll want to start a set of notes at this point to gather a few values.
Collect the Application Id and Public Key for your application.

Now, click on the _Bot_ navigation link on the left. Click the _Add Bot_ button.
Once you have completed the _Add Bot_ request, click on the _Copy_ button for
the Token. Add the Bot Token to your notes.

Now, invite the bot to your server. Expand the _Oauth2_ dropdown in the left
navigation and click on _URL Generator_. We are only clicking two checkboxes here, the _bot_ and _applications.commands_ scope. At the bottom of
the page, next to the Generated URL field, click the _Copy_ button. Open a new
tab in your browser, paste that url, and hit enter. Invite your new bot to your
server and accept the permissions.

The last thing you need is the Guild Id for your server (Guild is what Discord
calls their servers). To get the server ID for the first parameter, open
Discord, go to Settings > Advanced, and enable developer mode. Then, right-click
on the server title and select "_Copy ID_" to get the guild ID. Add that to your
notes.

### Create an AWS Secret

Now we'll create a secret in AWS Secrets manager. Open the [AWS Secrets
Manager](console.aws.amazon.com/secretsmanager/listsecrets) console. Be sure to
select the region where you are deploying your game server. Click _Store a new secret_ and choose _Other Type of Secret_. This will present us with the option to create a Key/value type secret.

You're going to create a secret with the following Keys. Note that the **key
names have to be exact**, so copy them from here.

| Key | Value |
|-----|-------|
| PublicKey | The Public key from your Application |
| AppId | Your Application ID |
| GuildId | Your Guild ID, copied from the server |
| BotToken | The _Token_ we copied from the Bot page in Discord |
| Authorization | Bot _Token_|

Note: The Authorization Key is the word "Bot", a space, and your bot token. Yes, currently this requires two keys.

For the Encryption key you can choose the default, unless you know you want
something else.

Click Next.

For Secret Name enter "SatisfactoryBotSecret", or whatever you want, and
remember that name for later.

Click Next.

You're not doing anything with this screen, so click Next again.

Now you're on the Review page, just click _Store_.

Your new secret may not show up on the list page right away, just refresh and it
will show up.

### Deploy the Discord Bot

``` typescript
//previous code cut for brevity
mountTarget: "/home/steam/.config/Epic/FactoryGame/Saved/SaveGames",
discord: {
  commandName: 'satisfactory',
  secretName: 'SatisfactoryBotSecret'
},
```

Where commandName is the command as it will appear in Discord, so
"/satisfactory" in the example above. For secretName, that is going to be the
name of the secret created in the previous step.

That's it. Let's deploy our server.

``` bash
npx cdk deploy
```

If you accept the security changes the Bot will be deployed to your account.
This will create an API Gateway, a few AWS Lambda Functions, and a state machine
in AWS Step Functions. Additionally, some Lambda functions are deployed that act
as Custom Resources in Cloudformation to register your slash commands with
Discord.

When the deployment completes, you'll see some _Outputs_ mentioned. We need the API Gateway output, it will have a somewhat nonsensical name like Satisfactory.SatisfactoryDiscordBot.....

For example:

```
Outputs:
Satisfactory.SatisfactoryDiscordBotDiscordBotListenerLambdaRestApiEndpointCF7F987E = https://randomnumbers.execute-api.us-east-2.amazonaws.com/prod/
```

Copy that URL and go back to your Application in the Discord Developer Portal.
On the _General Information_ page, paste that url into the _INTERACTIONS
ENDPOINT URL_ field.

Click _Save Changes_. Discord will hit your API and make sure
everything is deployed correctly. If you get an error, go back and check your
secret names.

Congratulations, your discord bot should be active now.

There are only two bot commands `/{commandName} start` and `/{commandName} status`
and they aren't customizable at this time. The `start` command will start the
server (by setting the Desired Task count to 1), or tell you if the server is
already running. The `status` command will simply tell you whether the server is up or
down. 

## Adding Logging

If your chosen game server container is giving you trouble, you can add logging

``` typescript
//previous code cut for brevity
mountTarget: "/home/steam/.config/Epic/FactoryGame/Saved/SaveGames",
logging: new AwsLogDriver({
  streamPrefix: 'SatisfactoryLogs',
  logRetention: RetentionDays.THREE_DAYS,
}),
```

This will generate a default log group in CloudWatch, and keep those logs for 3
days. A shorter retention time will keep costs down. You can set your own log
group name by adding a `logGroup: "MyGameServerLogs"` if you want.

## Tweaking Autoshutdown

If you want to raise or lower the CPU Utilization target for the autoshutdown, or increase the evaluation period you can add the following.

``` typescript
//previous code cut for brevity
mountTarget: "/home/steam/.config/Epic/FactoryGame/Saved/SaveGames",
autoShutdownConfig: {
  cpuUtilizationMin: 5,
  evaluationPeriods: 6
}
```

If CPU Utilization of your container falls below `cpuUtilizationMin` for
`evaluationPeriods` the server will be shutdown by setting the Desired Tasks to
0. The `evaluationPeriods` is 5-minute periods. So in the defaults, Six 5-minute periods is 30 minutes.

So if your CPU Utilization is below 5% for 30 minutes, the server is stopped.

## Troubleshooting

We will add to this section over time.

### Game Server Not Starting

The best thing you can do for troubleshooting your game is to enable [Logging](#adding-logging)

### Everything Else

[Open a github issue](https://github.com/raykrueger/cdk-game-server/issues) :)
