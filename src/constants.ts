import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';

export class Constants {
  static readonly LAMBDA_RUNTIME = Runtime.PYTHON_3_12;
  static readonly LAMBDA_ARCH = process.arch === 'arm64' ? Architecture.ARM_64 : Architecture.X86_64;
}