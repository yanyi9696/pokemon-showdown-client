'use strict';
const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('Rogue bag revival battle protocol', () => {
	it('restores the fainted reserve HP and sidebar without changing its held item or active partner', () => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		const ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {routes: {client: 'client.example'}},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx;
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'js/battle-dex.js',
			'js/battle-scene-stub.js', 'js/battle-text-parser.js', 'js/battle.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		}
		const battle = new ctx.Battle({debug: true, log: [
			'|init|battle', '|gen|9', '|tier|[Gen 9] Fantasy Rogue', '|gametype|singles',
			'|player|p1|Player', '|player|p2|Foe', '|teamsize|p1|2', '|teamsize|p2|1',
			'|poke|p1|Mew, L50|', '|poke|p1|Blissey, L50, F|', '|poke|p2|Gengar, L50, M|',
			'|teampreview', '|start', '|switch|p1a: Mew|Mew, L50|175/175',
			'|switch|p2a: Gengar|Gengar, L50, M|140/140', '|turn|1',
			'|-item|p1a: Mew|Leftovers', '|faint|p1a: Mew',
			'|switch|p1a: Blissey|Blissey, L50, F|330/330', '|turn|2',
			'|-heal|p1: Mew|87/175|[from] roguebagrevive|[silent]', '|turn|3',
		]});
		try {
			battle.seekTurn(Infinity);
			const mon = battle.p1.pokemon.find(p => p.name === 'Mew');
			assert.equal(mon.hp, 87); assert.equal(mon.maxhp, 175); assert(!mon.fainted);
			assert.equal(mon.status, ''); assert.equal(mon.item, 'Leftovers');
			assert.equal(battle.p1.active[0].name, 'Blissey'); assert.equal(battle.p1.active[0].hp, 330);
		} finally { battle.destroy(); }
	});
});
