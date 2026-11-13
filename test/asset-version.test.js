'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const {assetVersion, versionReplayAssets} = require('../build-tools/asset-version');

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
	it('keeps replay dependency URLs stable and invalidates only the changed public asset', () => {
		const template = [
			"requireScript('https://play.pokemonshowdown.com/js/client.js?a7');",
			"linkStyle('https://teams.pokemonshowdown.com/js/client.js?a7');",
			"requireScript('https://cdn.example.invalid/library.js?v1');",
			"var replayText = 'a7';",
		].join('\n');
		const first = versionReplayAssets(template, root, 'play.psfantasy.xyz');
		assert.equal(versionReplayAssets(template, root, 'play.psfantasy.xyz'), first);
		assert(first.includes('https://play.psfantasy.xyz/js/client.js?'));
		assert(first.includes("var replayText = 'a7';"));
		assert(first.includes('https://cdn.example.invalid/library.js?v1'));
		fs.appendFileSync(path.join(root, 'play.pokemonshowdown.com/js/client.js'), 'changed');
		const second = versionReplayAssets(template, root, 'play.psfantasy.xyz').split('\n');
		assert.notEqual(second[0], first.split('\n')[0]);
		assert.deepEqual(second.slice(1), first.split('\n').slice(1));
		assert.throws(() => versionReplayAssets("requireScript('https://play.pokemonshowdown.com/js/missing.js?a7');",
			root, 'play.psfantasy.xyz'), /ENOENT/);
	});
	it('preserves replay loader order, versionless libraries and empty-query content hashing', () => {
		const calls = [
			'requireScript("//play.pokemonshowdown.com/js/library.js");',
			"linkStyle('https://play.pokemonshowdown.com/js/client.js?');",
			"requireScript('https://teams.pokemonshowdown.com/js/client.js?a7');",
			"requireScript('https://play.psfantasy.xyz/js/client.js?a7');",
		];
		const result = versionReplayAssets(calls.join('\n'), root, 'localhost:8080');
		const loaded = [];
		vm.runInNewContext(result, {requireScript: url => loaded.push(['script', url]), linkStyle: url => loaded.push(['style', url])});
		assert.deepEqual(loaded, [
			['script', '//localhost:8080/js/library.js'],
			['style', 'https://localhost:8080/js/client.js?' + assetVersion('js/client.js', 'play.pokemonshowdown.com', root)],
			['script', 'https://teams.pokemonshowdown.com/js/client.js?' + assetVersion('js/client.js', 'teams.pokemonshowdown.com', root)],
			['script', 'https://play.psfantasy.xyz/js/client.js?' + assetVersion('js/client.js', 'play.pokemonshowdown.com', root)],
		]);
	});
	it('finishes writing combined bundles before hashing both clean and incremental builds', async () => {
		const {compileToFile} = require('../build-tools/compiler');
		const src = path.join(root, 'source.js');
		const dest = path.join(root, 'play.pokemonshowdown.com/js/bundle.js');
		const options = {babelrc: false, configFile: false, sourceMaps: true, incremental: true};
		fs.writeFileSync(src, 'const version = 1;');
		assert.equal(await compileToFile(src, dest, options), 1);
		const first = assetVersion('js/bundle.js', 'play.pokemonshowdown.com', root);
		assert.match(fs.readFileSync(dest, 'utf8'), /version = 1/);
		assert(fs.existsSync(dest + '.map'));
		assert.equal(await compileToFile(src, dest, options), 0);
		fs.writeFileSync(src, 'const version = 2;');
		// Keep the assertion independent of the filesystem's timestamp resolution.
		fs.utimesSync(dest, new Date(0), new Date(0));
		assert.equal(await compileToFile(src, dest, options), 1);
		assert.notEqual(assetVersion('js/bundle.js', 'play.pokemonshowdown.com', root), first);
		assert.match(fs.readFileSync(dest, 'utf8'), /version = 2/);
		assert.equal(options.incremental, true);
		await assert.rejects(compileToFile(src, root, options));
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
