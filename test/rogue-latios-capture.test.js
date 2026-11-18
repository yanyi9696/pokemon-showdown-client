'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

describe('Latios double capture controls', () => {
	function client() {
		const context = { jQuery: {}, ConsoleRoom: { extend: value => value }, Popup: { extend: value => value },
			BattleLog: { escapeHTML: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;') },
			Dex: { getItemIcon: () => '' }, translateRogueName: value => ({ Magikarp: '鲤鱼王', Stunfisk: '泥巴鱼' }[value] || value) };
		vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-battle.js'), 'utf8'), context);
		const room = Object.create(context.BattleRoom), calls = [];
		room.choice = { choices: [] }; room.endChoice = () => calls.push('end'); room.send = value => calls.push(value);
		room.request = { rqid: 12, fantasyRogue: { catchable: true, cooperativeCapture: false,
			balls: [{ id: 'pokeball', name: '精灵球', count: 3, chance: 0.25 }],
			captureTargets: ['Magikarp', 'Stunfisk'].map((name, i) => ({ key: 'p2:' + i, name, hp: 12, maxhp: 20,
				chances: { pokeball: 0.25 }, slotChances: [{ pokeball: 0.25 }, { pokeball: 0.375 }] })) } };
		return { room, calls };
	}
	it('shows both positions, names, chances and direct capture buttons without cooperative approval', () => {
		const { room } = client(), html = room.rogueBallControls();
		assert(html.includes('鲤鱼王（位置 1）')); assert(html.includes('泥巴鱼（位置 2）'));
		assert(html.includes('value="pokeball 1"')); assert(html.includes('value="pokeball 2"'));
		assert(html.includes('25.00%')); assert(!html.includes('需要队友同意')); assert(!html.includes('申请使用'));
	});
	it('submits the selected target as the current actor action', () => {
		const { room, calls } = client(); room.chooseRogueBall('pokeball 2');
		assert.equal(room.choice.choices[0], 'rogueball pokeball 2'); assert.deepEqual(calls, ['end']);
	});
	it('updates success chances for the second actor and disables unavailable choices', () => {
		const { room } = client(); room.choice.choices.push('move 1');
		assert(room.rogueBallControls().includes('37.50%'));
		room.request.fantasyRogue.captureTargets[1].slotChances[1].pokeball = null;
		assert(room.rogueBallControls().includes('value="pokeball 2" disabled'));
	});
	it('retains the remaining target after refresh without guessing position one', () => {
		const { room } = client(); room.request.fantasyRogue.captureTargets.shift();
		const html = room.rogueBallControls();
		assert(!html.includes('value="pokeball 1"')); assert(html.includes('value="pokeball 2"'));
	});
	it('keeps old-server/singles commands and old request shape usable', () => {
		const { room } = client(); delete room.request.fantasyRogue.captureTargets;
		assert(room.rogueBallControls().includes('value="pokeball"'));
		room.chooseRogueBall('pokeball'); assert.equal(room.choice.choices[0], 'rogueball pokeball');
	});
	it('keeps cooperative approval and target ownership separate', () => {
		const { room, calls } = client(); room.request.fantasyRogue.cooperativeCapture = true;
		room.request.fantasyRogue.coopOwnerUser = 'latiosqa';
		assert(room.rogueBallControls().includes('需要队友同意'));
		room.chooseRogueBall('pokeball|p2:1');
		assert.deepEqual(JSON.parse(calls[0].slice('/fantasyrogue coop '.length)), {
			action: 'proposecapture', ball: 'pokeball', captureTarget: 'p2:1', owner: 'latiosqa',
		});
		assert.equal(room.choice.choices.length, 0);
	});
});
