const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadClient() {
	const context = vm.createContext({
		ConsoleRoom: { extend: value => value }, Popup: { extend: value => value }, jQuery: () => {},
		BattleLog: { escapeHTML: String }, Dex: { types: { get: name => ({ name }) } },
		ModifiableValue: function () {},
		toID: text => String(text).toLowerCase().replace(/[^a-z0-9]/g, ''),
	});
	context.exports = context;
	for (const file of ['client-battle.js', 'battle-choices.js']) {
		vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../play.pokemonshowdown.com/js', file), 'utf8'), context);
	}
	return context;
}

function moveRequest(gmega) {
	return {
		canMegaEvo: true, canGMegaEvo: gmega,
		moves: [{ name: 'Splash', move: 'Splash', id: 'splash', target: 'self', pp: 40, maxpp: 40 }],
	};
}

describe('Independent G-Mega controls', () => {
	let client;
	before(() => { client = loadClient(); });
	for (const [firstG, secondG] of [[true, false], [false, true], [true, true], [false, false]]) {
		it(`shows the correct remaining checkbox after ${firstG ? 'G-Mega' : 'Mega'} for ${secondG ? 'G-Mega' : 'Mega'}`, () => {
			const room = Object.create(client.BattleRoom);
			const active = [moveRequest(firstG), moveRequest(secondG)];
			room.request = { active, side: {} };
			room.choice = { choices: ['move 1 mega'], switchFlags: {} };
			room.battle = {
				myPokemon: [{ hp: 100, maxhp: 100 }, { hp: 100, maxhp: 100 }],
				nearSide: { active: [{}, {}] }, mySide: { n: 0 }, pokemonControlled: 2, gameType: 'doubles',
				dex: { moves: { get: name => ({ name, id: name.toLowerCase(), type: 'Normal' }) } },
			};
			room.tooltips = { getMoveType: () => ['Normal'] };
			room.getTimerHTML = () => '';
			room.displayParty = () => '';
			let html;
			room.$controls = { html: value => { html = value; } };
			room.updateMoveControls('move2');
			assert.equal(html.includes('name="megaevo"'), firstG !== secondG);
			if (firstG !== secondG) {
				assert(html.includes(`${secondG ? 'G-Mega' : 'Mega'}&nbsp;Evolution`));
			}
		});
	}
	for (const firstG of [true, false]) {
		it(`tracks both opportunities independently with ${firstG ? 'G-Mega' : 'Mega'} selected first`, () => {
			const request = { requestType: 'move', active: [moveRequest(firstG), moveRequest(!firstG)], side: { pokemon: [] } };
			const choices = new client.BattleChoiceBuilder(request);
			assert.equal(choices.addChoice('move 1 mega'), null);
			assert.equal(choices.alreadyGMega, firstG);
			assert.equal(choices.alreadyMega, !firstG);
			assert.equal(choices.addChoice('move 1 mega'), null);
			assert.equal(choices.alreadyGMega, true);
			assert.equal(choices.alreadyMega, true);
			assert.equal(choices.toString(), 'move 1 mega, move 1 mega');
			const cancelled = new client.BattleChoiceBuilder(request);
			assert.equal(cancelled.alreadyGMega, false);
			assert.equal(cancelled.alreadyMega, false);
		});
	}
});
