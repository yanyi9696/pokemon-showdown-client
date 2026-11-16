'use strict';

const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('Rogue initial fainted sidebar icons', () => {
	let ctx, battle;
	before(() => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {routes: {client: 'client.example'}},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx; ctx.$ = {easing: {}};
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/pokedex-mini.js', 'data/pokedex-mini-bw.js',
			'js/battle-dex.js', 'js/battle-scene-stub.js', 'js/battle-text-parser.js', 'js/battle.js', 'js/battle-animations.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		}
		ctx.BattleLog = {escapeHTML: text => text};
	});
	afterEach(() => { battle?.destroy(); battle = null; });
	function start(game = 'singles', tier = '[Gen 9] Fantasy Rogue') {
		const sides = game === 'multi' ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2'];
		const log = ['|gen|9', `|gametype|${game}`, `|tier|${tier}`];
		for (const side of sides) log.push(`|player|${side}|Trainer`, `|teamsize|${side}|2`,
			`|poke|${side}|Bulbasaur, L10, M||[fainted] Bench`, `|poke|${side}|Bulbasaur, L10, M|`);
		log.push('|teampreview');
		battle = new ctx.Battle({debug: true, log});
		battle.seekTurn(Infinity);
	}
	function sidebar(side) {
		return ctx.BattleScene.prototype.getSidebarHTML.call({battle,
			getDetailsText: ctx.BattleScene.prototype.getDetailsText}, side, side.isFar ? 'far' : 'near');
	}
	for (const [game, tier] of [['singles', '[Gen 9] Fantasy Rogue'], ['doubles', '[Gen 9] Fantasy Rogue Doubles'],
		['multi', '[Gen 9] Fantasy Rogue Co-op'], ['singles', '[Gen 9] Fantasy Rogue Duel']]) {
		for (const bwgfx of [true, false]) it(`greys only the pre-fainted icon in ${game}/${tier}/${bwgfx ? '2D' : '3D'}`, () => {
			ctx.Dex.prefs = key => key === 'bwgfx' && bwgfx;
			start(game, tier);
			for (const viewer of game === 'multi' ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2']) {
				battle.setViewpoint(viewer);
				for (const side of battle.sides) {
					assert.equal(side.pokemon[0].fainted, true);
					assert.equal(side.pokemon[0].hp, 0);
					assert.equal(side.pokemon[1].fainted, false);
					const html = sidebar(side);
					assert.equal((html.match(/grayscale\(100%\)/g) || []).length, 1);
					assert(html.includes('Bench (Bulbasaur) (fainted)'));
				}
			}
		});
	}
	it('matches the healthy duplicate species on entrance and retains the fainted bench member', () => {
		start();
		battle.add('|start');
		battle.add('|switch|p1a: Lead|Bulbasaur, L10, M|30/30');
		battle.add('|switch|p2a: Lead|Bulbasaur, L10, M|30/30');
		battle.add('|turn|1');
		assert.equal(battle.p1.pokemon.length, 2);
		assert.equal(battle.p1.active[0].name, 'Lead');
		assert.equal(battle.p1.pokemon[0].fainted, true);
	});
	it('reuses the pre-fainted doubles opening slot before its forced replacement, without duplicate icons', () => {
		battle = new ctx.Battle({debug: true, log: [
			'|gen|9', '|gametype|doubles', '|tier|[Gen 9] Fantasy Rogue Doubles',
			'|player|p1|Player', '|player|p2|NPC', '|teamsize|p1|3', '|teamsize|p2|1',
			'|poke|p1|Bulbasaur, L10, M||[fainted] Bulbasaur', '|start',
			'|switch|p1a: Bulbasaur|Bulbasaur, L10, M|0 fnt',
			'|switch|p1b: Charmander|Charmander, L10, M|30/30',
			'|switch|p2a: Magikarp|Magikarp, L10, M|100/100',
		]});
		battle.seekTurn(Infinity);
		assert.equal(battle.p1.pokemon.length, 2, 'one fainted slot plus the revealed healthy lead');
		assert.equal(battle.p1.pokemon.filter(mon => mon.fainted).length, 1);
		battle.add('|switch|p1a: Squirtle|Squirtle, L10, M|30/30');
		battle.add('|turn|1');
		assert.equal(battle.p1.pokemon.length, 3);
		assert.equal(battle.p1.pokemon.filter(mon => mon.fainted).length, 1);
		assert.equal((sidebar(battle.p1).match(/grayscale\(100%\)/g) || []).length, 1);
		assert.equal(battle.p1.active[0].speciesForme, 'Squirtle');
	});
	for (const source of ['roguebagrevive', 'move: Revival Blessing']) {
		it(`restores the same icon after ${source}, including replay rewind and reconnect`, () => {
			start();
			battle.add('|start');
			battle.add('|switch|p1a: Lead|Bulbasaur, L10, M|30/30');
			battle.add('|turn|1');
			battle.add(`|-heal|p1: Bench|15/30|[from] ${source}|[silent]`);
			battle.add('|turn|2');
			assert.equal(battle.p1.pokemon[0].hp, 15);
			assert.equal(battle.p1.pokemon[0].fainted, false);
			assert(!sidebar(battle.p1).includes('grayscale(100%)'));
			battle.pause(); battle.seekTurn(0);
			assert.equal(battle.p1.pokemon[0].fainted, true);
			battle.seekTurn(Infinity);
			assert.equal(battle.p1.pokemon[0].fainted, false);
			const reconnected = new ctx.Battle({debug: true, log: [...battle.stepQueue]});
			try {
				reconnected.seekTurn(Infinity);
				assert.equal(reconnected.p1.pokemon.length, 2);
				assert.equal(reconnected.p1.pokemon[0].hp, 15);
				assert.equal(reconnected.p1.pokemon[0].fainted, false);
			} finally { reconnected.destroy(); }
		});
	}
	it('keeps standard battles and old previews without the optional marker unchanged', () => {
		start('singles', '[Gen 9] OU');
		assert.equal(battle.p1.pokemon[0].fainted, false);
		assert(!sidebar(battle.p1).includes('grayscale(100%)'));
		battle.destroy();
		start();
		battle.stepQueue = battle.stepQueue.map(line => line.replace('|[fainted] Bench', ''));
		battle.seekTurn(0); battle.seekTurn(Infinity);
		assert.equal(battle.p1.pokemon[0].fainted, false);
	});
});
