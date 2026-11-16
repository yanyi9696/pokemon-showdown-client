'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

describe('Rogue learning on a direct battle rejoin', () => {
	function client() {
		const calls = [], extend = value => value;
		const controller = {refresh() { calls.push('refresh'); }, revealPendingMove() { calls.push('reveal'); }};
		const context = {jQuery: {}, ConsoleRoom: {extend}, Popup: {extend}, Room: {prototype: {show() {}}},
			app: {rooms: {}, user: {get: () => 'learningqa'}, _addRoom(id) {
				calls.push(id); this.rooms[id] = controller; return controller;
			}}};
		vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-battle.js'), 'utf8'), context);
		const room = Object.create(context.BattleRoom);
		room.updateControls = () => {}; room.updateLayout = () => {};
		return {room, calls, controller, app: context.app};
	}
	it('creates the controller and fetches the saved queue when only the battle URL was reopened', () => {
		const c = client();
		c.room.add('|fantasyrogue|{"userid":"learningqa","floor":10}');
		assert.deepEqual(c.calls, ['fantasyrogue', 'refresh']);
		c.room.add('|fantasyrogue|{"userid":"learningqa","floor":10}');
		assert.deepEqual(c.calls, ['fantasyrogue', 'refresh', 'refresh'], 'reuse the controller on reconnect');
	});
	it('rechecks the dialog after the battle becomes visible without sending repeated state queries', () => {
		const c = client(); c.app.rooms.fantasyrogue = c.controller;
		c.room.fantasyRogue = {userid: 'learningqa'};
		c.room.show(); assert.deepEqual(c.calls, ['reveal']);
	});
	for (const metadata of [null, {userid: 'someoneelse'}, {userid: 'learningqa', cooperative: true},
		{userid: 'learningqa', preview: 'sada'}]) {
		it(`leaves ordinary, spectator and separate co-op/preview flows unchanged: ${JSON.stringify(metadata)}`, () => {
			const c = client();
			if (metadata) c.room.add('|fantasyrogue|' + JSON.stringify(metadata));
			c.room.show(); assert.deepEqual(c.calls, []);
		});
	}
});
