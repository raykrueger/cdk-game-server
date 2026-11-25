const { awscdk, ReleasableCommits } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');
const { NpmAccess } = require('projen/lib/javascript');
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'Ray Krueger',
  authorAddress: 'raykrueger@gmail.com',
  cdkVersion: '2.278.0',
  // jsii and jsii-rosetta are added together with this version (see
  // projen/lib/cdk/jsii-build.js), so one knob moves both. TypeScript has to
  // move with them: jsii 5.9 pins typescript ~5.9 and jsii 6 pins ~6.0.
  // The ceiling is 6.x -- ts-jest also requires typescript <7 -- so TS 7 is
  // off the table until both jsii and ts-jest say otherwise.
  jsiiVersion: '^6.0.25',
  typescriptVersion: '^6.0.3',
  // One knob drives all three, via JestOptions: projen adds
  // jest@<jestVersion> and @types/jest@<jestVersion>, and picks ts-jest@^29
  // itself when the jest major is >29
  // (projen/lib/typescript/typescript.js). ts-jest 29 supports jest 30 and
  // typescript <7, which is the ceiling we are under anyway.
  jestOptions: {
    jestVersion: '^30',
  },
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
  // projen defaults to ReleasableCommits.everyCommit(), which publishes on
  // *every* push to main -- including chore:/docs:/ci: commits that change no
  // shipped code. Only features and fixes should cut a version.
  releasableCommits: ReleasableCommits.featuresAndFixes(),
  catalog: {
    announce: false,
    twitter: 'raykrueger',
  },

  deps: [
    '@raykrueger/cdk-fargate-public-dns',
    // Must stay in step with cdkVersion: these carry a hard dependency on
    // @aws-cdk/cloud-assembly-schema, and jsii-pacmak fails the package step if
    // two major versions of it end up in the type system.
    '@aws-solutions-constructs/aws-apigateway-lambda@^2.107.0',
    '@aws-solutions-constructs/core@^2.107.0',
  ],
  constructsVersion: '10.8.1',
  // NOTE: deliberately no `devDeps: ['@types/node']` here. projen's
  // addNodeTypesVersion() bails out if the user declared that dependency, and
  // then whatever stale range is already in package.json is frozen forever
  // (it was stuck at ^18 <= 18.11.19). Left alone, projen pins @types/node to
  // the major of minNodeVersion.

  /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */

  eslintOptions: {
    ignorePatterns: ['test/'],
  },
});

// projen's Apache-2.0 template ends in the literal "Copyright [yyyy] [name of
// copyright owner]" placeholder (it has no $copyright_owner token, so the
// copyrightOwner/copyrightPeriod options never apply to it). Patch the
// managed file's content so synth emits a real notice.
const license = project.tryFindFile('LICENSE');
if (license) {
  license.text = license.text.replace(
    'Copyright [yyyy] [name of copyright owner]',
    'Copyright 2021-2026 Ray Krueger',
  );
}

project.synth();
