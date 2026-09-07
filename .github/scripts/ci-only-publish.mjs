#!/usr/bin/env node

// Publishing is automated: .github/workflows/publish.yml publishes whatever
// version lands on master. This guard runs from prepublishOnly and refuses a
// local `npm publish`, so old habits cannot ship a build that never went
// through the PR checks.

if (process.env.GITHUB_ACTIONS === 'true') process.exit(0)

console.error(`
npm publish is disabled outside GitHub Actions.

This package publishes itself: merge to master and .github/workflows/publish.yml
builds and publishes the version in package.json, then tags the release.

To release, open a PR that raises "version" in package.json and merge it.
`)

process.exit(1)
