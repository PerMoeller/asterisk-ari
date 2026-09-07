import assert from 'node:assert/strict'
import { test } from 'node:test'

import { compare } from './require-version-bump.mjs'

test('orders release versions by numeric precedence', () => {
	assert.equal(compare('1.8.1', '1.8.0'), 1)
	assert.equal(compare('1.8.0', '1.8.1'), -1)
	assert.equal(compare('1.8.0', '1.8.0'), 0)
	assert.equal(compare('1.10.0', '1.9.0'), 1)
	assert.equal(compare('2.0.0', '1.99.99'), 1)
	assert.equal(compare('1.4.33', '1.4.9'), 1)
})

test('ranks a prerelease below its release', () => {
	assert.equal(compare('1.9.0-beta.1', '1.9.0'), -1)
	assert.equal(compare('1.9.0', '1.9.0-beta.1'), 1)
	assert.equal(compare('1.9.0-beta.1', '1.8.1'), 1)
})

test('orders prerelease identifiers by semver rules', () => {
	assert.equal(compare('1.9.0-beta.2', '1.9.0-beta.1'), 1)
	assert.equal(compare('1.9.0-beta.10', '1.9.0-beta.9'), 1)
	assert.equal(compare('1.9.0-beta', '1.9.0-alpha'), 1)
	assert.equal(compare('1.9.0-alpha.1', '1.9.0-alpha'), 1)
	assert.equal(compare('1.9.0-1', '1.9.0-alpha'), -1)
})

test('rejects versions that are not semver', () => {
	assert.throws(() => compare('1.9', '1.8.0'), /not a semver version/)
	assert.throws(() => compare('v1.9.0', '1.8.0'), /not a semver version/)
})
