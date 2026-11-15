'use strict';
const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('Draining ability animation attribution', () => {
	let ctx;
	before(() => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {routes: {client: 'client.example'}},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx;
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
			'data/pokedex-mini.js', 'data/pokedex-mini-bw.js', 'js/battle-dex.js', 'js/battle-scene-stub.js',
			'data/text.js', 'js/battle-text-parser.js', 'js/battle.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		}
	});
	for (const side of ['p1', 'p2', 'p3']) {
		it(`puts the healing ability badge on ${side}, never on the attacked opponent, including replay reconstruction`, () => {
			const battle = new ctx.Battle({debug: true, log: ['|init|battle', '|gen|9', '|gametype|multi',
				'|tier|[Gen 9] Fantasy Rogue Co-op', '|player|p1|Player', '|player|p2|Enemy',
				'|player|p3|Partner', '|player|p4|Enemy2', '|start',
				'|switch|p1a: Zangoose|Zangoose, L10|20/40', '|switch|p2a: Audino|Audino, L10|1/40',
				'|switch|p3b: Zangoose|Zangoose, L10|20/40', '|turn|1']});
			try {
				battle.seekTurn(Infinity);
				const owner = battle[side].pokemon[0], ident = `${side}${side === 'p3' ? 'b' : 'a'}: ${owner.name}`, badges = [];
				if (side !== 'p2') {
					owner.ability = owner.baseAbility = 'Immunity';
					battle.add(`|-rogueinfo|${ident}|` + JSON.stringify({abilities: ['sharpness', 'jiqususheng'], active: true}));
				} else {
					battle.add(`|-rogueinfo|${ident}|{}`);
				}
				battle.scene.abilityActivateAnim = (mon, ability) => badges.push({mon, ability});
				battle.add(`|-heal|${ident}|30/40|[from] ability: Ji Qu Su Sheng`);
				assert.equal(badges.length, 1); assert.equal(badges[0].mon, owner);
				assert.equal(badges[0].ability, 'Ji Qu Su Sheng'); assert.equal(owner.hp, 30);
				if (side !== 'p2') {
					assert.equal(owner.ability, 'Immunity'); assert.equal(owner.baseAbility, 'Immunity');
				} else {
					assert.equal(owner.ability, 'Ji Qu Su Sheng');
				}
				const parser = new ctx.BattleTextParser('p1');
				const text = parser.parseArgs(['-heal', ident, '30/40'], {from: 'ability: Ji Qu Su Sheng'});
				assert(text.includes('Ji Qu Su Sheng')); assert(!text.includes('acquired'));
				badges.length = 0; battle.seekTurn(0); battle.seekTurn(Infinity);
				assert(badges.every(badge => badge.mon.ident.startsWith(side)), JSON.stringify(badges.map(b => ({ident: b.mon.ident, side: b.mon.side.sideid}))));
			} finally { battle.destroy(); }
		});
	}
});
