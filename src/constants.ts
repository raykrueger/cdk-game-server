import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class Constants {
  static readonly LAMBDA_RUNTIME = Runtime.PYTHON_3_12;
}