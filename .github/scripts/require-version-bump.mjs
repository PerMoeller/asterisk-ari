#!/usr/bin/env node

// Fails the PR unless package.json's version is a semver increase over the base
// branch AND is not already present on the npm registry. The registry check
// catches two PRs that are open at once and both bump to the same number.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const parse = version => {
	const match = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/.exec(version)
	if (!match) throw new Error(`not a semver version: ${version}`)
	return {
		numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
		prerelease: match[4]?.split('.') ?? [],
	}
}

const comparePrerelease = (left, right) => {
	for (const [index, identifier] of left.entries()) {
		const other = right[index]
		if (other === undefined) return 1
		if (identifier === other) continue

		const leftIsNumeric = /^\d+$/.test(identifier)
		const rightIsNumeric = /^\d+$/.test(other)

		if (leftIsNumeric && rightIsNumeric) return Number(identifier) > Number(other) ? 1 : -1
		// Semver: numeric identifiers always rank below alphanumeric ones.
		if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1
		return identifier > other ? 1 : -1
	}

	return left.length < right.length ? -1 : 0
}

// Standard semver precedence: numeric fields first, then prerelease identifiers,
// where a version without a prerelease outranks the same version with one.
export const compare = (a, b) => {
	const left = parse(a)
	const right = parse(b)

	for (const [index, number] of left.numbers.entries()) {
		if (number !== right.numbers[index]) return number > right.numbers[index] ? 1 : -1
	}

	if (left.prerelease.length === 0 || right.prerelease.length === 0) {
		if (left.prerelease.length === right.prerelease.length) return 0
		return left.prerelease.length === 0 ? 1 : -1
	}

	return comparePrerelease(left.prerelease, right.prerelease)
}

const fail = message => {
	console.error(`::error::${message}`)
	process.exit(1)
}

const publishedVersions = name => {
	try {
		const output = execFileSync('npm', ['view', name, 'versions', '--json'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		const versions = JSON.parse(output)
		return Array.isArray(versions) ? versions : [versions]
	} catch (error) {
		const details = `${error.stderr ?? ''}${error.stdout ?? ''}`

		// The registry answers 404 both for a package that does not exist and for
		// a private one the token cannot see, so this check cannot tell them
		// apart. It fails closed rather than waving a version through unverified.
		if (/E404|404 Not Found/.test(details)) {
			fail(`could not read ${name} from the npm registry (404). If the package is private, the NPM_TOKEN secret is probably missing, expired, or lacking read access; if it has never been published, publish it once by hand first.`)
		}

		return fail(`could not read published versions for ${name}: ${error.stderr || error.message}`)
	}
}

const main = () => {
	const baseRef = process.env.BASE_REF ?? 'origin/master'
	const head = JSON.parse(readFileSync('package.json', 'utf8'))
	const base = JSON.parse(execFileSync('git', ['show', `${baseRef}:package.json`], { encoding: 'utf8' }))

	console.log(`base (${baseRef}): ${base.version}`)
	console.log(`head:              ${head.version}`)

	if (compare(head.version, base.version) <= 0) {
		fail(`version must be bumped: package.json is ${head.version}, which is not greater than ${base.version} on ${baseRef}`)
	}

	if (publishedVersions(head.name).includes(head.version)) {
		fail(`version ${head.version} is already published as ${head.name}@${head.version} - bump to an unused version`)
	}

	console.log(`ok: ${head.version} is a bump over ${base.version} and is not yet on the registry`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
