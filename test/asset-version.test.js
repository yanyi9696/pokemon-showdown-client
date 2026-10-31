'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const {assetVersion} = require('../build-tools/asset-version');

describe('Client asset versions and local startup', () => {
	let root;
	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-asset-version-'));
		for (const site of ['play.pokemonshowdown.com', 'teams.pokemonshowdown.com']) {
			fs.mkdirSync(path.join(root, site, 'js'), {recursive: true});
			fs.writeFileSync(path.join(root, site, 'js/client.js'), site);
		}
	});
	afterEach(() => {
		assert.equal(path.dirname(path.resolve(root)), path.resolve(os.tmpdir()));
		assert(path.basename(root).startsWith('ps-asset-version-'));
		fs.rmSync(root, {recursive: true, force: true});
	});
	it('hashes the actual public file identically for hosted, root and relative URLs', () => {
		const expected = crypto.createHash('md5').update('play.pokemonshowdown.com').digest('hex').slice(0, 8);
		for (const url of ['//play.pokemonshowdown.com/js/client.js', 'https://play.pokemonshowdown.com/js/client.js', '/js/client.js', 'js/client.js']) {
			for (let i = 0; i < 3; i++) assert.equal(assetVersion(url, 'play.pokemonshowdown.com', root), expected);
		}
		assert.notEqual(assetVersion('js/client.js', 'teams.pokemonshowdown.com', root), expected);
		fs.appendFileSync(path.join(root, 'play.pokemonshowdown.com/js/client.js'), 'changed');
		assert.notEqual(assetVersion('js/client.js', 'play.pokemonshowdown.com', root), expected);
	});
	it('rejects missing public assets and paths outside the workspace instead of random cache busting', () => {
		assert.throws(() => assetVersion('js/missing.js', 'play.pokemonshowdown.com', root), /ENOENT/);
		assert.throws(() => assetVersion('../../outside.js', 'play.pokemonshowdown.com', root), /outside/);
		assert.equal(assetVersion('https://example.invalid/optional.js', 'play.pokemonshowdown.com', root), undefined);
	});
	it('never opens the optional private testclient key', () => {
		// A directory is deliberately unreadable as a file; even an existing key path is skipped.
		fs.mkdirSync(path.join(root, 'config/testclient-key.js'), {recursive: true});
		assert.equal(assetVersion('../config/testclient-key.js', 'play.pokemonshowdown.com', root), undefined);
	});
	it('starts the local app once without waiting for remote images or the load event', () => {
		const template = fs.readFileSync(path.join(__dirname, '../play.pokemonshowdown.com/testclient.template.html'), 'utf8');
		const scripts = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
		const bootstrap = scripts.filter(script => script.includes('new App()'));
		assert.equal(bootstrap.length, 1);
		let starts = 0;
		const context = {window: {}, App: function () { starts++; this.connected = true; }};
		vm.runInNewContext(bootstrap[0], context);
		assert.equal(starts, 1);
		assert.equal(context.window.app.connected, true);
		assert.equal(context.window.onload, undefined);
	});
});
