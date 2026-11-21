'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../play.pokemonshowdown.com/js/client-teambuilder-loader.js'), 'utf8');
const {splitTeambuilderData} = require('../build-tools/teambuilder-data-split');
function loader() {
	const scripts = [], timers = new Map(); let timer = 0;
	const window = {BattleTeambuilderTableAsset: '/data/teambuilder-tables.hash.js', BattleTeambuilderTableLoaded: false};
	vm.runInNewContext(source, {window, Promise,
		setTimeout(fn) {timers.set(++timer, fn); return timer;}, clearTimeout(id) {timers.delete(id);},
		document: {currentScript: {getAttribute: () => '/data/search-index.hash.js'},
			createElement() {return {remove() {this.removed = true;}};}, head: {appendChild(s) {scripts.push(s);}}},
	});
	return {window, scripts, timers, loader: window.FantasyTeambuilder};
}
describe('Teambuilder on-demand data', () => {
	it('keeps synchronous battle dex behavior equivalent before loading the editor', () => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		const make = table => {
			const c = vm.createContext({Pokemon: function () {}, URL, Config: {routes: {client: 'client.example'}},
				document: {location: {protocol: 'https:'}, getElementById: () => ({}), getElementsByTagName: () => []}});
			c.window = c; c.exports = c;
			for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/items.js', 'data/moves.js',
				'data/abilities.js', 'data/aliases.js', 'data/' + table, 'data/gen9fantasy-core.js', 'js/battle-dex.js']) {
				vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
			}
			return c;
		};
		const old = make('teambuilder-tables.js'), lazy = make('teambuilder-core.js');
		for (const format of ['gen1ou', 'gen4ou', 'gen7ou', 'gen8bdspou', 'gen9ou', 'gen9fantasy', 'gen9fcuber', 'gen9fantasyroguecoop']) {
			for (const [kind, names] of Object.entries({species: ['Pikachu', 'Charizard', 'Kyurem-Original-Fantasy'],
				moves: ['Thunderbolt', 'Tackle', 'Weather Ball'], items: ['Leftovers', 'Choice Band'], abilities: ['Levitate', 'Intimidate']})) {
				for (const name of names) assert.equal(JSON.stringify(lazy.Dex.mod(format)[kind].get(name)),
					JSON.stringify(old.Dex.mod(format)[kind].get(name)), format + '/' + kind + '/' + name);
			}
		}
		assert.equal(lazy.BattleSearchIndex, undefined);
	});
	it('does not fetch for the homepage and shares one promise for concurrent consumers', async () => {
		const c = loader(); assert.equal(c.scripts.length, 0);
		const a = c.loader.load(), b = c.loader.load(); assert.equal(a, b); assert.equal(c.scripts.length, 2);
		c.window.BattleSearchIndex = []; c.scripts[1].onload();
		assert.equal(c.loader.ready(), false);
		c.window.BattleTeambuilderTableLoaded = true; c.scripts[0].onload();
		assert.equal(await a, true); assert.equal(c.loader.ready(), true); assert.equal(c.timers.size, 0);
		await c.loader.load(); assert.equal(c.scripts.length, 2);
	});
	it('retries only the failed dependency and detects a script without its expected export', async () => {
		const c = loader(), a = c.loader.load();
		c.scripts[0].onload(); c.window.BattleSearchIndex = []; c.scripts[1].onload();
		assert.equal(await a, false);
		const b = c.loader.load(); assert.equal(c.scripts.length, 3);
		c.window.BattleTeambuilderTableLoaded = true; c.scripts[2].onload(); assert.equal(await b, true);
	});
	it('expires stalled downloads, ignores late completion handlers, and can retry', async () => {
		const c = loader(), a = c.loader.load(), late = c.scripts[0].onload;
		for (const fn of [...c.timers.values()]) fn(); assert.equal(await a, false);
		late(); assert.equal(c.loader.ready(), false);
		const b = c.loader.load(); c.window.BattleSearchIndex = []; c.window.BattleTeambuilderTableLoaded = true;
		c.scripts[2].onload(); c.scripts[3].onload(); assert.equal(await b, true);
	});
	it('keeps every battle override before lazy load and restores the complete table exactly', () => {
		const table = require('../play.pokemonshowdown.com/data/teambuilder-tables.js').BattleTeambuilderTable;
		const split = splitTeambuilderData(table), context = {exports: {}, URL};
		vm.runInNewContext(split.core, context);
		assert.equal(context.exports.BattleTeambuilderTableLoaded, false);
		assert.equal(JSON.stringify(context.exports.BattleTeambuilderTable.overrideTier), JSON.stringify(table.overrideTier));
		for (const [key, value] of Object.entries(table)) {
			if (!value || typeof value !== 'object' || Array.isArray(value) || key === 'learnsets') continue;
			for (const [field, data] of Object.entries(value)) {
				if (field.startsWith('override') || field === 'removeType') {
					assert.equal(JSON.stringify(context.exports.BattleTeambuilderTable[key][field]), JSON.stringify(data), key + '.' + field);
				}
			}
		}
		vm.runInNewContext(split.full, context);
		assert.equal(context.exports.BattleTeambuilderTableLoaded, true);
		assert.deepEqual(JSON.parse(JSON.stringify(context.exports.BattleTeambuilderTable)), JSON.parse(JSON.stringify(table)));
		assert.equal(context.exports.BattleTeambuilderTableEditor, undefined);
		// An already open battle retains its synchronous override objects across hydration.
		const gen1 = context.exports.BattleTeambuilderTable.gen1;
		vm.runInNewContext(split.full, context);
		assert.equal(context.exports.BattleTeambuilderTable.gen1, gen1);
		assert.deepEqual(JSON.parse(JSON.stringify(context.exports.BattleTeambuilderTable)), JSON.parse(JSON.stringify(table)));
	});
});
