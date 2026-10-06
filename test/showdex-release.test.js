'use strict';

const assert = require('assert').strict;
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifyShowdexAssets } = require('../build-tools/showdex-assets');

const webRoot = path.resolve(__dirname, '../play.pokemonshowdown.com');
const release = path.join(webRoot, 'showdex');

describe('Embedded calculator deployment', () => {
	it('ships a complete standalone release including the corresponding source and licenses', () => {
		const manifest = verifyShowdexAssets(release);
		assert(manifest.files['main.js'].bytes > 100000);
		assert(manifest.files['source.tar.gz'].bytes > 100000);
		assert(Object.keys(manifest.files).some(name => name.endsWith('.svg')));
	});

	it('fails a build if the calculator bundle was omitted from deployment', () => {
		const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fantasy-showdex-release-'));
		try {
			fs.copyFileSync(path.join(release, 'asset-manifest.json'), path.join(directory, 'asset-manifest.json'));
			assert.throws(() => verifyShowdexAssets(directory), /Do not deploy an incomplete client/);
		} finally {
			fs.rmSync(directory, { recursive: true });
		}
	});

	it('rejects mixed versions of the bundle and source archive', () => {
		const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fantasy-showdex-release-'));
		try {
			const manifest = JSON.parse(fs.readFileSync(path.join(release, 'asset-manifest.json'), 'utf8'));
			for (const name of Object.keys(manifest.files)) {
				fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
				fs.copyFileSync(path.join(release, name), path.join(directory, name));
			}
			fs.writeFileSync(path.join(directory, 'asset-manifest.json'), JSON.stringify(manifest));
			fs.appendFileSync(path.join(directory, 'source.tar.gz'), 'stale');
			assert.throws(() => verifyShowdexAssets(directory), /Incomplete or mixed Showdex release: source.tar.gz/);
		} finally {
			fs.rmSync(directory, { recursive: true });
		}
	});

	it('versions both production and test-client calculator URLs using the shipped bundle', () => {
		const manifest = verifyShowdexAssets(release);
		for (const page of ['index.html', 'testclient.html']) {
			const html = fs.readFileSync(path.join(webRoot, page), 'utf8');
			assert(html.includes(`showdex/main.js?${manifest.files['main.js'].sha256.slice(0, 12)}"`));
		}
	});

	it('invalidates cached test-client code after a source update', () => {
		const html = fs.readFileSync(path.join(webRoot, 'testclient.html'), 'utf8');
		for (const resource of ['js/client.js', 'data/gen9fantasy.js', 'js/ps-china-translator.js']) {
			const script = fs.readFileSync(path.join(webRoot, resource), 'utf8');
			const hash = crypto.createHash('md5').update(script).digest('hex').slice(0, 8);
			assert(html.includes(`${resource}?${hash}"`));
		}
	});
});
