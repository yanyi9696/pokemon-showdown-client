const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

function client(role = 'host', localized = false) {
	const sent = [], drafts = [], extend = value => value;
	const context = {jQuery: {}, ConsoleRoom: {extend}, Popup: {extend},
		Dex: {getPokemonIcon: () => '', prefs: () => false}, Storage: {prefs: () => false}, BattleLog: {escapeHTML: value => String(value || '')},
		app: {rooms: {}, user: {get: () => role}, topbar: {updateTabbar() {}}}};
	if (localized) {
		const translator = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/ps-china-translator.js'), 'utf8');
		vm.runInNewContext(translator.slice(0, translator.indexOf('(function() {')), context);
	}
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-battle.js'), 'utf8'), context);
	const room = Object.create(context.BattleRoom);
	const party = prefix => Array.from({length: 6}, (_, i) => ({id: prefix + i, species: 'Mon' + i, hp: 20}));
	const controller = context.app.rooms.fantasyrogue = {
		coopState: {userid: role, session: {roomid: 'battle-test', role, partnerUserId: role === 'host' ? 'guest' : 'host',
			hostName: '甲', guestName: '乙', canControl: true, adventure: {team: party('own'), partnerTeam: party('ally'),
				battlePreview: [], partnerBattlePreview: [], battleSelectionKey: 'visit'}}},
		sendCoop: (action, data) => drafts.push({action, ...JSON.parse(JSON.stringify(data || {}))}),
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
	for (const delegated of [false, true]) it(`shows the temporary battle party in the partner row (delegated: ${delegated})`, () => {
		const c = client(), npc = [{id: 'escort', species: 'Ralts', hp: 30}];
		if (delegated) {
			c.room.request.side.id = 'p3'; c.adventure.battleTeam = npc; c.adventure.battlePreview = ['escort'];
		} else {
			c.adventure.partnerBattleTeam = npc; c.adventure.partnerBattlePreview = ['escort'];
		}
		c.room.updateRogueCoopTeamControls();
		const partner = c.room.html.split('rogue-coop-team-partner')[1].split('<div class="whatdo">')[0];
		assert(partner.includes('1 / 1 · 选择中'));
		assert(partner.includes('1 · Ralts')); assert(!partner.includes('Mon'));
		assert.equal(c.adventure.team.length, 6); assert.equal(c.adventure.partnerTeam.length, 6);
	});
	for (const role of ['host', 'guest']) it(`reloads co-op state when opening a live capture battle directly as ${role}`, () => {
		const c = client(role); let refreshed = 0;
		delete c.controller.coopState;
		c.room.refreshRogueCoopPreview = () => refreshed++;
		c.room.updateControls = () => {};
		c.room.receiveRequest({fantasyRogue:{cooperativeCapture:true},wait:true});
		assert.equal(refreshed, 1);
		c.controller.coopState = {session:{}};
		c.room.receiveRequest({fantasyRogue:{cooperativeCapture:true},wait:true});
		c.room.receiveRequest({wait:true});
		assert.equal(refreshed, 1);
	});
	for (const role of ['host', 'guest']) it(`handles capture negotiation in the current battle for ${role}`, () => {
		const c = client(role), {room, controller, adventure} = c;
		controller.coopState.session.status = 'active'; adventure.phase = 'battle';
		adventure.captureProposal = {id: 'capture', state: 'requested'};
		room.request = {wait: true, requestType: 'wait'}; room.updateSide = () => {};
		controller.renderCoopCapture = (proposal, canControl) => `<p>${proposal.id}:${canControl}</p>`;
		controller.respondCoopCapture = (value, ball) => c.drafts.push({value, ball});
		controller.cancelCoopCapture = () => c.drafts.push('cancel');
		room.$ = () => ({val: () => 'greatball'});
		Object.getPrototypeOf(room).updateControlsForPlayer.call(room);
		assert(room.html.includes('capture:true'));
		for (const value of ['contest', 'keep', 'accept']) room.respondCoopCapture(value);
		room.respondCoopCapture('give'); room.cancelCoopCapture();
		assert.deepEqual(c.drafts, [{value:'contest',ball:undefined}, {value:'keep',ball:undefined},
			{value:'accept',ball:undefined}, {value:'give',ball:'greatball'}, 'cancel']);
		controller.coopState.session.canControl = false; room.respondCoopCapture('accept'); room.cancelCoopCapture();
		controller.coopState.session.canControl = true; controller.coopBusy = true; room.respondCoopCapture('give');
		assert.equal(c.drafts.length, 5);
		controller.coopBusy = false; room.side = ''; assert.equal(room.getRogueCoopCapture(), null);
		room.side = role === 'host' ? 'p1' : 'p3'; room.id = 'other'; assert.equal(room.getRogueCoopCapture(), null);
		room.id = 'battle-test'; delete adventure.captureProposal; assert.equal(room.getRogueCoopCapture(), null);
	});
	it('loads the base account capability before refreshing a directly reloaded battle preview', () => {
		const c = client(); let refreshed = 0;
		c.controller.refresh = () => refreshed++;
		c.room.refreshRogueCoopPreview();
		assert.equal(refreshed, 1); assert(c.controller.coopRefreshPending); assert.equal(c.drafts.length, 0);
		c.controller.state = {coopEnabled: true}; c.controller.coopRefreshPending = false;
		c.room.refreshRogueCoopPreview(); assert.equal(c.drafts.at(-1).action, 'refresh');
		c.controller.coopBusy = true; c.room.refreshRogueCoopPreview(); assert.equal(c.drafts.length, 1);
	});
	it('localizes numbered picks without replacing player nicknames', () => {
		const {room} = client('host', true);
		room.battle.myPokemon[0] = {name: 'Bulbasaur', speciesForme: 'Bulbasaur'};
		room.battle.myPokemon[1] = {name: '小火伴', speciesForme: 'Charmander'};
		room.chooseTeamPreview(0); room.chooseTeamPreview(1);
		assert(room.html.includes('1 · 妙蛙种子 ×'));
		assert(room.html.includes('2 · 小火伴 ×'));
		assert(!room.html.includes('1 · Bulbasaur'));
		room.removeRogueCoopTeamPick(0);
		assert(room.html.includes('1 · 小火伴 ×'));
		assert(room.html.includes('妙蛙种子</button>'));
	});
	for (const role of ['host', 'guest']) it(`shows live growth in the native battle controls for ${role} only`, () => {
		const c = client(role), {room, controller, adventure} = c;
		controller.coopState.session.status = 'active'; adventure.phase = 'battle'; adventure.liveGrowth = {key: 'pause:1'};
		room.request = {wait: true, requestType: 'wait'}; room.updateSide = () => {};
		controller.renderCoopGrowth = () => '<h4>成长暂停</h4>';
		controller.coopLearnMove = value => c.drafts.push(value);
		controller.evolveCoopMember = value => c.drafts.push(value);
		controller.skipCoopEvolution = value => c.drafts.push(value);
		Object.getPrototypeOf(room).updateControlsForPlayer.call(room);
		assert(room.html.includes('成长暂停'));
		room.coopLearnMove('learn'); room.evolveCoopMember('evolve'); room.skipCoopEvolution('skip');
		assert.deepEqual(c.drafts, ['learn', 'evolve', 'skip']);
		room.side = ''; room.coopLearnMove('spectator'); assert.equal(c.drafts.length, 3);
		room.side = role === 'host' ? 'p1' : 'p3'; room.id = 'other-battle';
		room.coopLearnMove('other'); assert.equal(c.drafts.length, 3);
		room.id = 'battle-test'; adventure.liveGrowth = null;
		assert.equal(room.getRogueCoopGrowth(), null);
	});
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
	it('keeps police and rival dialogue readable in the existing native preview without an extra stage', () => {
		for (const id of ['policeassist', 'policerevenge', 'rivalstory']) {
			const c = client(); c.adventure.coopEvent = {id, title: '道路上的重逢', paragraphs: ['君莎：谢谢你们。', '队员：下一场，请指教！']};
			c.room.updateRogueCoopPreview(); assert(c.room.html.includes('本场事件对话'));
			assert(c.room.html.includes('下一场，请指教！')); assert(c.room.html.includes('我的出战顺序'));
			c.room.chooseTeamPreview(0); c.room.confirmRogueCoopTeam(); assert.deepEqual(c.sent, ['team 1']);
		}
	});

});
