const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

function client(role = 'host') {
	const sent = [], drafts = [], extend = value => value;
	const context = {jQuery: {}, ConsoleRoom: {extend}, Popup: {extend},
		Dex: {getPokemonIcon: () => '', prefs: () => false}, BattleLog: {escapeHTML: value => String(value || '')},
		app: {rooms: {}, user: {get: () => role}, topbar: {updateTabbar() {}}}};
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-battle.js'), 'utf8'), context);
	const room = Object.create(context.BattleRoom);
	const party = prefix => Array.from({length: 6}, (_, i) => ({id: prefix + i, species: 'Mon' + i, hp: 20}));
	const controller = context.app.rooms.fantasyrogue = {
		coopState: {userid: role, session: {roomid: 'battle-test', role, partnerUserId: role === 'host' ? 'guest' : 'host',
			hostName: '甲', guestName: '乙', canControl: true, adventure: {team: party('own'), partnerTeam: party('ally'),
				battlePreview: [], partnerBattlePreview: [], battleSelectionKey: 'visit'}}},
		sendCoop: (action, data) => drafts.push({action, ...JSON.parse(JSON.stringify(data))}),
	};
	Object.assign(room, {id: 'battle-test', side: role === 'host' ? 'p1' : 'p3',
		request: {teamPreview: true, maxChosenTeamSize: 3, side: {id: role === 'host' ? 'p1' : 'p3'},
			rogueCoopTeamPreview: {members: party('own').map(mon => mon.id)}},
		battle: {myPokemon: party('own').map(mon => ({...mon, name: mon.species})), scene: {updateRogueCoopPreview() {}}},
		$controls: {html: value => { room.html = value; }}, getTimerHTML: () => '',
		sendDecision: value => sent.push(value), send: value => sent.push(value), notifyRequest() {},
		updateControls: () => room.updateRogueCoopTeamControls(), updateControlsForPlayer: () => room.updateRogueCoopTeamControls(),
		tooltips: {hideTooltip() {}},
	});
	room.updateRogueCoopPreview();
	return {room, controller, adventure: controller.coopState.session.adventure, sent, drafts};
}
describe('Native co-op Team Preview controls', () => {
	it('picks and cancels in native order, showing the partner row above own choices without early confirmation', () => {
		const c = client(), room = c.room;
		assert(room.html.indexOf('队友的队伍') < room.html.indexOf('我的出战顺序'));
		room.chooseTeamPreview('4'); room.chooseTeamPreview('2');
		assert.deepEqual(c.drafts.at(-1).members, ['own4', 'own1']);
		assert.equal(c.sent.length, 0); assert(room.html.includes('1 · Mon4 ×'));
		room.removeRogueCoopTeamPick('0');
		assert.deepEqual(c.drafts.at(-1).members, ['own1']);
		room.confirmRogueCoopTeam(); assert.deepEqual(c.sent, ['team 2']);
		assert(room.html.includes('撤销确认')); assert(room.choice.waiting);
	});
	it('caps the draft at three and keeps double clicks and saving state from changing the order', () => {
		const c = client(), room = c.room;
		for (const index of ['0', '1', '2', '3']) room.chooseTeamPreview(index);
		assert.equal(room.choice.done, 3); assert.equal(c.drafts.length, 3);
		c.controller.coopBusy = true; room.removeRogueCoopTeamPick(1); room.confirmRogueCoopTeam();
		assert.equal(room.choice.done, 3); assert.equal(c.sent.length, 0);
		c.controller.coopBusy = false; room.confirmRogueCoopTeam(); room.confirmRogueCoopTeam();
		assert.deepEqual(c.sent, ['team 1,2,3']);
	});
	for (const role of ['host', 'guest']) {
		it(`maps both ordered parties to the correct native sides for ${role}`, () => {
			const c = client(role); c.adventure.battlePreview = ['own2']; c.adventure.partnerBattlePreview = ['ally4', 'ally1'];
			c.room.updateRogueCoopPreview(); const state = c.room.battle.rogueCoopPreview;
			assert.equal(state.ownSide, role === 'host' ? 'p1' : 'p3');
			assert.equal(state.partnerSide, role === 'host' ? 'p3' : 'p1');
			assert.deepEqual(Array.from(state.selections[state.ownSide]), [2]);
			assert.deepEqual(Array.from(state.selections[state.partnerSide]), [4, 1]);
			assert(c.room.html.includes('1 · Mon4')); assert(c.room.html.includes('2 · Mon1'));
			c.adventure.partnerBattlePreview = []; c.room.updateRogueCoopPreview();
			assert.equal(c.room.battle.rogueCoopPreview.selections[state.partnerSide].length, 0);
		});
	}
	it('keeps a sent confirmation across partner refresh and allows native undo once waiting', () => {
		const c = client(); c.room.chooseTeamPreview(2); c.room.confirmRogueCoopTeam();
		c.adventure.battlePreview = ['own2']; c.adventure.previewConfirmed = true;
		c.room.updateRogueCoopPreview(); assert(c.room.choice.waiting);
		c.room.undoChoice(); assert.equal(c.sent.at(-1), '/undo');
		c.adventure.previewConfirmed = false; c.room.updateRogueCoopPreview();
		assert(!c.room.choice.waiting); assert.equal(c.room.choice.done, 1);
		c.room.removeRogueCoopTeamPick(0); assert.deepEqual(c.drafts.at(-1).members, []);
	});
	it('uses the delegated owner and the visible native seat when choosing for the partner', () => {
		const c = client(); c.room.request.side.id = 'p3';
		c.room.request.rogueCoopTeamPreview.members = c.adventure.partnerTeam.map(mon => mon.id);
		c.room.choice = null; c.room.updateRogueCoopPreview(); c.room.chooseTeamPreview(1);
		assert.equal(c.drafts.at(-1).owner, 'guest'); assert.deepEqual(c.drafts.at(-1).members, ['ally1']);
		assert.equal(c.room.battle.rogueCoopPreview.ownSide, 'p3');
	});
});
