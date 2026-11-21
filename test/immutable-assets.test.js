'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const {immutableAssets} = require('../build-tools/immutable-assets');
describe('Immutable public asset publication', () => {
	let root;
	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-immutable-'));
		for (const dir of ['js', 'data', 'style/fonts', 'sprites', 'fx', 'config']) fs.mkdirSync(path.join(root, dir), {recursive: true});
		fs.writeFileSync(path.join(root, 'js/test.js'), 'window.test = 1;');
		fs.writeFileSync(path.join(root, 'sprites/icon.png'), 'fake-image');
		fs.writeFileSync(path.join(root, 'style/fonts/test.woff2'), 'fake-font');
		fs.writeFileSync(path.join(root, 'style/test.css'), 'a{background:url(../sprites/icon.png?v=old)}@font-face{src:url("fonts/test.woff2?v=1")}');
	});
	afterEach(() => {assert.equal(path.dirname(root), os.tmpdir()); fs.rmSync(root, {recursive: true});});
	it('versions HTML and lazy attributes, rewrites CSS dependencies and keeps old immutable bytes', () => {
		const a = immutableAssets(root);
		const old = a.publish('js/test.js');
		const entry = a.entry('<script src="js/test.js?abc"></script><script data-search-src="data/private.js"></script><link href="style/test.css?123">', 'play.test');
		assert(entry.includes(old)); assert(entry.includes('data-search-src="data/private.js"'));
		const css = fs.readFileSync(path.join(root, a.publish('style/test.css')), 'utf8');
		assert.match(css, /icon\.[a-f0-9]{20}\.png/); assert.match(css, /test\.[a-f0-9]{20}\.woff2/);
		fs.writeFileSync(path.join(root, 'js/test.js'), 'window.test = 2;');
		const next = immutableAssets(root).publish('js/test.js'); assert.notEqual(next, old);
		assert.equal(fs.readFileSync(path.join(root, old), 'utf8'), 'window.test = 1;');
	});
	it('does not publish configurations, PHP, cross-origin URLs, or arbitrary query versions', () => {
		const a = immutableAssets(root);
		for (const file of ['config/config.js', 'js/login.php', '../secret.js', 'js/../config/config.js']) assert.throws(() => a.publish(file));
		const entry = '<script src="config/config.js?abc"></script><script src="https://elsewhere.test/js/test.js?abc"></script><script src="js/test.js?v=1"></script>';
		assert.equal(a.entry(entry, 'play.test'), entry);
	});
	it('maps only existing same-origin media and keeps optional CDN paths untouched', () => {
		const a = immutableAssets(root); a.mediaMap();
		const context = {window: {}, URL, location: {origin: 'https://play.test'}, document: {baseURI: 'https://play.test/testclient.html'}};
		vm.runInNewContext(fs.readFileSync(path.join(root, 'data/asset-urls.js'), 'utf8'), context);
		assert.match(context.window.FantasyAssetURL('./sprites/icon.png?v=old'), /^https:\/\/play.test\/sprites\/icon\.[a-f0-9]{20}\.png$/);
		assert.equal(context.window.FantasyAssetURL('https://cdn.test/sprites/icon.png'), 'https://cdn.test/sprites/icon.png');
		assert.equal(context.window.FantasyAssetURL('/sprites/missing.png'), '/sprites/missing.png');
	});
	it('versions absolute CSS references without changing fragment identifiers', () => {
		fs.writeFileSync(path.join(root, 'style/test.css'), 'a{background:url(/sprites/icon.png#part)}');
		const a = immutableAssets(root), css = fs.readFileSync(path.join(root, a.publish('style/test.css')), 'utf8');
		assert.match(css, /url\(\.\.\/sprites\/icon\.[a-f0-9]{20}\.png#part\)/);
	});
	it('shares the CSS and dynamic background URL without changing stored preferences or custom colors', () => {
		fs.writeFileSync(path.join(root, 'fx/client-bg-charizards.jpg'), 'fake-background');
		const a = immutableAssets(root); a.mediaMap();
		const styles = [], images = [], preferences = {};
		const chain = {css(value) {styles.push(value); return this;}, remove() {return this;}, html() {return this;}, append() {return this;}};
		const context = {URL, location: {origin: 'https://play.test', host: 'play.test'}, document: {baseURI: 'https://play.test/', body: {}},
			Config: {routes: {client: 'another.test'}}, Dex: {resourcePrefix: '/'}, $: () => chain,
			Image: function () {images.push(this);}, localStorage: {setItem(key, value) {preferences[key] = value;}, removeItem(key) {delete preferences[key];}}};
		context.window = context;
		vm.runInNewContext(fs.readFileSync(path.join(root, 'data/asset-urls.js'), 'utf8'), context);
		const source = fs.readFileSync(path.join(__dirname, '../play.pokemonshowdown.com/js/storage.js'), 'utf8');
		vm.runInNewContext(source.slice(0, source.indexOf('\ntry {\n\tvar bg =')), context);
		const url = '/fx/client-bg-charizards.jpg';
		context.Storage.bg.set(url, 'charizards');
		const resolved = context.FantasyAssetURL(url);
		assert(styles.some(value => value.background && value.background.includes(resolved)));
		assert.equal(preferences.showdown_bg, url + '\ncharizards');
		context.Storage.bg.extractMenuColors(url, 'custom', true);
		assert.equal(images[0].src, resolved);
		context.Storage.bg.load('#123456', 'custom', ['0, 0%']);
		assert(styles.some(value => value.background === '#123456'));
		assert.equal(context.Storage.bg.assetURL('https://images.test/custom.jpg'), 'https://images.test/custom.jpg');
	});
});
