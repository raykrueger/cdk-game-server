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
import { GameServer } from '../../cdk-game-server/src';

class GameStack extends Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    new GameServer(this, 'Satisfactory', {
      cpu: 2048, // 2 vcpu
      memoryLimitMiB: 8192, // 8 gb
      image: ContainerImage.fromRegistry("raykrueger/satisfactory-dedicated-server"),
      gamePorts: [
        { portNumber: 7777, protocol: Protocol.UDP },
        { portNumber: 15000, protocol: Protocol.UDP },
        { portNumber: 15777, protocol: Protocol.UDP }
      ],
      mountTarget: "/home/steam/.config/Epic/FactoryGame/Saved/SaveGames"
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

# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### GameServer <a name="GameServer" id="@raykrueger/cdk-game-server.GameServer"></a>

Builds a game server, running on ECS Fargate.

This is designed to run as
cheaply as possible, which means some availability and reliability has been
sacrificed.

Default configuration:
    Single AZ with a Single Public Subnet
    Fargate Spot capacity provider
    EFS General performance file system for storage

#### Initializers <a name="Initializers" id="@raykrueger/cdk-game-server.GameServer.Initializer"></a>

```typescript
import { GameServer } from '@raykrueger/cdk-game-server'

new GameServer(scope: Construct, id: string, props: GameServerProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.Initializer.parameter.props">props</a></code> | <code><a href="#@raykrueger/cdk-game-server.GameServerProps">GameServerProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="@raykrueger/cdk-game-server.GameServer.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="@raykrueger/cdk-game-server.GameServer.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="@raykrueger/cdk-game-server.GameServer.Initializer.parameter.props"></a>

- *Type:* <a href="#@raykrueger/cdk-game-server.GameServerProps">GameServerProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="@raykrueger/cdk-game-server.GameServer.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="@raykrueger/cdk-game-server.GameServer.isConstruct"></a>

```typescript
import { GameServer } from '@raykrueger/cdk-game-server'

GameServer.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="@raykrueger/cdk-game-server.GameServer.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.cluster">cluster</a></code> | <code>aws-cdk-lib.aws_ecs.ICluster</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.containerEnv">containerEnv</a></code> | <code>{[ key: string ]: string}</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.containerInsights">containerInsights</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.containerSecrets">containerSecrets</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_ecs.Secret}</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.cpu">cpu</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.gamePorts">gamePorts</a></code> | <code><a href="#@raykrueger/cdk-game-server.GamePort">GamePort</a>[]</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.image">image</a></code> | <code>aws-cdk-lib.aws_ecs.ContainerImage</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.memoryLimitMiB">memoryLimitMiB</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.mountTarget">mountTarget</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.service">service</a></code> | <code>aws-cdk-lib.aws_ecs.IService</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.additionalArgs">additionalArgs</a></code> | <code>string[]</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.autoShutdownConfig">autoShutdownConfig</a></code> | <code><a href="#@raykrueger/cdk-game-server.AutoShutdownProps">AutoShutdownProps</a></code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.discord">discord</a></code> | <code><a href="#@raykrueger/cdk-game-server.DiscordCommandOptions">DiscordCommandOptions</a></code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.dnsConfig">dnsConfig</a></code> | <code><a href="#@raykrueger/cdk-game-server.DomainProps">DomainProps</a></code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.enableExecuteCommand">enableExecuteCommand</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.logging">logging</a></code> | <code>aws-cdk-lib.aws_ecs.LogDriver</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.steamArgs">steamArgs</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | *No description.* |

---

##### `node`<sup>Required</sup> <a name="node" id="@raykrueger/cdk-game-server.GameServer.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `cluster`<sup>Required</sup> <a name="cluster" id="@raykrueger/cdk-game-server.GameServer.property.cluster"></a>

```typescript
public readonly cluster: ICluster;
```

- *Type:* aws-cdk-lib.aws_ecs.ICluster

---

##### `containerEnv`<sup>Required</sup> <a name="containerEnv" id="@raykrueger/cdk-game-server.GameServer.property.containerEnv"></a>

```typescript
public readonly containerEnv: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}

---

##### `containerInsights`<sup>Required</sup> <a name="containerInsights" id="@raykrueger/cdk-game-server.GameServer.property.containerInsights"></a>

```typescript
public readonly containerInsights: boolean;
```

- *Type:* boolean

---

##### `containerSecrets`<sup>Required</sup> <a name="containerSecrets" id="@raykrueger/cdk-game-server.GameServer.property.containerSecrets"></a>

```typescript
public readonly containerSecrets: {[ key: string ]: Secret};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_ecs.Secret}

---

##### `cpu`<sup>Required</sup> <a name="cpu" id="@raykrueger/cdk-game-server.GameServer.property.cpu"></a>

```typescript
public readonly cpu: number;
```

- *Type:* number

---

##### `gamePorts`<sup>Required</sup> <a name="gamePorts" id="@raykrueger/cdk-game-server.GameServer.property.gamePorts"></a>

```typescript
public readonly gamePorts: GamePort[];
```

- *Type:* <a href="#@raykrueger/cdk-game-server.GamePort">GamePort</a>[]

---

##### `image`<sup>Required</sup> <a name="image" id="@raykrueger/cdk-game-server.GameServer.property.image"></a>

```typescript
public readonly image: ContainerImage;
```

- *Type:* aws-cdk-lib.aws_ecs.ContainerImage

---

##### `memoryLimitMiB`<sup>Required</sup> <a name="memoryLimitMiB" id="@raykrueger/cdk-game-server.GameServer.property.memoryLimitMiB"></a>

```typescript
public readonly memoryLimitMiB: number;
```

- *Type:* number

---

##### `mountTarget`<sup>Required</sup> <a name="mountTarget" id="@raykrueger/cdk-game-server.GameServer.property.mountTarget"></a>

```typescript
public readonly mountTarget: string;
```

- *Type:* string

---

##### `service`<sup>Required</sup> <a name="service" id="@raykrueger/cdk-game-server.GameServer.property.service"></a>

```typescript
public readonly service: IService;
```

- *Type:* aws-cdk-lib.aws_ecs.IService

---

##### `additionalArgs`<sup>Optional</sup> <a name="additionalArgs" id="@raykrueger/cdk-game-server.GameServer.property.additionalArgs"></a>

```typescript
public readonly additionalArgs: string[];
```

- *Type:* string[]

---

##### `autoShutdownConfig`<sup>Optional</sup> <a name="autoShutdownConfig" id="@raykrueger/cdk-game-server.GameServer.property.autoShutdownConfig"></a>

```typescript
public readonly autoShutdownConfig: AutoShutdownProps;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.AutoShutdownProps">AutoShutdownProps</a>

---

##### `discord`<sup>Optional</sup> <a name="discord" id="@raykrueger/cdk-game-server.GameServer.property.discord"></a>

```typescript
public readonly discord: DiscordCommandOptions;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.DiscordCommandOptions">DiscordCommandOptions</a>

---

##### `dnsConfig`<sup>Optional</sup> <a name="dnsConfig" id="@raykrueger/cdk-game-server.GameServer.property.dnsConfig"></a>

```typescript
public readonly dnsConfig: DomainProps;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.DomainProps">DomainProps</a>

---

##### `enableExecuteCommand`<sup>Optional</sup> <a name="enableExecuteCommand" id="@raykrueger/cdk-game-server.GameServer.property.enableExecuteCommand"></a>

```typescript
public readonly enableExecuteCommand: boolean;
```

- *Type:* boolean

---

##### `logging`<sup>Optional</sup> <a name="logging" id="@raykrueger/cdk-game-server.GameServer.property.logging"></a>

```typescript
public readonly logging: LogDriver;
```

- *Type:* aws-cdk-lib.aws_ecs.LogDriver

---

##### `steamArgs`<sup>Optional</sup> <a name="steamArgs" id="@raykrueger/cdk-game-server.GameServer.property.steamArgs"></a>

```typescript
public readonly steamArgs: string;
```

- *Type:* string

---

##### `vpc`<sup>Optional</sup> <a name="vpc" id="@raykrueger/cdk-game-server.GameServer.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

---


## Structs <a name="Structs" id="Structs"></a>

### AutoShutdownProps <a name="AutoShutdownProps" id="@raykrueger/cdk-game-server.AutoShutdownProps"></a>

#### Initializer <a name="Initializer" id="@raykrueger/cdk-game-server.AutoShutdownProps.Initializer"></a>

```typescript
import { AutoShutdownProps } from '@raykrueger/cdk-game-server'

const autoShutdownProps: AutoShutdownProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.AutoShutdownProps.property.cpuUtilizationMin">cpuUtilizationMin</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.AutoShutdownProps.property.evaluationPeriods">evaluationPeriods</a></code> | <code>number</code> | *No description.* |

---

##### `cpuUtilizationMin`<sup>Optional</sup> <a name="cpuUtilizationMin" id="@raykrueger/cdk-game-server.AutoShutdownProps.property.cpuUtilizationMin"></a>

```typescript
public readonly cpuUtilizationMin: number;
```

- *Type:* number

---

##### `evaluationPeriods`<sup>Optional</sup> <a name="evaluationPeriods" id="@raykrueger/cdk-game-server.AutoShutdownProps.property.evaluationPeriods"></a>

```typescript
public readonly evaluationPeriods: number;
```

- *Type:* number

---

### DiscordCommandOptions <a name="DiscordCommandOptions" id="@raykrueger/cdk-game-server.DiscordCommandOptions"></a>

#### Initializer <a name="Initializer" id="@raykrueger/cdk-game-server.DiscordCommandOptions.Initializer"></a>

```typescript
import { DiscordCommandOptions } from '@raykrueger/cdk-game-server'

const discordCommandOptions: DiscordCommandOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.DiscordCommandOptions.property.commandName">commandName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.DiscordCommandOptions.property.secretName">secretName</a></code> | <code>string</code> | *No description.* |

---

##### `commandName`<sup>Required</sup> <a name="commandName" id="@raykrueger/cdk-game-server.DiscordCommandOptions.property.commandName"></a>

```typescript
public readonly commandName: string;
```

- *Type:* string

---

##### `secretName`<sup>Required</sup> <a name="secretName" id="@raykrueger/cdk-game-server.DiscordCommandOptions.property.secretName"></a>

```typescript
public readonly secretName: string;
```

- *Type:* string

---

### DomainProps <a name="DomainProps" id="@raykrueger/cdk-game-server.DomainProps"></a>

#### Initializer <a name="Initializer" id="@raykrueger/cdk-game-server.DomainProps.Initializer"></a>

```typescript
import { DomainProps } from '@raykrueger/cdk-game-server'

const domainProps: DomainProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.DomainProps.property.domainName">domainName</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.DomainProps.property.hostzedZone">hostzedZone</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.DomainProps.property.assumedRole">assumedRole</a></code> | <code>string</code> | *No description.* |

---

##### `domainName`<sup>Required</sup> <a name="domainName" id="@raykrueger/cdk-game-server.DomainProps.property.domainName"></a>

```typescript
public readonly domainName: string;
```

- *Type:* string

---

##### `hostzedZone`<sup>Required</sup> <a name="hostzedZone" id="@raykrueger/cdk-game-server.DomainProps.property.hostzedZone"></a>

```typescript
public readonly hostzedZone: string;
```

- *Type:* string

---

##### `assumedRole`<sup>Optional</sup> <a name="assumedRole" id="@raykrueger/cdk-game-server.DomainProps.property.assumedRole"></a>

```typescript
public readonly assumedRole: string;
```

- *Type:* string

---

### GamePort <a name="GamePort" id="@raykrueger/cdk-game-server.GamePort"></a>

#### Initializer <a name="Initializer" id="@raykrueger/cdk-game-server.GamePort.Initializer"></a>

```typescript
import { GamePort } from '@raykrueger/cdk-game-server'

const gamePort: GamePort = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.GamePort.property.portNumber">portNumber</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GamePort.property.protocol">protocol</a></code> | <code>aws-cdk-lib.aws_ecs.Protocol</code> | *No description.* |

---

##### `portNumber`<sup>Required</sup> <a name="portNumber" id="@raykrueger/cdk-game-server.GamePort.property.portNumber"></a>

```typescript
public readonly portNumber: number;
```

- *Type:* number

---

##### `protocol`<sup>Required</sup> <a name="protocol" id="@raykrueger/cdk-game-server.GamePort.property.protocol"></a>

```typescript
public readonly protocol: Protocol;
```

- *Type:* aws-cdk-lib.aws_ecs.Protocol

---

### GameServerProps <a name="GameServerProps" id="@raykrueger/cdk-game-server.GameServerProps"></a>

#### Initializer <a name="Initializer" id="@raykrueger/cdk-game-server.GameServerProps.Initializer"></a>

```typescript
import { GameServerProps } from '@raykrueger/cdk-game-server'

const gameServerProps: GameServerProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.gamePorts">gamePorts</a></code> | <code><a href="#@raykrueger/cdk-game-server.GamePort">GamePort</a>[]</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.image">image</a></code> | <code>aws-cdk-lib.aws_ecs.ContainerImage</code> | The container image to run. |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.mountTarget">mountTarget</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.additionalArgs">additionalArgs</a></code> | <code>string[]</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.autoShutdownConfig">autoShutdownConfig</a></code> | <code><a href="#@raykrueger/cdk-game-server.AutoShutdownProps">AutoShutdownProps</a></code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.containerEnv">containerEnv</a></code> | <code>{[ key: string ]: string}</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.containerInsights">containerInsights</a></code> | <code>boolean</code> | Do we want to enable Cloudwatch Container Insights, and incur additional cost? |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.containerSecrets">containerSecrets</a></code> | <code>{[ key: string ]: aws-cdk-lib.aws_ecs.Secret}</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.cpu">cpu</a></code> | <code>number</code> | vCpu amout to be granted to ECS Fargate task. |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.discord">discord</a></code> | <code><a href="#@raykrueger/cdk-game-server.DiscordCommandOptions">DiscordCommandOptions</a></code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.dnsConfig">dnsConfig</a></code> | <code><a href="#@raykrueger/cdk-game-server.DomainProps">DomainProps</a></code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.enableExecuteCommand">enableExecuteCommand</a></code> | <code>boolean</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.logging">logging</a></code> | <code>aws-cdk-lib.aws_ecs.LogDriver</code> | Logging driver to use. |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.memoryLimitMiB">memoryLimitMiB</a></code> | <code>number</code> | Memory limit in 1024 incrmements. |
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.vpc">vpc</a></code> | <code>aws-cdk-lib.aws_ec2.IVpc</code> | Provide an existing VPC to deploy into. |

---

##### `gamePorts`<sup>Required</sup> <a name="gamePorts" id="@raykrueger/cdk-game-server.GameServerProps.property.gamePorts"></a>

```typescript
public readonly gamePorts: GamePort[];
```

- *Type:* <a href="#@raykrueger/cdk-game-server.GamePort">GamePort</a>[]

---

##### `image`<sup>Required</sup> <a name="image" id="@raykrueger/cdk-game-server.GameServerProps.property.image"></a>

```typescript
public readonly image: ContainerImage;
```

- *Type:* aws-cdk-lib.aws_ecs.ContainerImage

The container image to run.

---

##### `mountTarget`<sup>Required</sup> <a name="mountTarget" id="@raykrueger/cdk-game-server.GameServerProps.property.mountTarget"></a>

```typescript
public readonly mountTarget: string;
```

- *Type:* string

---

##### `additionalArgs`<sup>Optional</sup> <a name="additionalArgs" id="@raykrueger/cdk-game-server.GameServerProps.property.additionalArgs"></a>

```typescript
public readonly additionalArgs: string[];
```

- *Type:* string[]

---

##### `autoShutdownConfig`<sup>Optional</sup> <a name="autoShutdownConfig" id="@raykrueger/cdk-game-server.GameServerProps.property.autoShutdownConfig"></a>

```typescript
public readonly autoShutdownConfig: AutoShutdownProps;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.AutoShutdownProps">AutoShutdownProps</a>

---

##### `containerEnv`<sup>Optional</sup> <a name="containerEnv" id="@raykrueger/cdk-game-server.GameServerProps.property.containerEnv"></a>

```typescript
public readonly containerEnv: {[ key: string ]: string};
```

- *Type:* {[ key: string ]: string}

---

##### `containerInsights`<sup>Optional</sup> <a name="containerInsights" id="@raykrueger/cdk-game-server.GameServerProps.property.containerInsights"></a>

```typescript
public readonly containerInsights: boolean;
```

- *Type:* boolean
- *Default:* false

Do we want to enable Cloudwatch Container Insights, and incur additional cost?

---

##### `containerSecrets`<sup>Optional</sup> <a name="containerSecrets" id="@raykrueger/cdk-game-server.GameServerProps.property.containerSecrets"></a>

```typescript
public readonly containerSecrets: {[ key: string ]: Secret};
```

- *Type:* {[ key: string ]: aws-cdk-lib.aws_ecs.Secret}

---

##### `cpu`<sup>Optional</sup> <a name="cpu" id="@raykrueger/cdk-game-server.GameServerProps.property.cpu"></a>

```typescript
public readonly cpu: number;
```

- *Type:* number
- *Default:* DEFAULT_VCPU

vCpu amout to be granted to ECS Fargate task.

> [https://aws.amazon.com/fargate/pricing/](https://aws.amazon.com/fargate/pricing/)

---

##### `discord`<sup>Optional</sup> <a name="discord" id="@raykrueger/cdk-game-server.GameServerProps.property.discord"></a>

```typescript
public readonly discord: DiscordCommandOptions;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.DiscordCommandOptions">DiscordCommandOptions</a>

---

##### `dnsConfig`<sup>Optional</sup> <a name="dnsConfig" id="@raykrueger/cdk-game-server.GameServerProps.property.dnsConfig"></a>

```typescript
public readonly dnsConfig: DomainProps;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.DomainProps">DomainProps</a>

---

##### `enableExecuteCommand`<sup>Optional</sup> <a name="enableExecuteCommand" id="@raykrueger/cdk-game-server.GameServerProps.property.enableExecuteCommand"></a>

```typescript
public readonly enableExecuteCommand: boolean;
```

- *Type:* boolean

---

##### `logging`<sup>Optional</sup> <a name="logging" id="@raykrueger/cdk-game-server.GameServerProps.property.logging"></a>

```typescript
public readonly logging: LogDriver;
```

- *Type:* aws-cdk-lib.aws_ecs.LogDriver
- *Default:* undefined

Logging driver to use.

The Cloudwatch logging driver will incur addtional costs.

---

*Example*

```typescript
logging: new ecs.AwsLogDriver({ streamPrefix: 'EventDemo' })
```


##### `memoryLimitMiB`<sup>Optional</sup> <a name="memoryLimitMiB" id="@raykrueger/cdk-game-server.GameServerProps.property.memoryLimitMiB"></a>

```typescript
public readonly memoryLimitMiB: number;
```

- *Type:* number
- *Default:* DEFAULT_VCPU

Memory limit in 1024 incrmements.

> [https://aws.amazon.com/fargate/pricing/](https://aws.amazon.com/fargate/pricing/)

---

##### `vpc`<sup>Optional</sup> <a name="vpc" id="@raykrueger/cdk-game-server.GameServerProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

Provide an existing VPC to deploy into.

If none is given a default `ec2.VPC` will be created.

---



