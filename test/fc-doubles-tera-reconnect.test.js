'use strict';

const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('FC Doubles Tera data in the classic client', () => {
	let ctx;
	const sets = [
		['Mewtwo', 'Fairy'], ['Groudon', 'Water'], ['Charizard', 'Normal'],
		['Amoonguss', 'Dark'], ['Pelipper', 'Electric'], ['Rillaboom', 'Stellar'],
	].map(([species, teraType]) => ({species, teraType, moves: ['Protect']}));
	before(() => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		ctx = vm.createContext({console, setTimeout, clearTimeout,
			Config: {whitelist: [], routes: {client: 'client.example'}},
			ConsoleRoom: {extend: value => value}, Popup: {extend: value => value},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx; ctx.jQuery = ctx.$ = {easing: {}};
		ctx.Storage = {prefs: () => false};
		for (const file of ['data/pokedex.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
			'js/battle-dex-data.js', 'js/battle-dex.js', 'js/battle-scene-stub.js',
			'js/battle-text-parser.js', 'js/battle.js', 'js/battle-log.js', 'js/client-battle.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, {filename: file});
		}
	});
	function preview() {
		return new ctx.Battle({debug: true, log: ['|gen|9', '|gametype|doubles',
			'|tier|[Gen 9] FC Champions Doubles G-I', '|player|p1|FCTestA', '|player|p2|FCTestB',
			...['p1', 'p2'].flatMap(side => sets.map(set => `|poke|${side}|${set.species}, L50|`)),
			'|teampreview|4']});
	}
	for (const side of ['p1', 'p2']) {
		it(`preserves ${side} private Tera data through three games and repeated restored requests`, () => {
			for (let game = 0; game < 3; game++) {
				const battle = preview();
				try {
					battle.seekTurn(Infinity);
					const room = Object.create(ctx.BattleRoom);
					room.battle = battle;
					room.$chatFrame = {find: () => ({})};
					room.notifyRequest = () => {};
					room.updateControls = function () { this.updateSide(); };
					for (let reconnect = 0; reconnect < 3; reconnect++) {
						const request = {side: {id: side, pokemon: sets.map(set => ({
							ident: `${side}: ${set.species}`, details: `${set.species}, L50`,
							condition: '100/100', teraType: set.teraType, moves: ['protect'],
						}))}};
						room.receiveRequest(request);
						assert.equal(battle.mySide.sideid, side);
						assert.deepEqual(Array.from(battle.myPokemon, mon => mon.teraType), sets.map(set => set.teraType));
					}
				} finally { battle.destroy(); }
			}
		});
	}
	it('publishes late team-sheet Tera types to the client model without activating Tera', () => {
		const battle = preview();
		try {
			battle.seekTurn(Infinity);
			assert(Array.from(battle.p2.pokemon).every(mon => !mon.teraType));
			const packed = sets.map(set => [set.species, '', '', '', 'protect', '', '', '', '', '', '50',
				`,,,,,${set.teraType}`].join('|')).join(']');
			battle.add(`|showteam|p2|${packed}`);
			battle.seekTurn(Infinity);
			assert.deepEqual(Array.from(battle.p2.pokemon, mon => mon.teraType), sets.map(set => set.teraType));
			assert(Array.from(battle.p2.pokemon).every(mon => !mon.terastallized));
		} finally { battle.destroy(); }
	});
});
