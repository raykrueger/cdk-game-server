# cdk-game-server

Run dedicated game servers on AWS Fargate that shut themselves down when nobody's playing — so you only pay for game time, not 24/7.

## What it does

Running a dedicated server (Valheim, Satisfactory, Factorio, ...) on a cloud VM costs money even at 3am when nobody is connected. `cdk-game-server` is an [AWS CDK](https://aws.amazon.com/cdk/) construct library that deploys a single Fargate task for your game and scales the desired task count to **0** when CPU utilization drops below 5% for 30 minutes. When you want to play, a Discord slash command brings it back up.

No load balancers, no NAT gateways, no private subnets — just the fewest possible billable things, while keeping game saves durable on EFS.

### Architecture in one paragraph

A public-subnet-only VPC runs one ECS Fargate task with a public IP. An EFS file system (general purpose, encrypted, auto-backup) is mounted only at the game-save path — game files stay in the (free) container, only save data pays EFS rates. A CloudWatch alarm watches CPU utilization and, after it stays below the threshold for the configured evaluation periods, publishes to an SNS topic whose Lambda subscriber sets the service's desired task count to 0. Fargate Spot capacity is used by default. Optionally, `cdk-fargate-public-dns` updates a Route 53 A record with the task's public IP, and an entirely serverless Discord bot (API Gateway + Step Functions + Lambda) can start or check the server.

## Contents

- [Prerequisites](#prerequisites)
- [Breaking changes](#breaking-changes)
- [Quick start](#quick-start)
- [Autoshutdown](#autoshutdown)
- [Adding DNS support](#adding-dns-support)
- [Setting up the Discord bot](#setting-up-the-discord-bot)
- [Adding logging](#adding-logging)
- [Tweaking autoshutdown](#tweaking-autoshutdown)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

This library requires working knowledge of AWS: you will create IAM resources and navigate the AWS console at times. If that isn't comfortable, this probably isn't the library for you.

- An AWS account and an IAM user with [API access](https://docs.aws.amazon.com/iam/latest/UserGuide/id_credentials_access-keys.html)
- [Node.js](https://nodejs.org/) >= 24
- (Optional) The [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html)

The library is released as a JavaScript npm package with TypeScript typings.

This software is released without warranty. There is no commitment that the cost of running this will be acceptable for your individual budget, and it is in a 0.0.x version state: no backwards-compatibility guarantees, and there will be bugs. You deploy at your own risk.

## Breaking changes

No backwards-compatibility is guaranteed, but breaking changes to the public API are logged here. Check this section before upgrading.

### v0.1.0

- `DomainProps.hostzedZone` renamed to `DomainProps.hostedZone` — typo fix. `cdk-fargate-public-dns` v0.0.33 (now required) uses `hostedZone`, so the old name no longer works at all.
- Minimum Node.js is now 24 (`engines.node >= 24`), and the `aws-cdk-lib` peer dependency is `^2.270.0` — upgrade your CDK app accordingly.

## Quick start

Create a new CDK app and install the library:

``` bash
mkdir cdk-my-server
cd cdk-my-server
npx cdk init app --language=typescript
npm install --save @raykrueger/cdk-game-server
```

Replace the boilerplate in `bin/cdk-my-server.ts` with a `GameServer` construct. Here is Satisfactory:

``` typescript
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { ContainerImage, Protocol } from 'aws-cdk-lib/aws-ecs';
import 'source-map-support/register';
import { GameServer } from '@raykrueger/cdk-game-server';

class GameStack extends Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new GameServer(this, 'Satisfactory', {
      cpu: 2048, // 2 vCPU
      memoryLimitMiB: 8192, // 8 GB
      image: ContainerImage.fromRegistry('raykrueger/satisfactory-dedicated-server'),
      gamePorts: [
        { portNumber: 7777, protocol: Protocol.UDP },
        { portNumber: 7777, protocol: Protocol.TCP },
      ],
      mountTarget: {
        mountTarget: '/home/steam/.config/Epic/FactoryGame/Saved/SaveGames',
        aclGroupId: 1000,
        aclUserId: 1000,
      },
    });
  }
}

const app = new cdk.App();
new GameStack(app, 'Satisfactory', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-2' },
});
```

This deploys Satisfactory using the [raykrueger/satisfactory-dedicated-server](https://github.com/raykrueger/satisfactory-dedicated-server) container with 2 vCPUs and 8 GB of memory. `gamePorts` opens the server's ports on the security group (any IPv4), and `mountTarget` is the container path where the game stores save files — that path is backed by EFS.

Deploy:

``` bash
npx cdk deploy
```

Accept the security changes prompt (IAM roles and security groups) and wait for the deployment to finish.

To find your server's IP in the console:

1. Open [ECS Clusters](https://console.aws.amazon.com/ecs/v2/clusters) and click the `Satisfactory-...` cluster.
2. Click the service, then the **Configuration and tasks** tab.
3. Click the running task.
4. In the **Configuration** table, on the right, copy the **Public IP**.

Use that IP to connect. (Tired of copying IPs? See [Adding DNS support](#adding-dns-support).)

## Autoshutdown

The server shuts itself down when idle: if the container's CPU utilization stays below the threshold for the evaluation period, a Lambda sets the desired task count to 0. If it did, start it again by setting the **desired** count back to 1 — in the console, the AWS CLI, or with the Discord bot.

## Adding DNS support

Copying a new public IP every start is annoying. If you have a Route 53 hosted zone, the [cdk-fargate-public-dns](https://github.com/raykrueger/cdk-fargate-public-dns) library can keep an A record in sync with the Fargate task's public IP.

First, in your hosted zone, create an _A record_ for the server (point it at the public IP from above, or `1.1.1.1` if the server isn't running) with a TTL of **300 seconds**. That keeps records fresh without waiting forever after a shutdown.

Then add `dnsConfig` to the construct:

``` typescript
//previous code cut for brevity
mountTarget: { mountTarget: '/home/steam/.config/Epic/FactoryGame/Saved/SaveGames' },
dnsConfig: {
  domainName: 'satisfactory.example.com',
  hostedZone: 'ZXXXXXXXXXXXXXXXXXXXX',
  //optional: Delete this if using Route 53 in the same account
  //assumedRole: 'arn:aws:iam::111111111111:role/cross-account-r53-update',
},
```

`domainName` is the fully qualified A record you created; `hostedZone` is the hosted zone ID (starts with `Z`). For cross-account hosted zones, see the [cdk-fargate-public-dns](https://github.com/raykrueger/cdk-fargate-public-dns) docs.

## Setting up the Discord bot

### Create a Discord bot

The construct can deploy a Discord slash-command bot that starts the server for you. You need a Discord server with permission to add bots.

1. Log into the [Discord Developer Portal](https://discord.com/developers/applications) and create an application. Fill in the _Name_ (e.g. "Satisfactory"). Start notes — you'll need several values.
2. Copy the **Application Id** from _General Information_.
3. Click the **Bot** navigation link and click **Add Bot**. When done, click **Copy** next to the **Token** and save it.
4. Invite the bot: expand **Oauth2** → **URL Generator** in the left navigation, check only the `bot` and `applications.commands` scopes, copy the Generated URL, open it in a new tab, and accept the permissions for your server.
5. Get your **Guild Id**: in Discord, Settings > Advanced > enable developer mode, then right-click the server name → **Copy ID**.

### Create the AWS secret

In the [Secrets Manager console](https://console.aws.amazon.com/secretsmanager/listsecrets) (in the region where you deploy), choose **Store a new secret** → **Other Type of Secret** (key/value).

The key names must be exactly:

| Key | Value |
|-----|-------|
| `PublicKey` | The public key from your Application |
| `AppId` | Your Application ID |
| `GuildId` | Your Guild ID (from the server) |
| `BotToken` | The Token copied from the Bot page |
| `Authorization` | `Bot <token>` (the word "Bot", a space, your token — yes, both `BotToken` and `Authorization` are required) |

You can use the default encryption key. Name it something like `SatisfactoryBotSecret` and remember the name.

### Deploy the bot

Add to the construct:

``` typescript
//previous code cut for brevity
discord: {
  commandName: 'satisfactory',
  secretName: 'SatisfactoryBotSecret',
},
```

`commandName` is how the command appears in Discord (`/satisfactory`); `secretName` is the secret from above.

``` bash
npx cdk deploy
```

This creates an API Gateway, a Step Functions state machine, a few Lambda functions (including custom resources that register the slash commands with Discord), and the supporting glue.

When deployment completes, note the API Gateway URL from the Outputs, e.g.

```
Outputs:
Satisfactory.SatisfactoryDiscordBotDiscordBotListenerLambdaRestApiEndpointCF7F987E = https://randomnumbers.execute-api.us-east-2.amazonaws.com/prod/
```

Back in the Developer Portal's _General Information_ page, paste that URL into **INTERACTIONS ENDPOINT URL** and save. Discord verifies it against your API — if it errors, check the secret name and keys.

The bot supports exactly two commands:

- `/{commandName} start` — starts the server (desired tasks → 1), or tells you it's already running
- `/{commandName} status` — reports whether the server is up or down

## Adding logging

If your game server container is giving you trouble, enable CloudWatch container logging:

``` typescript
//previous code cut for brevity
logging: new AwsLogDriver({
  streamPrefix: 'SatisfactoryLogs',
  logRetention: RetentionDays.THREE_DAYS,
}),
```

This creates a CloudWatch log group with 3-day retention — shorter retention keeps costs down. Set `logGroup: 'MyGameServerLogs'` to control the group name.

## Tweaking autoshutdown

``` typescript
//previous code cut for brevity
autoShutdownConfig: {
  cpuUtilizationMin: 5,
  evaluationPeriods: 6,
},
```

If the container's CPU utilization stays below `cpuUtilizationMin` for `evaluationPeriods` consecutive 5-minute periods, the desired task count is set to 0. The defaults (5%, 6 periods) mean: idle for 30 minutes → shutdown.

## Troubleshooting

### Game server not starting

Enable [Logging](#adding-logging) — container logs in CloudWatch are the best diagnostic.

### Everything else

[Open a GitHub issue](https://github.com/raykrueger/cdk-game-server/issues).

## Contributing

The project is managed by [projen](https://projen.io/): `package.json`, CI workflows, lint config, and related files are generated. To change project configuration, edit `.projenrc.js` and run `npx projen` — don't hand-edit the generated files.

``` bash
yarn install
npx projen build   # compile (jsii) + docgen + test + lint + package
```

Note that the test suite is currently minimal: the CDK synth test is disabled because CI cannot access the Docker socket needed by the asset builds.

## License

[Apache License 2.0](./LICENSE)
