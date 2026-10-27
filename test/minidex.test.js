'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const imageSize = require('image-size');

const webRoot = path.resolve(__dirname, '../play.pokemonshowdown.com');
const generator = fs.readFileSync(path.resolve(__dirname, '../build-tools/build-minidex'), 'utf8');
const toID = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const species = {
	pikachu: {id: 'pikachu', spriteid: 'pikachu', num: 25, cosmeticFormes: ['Pikachu-Rock-Star']},
	bulbasaur: {id: 'bulbasaur', spriteid: 'bulbasaur', num: 1},
};
const fixtureDex = {toID, data: {Pokedex: species}, species: {get: id => species[id]}};
const official = {pikachu: {front: {w: 50, h: 60}, back: {w: 55, h: 65}}};

describe('Local mini Pokedex assets', () => {
	let directory;
	beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-minidex-test-')); });
	afterEach(() => {
		assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
		assert(path.basename(directory).startsWith('ps-minidex-test-'));
		fs.rmSync(directory, {recursive: true, force: true});
	});

	function generate() {
		// Run the real CLI without changing the test runner's cwd or requiring a
		// second server checkout. All output and image reads stay in the fixture.
		const local = filename => path.resolve(directory, filename);
		vm.runInNewContext(generator, {
			__dirname: path.resolve(__dirname, '../build-tools'),
			process: {chdir() {}, stdout: {write() {}}}, console: {log() {}},
			require(name) {
				if (name === 'path') return path;
				if (name === 'image-size') return filename => imageSize(local(filename));
				if (name === './server-source') return {serverPath: () => 'fixture-dex'};
				if (name === './official-sprite-metadata.json') return {sprites: official};
				if (name === 'fixture-dex') return {Dex: fixtureDex};
				if (name === 'fs') return {
					mkdirSync: (filename, options) => fs.mkdirSync(local(filename), options),
					writeFileSync: (filename, data) => fs.writeFileSync(local(filename), data),
					existsSync: filename => fs.existsSync(local(filename)),
					unlinkSync: filename => fs.unlinkSync(local(filename)),
				};
				throw new Error(`Unexpected dependency: ${name}`);
			},
		});
		const result = {};
		for (const file of ['pokedex-mini.js', 'pokedex-mini-bw.js']) {
			vm.runInNewContext(fs.readFileSync(local(`data/${file}`), 'utf8'), {exports: result});
		}
		return JSON.parse(JSON.stringify(result));
	}
	function gif(filename, width, height) {
		const file = path.join(directory, 'sprites', filename);
		fs.mkdirSync(path.dirname(file), {recursive: true});
		const bytes = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
		bytes.writeUInt16LE(width, 6);
		bytes.writeUInt16LE(height, 8);
		fs.writeFileSync(file, bytes);
	}
	it('creates both scripts in a fresh checkout without any animation directory', () => {
		const {BattlePokemonSprites: xy, BattlePokemonSpritesBW: bw} = generate();
		for (const table of [xy, bw]) {
			assert.deepEqual(table.pikachu, table === xy ? {...official.pikachu, num: 25} : {num: 25});
			assert.deepEqual(table.bulbasaur, {num: 1});
			assert.deepEqual(table.pikachurockstar, {num: 25});
		}
		assert.deepEqual(xy.substitute.front, {w: 34, h: 39});
	});
	it('builds BW animation metadata even when XY animations are absent', () => {
		gif('gen5ani/pikachu.gif', 21, 33);
		gif('gen5ani-back/pikachu.gif', 17, 29);
		const {BattlePokemonSprites: xy, BattlePokemonSpritesBW: bw} = generate();
		assert.deepEqual(bw.pikachu.front, {w: 21, h: 33});
		assert.deepEqual(bw.pikachu.back, {w: 17, h: 29});
		assert.deepEqual(xy.pikachu.front, official.pikachu.front);
	});
	it('preserves dimensions, female and cosmetic variants without inventing missing GIFs', () => {
		gif('ani/pikachu.gif', 25, 35);
		gif('ani/pikachu-f.gif', 23, 37);
		gif('ani-back/pikachu-f.gif', 20, 30);
		gif('ani/pikachu-rockstar.gif', 40, 45);
		const {BattlePokemonSprites: xy} = generate();
		assert.deepEqual(xy.pikachu.front, {w: 25, h: 35});
		assert.deepEqual(xy.pikachu.frontf, {w: 23, h: 37});
		assert.deepEqual(xy.pikachu.backf, {w: 20, h: 30});
		assert.deepEqual(xy.pikachu.back, official.pikachu.back);
		assert.deepEqual(xy.pikachurockstar.front, {w: 40, h: 45});
		assert.deepEqual(xy.bulbasaur, {num: 1});
	});
	it('rebuilds stale metadata after animation files are removed instead of deleting the scripts', () => {
		gif('ani/pikachu.gif', 25, 35);
		generate();
		fs.unlinkSync(path.join(directory, 'sprites/ani/pikachu.gif'));
		fs.rmdirSync(path.join(directory, 'sprites/ani'));
		const {BattlePokemonSprites: xy, BattlePokemonSpritesBW: bw} = generate();
		assert.deepEqual(xy.pikachu, {...official.pikachu, num: 25});
		assert.deepEqual(bw.pikachu, {num: 25});
	});
	it('defaults to official 3D, honors the 2D toggle, and retains unsupported-animation fallback', () => {
		const tables = generate();
		const appended = [];
		const context = vm.createContext({
			...tables,
			Pokemon: function () {},
			Config: {routes: {client: 'client.example'}},
			document: {
				location: {protocol: 'https:'},
				getElementById: () => ({}),
				getElementsByTagName: tag => tag === 'body' ? [{appendChild: el => appended.push(el)}] : [],
				createElement: () => ({}),
			},
			$: () => ({attr: () => 'data/pokedex-mini.js?buildhash'}),
		});
		context.window = context;
		context.exports = context;
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'js/battle-dex.js']) {
			vm.runInContext(fs.readFileSync(path.join(webRoot, file), 'utf8'), context);
		}
		let pixels = false;
		context.Dex.prefs = key => key === 'bwgfx' && pixels;
		for (const front of [true, false]) {
			assert.match(context.Dex.getSpriteData('Pikachu', front, {gen: 9}).url, /\/sprites\/ani(?:-back)?\/pikachu\.gif$/);
		}
		pixels = true;
		assert.match(context.Dex.getSpriteData('Pikachu', true, {gen: 9}).url, /\/sprites\/gen5\/pikachu\.png$/);
		pixels = false;
		assert.match(context.Dex.getSpriteData('Pikachu', true, {gen: 9}).url, /\/sprites\/ani\/pikachu\.gif$/);
		assert.match(context.Dex.getSpriteData('Bulbasaur', true, {gen: 9}).url, /\/sprites\/gen5\/bulbasaur\.png$/);
		context.Dex.loadSpriteData('bw');
		assert.equal(appended[0].src, 'data/pokedex-mini-bw.js?buildhash');
	});
	it('references both locally generated scripts from the deployed test client and beta client', () => {
		for (const page of ['testclient.html', 'testclient-beta.html']) {
			const html = fs.readFileSync(path.join(webRoot, page), 'utf8');
			for (const file of ['pokedex-mini.js', 'pokedex-mini-bw.js']) {
				assert(html.includes(`src="data/${file}`), `${page} must load ${file} locally first`);
			}
		}
	});
});
