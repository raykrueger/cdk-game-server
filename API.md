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

##### `isConstruct` <a name="isConstruct" id="@raykrueger/cdk-game-server.GameServer.isConstruct"></a>

```typescript
import { GameServer } from '@raykrueger/cdk-game-server'

GameServer.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

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
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.mountTarget">mountTarget</a></code> | <code><a href="#@raykrueger/cdk-game-server.MountOptions">MountOptions</a></code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.service">service</a></code> | <code>aws-cdk-lib.aws_ecs.IService</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.GameServer.property.useSpot">useSpot</a></code> | <code>boolean</code> | *No description.* |
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
public readonly mountTarget: MountOptions;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.MountOptions">MountOptions</a>

---

##### `service`<sup>Required</sup> <a name="service" id="@raykrueger/cdk-game-server.GameServer.property.service"></a>

```typescript
public readonly service: IService;
```

- *Type:* aws-cdk-lib.aws_ecs.IService

---

##### `useSpot`<sup>Required</sup> <a name="useSpot" id="@raykrueger/cdk-game-server.GameServer.property.useSpot"></a>

```typescript
public readonly useSpot: boolean;
```

- *Type:* boolean

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
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.mountTarget">mountTarget</a></code> | <code><a href="#@raykrueger/cdk-game-server.MountOptions">MountOptions</a></code> | *No description.* |
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
| <code><a href="#@raykrueger/cdk-game-server.GameServerProps.property.useSpot">useSpot</a></code> | <code>boolean</code> | *No description.* |
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
public readonly mountTarget: MountOptions;
```

- *Type:* <a href="#@raykrueger/cdk-game-server.MountOptions">MountOptions</a>

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

##### `useSpot`<sup>Optional</sup> <a name="useSpot" id="@raykrueger/cdk-game-server.GameServerProps.property.useSpot"></a>

```typescript
public readonly useSpot: boolean;
```

- *Type:* boolean

---

##### `vpc`<sup>Optional</sup> <a name="vpc" id="@raykrueger/cdk-game-server.GameServerProps.property.vpc"></a>

```typescript
public readonly vpc: IVpc;
```

- *Type:* aws-cdk-lib.aws_ec2.IVpc

Provide an existing VPC to deploy into.

If none is given a default `ec2.VPC` will be created.

---

### MountOptions <a name="MountOptions" id="@raykrueger/cdk-game-server.MountOptions"></a>

#### Initializer <a name="Initializer" id="@raykrueger/cdk-game-server.MountOptions.Initializer"></a>

```typescript
import { MountOptions } from '@raykrueger/cdk-game-server'

const mountOptions: MountOptions = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#@raykrueger/cdk-game-server.MountOptions.property.mountTarget">mountTarget</a></code> | <code>string</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.MountOptions.property.aclGroupId">aclGroupId</a></code> | <code>number</code> | *No description.* |
| <code><a href="#@raykrueger/cdk-game-server.MountOptions.property.aclUserId">aclUserId</a></code> | <code>number</code> | *No description.* |

---

##### `mountTarget`<sup>Required</sup> <a name="mountTarget" id="@raykrueger/cdk-game-server.MountOptions.property.mountTarget"></a>

```typescript
public readonly mountTarget: string;
```

- *Type:* string

---

##### `aclGroupId`<sup>Optional</sup> <a name="aclGroupId" id="@raykrueger/cdk-game-server.MountOptions.property.aclGroupId"></a>

```typescript
public readonly aclGroupId: number;
```

- *Type:* number

---

##### `aclUserId`<sup>Optional</sup> <a name="aclUserId" id="@raykrueger/cdk-game-server.MountOptions.property.aclUserId"></a>

```typescript
public readonly aclUserId: number;
```

- *Type:* number

---



