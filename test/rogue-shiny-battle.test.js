'use strict';
const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('Rogue shiny battle presentation', () => {
	it('replaces a normal team-preview placeholder with the actual shiny sprite and retains it after switching', () => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		const ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {routes: {client: 'client.example'}},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx;
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/pokedex-mini.js', 'data/pokedex-mini-bw.js',
			'js/battle-dex.js', 'js/battle-scene-stub.js', 'js/battle-text-parser.js', 'js/battle.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		}
		for (const bwgfx of [false, true]) {
			ctx.Dex.prefs = key => key === 'bwgfx' && bwgfx;
			const battle = new ctx.Battle({debug: true, log: [
				'|init|battle', '|gen|9', '|tier|[Gen 9] Fantasy Rogue', '|gametype|singles',
				'|player|p1|Player', '|player|p2|Wild', '|teamsize|p1|2', '|teamsize|p2|1',
				'|poke|p1|Slugma, L8, M|', '|poke|p1|Bulbasaur, L5, M|', '|poke|p2|Magikarp, L5, M|',
				'|teampreview', '|start', '|switch|p1a: Slugma|Slugma, L8, M, shiny|27/27',
				'|switch|p2a: Magikarp|Magikarp, L5, M|100/100', '|turn|1',
				'|switch|p1a: Bulbasaur|Bulbasaur, L5, M|22/22', '|turn|2',
				'|switch|p1a: Slugma|Slugma, L8, M, shiny|27/27', '|turn|3',
			]});
			battle.seekTurn(Infinity);
			const mon = battle.p1.active[0];
			assert.equal(mon.speciesForme, 'Slugma'); assert.equal(mon.level, 8); assert.equal(mon.shiny, true);
			for (const front of [false, true]) {
				const sprite = ctx.Dex.getSpriteData(mon, front, {gen: 9, mod: 'gen9fantasy'});
				assert.equal(sprite.shiny, true); assert.match(sprite.url, /-shiny\/slugma\.(png|gif)$/);
			}
			battle.destroy();
		}
	});
});
