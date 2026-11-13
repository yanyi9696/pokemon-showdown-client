'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const {serializeLazyValue} = require('../build-tools/lazy-data');
const {splitFantasyData, writeFantasyDataSplit, verifyFantasyDataSplit} = require('../build-tools/fantasy-data-split');

const mod = 'gen9fantasy';
const data = {pikachu: {learnset: {thunderbolt: ['9M', '8M']}, eventData: [{generation: 3, level: 10}]}};
const raw = serializeLazyValue('Gen9fantasyLearnsets', data);
const original = `exports.Gen9fantasydex = {pikachu: {name: 'Pikachu'}};\n${raw}\nexports.Gen9fantasySearchIndex = [['pikachu','pokemon']];`;
function load(source) {
	const context = vm.createContext({exports: {}});
	vm.runInContext(source, context);
	return context;
}
function withDirectory(fn) {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fantasy-data-split-'));
	try { fn(directory); } finally {
		assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
		assert(path.basename(directory).startsWith('fantasy-data-split-'));
		fs.rmSync(directory, {recursive: true});
	}
}

describe('Optional Fantasy learnset asset', () => {
	it('keeps all core data synchronous and restores the complete export on demand', () => {
		const split = splitFantasyData(mod, original, raw), context = load(split.core);
		assert.equal(context.exports.Gen9fantasydex.pikachu.name, 'Pikachu');
		assert.equal(context.exports.Gen9fantasySearchIndex[0][0], 'pikachu');
		assert(!Object.prototype.hasOwnProperty.call(context.exports, 'Gen9fantasyLearnsets'));
		assert.equal(context.exports.Gen9fantasyLearnsetsAsset, 'data/' + split.filename);
		vm.runInContext(split.learnsets, context);
		assert.equal(JSON.stringify(context.exports.Gen9fantasyLearnsets), JSON.stringify(data));
		delete context.exports.Gen9fantasyLearnsetsAsset;
		assert.deepEqual(JSON.parse(JSON.stringify(context.exports)), JSON.parse(JSON.stringify(load(original).exports)));
	});
	it('keeps URLs stable for core-only edits and changes the pinned table for learnset edits', () => {
		const before = splitFantasyData(mod, original, raw);
		const coreEdit = splitFantasyData(mod, original.replace("'Pikachu'", "'Changed'"), raw);
		assert.equal(before.filename, coreEdit.filename); assert.notEqual(before.core, coreEdit.core);
		const rawNext = serializeLazyValue('Gen9fantasyLearnsets', {...data, mew: {learnset: {transform: ['9L1']}}});
		const next = splitFantasyData(mod, original.replace(raw, rawNext), rawNext);
		assert.notEqual(before.filename, next.filename); assert.notEqual(before.core, next.core);
	});
	it('resolves optional data beside its core script on nested routes or a separate asset host', () => {
		const split = splitFantasyData(mod, original, raw);
		const context = vm.createContext({exports: {}, URL,
			document: {currentScript: {src: 'https://assets.example/client/data/gen9fantasy-core.js?v=stable'}}});
		vm.runInContext(split.core, context);
		assert.equal(context.exports.Gen9fantasyLearnsetsAsset, 'https://assets.example/client/data/' + split.filename);
	});
	it('preserves old content-addressed tables for already open pages', () => withDirectory(directory => {
		const before = writeFantasyDataSplit(directory, mod, original, raw);
		const rawNext = serializeLazyValue('Gen9fantasyLearnsets', {});
		const after = writeFantasyDataSplit(directory, mod, original.replace(raw, rawNext), rawNext);
		assert.equal(fs.readFileSync(path.join(directory, before.filename), 'utf8'), raw);
		assert.equal(fs.readFileSync(path.join(directory, after.filename), 'utf8'), rawNext);
		assert.equal(fs.readFileSync(path.join(directory, `${mod}.js`), 'utf8'), original.replace(raw, rawNext));
		assert.equal(Object.keys(verifyFantasyDataSplit(directory).files).length, 3);
	}));
	it('rejects missing and mixed releases before publishing new entry HTML', () => withDirectory(directory => {
		assert.throws(() => verifyFantasyDataSplit(directory), /Incomplete or stale/);
		for (const changed of ['gen9fantasy.js', 'gen9fantasy-core.js', 'optional']) {
			const split = writeFantasyDataSplit(directory, mod, original, raw);
			fs.appendFileSync(path.join(directory, changed === 'optional' ? split.filename : changed), '\nstale');
			assert.throws(() => verifyFantasyDataSplit(directory), /Incomplete or stale/);
		}
	}));
	it('fails closed on ambiguous export locations or unsafe mod names', () => {
		assert.throws(() => splitFantasyData('../other', original, raw), /Invalid/);
		for (const source of ['', original + raw]) {
			assert.throws(() => splitFantasyData(mod, source, raw), /exactly one/);
		}
	});
});

describe('Built Fantasy split data compatibility', () => {
	const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
	let complete, core;
	before(() => {
		verifyFantasyDataSplit(path.join(root, 'data'));
		[complete, core] = ['gen9fantasy.js', 'gen9fantasy-core.js'].map(name => {
			const context = vm.createContext({Pokemon: function () {}, Config: {routes: {client: 'client.example'}},
				document: {location: {protocol: 'https:'}, getElementById: () => ({}), getElementsByTagName: () => []}});
			context.window = context; context.exports = context;
			for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/items.js', 'data/moves.js',
				'data/abilities.js', 'data/aliases.js', 'data/teambuilder-tables.js', `data/${name}`, 'data/search-index.js',
				'js/battle-dex.js', 'js/battle-dex-search.js']) {
				vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
			}
			return context;
		});
	});
	const normal = value => JSON.parse(JSON.stringify(value));
	for (const format of ['gen1ou', 'gen4ou', 'gen7ou', 'gen8bdspou', 'gen9ou', 'gen9fantasy', 'gen9fcuber', 'gen9fantasyroguecoop']) {
		it(`keeps editor searches and legal moves usable before optional data in ${format}`, () => {
			for (const species of ['Pikachu', 'Charizard', 'Kyurem-Original-Fantasy']) {
				assert.deepEqual(normal(core.Dex.mod(format).getLearnsetMoves({species})),
					normal(complete.Dex.mod(format).getLearnsetMoves({species})));
				for (const kind of ['pokemon', 'move', 'item', 'ability']) {
					const searches = [complete, core].map(c => new c.DexSearch(kind, format, species));
					for (const query of ['', 'fire', 'protect', 'thunder', 'fantasy']) {
						for (const search of searches) search.find(query);
						assert.deepEqual(normal(searches[1].results), normal(searches[0].results), `${species}/${kind}/${query}`);
					}
				}
			}
			assert.equal(typeof core.Gen9fantasyLearnsets, 'undefined');
		});
	}
	it('restores every full raw learnset and retains all other Fantasy exports exactly', () => {
		vm.runInContext(fs.readFileSync(path.join(root, core.Gen9fantasyLearnsetsAsset), 'utf8'), core);
		for (const name of Object.keys(complete).filter(key => key.startsWith('Gen9fantasy'))) {
			assert.deepEqual(normal(core[name]), normal(complete[name]), name);
		}
	});
});
