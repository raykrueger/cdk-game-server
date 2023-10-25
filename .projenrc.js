const { awscdk } = require('projen');
const { NpmAccess } = require('projen/lib/javascript');
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Ray Krueger',
  authorAddress: 'raykrueger@gmail.com',
  cdkVersion: '2.102.0',
  defaultReleaseBranch: 'main',
  name: '@raykrueger/cdk-game-server',
  repositoryUrl: 'https://github.com/raykrueger/cdk-game-server.git',
  releaseToNpm: true,
  npmAccess: NpmAccess.PUBLIC,
  minNodeVersion: '16.14.0',
  catalog: {
    announce: false,
    twitter: 'raykrueger',
  },

  deps: [
    '@raykrueger/cdk-fargate-public-dns',
  ],
  bundledDeps: [
    '@aws-solutions-constructs/aws-apigateway-lambda',
    '@matthewbonig/state-machine',
  ],
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
