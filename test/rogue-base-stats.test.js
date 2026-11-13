'use strict';
const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('Rogue public effective base stats', () => {
	let ctx, battle;
	before(() => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {routes: {client: 'client.example'}},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx; ctx.$ = {easing: {}};
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
			'data/pokedex-mini.js', 'data/pokedex-mini-bw.js', 'js/battle-dex.js', 'js/battle-scene-stub.js',
			'js/battle-text-parser.js', 'js/battle.js', 'js/battle-animations.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		}
		ctx.BattleLog = {escapeHTML: text => String(text)};
	});
	beforeEach(() => {
		battle = new ctx.Battle({debug: true, log: ['|init|battle', '|gen|9', '|gametype|singles', '|tier|[Gen 9] Fantasy Rogue',
			'|player|p1|Player', '|player|p2|Enemy', '|start',
			'|switch|p1a: Mew|Mew, L50|175/175', '|switch|p2a: Primarina|Primarina-Fantasy, L50|175/175',
			'|-start|p2a: Primarina|fantasystats|80/74/74/126/116/60|[silent]', '|turn|1']});
		battle.seekTurn(Infinity);
	});
	afterEach(() => { battle.destroy(); });
	function status(mon) {
		let result = '';
		const bar = {toggleClass() {}, append() {}, find(selector) { return {remove() {}, append() {},
			html(text) { if (selector === '.status') result = text; }}; }};
		ctx.PokemonSprite.prototype.updateStatbar.call({scene: {animating: true}, $statbar: bar}, mon, false, false);
		return result;
	}
	it('uses the existing six-stat strip for both sides, overrides raw Fantasy data and keeps species badges separate', () => {
		battle.add('|-start|p1a: Mew|roguebasestats|100/130/100/100/100/100|[silent]');
		battle.add('|-start|p2a: Primarina|roguebasestats|80/104/74/126/116/60|[silent]');
		const own = status(battle.p1.active[0]), foe = status(battle.p2.active[0]);
		assert(own.includes('100/130/100/100/100/100')); assert(!own.includes('status-fantasy'));
		assert(foe.includes('80/104/74/126/116/60')); assert(foe.includes('status-fantasy'));
		assert(!foe.includes('80/74/74/126/116/60')); assert(!own.includes('[[roguebasestats]]'));
	});
	it('retains the public override across model changes and reconstructs it after a replay seek', () => {
		battle.add('|-start|p1a: Mew|roguebasestats|100/130/100/100/100/100|[silent]');
		battle.add('|detailschange|p1a: Mew|Mew, L50');
		assert(status(battle.p1.active[0]).includes('100/130/100/100/100/100'));
		battle.seekTurn(0); battle.seekTurn(Infinity);
		assert(status(battle.p1.active[0]).includes('100/130/100/100/100/100'));
	});
	it('clears a reverted effect and ignores malformed values without rendering markup', () => {
		battle.add('|-start|p1a: Mew|roguebasestats|100/130/100/100/100/100|[silent]');
		battle.add('|-end|p1a: Mew|roguebasestats|[silent]');
		assert(!status(battle.p1.active[0]).includes('100/130'));
		battle.add('|-start|p1a: Mew|roguebasestats|<img src=x onerror=alert(1)>|[silent]');
		assert(!status(battle.p1.active[0]).includes('onerror'));
	});
});
