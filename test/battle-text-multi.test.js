'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

function parser(perspective) {
	const context = {exports: {}, toID: value => String(value).toLowerCase().replace(/[^a-z0-9]/g, '')};
	context.global = context;
	context.require = () => {};
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/data/text.js'), 'utf8'), context);
	context.BattleText ||= context.exports.BattleText;
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/battle-text-parser.js'), 'utf8'), context);
	return {parser: new context.BattleTextParser(perspective), text: context.BattleText.default};
}

describe('Multi battle text perspectives', () => {
	for (const perspective of ['p1', 'p2', 'p3', 'p4']) {
		for (const gameType of ['multi', 'freeforall']) it(`${gameType} labels allies correctly from ${perspective}`, () => {
			const {parser: p, text} = parser(perspective);
			assert.equal(p.parseArgs(['gametype', gameType], {}), '');
			for (const side of ['p1', 'p2', 'p3', 'p4']) {
				const own = side === perspective;
				const allied = own || gameType === 'multi' && Number(side[1]) % 2 === Number(perspective[1]) % 2;
				const name = text[allied ? 'pokemon' : 'opposingPokemon'].replace('[NICKNAME]', 'Partner');
				assert.equal(p.pokemon(side + 'a: Partner'), name);
				assert.equal(p.team(side), text[allied ? 'team' : 'opposingTeam']);
				assert.equal(p.team(side, true), text[allied ? 'opposingTeam' : 'team']);
				assert.equal(p.party(side), text[allied ? 'party' : 'opposingParty']);
				assert.equal(p.own(side), own ? 'OWN' : '', 'ally remains a separately named trainer');
				assert(p.parseArgs(['move', side + 'a: Partner', 'Tackle', 'p2a: Target'], {}).toLowerCase().includes(name.toLowerCase()));
			}
		});
	}
	it('keeps singles and doubles opponent labels after replay format changes', () => {
		const {parser: p, text} = parser('p1');
		for (const gameType of ['multi', 'singles', 'doubles', 'freeforall']) {
			p.parseArgs(['gametype', gameType], {});
			assert.equal(p.pokemon('p3a: Partner'), text[gameType === 'multi' ? 'pokemon' : 'opposingPokemon'].replace('[NICKNAME]', 'Partner'));
			assert.equal(p.pokemon('p2a: Foe'), text.opposingPokemon.replace('[NICKNAME]', 'Foe'));
		}
	});
});
