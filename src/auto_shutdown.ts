import * as path from 'path';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { BaseService } from 'aws-cdk-lib/aws-ecs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LambdaSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface AutoShutdownProps {
  readonly cpuUtilizationMin?: number;
  readonly evaluationPeriods?: number;
}

export const DEFAULT_CPU_UTILIZATION_MIN = 5;
export const DEFAULT_EVALUATION_PERIODS = 6;

export class AutoShutdown extends Construct {

  readonly cpuUtilizationMin: number;
  readonly evaluationPeriods: number;
  readonly topic: Topic;
  readonly function: Function;

  constructor(scope: Construct, id: string, props?: AutoShutdownProps) {
    super(scope, id);

    this.cpuUtilizationMin = props?.cpuUtilizationMin || DEFAULT_CPU_UTILIZATION_MIN;
    this.evaluationPeriods = props?.evaluationPeriods || DEFAULT_EVALUATION_PERIODS;

    this.topic = new Topic(this, 'AutoShutdownTopic');

    const code = Code.fromAsset(path.join(__dirname, '../resources/functions/autoshutdown'));

    this.function = this.buildShutdownFunction(code);
    this.topic.addSubscription(new LambdaSubscription(this.function));

  }

  buildShutdownFunction(code: Code) {
    return new Function(this, 'AutoShutdownFunction', {
      code,
      handler: 'autoshutdown.handler',
      runtime: Runtime.PYTHON_3_9,
    });
  }

  addService(service: BaseService) {
    const alarm = service.metricCpuUtilization().createAlarm(this, 'CpuUtilization', {
      evaluationPeriods: this.evaluationPeriods,
      threshold: this.cpuUtilizationMin,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    alarm.addAlarmAction(new SnsAction(this.topic));

    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: ['ecs:UpdateService'],
        resources: [service.serviceArn],
      }),
    );
  }

}