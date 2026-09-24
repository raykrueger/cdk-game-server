const { awscdk } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');
const { NpmAccess } = require('projen/lib/javascript');
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Ray Krueger',
  authorAddress: 'raykrueger@gmail.com',
  cdkVersion: '2.270.0',
  packageManager: NodePackageManager.YARN_CLASSIC,
  defaultReleaseBranch: 'main',
  name: '@raykrueger/cdk-game-server',
  repositoryUrl: 'https://github.com/raykrueger/cdk-game-server.git',
  releaseToNpm: true,
  npmAccess: NpmAccess.PUBLIC,
  // Publish to npmjs.org via npm trusted publishing (OIDC). Pre-configured on
  // the npm side for this repo; no NPM_TOKEN needed. See
  // https://docs.npmjs.com/trusted-publishers
  npmTrustedPublishing: true,
  minNodeVersion: '24',
  catalog: {
    announce: false,
    twitter: 'raykrueger',
  },

  deps: [
    '@raykrueger/cdk-fargate-public-dns',
    '@aws-solutions-constructs/aws-apigateway-lambda',
    '@aws-solutions-constructs/core',
  ],
  constructsVersion: '10.8.1',
  devDeps: [
    '@types/node',
  ],

  /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */

  eslintOptions: {
    ignorePatterns: ['test/'],
  },
});

project.synth();
