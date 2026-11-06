const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const {EventEmitter} = require('events');

function client(startScreen = false, localized = false, runtime = {}) {
	const sent = [], joined = [];
	let userid = 'rogueplayer';
	const context = {
		Room: {extend: room => room, prototype: {dispatchClickButton(e) {
			this[e.currentTarget.name](e.currentTarget.value, e.currentTarget);
		}}}, Popup: {extend: popup => popup, prototype: {remove() { this.removed = true; }}},
		BattleLog: {escapeHTML: text => String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')},
		Dex: {
			resolveAvatar: id => 'sprites/trainers/' + id + '.png',
			getPokemonIcon: () => '', getItemIcon: () => '', getTeambuilderSprite: () => '',
			getShinyStar: () => '<svg viewBox="0 0 18 18"></svg>',
			getShinySparkles: () => '<img src="fx/shine.png" alt="" />'.repeat(8),
			getSpriteData: (species, front, options) => ({url: 'sprites/gen5' + (options.shiny ? '-shiny' : '') + '/' + species + '.png'}),
			getTypeIcon: type => '<img alt="' + type + '" />',
			getCategoryIcon: category => '<img alt="' + category + '" />',
			mod: () => context.Dex,
			moves: {get: id => ({name: id, type: 'Grass', category: 'Physical', basePower: 45, accuracy: 100, pp: 25,
				shortDesc: 'Deals damage.'})},
			abilities: {get: id => ({name: id, shortDesc: 'Ability effect.'})},
			items: {get: id => ({name: id, shortDesc: 'Held item effect.'})},
			species: {get: () => ({types: ['Grass'], abilities: {0: 'Overgrow', H: 'Chlorophyll'}})},
		},
		translations: {'Deals damage.': '攻击目标造成伤害', 'Ability effect.': '特性效果', 'Held item effect.': '携带道具效果'},
		app: Object.assign(new EventEmitter(), {
			rooms: {}, popups: [],
			user: Object.assign(new EventEmitter(), {loaded: true, get: () => userid}),
			socket: {readyState: 1}, send: message => sent.push(message), joinRoom: id => joined.push(id), updateLayout() {},
			addPopup: (type, data) => {
				context.app.lastPopup = {type, data};
				if (![context.RogueLearnMovePopup, context.RogueRetryHealingPopup, context.RogueCratePopup, context.RogueDailyReplayPopup].includes(type)) return;
				const popup = Object.create(type);
				popup.$el = {addClass() {}, html: html => { popup.html = html; },
					scrollTop(value) { if (value !== undefined) popup.scroll = value; return popup.scroll || 0; }};
				popup.controls = {};
				popup.$ = selector => ({
					prop(name, value) { popup.controls[selector] = {[name]: value}; },
					text(value) { popup.controls[selector] = value; },
				});
				popup.close = () => popup.remove();
				popup.initialize(data); context.app.popups.push(popup);
				return popup;
			},
		}),
		setTimeout: () => 1, clearTimeout: () => {}, setInterval: () => 1, clearInterval: () => {},
		...runtime,
	};
	if (localized) {
		const translator = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/ps-china-translator.js'), 'utf8');
		vm.runInNewContext(translator.slice(0, translator.indexOf('(function() {')), context);
	}
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-fantasy-rogue.js'), 'utf8'), context);
	const room = Object.create(context.FantasyRogueRoom);
	room.id = 'fantasyrogue';
	context.app.rooms.fantasyrogue = room;
	const panel = Object.create(context.FantasyRoguePartyRoom);
	panel.id = 'fantasyrogueparty';
	panel.$el = {addClass() {}, html: html => { panel.html = html; }, scrollTop: () => 0};
	context.app._addRoom = id => { context.app.rooms[id] = panel; return panel; };
	context.app.updateSideRoom = id => { context.app.sideRoom = context.app.rooms[id]; };
	room.$el = {addClass() {}, html: html => { room.html = html; }, scrollTop: value => { if (value !== undefined) room.scroll = value; return room.scroll || 0; }};
	room.controls = {};
	room.$ = selector => ({
		val() { return room.controls[selector]; },
		each(callback) { for (const element of room.controls[selector] || []) callback.call(element); },
		text(value) { room.controls[selector] = value; },
		prop(name, value) { room.controls[selector] = {[name]: value}; },
		trigger(name) { room.lastTriggered = {selector, name}; },
	});
	room.listenTo = (source, event, callback) => source.on(event, callback.bind(room));
	room.initialize();
	// Existing flow tests exercise a player who has already pressed the start button.
	if (!startScreen) room.screen = 'game';
	room.preparePanel();
	return {...context, room, panel, get html() { return room.html + panel.html + (room.pendingMovePopup?.html || ''); }, sent, joined, setUser: id => { userid = id; }};
}
function state() {
	return {userid: 'rogueplayer', protocolVersion: 1, enabled: true, coopEnabled: true, configured: false,
		message: '正式队伍与数值等待配置', starters: [], items: [], run: null,
		account: {revision: 1, points: 25, slots: 1, boosts: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, captures: {}}};
}

describe('Fantasy Rogue universal allocation and Fantasy confirmation', () => {
	function setup(kind = 'mega') {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		const item = kind === 'mega' ? 'rogueuniversalmegastone' : kind === 'gmega' ? 'rogueuniversalwishingstar' : 'rogueuniversalpsychicz';
		mon.universalOptions = [{id: item, name: '万用道具', kind, points: kind === 'mega' ? 100 : kind === 'gmega' ? 60 : 50,
			cap: kind === 'mega' ? 30 : kind === 'gmega' ? 40 : 20, hp: kind === 'gmega' ? 40 : 0,
			eligible: true, baseStats: {hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100}}];
		c.room.receiveState(data);
		const controls = new Map([['select[name=universalItem]', item]]);
		c.room.$ = selector => ({
			val(value) { if (value !== undefined) controls.set(selector, value); return controls.get(selector); },
			prop(key, value) { if (value !== undefined) controls.set(selector + ':' + key, value); return controls.get(selector + ':' + key); },
			text(value) { controls.set(selector, value); },
		});
		return {c, data, mon, controls};
	}
	it('renders server-issued point totals and caps with no editable HP field', () => {
		for (const kind of ['mega', 'gmega', 'z']) {
			const {c, mon} = setup(kind), html = c.room.renderUniversalConfig(mon, false), item = mon.universalOptions[0];
			assert(html.includes('非 HP 共 ' + item.points)); assert(html.includes('max="' + item.cap + '"'));
			assert(html.includes('HP 种族值固定 +' + item.hp)); assert(!html.includes('name="universal-hp"'));
			assert.equal(html.includes('name="universalAura"'), kind === 'z');
		}
	});
	it('submits the allocated stats on the normal command route and blocks over-cap or repeated input', () => {
		const {c, mon, controls} = setup(), values = {atk: 30, def: 30, spa: 20, spd: 20, spe: 0};
		for (const stat of Object.keys(values)) controls.set('input[name=universal-' + stat + ']', values[stat]);
		c.room.applyUniversal();
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'configureuniversal'); assert.equal(command.member, mon.id); assert.deepEqual(command.evs, {hp: 0, ...values});
		const count = c.sent.length; c.room.applyUniversal(); assert.equal(c.sent.length, count);
		c.room.pending = null; controls.set('input[name=universal-atk]', 31); controls.set('input[name=universal-def]', 29);
		c.room.applyUniversal(); assert.equal(c.sent.length, count);
	});
	it('requires a selected tied highest aura and forwards real party-panel input events', () => {
		const {c, controls} = setup('z');
		for (const [stat, value] of Object.entries({atk: 20, def: 20, spa: 10, spd: 0, spe: 0})) controls.set('input[name=universal-' + stat + ']', value);
		const count = c.sent.length; c.room.applyUniversal(); assert.equal(c.sent.length, count);
		controls.set('select[name=universalAura]', 'def'); c.panel.updateUniversalAllocation(); c.room.applyUniversal();
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)); assert.equal(command.aura, 'def');
		assert.equal(c.FantasyRoguePartyRoom.events['input .rogue-universal-allocation input'], 'updateUniversalAllocation');
	});
	it('opens a branch-specific loss warning and sends confirmation only after the native confirm button', () => {
		const c = client(), data = adventure('choose'), mon = data.run.team[0];
		mon.fantasyOptions = [{species: 'Urshifu-2-Fantasy', replacements: [{from: 'wickedblow', to: 'cunjinbengji'}], removed: ['darkpulse'], lostMoves: ['wickedblow', 'darkpulse']}];
		c.room.receiveState(data); const count = c.sent.length;
		c.room.fantasizeMember(mon.id + '|Urshifu-2-Fantasy'); assert.equal(c.sent.length, count);
		assert(c.app.lastPopup.data.text.includes('wickedblow')); assert(c.app.lastPopup.data.text.includes('darkpulse'));
		const popup = Object.create(c.RogueCardConfirmPopup); popup.$el = {html() {}}; popup.close = () => {};
		popup.initialize(c.app.lastPopup.data); popup.confirmCard();
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'fantasize'); assert.equal(command.value, 'Urshifu-2-Fantasy'); assert.equal(command.confirmed, true);
	});
});

describe('Fantasy Rogue cooperative lobby entry', () => {
	it('hides and rejects co-op entry when the server disables it or has no capability field', () => {
		for (const enabled of [undefined, false]) {
			const c = client(true), data = state(); data.coopEnabled = enabled; c.room.receiveState(data);
			assert(!c.room.html.includes('name="openCoop"')); assert(c.room.html.includes('name="enterGame"'));
			const sent = c.sent.length; c.room.openCoop(); c.room.sendCoop('invite', {target: 'friend'});
			c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {players: [{userid: 'friend'}]}});
			c.room.receiveCoopNotice({exitRequest: 'retreat'});
			assert.equal(c.sent.length, sent); assert.equal(c.room.screen, 'home'); assert(!c.room.coopState);
			assert(c.room.renderCoop().includes('暂未开放'));
		}
	});
	it('closes a previously open co-op screen when refreshed server capability is disabled', () => {
		const c = client(true), data = state(); c.room.receiveState(data); c.room.openCoop();
		c.room.coopState = {players: [{userid: 'friend'}]}; c.room.coopRefreshPending = true;
		c.room.receiveState({...data, coopEnabled: false});
		assert.equal(c.room.screen, 'home'); assert.equal(c.room.coopState, null); assert.equal(c.room.coopBusy, false);
		assert.equal(c.room.coopRefreshPending, false); assert(!c.room.html.includes('name="openCoop"'));
	});
	function openLobby() {
		const c = client(true), data = state();
		data.account.revision = 4; c.room.receiveState(data); c.room.openCoop();
		return {c, data};
	}
	function safariLobby() {
		const {c} = openLobby();
		const session = {id: 'safari-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', difficulty: 0, canControl: true, adventure: {
				phase: 'route-interaction', floor: 61, team: [], partnerTeam: [], bag: {}, money: 100,
				selectedRoute: {id: 'safari-route', kind: 'event', name: '狩猎地带'}, coopEvent: {
					id: 'safaripark', key: 'safari-step', stage: 'choice', title: '狩猎地带',
					safari: {key: 'safari-step', name: 'Magikarp', balls: 3}, branchResolved: false,
					branchOptions: [{id: 'bait', name: '轻轻撒一些食物。'}, {id: 'leave', name: '今天先到这里。'}],
				},
			}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', players: [], invitations: [], session}});
		receive(); return {c, session, receive};
	}
	it('requests safari consent with the authoritative step and a shared ball, separate from common event choices', () => {
		const {c} = safariLobby();
		assert(c.room.html.includes('共同狩猎球剩余 3 颗')); assert(c.room.html.includes('伙伴归最终投球者'));
		assert(c.room.html.includes('name="proposeCoopSafariCapture"')); assert(!c.room.html.includes('value="ball"'));
		c.room.proposeCoopSafariCapture('rogueplayer');
		assert.deepEqual(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)), {
			action: 'proposecapture', ball: 'safariball', captureTarget: 'safari-step', owner: 'rogueplayer',
		});
	});
	it('renders safari consent in the event and disables common steps during negotiation', () => {
		const {c, session, receive} = safariLobby();
		session.adventure.captureProposal = {id: 'safari-consent', context: 'safari', state: 'requested',
			ownerName: 'friend', recipientName: 'rogueplayer', targetName: 'Magikarp', ballName: '狩猎用球', isRecipient: true};
		receive(); assert(c.room.html.includes('共同捕捉协商')); assert(c.room.html.includes('使用共同狩猎球捕捉'));
		assert(!c.room.html.includes('使用自己的精灵球')); assert(c.room.html.includes('name="respondCoopCapture" value="contest"'));
		assert(/name="chooseCoopEvent" value="bait"[^>]*disabled/.test(c.room.html));
		assert(/name="proposeCoopSafariCapture"[^>]*disabled/.test(c.room.html));
		c.room.respondCoopCapture('accept');
		assert.deepEqual(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)), {
			action: 'respondcapture', id: 'safari-consent', value: 'accept',
		});
	});
	it('renders safari handoff with shared stock and clears it after server expiry without changing battle copy', () => {
		const {c, session, receive} = safariLobby();
		const capture = {id: 'safari-consent', context: 'safari', state: 'contested', isOwner: true,
			ownerName: 'rogueplayer', recipientName: 'friend', targetName: 'Magikarp', ballName: '狩猎用球',
			handoffBalls: [{id: 'safariball', name: '共同狩猎用球', count: 2}]};
		session.adventure.captureProposal = capture; receive();
		assert(c.room.html.includes('由队友使用共同狩猎球立即投球'));
		assert(c.room.html.includes('value="safariball"')); assert(c.room.html.includes('共同狩猎用球 ×2'));
		delete capture.context; assert(c.room.renderCoopCapture(capture, true).includes('由队友使用自己的精灵球立即投球'));
		session.adventure.captureProposal = null; receive(); assert(!c.room.html.includes('共同捕捉协商'));
		assert(!/name="chooseCoopEvent" value="bait"[^>]*disabled/.test(c.room.html));
	});
	it('supports delegated safari ownership and disables controls after control is handed away', () => {
		const {c, session, receive} = safariLobby();
		session.delegatedTo = 'rogueplayer'; receive(); assert(c.room.html.includes('交由队友捕捉'));
		c.room.proposeCoopSafariCapture('friend');
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)).owner, 'friend');
		session.delegatedTo = 'friend'; session.canControl = false; receive();
		assert(/name="proposeCoopSafariCapture"[^>]*disabled/.test(c.room.html));
		assert(!c.room.html.includes('交由队友捕捉'));
		const count = c.sent.length; c.room.proposeCoopSafariCapture('rogueplayer'); assert.equal(c.sent.length, count);
	});
	function liveBattleLobby() {
		const {c} = openLobby();
		const team = (prefix, names) => names.map(species => ({id: prefix + species, species, level: 5, hp: 20, maxhp: 20}));
		const session = {id: 'live-selection', status: 'active', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', difficulty: 0, canControl: true, adventure: {
				id: 'live-run', floor: 1, phase: 'battle-selection', difficulty: 0, doubleBattle: true,
				team: team('own-', ['Bulbasaur', 'Charmander', 'Squirtle', 'Pikachu']),
				partnerTeam: team('other-', ['Eevee', 'Snorlax']), money: 1500,
				battleSelectionKey: 'visit-a', battlePreview: [], partnerBattlePreview: [], battleSelection: [], partnerBattleSelection: [],
			}};
		const receive = (action = 'refresh') => c.room.receiveCoop({userid: 'rogueplayer', action, ok: true,
			state: {userid: 'rogueplayer', players: [], invitations: [], session: JSON.parse(JSON.stringify(session))}});
		const toggle = (value, checked, owner = 'rogueplayer') => c.room.changeCoopBattleMon({currentTarget: {
			value, checked, getAttribute: () => owner,
		}});
		const request = () => JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		receive();
		return {c, session, receive, toggle, request};
	}
	it('enters native Team Preview once per encounter, removes field checkboxes and keeps a retry button', () => {
		const {c, session, receive, request} = liveBattleLobby();
		session.adventure.nativePreviewEnabled = true; session.adventure.canRetryTogether = true;
		receive(); assert.deepEqual(request(), {action: 'preparebattle', visit: 'visit-a'});
		assert(!c.html.includes('name="coopBattleMon"')); assert(c.html.includes('name="prepareCoopBattle"'));
		const count = c.sent.length; receive(); assert.equal(c.sent.length, count);
		session.adventure.battleSelectionKey = 'next-encounter'; receive();
		assert.deepEqual(request(), {action: 'preparebattle', visit: 'next-encounter'});
	});
	it('labels the temporary escort holder before entering native Team Preview without field selection boxes', () => {
		const {c, session, receive} = liveBattleLobby();
		Object.assign(session.adventure, {nativePreviewEnabled: true, canRetryTogether: true,
			escort: {owner: 'friend', name: 'Friend <test>'}});
		receive(); assert(c.html.includes('护送者：Friend &lt;test')); assert(!c.html.includes('Friend <test>'));
		assert(c.html.includes('原队伍留在场外')); assert(c.html.includes('倒下则护送失败'));
		assert(!c.html.includes('name="coopBattleMon"'));
	});
	it('explains the one-partner restriction for a scroll trial at native Team Preview', () => {
		const {c, session, receive} = liveBattleLobby();
		Object.assign(session.adventure, {nativePreviewEnabled: true, canRetryTogether: true, scrollTrial: true});
		receive(); assert(c.html.includes('双方各派已选定的一只伙伴')); assert(!c.html.includes('选择最多 3 只伙伴'));
		assert(!c.html.includes('name="coopBattleMon"')); assert(c.html.includes('name="prepareCoopBattle"'));
	});
	it('shows separate scroll choices and helper status, with escaped names and delegated personal controls', () => {
		const {c, session, receive, request} = liveBattleLobby();
		session.delegatedTo = 'rogueplayer';
		Object.assign(session.adventure, {phase: 'route-interaction', selectedRoute: {kind: 'event'}, coopEvent: {
			id: 'kubfuscroll', key: 'own-scroll', partnerKey: 'other-scroll', stage: 'choice', branchResolved: true,
			title: '卷轴修行', paragraphs: ['两人各选自己的卷轴。'], options: [{id: 'change', name: '重新选择'}],
			partnerOptions: [{id: 'scroll:water', name: '水之卷轴'}], scrollPartners: [
				{owner: 'rogueplayer', name: 'Own <script>', species: 'Kubfu', choice: 'poison'},
				{owner: 'friend', name: 'Friend <test>', species: 'Pikachu', choice: 'assist'},
			],
		}});
		receive(); assert(c.html.includes('Own &lt;script')); assert(!c.html.includes('Own <script>'));
		assert(c.html.includes('酒之卷轴')); assert(c.html.includes('协助队友')); assert(c.html.includes('队友的个人步骤'));
		c.room.coopBusy = false; c.room.chooseCoopEvent('friend|scroll:water');
		assert.deepEqual(request(), {action: 'eventchoice', owner: 'friend', value: 'scroll:water', visit: 'other-scroll'});
		session.adventure.coopEvent.scrollPartners[1] = {owner: 'friend', name: 'Friend'}; receive();
		assert(c.html.includes('尚未选择伙伴')); assert(c.html.includes('尚未确认卷轴或协助'));
	});
	for (const kind of ['event', 'reward']) it(`renders the shared Master Ball ${kind} step without advancing the floor`, () => {
		const {c, session, receive, request} = liveBattleLobby();
		Object.assign(session.adventure, {phase: 'route-interaction', selectedRoute: {kind, name: '极境馈赠'}, coopEvent: {
			id: 'masterballgift', key: 'shared-master-' + kind, sideRoute: true, stage: 'choice', branchResolved: false,
			title: '极境馈赠', paragraphs: ['共同完成后继续本层。'], ownChoice: kind === 'event' ? 'promise' : null,
			branchOptions: [{id: kind === 'event' ? 'promise' : 'claim', name: kind === 'event' ? '许下约定' : '收下大师球'}],
		}});
		receive(); assert(c.html.includes('双方各得一颗大师球')); assert(c.html.includes('不消耗本层'));
		assert(!c.html.includes('个人步骤')); assert(!c.html.includes('name="finishCoopRoute"'));
		c.room.coopBusy = false; c.room.chooseCoopEvent(kind === 'event' ? 'promise' : 'claim');
		assert.deepEqual(request(), {action: 'eventchoice', value: kind === 'event' ? 'promise' : 'claim', visit: 'shared-master-' + kind});
		if (kind === 'event') assert(c.html.includes('name="cancelCoopEvent"'));
	});
	it('renders cooperative challenge offers and sends only current shared challenge commands', () => {
		const {c, session, receive, request} = liveBattleLobby();
		Object.assign(session.adventure, {phase: 'route-interaction', selectedRoute: {kind: 'challenge'}, coopChallenge: {
			id: 'starmaster', key: 'trial-offer', name: '试炼 <script>', stage: 'offer', paragraphs: ['共同挑战。'],
			team: [], portraits: [], prizes: [], choices: [{id: 'accept', label: '共同接受'}], ownChoice: 'accept',
		}});
		receive(); assert(c.html.includes('试炼 &lt;script')); assert(!c.html.includes('试炼 <script>'));
		assert(c.html.includes('name="chooseCoopChallenge"')); assert(!c.html.includes('value="challenge:accept"'));
		assert(!c.html.includes('name="finishCoopRoute"')); assert(c.html.includes('撤回我的选择'));
		c.room.coopBusy = false; c.room.chooseCoopChallenge('accept');
		assert.deepEqual(request(), {action: 'challenge', value: 'accept', visit: 'trial-offer'});
	});
	it('renders shared challenge prizes and delegated own-party star targets without solo reward controls', () => {
		const {c, session, receive, request} = liveBattleLobby();
		session.delegatedTo = 'rogueplayer';
		Object.assign(session.adventure, {phase: 'route-interaction', selectedRoute: {kind: 'challenge'}, coopChallenge: {
			id: 'starmaster', key: 'trial-stars', name: '摘星授业', stage: 'won', paragraphs: [],
			team: [], portraits: [], choices: [{id: 'back', label: '重新选择奖励'}],
			prizes: [{id: 'supplies', name: '补给箱', money: 300, items: {potion: 2}}],
			ownTargets: [{member: 'own-star', species: 'Pikachu', from: 1, to: 2}],
			partnerTargets: [{member: 'partner-star', species: 'Bulbasaur', from: 2, to: 3}],
		}});
		receive(); assert(c.html.includes('value="prize:supplies"')); assert(!c.html.includes('value="challenge:supplies"'));
		session.adventure.coopChallenge.selected = 'star'; session.adventure.coopChallenge.ownTarget = 'own-star'; receive();
		assert(c.html.includes('我方摘星伙伴')); assert(c.html.includes('队友摘星伙伴')); assert(c.html.includes('已选 ·'));
		assert(!c.html.includes('value="prize:supplies"')); c.room.coopBusy = false;
		c.room.chooseCoopStar('friend|partner-star');
		assert.deepEqual(request(), {action: 'challenge', value: 'target', owner: 'friend', member: 'partner-star', visit: 'trial-stars'});
	});
	it('explains failed challenge costs and returns to challenge choices instead of advancing a floor', () => {
		const {c, session, receive} = liveBattleLobby();
		Object.assign(session.adventure, {phase: 'settlement', coopChallenge: {stage: 'paused'},
			battleResult: {won: false, eventResolved: true, retreated: true}});
		receive(); assert(c.html.includes('本次挑战未获得成长或奖励')); assert(c.html.includes('返回共同挑战'));
		assert(!c.html.includes('name="retryCoopBattle"'));
	});
	it('handles personal companion invitations before advancing and labels both travelling parties', () => {
		const {c, session, receive, request} = liveBattleLobby();
		session.delegatedTo = 'rogueplayer';
		Object.assign(session.adventure, {phase: 'route-interaction', companionInvitation: {
			id: 'riley', name: '亚玄', key: 'invite-own', roster: [{id: 'ingo', name: '北尚'}, {id: 'emmet', name: '南厦'}],
		}, partnerCompanionInvitation: {id: 'palmer', name: '桄榔', key: 'invite-other', roster: []},
		travellingRoster: [{name: '北尚 <test>'}], partnerTravellingRoster: [{name: '南厦'}]});
		receive(); assert(c.html.includes('处理各自的同行邀请')); assert(c.html.includes('北尚 &lt;test'));
		assert(!c.html.includes('name="companionInviteAction"')); assert(c.html.includes('value="rogueplayer|ingo"'));
		c.room.coopBusy = false; c.room.chooseCoopInvite('friend|decline');
		assert.deepEqual(request(), {action: 'companioninvite', owner: 'friend', value: 'decline', visit: 'invite-other'});
	});
	it('keeps native partner previews synchronized even while the Rogue room shows another screen', () => {
		const {c, session, receive, request} = liveBattleLobby();
		session.roomid = 'battle-native'; session.adventure.phase = 'battle';
		let updates = 0; c.app.rooms['battle-native'] = {updateRogueCoopPreview() { updates++; }};
		receive(); c.room.screen = 'home'; c.room.receiveCoopNotice({battleSelection: true});
		assert.deepEqual(request(), {action: 'refresh'});
		c.room.receiveCoopNotice({battleSelection: true}); assert(c.room.coopRefreshPending);
		receive(); assert.equal(c.room.coopRefreshPending, false); assert(updates >= 2);
	});
	it('sends every live checkbox change and cancellation without implying confirmation', () => {
		const {c, session, receive, toggle, request} = liveBattleLobby(), adventure = session.adventure;
		for (const [id, checked, expected] of [
			['own-Bulbasaur', true, ['own-Bulbasaur']],
			['own-Charmander', true, ['own-Bulbasaur', 'own-Charmander']],
			['own-Bulbasaur', false, ['own-Charmander']], ['own-Charmander', false, []],
		]) {
			toggle(id, checked);
			assert.deepEqual(request(), {action: 'previewbattle', owner: 'rogueplayer', members: expected, visit: 'visit-a'});
			assert.equal(c.room.coopBusy, true);
			adventure.battlePreview = expected; receive('previewbattle');
			assert.deepEqual(c.room.coopBattleSelection, expected);
			assert(c.room.html.includes('已预选 ' + expected.length + ' / 3 · 尚未确认'));
		}
		assert(!c.sent.some(message => message.includes('"action":"selectbattle"')));
		toggle('own-Squirtle', true); adventure.battlePreview = ['own-Squirtle']; receive('previewbattle');
		c.room.saveCoopBattleSelection('rogueplayer');
		assert.deepEqual(request(), {action: 'selectbattle', owner: 'rogueplayer', members: ['own-Squirtle'], visit: 'visit-a'});
	});
	it('shows the partner preview and readiness independently while preserving the own server preview', () => {
		const {c, session, receive, request} = liveBattleLobby(), adventure = session.adventure;
		adventure.battlePreview = ['own-Bulbasaur']; adventure.partnerBattlePreview = ['other-Eevee']; receive();
		assert(c.room.html.includes('队友实时预选 · 1 / 3 · 尚未确认'));
		assert.deepEqual(c.room.coopBattleSelection, ['own-Bulbasaur']);
		adventure.partnerBattlePreview = []; receive();
		assert(c.room.html.includes('队友实时预选 · 0 / 3 · 尚未确认'));
		adventure.battleSelection = ['own-Bulbasaur']; receive('selectbattle');
		assert(c.room.html.includes('已预选 1 / 3 · 已确认出战'));
		assert(c.room.html.includes('name="cancelCoopBattleSelection" value="rogueplayer"'));
		c.room.cancelCoopBattleSelection('rogueplayer');
		assert.deepEqual(request(), {action: 'previewbattle', owner: 'rogueplayer', members: ['own-Bulbasaur'], visit: 'visit-a'});
		adventure.battleSelection = []; receive('previewbattle');
		assert(c.room.html.includes('已预选 1 / 3 · 尚未确认'));
		assert(!c.room.html.includes('name="cancelCoopBattleSelection"'));
	});
	it('refreshes a partner update received while a local preview is in flight', () => {
		const {c, session, receive, toggle, request} = liveBattleLobby();
		toggle('own-Bulbasaur', true); const count = c.sent.length;
		c.room.receiveCoopNotice({battleSelection: true});
		assert.equal(c.sent.length, count); assert.equal(c.room.coopRefreshPending, true);
		session.adventure.battlePreview = ['own-Bulbasaur']; receive('previewbattle');
		assert.equal(c.sent.length, count + 1); assert.deepEqual(request(), {action: 'refresh'});
		assert.equal(c.room.coopRefreshPending, false);
		session.adventure.partnerBattlePreview = ['other-Snorlax']; receive();
		assert.equal(c.room.coopBusy, false);
		assert.deepEqual(c.room.coopPartnerBattleSelection, ['other-Snorlax']);
		assert.deepEqual(c.room.coopBattleSelection, ['own-Bulbasaur']);
	});
	it('restores authoritative selections after a rejected preview and keeps the error visible', () => {
		const {c, session, receive, toggle, request} = liveBattleLobby();
		toggle('own-Bulbasaur', true);
		c.room.receiveCoop({userid: 'rogueplayer', action: 'previewbattle', ok: false, message: '出战页面已更新，请重新选择。'});
		assert.deepEqual(request(), {action: 'refresh'});
		session.adventure.battleSelectionKey = 'visit-b'; receive();
		assert.equal(c.room.coopBattleSelection.length, 0);
		assert(c.room.html.includes('出战页面已更新，请重新选择。'));
		toggle('own-Charmander', true); assert.equal(request().visit, 'visit-b');
		session.adventure.battlePreview = ['own-Charmander']; receive('previewbattle');
		assert(!c.room.html.includes('出战页面已更新，请重新选择。'));
	});
	it('blocks stale or unauthorized selection handlers and allows the current delegate to preview both rosters', () => {
		for (const restriction of ['busy', 'paused', 'phase', 'permission', 'owner']) {
			const {c, toggle} = liveBattleLobby(), current = c.room.coopState.session;
			if (restriction === 'busy') c.room.coopBusy = true;
			if (restriction === 'paused') current.status = 'paused';
			if (restriction === 'phase') current.adventure.phase = 'area-selection';
			if (restriction === 'permission') current.canControl = false;
			const owner = restriction === 'owner' ? 'friend' : 'rogueplayer', count = c.sent.length;
			toggle('own-Bulbasaur', true, owner); c.room.saveCoopBattleSelection(owner); c.room.cancelCoopBattleSelection(owner);
			assert.equal(c.sent.length, count, restriction);
		}
		const {c, session, receive, toggle, request} = liveBattleLobby();
		session.delegatedTo = 'rogueplayer'; receive(); toggle('other-Eevee', true, 'friend');
		assert.deepEqual(request(), {action: 'previewbattle', owner: 'friend', members: ['other-Eevee'], visit: 'visit-a'});
	});
	it('clears previews and selection errors when the shared session ends', () => {
		const {c, session, receive} = liveBattleLobby();
		session.adventure.battlePreview = ['own-Bulbasaur']; session.adventure.partnerBattlePreview = ['other-Eevee']; receive();
		c.room.coopSelectionError = 'old error';
		c.room.receiveCoop({userid: 'rogueplayer', action: 'refresh', ok: true, state: {
			userid: 'rogueplayer', players: [], invitations: [], session: null,
		}});
		assert.equal(c.room.coopBattleSelection.length, 0); assert.equal(c.room.coopPartnerBattleSelection.length, 0);
		assert.equal(c.room.coopSelectionError, '');
	});
	it('opens the partner battle once when shared confirmation creates a new room', () => {
		const {c, session, receive} = liveBattleLobby();
		session.roomid = 'battle-coop-live'; session.adventure.phase = 'battle'; receive();
		assert.deepEqual(c.joined, ['battle-coop-live']);
		receive(); c.room.receiveCoopNotice({battleStarted: true}); receive();
		assert.deepEqual(c.joined, ['battle-coop-live'], 'repeated notices do not reopen the battle');
		c.room.screen = 'home'; session.roomid = 'battle-coop-next'; receive();
		assert.deepEqual(c.joined, ['battle-coop-live'], 'background refresh does not interrupt the home page');
	});
	it('does not automatically open an old, paused, failed or already open cooperative battle', () => {
		for (const condition of ['initial', 'paused', 'failed', 'open']) {
			const {c, session, receive} = liveBattleLobby();
			session.roomid = 'battle-coop-old'; session.adventure.phase = 'battle';
			if (condition === 'initial') c.room.coopState = null;
			if (condition === 'paused') session.status = 'paused';
			if (condition === 'open') c.app.rooms[session.roomid] = {};
			if (condition === 'failed') c.room.receiveCoop({userid: 'rogueplayer', action: 'selectbattle', ok: false,
				state: {userid: 'rogueplayer', players: [], invitations: [], session}});
			else receive();
			assert.equal(c.joined.length, 0, condition);
		}
	});
	it('uses Rogue supply names in co-op battle inventory and both reward summaries', () => {
		const {c, session, receive} = liveBattleLobby(), data = state();
		data.account.revision = 5;
		data.items = [{id: 'potion', name: '伤药（20 HP）'}, {id: 'ether', name: 'PP 单项小补剂'},
			{id: 'expcandym', name: '经验糖果 M（3000 经验）'}];
		c.room.receiveState(data); c.room.screen = 'coop';
		const items = {potion: 6, ether: 6, expcandym: 1};
		session.adventure.bag = items;
		session.adventure.lastReward = {floor: 1, name: '区域奖励', items}; receive();
		assert(c.room.html.includes('伤药（20 HP） ×6')); assert(c.room.html.includes('PP 单项小补剂 ×6'));
		assert(c.room.html.includes('经验糖果 M（3000 经验） ×1'));
		session.adventure.phase = 'settlement';
		session.adventure.battleResult = {won: true, reward: {items}, partnerReward: {items}}; receive();
		assert(c.room.html.includes('你的战利品：伤药（20 HP） ×6'));
		assert(c.room.html.includes('队友的战利品：伤药（20 HP） ×6'));
		assert(!c.room.html.includes('雄性的样子'));
	});
	it('renders shared companion milestone choices and sends the current scoped visit', () => {
		const {c} = openLobby();
		const scene = {id: 'olivia', stage: 100, title: '一路同行', name: '莉兹', ownerName: '<b>队友</b>',
			visit: 'milestone-visit', text: '愿意与你同行。', narration: '回首旅途。', ownChoice: 'friends',
			partnerChoice: 'accept', options: [{id: 'friends', name: '继续作为挚友'}, {id: 'accept', name: '成为恋人'}]};
		const session = {status: 'active', canControl: true, adventure: {phase: 'affection', coopAffection: scene}};
		c.room.coopState = {userid: 'rogueplayer', session}; c.room.coopBusy = false;
		const html = c.room.renderCoopAdventure(session);
		assert(html.includes('双方共同选择回应')); assert(html.includes('队友选择：成为恋人'));
		assert(html.includes('&lt;b>队友&lt;/b>')); assert(!html.includes('<b>队友</b>'));
		assert(!html.includes('name="finishCoopRoute"')); assert(html.includes('name="chooseCoopAffection" value="cancel"'));
		c.room.chooseCoopAffection('friends');
		assert.deepEqual(JSON.parse(c.sent.at(-1).split('/fantasyrogue coop ')[1]), {
			action: 'affection', visit: scene.visit, value: 'friends',
		});
		c.room.coopBusy = false; c.room.chooseCoopAffection('cancel');
		assert.equal(JSON.parse(c.sent.at(-1).split('/fantasyrogue coop ')[1]).value, 'cancel');
	});
	it('disables companion replies for the delegating player and shows both personal bond lists', () => {
		const {c} = openLobby(); c.room.coopBusy = false;
		const session = {canControl: false, adventure: {coopAffection: {id: 'guzma', stage: 50, title: '心意',
			name: '古兹马', ownerName: '队友', options: [{id: 'thanks', name: '谢谢'}], ownChoice: null},
			trainerBonds: [{id: 'guzma', name: '古兹马', score: 50, active: true}],
			partnerTrainerBonds: [{id: 'olivia', name: '莉兹', score: 100, active: true, relationship: 'bestfriend'}]}};
		assert.match(c.room.renderCoopAffection(session), /name="chooseCoopAffection" value="thanks"[^>]*disabled/);
		const bonds = c.room.renderCoopBonds(session);
		assert(bonds.includes('我的同行')); assert(bonds.includes('队友的同行')); assert(bonds.includes('挚友'));
		assert.equal(c.room.renderCoopBonds({adventure: {}}), '');
	});
	it('adds the home entry and requests the authenticated cooperative state', () => {
		const c = client(true), data = state(); c.room.receiveState(data);
		assert(c.room.html.includes('name="openCoop"'));
		c.room.openCoop();
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"refresh"}');
		assert.equal(c.room.screen, 'coop');
	});
	it('renders only unlocked tiers and server-listed online players with invitation controls', () => {
		const {c} = openLobby(); c.room.coopDifficulty = 1;
		c.room.receiveCoop({userid: 'rogueplayer', action: 'refresh', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 2, players: [{userid: 'friend', name: 'Friend', maxDifficulty: 1}],
			invitations: [], session: null,
		}});
		assert(c.room.html.includes('Friend'));
		assert(c.room.html.includes('value="1" selected'));
		assert(c.room.html.includes('第 3 档（尚未解锁）'));
		assert(c.room.html.includes('name="inviteCoopPlayer" value="friend"'));
	});
	it('opens the native starter configuration and saves that member\'s choices and build', () => {
		const {c} = openLobby();
		const ivs = {hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 1, starterSlots: 1,
			natures: [{id: 'modest', name: 'Modest', plus: 'spa', minus: 'atk'}],
			starters: [{id: 'bulbasaur', species: 'Bulbasaur', level: 5, slotCost: 1, available: true,
				abilities: [{id: 'overgrow', name: 'Overgrow'}], traits: {natures: [], genders: [], abilities: [], moves: [],
					ivs: {min: {...ivs}, max: {...ivs}}}}],
			players: [], invitations: [], session: {id: 'session-1', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
				difficulty: 0, status: 'lobby', starterSelection: [], partnerStarterSelection: []},
		}});
		assert(c.room.html.includes('name="coopStarter" value="bulbasaur"'));
		c.room.changeCoopStarter({currentTarget: {value: 'bulbasaur', checked: true}});
		assert.deepEqual(c.room.coopStarterSelection, ['bulbasaur']);
		const sentBeforePopup = c.sent.length;
		c.room.saveCoopStarters();
		assert.equal(c.app.lastPopup.type, c.RogueStarterPopup);
		assert.equal(c.sent.length, sentBeforePopup);
		const popup = Object.create(c.RogueStarterPopup), form = {nature: 'random', gender: 'random', ability: 'random'};
		for (const stat of Object.keys(ivs)) form['iv-' + stat] = String(ivs[stat]);
		popup.$el = {addClass() {}, html: html => { popup.html = html; }};
		popup.$ = () => ({text: value => { popup.error = value; }});
		popup.close = () => { popup.closed = true; };
		popup.initialize(c.app.lastPopup.data);
		assert(popup.html.includes('初始配置'));
		popup.submit(form);
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'selectstarters'); assert.deepEqual(request.starters, ['bulbasaur']);
		assert.equal(request.starterBuilds.bulbasaur.nature, 'random');
		assert.equal(request.starterBuilds.bulbasaur.ivs.spa, 15);
	});
	it('preserves an unfinished starter selection when the partner saves or reconnects', () => {
		const {c} = openLobby();
		const session = {id: 'draft-lobby', role: 'guest', status: 'lobby', hostName: 'Friend', guestName: 'rogueplayer',
			difficulty: 0, starterSelection: [], starterBuildSelection: {}, partnerStarterSelection: []};
		const receive = (patch = {}, action = 'refresh', ok = true) => c.room.receiveCoop({userid: 'rogueplayer', action, ok,
			state: {userid: 'rogueplayer', starterSlots: 1, starters: [{id: 'charmander', species: 'Charmander',
				available: true, slotCost: 1}], players: [], invitations: [], session: {...session, ...patch}}});
		receive();
		c.room.changeCoopStarter({currentTarget: {value: 'charmander', checked: true}});
		c.room.coopStarterBuilds.charmander.nature = 'modest';
		receive({partnerStarterSelection: ['bulbasaur']});
		assert.deepEqual(c.room.coopStarterSelection, ['charmander']);
		assert.equal(c.room.coopStarterBuilds.charmander.nature, 'modest');
		assert(c.room.html.includes('队友“Friend”已选择 bulbasaur'));
		receive({partnerStarterSelection: ['bulbasaur'], partnerOnline: false});
		assert.deepEqual(c.room.coopStarterSelection, ['charmander']);
		receive({partnerStarterSelection: ['bulbasaur']}, 'selectstarters', false);
		assert.deepEqual(c.room.coopStarterSelection, ['charmander'], 'a rejected save leaves the draft available for correction');
		receive({starterSelection: ['bulbasaur'], starterBuildSelection: {bulbasaur: {nature: 'bold'}}});
		assert.deepEqual(c.room.coopStarterSelection, ['bulbasaur'], 'an actual own-server update remains authoritative');
		assert.equal(c.room.coopStarterBuilds.bulbasaur.nature, 'bold');
	});
	it('accepts saved starter state and clears drafts on lobby changes or departure', () => {
		const {c} = openLobby();
		const session = {id: 'old-lobby', role: 'host', hostName: 'rogueplayer', guestName: 'Friend', status: 'lobby',
			difficulty: 0, starterSelection: ['bulbasaur'], starterBuildSelection: {bulbasaur: {nature: 'bold'}}};
		const receive = (next, action = 'refresh') => c.room.receiveCoop({userid: 'rogueplayer', action, ok: true,
			state: {userid: 'rogueplayer', starterSlots: 1, starters: [], players: [], invitations: [], session: next}});
		receive(session); c.room.coopStarterSelection = ['charmander'];
		receive({...session}, 'selectstarters');
		assert.deepEqual(c.room.coopStarterSelection, ['bulbasaur']);
		c.room.coopStarterSelection = ['charmander'];
		receive({...session, id: 'new-lobby', starterSelection: [], starterBuildSelection: {}});
		assert.equal(c.room.coopStarterSelection.length, 0); assert.equal(Object.keys(c.room.coopStarterBuilds).length, 0);
		c.room.coopStarterSelection = ['charmander']; receive(null);
		assert.equal(c.room.coopStarterSelection.length, 0); assert.equal(Object.keys(c.room.coopStarterBuilds).length, 0);
	});
	it('does not submit a starter configuration popup into a replaced or departed lobby', () => {
		for (const replacement of [null, {id: 'new-lobby', status: 'lobby'}, {id: 'original-lobby', status: 'active'}]) {
			const {c} = openLobby(); c.room.coopBusy = false;
			c.room.coopState = {userid: 'rogueplayer', session: {id: 'original-lobby', status: 'lobby'}};
			c.room.coopStarterSelection = ['bulbasaur']; c.room.saveCoopStarters();
			const adapter = c.app.lastPopup.data.room, count = c.sent.length;
			c.room.coopState.session = replacement; adapter.startAdventure();
			assert.equal(c.sent.length, count);
		}
	});
	it('shows both battle rosters and submits each player’s selections under delegated control', () => {
		const {c} = openLobby();
		const ownTeam = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'].map((id, index) => ({
			id: 'own-' + id, species: id, level: 5, hp: 20, maxhp: 20, shiny: false,
		}));
		const partnerTeam = ['eevee', 'snorlax'].map(id => ({
			id: 'partner-' + id, species: id, level: 5, hp: 20, maxhp: 20, shiny: false,
		}));
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 1, starterSlots: 1, starters: [], players: [], invitations: [],
			session: {id: 'session-2', role: 'host', hostName: 'rogueplayer', guestName: 'friend', partnerUserId: 'friend',
				delegatedTo: 'rogueplayer', difficulty: 0,
				status: 'active', starterSelection: ['bulbasaur'], partnerStarterSelection: ['squirtle'], adventure: {
					id: 'adventure-1', floor: 1, phase: 'battle-selection', difficulty: 0, doubleBattle: true,
					team: ownTeam, partnerTeam, battleSelection: [], partnerBattleSelection: ['partner-eevee'], money: 1500,
				}},
		}});
		assert(c.room.html.includes('rogue-coop-partner-preview'));
		assert(c.room.html.includes('rogue-coop-party-icon is-selected'));
		assert(c.room.html.includes('name="coopBattleMon" data-owner="rogueplayer" value="own-bulbasaur"'));
		assert(c.room.html.includes('name="coopBattleMon" data-owner="friend" value="partner-eevee"'));
		for (const mon of ownTeam.slice(0, 3)) c.room.changeCoopBattleMon({currentTarget: {
			value: mon.id, checked: true, getAttribute: () => 'rogueplayer',
		}});
		assert.equal(c.room.coopBattleSelection.length, 3);
		const fourth = {value: 'own-pikachu', checked: true, getAttribute: () => 'rogueplayer'}; c.room.changeCoopBattleMon({currentTarget: fourth});
		assert.equal(fourth.checked, false);
		assert(c.room.coopMessage.includes('最多选择 3 只'));
		c.room.coopMessage = ''; c.room.saveCoopBattleSelection('rogueplayer');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'selectbattle');
		assert.equal(request.owner, 'rogueplayer');
		assert.deepEqual(request.members, ownTeam.slice(0, 3).map(mon => mon.id));
		c.room.coopBusy = false; c.room.saveCoopBattleSelection('friend');
		const partnerRequest = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(partnerRequest.owner, 'friend');
		assert.deepEqual(partnerRequest.members, ['partner-eevee']);
	});
	it('shows the member-owned rest shop and sends an idempotent private purchase plus shared exit confirmation', () => {
		const {c} = openLobby();
		const adventure = {
			id: 'adventure-rest', floor: 9, phase: 'route-interaction', difficulty: 0, doubleBattle: true,
			selectedRoute: {id: 'center', name: '宝可梦中心', kind: 'rest'},
			team: [{id: 'own-bulbasaur', species: 'Bulbasaur', level: 5, hp: 20, maxhp: 20}],
			partnerTeam: [{id: 'partner-eevee', species: 'Eevee', level: 8, hp: 30, maxhp: 30}],
			battleSelection: [], partnerBattleSelection: [], money: 1000, bag: {potion: 0},
			centerCare: {needed: true, cost: 250, fainted: 0}, routeExitSelection: false, partnerRouteExitSelection: true,
			partnerMoney: 1300,
			shopItems: [{id: 'potion', name: '伤药', kind: 'heal', price: 200, remaining: null, description: '恢复 HP'}],
			partnerShopItems: [{id: 'potion', name: '伤药', kind: 'heal', price: 200, remaining: null, description: '恢复 HP'}],
		};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {id: 'session-rest', role: 'host', hostName: 'rogueplayer', partnerUserId: 'friend',
				delegatedTo: 'rogueplayer',
				guestName: 'friend', difficulty: 0, status: 'active', starterSelection: ['bulbasaur'],
				partnerStarterSelection: ['eevee'], adventure}}});
		assert(c.room.html.includes('休整商店'));
		assert(c.room.html.includes('使用自己的金币购买'));
		assert(c.room.html.includes('以“你”为发起方'));
		assert(c.room.html.includes('name="coopTradeOwn" data-owner="rogueplayer"'));
		assert(c.room.html.includes('name="coopTradePartner" data-owner="rogueplayer"'));
		assert(c.room.html.includes('name="coopTradeOwn" data-owner="friend"'));
		assert(c.room.html.includes('name="coopTradePartner" data-owner="friend"'));
		assert(c.room.html.includes('队友已确认'));
		c.room.buyCoopRest('potion');
		let request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'buy'); assert.equal(request.value, 'potion');
		assert(request.id.startsWith('rest-'));
		c.room.coopBusy = false; c.room.buyCoopRest('friend|potion');
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.owner, 'friend');
		assert.equal(request.value, 'potion');
		c.room.coopBusy = false; c.room.finishCoopRoute();
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'finishroute');
		c.room.coopBusy = false;
		const oldDollar = c.room.$;
		c.room.$ = selector => ({val: () => selector.includes('coopTradeOwn') ?
			selector.includes('data-owner="friend"') ? 'partner-eevee' : 'own-bulbasaur' :
			selector.includes('data-owner="friend"') ? 'own-bulbasaur' : 'partner-eevee'});
		c.room.proposeCoopTrade('rogueplayer');
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'proposetrade');
		assert.equal(request.owner, 'rogueplayer');
		assert.equal(request.member, 'own-bulbasaur');
		assert.equal(request.partnerMember, 'partner-eevee');
		c.room.coopBusy = false; c.room.proposeCoopTrade('friend');
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.owner, 'friend');
		assert.equal(request.member, 'partner-eevee');
		assert.equal(request.partnerMember, 'own-bulbasaur');
		c.room.coopBusy = false;
		c.room.coopState.session.adventure.tradeProposal = {id: 'trade-request-1'};
		c.room.respondCoopTrade('rogueplayer|decline');
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'respondtrade');
		assert.equal(request.accept, false);
		assert.equal(request.owner, 'rogueplayer');
		c.room.coopState.session.adventure.tradeProposal = null;
		c.room.coopBusy = false;
		c.room.receiveCoopNotice({tradeCompleted: {id: 'trade-animation-1', offeredPokemon: 'Bulbasaur',
			requestedPokemon: 'Eevee', fee: 2500}});
		assert(c.room.html.includes('rogue-coop-trade-animation'));
		clearTimeout(c.room.coopTradeTimer); c.room.coopTradeTimer = null;
		c.room.$ = oldDollar;
	});
	it('uses Chinese quality names in common blessings and preserves mixed quality', () => {
		const {c} = openLobby();
		for (const [tier, label] of [['silver', '白银'], ['gold', '黄金'], ['prismatic', '棱彩'], ['mixed', '银 · 金 · 彩']]) {
			const html = c.room.renderCoopAdventure({role: 'host', guestName: 'friend', adventure: {
				floor: 1, phase: 'blessing-selection', coopBlessing: {qualityLocked: true,
					round: {tier, remaining: 1, options: []}},
			}});
			assert(html.includes('品质：' + label)); assert(!html.includes('品质：' + tier));
		}
	});
	it('sends the selected owner’s visit for personal evolution scenes', () => {
		const {c} = openLobby();
		c.room.coopState = {userid: 'rogueplayer'};
		c.room.coopState.session = {id: 'scenes', delegatedTo: 'rogueplayer', partnerUserId: 'friend',
			adventure: {coopEvent: {id: 'unioncircle', key: 'my-step', partnerKey: 'friend-step', branchResolved: true}}};
		c.room.coopBusy = false;
		c.room.chooseCoopEvent('friend|circle');
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)).visit, 'friend-step');
		c.room.coopBusy = false; c.room.chooseCoopEvent('circle');
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)).visit, 'my-step');
		c.room.coopBusy = false; c.room.coopState.session.adventure.coopEvent.branchResolved = false;
		c.room.cancelCoopEvent();
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)).visit, 'my-step');
	});
	for (const id of ['duskbreeder', 'kubfumaster', 'repelwave', 'poffinworkshop', 'minicontest', 'sweetdance', 'bandits', 'dice', 'fishing', 'honeymoon', 'honeymoonreturn', 'greninjatraining', 'greninjareturn', 'lostescort', 'evolutiondojo']) {
		it(`sends current shared and personal visits for ${id} without an event-name transport whitelist`, () => {
			const {c} = openLobby();
			const event = {id, key: 'my-step', partnerKey: 'friend-step', branchResolved: false};
			c.room.coopState = {userid: 'rogueplayer', session: {id: 'activities', delegatedTo: 'rogueplayer',
				partnerUserId: 'friend', adventure: {coopEvent: event}}};
			const request = () => JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
			c.room.coopBusy = false; c.room.chooseCoopEvent('accept');
			assert.deepEqual(request(), {action: 'eventchoice', value: 'accept', visit: 'my-step'});
			c.room.coopBusy = false; c.room.cancelCoopEvent();
			assert.deepEqual(request(), {action: 'cancelevent', visit: 'my-step'});
			event.branchResolved = true; c.room.coopBusy = false; c.room.chooseCoopEvent('friend|tap');
			assert.deepEqual(request(), {action: 'eventchoice', owner: 'friend', value: 'tap', visit: 'friend-step'});
		});
	}
	for (const id of ['honeymoon', 'honeymoonreturn']) it(`shows ${id} as one common trip with no extra personal choice step`, () => {
		const {c} = openLobby();
		const event = {id, key: 'trip-visit', stage: 'choice', title: '蜜月旅行', paragraphs: ['夫妇向两人挥手。'],
			branchOptions: [{id: 'region:alola', name: '推荐阿罗拉地区', text: '双方各获一份谢礼。'}], ownChoice: 'region:alola'};
		const session = {id: 'trip-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', canControl: true, delegatedTo: 'rogueplayer',
			adventure: {floor: 80, phase: 'route-interaction', team: [], partnerTeam: [], bag: {}, money: 0,
				selectedRoute: {kind: 'event'}, coopEvent: event}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, action: 'refresh',
			state: {userid: 'rogueplayer', session, players: [], invitations: []}});
		receive(); assert(c.room.html.includes('你的选择：推荐阿罗拉地区；队友选择：尚未选择'));
		Object.assign(event, {stage: 'result', branchResolved: true, ownComplete: true, partnerComplete: true,
			options: [], partnerOptions: [], paragraphs: ['双方收下旅行特产。']});
		receive(); assert(c.room.html.includes('本次事件已完成，可共同继续旅程'));
		assert(!c.room.html.includes('队友的个人步骤')); assert(c.room.html.includes('双方收下旅行特产'));
	});
	it('shows the completed ranger return as shared and leaves full-party placement to the existing admission flow', () => {
		const {c} = openLobby();
		const event = {id: 'greninjareturn', key: 'return-visit', stage: 'result', title: '修行归来',
			paragraphs: ['修行伙伴回到原主人身边，双方收下智蛙 Z。'], branchResolved: true,
			ownComplete: true, partnerComplete: true, options: [], partnerOptions: []};
		const session = {id: 'ranger-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', canControl: true, delegatedTo: 'rogueplayer',
			adventure: {floor: 85, phase: 'route-interaction', team: [], partnerTeam: [], bag: {}, money: 0,
				selectedRoute: {kind: 'event'}, coopEvent: event}};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, action: 'refresh',
			state: {userid: 'rogueplayer', session, players: [], invitations: []}});
		assert(c.room.html.includes('双方收下智蛙 Z')); assert(!c.room.html.includes('队友的个人步骤'));
		assert(c.room.html.includes('本次事件已完成，可共同继续旅程'));
	});
	function rhythmClient() {
		let time = 10000, tick, interval = 0;
		const c = client(true, false, {Date: class extends Date {static now() { return time; }},
			setInterval: fn => { tick = fn; return ++interval; }, clearInterval: () => { tick = null; }});
		c.room.receiveState(state()); c.room.openCoop();
		const event = {id: 'poffinworkshop', key: 'rhythm-step', stage: 'choice', title: '共同活动', paragraphs: [],
			sharedRhythm: true, activity: {kind: 'rhythm', startedAt: 20000, now: 20000, duration: 12000, period: 800, score: 1},
			branchOptions: [{id: 'tap', name: '跟上节拍'}, {id: 'finish', name: '查看成果'}]};
		const session = {id: 'rhythm-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', canControl: true, adventure: {id: 'rhythm-run', floor: 61,
				phase: 'route-interaction', team: [], partnerTeam: [], money: 0, bag: {},
				selectedRoute: {kind: 'event'}, coopEvent: event}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, action: 'refresh',
			state: {userid: 'rogueplayer', session, players: [], invitations: []}});
		receive();
		c.room.$ = selector => ({css: (name, value) => { c.room.controls[selector] = {[name]: value}; },
			text: value => { c.room.controls[selector] = value; }});
		return {c, session, event, receive, advance: ms => {time += ms;}, tick: () => {if (tick) tick();}, active: () => !!tick};
	}
	it('shows a synchronized shared rhythm track and waits for consensus instead of auto-finishing', () => {
		const r = rhythmClient();
		assert(r.c.room.html.includes('共同节拍')); assert(r.c.room.html.includes('rogue-activity-track'));
		r.advance(400); r.tick();
		assert.equal(r.c.room.controls['.rogue-coop-rhythm-own .rogue-activity-beat'].left, '50%');
		assert.equal(r.c.room.controls['.rogue-coop-rhythm-own .rogue-activity-time'], '11.6 秒');
		const requests = r.c.sent.length; r.advance(12000); r.tick();
		assert(r.c.room.controls['.rogue-coop-rhythm-own .rogue-activity-time'].includes('双方确认'));
		assert.equal(r.c.sent.length, requests);
		r.c.room.coopBusy = false; r.c.room.chooseCoopEvent('tap');
		const command = JSON.parse(r.c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.deepEqual(command, {action: 'eventchoice', value: 'tap', visit: 'rhythm-step'});
		assert.equal(command.now, undefined); assert.equal(command.score, undefined);
	});
	it('renders and finishes separately scoped delegated sweet-dance clocks', () => {
		const r = rhythmClient();
		r.session.delegatedTo = 'rogueplayer';
		Object.assign(r.event, {id: 'sweetdance', branchResolved: true, sharedRhythm: false, partnerKey: 'partner-step',
			partnerActivity: {...r.event.activity, startedAt: 19500, now: 20000},
			options: [{id: 'tap', name: '跟上节拍'}, {id: 'finish', name: '查看成果'}],
			partnerOptions: [{id: 'tap', name: '跟上节拍'}, {id: 'finish', name: '查看成果'}]});
		r.receive(); assert(r.c.room.html.includes('rogue-coop-rhythm-partner')); assert(r.c.room.html.includes('friend|tap'));
		r.advance(11600); r.tick();
		const request = () => JSON.parse(r.c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.deepEqual(request(), {action: 'eventchoice', owner: 'friend', value: 'finish', visit: 'partner-step'});
		r.c.room.coopBusy = false; r.advance(400); r.tick();
		assert.deepEqual(request(), {action: 'eventchoice', owner: 'rogueplayer', value: 'finish', visit: 'rhythm-step'});
	});
	it('stops the co-op timer after leaving the screen, pausing or finishing the activity', () => {
		const r = rhythmClient(); assert(r.active());
		r.c.room.screen = 'home'; r.tick(); assert(!r.active());
		r.c.room.screen = 'coop'; r.session.status = 'paused'; r.c.room.startActivityClock(); assert(!r.active());
		r.session.status = 'active'; r.event.stage = 'result'; r.event.activity = undefined;
		r.c.room.startActivityClock(); assert(!r.active());
		r.c.room.coopState.session = null; assert.equal(r.c.room.coopActivityClocks().length, 0);
	});
	it('shows each co-op owner training reward and capped candy refund without interpreting reward text as HTML', () => {
		const {c} = openLobby();
		c.room.coopState = {userid: 'rogueplayer'};
		const session = {id: 'candy-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			status: 'active', difficulty: 0, adventure: {id: 'candy-run', floor: 181, phase: 'settlement',
				team: [], partnerTeam: [], battleResult: {won: true,
					reward: {money: 0, items: {}, effect: '本局双攻、双防各 +0.27%'},
					partnerReward: {money: 0, items: {}, effect: '上限保留为糖果 <img src=x>'}},
				lastReward: {floor: 181, name: '战利品', money: 0, items: {}, effect: '本局双攻、双防各 +0.27%'}}};
		let html = c.room.renderCoopAdventure(session);
		assert(html.includes('你的战利品：本局双攻、双防各 +0.27%'));
		assert(html.includes('队友的战利品：上限保留为糖果 &lt;img src=x'));
		assert(!html.includes('<img src=x>'));
		session.adventure.phase = 'area-selection'; session.adventure.routeChoices = [];
		html = c.room.renderCoopAdventure(session);
		assert(html.includes('本局双攻、双防各 +0.27%'));
	});
	it('shows route-vote withdrawal and the separate shared-reward and trade-route interactions', () => {
		const {c} = openLobby();
		const session = {id: 'session-routes', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			difficulty: 0, status: 'active', starterSelection: ['bulbasaur'], partnerStarterSelection: ['eevee']};
		const baseAdventure = {
			id: 'adventure-routes', floor: 3, phase: 'area-selection', difficulty: 0, doubleBattle: true,
			routeChoices: [
				{id: 'supplies', name: '旅途补给', kind: 'reward', available: true},
				{id: 'event', name: '路途见闻', kind: 'event', available: false},
			], areaSelection: 'supplies', partnerAreaSelection: 'event',
			team: [], partnerTeam: [], battleSelection: [], partnerBattleSelection: [], money: 100,
		};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {...session, adventure: baseAdventure}}});
		assert(c.room.html.includes('撤回我的预选'));
		assert(c.room.html.includes('随机事件'));
		c.room.cancelCoopArea();
		let request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'cancelarea');
		const rewardAdventure = {...baseAdventure, phase: 'route-interaction', selectedRoute: {id: 'supplies', name: '旅途补给', kind: 'reward'},
			lastReward: {floor: 3, name: '旅途补给', money: 50, items: {revive: 1}},
			routeExitSelection: false, partnerRouteExitSelection: true};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {...session, adventure: rewardAdventure}}});
		assert(c.room.html.includes('补给已分别放入双方背包和钱包'));
		assert(c.room.html.includes('队友已确认'));
		c.room.finishCoopRoute();
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'finishroute');
		const tradeAdventure = {...rewardAdventure, selectedRoute: {id: 'shop', name: '薄荷商店', kind: 'trade'},
			money: 125, shopItems: [{id: 'pokeball', name: '精灵球', kind: 'ball', price: 25, remaining: 1, description: '精灵球'}]};
		c.room.coopBusy = false;
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {...session, adventure: tradeAdventure}}});
		assert(c.room.html.includes('摊位库存由双方共用'));
		assert(c.room.html.includes('购买 1 件'));
	});
	it('renders shared training branches, private target steps, and submits complete EV allocations', () => {
		const {c} = openLobby();
		const session = {id: 'session-event', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			difficulty: 0, status: 'active', starterSelection: ['bulbasaur'], partnerStarterSelection: ['eevee']};
		const adventure = {
			id: 'adventure-event', floor: 24, phase: 'route-interaction', difficulty: 0, doubleBattle: true,
			selectedRoute: {id: 'event', name: '训练事件', kind: 'event'}, team: [], partnerTeam: [],
			battleSelection: [], partnerBattleSelection: [], money: 1000, bag: {}, routeExitSelection: false,
			partnerRouteExitSelection: false, coopEvent: {id: 'martial', title: '训练事件',
				paragraphs: ['两人先共同决定训练方向。'], branchResolved: false,
				branchOptions: [{id: 'skill', name: '技巧训练', text: '免费重配一次已有努力值。', disabled: false},
					{id: 'power', name: '挑战武学家', text: '获胜后全队各得努力值奖励。', disabled: false},
					{id: 'leave', name: '离开', disabled: false}],
				options: [], ownChoice: 'skill', partnerChoice: 'leave', ownComplete: false, partnerComplete: false},
		};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {...session, adventure}}});
		assert(c.room.html.includes('双方需选择相同分支'));
		assert(c.room.html.includes('训练事件'));
		assert(c.room.html.includes('你的选择：技巧训练；队友选择：离开'));
		assert(c.room.html.includes('获胜后全队各得努力值奖励。'));
		c.room.chooseCoopEvent('skill');
		let request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'eventchoice'); assert.equal(request.value, 'skill');
		c.room.coopBusy = false;
		const targetAdventure = {...adventure, coopEvent: {...adventure.coopEvent, branchResolved: true,
			options: [{id: 'member:own-bulbasaur', name: 'Bulbasaur', disabled: false}],
			ownChoice: 'skill', partnerChoice: 'skill'}};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {...session, adventure: targetAdventure}}});
		assert(c.room.html.includes('member:own-bulbasaur'));
		c.room.chooseCoopEvent('member:own-bulbasaur');
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.value, 'member:own-bulbasaur');
		c.room.coopBusy = false;
		const allocateAdventure = {...targetAdventure, coopEvent: {...targetAdventure.coopEvent,
			options: [{id: 'allocate', name: '确认分配', disabled: false}, {id: 'back', name: '返回', disabled: false}],
			evAllocation: {species: 'Bulbasaur', total: 4, current: {hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
				minimum: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}}}};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {...session, adventure: allocateAdventure}}});
		assert(c.room.html.includes('name="coopEventEfforthp"'));
		const oldDollar = c.room.$;
		c.room.$ = selector => ({val: () => selector.includes('hp') ? '0' : selector.includes('atk') ? '4' : '0'});
		c.room.allocateCoopEventEffort();
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'eventchoice'); assert.equal(request.value, 'allocate');
		assert.deepEqual(request.evs, {hp: 0, atk: 4, def: 0, spa: 0, spd: 0, spe: 0});
		c.room.$ = oldDollar;
	});
	it('shows both forest teams and sends a shared vote only after the current replay finishes', () => {
		const {c} = openLobby();
		const event = {id: 'forest', key: 'shared-forest', title: '斗蛐蛐！', stage: 'choice',
			paragraphs: [], teams: [[{species: 'Bulbasaur', level: 28}], [{species: 'Pikachu', level: 28}]],
			branchResolved: false, branchOptions: [{id: 'left', name: '声援左边', disabled: false}],
			ownComplete: false, partnerComplete: false};
		const session = {id: 'forest-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			difficulty: 0, status: 'active', adventure: {id: 'forest-run', floor: 56, phase: 'route-interaction',
				team: [], partnerTeam: [], money: 100, bag: {}, battleSelection: [], partnerBattleSelection: [],
				selectedRoute: {kind: 'event', name: '斗蛐蛐！'}, coopEvent: event}};
		const update = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true,
			state: {userid: 'rogueplayer', players: [], invitations: [], session}});
		update();
		assert(c.room.html.includes('左边的队伍')); assert(c.room.html.includes('右边的队伍'));
		assert(c.room.html.includes('Lv.28'));
		event.stage = 'watch'; event.replay = ['|start', '|win|左边的队伍']; event.support = 0;
		event.branchOptions = [{id: 'watched', name: '观战结束，查看结果', disabled: false}]; update();
		assert(c.room.html.includes('name="watchCoopEvent"')); assert(c.room.html.includes('双方观看同一场对战'));
		c.room.watchCoopEvent();
		assert.equal(c.app.lastPopup.type, c.RogueEventReplayPopup); assert.equal(c.app.lastPopup.data.cooperative, true);
		assert.deepEqual(c.app.lastPopup.data.event.replay, event.replay);
		const popup = Object.create(c.RogueEventReplayPopup);
		popup.cooperative = true; popup.owner = c.room; popup.eventKey = event.key; popup.userid = 'rogueplayer';
		popup.battle = {ended: false, atQueueEnd: false}; popup.close = () => {};
		c.sent.length = 0;
		popup.finishEvent(); assert.equal(c.sent.length, 0);
		popup.battle.ended = true; popup.battle.atQueueEnd = true;
		event.key = 'different-event'; popup.finishEvent(); assert.equal(c.sent.length, 0);
		event.key = 'shared-forest'; popup.finishEvent();
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'eventchoice'); assert.equal(request.value, 'watched');
	});
	it('does not let a stale or delegated-away co-op replay settle a solo event', () => {
		const {c} = openLobby(), event = {key: 'replay-key', stage: 'watch'};
		c.room.state = {run: {event}};
		c.room.coopState = {userid: 'rogueplayer', session: {delegatedTo: 'friend', adventure: {coopEvent: event}}};
		const popup = Object.create(c.RogueEventReplayPopup);
		popup.cooperative = true; popup.owner = c.room; popup.eventKey = event.key; popup.userid = 'rogueplayer';
		popup.battle = {ended: true, atQueueEnd: true}; popup.close = () => {};
		c.sent.length = 0; popup.finishEvent(); assert.equal(c.sent.length, 0);
		c.room.coopState.session = null; popup.finishEvent(); assert.equal(c.sent.length, 0);
		popup.userid = 'another-account'; popup.finishEvent(); assert.equal(c.sent.length, 0);
	});
	it('previews individual co-op regional conversions and animates only a new successful exchange', () => {
		const {c} = openLobby();
		const preview = {before: 'Vulpix', after: 'Vulpix-Alola', types: ['Ice'], ability: 'Snow Cloak',
			stats: {hp: 60, atk: 30, def: 30, spa: 30, spd: 30, spe: 30}, hp: 20, maxhp: 60,
			removed: ['ember'], added: ['powdersnow'], equipped: ['quickattack']};
		const event = {id: 'travel', key: 'travel-key', stage: 'choice', branchResolved: true, preview,
			paragraphs: [], options: [{id: 'confirm', name: '同意交换。', disabled: false}], partnerOptions: [],
			ownComplete: false, partnerComplete: false};
		const session = {id: 'travel-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			difficulty: 0, status: 'active', partnerUserId: 'friend', adventure: {id: 'travel-run', floor: 56,
				phase: 'route-interaction', team: [], partnerTeam: [], money: 100, bag: {},
				battleSelection: [], partnerBattleSelection: [], selectedRoute: {kind: 'event', name: '旅行'}, coopEvent: event}};
		const update = (action = 'refresh', ok = true) => c.room.receiveCoop({userid: 'rogueplayer', action, ok,
			state: JSON.parse(JSON.stringify({userid: 'rogueplayer', players: [], invitations: [], session}))});
		update(); assert(c.room.html.includes('Vulpix → Vulpix-Alola'));
		assert(c.room.html.includes('移除不合法招式：ember'));
		assert(c.room.html.includes('变化后 HP：20 / 60')); assert(!c.app.lastPopup);
		delete event.preview; event.exchange = {before: 'Vulpix', after: 'Vulpix-Alola', member: 'host-mon'};
		update('eventchoice'); assert.equal(c.app.lastPopup.type, c.RogueExchangeAnimationPopup);
		assert.equal(c.app.lastPopup.data.exchange.member, 'host-mon');
		c.app.lastPopup = null; update('eventchoice'); assert.equal(c.app.lastPopup, null);
		update('refresh'); assert.equal(c.app.lastPopup, null);
		session.delegatedTo = 'rogueplayer'; event.partnerPreview = preview;
		event.partnerOptions = [{id: 'confirm', name: '同意交换。', disabled: false}]; update();
		assert(c.room.html.includes('队友的个人步骤')); assert(c.room.html.includes('value="friend|confirm"'));
		event.partnerExchange = {before: 'Vulpix', after: 'Vulpix-Alola', member: 'guest-mon'};
		update('eventchoice'); assert.equal(c.app.lastPopup.data.exchange.member, 'guest-mon');
		c.app.lastPopup = null; event.partnerExchange = {before: 'Vulpix', after: 'Vulpix-Alola', member: 'wrong'};
		update('eventchoice', false); assert.equal(c.app.lastPopup, null);
	});
	it('renders co-op level-up choices in safe nonbattle phases without falling through to progression', () => {
		const {c} = openLobby();
		const pending = {member: 'own-mon', species: 'Bulbasaur', move: 'leechseed', moveName: 'Leech Seed',
			moves: [{id: 'tackle', name: 'Tackle'}]};
		const session = {id: 'learning', role: 'host', status: 'active', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', canControl: true, adventure: {id: 'learning-run', floor: 9, team: [], partnerTeam: [],
				money: 1000, bag: {}, pendingMove: pending, selectedRoute: {kind: 'rest', name: '休整中心'}}};
		for (const phase of ['area-selection', 'battle-selection', 'route-interaction', 'blessing-selection', 'blessing-reward']) {
			session.adventure.phase = phase;
			c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', players: [], invitations: [], session}});
			assert(c.room.html.includes('共同冒险 · 待学习招式'));
			assert(c.room.html.includes('value="rogueplayer|own-mon|0|leechseed"'));
			assert(!/name="(?:finishCoopRoute|selectCoopArea|confirmCoopBattle|chooseCoopBlessing)"/.test(c.room.html));
		}
		c.room.coopLearnMove('rogueplayer|own-mon|0|leechseed');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'learn'); assert.equal(request.member, 'own-mon'); assert.equal(request.value, '0');
		assert.equal(request.move, 'leechseed');
	});
	it('waits for partner learning and shows partner choices only to the delegated controller', () => {
		const {c} = openLobby();
		const session = {id: 'learning', role: 'host', status: 'active', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', canControl: true, adventure: {id: 'learning-run', floor: 9, phase: 'route-interaction',
				team: [], partnerTeam: [], money: 1000, bag: {}, selectedRoute: {kind: 'rest', name: '休整中心'},
				partnerPendingMove: {member: 'guest-mon', species: 'Bulbasaur', move: 'leechseed', moveName: 'Leech Seed',
					moves: [{id: 'tackle', name: 'Tackle'}]}}};
		const update = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true,
			state: {userid: 'rogueplayer', players: [], invitations: [], session}});
		update(); assert(c.room.html.includes('队友正在处理升级招式')); assert(!c.room.html.includes('name="coopLearnMove"'));
		session.delegatedTo = 'rogueplayer'; update();
		assert(c.room.html.includes('队友的伙伴')); assert(c.room.html.includes('value="friend|guest-mon|skip|leechseed"'));
		c.room.coopLearnMove('friend|guest-mon|skip|leechseed');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.owner, 'friend'); assert.equal(request.member, 'guest-mon'); assert.equal(request.value, 'skip');
		session.delegatedTo = null; update(); assert(!c.room.html.includes('value="friend|guest-mon|skip|leechseed"'));
		session.adventure.partnerPendingMove = null; update(); assert(c.room.html.includes('name="finishCoopRoute"'));
	});
	it('opens a co-op camp against the correct wallet and rejects stale or revoked popup confirmation', () => {
		const {c} = openLobby();
		const quote = {visit: 'camp-visit', money: 1000, offers: [{id: 'junior', name: '助理训练员', amount: 300, price: 150, remaining: 1}],
			locked: '', members: [{id: 'own-mon', set: {species: 'Bulbasaur', level: 20}}]};
		const session = {id: 'camp-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			difficulty: 0, status: 'active', partnerUserId: 'friend', adventure: {id: 'camp-run', floor: 61,
				phase: 'route-interaction', team: [], partnerTeam: [], money: 1000, bag: {},
				battleSelection: [], partnerBattleSelection: [], selectedRoute: {kind: 'trade', name: '训练营'}, trainingCamp: quote}};
		const update = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true,
			state: {userid: 'rogueplayer', players: [], invitations: [], session}});
		update(); assert(c.room.html.includes('各有一次集训机会')); assert(c.room.html.includes('name="openCoopCamp"'));
		c.room.openCoopCamp('rogueplayer'); assert.equal(c.app.lastPopup.type, c.RogueTrainingCampPopup);
		const data = c.app.lastPopup.data, popup = Object.create(c.RogueTrainingCampPopup);
		popup.room = c.room; popup.coop = data.coop; popup.requestId = 'camp-test-request'; popup.close = () => {};
		popup.selection = () => ({value: 'junior', trainingMembers: ['own-mon'], trainingStats: ['spe']});
		c.sent.length = 0; popup.confirmTraining();
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'buygrowth'); assert.equal(request.owner, 'rogueplayer');
		assert.equal(request.visit, quote.visit); assert.equal(request.id, 'camp-test-request');
		assert.deepEqual(request.trainingStats, ['spe']); c.room.coopBusy = false;
		c.sent.length = 0; quote.visit = 'another-camp'; popup.confirmTraining(); assert.equal(c.sent.length, 0);
		quote.visit = 'camp-visit'; session.delegatedTo = 'friend'; popup.confirmTraining(); assert.equal(c.sent.length, 0);
		delete session.delegatedTo; session.adventure = null; popup.confirmTraining(); assert.equal(c.sent.length, 0);
		c.room.coopState = null; popup.confirmTraining(); assert.equal(c.sent.length, 0);
	});
	it('renders the delegated partner camp separately without accessing a paused solo run', () => {
		const {c} = openLobby();
		const makeQuote = (id, money) => ({visit: 'shared-visit', money, locked: '',
			offers: [{id: 'junior', name: '助理训练员', amount: 300, price: 150, remaining: 1}],
			members: [{id, set: {species: 'Bulbasaur', level: 20}}]});
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', players: [], invitations: [], session: {
			id: 'camp-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend', partnerUserId: 'friend',
			difficulty: 0, status: 'active', delegatedTo: 'rogueplayer', adventure: {id: 'camp-run', floor: 61,
				phase: 'route-interaction', team: [], partnerTeam: [], money: 1000, bag: {}, battleSelection: [], partnerBattleSelection: [],
				selectedRoute: {kind: 'trade', name: '训练营'}, trainingCamp: makeQuote('own-mon', 1000), partnerTrainingCamp: makeQuote('other-mon', 500),
			}}}});
		assert(c.room.html.includes('friend的训练')); assert(c.room.html.includes('value="friend"'));
		c.room.openCoopCamp('friend'); assert.equal(c.app.lastPopup.data.camp.money, 500);
		assert.equal(c.app.lastPopup.data.coop.owner, 'friend');
		c.app.lastPopup = null; c.room.coopState.session.delegatedTo = null;
		c.room.openCoopCamp('friend'); assert.equal(c.app.lastPopup, null);
	});
	function recyclingLobby() {
		const {c} = openLobby();
		const quote = {quote: 'recycle-quote', fullPrice: true, money: 1000, locked: '',
			items: [{id: 'potion', name: '伤药', price: 100, count: 3}, {id: 'tinymushroom', name: '小蘑菇', price: 150, count: 5}]};
		const session = {id: 'recycle-session', role: 'host', status: 'active', canControl: true,
			hostName: 'rogueplayer', guestName: 'friend', partnerUserId: 'friend', difficulty: 0,
			adventure: {id: 'recycle-run', floor: 81, phase: 'route-interaction', team: [], partnerTeam: [], bag: {}, money: 1000,
				selectedRoute: {id: 'buyback', kind: 'trade', name: '原价回收站'}, recycling: quote}};
		const update = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true,
			state: {userid: 'rogueplayer', players: [], invitations: [], session}});
		update();
		return {c, session, quote, update};
	}
	function recyclingPopup(c, selection) {
		c.room.openCoopRecycling(selection);
		assert.equal(c.app.lastPopup.type, c.RogueCoopRecyclePopup);
		const popup = Object.create(c.RogueCoopRecyclePopup); popup.count = '1'; popup.controls = {};
		popup.$el = {addClass() {}, html: value => { popup.html = value; }};
		popup.$ = selector => ({val: () => popup.count, text: value => { popup.controls[selector] = value; },
			prop: (name, value) => { popup.controls[selector] = {[name]: value}; }});
		popup.close = () => { popup.closed = true; };
		popup.initialize(c.app.lastPopup.data); return popup;
	}
	it('shows personal buyback inventory and confirms a bounded quantity with its original quote', () => {
		const {c} = recyclingLobby();
		assert(c.room.html.includes('物品原价回收')); assert(c.room.html.includes('钱包余额：1000'));
		assert(!c.room.html.includes('摊位商品已售完'));
		const popup = recyclingPopup(c, 'rogueplayer|potion');
		assert(popup.html.includes('从我的背包扣除')); assert(popup.html.includes('max="3"'));
		popup.count = '2'; popup.updatePrice(); assert.equal(popup.controls['.rogue-recycle-preview'], '将获得 200 金币。');
		for (const invalid of ['0', '4', '1.5']) {
			popup.count = invalid; popup.updatePrice(); assert(popup.controls['button[name=confirm]'].disabled);
			c.sent.length = 0; popup.confirm(); assert.equal(c.sent.length, 0);
		}
		popup.count = '2'; popup.confirm();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'sell'); assert.equal(request.owner, 'rogueplayer'); assert.equal(request.count, 2);
		assert.equal(request.value, 'potion'); assert.equal(request.quote, 'recycle-quote'); assert.equal(request.confirmed, true);
		assert.equal(request.id, popup.requestId); assert(popup.closed);
	});
	it('confirms the complete reviewed inventory and rejects stale, revoked or cross-session recycle dialogs', () => {
		const {c, session, quote, update} = recyclingLobby();
		session.delegatedTo = 'rogueplayer'; session.adventure.partnerRecycling = {...quote, quote: 'partner-quote', money: 500}; update();
		assert(c.room.html.includes('队友的背包')); assert(c.room.html.includes('钱包余额：500'));
		let popup = recyclingPopup(c, 'friend|all');
		assert(!popup.html.includes('name="recycleCount"')); assert(popup.html.includes('以上全部库存'));
		assert.equal(popup.controls['.rogue-recycle-preview'], '将获得 1050 金币。');
		popup.confirm(); let request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.owner, 'friend'); assert.equal(request.value, 'all'); assert.equal(request.count, undefined);
		assert.equal(request.quote, 'partner-quote');
		for (const change of [
			() => { c.room.coopState.session.delegatedTo = null; },
			() => { c.room.coopState.session.adventure.partnerRecycling.quote = 'changed'; },
			() => { c.room.coopState.session.id = 'other-session'; },
			() => { c.room.coopState.session.adventure.id = 'other-run'; },
			() => { c.room.coopState.session.adventure.phase = 'battle'; },
			() => { c.setUser('someoneelse'); },
		]) {
			c.setUser('rogueplayer'); update(); c.room.coopBusy = false;
			popup = recyclingPopup(c, 'friend|all'); c.sent.length = 0;
			change(); popup.confirm(); assert.equal(c.sent.length, 0); assert(popup.closed);
		}
	});
	it('does not expose partner selling controls without delegation and renders ordinary treasure exchange', () => {
		const {c, session, quote, update} = recyclingLobby();
		session.adventure.partnerRecycling = {...quote};
		session.adventure.recycling.fullPrice = false; session.adventure.selectedRoute.kind = 'rest'; update();
		assert(c.room.html.includes('战利品兑换')); assert(!c.room.html.includes('队友的背包'));
		c.app.lastPopup = null; c.room.openCoopRecycling('friend|all'); assert.equal(c.app.lastPopup, null);
		quote.locked = '请先处理待学招式'; update();
		c.room.openCoopRecycling('rogueplayer|all'); assert.equal(c.app.lastPopup, null);
	});
	it('shows the shared collector dialogue before recycling and sends its current visit with votes and cancellations', () => {
		const {c, session, update} = recyclingLobby();
		c.translations.Amoonguss = '败露球菇';
		const choice = 'show:friend:fungus';
		session.adventure.selectedRoute = {id: 'collector', kind: 'trade', name: '蘑菇收藏家'};
		session.adventure.coopEvent = {id: 'mushroomcollector', key: 'collector-visit', title: '蘑菇收藏家',
			branchResolved: false, ownComplete: false, partnerComplete: false, ownChoice: choice, partnerChoice: 'collectorshop',
			branchOptions: [{id: choice, name: '展示 2P 的 Amoonguss', pokemon: 'Amoonguss', seat: 2,
				text: '双方各获得一份观察谢礼', disabled: false}, {id: 'collectorshop', name: '看看蘑菇的回收价', disabled: false}]};
		delete session.adventure.recycling; update();
		assert(c.room.html.includes('展示 2P 的 败露球菇')); assert(c.room.html.includes('双方需选择相同分支'));
		assert(!c.room.html.includes('Amoonguss')); assert(!c.room.html.includes('name="openCoopRecycling"'));
		assert(!c.room.html.includes('摊位商品已售完'));
		assert(/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
		c.room.chooseCoopEvent(choice);
		let request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'eventchoice'); assert.equal(request.value, choice); assert.equal(request.visit, 'collector-visit');
		c.room.coopBusy = false; c.room.cancelCoopEvent();
		request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'cancelevent'); assert.equal(request.visit, 'collector-visit');
	});
	it('keeps completed collector dialogue with personal premium quotations and a normal quantity confirmation', () => {
		const {c, session, quote, update} = recyclingLobby();
		session.adventure.selectedRoute = {id: 'collector', kind: 'trade', name: '蘑菇收藏家'};
		session.adventure.coopEvent = {id: 'mushroomcollector', key: 'collector-visit', stage: 'result',
			branchResolved: true, ownComplete: true, partnerComplete: true, paragraphs: ['双方各得到一份观察谢礼。'], options: []};
		Object.assign(quote, {fullPrice: false, mushroomPremium: true, items: [{id: 'tinymushroom', name: '小蘑菇', price: 187, count: 5}]});
		session.adventure.lastReward = {floor: 81, name: '蘑菇收藏家', money: 100, items: {tinymushroom: 3}};
		update(); assert(c.room.html.includes('蘑菇加价回收')); assert(c.room.html.includes('125%'));
		assert(c.room.html.includes('每件 187 金币')); assert(c.room.html.includes('金币分别入账'));
		assert(!/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
		const popup = recyclingPopup(c, 'rogueplayer|tinymushroom');
		popup.count = '2'; popup.updatePrice(); assert.equal(popup.controls['.rogue-recycle-preview'], '将获得 374 金币。');
		popup.confirm(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'sell'); assert.equal(request.owner, 'rogueplayer'); assert.equal(request.count, 2);
		assert.equal(request.quote, 'recycle-quote');
	});
	for (const eventId of ['stones', 'feathers']) it(`shows ${eventId} ownership and sends the latest step on votes and cancellation`, () => {
		const {c, session, update} = recyclingLobby();
		delete session.adventure.recycling;
		c.translations.Pidgeot = '大比鸟';
		session.adventure.selectedRoute = {id: 'collection', kind: 'event', name: '共同事件'};
		const purchase = eventId === 'stones' ? 'stone:friend:5' : 'feathertrade:friend';
		const event = session.adventure.coopEvent = {id: eventId, key: 'collection-step', title: '共同事件',
			branchResolved: false, ownComplete: false, partnerComplete: false, ownChoice: purchase, partnerChoice: null,
			branchOptions: [{id: purchase, name: '2P · 购买', text: '仅 2P 支付并获得购买的物品。', disabled: false},
				{id: 'unaffordable', name: '1P · 购买', disabled: true},
				{id: 'show:friend:bird', name: '展示 2P 的 Pidgeot', pokemon: 'Pidgeot', seat: 2, disabled: false}]};
		update();
		assert(c.room.html.includes('展示 2P 的 大比鸟')); assert(!c.room.html.includes('Pidgeot'));
		assert(c.room.html.includes('仅 2P 支付')); assert(c.room.html.includes('双方需选择相同分支'));
		assert(/name="chooseCoopEvent"[^>]*value="unaffordable"[^>]*disabled/.test(c.room.html));
		assert(/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
		session.delegatedTo = 'rogueplayer'; update(); c.room.chooseCoopEvent(purchase);
		let command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(command.value, purchase); assert.equal(command.visit, 'collection-step'); assert.equal(command.owner, undefined);
		event.key = 'collection-next'; c.room.coopBusy = false; update(); c.room.cancelCoopEvent();
		command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(command.action, 'cancelevent'); assert.equal(command.visit, 'collection-next');
		Object.assign(event, {branchResolved: true, ownComplete: true, partnerComplete: true, branchOptions: [], options: []});
		c.room.coopBusy = false; update();
		assert(c.room.html.includes('本次事件已完成')); assert(!c.room.html.includes('队友的个人步骤'));
		assert(!/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
	});
	for (const eventId of ['pokeflute', 'dittoshow', 'blackjack', 'grassegg', 'hatchhouse', 'fossillab', 'snacks', 'identityquiz', 'relicpuzzle']) it(`keeps ${eventId} shared on each step and sends its current visit`, () => {
		const {c, session, update} = recyclingLobby();
		delete session.adventure.recycling;
		session.adventure.selectedRoute = {id: 'activity', kind: 'event', name: '共同事件'};
		const event = session.adventure.coopEvent = {id: eventId, key: 'step-one', title: '共同事件',
			branchResolved: false, ownComplete: false, partnerComplete: false, ownChoice: 'listen', partnerChoice: null,
			paragraphs: ['双方看到同一条线索。'], branchOptions: [{id: 'listen', name: '仔细聆听', disabled: false}]};
		update(); assert(c.room.html.includes('双方看到同一条线索')); assert(c.room.html.includes('双方需选择相同分支'));
		assert(/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
		c.room.chooseCoopEvent('listen');
		let command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(command.visit, 'step-one'); assert.equal(command.value, 'listen');
		event.key = 'step-two'; c.room.coopBusy = false; update(); c.room.cancelCoopEvent();
		command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(command.action, 'cancelevent'); assert.equal(command.visit, 'step-two');
		session.delegatedTo = 'rogueplayer';
		Object.assign(event, {branchResolved: true, ownComplete: true, partnerComplete: true, branchOptions: [], options: []});
		c.room.coopBusy = false; update();
		assert(c.room.html.includes('本次事件已完成')); assert(!c.room.html.includes('队友的个人步骤'));
		assert(!/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
	});
	it('renders the shared quiz silhouette and localizes answers and selected votes', () => {
		const {c, session, update} = recyclingLobby();
		delete session.adventure.recycling;
		Object.assign(c.translations, {Bulbasaur: '妙蛙种子', Charmander: '小火龙'});
		session.adventure.selectedRoute = {id: 'quiz', kind: 'event', name: '我是谁？'};
		session.adventure.coopEvent = {id: 'identityquiz', key: 'quiz-name', title: '我是谁？',
			branchResolved: false, stage: 'choice', silhouette: 'Bulbasaur',
			ownChoice: 'answer:0', partnerChoice: 'answer:1', paragraphs: ['共同回答同一道剪影题。'],
			branchOptions: [{id: 'answer:0', name: 'Bulbasaur'}, {id: 'answer:1', name: 'Charmander'}]};
		update();
		assert(c.room.html.includes('rogue-quiz-silhouette')); assert(c.room.html.includes('aria-label="宝可梦剪影"'));
		assert(c.room.html.includes('你的选择：妙蛙种子；队友选择：小火龙'));
		assert(/value="answer:0"[^>]*>妙蛙种子</.test(c.room.html));
		delete session.adventure.coopEvent.silhouette; update();
		assert(!c.room.html.includes('rogue-quiz-silhouette'));
	});
	it('shows localized fossil recipes and snack recipients without confusing them with an observation', () => {
		const {c, session, update} = recyclingLobby();
		delete session.adventure.recycling;
		Object.assign(c.translations, {Omanyte: '菊石兽', helixfossil: '贝壳化石', Bulbasaur: '妙蛙种子'});
		session.adventure.selectedRoute = {id: 'lab', kind: 'event', name: '化石研究所'};
		session.adventure.coopEvent = {id: 'fossillab', key: 'lab-visit', title: '化石研究所', branchResolved: false,
			ownChoice: 'restore:friend:helixfossil', branchOptions: [{id: 'restore:friend:helixfossil', seat: 2,
				service: 'fossil', pokemon: 'Omanyte', items: ['helixfossil'], text: '仅 2P 交付化石并接纳伙伴。'}]};
		update(); assert(c.room.html.includes('2P · 贝壳化石 ×1 → 复活 菊石兽'));
		assert(!c.room.html.includes('展示 2P')); assert(!c.room.html.includes('Omanyte'));
		Object.assign(session.adventure.coopEvent, {id: 'snacks', title: '粗点心战争', ownChoice: 'snackmon:friend:mon',
			branchOptions: [{id: 'snackmon:friend:mon', seat: 2, service: 'snack', pokemon: 'Bulbasaur', price: 290,
				text: '仅 2P 支付，效果与回礼归该玩家。', disabled: true}]});
		update(); assert(c.room.html.includes('2P · 给【妙蛙种子】点心 · 290 金币'));
		assert(!c.room.html.includes('展示 2P')); assert(!c.room.html.includes('Bulbasaur'));
		assert(/name="chooseCoopEvent"[^>]*value="snackmon:friend:mon"[^>]*disabled/.test(c.room.html));
	});
	it('shows egg admission and both delegated egg rosters without levels or battle availability', () => {
		const {c, session, update} = recyclingLobby();
		delete session.adventure.recycling;
		session.delegatedTo = 'rogueplayer';
		const egg = {id: 'own-egg', species: 'Egg', hp: 0, maxhp: 0, level: 1, egg: {found: 12, hatch: 18}, remainingFloors: 6};
		Object.assign(session.adventure, {phase: 'blessing-reward', team: [egg], partnerTeam: [{...egg, id: 'friend-egg'}],
			coopBlessing: {ownPending: [{id: 'egg-gift', kind: 'gift', title: '草丛里的宝可梦蛋',
				pokemon: {set: {species: 'Egg', level: 1}, egg: egg.egg, remainingFloors: 6}}], partnerPending: []}});
		update(); assert(c.room.html.includes('距孵化 6 层')); assert(c.room.html.includes('放弃这颗蛋'));
		assert(c.room.html.includes('不能出战或使用道具')); assert(!c.room.html.includes('Lv.1'));
		c.room.chooseCoopBlessingReward('egg-gift|join');
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(command.action, 'blessingreward'); assert.equal(command.member, 'egg-gift'); assert.equal(command.value, 'join');
		Object.assign(session.adventure, {phase: 'battle-selection', coopBlessing: null, battleSelection: [], partnerBattleSelection: []});
		c.room.coopBusy = false; update();
		assert(c.room.html.includes('暂不能出战')); assert(!c.room.html.includes('Lv.1')); assert(!c.room.html.includes('HP 0/0'));
		for (const id of ['own-egg', 'friend-egg']) assert(new RegExp('name="coopBattleMon"[^>]*value="' + id + '"[^>]*disabled').test(c.room.html));
	});
	function auctionLobby() {
		const {c, session, update} = recyclingLobby();
		delete session.adventure.recycling;
		session.adventure.selectedRoute = {id: 'auction', kind: 'trade', name: '落槌之前'};
		session.adventure.coopEvent = {id: 'auction', key: 'auction-step', title: '落槌之前', stage: 'choice',
			branchResolved: false, ownComplete: false, partnerComplete: false, ownChoice: 'bid:rogueplayer', partnerChoice: 'bid:friend',
			paragraphs: ['当前最高价：0 金币（尚未出价）。'], auction: {catalog: '1. 【Light Ball】；2. 【Leftovers】',
				npcs: [{name: '行商', budget: 6500}], wallets: [{name: '1P', budget: 1000}, {name: '2P', budget: 5000}]},
			branchOptions: [{id: 'bid:rogueplayer', name: '1P · 加价到 3000 金币。', disabled: true},
				{id: 'bid:friend', name: '2P · 加价到 3000 金币。', text: '仅 2P 付款并获得拍品。', disabled: false},
				{id: 'pass', name: '放弃这件，看看下一件。', disabled: false}]};
		update(); return {c, session, update};
	}
	it('shows a shared auction on the trade route with separate wallets and explicitly named payer choices', () => {
		const {c} = auctionLobby();
		assert(c.room.html.includes('rogue-auction-board')); assert(c.room.html.includes('本场拍品'));
		assert(c.room.html.includes('1P 钱包')); assert(c.room.html.includes('2P 钱包')); assert(c.room.html.includes('5000'));
		assert(c.room.html.includes('仅得标玩家付款并获得拍品')); assert(c.room.html.includes('队友的钱包不扣费'));
		assert(c.room.html.includes('你的选择：1P')); assert(c.room.html.includes('队友选择：2P'));
		assert(/name="chooseCoopEvent"[^>]*value="bid:rogueplayer"[^>]*disabled/.test(c.room.html));
		assert(!/name="chooseCoopEvent"[^>]*value="bid:friend"[^>]*disabled/.test(c.room.html));
		assert(/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
		assert(!c.room.html.includes('摊位商品已售完')); assert(!c.room.html.includes('name="openCoopRecycling"'));
		c.room.chooseCoopEvent('bid:friend');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'eventchoice'); assert.equal(request.value, 'bid:friend'); assert.equal(request.visit, 'auction-step');
		assert.equal(request.owner, undefined);
	});
	it('sends the latest auction step on cancellation and preserves the real buyer in delegated controls', () => {
		const {c, session, update} = auctionLobby();
		session.delegatedTo = 'rogueplayer'; update();
		c.room.chooseCoopEvent('bid:friend'); let request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.value, 'bid:friend'); assert.equal(request.owner, undefined);
		session.adventure.coopEvent.key = 'auction-next-step'; update();
		c.room.cancelCoopEvent(); request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'cancelevent'); assert.equal(request.visit, 'auction-next-step');
		session.delegatedTo = 'friend'; session.canControl = false; update();
		assert(/name="chooseCoopEvent"[^>]*value="bid:friend"[^>]*disabled/.test(c.room.html));
		c.sent.length = 0; c.room.chooseCoopEvent('bid:friend'); assert.equal(c.sent.length, 0);
	});
	it('keeps auction winners visible after settlement and allows joint departure without extra personal steps', () => {
		const {c, session, update} = auctionLobby(); session.delegatedTo = 'rogueplayer';
		Object.assign(session.adventure.coopEvent, {stage: 'result', branchResolved: true,
			ownComplete: true, partnerComplete: true, branchOptions: [], options: [],
			paragraphs: ['「成交！」2P花费 3000 金币，拍得【Light Ball】。']});
		session.adventure.coopEvent.auction.catalog = '1. 【Light Ball】（2P 已拍得）'; update();
		assert(c.room.html.includes('2P 已拍得')); assert(c.room.html.includes('按实际得标人分别结算'));
		assert(!c.room.html.includes('队友的个人步骤')); assert(!c.room.html.includes('name="chooseCoopEvent"'));
		assert(!/name="finishCoopRoute"[^>]*disabled/.test(c.room.html));
	});
	it('returns won or lost co-op event battles to the event and does not show a retry loop', () => {
		const {c} = openLobby();
		for (const won of [true, false]) {
			c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
				players: [], invitations: [], session: {id: 'event-battle', role: 'host', hostName: 'rogueplayer',
					guestName: 'friend', difficulty: 0, status: 'active', adventure: {
						id: 'shared-event', floor: 24, phase: 'settlement', team: [], partnerTeam: [], money: 100,
						bag: {}, battleSelection: [], partnerBattleSelection: [], battleResult: {won, eventResolved: true},
					}}}});
			assert(c.room.html.includes('返回共同事件'));
			assert(c.room.html.includes('继续处理奖励或后续分支'));
			assert(!c.room.html.includes('name="retryCoopBattle"'));
			c.room.coopState.session.adventure.battleResult.memoryRestored = true;
			c.room.render(); assert(c.room.html.includes('双方已恢复各自战前的队伍与背包'));
			c.room.continueCoopBattle();
			const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
			assert.equal(request.action, 'continuebattle');
			c.room.coopBusy = false;
		}
	});
	it('localizes Fantasy tutor move choices for both delegated owners and preserves the target owner', () => {
		const c = client(true, true);
		c.room.receiveState(state()); c.room.openCoop();
		const option = {id: 'fantasymove:huanshenbu', name: 'Huan Shen Bu', text: '10 幻想碎片', disabled: false};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session: {id: 'tutor-session', role: 'host', status: 'active',
				hostName: 'rogueplayer', guestName: 'friend', partnerUserId: 'friend', delegatedTo: 'rogueplayer',
				difficulty: 0, adventure: {id: 'tutor-adventure', floor: 81, phase: 'route-interaction',
					team: [], partnerTeam: [], battleSelection: [], partnerBattleSelection: [], money: 100, bag: {},
					selectedRoute: {id: 'event', kind: 'event', name: '幻想招式教学'}, coopEvent: {
						id: 'fantasytutor', title: '幻想招式教学', branchResolved: true, options: [],
						picker: {options: [option]}, partnerPicker: {options: [option]},
						paragraphs: ['【Mewtwo-Fantasy】学会了【Huan Shen Bu】！<img src=x onerror=alert(1)>'],
					}}}}});
		assert(c.room.html.includes('幻身步'));
		assert(!c.room.html.includes('Huan Shen Bu'));
		assert(!c.room.html.includes('Mewtwo-Fantasy'));
		assert(c.room.html.includes('幻想超梦'));
		assert(c.room.html.includes('&lt;img src=x'));
		assert(!c.room.html.includes('<img src=x'));
		assert(c.room.html.includes('friend|fantasymove:huanshenbu'));
		c.room.chooseCoopEvent('friend|fantasymove:huanshenbu');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.owner, 'friend');
		assert.equal(request.value, 'fantasymove:huanshenbu');
	});
	function coverageClient() {
		const c = client(true, true); c.room.receiveState(state()); c.room.openCoop();
		const training = {remaining: 1, maxMoves: 5, locked: '', members: [{member: 'own-mon', species: 'Bulbasaur',
			moves: ['tackle', 'growl', 'vinewhip', 'leechseed'], memory: ['tackle', 'growl', 'vinewhip', 'leechseed', 'bodyslam'],
			coverage: ['bodyslam']}]};
		const partner = JSON.parse(JSON.stringify(training)); partner.members[0].member = 'friend-mon';
		const session = {id: 'lesson-session', role: 'host', status: 'active', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', delegatedTo: 'rogueplayer', difficulty: 0, adventure: {
				id: 'lesson-run', floor: 60, phase: 'area-selection', team: [], partnerTeam: [],
				battleSelection: [], partnerBattleSelection: [], money: 0, bag: {},
				moveTraining: training, partnerMoveTraining: partner,
			}};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session}});
		return {c, session};
	}
	function coveragePopup(c, selection, learn = true) {
		c.room.coopBusy = false;
		if (learn) c.room.learnCoopCoverage(selection); else c.room.editCoopMove(selection);
		assert.equal(c.app.lastPopup.type, c.RogueCoopMovePopup);
		const popup = Object.create(c.RogueCoopMovePopup);
		popup.$el = {html: html => {popup.html = html;}};
		popup.$ = () => ({val: () => 'bodyslam'}); popup.close = () => {popup.closed = true;};
		popup.initialize(c.app.lastPopup.data); return popup;
	}
	it('shows separate lesson totals and localized move equipment for both controlled players', () => {
		const {c, session} = coverageClient();
		assert(c.room.html.includes('招式与补盲研习（1 次）'));
		assert(c.room.html.includes('rogueplayer|own-mon|4'));
		assert(c.room.html.includes('friend|friend-mon|4'));
		assert(c.room.html.includes('撞击')); assert(!c.room.html.includes('>1. tackle<'));
		const popup = coveragePopup(c, 'friend|friend-mon');
		assert(popup.html.includes('泰山压顶'));
		popup.confirmMove();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.deepEqual(request, {action: 'coverage', owner: 'friend', member: 'friend-mon', value: 'bodyslam'});
		assert(popup.closed);
		session.delegatedTo = undefined; c.room.coopBusy = false; c.room.render();
		assert(!c.room.html.includes('friend|friend-mon|4'));
	});
	it('opens equipment separately from learning and sends the selected slot without spending lessons', () => {
		const {c} = coverageClient(), popup = coveragePopup(c, 'rogueplayer|own-mon|4', false);
		assert(popup.html.includes('PP 不会恢复'));
		popup.confirmMove();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.deepEqual(request, {action: 'setmove', owner: 'rogueplayer', member: 'own-mon', value: 'bodyslam', slot: 4});
	});
	it('does not submit stale teaching or equipment popups after revocation, locks, battle or a new adventure', () => {
		for (const invalidate of [session => {session.delegatedTo = undefined;},
			session => {session.adventure.partnerMoveTraining.locked = '请先处理待学招式。';},
			session => {session.adventure.phase = 'battle';}, session => {session.adventure.id = 'different-run';}]) {
			const {c, session} = coverageClient(), popup = coveragePopup(c, 'friend|friend-mon'), count = c.sent.length;
			invalidate(session); popup.confirmMove();
			assert.equal(c.sent.length, count); assert(popup.closed);
		}
		const {c, session} = coverageClient(), popup = coveragePopup(c, 'rogueplayer|own-mon|0', false), count = c.sent.length;
		session.adventure.moveTraining.members[0].moves[0] = 'bodyslam'; popup.confirmMove();
		assert.equal(c.sent.length, count);
	});
	function inventoryClient() {
		const {c, session} = coverageClient();
		const inventory = {locked: '', suppliesLocked: '', equipment: [
			{id: 'lifeorb', name: 'Life Orb', kind: 'held', count: 1},
			{id: 'rogueemblemice', name: '冰属性转', kind: 'emblem', count: 1}],
			members: [{member: 'own-mon', species: 'Bulbasaur', item: 'leftovers', emblem: 'rogueemblemfire',
				emblemSlot: 0, equipment: ['lifeorb', 'rogueemblemice']}], supplies: [
				{id: 'expcandys', name: '经验糖果 S', kind: 'candy', count: 5, targets: [{member: 'own-mon'}]},
				{id: 'bottlecap', name: '银色王冠', kind: 'crown', count: 2, targets: [{member: 'own-mon', slots: [1, 5]}]},
				{id: 'roguetmbodyslam', name: '招式学习机：Body Slam', kind: 'machine', count: 1, targets: [{member: 'own-mon'}]}]};
		session.adventure.inventory = inventory;
		const partner = JSON.parse(JSON.stringify(inventory));
		partner.members[0].member = 'friend-mon';
		partner.supplies.forEach(item => {item.targets[0].member = 'friend-mon';});
		session.adventure.partnerInventory = partner; c.room.render();
		return {c, session};
	}
	function itemPopup(c, selection, action = 'use', controls = {}) {
		c.room.coopBusy = false;
		if (action === 'use') c.room.useCoopSupply(selection); else c.room.equipCoopItem(selection);
		assert.equal(c.app.lastPopup.type, c.RogueCoopItemPopup);
		const popup = Object.create(c.RogueCoopItemPopup);
		popup.$el = {html: html => {popup.html = html;}};
		popup.$ = selector => ({val: () => controls[selector]}); popup.close = () => {popup.closed = true;};
		popup.initialize(c.app.lastPopup.data); return popup;
	}
	function universalClient(kind = 'mega') {
		const {c, session} = inventoryClient();
		const value = kind === 'mega' ? 'rogueuniversalmegastone' : kind === 'gmega' ? 'rogueuniversalwishingstar' : 'rogueuniversalpsychicz';
		for (const key of ['inventory', 'partnerInventory']) {
			const mon = session.adventure[key].members[0]; mon.species = 'Mew';
			mon.universalOptions = [{id: value, name: '万用道具', kind, eligible: true,
				points: kind === 'mega' ? 100 : kind === 'gmega' ? 60 : 50,
				cap: kind === 'mega' ? 30 : kind === 'gmega' ? 40 : 20, hp: kind === 'gmega' ? 40 : 0,
				baseStats: {atk: 100, def: 100, spa: 100, spd: 100, spe: 100}}];
		}
		c.room.render(); return {c, session, value};
	}
	function fantasyClient() {
		const {c, session} = inventoryClient();
		for (const key of ['inventory', 'partnerInventory']) {
			const inventory = session.adventure[key], mon = inventory.members[0];
			inventory.fantasyShards = 100; mon.species = 'Urshifu'; mon.fantasyReady = true;
			mon.fantasyOptions = [
				{species: 'Urshifu-Fantasy', signature: 'dianshanxunji', replacements: [{from: 'wickedblow', to: 'dianshanxunji'}],
					removed: ['darkpulse'], lostMoves: ['wickedblow', 'darkpulse']},
				{species: 'Urshifu-2-Fantasy', signature: 'cunjinbengji', replacements: [{from: 'wickedblow', to: 'cunjinbengji'}],
					removed: ['darkpulse'], lostMoves: ['wickedblow', 'darkpulse']}];
		}
		c.room.render(); return {c, session};
	}
	function formClient() {
		const {c, session} = inventoryClient();
		for (const key of ['inventory', 'partnerInventory']) {
			const mon = session.adventure[key].members[0]; mon.species = 'Kyurem';
			mon.formOptions = [{id: 'dnasplicers:donor-mon', item: 'dnasplicers', itemName: '基因之楔', species: 'Kyurem-White',
				donor: 'donor-mon', donorSpecies: 'Reshiram', ready: true, reason: '', consumed: false}];
		}
		c.room.render(); return {c, session};
	}
	function formPopup(c, owner = 'friend', option = 'dnasplicers:donor-mon') {
		c.room.coopBusy = false;
		c.room.changeCoopForm([owner, owner === 'friend' ? 'friend-mon' : 'own-mon', option].join('|'));
		assert.equal(c.app.lastPopup.type, c.RogueCoopFormPopup);
		const popup = Object.create(c.RogueCoopFormPopup);
		popup.$el = {html: html => {popup.html = html;}}; popup.$ = () => ({text: text => {popup.status = text;}});
		popup.close = () => {popup.closed = true;}; popup.initialize(c.app.lastPopup.data); return popup;
	}
	it('confirms a co-op form item with its owner, fusion donor and reusable-item behavior before sending once', () => {
		const {c} = formClient(), popup = formPopup(c), count = c.sent.length;
		assert(c.room.html.includes('基因之楔')); assert(popup.html.includes('道具可以再次使用'));
		assert(popup.html.includes('暂时并入合体')); assert(popup.html.includes('同属该玩家'));
		assert.equal(c.sent.length, count); popup.confirmForm();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'forme'); assert.equal(request.owner, 'friend'); assert.equal(request.member, 'friend-mon');
		assert.equal(request.value, 'dnasplicers:donor-mon'); assert(request.id.startsWith('forme-')); assert(popup.closed);
		popup.confirmForm(); assert.equal(c.sent.length, count + 1);
	});
	it('describes consumed form items and returning fusion members without applying either optimistically', () => {
		const {c, session} = formClient(), mon = session.adventure.inventory.members[0];
		mon.species = 'Oricorio'; mon.formOptions = [{id: 'yellownectar:oricoriopompom', item: 'yellownectar',
			itemName: '金黄色花蜜', species: 'Oricorio-Pom-Pom', ready: true, consumed: true}];
		let popup = formPopup(c, 'rogueplayer', mon.formOptions[0].id);
		assert(popup.html.includes('消耗 1 个')); assert.equal(mon.species, 'Oricorio');
		mon.species = 'Kyurem-White'; mon.formOptions = [{id: 'separate', item: 'dnasplicers', itemName: '基因之楔',
			species: 'Kyurem', returningSpecies: 'Reshiram', ready: true, consumed: false}];
		popup = formPopup(c, 'rogueplayer', 'separate'); assert(popup.html.includes('将回到该玩家的队伍'));
		assert.equal(mon.species, 'Kyurem-White');
	});
	it('revalidates form conditions, party capacity, adventure and control when confirming an old popup', () => {
		for (const invalidate of [s => {s.delegatedTo = undefined;}, s => {s.adventure.phase = 'battle';},
			s => {s.adventure.id = 'other';}, s => {s.adventure.partnerInventory.suppliesLocked = '连续战斗';},
			s => {s.adventure.partnerInventory.members[0].formOptions[0].ready = false;},
			s => {s.adventure.partnerInventory.members[0].formOptions = [];},
			s => {s.adventure.partnerInventory.members[0].species = 'Kyurem-Black';},
			s => {s.adventure.partnerInventory.members[0].formOptions[0].donor = 'other-donor';}]) {
			const {c, session} = formClient(), popup = formPopup(c), count = c.sent.length;
			invalidate(session); popup.confirmForm(); assert.equal(c.sent.length, count); assert(popup.status.includes('已变化'));
		}
	});
	function fantasyPopup(c, owner = 'friend') {
		c.room.coopBusy = false;
		c.room.fantasizeCoopMember(owner + '|' + (owner === 'friend' ? 'friend-mon' : 'own-mon'));
		assert.equal(c.app.lastPopup.type, c.RogueCoopFantasyPopup);
		const popup = Object.create(c.RogueCoopFantasyPopup);
		popup.$el = {html: html => {popup.html = html;}}; popup.close = () => {popup.closed = true;};
		popup.initialize(c.app.lastPopup.data); return popup;
	}
	it('chooses a co-op Fantasy branch before showing and explicitly confirming the actual move losses', () => {
		const {c} = fantasyClient(), count = c.sent.length, popup = fantasyPopup(c);
		assert(c.room.html.includes('幻想碎片：100')); assert(c.room.html.includes('幻想化 · 100 幻想碎片'));
		assert(popup.html.includes('chooseFantasyBranch')); assert(!popup.html.includes('name="confirmFantasy"'));
		popup.confirmFantasy(); assert.equal(c.sent.length, count);
		popup.chooseFantasyBranch('Urshifu-2-Fantasy');
		assert(popup.html.includes('确认变更并幻想化')); assert(popup.html.includes('保留已消耗 PP'));
		assert(popup.html.includes('暗冥强击')); assert(popup.html.includes('寸劲崩击')); assert(popup.html.includes('恶之波动'));
		assert.equal(c.sent.length, count); popup.chooseFantasyBranch(''); assert(!popup.html.includes('name="confirmFantasy"'));
		popup.chooseFantasyBranch('Urshifu-Fantasy'); popup.confirmFantasy();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'fantasize'); assert.equal(request.value, 'Urshifu-Fantasy');
		assert.equal(request.owner, 'friend'); assert.equal(request.member, 'friend-mon');
		assert.equal(request.confirmed, true); assert(request.id.startsWith('fantasize-')); assert(popup.closed);
		popup.confirmFantasy(); assert.equal(c.sent.length, count + 1);
	});
	it('still asks for confirmation when a Fantasy form has no alternate branch or known move replacements', () => {
		const {c, session} = fantasyClient(), mon = session.adventure.inventory.members[0];
		mon.species = 'Primarina'; mon.fantasyOptions = [{species: 'Primarina-Fantasy', replacements: [], removed: [], lostMoves: []}];
		const count = c.sent.length, popup = fantasyPopup(c, 'rogueplayer');
		assert(!popup.html.includes('name="chooseFantasyBranch"')); assert(popup.html.includes('name="confirmFantasy"'));
		assert.equal(c.sent.length, count); popup.confirmFantasy();
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)).value, 'Primarina-Fantasy');
	});
	it('blocks stale Fantasy confirmation after new move losses, insufficient shards, changed party or revoked control', () => {
		for (const invalidate of [s => {s.delegatedTo = undefined;}, s => {s.adventure.phase = 'battle';},
			s => {s.adventure.id = 'other';}, s => {s.adventure.partnerInventory.suppliesLocked = '连续战斗';},
			s => {s.adventure.partnerInventory.fantasyShards = 99;},
			s => {s.adventure.partnerInventory.members[0].fantasyReady = false;},
			s => {s.adventure.partnerInventory.members[0].species = 'Pikachu';},
			s => {s.adventure.partnerInventory.members[0].fantasyOptions[0].lostMoves.push('fakeout');}]) {
			const {c, session} = fantasyClient(), popup = fantasyPopup(c), count = c.sent.length;
			popup.chooseFantasyBranch('Urshifu-Fantasy'); invalidate(session); popup.confirmFantasy();
			assert.equal(c.sent.length, count); assert(popup.html.includes('已变化'));
		}
	});
	function universalPopup(c, owner, value) {
		c.room.coopBusy = false;
		c.room.configureCoopUniversal(owner + '|' + (owner === 'friend' ? 'friend-mon' : 'own-mon') + '|' + value);
		assert.equal(c.app.lastPopup.type, c.RogueCoopUniversalPopup);
		const popup = Object.create(c.RogueCoopUniversalPopup), controls = new Map();
		for (const stat of ['atk', 'def', 'spa', 'spd', 'spe']) controls.set('input[name=universal-' + stat + ']', 0);
		popup.$el = {html: html => {popup.html = html;}};
		popup.$ = selector => ({
			val(value) { if (value !== undefined) controls.set(selector, value); return controls.get(selector); },
			prop(key, value) { if (value !== undefined) controls.set(selector + ':' + key, value); return controls.get(selector + ':' + key); },
			text(value) { controls.set(selector, value); },
		});
		popup.close = () => {popup.closed = true;}; popup.initialize(c.app.lastPopup.data);
		return {popup, controls};
	}
	it('uses the shared manual allocation form for all three co-op items without editable HP or automatic allocation', () => {
		for (const kind of ['mega', 'gmega', 'z']) {
			const {c, value, session} = universalClient(kind), {popup, controls} = universalPopup(c, 'friend', value);
			const option = session.adventure.partnerInventory.members[0].universalOptions[0];
			assert(c.room.html.includes('万用道具 · 分配种族点'));
			assert(popup.html.includes('非 HP 共 ' + option.points)); assert(popup.html.includes('max="' + option.cap + '"'));
			assert(popup.html.includes('HP 种族值固定 +' + option.hp)); assert(!popup.html.includes('name="universal-hp"'));
			const count = c.sent.length; popup.applyUniversal(); assert.equal(c.sent.length, count); assert(!popup.closed);
			const values = kind === 'mega' ? {atk: 30, def: 30, spa: 20, spd: 20, spe: 0} :
				kind === 'gmega' ? {atk: 20, def: 10, spa: 10, spd: 10, spe: 10} : {atk: 20, def: 20, spa: 10, spd: 0, spe: 0};
			for (const [stat, n] of Object.entries(values)) controls.set('input[name=universal-' + stat + ']', n);
			controls.set('select[name=universalAura]', 'def'); popup.updateUniversalAllocation();
			assert.equal(controls.get('.rogue-universal-remaining'), '剩余可分配：0 点');
			assert.equal(controls.get('.rogue-universal-final-atk'), 100 + values.atk);
			popup.applyUniversal(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
			assert.equal(request.action, 'configureuniversal'); assert.equal(request.owner, 'friend');
			assert.equal(request.member, 'friend-mon'); assert.equal(request.value, value);
			assert.deepEqual(request.evs, {hp: option.hp, ...values}); assert(popup.closed);
			popup.applyUniversal(); assert.equal(c.sent.length, count + 1);
		}
		assert.equal(client().RogueCoopUniversalPopup.events['input .rogue-universal-allocation input'], 'updateUniversalAllocation');
	});
	it('blocks noninteger, excessive and incomplete co-op allocations and requires a tied highest final aura', () => {
		const {c, value} = universalClient('z'), {popup, controls} = universalPopup(c, 'rogueplayer', value), count = c.sent.length;
		for (const [stat, n] of Object.entries({atk: 20, def: 20, spa: 10, spd: 0, spe: 0})) controls.set('input[name=universal-' + stat + ']', n);
		popup.applyUniversal(); assert.equal(c.sent.length, count);
		controls.set('select[name=universalAura]', 'spe'); popup.applyUniversal(); assert.equal(c.sent.length, count);
		controls.set('select[name=universalAura]', 'def');
		for (const n of [21, 19.5, 19]) {
			controls.set('input[name=universal-atk]', n); popup.applyUniversal(); assert.equal(c.sent.length, count);
		}
		controls.set('input[name=universal-atk]', 20); popup.applyUniversal();
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)).aura, 'def');
	});
	it('invalidates old allocation forms when authority, adventure, inventory or base stats change', () => {
		for (const invalidate of [s => {s.delegatedTo = undefined;}, s => {s.adventure.phase = 'battle';},
			s => {s.adventure.id = 'other';}, s => {s.adventure.partnerInventory.suppliesLocked = '连续战斗';},
			s => {s.adventure.partnerInventory.members[0].universalOptions = [];},
			s => {s.adventure.partnerInventory.members[0].species = 'Pikachu';},
			s => {s.adventure.partnerInventory.members[0].item = 'lifeorb';},
			s => {s.adventure.partnerInventory.members[0].universalOptions[0].baseStats.atk++;}]) {
			const {c, session, value} = universalClient(), {popup, controls} = universalPopup(c, 'friend', value), count = c.sent.length;
			for (const [stat, n] of Object.entries({atk: 30, def: 30, spa: 20, spd: 20, spe: 0})) controls.set('input[name=universal-' + stat + ']', n);
			invalidate(session); popup.applyUniversal(); assert.equal(c.sent.length, count);
			assert(controls.get('.rogue-coop-universal-status').includes('已变化'));
		}
	});
	it('shows each owner’s usable supplies and submits a single receipt with a chosen candy count', () => {
		const {c} = inventoryClient();
		assert(c.room.html.includes('我的背包 · 成长补给与装备'));
		assert(c.room.html.includes('队友的背包 · 成长补给与装备'));
		assert(c.room.html.includes('泰山压顶')); assert(!c.room.html.includes('Body Slam'));
		const popup = itemPopup(c, 'friend|friend-mon|expcandys', 'use', {'input[name=coopItemCount]': '3'});
		assert(popup.html.includes('max="5"'));
		popup.confirmItem(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'use'); assert.equal(request.owner, 'friend'); assert.equal(request.member, 'friend-mon');
		assert.equal(request.value, 'expcandys'); assert.equal(request.count, 3); assert(request.id.startsWith('supply-'));
		assert.equal(request.slot, undefined);
		const count = c.sent.length; popup.confirmItem(); assert.equal(c.sent.length, count);
	});
	it('keeps crown stat choice, held equipment and emblem slots on their distinct commands', () => {
		const {c} = inventoryClient();
		let popup = itemPopup(c, 'rogueplayer|own-mon|bottlecap', 'use', {'select[name=coopItemSlot]': '5'});
		assert(popup.html.includes('value="5">速度'));
		assert(!popup.html.includes('value="0">HP'));
		popup.confirmItem(); let request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.slot, 5); assert.equal(request.count, 1);
		popup = itemPopup(c, 'rogueplayer|own-mon|equip', 'equip', {'select[name=coopEquipment]': 'lifeorb'});
		assert(popup.html.includes('value="leftovers" selected'));
		assert(!popup.html.includes('value="rogueemblemice"'));
		popup.confirmItem(); request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'equip'); assert.equal(request.value, 'lifeorb');
		popup = itemPopup(c, 'friend|friend-mon|equipemblem', 'equipemblem', {
			'select[name=coopEquipment]': 'rogueemblemice', 'select[name=coopItemSlot]': '1'});
		assert(popup.html.includes('value="0" selected>第一属性'));
		popup.confirmItem(); request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'equipemblem'); assert.equal(request.owner, 'friend'); assert.equal(request.slot, 1);
	});
	it('rejects stale supply popups on lost delegation, changing target, battle or continuous healing lock', () => {
		for (const invalidate of [session => {session.delegatedTo = undefined;},
			session => {session.adventure.partnerInventory.suppliesLocked = '连续战斗';},
			session => {session.adventure.partnerInventory.supplies[0].targets = [];},
			session => {session.adventure.phase = 'battle';}]) {
			const {c, session} = inventoryClient(), popup = itemPopup(c, 'friend|friend-mon|expcandys'), count = c.sent.length;
			invalidate(session); popup.confirmItem(); assert.equal(c.sent.length, count); assert(popup.closed);
		}
		const {c, session} = inventoryClient(), popup = itemPopup(c, 'rogueplayer|own-mon|equip', 'equip'), count = c.sent.length;
		session.adventure.inventory.members[0].item = 'lifeorb'; popup.confirmItem(); assert.equal(c.sent.length, count);
	});
	function evolutionClient() {
		const {c, session} = inventoryClient();
		for (const key of ['inventory', 'partnerInventory']) {
			const mon = session.adventure[key].members[0];
			mon.shiny = true; mon.gender = 'F';
			mon.evolutions = [{species: 'Ivysaur', ready: true,
				requirements: [{text: '等级达到 Lv.16', met: true}]}];
		}
		session.adventure.team = [{id: 'own-mon', species: 'Bulbasaur', shiny: true, gender: 'F'}];
		session.adventure.partnerTeam = [{id: 'friend-mon', species: 'Bulbasaur', shiny: true, gender: 'F'}];
		c.room.render(); return {c, session};
	}
	function evolvePopup(c, selection = 'rogueplayer|own-mon|ivysaur') {
		c.room.evolveCoopMember(selection); assert.equal(c.app.lastPopup.type, c.RogueCoopEvolutionPopup);
		const popup = Object.create(c.RogueCoopEvolutionPopup);
		popup.$el = {html: html => {popup.html = html;}};
		popup.close = () => {popup.closed = true;}; popup.initialize(c.app.lastPopup.data); return popup;
	}
	it('confirms co-op evolution with explicit conditions and plays the native animation only after saved success', () => {
		const {c, session} = evolutionClient();
		assert(c.room.html.includes('进化为 妙蛙草'));
		const popup = evolvePopup(c);
		assert(popup.html.includes('进化后无法退回原形态')); assert(popup.html.includes('等级达到 Lv.16'));
		const count = c.sent.length; assert.equal(c.room.coopEvolutionIntent, undefined);
		popup.confirmEvolution(); assert.equal(c.sent.length, count + 1);
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.action, 'evolve'); assert.equal(request.value, 'ivysaur'); assert.equal(request.owner, 'rogueplayer');
		assert.equal(c.app.lastPopup.type, c.RogueCoopEvolutionPopup);
		session.adventure.team[0].species = 'Ivysaur';
		session.adventure.inventory.locked = '请先处理待学招式。'; session.adventure.inventory.members = [];
		c.room.receiveCoop({userid: 'rogueplayer', action: 'evolve', ok: true,
			state: {...c.room.coopState, session}});
		assert.equal(c.app.lastPopup.type, c.RogueEvolutionAnimationPopup);
		assert.equal(c.app.lastPopup.data.before.species, 'Bulbasaur'); assert.equal(c.app.lastPopup.data.after.species, 'Ivysaur');
		assert.equal(c.app.lastPopup.data.after.shiny, true); assert.equal(c.app.lastPopup.data.after.gender, 'F');
		assert.equal(c.room.coopEvolutionIntent, null);
		const animation = Object.create(c.RogueEvolutionAnimationPopup), text = {};
		animation.$el = {addClass() {}, html: html => {animation.html = html;}};
		animation.$ = selector => ({text: value => {text[selector] = value;}, html: value => {text[selector] = value;}});
		animation.initialize(c.app.lastPopup.data); animation.finishAnimation();
		assert(text['.rogue-evolution-actions'].includes('返回联机队伍'));
		assert(!text['.rogue-evolution-actions'].includes('continueEvolution'));
		animation.remove(); assert(animation.removed);
	});
	it('supports delegated evolution but refuses old confirmations after consent or conditions change', () => {
		for (const invalidate of [session => {session.delegatedTo = undefined;},
			session => {session.adventure.partnerInventory.members[0].evolutions[0].ready = false;},
			session => {session.adventure.phase = 'battle';}, session => {session.adventure.id = 'new-adventure';}]) {
			const {c, session} = evolutionClient(), popup = evolvePopup(c, 'friend|friend-mon|ivysaur'), count = c.sent.length;
			invalidate(session); popup.confirmEvolution(); assert.equal(c.sent.length, count); assert(popup.closed);
		}
		const {c} = evolutionClient(), popup = evolvePopup(c, 'friend|friend-mon|ivysaur');
		popup.confirmEvolution(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(request.owner, 'friend'); assert.equal(request.member, 'friend-mon');
	});
	it('does not animate failed or unrelated evolution acknowledgements and clears intents on identity changes', () => {
		for (const ok of [false, true]) {
			const {c} = evolutionClient(), popup = evolvePopup(c); popup.confirmEvolution();
			c.room.receiveCoop({userid: 'rogueplayer', action: 'evolve', ok, message: '进化条件已变化', state: c.room.coopState});
			assert.equal(c.app.lastPopup.type, c.RogueCoopEvolutionPopup); assert.equal(c.room.coopEvolutionIntent, null);
		}
		const {c} = evolutionClient(), popup = evolvePopup(c); popup.confirmEvolution();
		c.room.identityChanged(); assert.equal(c.room.coopEvolutionIntent, null);
	});
	it('shows each co-op player their own blessing-adjusted battle loot and the partner copy', () => {
		const {c} = openLobby();
		const session = {id: 'session-loot', role: 'guest', hostName: 'friend', guestName: 'rogueplayer',
			partnerUserId: 'friend', difficulty: 0, status: 'active', starterSelection: ['bulbasaur'],
			partnerStarterSelection: ['eevee'], adventure: {
				id: 'adventure-loot', floor: 1, phase: 'settlement', difficulty: 0, doubleBattle: true,
				team: [], partnerTeam: [], battleSelection: [], partnerBattleSelection: [], money: 0, bag: {},
			battleResult: {won: true, reward: {money: 0, items: {pokeball: 6}},
				partnerReward: {money: 0, items: {pokeball: 5}}},
			},
		};
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session}});
		assert(c.room.html.includes('你的战利品：pokeball ×5'));
		assert(c.room.html.includes('队友的战利品：pokeball ×6'));
		session.role = 'host';
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 1,
			players: [], invitations: [], session}});
		assert(c.room.html.includes('你的战利品：pokeball ×6'));
		assert(c.room.html.includes('队友的战利品：pokeball ×5'));
	});
	it('shows shared recovery consent for a missing battle and a separate saved-result action', () => {
		const {c} = openLobby();
		const session = {id: 'checkpoint-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', difficulty: 0,
			battleRecovery: {available: true, turn: 4, selections: {friend: true}, message: '原房间已中断，可以恢复。'},
			adventure: {floor: 12, phase: 'battle', team: [], partnerTeam: [], bag: {}, money: 100}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 0, players: [], invitations: [], session}});
		receive();
		assert(c.room.html.includes('已保存到第 4 回合')); assert(c.room.html.includes('队友已确认'));
		assert(c.room.html.includes('确认恢复原战斗'));
		c.room.recoverCoopBattle();
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"recoverbattle"}');
		session.battleRecovery.selections.rogueplayer = true;
		receive(); assert(/name="recoverCoopBattle"[^>]*disabled/.test(c.room.html));
		session.battleRecovery.final = true;
		receive(); assert(c.room.html.includes('读取已保存的结算'));
		assert(!/name="recoverCoopBattle"[^>]*disabled/.test(c.room.html));
		session.battleRecovery.available = false;
		session.battleRecovery.message = '内容版本已变化，状态仍保留。';
		receive(); assert(c.room.html.includes('内容版本已变化'));
		assert(!c.room.html.includes('name="recoverCoopBattle"'));
	});
	it('offers continuation for a paused shared adventure only when the partner is online', () => {
		const {c} = openLobby();
		const session = {id: 'paused-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'paused', difficulty: 0, partnerOnline: false};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 0, players: [], invitations: [], session}});
		receive(); assert(/name="resumeCoop"[^>]*disabled/.test(c.room.html));
		session.delegatedTo = 'friend'; receive(); assert(c.room.html.includes('撤销操作权移交'));
		session.partnerOnline = true;
		receive(); assert(!/name="resumeCoop"[^>]*disabled/.test(c.room.html));
		c.room.resumeCoop(session.id);
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"resume","id":"paused-session"}');
	});
	it('offers same-floor recovery for a legacy secret route and sends only scoped shared consent', () => {
		const {c} = openLobby();
		const session = {id: 'secret-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', difficulty: 0,
			storyRecovery: {key: 'old-secret-scope', available: true, selections: {}, message: '联机不进入主线剧情。'},
			adventure: {phase: 'route-interaction', floor: 12, team: [], partnerTeam: [], bag: {}, money: 0}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 0, players: [], invitations: [], session}});
		receive(); assert(c.room.html.includes('共同返回同层普通区域')); assert(c.room.html.includes('不发放秘闻节点奖励'));
		c.room.recoverCoopRoute('accept');
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"recoverroute","id":"old-secret-scope","accept":true}');
		session.storyRecovery.selections.rogueplayer = true; receive();
		assert(c.room.html.includes('撤回恢复确认'));
		c.room.recoverCoopRoute('cancel');
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"recoverroute","id":"old-secret-scope","accept":false}');
		session.storyRecovery.available = false; session.storyRecovery.selections = {};
		session.storyRecovery.message = '旧对局缺少可信检查点。'; receive();
		assert(!c.room.html.includes('name="recoverCoopRoute"')); assert(c.room.html.includes('共同结束本局'));
	});
	it('shows shared exit consequences and scopes confirmations to the current proposal', () => {
		const {c} = openLobby();
		const session = {id: 'exit-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', difficulty: 0,
			adventure: {phase: 'battle', floor: 5, team: [], partnerTeam: [], bag: {}, money: 0}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 0, players: [], invitations: [], session}});
		receive(); assert(c.room.html.includes('共同结束本局')); assert(c.room.html.includes('共同撤退到场外'));
		c.room.proposeCoopExit('abandon');
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"proposeexit","value":"abandon"}');
		session.exitProposal = {id: 'shared-exit-1', proposer: 'friend', kind: 'abandon'};
		receive(); assert(c.room.html.includes('本次联机进度结束，需要重新开局'));
		assert(!/name="respondCoopExit" value="accept"[^>]*disabled/.test(c.room.html));
		c.room.respondCoopExit('accept');
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"respondexit","id":"shared-exit-1","value":"accept"}');
		session.exitProposal.proposer = 'rogueplayer'; receive();
		assert(/name="respondCoopExit" value="accept"[^>]*disabled/.test(c.room.html));
		session.exitProposal.confirmed = true; receive(); assert(c.room.html.includes('完成已确认的退出'));
		const notices = []; c.room.notifyOnce = (...args) => notices.push(args);
		c.room.screen = 'home'; c.room.receiveCoopNotice({exitChanged: true, exitRequest: 'abandon'});
		assert.equal(c.room.screen, 'coop'); assert.equal(notices[0][2], 'coopexit');
	});
	it('renders personal recovery targets, explicit emergency prices, and delegated wallet ownership', () => {
		const {c} = openLobby();
		const session = {id: 'recover-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', partnerOnline: false, status: 'active', difficulty: 0,
			adventure: {id: 'recovery', floor: 12, phase: 'settlement', team: [], partnerTeam: [], bag: {}, money: 2000,
				battleResult: {won: false}, recovery: {allFainted: true, money: 2000, cost: 2400, emergency: true, items: []}}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {
			userid: 'rogueplayer', maxDifficulty: 0, players: [], invitations: [], session}});
		receive();
		assert(c.room.html.includes('支付 2400 金币急救'));
		assert(/name="emergencyCoop"[^>]*disabled/.test(c.room.html));
		assert(c.room.html.includes('队友目前离线')); assert(!c.room.html.includes('急救尚未接入'));
		session.delegatedTo = 'rogueplayer';
		session.adventure.partnerRecovery = {allFainted: false, money: 3000, items: [
			{id: 'ether', name: 'PP 单项小补剂', count: 2, targets: [{member: 'ally-1', species: 'Eevee', slot: 0, move: 'tackle', restoredHP: 0}]},
		]};
		receive();
		assert(c.room.html.includes('队友的队伍 · 场外恢复'));
		assert(c.room.html.includes('value="friend|ether|ally-1|0"'));
		c.room.useCoopRecoveryItem('friend|ether|ally-1|0');
		let command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(command.action, 'useitem'); assert.equal(command.owner, 'friend');
		assert.equal(command.slot, 0); assert.equal(command.member, 'ally-1'); assert(command.id.length >= 8);
		const sent = c.sent.length; c.room.useCoopRecoveryItem('friend|ether|ally-1|0'); assert.equal(c.sent.length, sent);
		receive(); c.room.emergencyCoop('rogueplayer');
		command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.equal(command.action, 'emergency'); assert.equal(command.owner, 'rogueplayer'); assert(command.id.length >= 8);
		session.adventure.recovery = null; session.adventure.partnerRecovery = null;
		receive(); assert(!c.room.html.includes('rogue-coop-recovery'));
	});
	it('clears the pending cooperative request on disconnect so reconnect can fetch authoritative progress', () => {
		const {c} = openLobby();
		assert.equal(c.room.coopBusy, true);
		c.room.disconnected(); assert.equal(c.room.coopBusy, false);
		const count = c.sent.length;
		c.room.refresh();
		assert(c.sent.slice(count).includes('/fantasyrogue coop {"action":"refresh"}'));
	});
	it('accepts, declines, cancels, searches, and leaves through the server command route', () => {
		const {c} = openLobby(), commands = [];
		c.room.receiveCoop({userid: 'rogueplayer', ok: true, state: {userid: 'rogueplayer', maxDifficulty: 3,
			players: [], invitations: [], session: null}});
		c.room.coopDifficulty = 2;
		c.room.inviteCoopPlayer('friend');
		commands.push(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)));
		c.room.coopBusy = false; c.room.acceptCoopInvite('invite-1');
		commands.push(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)));
		c.room.coopBusy = false; c.room.declineCoopInvite('invite-2');
		commands.push(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)));
		c.room.coopBusy = false; c.room.cancelCoopInvite('invite-3');
		commands.push(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)));
		c.room.coopBusy = false; c.room.leaveCoop('session-1');
		commands.push(JSON.parse(c.sent.at(-1).slice('/fantasyrogue coop '.length)));
		assert.deepEqual(commands.map(command => command.action), ['invite', 'accept', 'decline', 'cancel', 'leave']);
		assert.equal(commands[0].target, 'friend'); assert.equal(commands[0].difficulty, 2);
		assert.equal(commands[4].id, 'session-1');
	});
});

describe('Fantasy Rogue lake guardian checkpoint display', () => {
	it('shows current type coverage without claiming an early refund or sending an action', () => {
		const c = client(), data = adventure('ready');
		data.run.blessings = {owned: [], pending: [], levels: 5, bossLevels: 10, shards: 0,
			lakeQuest: {version: 1, rounds: [{floor: 50, checkAt: 100, normal: 5, boss: 10,
				types: ['Grass', 'Poison', 'Electric'], matched: ['Grass', 'Poison', 'Electric']}]}};
		c.room.receiveState(data);
		assert(c.html.includes('第 50 层祝福 → 第 100 层入场检查'));
		assert(c.html.includes('当前覆盖 3 / 3 · 等待入场检查'));
		assert(c.html.includes('✓ 草') && c.html.includes('✓ 毒') && c.html.includes('✓ 电'));
		assert(!c.html.includes('已永久回退'));
		assert.equal(c.sent.length, 0);
	});
	it('keeps prior successful refunds distinct from a later failed checkpoint', () => {
		const c = client(), data = adventure('ready');
		data.run.blessings = {owned: [], pending: [], levels: 5, bossLevels: 10, shards: 0,
			lakeQuest: {version: 1, rounds: [
				{floor: 1, checkAt: 50, normal: 2, boss: 5, types: ['Grass', 'Poison', 'Electric'],
					matched: ['Grass', 'Poison', 'Electric'], result: 'reverted'},
				{floor: 50, checkAt: 100, normal: 5, boss: 10, types: ['Fire', 'Ice', 'Water'],
					matched: ['Fire'], result: 'kept'},
			]}};
		c.room.receiveState(data);
		assert(c.html.includes('已永久回退：固定首领 5 级 · 普通遭遇 2 级'));
		assert(c.html.includes('未达标 · 保留本阶段加级：固定首领 10 级 · 普通遭遇 5 级'));
		assert(c.html.includes('后续未达标不会恢复已回退的加级'));
	});
});

describe('Fantasy Rogue permanent starter crates', () => {
	function setup(runtime = {}) {
		const c = client(true, false, runtime), data = state();
		data.configured = true; data.account.points = 1000;
		data.account.crates = {total: 9, legendaryMisses: 18, targetedMisses: 57, points: 100, target: 'type:Water',
			daily: {day: '2026-11-03', submitted: false}};
		c.room.receiveState(data);
		c.room.openCrates();
		const query = {userid: data.userid, enabled: true, revision: 1, growthPoints: 1000,
			ledger: structuredClone(data.account.crates), shinyPerMillion: 2000,
			daily: {day: '2026-11-03', refreshAt: Date.UTC(2026, 10, 3, 16), results: [], teams: [
				['Charizard', 'Snorlax', 'Gengar'], ['Blastoise', 'Dragonite', 'Arcanine'],
				['Venusaur', 'Gyarados', 'Lucario'], ['Tyranitar', 'Gardevoir', 'Scizor'],
			]},
			rules: {cost: 10, exchangeCost: 100, legendaryPerMillion: 1000, shinyTargetPity: 180}, generations: [1, 9], types: ['Water', 'Fire'],
			weekly: {key: '0', refreshAt: Date.UTC(2026, 10, 8, 16), featured: ['mewtwo', 'kyogre'], catalog: [
				{id: 'mewtwo', species: 'Mewtwo', seen: true, owned: false},
				{id: 'kyogre', species: 'Kyogre', seen: true, owned: true},
				{id: 'mew', species: 'Mew', seen: false, owned: false},
			]}};
		c.room.receiveCrates(query);
		return {c, data, query, popup: c.room.cratePopup};
	}
	function publishResults(c, query, day = '2026-11-03') {
		c.room.receiveCrates({...query, daily: {...query.daily, day: '2026-11-04', results: [{
			day, teams: query.daily.teams, winners: [0, 2, 2],
			prediction: {picks: [0, 2, 2], settled: true, reward: 1},
		}]}});
	}
	function actions(c) {
		return c.sent.filter(message => message.startsWith('/fantasyrogue action '))
			.map(message => JSON.parse(message.slice('/fantasyrogue action '.length)));
	}
	function result(data, request, count = 1) {
		const next = structuredClone(data); next.account.revision++; next.account.points -= count * 10;
		Object.assign(next.account.crates, {total: 9 + count, points: 100 + count, lastBatch: {
			id: request.id, source: 'draw', results: Array.from({length: count}, (_, index) => ({
				id: index ? 'popplio' : 'kyogre', species: index ? 'Popplio' : 'Kyogre', legendary: !index,
				shiny: !index, nature: 'Modest', ability: index ? 'Torrent' : 'Drizzle', gender: index ? 'F' : 'N',
				newUnlock: true, guarantee: index ? undefined : 'targetedLegendary',
			})),
		}});
		return next;
	}
	it('opens one native dialog from the growth panel, between starter slots and difficulty', () => {
		const {c, popup} = setup();
		assert(c.panel.html.indexOf('初始栏位') < c.panel.html.indexOf('name="openCrates"'));
		assert(c.panel.html.indexOf('name="openCrates"') < c.panel.html.indexOf('冒险档位'));
		assert.equal(c.sent.filter(message => message === '/cmd fantasyroguecrate').length, 1);
		assert(c.panel.html.includes('抽取新的伙伴！'));
		c.room.openCrates(); assert.equal(c.room.cratePopup, popup); assert.equal(c.app.popups.length, 1);
		assert(popup.html.includes('单次开箱 · 10 点')); assert(popup.html.includes('十连开箱 · 100 点'));
		assert(popup.html.includes('传说保底还需 <b>72</b>')); assert(popup.html.includes('定向传说还需 <b>123</b>'));
	});
	it('replaces a null legacy-server response with an actionable error, then recovers on retry', () => {
		const c = client(true), data = state(); data.configured = true;
		c.room.receiveState(data); c.room.openCrates(); const popup = c.room.cratePopup;
		c.room.receiveCrates(null);
		assert(popup.html.includes('尚未提供开箱资料'));
		assert(!popup.html.includes('正在读取开箱资料'));
		assert.equal(c.room.crateQueryTimer, null);
		popup.drawCrates('1'); assert.equal(actions(c).length, 0);
		popup.refreshCrates(); popup.refreshCrates();
		assert.equal(c.sent.filter(message => message === '/cmd fantasyroguecrate').length, 2);
		const {query} = setup(); c.room.receiveCrates(query);
		assert(!c.room.crateLoadError); assert(popup.html.includes('单次开箱'));
		assert(!popup.html.includes('尚未提供开箱资料'));
	});
	it('times out an unanswered read without spending, and prevents a disconnected retry', () => {
		const timers = [];
		const c = client(true, false, {setTimeout: (fn, delay) => { timers.push({fn, delay}); return timers.length; }});
		c.room.receiveState(state()); c.room.openCrates(); const popup = c.room.cratePopup;
		timers.findLast(timer => timer.delay === 8000).fn();
		assert(popup.html.includes('读取超时')); assert.equal(c.room.crateQueryTimer, null);
		assert.equal(actions(c).length, 0);
		c.app.socket.readyState = 3; popup.refreshCrates();
		assert(popup.html.includes('连接尚未恢复'));
		assert.equal(c.sent.filter(message => message === '/cmd fantasyroguecrate').length, 1);
		c.app.socket.readyState = 1; popup.refreshCrates();
		assert.equal(c.sent.filter(message => message === '/cmd fantasyroguecrate').length, 2);
		assert(popup.html.includes('正在读取开箱资料'));
	});
	it('sends the selected single target once and reveals an acknowledged ten-draw batch', () => {
		const {c, data, popup} = setup();
		popup.changeTarget({currentTarget: {value: 'gen:9'}});
		popup.drawCrates('10'); popup.drawCrates('10'); popup.exchangeCrate('0:kyogre');
		const requests = actions(c); assert.equal(requests.length, 1);
		assert.equal(requests[0].count, 10); assert.equal(requests[0].value, 'gen:9');
		assert.equal(popup.stage, 'waiting'); assert.equal(data.account.points, 1000);
		c.room.receiveAction({userid: data.userid, id: requests[0].id, ok: true, state: result(data, requests[0], 10)});
		assert.equal(popup.stage, 'sealed'); assert.equal(c.room.pending, null); assert.equal(c.room.crateIntent, null);
		assert(popup.html.includes('撕开胶带')); popup.tearCrate(); assert.equal(popup.stage, 'reveal');
		popup.skipCrate(); assert.equal(popup.stage, 'results');
		assert.equal((popup.html.match(/class="rogue-crate-result[" ]/g) || []).length, 10);
		assert(popup.html.includes('rogue-crate-stars')); assert(popup.html.includes('gen5-shiny/Kyogre'));
		assert.equal((popup.html.match(/src="fx\/shine\.png"/g) || []).length, 8);
		assert.equal(c.room.state.account.points, 900); assert.equal(actions(c).length, 1);
	});
	it('offers a separate 180-draw shiny target, preserves its progress and sends only that target', () => {
		const {c, data, popup} = setup();
		data.account.crates.shinyTargetMisses = 37;
		data.account.revision = 2; c.room.receiveState(data);
		assert(popup.html.includes('<option value="shiny">闪光定向（180抽保底）</option>'));
		popup.changeTarget({currentTarget: {value: 'shiny'}});
		assert(popup.html.includes('闪光保底还需 <b>143</b>'));
		assert(!popup.html.includes('下次定向 <b>'));
		assert(popup.html.includes('传说保底还需 <b>72</b>'));
		popup.changeTarget({currentTarget: {value: 'type:Water'}});
		popup.changeTarget({currentTarget: {value: 'shiny'}});
		assert(popup.html.includes('闪光保底还需 <b>143</b>'));
		popup.drawCrates('1');
		assert.equal(actions(c)[0].value, 'shiny');
	});
	it('does not offer shiny targeting against an older running server without that rule', () => {
		const {c, query, popup} = setup();
		delete query.rules.shinyTargetPity;
		c.room.receiveCrates(query);
		assert(!popup.html.includes('<option value="shiny">'));
	});
	it('distinguishes each result quality and does not mistake separate legend and shiny draws for a shiny legend', () => {
		const {popup} = setup();
		const mon = {species: 'Kyogre', nature: 'Modest', ability: 'Drizzle'};
		popup.batch = {results: [
			{...mon}, {...mon, legendary: true}, {...mon, shiny: true},
			{...mon, legendary: true, shiny: true, guarantee: 'legendary', shinyGuaranteed: true},
		]};
		popup.stage = 'results'; popup.render();
		assert.deepEqual([...popup.html.matchAll(/<article class="rogue-crate-result([^"]*)"/g)].map(match => match[1]),
			['', ' legendary', ' shiny', ' legendary shiny']);
		assert(popup.html.includes('传说保底 · 闪光保底'));
		popup.batch.results.pop(); popup.stage = 'sealed'; popup.render();
		assert(!popup.html.includes(' shiny rainbow'));
		popup.batch.results.push({...mon, legendary: true, shiny: true}); popup.render();
		assert(popup.html.includes(' shiny rainbow'));
	});
	it('recovers a committed result after disconnect without issuing a second draw', () => {
		const {c, data, query, popup} = setup(); popup.drawCrates('1'); const request = actions(c)[0];
		c.app.socket.readyState = 3; c.room.disconnected();
		assert.equal(c.room.pending, null); assert.equal(c.room.crateIntent.id, request.id);
		popup.drawCrates('1'); popup.retryCrate(); assert.equal(actions(c).length, 1);
		c.app.socket.readyState = 1;
		const committed = result(data, request);
		c.room.receiveCrates({...query, revision: 2, growthPoints: 990, ledger: committed.account.crates});
		assert.equal(c.room.crateIntent, null); assert.equal(popup.stage, 'sealed');
		popup.skipCrate(); assert(popup.busy(), 'wait for the matching main state before another spend');
		c.room.receiveState(committed); assert(!popup.busy()); assert.equal(actions(c).length, 1);
	});
	it('previews the light while dragging, and cancels a short tear without opening or spending again', () => {
		const {c, data, popup} = setup(); popup.drawCrates('1'); const request = actions(c)[0];
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: result(data, request)});
		const properties = {}, captured = [];
		const stage = {style: {setProperty: (key, value) => { properties[key] = value; },
			removeProperty: key => { delete properties[key]; }}};
		const currentTarget = {closest: () => stage, setPointerCapture: id => captured.push(id)};
		popup.startTear({currentTarget, clientX: 100, clientY: 100, pointerId: 7, button: 2});
		assert.equal(popup.tearX, undefined, 'right click must not start a tear');
		popup.startTear({currentTarget, clientX: 100, clientY: 100, pointerId: 7, button: 0});
		popup.moveTear({clientX: 148, clientY: 100});
		assert.equal(properties['--tear-progress'], 0.5); assert.deepEqual(captured, [7]);
		popup.cancelTear(); popup.tearCrate();
		assert.equal(popup.stage, 'sealed', 'the click following an unfinished drag must not open the box');
		assert.equal(properties['--tear-progress'], undefined); assert.equal(popup.tearX, undefined);
		popup.ignoreTearClickUntil = 0; popup.tearCrate(); assert.equal(popup.stage, 'reveal');
		assert.equal(actions(c).length, 1); assert.equal(c.room.state.account.points, 990);
	});
	it('finishes one reveal after a full tear, and clears its timer when skipped or closed', () => {
		const timers = new Map(); let nextTimer = 0;
		const {c, data, popup} = setup({
			setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, {fn, delay}); return id; },
			clearTimeout: id => timers.delete(id),
		});
		popup.drawCrates('10'); const request = actions(c)[0];
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: result(data, request, 10)});
		const currentTarget = {closest: () => ({style: {setProperty() {}, removeProperty() {}}})};
		popup.startTear({currentTarget, clientX: 0, clientY: 0, button: 0});
		popup.moveTear({clientX: 96, clientY: 0}); popup.tearCrate();
		assert.equal(popup.stage, 'reveal');
		const reveals = [...timers.values()].filter(timer => timer.delay === 2250);
		assert.equal(reveals.length, 1); reveals[0].fn();
		assert.equal(popup.stage, 'results'); assert.equal(actions(c).length, 1);
		assert.equal((popup.html.match(/class="rogue-crate-result[" ]/g) || []).length, 10);
		popup.skipCrate(); assert(!timers.has(popup.animationTimer));
		popup.close(); assert(!timers.has(popup.dayTimer)); assert.equal(c.room.cratePopup, null);
		c.room.openCrates(); assert.equal(c.room.cratePopup.stage, 'results');
		assert.equal(c.room.state.account.crates.lastBatch.id, request.id); assert.equal(actions(c).length, 1);
	});
	it('retries a timed-out request with the identical receipt, target and revision', () => {
		const timers = [];
		const {c, popup} = setup({setTimeout: (fn, delay) => { timers.push({fn, delay}); return timers.length; }});
		popup.drawCrates('1'); const original = actions(c)[0];
		timers.findLast(timer => timer.delay === 10000).fn();
		assert(popup.html.includes('重新确认本次开箱'));
		popup.retryCrate(); assert.deepEqual(actions(c)[1], original);
	});
	it('ignores stale or foreign account replies and closes the dialog when the user changes', () => {
		const {c, data, query, popup} = setup(); popup.drawCrates('1'); const request = actions(c)[0];
		c.room.receiveState(result(data, request));
		c.room.receiveCrates({...query, revision: 0, growthPoints: 99999});
		assert.equal(c.room.crateData.growthPoints, 1000);
		c.room.receiveCrates({...query, userid: 'otheruser', revision: 99}); assert.equal(c.room.crateData.revision, 1);
		c.setUser('otheruser'); c.room.identityChanged();
		assert(popup.removed); assert.equal(c.room.cratePopup, null); assert.equal(c.room.crateIntent, null);
	});
	it('sends a versioned weekly exchange and recovers visibly from a server rejection', () => {
		const {c, data, popup} = setup(); popup.crateTab('weekly');
		assert(popup.html.includes('seen current')); assert(popup.html.includes('owned current')); assert(popup.html.includes('unseen'));
		popup.exchangeCrate('0:mewtwo'); const request = actions(c)[0];
		assert.equal(request.action, 'exchangecrate'); assert.equal(request.value, '0:mewtwo');
		c.room.receiveAction({userid: data.userid, id: request.id, ok: false, message: '每周兑换已更新，请刷新后重试。', state: data});
		assert.equal(popup.stage, 'ready'); assert(popup.html.includes('每周兑换已更新')); assert(!c.room.crateIntent);
		assert.equal(c.room.state.account.points, 1000);
	});
	it('retains the last result on reopening and blocks spending during an active run', () => {
		const {c, data, popup} = setup(); popup.drawCrates('1'); const request = actions(c)[0];
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: result(data, request)});
		popup.close(); c.room.openCrates(); const reopened = c.room.cratePopup;
		assert.equal(reopened.stage, 'results'); assert(reopened.html.includes('Kyogre'));
		const ongoing = adventure('ready'); ongoing.account.crates = c.room.state.account.crates; ongoing.account.revision = 3;
		c.room.receiveState(ongoing);
		assert(reopened.html.includes('结束本局后开放开箱与兑换'));
		reopened.drawCrates('1'); reopened.exchangeCrate('0:kyogre'); assert.equal(actions(c).length, 1);
	});
	it('respects reduced motion and never loses results when animation is skipped', () => {
		const {c, data, popup} = setup({matchMedia: () => ({matches: true})});
		popup.drawCrates('1'); const request = actions(c)[0];
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: result(data, request)});
		assert.equal(popup.stage, 'results'); assert(popup.html.includes('伙伴已录入初始名册'));
		assert(!popup.html.includes('撕开胶带')); assert.equal(c.room.state.account.crates.lastBatch.id, request.id);
	});
	it('shows accumulated free draws and the exact IV gain or full-cap refund', () => {
		const {c, data, query, popup} = setup();
		query.ledger.freeDraws = 3; data.account.crates.freeDraws = 3;
		c.room.receiveState(data); c.room.receiveCrates(query);
		assert(popup.html.includes('免费开箱 <b>3</b>'));
		assert(popup.html.includes('单次开箱 · 免费')); assert(popup.html.includes('十连开箱 · 70 点'));
		popup.drawCrates('10'); const request = actions(c)[0], next = result(data, request, 10);
		const draws = next.account.crates.lastBatch.results;
		Object.assign(draws[0], {newUnlock: false, ivs: [31, 31, 31, 31, 31, 31], refund: 2});
		Object.assign(draws[1], {newUnlock: false, ivs: [16, 16, 16, 16, 16, 16], ivImproved: true});
		Object.assign(draws[2], {newUnlock: false, ivs: [31, 31, 31, 31, 31, 31], ivImproved: true});
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: next}); popup.skipCrate();
		assert.equal((popup.html.match(/资质已满 · 返还 2 成长点/g) || []).length, 1);
		assert.equal((popup.html.match(/重复伙伴 · 个体值提升/g) || []).length, 2);
		assert(popup.html.includes('六项个体值 16')); assert(popup.html.includes('六项个体值 31'));
	});
	it('allows prediction during a run, resets invalid finalists and submits only once', () => {
		const {c, data, popup} = setup();
		assert(c.panel.html.includes('今日竞猜未参与'));
		const ongoing = adventure('ready'); ongoing.account = data.account; c.room.receiveState(ongoing);
		popup.crateTab('daily');
		assert.equal((popup.html.match(/<h4>[ABCD] 队/g) || []).length, 4);
		assert(!popup.html.includes('队获胜')); assert(!popup.html.includes('watchDailyCup'));
		popup.pickCup('0:0'); popup.pickCup('1:2'); popup.pickCup('2:0');
		popup.pickCup('0:1'); assert.equal(popup.picks[2], undefined);
		popup.submitCup(); assert.equal(actions(c).length, 0);
		popup.pickCup('2:1'); popup.submitCup(); popup.submitCup();
		const request = actions(c)[0]; assert.equal(actions(c).length, 1);
		assert.equal(request.action, 'crateprediction'); assert.equal(request.value, '2026-11-03:B:C:B');
		assert.equal(popup.stage, 'ready'); assert.equal(c.room.crateIntent.id, request.id);
	});
	it('recovers a prediction acknowledgement after timeout and refreshes on the next day', () => {
		const timers = [];
		const {c, data, query, popup} = setup({setTimeout: (fn, delay) => { timers.push({fn, delay}); return timers.length; }});
		popup.crateTab('daily'); popup.pickCup('0:0'); popup.pickCup('1:2'); popup.pickCup('2:0'); popup.submitCup();
		const request = actions(c)[0]; timers.findLast(timer => timer.delay === 10000).fn();
		assert(popup.html.includes('重新确认本次预测')); popup.retryCrate(); assert.deepEqual(actions(c)[1], request);
		const ledger = {...query.ledger, daily: {day: query.daily.day, submitted: true, requestId: request.id}};
		const submitted = {...query, revision: 2, ledger, daily: {...query.daily, prediction: {id: request.id, picks: [0, 2, 0]}}};
		c.room.receiveCrates(submitted); assert.equal(c.room.crateIntent, null); assert.equal(c.room.pending, null);
		assert(popup.html.includes('今日预测已提交')); assert(popup.busy());
		data.account.revision = 2; data.account.crates = ledger; c.room.receiveState(data);
		assert(!c.panel.html.includes('今日竞猜未参与'));
		popup.pickCup('0:1'); popup.submitCup(); assert.equal(actions(c).length, 2);
		c.room.receiveCrates({...submitted, daily: {...query.daily, day: '2026-11-04', refreshAt: Date.UTC(2026, 10, 4, 16)}});
		assert.equal(popup.picks.length, 0); assert(popup.html.includes('先选出两场胜者'));
	});
	it('keeps published results hidden until the player watches or explicitly skips the replays', () => {
		const {c, query, popup} = setup();
		publishResults(c, query); popup.crateTab('results');
		assert(popup.html.includes('先看对局，再揭晓答案'));
		assert(!popup.html.includes('队获胜')); assert(!popup.html.includes('三场全中'));
		assert.equal(c.app.lastPopup.data.sourcePopup, popup, 'keep the results dialog beneath the replay');
		const replay = c.room.dailyReplayPopup;
		assert.equal(replay.match, 0); assert(replay.html.includes('跳过全部，查看结果'));
		popup.scroll = 600;
		replay.finishReplay(); replay.finishReplay();
		assert.equal(popup.scroll, 0, 'returning from replay must reveal the outcome at the top');
		assert(replay.removed); assert.equal(c.room.dailyReplayPopup, null);
		assert(popup.html.includes('三场全中！免费开箱 +1'));
		assert.equal((popup.html.match(/队获胜/g) || []).length, 3);
		assert(popup.html.includes('奖励已存入免费次数')); assert(popup.html.includes('观看三场对局'));
		popup.scroll = 450; popup.crateTab('daily'); assert.equal(popup.scroll, 0);
		popup.scroll = 500; popup.crateTab('results'); assert.equal(popup.scroll, 0);
		assert.equal(c.room.dailyReplayPopup, null);
		assert.equal(actions(c).length, 0, 'watching or skipping cannot issue reward or spending requests');
	});
	it('plays each published replay through the native battle renderer and cleans up on identity change', () => {
		const battles = [], timers = [];
		class Replay {
			constructor(options) { this.options = options; this.paused = true; this.scene = {}; battles.push(this); }
			setViewpoint(side) { this.viewpoint = side; }
			subscribe(fn) { this.update = fn; }
			play() { this.paused = false; }
			pause() { this.paused = true; }
			destroy() { this.destroyed = true; }
		}
		const {c, query, popup} = setup({Battle: Replay, setTimeout: (fn, delay) => { timers.push({fn, delay}); return timers.length; }});
		publishResults(c, query); popup.crateTab('results'); const replay = c.room.dailyReplayPopup;
		assert(c.sent.includes('/cmd fantasyroguedailyreplay 2026-11-03:0'));
		const feed = (target, userid = 'rogueplayer') => c.room.receiveDailyReplay({userid, target, enabled: true, log: ['|start', '|win|A 队']});
		feed('2026-11-03:1'); feed('2026-11-03:0', 'otheruser'); assert.equal(battles.length, 0);
		for (let match = 0; match < 3; match++) {
			assert(!popup.html.includes('队获胜')); assert(!popup.revealedDays['2026-11-03']);
			feed(`2026-11-03:${match}`); feed(`2026-11-03:${match}`); assert.equal(battles.length, match + 1);
			const battle = battles[match]; assert.equal(battle.viewpoint, 'p1'); assert(battle.options.isReplay);
			timers.findLast(timer => timer.delay === 0).fn(); assert(!battle.paused);
			replay.togglePlayback(); assert(battle.paused); replay.playbackSpeed(); assert.equal(battle.scene.acceleration, 3);
			replay.nextMatch(); assert.equal(replay.match, match);
			battle.ended = true; battle.atQueueEnd = true; battle.update();
			assert.equal(replay.controls['button[name=nextMatch]'].disabled, false);
			replay.nextMatch(); assert(battle.destroyed);
		}
		assert(replay.removed); assert.equal(c.room.dailyReplayPopup, null);
		assert(popup.revealedDays['2026-11-03']); assert(popup.html.includes('三场全中！免费开箱 +1'));
		popup.watchDailyCup('2026-11-03'); const reopened = c.room.dailyReplayPopup; feed('2026-11-03:0');
		c.setUser('otheruser'); c.room.identityChanged();
		assert(reopened.removed); assert(battles[3].destroyed);
	});
	it('does not reveal an unfinished day when closed, and keeps each published day separate', () => {
		const {c, query, popup} = setup(); publishResults(c, query); popup.crateTab('results');
		const first = c.room.dailyReplayPopup;
		first.skipMatch(); assert.equal(first.match, 1); assert(!popup.html.includes('队获胜'));
		first.close(); assert(!popup.revealedDays['2026-11-03']);
		popup.openUnseenCup(); const resumed = c.room.dailyReplayPopup;
		assert.equal(resumed.match, 0); resumed.skipMatch(); resumed.skipMatch();
		assert(!popup.html.includes('队获胜'));
		resumed.skipMatch(); assert(popup.revealedDays['2026-11-03']);
		publishResults(c, query, '2026-11-02'); popup.changeCupResult({currentTarget: {value: '2026-11-02'}});
		assert(c.room.dailyReplayPopup); assert(!popup.html.includes('队获胜'));
		c.room.dailyReplayPopup.close(); assert(!popup.revealedDays['2026-11-02']);
		popup.watchDailyCup('2099-01-01'); assert.equal(c.room.dailyReplayPopup, null);
	});
	it('offers a retry or explicit skip on replay timeout and ignores replies after closing', () => {
		const timers = new Map(); let nextTimer = 0;
		const {c, query, popup} = setup({
			setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, {fn, delay}); return id; },
			clearTimeout: id => timers.delete(id),
		});
		publishResults(c, query); popup.crateTab('results'); const replay = c.room.dailyReplayPopup;
		timers.get(replay.loadTimer).fn(); assert(replay.html.includes('录像暂未加载，请重试'));
		assert(!popup.html.includes('队获胜'));
		replay.loadMatch(); assert(timers.has(replay.loadTimer));
		replay.receive({target: '2026-11-03:0', enabled: false, message: '录像暂不可用'});
		assert(!timers.has(replay.loadTimer)); assert(replay.html.includes('跳过全部，查看结果'));
		replay.close(); replay.receive({target: '2026-11-03:0', enabled: true, log: ['|start']});
		assert(!replay.battle); assert(!popup.revealedDays['2026-11-03']);
	});
});

describe('Fantasy Rogue mainline presentation', () => {
	it('updates the window dialogue in place into a required reply page and resumes after answering', () => {
		const c = client(), data = adventure('story');
		data.protocolVersion = 2;
		data.story = {stage: 'mainline', scene: 'stranger', title: '窗边的天气', speaker: '黑袍老人', text: '肩上湿了。先擦一擦。',
			key: 'window:1', performance: 'window', index: 1, total: 6, canSkip: true};
		c.room.receiveState(data);
		assert(!c.room.error);
		const nodes = {};
		for (const name of ['.rogue-story-scene', '.rogue-story-chapter', '.rogue-story-actions', 'strong', 'span', 'small']) nodes[name] = {};
		nodes['.rogue-story-dialogue'] = {setAttribute() {}, querySelector: key => nodes[key]};
		const section = {dataset: {story: c.room.storySignature(data.story)}, setAttribute() {}, querySelector: key => nodes[key]};
		c.room.$el[0] = {querySelector: () => section};
		const renderHTML = c.room.$el.html;
		c.room.$el.html = () => { throw new Error('Keep the same story scene'); };
		const choice = structuredClone(data); choice.account.revision++;
		Object.assign(choice.story, {key: 'window:2', index: 2, speaker: '旁白', text: '你抬头看了看窗外。',
			options: [{id: '0', label: '这雨什么时候会停？'}, {id: '1', label: '这里的天气总让我想起别的地方。'}]});
		c.room.receiveState(choice, true);
		assert(nodes['.rogue-story-dialogue'].disabled);
		assert.equal(nodes.small.textContent, '请选择你的回应 · 3/6');
		assert.equal((nodes['.rogue-story-actions'].innerHTML.match(/name="storyReply"/g) || []).length, 2);
		assert(!nodes['.rogue-story-actions'].innerHTML.includes('storySkip'));
		c.room.$el.html = renderHTML;
		c.room.storyReply('1'); c.room.storyReply('1');
		assert.equal(c.sent.length, 1);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.value, 'window:2'); assert.equal(request.member, '1');
		const reply = structuredClone(choice); reply.account.revision++;
		delete reply.story.options;
		Object.assign(reply.story, {key: 'window:3', index: 3, total: 9, text: '那应该是个值得记住的地方。'});
		c.room.pending = null; c.room.receiveState(reply, true);
		assert(!nodes['.rogue-story-dialogue'].disabled);
		assert(!nodes['.rogue-story-actions'].innerHTML.includes('storyReply'));
		assert.equal(nodes.small.textContent, '轻点继续 ▷ · 4/9');
	});
	it('shows emergency continuation without blocking existing mainline replies', () => {
		const c = client(true), data = state();
		data.continueOnly = true;
		c.room.receiveState(data);
		assert(c.room.html.includes('暂不开放新冒险'));
		assert(c.room.html.includes('name="enterGame" disabled'));
		c.room.screen = 'game'; c.room.render();
		assert(!c.room.html.includes('选择本次冒险的伙伴'));
		const running = adventure('story');
		running.continueOnly = true;
		running.story = {stage: 'mainline', title: '灯下', speaker: '黑袍老人', text: '⌈还记得吗？⌋',
			key: 'scene:2', index: 2, total: 8, options: [{id: '0', label: '记得'}]};
		c.room.receiveState(running);
		c.room.storyReply('0');
		assert(c.sent.some(message => message.includes('mainlinechoice')));
	});
	it('requires an explicit reply, submits the current page key and escapes dialogue content', () => {
		const c = client(), data = adventure('story');
		data.story = {stage: 'mainline', scene: 'stranger', title: '灯下', speaker: '黑袍老人',
			text: '⌈你还记得吗？⌋<script>bad</script>', key: 'scene:2', index: 2, total: 8, canSkip: true,
			options: [{id: '0', label: '⌈我记得。⌋'}, {id: '1', label: '再讲讲吧。'}]};
		c.room.receiveState(data);
		assert(c.room.html.includes('name="storyNext" class="rogue-story-dialogue" disabled'));
		assert(c.room.html.includes('name="storyReply"')); assert(!c.room.html.includes('name="storySkip"'));
		assert(c.room.html.includes('<strong class="rogue-spoken-line">『你还记得吗？』</strong>'));
		assert(!c.room.html.includes('<script>'));
		c.room.storyReply('1'); c.room.storyReply('1'); assert.equal(c.sent.length, 1);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'mainlinechoice'); assert.equal(request.value, 'scene:2'); assert.equal(request.member, '1');
	});
	it('replays only collected stories and never sends gameplay actions from a replay', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('stories');
		c.room.receiveCodex({userid: 'rogueplayer', codexSchema: 5, section: 'stories', entries: [
			{id: 's0-1', name: '没有落款的信', unlocked: true, text: '已收集', replay: {title: '没有落款的信', start: 'p0', pages: {
				p0: {text: ['⌈坐一会儿吧。⌋'], options: [{label: '⌈好。⌋', next: 'p1'}]}, p1: {text: ['灯亮着。'], options: []},
			}}}, {id: 's1-1', name: '尚未拾起的记忆', text: '继续旅程', unlocked: false},
		]});
		assert(c.room.html.includes('故事回顾')); const before = c.sent.length;
		c.room.readEvent('s1-1'); assert(!c.room.codexReplay);
		c.room.readEvent('s0-1'); c.room.replayEventNext('p1'); assert(c.room.html.includes('灯亮着。'));
		assert.equal(c.sent.length, before); assert.equal(c.joined.length, 0);
	});
	it('preserves the server unlock sequence instead of alphabetizing story titles', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('stories');
		c.room.receiveCodex({userid: 'rogueplayer', codexSchema: 5, section: 'stories', entries: [
			{id: 'first', name: '最后一盏灯', unlocked: true, text: '第一段'},
			{id: 'second', name: '爱与回忆', unlocked: true, text: '第二段'},
			{id: 'third', name: '尚未拾起的记忆', unlocked: false, text: '继续旅程'},
		]});
		assert(c.room.html.indexOf('最后一盏灯') < c.room.html.indexOf('爱与回忆'));
		assert(c.room.html.indexOf('爱与回忆') < c.room.html.indexOf('尚未拾起的记忆'));
		assert(c.room.html.includes('按秘闻解锁顺序排列'));
		assert(!c.room.html.includes('按中文名称拼音首字母排列'));
	});
	it('shows queued unlocks on entry once and waits while the final battle is still visible', () => {
		const c = client(true), data = state();
		data.account.unlockNotices = [{id: 'difficulty:1', title: '已解锁 1 档冒险', text: '通关与故事均已完成。'}];
		let count = 0; const add = c.app.addPopup; c.app.addPopup = (type, details) => {count++; return add(type, details);};
		c.room.receiveState(data); assert.equal(count, 0);
		c.app.curRoom = {id: 'battle-final'}; c.room.enterGame(); assert.equal(count, 0);
		c.app.curRoom = c.room; c.room.maybeShowUnlock(); c.room.maybeShowUnlock(); assert.equal(count, 1);
		assert.equal(c.app.lastPopup.type, c.RogueUnlockPopup);
		const popup = Object.create(c.RogueUnlockPopup); popup.data = c.app.lastPopup.data; popup.userid = data.userid; popup.close = () => {};
		popup.ackUnlock(); const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'unlockack'); assert.equal(request.value, 'difficulty:1');
	});
	it('presents new account growth as percentages without relabeling a legacy run', () => {
		const c = client(), data = state(); data.account.boostRuleVersion = 2; data.account.boosts.hp = 4;
		c.room.receiveState(data); assert(c.html.includes('HP +4% / 10%'));
		assert(c.html.includes('地区形态分别记录')); assert(c.html.includes('幻想与普通形态共用记录'));
	});
	it('hands a mainline ending to native battle controls without opening it over battle playback', () => {
		const c = client(), data = adventure('battle'); data.run.id = 'last'; data.run.roomid = 'battle-final';
		c.room.receiveState(data); let updated = 0;
		c.app.rooms['battle-final'] = {fantasyRogue: {userid: data.userid}, updateControls() {updated++;}};
		data.run.phase = 'complete'; const next = structuredClone(data); delete next.run.roomid;
		next.story = {stage: 'mainline', ending: true, scene: 'summit', title: '归来', text: '光线渐亮。', key: 'ending:0', index: 0, total: 3};
		c.room.receiveState(next); assert.equal(updated, 1); assert.equal(c.joined.length, 0);
	});
});

describe('Fantasy Rogue optional challenge and voiced dialogue presentation', () => {
	function challenge(stage) {
		const data = adventure(stage === 'battle' ? 'ready' : 'event');
		data.protocolVersion = 2;
		data.run.challenge = {stage, name: '试车邀请', speaker: '北尚', hint: '留意黏黏网与换人。',
			paragraphs: ['列车停靠。⌈与伙伴一起，出发吧。⌋'],
			team: [{species: 'Pikachu', level: 26, ability: 'Static', item: 'Light Ball', moves: ['thunderbolt']}],
			prizes: [{id: 'supplies', name: '旅途补给', money: 500, items: {potion: 2}},
				{id: 'training', name: '复盘特训', money: 0, items: {}, training: [{species: 'Bulbasaur', experience: 800, level: 28}]}]};
		return data;
	}
	it('submits a complete star-prize identifier and marks earlier receipts separately', () => {
		const c = client(), data = challenge('won');
		data.run.floor = 16;
		data.run.lastReward = {floor: 15, encounter: 1, money: 0, items: {potion: 1}};
		const member = data.run.team[0].id;
		data.run.challenge.prizes.push({id: 'star:' + member, name: '升星', money: 0, items: {},
			star: {species: 'Bulbasaur', from: 1, to: 2}});
		c.room.receiveState(data);
		assert(c.html.includes('上一层已到账'));
		assert(c.html.includes('value="challenge:star:' + member + '"'));
		c.room.act('challenge:star:' + member);
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'challenge'); assert.equal(request.value, 'star:' + member);
	});
	it('previews the roster and exact choices before accepting and explains the two-step retreat', () => {
		const c = client(), data = challenge('offer'); c.room.receiveState(data);
		assert(c.html.includes('Lv.26')); assert(c.html.includes('最多获得 800 经验，止于 Lv.28'));
		assert(c.html.includes('不开放捕捉')); assert(c.html.includes('challenge:accept')); assert(c.html.includes('challenge:skip'));
		assert(c.html.includes('全队采用本层精英等级')); assert(c.html.includes('战斗中逃跑只退出战斗'));
		assert(!c.html.includes('value="challenge:supplies"'));
		assert(c.html.includes('<span class="rogue-narration">列车停靠。</span>'));
		assert(c.html.includes('<strong class="rogue-spoken-line">『与伙伴一起，出发吧。』</strong>'));
	});
	it('only exposes reward buttons after victory and the exit after closure', () => {
		const c = client(), data = challenge('won'); c.room.receiveState(data);
		assert(c.html.includes('value="challenge:supplies"')); assert(!c.html.includes('challenge:accept'));
		data.run.challenge.stage = 'closed'; c.room.receiveState(data);
		assert(c.html.includes('challenge:leave')); assert(!c.html.includes('challenge:supplies'));
		data.run.challenge.stage = 'battle'; data.run.phase = 'battle'; c.room.receiveState(data);
		assert(c.html.includes('逃跑只退出本场战斗'));
		data.run.challenge.stage = 'paused'; data.run.phase = 'event'; c.room.receiveState(data);
		assert(c.html.includes('challenge:retry')); assert(c.html.includes('逃离这一层（无奖励）'));
		assert(c.html.includes('尚未离开本层')); assert(!c.html.includes('value="challenge:supplies"'));
	});
	it('shows named challenge portraits and explains serious sparring companionship without replacing ordinary events', () => {
		const c = client(), data = challenge('offer');
		Object.assign(data.run.challenge, {serious: true, portraits: ['ingo', 'emmet'], companions: [{id: 'ingo', name: '北尚'}, {id: 'emmet', name: '南厦'}]});
		c.room.receiveState(data);
		assert(c.html.includes('rogue-dialogue/ingo.png')); assert(c.html.includes('rogue-dialogue/emmet.png'));
		assert(c.html.includes('拿出真本事 · 认真切磋')); assert(c.html.includes('共用两位同行名额'));
		assert(!c.html.includes('rogue-companion-portrait smiling'));
		data.run.challenge.stage = 'won'; data.run.challenge.outcome = 'won'; c.room.receiveState(data);
		assert(c.html.includes('rogue-companion-portrait smiling'));
	});
	it('escapes all speech and narration, including hostile display names', () => {
		const c = client(), data = challenge('offer');
		data.run.challenge.name = '<img src=x onerror=alert(1)>';
		data.run.challenge.paragraphs = ['<script>bad</script>⌈<img src=x>⌋']; c.room.receiveState(data);
		assert(!c.html.includes('<script>bad')); assert(!c.html.includes('<img src=x'));
		assert(c.html.includes('&lt;script>bad')); assert(c.html.includes('『&lt;img src=x>』'));
	});
	it('keeps player spoken replies distinct from action choices', () => {
		const c = client(), data = adventure('event');
		data.run.event = {key: 'dialogue', stage: 'choice', title: '你的回应', paragraphs: [], options: [
			{id: 'greet:warm', name: '⌈我来帮忙！⌋', text: ''}, {id: 'wait', name: '安静地等在一旁。', text: ''}]};
		c.room.receiveState(data);
		assert(c.html.includes('<strong class="rogue-spoken-line">『我来帮忙！』</strong>'));
		assert(!c.html.includes('『安静地等在一旁。』'));
	});
});

describe('Fantasy Rogue current partner move types and localized eggs', () => {
	it('shows every future boss in separate expandable rosters and accepts old single forecasts', () => {
		const c = client(), data = adventure('ready');
		data.run.blessings = {shards: 0, owned: []};
		data.run.futureSight = {bosses: [10, 50, 200].map(floor => ({floor, roster: {name: '首领' + floor, pokemon: ['Mew']}}))};
		c.room.receiveState(data);
		assert(c.html.includes('后续首领阵容（3）'));
		for (const floor of [10, 50, 200]) assert(c.html.includes('第 ' + floor + ' 层 · 首领' + floor));
		data.run.futureSight = {floor: 10, roster: {name: '旧预告', pokemon: ['Mew']}}; c.room.receiveState(data);
		assert(c.html.includes('第 10 层 · 旧预告'));
		data.run.futureSight = {bosses: []}; c.room.receiveState(data);
		assert(c.html.includes('本局已没有后续首领区域'));
	});
	it('updates Hidden Power from the actual IVs in equipped, available and learning moves', () => {
		const c = client(false, true), data = adventure('ready'), mon = data.run.team[0];
		const original = c.Dex.moves.get;
		c.Dex.moves.get = id => ({...original(id), type: id === 'hiddenpowerice' ? 'Ice' : 'Normal'});
		mon.set.moves = ['hiddenpower'];
		mon.pp = [{id: 'hiddenpower', pp: 15, maxpp: 15}]; mon.set.ivs = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
		mon.moveMemory = mon.pp;
		data.run.pendingMoves = [{member: mon.id, move: 'hiddenpower'}];
		c.room.receiveState(data); c.room.editSection('moves:0');
		assert(c.panel.html.includes('恶 · 威力')); assert(c.panel.html.includes('alt="Dark"'));
		assert(c.room.pendingMovePopup.html.includes('alt="Dark"'));
		mon.set.ivs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}; c.room.receiveState(data);
		assert(c.panel.html.includes('格斗 · 威力')); assert(c.room.pendingMovePopup.html.includes('alt="Fighting"'));
		mon.set.hpType = 'Water'; c.room.receiveState(data); assert(c.panel.html.includes('水 · 威力'));
		delete mon.set.hpType; mon.set.moves = ['hiddenpowerice']; c.room.receiveState(data);
		assert(c.panel.html.includes('冰 · 威力'));
	});
	it('keeps Egg as the sprite identifier but presents 宝可梦蛋 to the player', () => {
		const c = client(), data = adventure('ready');
		data.run.team.push({...data.run.team[0], id: 'egg', egg: {hatch: 20}, remainingFloors: 5, set: {species: 'Egg', moves: [], level: 1}});
		c.room.receiveState(data); c.room.selectMember('egg');
		assert(c.panel.html.includes('宝可梦蛋')); assert(!c.panel.html.includes('>Egg<'));
		assert(c.panel.html.includes('再前进 <b>5</b> 层'));
	});
});

describe('Fantasy Rogue collapse echo panel', () => {
	it('hides locked progression, renders exact prices and disables purchases during an adventure', () => {
		const c=client(), a=state().account;
		assert.equal(c.room.renderEcho(a,null,false),'');
		a.echo={unlocked:true,points:60,canExchange:true,cost:10,systemCost:50,exchangeCost:100,
			types:{Fire:'火',Water:'水'},systems:{mega:'超进化',tera:'太晶化'},
			upgrades:{types:['Fire'],guard:false,shiny:3,catch:5,systems:['mega']}};
		let html=c.room.renderEcho(a,null,false);
		assert(html.includes('崩坏适性 · 60 点'));assert(html.includes('受到敌方招式的直接伤害 ×0.9'));
		assert(html.includes('×1.3 → 最高 ×1.5'));assert(html.includes('已满级'));
		assert(html.includes('value="echo:system/tera"'));assert(html.includes('点亮 · 50 点'));
		assert(!html.includes('value="echo:system/mega"'));assert(!html.includes('value="echo:type/Fire"'));
		html=c.room.renderEcho(a,{phase:'ready'},false);
		assert(html.includes('rogue-echo-locked'));
		assert(html.includes('本局已锁定，结束或放弃本局后可继续点亮'));
		assert(!html.includes('<button')); assert(!html.includes('承伤减免')); assert(!html.includes('属性之力'));
	});
});
describe('Fantasy Rogue history, affinity and shard inventory', () => {
	it('keeps history private across account switches and leaves member and blessing details collapsed', () => {
		const c=client(), room=Object.create(c.FantasyRogueHistoryRoom);
		room.$el={addClass(){},html:html=>{room.html=html;},scrollTop(){}};
		room.listenTo=(source,event,callback)=>source.on(event,callback.bind(room));room.initialize();
		const record={id:'journey',floor:37,outcome:'abandoned',endedAt:1000,snapshot:{team:adventure().run.team,box:[],
			blessings:[{name:'旧祝福',text:'曾经生效的效果',floor:1}],difficulty:0,difficultyLabel:'0 档'}};
		room.receiveHistory({userid:'rogueplayer',offset:0,total:1,records:[record]});
		assert(room.html.includes('第 37 层'));assert(room.html.includes('<details class="rogue-history-member">'));
		assert(room.html.includes('<summary>旧祝福</summary>'));assert(room.html.includes('记录时 HP'));
		room.receiveHistory({userid:'other',records:[]});assert(room.html.includes('旧祝福'));
		c.setUser('other');room.identityChanged();assert(!room.html.includes('旧祝福'));
		assert.equal(c.sent.at(-1),'/cmd fantasyroguehistory 0');
	});
	it('offers typed shards in the bag and preserves the complete member ID in the confirmation', () => {
		const c=client(),data=adventure('choose');data.items.push({id:'terashardfire',name:'火太晶碎片',kind:'terashard',teraType:'Fire'});
		data.run.bag.terashardfire=50;c.room.receiveState(data);
		assert(c.panel.html.includes('火太晶碎片'));assert(c.panel.html.includes('更改太晶属性'));
		c.room.changeTera(data.run.team[0].id+':Fire');
		assert.equal(c.app.lastPopup.data.details.member,data.run.team[0].id);assert.equal(c.app.lastPopup.data.details.value,'Fire');
	});
	it('gives archived blessings quality classes and readable labels without expanding them', () => {
		const c=client(), room=Object.create(c.FantasyRogueHistoryRoom);
		room.$el={addClass(){},html:html=>{room.html=html;},scrollTop(){}};
		room.listenTo=(source,event,callback)=>source.on(event,callback.bind(room));room.initialize();
		const blessings=['silver','gold','prismatic'].map(tier=>({id:tier,name:tier,text:'说明',tier,floor:1}));
		room.receiveHistory({userid:'rogueplayer',offset:0,total:1,records:[{id:'history',floor:10,outcome:'abandoned',endedAt:1000,
			snapshot:{team:adventure().run.team,box:[],blessings,difficulty:0}}]});
		for(const tier of ['silver','gold','prismatic']) assert(room.html.includes('<details class="rogue-blessing-'+tier+'">'));
		for(const quality of ['白银','黄金','棱彩']) assert(room.html.includes('rogue-history-quality">'+quality));
		assert(!room.html.includes('<details open'));
	});
	it('shows the queued personal dialogue before routes and submits only a saved response', () => {
		const c=client(),data=adventure('choose');
		data.run.affectionScene={id:'nessa',stage:100,name:'露璃娜',title:'想亲口告诉你的话',text:'以后也想和你同行。',
			options:[{id:'friends',name:'珍惜这份友情'}]};c.room.receiveState(data);
		assert(c.room.html.includes('想亲口告诉你的话'));assert(!c.room.html.includes('name="selectNode"'));
		c.room.affectionAction('nessa|friends');const cmd=JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(cmd.action,'affection');assert.equal(cmd.member,'nessa');assert.equal(cmd.value,'friends');
	});
});

describe('Fantasy Rogue start menu and codex', () => {
	it('offers four boss cards with the speed option before balanced and submits its saved ID', () => {
		const c=client(), data=adventure('rest');
		data.run.mentorOffer={floor:20,cards:[
			{id:'attack',name:'破阵之证',offense:100,defense:40,speed:0},
			{id:'guard',name:'坚守之证',offense:40,defense:120,speed:0},
			{id:'speed',name:'疾风之证',offense:20,defense:20,speed:100},
			{id:'balanced',name:'同行之证',offense:50,defense:50,speed:50},
		]};
		c.room.receiveState(data);
		assert.equal((c.room.html.match(/name="chooseMentorCard"/g)||[]).length,4);
		assert(c.room.html.indexOf('疾风之证')<c.room.html.indexOf('同行之证'));
		assert(c.room.html.includes('速度</span><b>+100%'));assert(!c.room.html.includes('三张'));
		const cards=c.room.html.match(/<span class="rogue-mentor-stats">[\s\S]*?<span class="rogue-route-hint">/g);
		assert.equal(cards.length,4);
		for(const card of cards){assert(card.indexOf('双攻')<card.indexOf('双防'));assert(card.indexOf('双防')<card.indexOf('速度'));assert(!card.includes('招式伤害'));}
		c.room.chooseMentorCard('speed');
		const command=JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action,'mentorcard');assert.equal(command.value,'speed');
	});
	it('places concise player-facing difficulty details after every permanent upgrade', () => {
		const c=client(), data=state();data.account.preferredDifficulty=5;
		data.difficulties=[{id:5,name:'5 档',unlocked:true,text:'旧版冗长介绍',
			menuText:'野生伙伴约 **28**，精英**绝大多数单项为 31**。',rewards:'六项独立随机。'}];
		c.room.receiveState(data);
		assert(c.panel.html.indexOf('冒险档位')>c.panel.html.indexOf('初始栏位'));
		assert(c.panel.html.includes('<strong>28</strong>'));assert(!c.panel.html.includes('旧版冗长介绍'));
		assert(c.panel.html.includes('<summary>捕捉品质详情</summary>'));assert(!c.panel.html.includes('解锁下一档'));
	});
	it('links move categories in offered, owned and codex blessings with names-only lists', () => {
		const c=client(false,true), data=adventure('blessing');
		data.moveCategoryHelp={shooting:{name:'射击类招式',aliases:['射击类招式','射击招式'],moves:['snipeshot','baoyulihua']},
			pulse:{name:'波动／波导类招式',aliases:['波动／波导类招式'],moves:['aurasphere']}};
		c.Dex.moves.get=id=>({name:{snipeshot:'Snipe Shot',baoyulihua:'暴雨梨花',aurasphere:'Aura Sphere'}[id],
			desc:'Not part of a category list.',basePower:80});
		const entry={id:'veteransniper',name:'老练狙神',family:'veteransniper',tier:'gold',
			text:'射击类招式与【波动／波导类招式】；普通免疫。',unlocked:true};
		data.run.blessings={owned:[entry],pending:[],round:{floor:50,tier:'gold',remaining:1,options:[entry]}};
		c.room.receiveState(data);
		for(const html of [c.room.html,c.panel.html]) {
			assert(html.includes('data-reference-kind="category"'),html.slice(0,1200));assert(html.includes('data-reference-id="pulse"'));
			assert(html.includes('狙击'));assert(html.includes('暴雨梨花'));assert(!html.includes('Not part of a category list.'));
		}
		c.room.openCodex('blessings');c.room.receiveCodex({userid:'rogueplayer',section:'blessings',entries:[entry],moveCategoryHelp:data.moveCategoryHelp});
		assert(c.room.html.includes('data-reference-id="shooting"'));assert(c.room.html.includes('普通免疫'));
		const popup=Object.create(c.RogueReferencePopup);popup.$el={addClass(){},html:s=>{popup.html=s;}};
		popup.initialize({kind:'category',name:'射击类招式',moves:['狙击','暴雨梨花']});
		assert(popup.html.includes('<span>狙击</span>'));assert(popup.html.includes('<span>暴雨梨花</span>'));assert(!popup.html.includes('威力'));
	});
	it('renders all choices from a saved companion gift and submits the exact chosen item', () => {
		const c=client(),data=adventure('blessing');
		data.run.blessings={owned:[],pending:[{id:'affection-100',kind:'item',title:'露璃娜的心意',
			options:[{id:'fantasyscopelens',name:'幻之焦点镜'},{id:'fantasylifeorb',name:'幻之生命宝珠'}]}]};
		c.room.receiveState(data);assert(c.room.html.includes('幻之焦点镜'));assert(c.room.html.includes('幻之生命宝珠'));
		c.room.chooseBlessingReward('fantasyscopelens');
		const command=JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.member,'affection-100');assert.equal(command.value,'fantasyscopelens');
	});
	it('links only explicit bracketed references, never the ordinary immunity or protection wording', () => {
		const c = client(true, true, {BattleAbilities: {immunity: {}}});
		c.Dex.abilities.get = () => ({name: 'Immunity', desc: 'Ability effect.'});
		c.room.receiveState(state()); c.room.openCodex('blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'probe', family: 'probe', tier: 'silver', unlocked: true, name: '测试', text: '不改变免疫和保护规则；获得【免疫】特性。'},
		]});
		assert.equal((c.room.html.match(/data-reference-id="immunity"/g) || []).length, 1);
		assert(c.room.html.includes('不改变免疫和保护规则'));
	});
	it('links named items and Pokemon across offered, owned, codex and history descriptions using effective Rogue data', () => {
		const c=client(false,true,{BattleItems:{leftovers:{}},Gen9fantasyItems:{fantasyscopelens:{}},
			BattlePokedex:{eevee:{}},Gen9fantasydex:{hydreigonfantasy:{}}});
		c.Dex.items.get=id=>({name:id==='leftovers'?'Leftovers':'幻之焦点镜',desc:'道具的完整效果。'});
		c.Dex.species.get=id=>({name:id==='eevee'?'Eevee':'Hydreigon-Fantasy',types:['Dark','Dragon'],
			baseStats:{hp:92,atk:105,def:90,spa:125,spd:90,spe:98},abilities:{0:'Levitate',H:'Pressure'}});
		c.Dex.abilities.get=id=>({id:id.toLowerCase(),name:id,desc:'此特性的完整效果。'});
		const data=adventure('blessing');
		data.items=[{id:'leftovers',name:'吃剩的东西',kind:'held',description:'肉鸽自定义剩饭效果。'},
			{id:'expcandys',name:'经验糖果 S',kind:'candy',amount:800}];
		data.blessingSupplyHelp=[{id:'roguetoolbox',name:'工具箱',description:'四件随机装备选一件。'}];
		const entry={id:'testrefs',name:'测试祝福',tier:'gold',family:'testrefs',unlocked:true,
			text:'【吃剩的东西】、【幻之焦点镜】、【经验糖果 S】、【工具箱】、【伊布】、【幻想三首恶龙】；普通免疫规则不变。'};
		data.run.blessings={owned:[entry],pending:[],round:{floor:1,tier:'gold',remaining:1,options:[entry]}};
		c.room.receiveState(data);
		function check(html) {
			for(const id of ['leftovers','fantasyscopelens','expcandys','roguetoolbox','eevee','hydreigonfantasy']) assert(html.includes('data-reference-id="'+id+'"'),id);
			for(const text of ['肉鸽自定义剩饭效果','增加 800 经验','四件随机装备选一件','种族值：HP 92','隐藏特性','普通免疫规则不变']) assert(html.includes(text),text);
			assert(!html.includes('data-reference-id="immunity"'));
		}
		check(c.room.html);check(c.panel.html);
		c.room.openCodex('blessings');c.room.receiveCodex({userid:'rogueplayer',section:'blessings',entries:[entry]});check(c.room.html);
		const history=Object.create(c.FantasyRogueHistoryRoom);
		history.$el={addClass(){},html:s=>{history.html=s;},scrollTop(){}};
		history.listenTo=(source,event,callback)=>source.on(event,callback.bind(history));history.initialize();
		history.receiveHistory({userid:'rogueplayer',offset:0,total:1,records:[{id:'h',floor:1,endedAt:1,outcome:'abandoned',
			snapshot:{team:data.run.team,box:[],blessings:[entry],difficulty:0}}]});check(history.html);
	});
	it('renders Pokemon reference details and identifies item reference popups correctly', () => {
		const c=client(),popup=Object.create(c.RogueReferencePopup);popup.$el={addClass(){},html:s=>{popup.html=s;}};
		popup.initialize({kind:'species',id:'eevee',name:'伊布',types:['Normal'],stats:[{name:'HP',value:55}],abilities:[{name:'适应力',text:'提升同属性招式伤害。'}]});
		assert(popup.html.includes('宝可梦'));assert(popup.html.includes('种族值'));assert(popup.html.includes('适应力'));
		popup.initialize({kind:'item',id:'leftovers',name:'吃剩的东西',text:'每回合恢复 HP。'});
		assert(popup.html.includes('<small>道具</small>'));assert(popup.html.includes('每回合恢复 HP。'));
	});
	it('links each explicit name in a bracketed ability list without linking ordinary prose', () => {
		const c = client(true, true, {BattleAbilities: {immunity: {}}});
		c.Dex.abilities.get = () => ({name: 'Immunity', desc: 'Ability effect.'});
		c.room.receiveState(state()); c.room.openCodex('blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'probe', family: 'probe', tier: 'silver', unlocked: true, name: '测试',
				text: '普通免疫；选择【免疫／大法师】或【免疫+、未知名称】。'},
		]});
		assert.equal((c.room.html.match(/data-reference-id="immunity"/g) || []).length, 2);
		assert(c.room.html.includes('data-reference-id="roguegreatmage"'));
		assert(!c.room.html.includes('data-reference-id="未知名称"'));
		assert(c.room.html.includes('普通免疫；'));
	});
	it('shows the difficulty menu to new accounts while keeping locked tiers unavailable', () => {
		const c = client(), data = state();
		data.difficulties = [{id: 0, name: '基础', unlocked: true}, {id: 1, name: '进阶', unlocked: false}];
		data.account.difficultySettingsUnlocked = false; c.room.receiveState(data);
		assert(c.panel.html.includes('name="difficulty"'));
		assert(!c.panel.html.includes('value="1"'));
		assert(!c.panel.html.includes('name="nuzlocke"'));
		data.account.preferredDifficulty = 0; c.room.receiveState(data);
		assert(c.panel.html.includes('name="nuzlocke"'));
		assert(c.panel.html.includes('成长点数 ×2'));
		c.panel.changeNuzlocke({currentTarget: {checked: true}});
		assert(c.sent.at(-1).includes('"action":"setnuzlocke"'));
		assert(c.sent.at(-1).includes('"value":"on"'));
		data.run = adventure('ready').run; data.run.difficulty = 0;
		data.run.nuzlocke = {dead: [], captureUsed: true}; c.room.pending = null; c.room.receiveState(data);
		assert(!c.panel.html.includes('name="nuzlocke"'));
		assert(c.panel.html.includes('捕捉对象已锁定'));
	});
	it('shows a prominent once-per-run quality action and hides it for fixed-quality spirits', () => {
		const c = client(), data = adventure('blessing');
		data.run.blessings = {owned: [], pending: [], round: {floor: 1, tier: 'gold', remaining: 1,
			options: [{id: 'probe', name: '测试', text: '介绍', tier: 'gold', refreshes: 0, chosen: false}]}};
		c.room.receiveState(data);
		assert(c.room.html.includes('更换整批品阶 · 本局 1 次'));
		c.room.changeBlessingQuality(); assert(c.sent.at(-1).includes('"action":"blessingquality"'));
		c.room.pending = null; data.run.blessings.qualityRerolled = true; c.room.receiveState(data);
		assert(c.room.html.includes('本局更换机会已使用'));
		data.run.blessings.qualityLocked = true; c.room.receiveState(data);
		assert(!c.room.html.includes('name="changeBlessingQuality"'));
	});
	it('shows all collapse options, requires the tier quota and locks the saved combination in a run', () => {
		const c = client(), data = state(); data.configured = true; data.account.preferredDifficulty = 1;
		data.starters = [{id: 'bulbasaur', species: 'Bulbasaur', available: true}];
		data.difficulties = [{id: 0, name: '基础', unlocked: true}, {id: 1, name: '进阶', unlocked: true}];
		data.collapseEntries = Array.from({length: 10}, (_, n) => ({id: 'entry' + n, name: '词条' + n, text: '简述' + n, detail: '详细' + n}));
		c.room.receiveState(data); c.room.selectedStarters = ['bulbasaur'];
		assert.equal((c.panel.html.match(/name="collapse"/g) || []).length, 10);
		c.room.startAdventure(); assert(!c.sent.some(s => s.includes('"action":"start"'))); assert(c.room.error.includes('2 条'));
		for (const id of ['entry0', 'entry1']) c.panel.changeCollapse({currentTarget: {value: id}});
		assert(c.panel.html.includes('value="entry2" disabled'));
		c.room.startAdventure(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.deepEqual(request.collapse, ['entry0', 'entry1']); assert.equal(request.action, 'start');
		c.room.pending = null; const running = adventure('ready');
		Object.assign(running, {collapseEntries: data.collapseEntries, difficulties: data.difficulties});
		Object.assign(running.run, {difficulty: 1, difficultyRulesVersion: 2, collapse: ['entry0', 'entry1']});
		c.room.receiveState(running);
		assert(c.panel.html.includes('幻想崩坏')); assert(c.panel.html.includes('详细0')); assert(!c.panel.html.includes('name="collapse"'));
		c.panel.changeCollapse({currentTarget: {value: 'entry2'}}); assert.equal(c.room.selectedCollapse.length, 2);
		running.run.difficultyRulesVersion = 1; c.room.receiveState(running);
		assert(c.panel.html.includes('保留原难度规则')); assert(!c.panel.html.includes('详细0'));
		assert(!c.html.includes('准备好了，出发'));
	});
	it('shows capture-quality rewards without an unselected common battle mechanism', () => {
		const c = client(), data = state(); data.configured = true; data.account.preferredDifficulty = 5;
		data.difficulties = [{id: 5, name: '5 档', unlocked: true, text: '普通野生个体值约 28，精英绝大多数单项为 31。'}];
		data.collapseEntries = [{id: 'power', name: '力量增幅', text: '伤害提高 15%。', detail: '仅普通直接伤害。'}];
		c.room.receiveState(data);
		assert(c.panel.html.includes('普通野生个体值约 28'));
		assert(c.panel.html.includes('伤害提高 15%')); assert(!c.panel.html.includes('崩坏蓄能'));
	});
	it('keeps the same accessible detail button when expanding a collapse row', () => {
		const c = client(), data = state(); data.configured = true; data.account.preferredDifficulty = 1;
		data.difficulties = [{id: 1, name: '进阶', unlocked: true}];
		data.collapseEntries = [{id: 'stats', name: '数值膨胀', text: '六项能力提升。', detail: '详细的能力规则。'}];
		c.room.receiveState(data);
		const button = html => html.match(/<button[^>]+name="toggleCollapseDetail"[^>]*>[\s\S]*?<\/button>/)[0];
		const before = button(c.panel.html);
		assert(before.includes('aria-expanded="false"'));
		c.room.toggleCollapseDetail('stats');
		const after = button(c.panel.html);
		assert(after.includes('aria-expanded="true"'));
		assert.equal(before.replace('false', 'true').replace('▸', '▾'), after);
		assert(c.panel.html.indexOf(after) < c.panel.html.indexOf('详细的能力规则。'));
		c.room.toggleCollapseDetail('stats'); assert.equal(button(c.panel.html), before);
	});
	it('waits for authentication before showing access denial and offers a retry after upkeep failure', () => {
		const c = client(); c.app.user.loaded = false;
		const data = {...state(), enabled: false}; c.room.receiveState(data);
		assert(!c.room.html.includes('当前账号未开放'));
		const before = c.sent.length; c.room.refresh(); assert.equal(c.sent.length, before);
		const original = c.app.user.get;
		c.app.user.loaded = true;
		c.app.user.get = key => key === 'loginState' ? 'error' : key === 'loginError' ? '自动登录暂未完成' : original(key);
		c.room.render(); assert(c.room.html.includes('name="retryLogin"'));
		let retries = 0; c.app.user.retryLogin = () => retries++; c.room.retryLogin(); assert.equal(retries, 1);
		c.app.user.get = key => key === 'loginState' ? 'ready' : original(key);
		c.room.render(); assert(c.room.html.includes('当前账号未开放'));
		c.app.emit('login:state'); assert(c.sent.length > before);
	});
	it('resets only the left pane on a new event stage, but preserves its position on ordinary updates', () => {
		const c = client(), data = adventure('event');
		const content = {scrollTop: 0};
		c.room.$el[0] = {querySelector: selector => selector === '.rogue-game-content' ? content : null};
		data.run.event = {id: 'test', key: 'same-event', stage: 'choice', title: '测试', paragraphs: [], options: [{id: 'talk', name: '交谈', text: '继续对话'}]};
		c.room.receiveState(data); c.room.scroll = 700;
		content.scrollTop = 900;
		let rightScroll = 380; c.panel.$el.scrollTop = n => { if (n !== undefined) rightScroll = n; return rightScroll; };
		data.account.revision++; c.room.receiveState(data); assert.equal(c.room.scroll, 700); assert.equal(rightScroll, 380);
		assert.equal(content.scrollTop, 900);
		data.run.event.stage = 'result'; data.run.event.options = [{id: 'leave', text: '离开'}];
		c.room.receiveState(data); assert.equal(c.room.scroll, 0); assert.equal(rightScroll, 380);
		assert.equal(content.scrollTop, 0);
		c.room.scroll = 500; data.run.floor++; c.room.receiveState(data); assert.equal(c.room.scroll, 0);
	});
	it('links move and ability references but keeps collapse out of the Fantasy codex', () => {
		const c = client(true, true, {BattleMovedex: {swordsdance: {}, stealthrock: {}}, BattleAbilities: {hugepower: {}}});
		c.Dex.moves.get = id => id === 'stealthrock' ? {name: 'Stealth Rock', type: 'Rock', category: 'Status', pp: 20,
			desc: 'Updated untranslated hazard description.', shortDesc: 'Hurts foes on switch-in. Factors Rock weakness.'} :
			{name: 'Swords Dance', type: 'Normal', category: 'Status', pp: 20, desc: 'Raises the user\'s Attack by 2.'};
		c.Dex.abilities.get = id => ({name: id === 'hugepower' ? 'Huge Power' : 'Rogue Great Mage', desc: 'Ability effect.'});
		c.room.receiveState(state()); c.room.openCodex('blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'powerchoice', family: 'powerchoice', tier: 'prismatic', unlocked: true, name: '大力士？大法师！', text: '获得【大力士】或【大法师】，并学会【剑舞】和【隐形岩】。'},
		]});
		for (const id of ['hugepower', 'roguegreatmage', 'swordsdance']) assert(c.room.html.includes('data-reference-id="' + id + '"'));
		assert(c.room.html.includes('特攻变为原来的 2 倍。'));
		assert(c.room.html.includes('对换入者造成按岩石属性相性计算的伤害'));
		assert(!c.room.html.includes('Updated untranslated hazard description.'));
		c.room.openCodex('guide'); c.room.receiveCodex({userid: 'rogueplayer', section: 'guide', guide: {modules: {},
			collapse: [{id: 'critical', name: '要害防护', text: '基础要害额外伤害减半。'}]}});
		assert.equal(c.room.codexFilter, 'beginner');
		assert(!c.room.html.includes('value="collapse"')); assert(!c.room.html.includes('基础要害额外伤害减半'));
	});
	it('selects difficulty before departure and retains globally unlocked random spirit access', () => {
		const c = client(), data = state();data.configured=true;
		data.starters=[{id:'bulbasaur',species:'Bulbasaur',available:true}];
		data.account.spiritUnlocked=true;
		data.difficulties=[{id:0,name:'0 档',text:'基础',unlocked:true,spirit:true},
			{id:1,name:'1 档',text:'进阶',rewards:'高资质伙伴',unlocked:true,spirit:true},
			{id:2,name:'2 档',text:'进阶',unlocked:false,spirit:true},
			{id:'easy',name:'护符庇佑',text:'练习',unlocked:true,spirit:true}];
		c.room.receiveState(data);assert(c.html.includes('name="useSpirit"'));assert(!c.panel.html.includes('<option value="2"'));
		assert(!c.room.html.includes('select name="difficulty"')); assert(c.panel.html.includes('select name="difficulty"'));
		assert(c.panel.html.includes('value="default" selected')); assert(c.panel.html.includes('value="easy"'));
		c.room.useSpirit=true;c.panel.changeDifficulty({currentTarget:{value:'1'}});
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).action,'setdifficulty');
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).value,'1');
		c.room.pending=null; data.account.preferredDifficulty=1; data.account.revision++; c.room.receiveState(data);
		assert.equal(c.room.useSpirit,false);assert(c.html.includes('name="useSpirit"'));assert(c.html.includes('高资质伙伴'));
		c.room.selectedStarters=['bulbasaur'];c.room.startAdventure();
		const request=JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));assert.equal(request.difficulty,undefined);
		assert.equal(request.useSpirit,false);
	});
	it('renders charm decisions and exact acquisition effects, and submits each distinct action', () => {
		for(const value of ['accept','decline']) {
			const c=client(),data=adventure('story');
			data.story={stage:'charm',title:'临行前的护符',text:'它能**帮你压一压对手的力量，也能让你避开那些太强的家伙**。',charmText:'本局个体值上限为 10。'};
			data.story.charmProgressNotice = '**本局新学招式（包括学习机）不会跨局解锁**。已有解锁仍保留。';
			c.room.receiveState(data);assert(c.html.includes('压一压对手'));assert(!c.html.includes('个体值上限为 10'));
			assert(c.html.includes('<strong>帮你压一压对手的力量，也能让你避开那些太强的家伙</strong>'));
			assert(c.html.includes('<strong>本局新学招式（包括学习机）不会跨局解锁</strong>'));
			assert(c.html.indexOf('已有解锁仍保留') < c.html.indexOf('name="chooseCharm"'));
			assert(c.html.includes('接过护符（难度降低，推荐新手选择）'));
			assert(!c.html.includes('name="storyNext"'));
			c.room.chooseCharm(value);const request=JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));assert.equal(request.action,'charm');
			assert.equal(request.value,value);
		}
	});
	it('opens the charm receipt once, resumes it on reload and guards acknowledgement across account changes', () => {
		const c=client(),data=adventure('story');data.run.id='charm-receipt';data.story={stage:'charmeffect',title:'护符庇佑'};
		data.run.charm={name:'替身护符',description:'本局个体值上限为 15。\n\n**不获得局外成长点数**。<img src=x onerror=alert(1)>'};
		c.room.receiveState(data);assert.equal(c.app.lastPopup.type,c.RogueCharmPopup);
		const popup=Object.create(c.RogueCharmPopup);popup.$el={addClass(){},html(value){popup.html=value;}};popup.close=()=>{};
		popup.initialize({room:c.room});assert(popup.html.includes('tempting-charm.webp'));assert(popup.html.includes('个体值上限为 15'));
		assert(popup.html.includes('</p><p><strong>不获得局外成长点数</strong>'));
		assert(!popup.html.includes('<img src=x')); assert(popup.html.includes('&lt;img'));
		assert(!c.html.includes('准备好了，出发'));assert(!c.html.includes('返回配置'));assert(!c.html.includes('name="confirmDifficulty"'));
		c.app.lastPopup=null;c.room.receiveState(data);assert.equal(c.app.lastPopup,null);
		const reload=client();reload.room.receiveState(data);assert.equal(reload.app.lastPopup.type,reload.RogueCharmPopup);
		c.setUser('anotheruser');popup.acceptCharm();assert.equal(c.sent.length,0);
		c.setUser('rogueplayer');popup.acceptCharm();assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).action,'charmack');
	});
	it('shows the non-tradeable charm, exact current scales and advanced supplies in the bag', () => {
		const c=client(),data=adventure('ready');data.run.difficulty='easy';data.run.difficultyLabel='护符庇佑';
		data.run.difficultyScales={player:0.9,opponent:0.65};data.run.charm={name:'替身护符',description:'**不获得局外成长点数**。\n\n**新学招式不会跨局解锁**。'};
		data.run.difficultyTest=true;
		c.room.receiveState(data);c.room.showCharm();assert.equal(c.app.lastPopup.type,c.RogueCharmPopup);
		const popup=Object.create(c.RogueCharmPopup);popup.$el={addClass(){},html(value){popup.html=value;}};popup.initialize({room:c.room});
		assert(popup.html.includes('我方 90.0%'));assert(popup.html.includes('对手 65.0%'));
		assert(!c.html.includes('本地测试（不解锁档位）'));assert(!c.panel.html.includes('select name="difficulty"'));assert(c.panel.html.includes('本局已锁定'));
		assert(c.html.includes('本局护符 · 不占携带道具位'));assert(!c.html.includes('value="use:oldcharm"'));assert(!c.html.includes('value="sell:oldcharm"'));
		assert(c.html.includes('<strong>不获得局外成长点数</strong>'));
		assert(c.html.includes('</p><p><strong>新学招式不会跨局解锁</strong>'));
		const size=require('image-size')(require.resolve('../play.pokemonshowdown.com/sprites/fantasy-rogue/key-items/tempting-charm.webp'));
		assert.equal(size.width,128);assert.equal(size.height,128);
		data.run.difficulty=5;data.run.difficultyLabel='5 档';delete data.run.charm;data.run.difficultyRewards='道馆首胜额外碎片 ×10';
		c.room.receiveState(data);assert(c.html.includes('本档捕捉品质'));assert(c.html.includes('道馆首胜额外碎片 ×10'));
	});
	it('shows and submits the captured shiny starter choice without granting a locked option', () => {
		for (const unlocked of [false, true]) {
			const c = client(), data = state(); data.configured = true;
			data.starters = [{id: 'slugma', species: 'Slugma', available: true, traits: {shiny: unlocked}}];
			c.room.receiveState(data); c.room.changeStarter({currentTarget: {value: 'slugma', checked: true}});
			c.room.confirmStarters();
			const popup = Object.create(c.RogueStarterPopup);
			popup.$el = {addClass() {}, html: html => {popup.html = html;}};
			popup.$ = () => ({text() {}}); popup.close = () => {};
			popup.initialize(c.app.lastPopup.data);
			assert.equal(popup.html.includes('name="shiny"'), unlocked);
			const form = {nature: 'random', gender: 'random', ability: 'random', shiny: 'yes'};
			for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) form['iv-' + stat] = '20';
			popup.submit(form);
			if (!unlocked) {assert.equal(c.sent.length, 0); continue;}
			const command = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
			assert.equal(command.starterBuilds.slugma.shiny, true);
		}
	});
	it('keeps party portraits free of stars and does not insert an extra wild-preview stage', () => {
		const c = client(), data = adventure('ready');
		data.run.team[0].set.shiny = true;
		data.run.wildEncounter = {name: '野生伙伴', team: [
			{species: 'Bulbasaur', level: 5, gender: 'M', shiny: true}, {species: 'Pikachu', level: 5, shiny: false},
		]};
		c.room.receiveState(data);
		assert(!c.panel.html.includes('rogue-preview-shiny'));
		assert(!c.room.html.includes('野生宝可梦战前预览'));
		assert(!c.room.html.includes('rogue-wild-preview'));
		assert(c.room.html.includes('value="battle"'));
		delete data.run.wildEncounter; data.account.revision++;
		c.room.receiveState(data);
		assert(!c.html.includes('rogue-preview-shiny'));
	});
	it('translates unspaced Pinyin abilities in companion choices and mixed descriptions', () => {
		const c = client(false, true), data = adventure('event');
		data.run.event = {title: '紫芋的指导', stage: 'choice', key: 'translation', paragraphs: [], options: [
			{id: 'ability:tianlaizhiyin', name: '改为【tianlaizhiyin】', text: '特性【heianqinshi】与招式【dianshanxunji】'},
		]};
		c.room.receiveState(data);
		assert(c.room.html.includes('改为【天籁之音】'));
		assert(c.room.html.includes('特性【黑暗侵蚀】与招式【电闪迅击】'));
		assert(c.room.html.includes('value="ability:tianlaizhiyin"'));
	});
	it('translates species embedded in snack-war buttons, descriptions and results', () => {
		const c = client(false, true), data = state();
		data.run = {floor: 4, maxFloor: 200, phase: 'event', team: [], bag: {}, boosts: {}, money: 1000,
			node: {kind: 'event', name: '粗点心战争', encounters: [], event: {id: 'snacks', stage: 'choice', key: 'test'}},
			event: {title: '粗点心战争', stage: 'choice', key: 'test', paragraphs: ['【Popplio】开心地享用了点心。'],
				options: ['Popplio', 'Munna', 'Dedenne'].map((name, i) => ({id: 'snack:' + i,
					name: '送给【' + name + '】一份点心 · 92 金币', text: '与【' + name + '】更亲近。'}))}};
		c.room.receiveState(data);
		for (const name of ['球球海狮', '食梦梦', '咚咚鼠']) assert(c.html.includes('送给【' + name + '】'), name);
		for (const name of ['Popplio', 'Munna', 'Dedenne']) assert(!c.html.includes(name), name);
	});
	it('starts flat, groups on demand and preserves filtering in both layouts', () => {
		const c = client(), data = state(); data.configured = true;
		data.starters = [{id: 'bulbasaur', species: 'Bulbasaur', gen: 1, types: ['Grass', 'Poison'], available: true},
			{id: 'ferroseed', species: 'Ferroseed', gen: 5, types: ['Grass', 'Steel'], available: true}];
		c.room.receiveState(data);
		assert(!c.html.includes('<details data-rogue-key="starter-gen-1">'));
		c.room.setStarterLayout('generations');
		assert(c.html.includes('<details data-rogue-key="starter-gen-1">'));
		assert(c.html.includes('<details data-rogue-key="starter-gen-5">'));
		c.room.filterStarterType({currentTarget: {value: 'Steel'}});
		assert(c.html.includes('value="ferroseed"')); assert(!c.html.includes('value="bulbasaur"'));
		c.room.setStarterLayout('flat');assert(!c.html.includes('<details data-rogue-key="starter-gen-5">'));
		assert(c.html.includes('value="ferroseed"'));assert(!c.html.includes('value="bulbasaur"'));
		c.room.filterStarterType({currentTarget:{value:''}});assert(c.html.includes('value="bulbasaur"'));
	});
	it('groups all move origins in categories, then filters by type and shows priority', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('guide');
		const move = {type: 'Normal', category: 'Physical', power: 40, accuracy: 100, pp: 30, priority: 1, groups: ['all', 'contact']};
		c.room.receiveCodex({userid: 'rogueplayer', section: 'guide', guide: {moveCategories: {all: '全部招式', contact: '接触类'}, modules: {
			moves: [{...move, id: 'old', name: 'A Native', origin: 'original'}, {...move, id: 'new', name: 'Z Fantasy', origin: 'fantasy'},
				{...move, id: 'water', name: 'Water', origin: 'original', type: 'Water'}]}}});
		c.room.filterCodex('moves:contact');
		assert(c.html.indexOf('<h3>Z Fantasy') < c.html.indexOf('<h3>A Native'));
		assert(c.html.includes('先制度+1')); assert(c.html.includes('原版招式'));
		c.room.filterCodexType({currentTarget: {value: 'Water'}});
		assert(c.html.includes('<h3>Water')); assert(!c.html.includes('<h3>A Native'));
	});
	it('uses local type-colored TM discs and key-item icons in bag and codex', () => {
		const c = client(), data = adventure('ready');
		data.items.push({id: 'tmvinewhip', kind: 'machine', name: '藤鞭学习机', move: 'vinewhip'},
			{id: 'dnasplicers', kind: 'forme', name: '基因之楔', icon: 'dna-splicers'});
		data.run.bag.tmvinewhip = data.run.bag.dnasplicers = 1; c.room.receiveState(data);
		assert(c.html.includes('sprites/fantasy-rogue/tm/grass.png'));
		assert(c.html.includes('sprites/fantasy-rogue/key-items/dna-splicers.png'));
		c.room.openCodex('guide');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'guide', guide: {modules: {}, itemNotes: [data.items.at(-1)]}});
		c.room.filterCodex('special'); assert(c.room.html.includes('sprites/fantasy-rogue/key-items/dna-splicers.png'));
	});
	it('uses reviewed Fantasy suffixes in both names and embedded Chinese references', () => {
		const c = client(true, true, {Gen9fantasyMovedex: {razorwind: {}}, Gen9fantasyAbilities: {cutecharm: {}, poisonpuppeteer: {}}});
		c.Dex.moves.get = () => ({name: 'Razor Wind🔄'});
		c.Dex.abilities.get = id => ({name: id === 'cutecharm' ? 'Cute Charm+' : 'Poison Puppeteer'});
		c.room.receiveState(state()); c.room.openCodex('blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'test', family: 'test', tier: 'gold', unlocked: true, name: '文本测试', text: '【迷人之躯】【毒傀儡🔄】【旋风刀】【Cute Charm】'},
		]});
		const visible = c.room.html.replace(/<[^>]*>/g, '');
		assert(visible.includes('【迷人之躯+】'));
		assert(visible.includes('【毒傀儡】')); assert(!visible.includes('毒傀儡🔄'));
		assert(visible.includes('【旋风刀🔄】'));
		assert(c.room.html.includes('data-reference-id="cutecharm"'));
	});
	it('offers an ecology guide with anonymous black silhouettes and named caught pixel icons', () => {
		const c = client(true), calls = []; c.room.receiveState(state()); c.room.openCodex('events');
		c.Dex.getPokemonIcon = name => {calls.push(name); return 'background-position:0 0;';};
		c.room.receiveCodex({userid: 'rogueplayer', codexSchema: 5, section: 'events', entries: [
			{id: 'biome01', category: 'ecology', unlocked: true, name: '绿茵森林', text: '在这里捕捉', pokemon: [{species: 'Caterpie', caught: false}, {species: 'Weedle', caught: true}], visitors: [{species: 'Paras', caught: false}]},
		]});
		c.room.filterCodex('ecology');
		assert(c.room.html.includes('生态区域')); assert(c.room.html.includes('绿茵森林'));
		assert(!c.room.html.includes('undefined'));
		assert(c.room.html.includes('生态池 · 已捕捉 1 / 2'));
		assert(c.room.html.includes('rogue-biome-icon is-unknown'));
		assert(!c.room.html.includes('Caterpie') && !c.room.html.includes('Paras'));
		assert(c.room.html.includes('title="Weedle"') && c.room.html.includes('aria-label="Weedle"'));
		assert.deepEqual(calls.slice(-3), ['Caterpie', 'Weedle', 'Paras']);
		const css = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/style/fantasy-rogue.css'), 'utf8');
		assert(css.includes('.rogue-biome-icon.is-unknown .picon { filter: brightness(0); }'));
	});
	it('uses the matching local Leader Crest sprite in evolution-item cards', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('guide');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'guide', guide: {intro: [], modules: {items: [
			{id: 'leaderscrest', name: '头领凭证', kind: 'evolution', icon: 'leaderscrest', text: '使用后进化'},
		]}}});
		c.room.filterCodex('items');
		assert(c.room.html.includes('sprites/fantasy-rogue/leaderscrest.png'));
		assert(fs.statSync(require.resolve('../play.pokemonshowdown.com/sprites/fantasy-rogue/leaderscrest.png')).size > 100);
	});
	it('uses the server guide for both first-play onboarding and the permanent codex', () => {
		const c = client(true), data = state(), popups = [];
		data.codexSchema = 5;
		data.account.needsOnboarding = true;
		data.beginnerGuide = [{title: '两个同行名额', text: '累计 **15 次偏好选择**领取赠礼。**<script>**'}];
		c.app.curRoom = c.room; c.app.addPopup = (type, detail) => popups.push({type, detail});
		c.room.receiveState(data); c.room.enterGame();
		const popup = Object.create(popups[0].type); let html;
		popup.$el = {addClass() {}, html: value => {html = value;}};
		popup.initialize(popups[0].detail);
		assert(html.includes('两个同行名额')); assert(html.includes('15 次'));
		assert(!html.includes('<script>'));
		assert(html.includes('<strong>15 次偏好选择</strong>'));
		assert(html.includes('<strong>&lt;script></strong>'));
		c.room.openCodex('guide');
		c.room.receiveCodex({userid: 'rogueplayer', codexSchema: 5, section: 'guide',
			guide: {intro: [], beginner: data.beginnerGuide, modules: {}}});
		c.room.filterCodex('beginner');
		assert(c.room.html.includes('两个同行名额')); assert(!c.room.html.includes('<script>'));
		assert(c.room.html.includes('<strong>15 次偏好选择</strong>'));
		assert(!c.room.html.includes('图鉴与当前客户端的版本不一致'));
		c.room.receiveCodex({userid: 'rogueplayer', codexSchema: 3, section: 'guide', guide: {intro: [], modules: {}}});
		assert(c.room.html.includes('图鉴与当前客户端的版本不一致'));
		c.room.receiveCodex({userid: 'rogueplayer', section: 'guide', guide: {intro: [], modules: {}}});
		assert(c.room.html.includes('图鉴与当前客户端的版本不一致'));
	});
	it('reloads open codices after a content update and ignores stale version responses', () => {
		const c = client(true), first = state(); first.contentVersion = 'old'; c.room.receiveState(first);
		c.room.openCodex('events');
		c.room.receiveCodex({userid: 'rogueplayer', contentVersion: 'old', section: 'events', revision: 99, entries: []});
		const next = {...first, contentVersion: 'new', account: {...first.account, revision: 2}};
		c.room.receiveState(next); assert.equal(c.room.codices.events, undefined);
		assert.equal(c.sent.at(-1), '/cmd fantasyroguecodex events');
		c.room.receiveCodex({userid: 'rogueplayer', contentVersion: 'old', section: 'events', revision: 99, entries: []});
		assert.equal(c.room.codices.events, undefined);
		c.room.receiveCodex({userid: 'rogueplayer', contentVersion: 'new', section: 'events', revision: 2, entries: [{id: 'trainer:atticus', portrait: 'atticus', category: 'trainer', roles: ['antagonist'], name: '秋明', text: '', unlocked: true}]});
		c.room.selectCodexCollection('companions');
		assert(c.room.html.includes('atticus.png?v=20261020-reference-v2'));
	});
	it('marks the selected category in all three codices and in nested guide filters', () => {
		const c = client(true); c.room.receiveState(state());
		c.room.codices.guide = {guide: {intro: [], modules: {items: [], moves: [], abilities: [], pokemon: []}}};
		c.room.codices.blessings = {entries: []}; c.room.codices.events = {entries: []};
		for (const [screen, filter, expected] of [
			['guide', 'pokemon', ['幻想宝可梦']], ['guide', 'exclusive', ['道具', '专属道具']],
			['guide', 'movesenhanced', ['招式', '原版招式增强']], ['blessings', 'gold', ['黄金']],
			['events', 'trade', ['交易']],
		]) {
			c.room.screen = screen; c.room.codexFilter = filter;
			const html = c.room.renderCodex();
			const active = [...html.matchAll(/<button[^>]*class="button is-active"[^>]*name="filterCodex"[^>]*>([^<]+)<\/button>/g)];
			assert.deepEqual(active.map(match => match[1]), expected);
			assert(active.every(match => match[0].includes('aria-pressed="true"')));
		}
		c.room.codexCollection = 'companions'; c.room.codexFilter = 'gym';
		const html = c.room.renderCodex();
		assert.match(html, /class="button is-active"[^>]*value="companions"[^>]*aria-pressed="true"/);
		assert.match(html, /class="button is-active"[^>]*aria-pressed="true"[^>]*value="gym"/);
	});
	it('shows encountered status without exposing locked trainer descriptions', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('events');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: [
			{id: 'trainer:brock', name: '小刚', category: 'trainer', portrait: 'brock', roles: ['gym'], unlocked: false, text: '？？？'},
			{id: 'trainer:mewtwo', name: '幻想超梦', category: 'trainer', portrait: 'mewtwo', roles: ['other'], unlocked: true, text: '塔顶的对手'},
		]});
		c.room.selectCodexCollection('companions');
		assert(c.room.html.includes('已遇见 <b>1 / 2</b>'));
		assert(c.room.html.includes('尚未遇见')); assert(c.room.html.includes('已遇见过'));
		assert(c.room.html.includes('rogue-dialogue/brock.png'));
		assert(c.room.html.includes('rogue-mewtwo-bust rogue-codex-single-portrait'));
		assert(c.room.html.includes('mewtwo-official.png'));
		c.room.codexSearchMode = 'content'; c.room.codexQuery = '道馆';
		assert(!c.room.renderCodex().includes('<h3>小刚</h3>'));
	});
	it('groups every rival chapter from one to eight and keeps the rival portrait in replay pages', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('events');
		const entries = [8, 4, 7, 1, 5, 2, 6, 3].map(chapter => ({id: 'rival:marnie:' + chapter,
			name: '与玛俐的相遇·其' + '一二三四五六七八'[chapter - 1], portrait: 'marnie', category: 'adventure', unlocked: true, text: '故事'}));
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries}); c.room.codexFilter = 'adventure';
		const html = c.room.renderCodex();
		let previous = -1;
		for (let chapter = 1; chapter <= 8; chapter++) {
			const position = html.indexOf('<h3>与玛俐的相遇·其' + '一二三四五六七八'[chapter - 1]);
			assert(position > previous); previous = position;
		}
		c.room.codexReplay = {title: '与玛俐的相遇·其一', pages: {start: {portrait: 'marnie', text: ['我叫玛俐。'], options: []}}};
		c.room.codexReplayHistory = ['start'];
		assert(c.room.renderCodex().includes('rogue-reading-portrait'));
	});
	it('sorts translated guide and event names by pinyin before pagination without mutating source entries', () => {
		const c = client(false, true); c.room.screen = 'guide'; c.room.codexFilter = 'items';
		const entries = [{id: 'x', name: '伤药', text: ''}, {id: 'z', name: '安抚之铃', text: ''}, {id: 'a', name: '木炭', text: ''}];
		c.room.codices.guide = {guide: {intro: [], modules: {items: entries}}};
		const html = c.room.renderCodex();
		assert(html.indexOf('<h3>安抚之铃') < html.indexOf('<h3>木炭'));
		assert(html.indexOf('<h3>木炭') < html.indexOf('<h3>伤药'));
		assert.equal(entries[0].name, '伤药');
		c.room.screen = 'events'; c.room.codexFilter = 'all';
		c.room.codices.events = {entries: entries.map(e => ({...e, unlocked: true, category: 'event'}))};
		const events = c.room.renderCodex();
		assert(events.indexOf('<h3>安抚之铃') < events.indexOf('<h3>伤药'));
	});
	it('keeps regional events and companion people in separate codex collections', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('events');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: [
			{id: 'forest', name: '斗蛐蛐', category: 'event', unlocked: true, text: '观察伙伴'},
			{id: 'reward:test', name: '旅途补给', category: 'reward', unlocked: false, text: '？？？'},
			{id: 'companion:bea', name: '彩豆', category: 'companion', unlocked: true, text: '偏好战斗'},
		]});
		assert(c.room.html.includes('<h3>斗蛐蛐</h3>')); assert(!c.room.html.includes('<h3>彩豆</h3>'));
		assert(c.room.html.includes('<b>1 / 2</b>'));
		c.room.codexFilter = 'reward'; c.room.codexPage = 3;
		c.room.selectCodexCollection('companions');
		assert.equal(c.room.codexFilter, 'all'); assert.equal(c.room.codexPage, 0);
		assert(c.room.html.includes('<h3>彩豆</h3>')); assert(!c.room.html.includes('<h3>斗蛐蛐</h3>'));
		assert(!c.room.html.includes('name="filterCodex" value="reward"'));
		assert(c.room.html.includes('<b>1 / 1</b>'));
		c.room.codexQuery = '战斗'; c.room.codexSearchMode = 'content'; c.room.render();
		assert(c.room.html.includes('<h3>彩豆</h3>'));
		c.room.selectCodexCollection('regions'); assert(!c.room.html.includes('<h3>彩豆</h3>'));
	});
	it('filters all portrait trainers by identity and keeps shared identities in each matching section', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('events');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: [
			{id: 'companion:bea', name: '彩豆', category: 'companion', portrait: 'bea', roles: ['companion', 'gym'], unlocked: true},
			{id: 'companion:lacey', name: '紫芋', category: 'companion', portrait: 'lacey', roles: ['companion', 'elitefour'], unlocked: true},
			{id: 'trainer:maxie', name: '赤焰松', category: 'trainer', portrait: 'maxie', roles: ['antagonist'], unlocked: true},
		]});
		c.room.selectCodexCollection('companions');
		for (const role of ['companion', 'gym', 'elitefour', 'champion', 'antagonist', 'other']) assert(c.room.html.includes('value="' + role + '"'));
		assert(c.room.html.includes('rogue-dialogue/lacey.png?v=20261019b'));
		assert(c.room.html.includes('rogue-dialogue/maxie.png'));
		c.room.filterCodex('gym'); assert(c.room.html.includes('<h3>彩豆</h3>')); assert(!c.room.html.includes('<h3>紫芋</h3>'));
		c.room.filterCodex('companion'); assert(c.room.html.includes('<h3>紫芋</h3>')); assert(!c.room.html.includes('<h3>赤焰松</h3>'));
	});
	it('deduplicates blessing floor notes from older server responses and other repeated restrictions', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'reorganizer', name: '变形重组器', text: '保留培养。', tier: 'silver', unlocked: true, floors: [50],
				availability: ['仅第50层出现', '仅第 50 层出现', '需有可升星伙伴', '需有可升星伙伴']},
		]});
		assert.equal((c.room.html.match(/仅第\s*50\s*层出现/g) || []).length, 1);
		assert.equal((c.room.html.match(/需有可升星伙伴/g) || []).length, 1);
	});
	it('shows prerequisites as title notes, clears searches immediately and links Top Clear Mind', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'prayer', family: 'prayer', name: '聚集的祈愿', text: '完成后获得【Top Clear Mind】。', tier: 'gold', unlocked: true, floors: [1], availability: ['队伍需有对应伙伴']},
			{id: 'topclearmind', family: 'topclearmind', name: 'Top Clear Mind', text: '先制度 +0.5', tier: 'prismatic', unlocked: true},
		]});
		assert(c.room.html.includes('<small class="rogue-blessing-restriction">队伍需有对应伙伴</small>'));
		assert(c.room.html.includes('name="jumpBlessing"'));
		c.room.codexQuery = '先制度'; c.room.codexSearchMode = 'content'; c.room.render();
		assert(c.room.html.includes('Top Clear Mind')); assert(!c.room.html.includes('<h3>聚集的祈愿</h3>'));
		c.room.codexSearchInput({currentTarget: {value: ''}});
		assert.equal(c.room.codexQuery, ''); assert(c.room.html.includes('<h3>聚集的祈愿</h3>'));
		c.room.codexQuery = '聚集'; c.room.codexFilter = 'gold'; c.room.jumpBlessing();
		assert.equal(c.room.codexQuery, ''); assert.equal(c.room.codexFilter, 'all');
	});
	it('scrolls the actual shop section and renders permanent gains below the stat table', () => {
		const c = client(), data = adventure(); data.run.growth = {offense: 400, defense: 300, experience: 0};
		c.room.receiveState(data);
		assert(c.html.indexOf('能力与努力值') < c.html.indexOf('局外能力加成'));
		assert(c.html.indexOf('局外能力加成') < c.html.indexOf('本局训练'));
		let targetOptions;
		c.room.$ = selector => selector === '[data-shop-category="2"]' ? [{scrollIntoView(options) { targetOptions = options; }}] : [];
		c.room.jumpShopGroup('2'); assert.equal(targetOptions.block, 'start');
		assert.equal(targetOptions.behavior, 'smooth');
		targetOptions = undefined; c.room.jumpShopGroup('bad'); assert.equal(targetOptions, undefined);
	});
	it('uses Chinese custom species, move names, evolution items and short ability descriptions', () => {
		const c = client(false, true), data = adventure();
		for (const [name, kind, expected] of [['Pidgeot-Fantasy', '', '幻想大比鸟'], ['Bian Huan Zi You', '', '变换自由'],
			['Protean', '', '变幻自如'], ['Disable', 'move', '定身法'], ['Psychic', 'move', '精神强念'],
			['Refresh', 'move', '焕然一新'], ['Metronome', 'move', '挥指'], ['blackaugurite', '', '黑奇石']]) {
			assert.equal(c.translateRogueName(name, kind), expected);
		}
		c.Dex.abilities.get = id => ({name: 'Bian Huan Zi You', shortDesc: '自身属性变为即将使用的招式的属性', desc: 'An untranslated long description.'});
		data.run.team[0].extraAbilities = ['bianhuanziyou']; data.run.team[0].set.species = 'Pidgeot-Fantasy'; c.room.receiveState(data);
		assert(c.html.includes('幻想大比鸟'));
		const popup = Object.create(c.RogueExtraAbilitiesPopup); let html;
		popup.$el = {addClass() {}, html(value) {html = value;}}; popup.initialize({member: data.run.team[0]});
		assert(html.includes('变换自由')); assert(html.includes('自身属性变为')); assert(!html.includes('untranslated'));
	});
	it('renders Compound V allocation and sends only a complete six-stat budget', () => {
		const c = client(false, false, {$: element => ({closest: () => ({find: () => ({text: value => {element.final = value;}})})})});
		const data = adventure('blessing'), mon = data.run.team[0];
		const baseStats = {hp: 60, atk: 95, def: 80, spa: 60, spd: 80, spe: 30};
		const reward = {id: 'compound', kind: 'compound', title: '五号化合物·金', options: [],
			compound: {stage: 'allocate', member: mon.id, final: 'Parasect', points: 120, baseStats}};
		data.run.blessings = {owned: [], pending: [reward], shards: 0}; c.room.receiveState(data);
		assert(c.room.html.includes('rogue-compound-allocation')); assert(c.room.html.includes('剩余可分配：120 点'));
		assert.equal((c.room.html.match(/name="compound-/g) || []).length, 6);
		const inputs = Object.keys(baseStats).map(stat => ({name: 'compound-' + stat, value: stat === 'atk' ? '119' : '0'}));
		c.room.controls['.rogue-compound-allocation input'] = inputs;
		const sent = c.sent.length; c.room.applyCompound(); assert.equal(c.sent.length, sent);
		inputs[1].value = '120'; c.room.applyCompound();
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'blessingreward'); assert.equal(command.value, 'allocate'); assert.equal(command.evs.atk, 120);
		assert.equal(inputs[1].final, 215);
	});
	it('stores Compound V and exposes a later use action only while outside a battle', () => {
		const c = client(), data = adventure('blessing');
		const entry = {id: 'compoundgold', family: 'compound', name: '五号化合物·金', tier: 'gold', text: '可暂时收存。'};
		data.run.blessings = {owned: [entry], pending: [{id: 'compound', kind: 'compound', title: entry.name,
			options: [{id: data.run.team[0].id, name: '妙蛙种子'}], compound: {stage: 'member'}}], shards: 0};
		c.room.receiveState(data); assert(c.html.includes('暂时收存，稍后使用'));
		data.run.blessings.pending = []; data.run.phase = 'ready'; c.room.receiveState(data);
		assert(c.panel.html.includes('usecompound:compoundgold'));
		c.room.act('usecompound:compoundgold');
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).action, 'usecompound');
		data.run.phase = 'battle'; c.room.receiveState(data);
		assert(/value="usecompound:compoundgold"[^>]*disabled/.test(c.panel.html));
		entry.completed = true; data.run.phase = 'ready'; c.room.receiveState(data);
		assert(!c.panel.html.includes('usecompound:compoundgold'));
	});
	it('shows full-price recycling for supplies and confirms before selling the whole bag', () => {
		const c = client(), data = adventure('rest');
		data.run.node = {kind: 'trade', name: '原价回收摊位', trade: {kind: 'buyback', stock: [], purchases: 0}};
		data.run.bag = {potion: 3}; data.items = [{id: 'potion', name: '伤药', kind: 'heal', price: 250, recyclePrice: 250}];
		c.room.receiveState(data);
		assert(c.room.html.includes('背包物品原价回收')); assert(c.room.html.includes('单价 250 金币'));
		assert(c.room.html.includes('data-shop-group="exchange" open'));
		assert(!c.room.html.includes('name="buyItems"')); assert(!c.room.html.includes('name="challengeShop"'));
		const sent = c.sent.length; c.room.act('sell:all'); assert.equal(c.sent.length, sent);
		assert(c.app.lastPopup.data.text.includes('750 金币')); assert(c.app.lastPopup.data.text.includes('恢复道具'));
		assert.equal(c.app.lastPopup.data.action, 'sell');
	});
	it('offers category jumps and validates bulk buying before sending one command', () => {
		const c = client(), data = adventure('rest'); data.run.money = 1000;
		data.items.push({id: 'expcandyxs', name: '经验糖果 XS', kind: 'candy', amount: 100, price: 80, shopFloor: 1, remaining: 9});
		c.room.receiveState(data);
		assert(c.html.includes('name="jumpShopGroup"')); assert(c.html.includes('data-shop-category="5"'));
		assert(c.html.includes('name="buyItems"')); const sent = c.sent.length; c.room.buyItems('expcandyxs');
		const popup = Object.create(c.app.lastPopup.type), controls = {'input[name=buyCount]': 1};
		popup.$el = {html() {}}; popup.close = () => {};
		popup.$ = selector => ({val(value) {if (value !== undefined) controls[selector] = value; return controls[selector];},
			text(value) {controls[selector] = value;}, prop(name, value) {controls[selector + ':' + name] = value;}});
		popup.initialize(c.app.lastPopup.data); assert.equal(popup.maximum, 9);
		controls['input[name=buyCount]'] = 10; popup.confirmBuy(); assert.equal(c.sent.length, sent);
		popup.chooseCount('5'); assert(controls['.rogue-buy-preview'].includes('合计 400 金币'));
		popup.confirmBuy(); const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'buy'); assert.equal(command.count, 5); assert.equal(command.value, 'expcandyxs');
		const after = c.sent.length; data.account.revision++; popup.confirmBuy(); assert.equal(c.sent.length, after);
		assert(c.app.lastPopup.data.text.includes('库存已更新'));
	});
	it('adds ten to the selected candy quantity rather than replacing it with ten', () => {
		const c = client(), popup = Object.create(c.RogueCandyPopup), controls = {'input[name=candyCount]': 7};
		popup.maximum = 25; popup.updatePreview = () => {};
		popup.$ = selector => ({val(value) {if (value !== undefined) controls[selector] = value; return controls[selector];}});
		popup.addTen(); assert.equal(controls['input[name=candyCount]'], 17);
		popup.addTen(); assert.equal(controls['input[name=candyCount]'], 25);
	});
	it('keeps fishing reel control in the meter group before the progress line', () => {
		const c = client(); const html = c.room.renderFishing({key: 'fish', fishing: {hits: 2}}, false);
		assert(html.indexOf('rogue-fishing-controls') < html.indexOf('name="fishingTap"'));
		assert(html.indexOf('name="fishingTap"') < html.indexOf('rogue-fishing-progress'));
		assert.equal((html.match(/name="fishingTap"/g) || []).length, 1);
	});
	it('keeps the ski animation running while waiting for its authoritative progress response', () => {
		const frames = [];
		const c = client(false, false, {requestAnimationFrame: callback => {frames.push(callback); return frames.length;}, cancelAnimationFrame() {}});
		const data = adventure('event');
		data.run.event = {key: 'ski', stage: 'choice', ski: {started: Date.now(), now: Date.now(), lane: 1, obstacles: []}};
		c.room.state = data;
		const canvas = {isConnected: true, getContext: () => new Proxy({}, {get: () => () => {}})};
		const normalSelector = c.room.$;
		c.room.$ = selector => selector === '.rogue-ski canvas' ? [canvas] : normalSelector(selector);
		const actions = [];
		c.room.skiMove = choice => {actions.push(choice); c.room.pending = {action: 'event'};};
		c.room.startSkiClock();
		assert.deepEqual(actions, ['skitick']);
		assert.equal(frames.length, 1, 'The pending request must not freeze the animation');
		frames.shift()(); assert.equal(actions.length, 1); assert.equal(frames.length, 1);
		canvas.isConnected = false; frames.shift()(); assert.equal(frames.length, 0);
	});
	it('shows reward demonstrations and illustrated training targets without submitting the reward before target selection', () => {
		const c = client(), data = adventure('reward'), mon = data.run.team[0];
		data.run.rewardScene = {key: 'reward-key', name: '画册还差一页', avatar: 'artist', quality: '旅途补给',
			paragraphs: ['看看【草】属性的伙伴吧。<script>'], type: 'Grass', demonstrations: [{member: mon.id, move: ''}],
			baseText: '另附金币和补给。', choices: [{id: 'experience', name: '经验糖果', text: '100 经验'},
				{id: 'offense', name: '输出训练', text: '本局双攻 +4%', targets: [{member: mon.id, amount: 400}]}]};
		c.room.receiveState(data);
		assert(c.room.html.includes('name="showRewardPartner"')); assert(c.room.html.includes('rogue-reward-npc'));
		assert(!c.room.html.includes('<script>')); assert(!c.room.html.includes('领取本层奖励并继续'));
		const sent = c.sent.length; c.room.chooseReward('offense'); assert.equal(c.sent.length, sent);
		assert(c.room.html.includes('name="trainRewardPartner"')); assert(c.room.html.includes('输出训练 +4%'));
		c.room.trainRewardPartner(mon.id);
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'rewardchoice'); assert.equal(request.value, 'offense'); assert.equal(request.member, mon.id);
	});
	it('warns about lost shop preparation and only starts the guard battle after confirmation', () => {
		const c = client(), data = adventure('rest');
		data.run.blessings = {owned: [{id: 'shopraid', family: 'shopraid', name: '零元购'}], pending: [], shards: 0};
		c.room.receiveState(data);
		assert(c.room.html.includes('请先领取首领战前增幅、完成购物'));
		const sent = c.sent.length; c.room.challengeShop();
		assert.equal(c.sent.length, sent, 'Opening the warning must not start battle');
		const popup = Object.create(c.RogueCardConfirmPopup);
		let html = '';
		popup.$el = {html: text => { html = text; }}; popup.close = () => {};
		popup.initialize(c.app.lastPopup.data);
		assert(html.includes('未领取的首领战前增幅与未购买的商品将无法再处理'));
		assert(html.includes('返回商店')); assert(html.includes('已准备好，挑战守卫'));
		popup.close(); assert.equal(c.sent.length, sent, 'Returning to the shop preserves preparation');
		popup.confirmCard();
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).action, 'shopchallenge');
	});
	it('shows permanent training services and accumulated growth without HP payments or shop challenges', () => {
		const c = client(), data = adventure('rest');
		data.run.node = {kind: 'trade', name: '训练营', trade: {kind: 'growth', stock: [], purchases: 0}};
		data.run.spirit = {id: 'yveltal'};
		data.run.blessings = {owned: [{id: 'shopraid', family: 'shopraid', name: '零元购'}], pending: [], shards: 0};
		data.run.growth = {offense: 800, defense: 400, experience: 500, personal: [{species: 'Bulbasaur', offense: 400}]};
		data.run.growthOffers = [{id: 'offense', name: '输出训练', text: '全队双攻 +4%', price: 1600, amount: 400, remaining: 1}];
		c.room.receiveState(data);
		assert(c.room.html.includes('name="openTrainingCamp"'));
		assert(c.room.html.includes('当场完成，伙伴不离队'));
		assert(!c.room.html.includes('value="buygrowth:offense"'));
		assert(!c.room.html.includes('name="challengeShop"')); assert(!c.room.html.includes('血量支付：'));
		assert(c.panel.html.includes('双攻 +8%')); assert(c.panel.html.includes('个人训练：双攻 +4%'));
		assert(c.panel.html.includes('所有增幅随通关卡保留'));
	});
	it('previews capped power-item effort gains and reads the server reward claim state', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		data.run.blessings = {owned: [{id: 'weighttraining', family: 'weighttraining', name: '负重训练'}], pending: [], shards: 0, weightTraining: {claimed: false}};
		mon.set.evs = {hp: 252, atk: 0, def: 0, spa: 248, spd: 4, spe: 1}; mon.set.item = 'powerlens';
		c.room.receiveState(data);
		assert(c.panel.html.includes('还差 5 点')); assert(c.panel.html.includes('当前上限下最多增加 4 点'));
		assert(c.panel.html.includes('对战速度减半'));
		mon.set.evs.spa = 252; mon.set.evs.spe = 2; data.run.blessings.weightTraining.claimed = true;
		c.room.receiveState(data);
		assert(c.panel.html.includes('幻之力量镜已领取')); assert(c.panel.html.includes('当前上限下最多增加 0 点'));
		assert(c.panel.html.includes('当前项目或总努力值已满'));
	});
	it('shows the elder before normal floor controls and preserves the choice semantics', () => {
		const c = client(), data = adventure('ready'); c.room.scroll = 900;
		data.run.comeback = {key: 'elder', text: '已经到达自己的极限了吗？', choosing: true};
		c.room.receiveState(data);
		assert.equal(c.room.scroll, 0); assert(c.room.html.includes('role="dialog"'));
		assert(c.room.html.includes('回答“否”保留机会')); assert(c.room.html.includes('两者均不免费复活'));
		assert(!c.room.html.includes('name="startBattle"'));
		c.room.comebackChoice('no'); const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'comeback'); assert.equal(command.member, 'elder'); assert.equal(command.value, 'no');
	});
	it('quotes a batch training price and submits exactly the selected members and stats', () => {
		const c = client(), data = adventure('rest'); data.run.money = 5000;
		data.run.growthOffers = [{id: 'master', name: '王牌训练员', amount: 1500, price: 450, remaining: 1}];
		c.room.receiveState(data); const popup = Object.create(c.RogueTrainingCampPopup), views = {};
		popup.selection = () => ({value: 'master', trainingMembers: [data.run.team[0].id], trainingStats: ['spa', 'spe']});
		popup.$el = {html: h => {views.html = h;}}; popup.close = () => {};
		popup.$ = selector => ({html: h => {views[selector] = h;}, prop: (k, v) => {views[selector + k] = v;}});
		popup.initialize({room: c.room});
		assert(views['.camp-preview'].includes('总价：900 金币')); assert(views['.camp-preview'].includes('速度 +0% → +15%'));
		assert.equal(views['button[name=confirmTraining]disabled'], false);
		popup.confirmTraining(); const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'buygrowth'); assert.deepEqual(command.trainingStats, ['spa', 'spe']);
		assert.deepEqual(command.trainingMembers, [data.run.team[0].id]);
	});
	it('keeps sound lessons and coverage lessons on their separate command paths', () => {
		for (const kind of ['sound', 'coverage']) {
			const c = client(), data = adventure('ready'), member = data.run.team[0].id;
			data.run.blessings = {owned: [], pending: [], soundLearning: [{member, moves: ['round']}], shards: 0};
			data.run.coverage = {remaining: 1, members: [{member, moves: ['round']}]};
			c.room.receiveState(data); const popup = Object.create(c.RogueBlessingLearnPopup);
			popup.$el = {html() {}}; popup.$ = () => ({val: () => 'round'}); popup.close = () => {};
			popup.initialize({room: c.room, member, kind}); popup.confirmLearn();
			const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
			assert.equal(command.action, kind === 'sound' ? 'learnbonus' : 'coverage');
			assert.equal(command.slot, kind === 'sound' ? 1 : 0);
		}
	});
	it('shows first-account instructions once before story entry and acknowledges without starting a run', () => {
		const c = client(true), data = state(), popups = [];
		c.app.curRoom = c.room; c.app.addPopup = (type, detail) => popups.push({type, detail});
		data.account.needsOnboarding = true; c.room.receiveState(data); c.room.receiveState(data);
		c.room.enterGame(); assert.equal(c.room.screen, 'home'); assert.equal(popups.length, 1);
		const popup = Object.create(popups[0].type); let html;
		popup.$el = {addClass() {}, html: value => {html = value;}}; popup.close = () => {};
		popup.initialize(popups[0].detail);
		for (const text of ['祝福与塔灵', '属性转', '藏宝袋与工具箱', '额外特性', '金币不足', '逃跑不会自动治疗']) assert(html.includes(text), text);
		popup.acknowledge(); assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).action, 'onboarding');
		data.account.needsOnboarding = false; data.account.revision++;
		c.room.receiveState(data); c.room.enterGame(); assert.equal(c.room.screen, 'game'); assert.equal(popups.length, 1);
	});
	it('uses illustrated partner cards for blessing targets and event member choices', () => {
		const c = client(), data = adventure('blessing'), mon = data.run.team[0];
		c.Dex.getTeambuilderSprite = () => 'background-image:url(sprites/gen5/bulbasaur.png)';
		data.run.blessings = {owned: [], pending: [{id: 'target', kind: 'target', title: '大力士？大法师！', options: [{id: mon.id, name: mon.set.species}]}], shards: 0};
		c.room.receiveState(data);
		assert(c.room.html.includes('rogue-member-choice')); assert(c.room.html.includes('sprites/gen5/bulbasaur.png'));
		assert(c.room.html.includes('name="chooseBlessingReward" value="' + mon.id + '"'));
		data.run.phase = 'event'; data.run.blessings.pending = [];
		data.run.event = {title: '教学', stage: 'choice', paragraphs: [], options: [{id: 'member:' + encodeURIComponent(mon.id), name: mon.set.species, text: '选择伙伴'}]};
		c.room.receiveState(data); assert(c.room.html.includes('class="button rogue-member-choice" name="chooseEvent"'));
	});
	it('puts extra abilities beside the native one and opens all effects without editing them', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		mon.extraAbilities = ['roguegreatmage']; c.room.receiveState(data);
		assert(c.html.includes('rogue-ability-line')); assert(c.html.includes('＋roguegreatmage'));
		assert(!c.html.includes('额外特性：roguegreatmage'));
		mon.extraAbilities.push('regenerator'); c.room.receiveState(data); assert(c.html.includes('>＋…</button>'));
		c.room.showExtraAbilities(mon.id); const popup = Object.create(c.app.lastPopup.type); let html;
		popup.$el = {addClass() {}, html: value => { html = value; }}; popup.initialize(c.app.lastPopup.data);
		assert(html.includes('特攻变为原来的 2 倍')); assert(html.includes('regenerator')); assert(html.includes('特性效果'));
		assert(!html.includes('name="chooseAbility"'));
	});
	it('only shows insight progress inside the owned insight blessing', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0]; mon.insight = {points: 42, gain: 3};
		data.run.blessings = {owned: [], pending: [], shards: 0, teraShards: {}}; c.room.receiveState(data);
		assert(!c.html.includes('生死领悟'));
		data.run.blessings.owned.push({id: 'insight', family: 'insight', name: '濒死悟道', tier: 'prismatic', text: '积累领悟。'});
		c.room.receiveState(data); assert(c.panel.html.includes('生死领悟 42 / 100'));
		assert(c.panel.html.indexOf('生死领悟') < c.panel.html.indexOf('宝可梦队伍'));
		assert(c.panel.html.includes('data-rogue-key="blessing-insight"'));
	});
	it('shows a separate removable emblem slot alongside the held item and submits its own action', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		mon.set.item = 'oranberry'; mon.emblem = 'rogueemblemfire';
		data.items.push({id: 'rogueemblemfire', name: '火属性转', kind: 'emblem', icon: 'firegem'});
		data.run.bag.rogueemblemfire = 1; c.room.receiveState(data);
		assert(c.html.includes('rogue-equipment-slots')); assert(c.html.includes('火属性转'));
		assert(c.html.includes('橙橙果')); assert(c.html.includes('value="emblems"'));
		c.room.editSection('emblems');
		assert(c.html.includes('取下属性转')); assert(c.html.includes('不占携带道具位'));
		assert(c.html.includes('name="equipEmblem" value="rogueemblemfire"'));
		assert(!c.html.includes('name="useItem" value="rogueemblemfire"'));
		c.room.equipEmblem('');
		const command = JSON.parse(c.sent[c.sent.length - 1].slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'equipemblem'); assert.equal(command.member, mon.id); assert.equal(command.value, '');
	});
	it('does not mix emblems into the ordinary held-item picker', () => {
		const c = client(), data = adventure('ready');
		data.items.push({id: 'rogueemblemwater', name: '水属性转', kind: 'emblem'}); data.run.bag.rogueemblemwater = 1;
		c.room.receiveState(data); c.room.editSection('items');
		assert(!c.html.includes('name="equipItem" value="rogueemblemwater"'));
		assert(c.html.includes('name="openEmblems"')); assert(c.html.includes('name="equipItem" value="oranberry"'));
	});
	it('explains and disables held-item replacement when Kid locks an Eviolite', () => {
		const c = client(), data = adventure('ready');
		data.run.team[0].set.item = 'Eviolite';
		data.run.blessings = {owned: [{id: 'kid', family: 'kid', name: '小鬼当家', tier: 'silver', text: '进化奇石强化。'}], pending: [], shards: 0};
		c.room.receiveState(data); c.room.editSection('items');
		assert(c.html.includes('进化奇石已锁定，不能取下或更换'));
		for (const button of c.html.match(/<button[^>]+name="equipItem"[^>]*>/g)) assert(button.includes('disabled'));
		data.run.blessings.owned = []; c.room.receiveState(data);
		assert(!c.html.includes('进化奇石已锁定'));
		assert(!c.html.match(/<button[^>]+name="equipItem" value="oranberry"[^>]*>/)[0].includes('disabled'));
	});
	it('only offers dragon-king abilities absent from the recipient, including the already-has-both case', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		data.run.blessings = {owned: [], pending: [], completed: [], levels: 0, shards: 0,
			dragonKing: {member: mon.id, species: mon.set.species, total: 732, options: ['longzhihuxi']}};
		c.room.receiveState(data);
		assert(!c.html.includes('name="chooseDragonKing" value="drizzle"'));
		c.room.chooseDragonKing('drizzle'); assert.equal(c.sent.length, 0);
		data.run.blessings.dragonKing.options = []; c.room.receiveState(data);
		assert(c.html.includes('已具备两种特性，无需重复赋予')); assert(!c.html.includes('name="chooseDragonKing"'));
	});
	it('renders an announced trainer and all six team members outside the dialogue text', () => {
		const c = client(), data = adventure('story');
		data.story = {stage: 'restguide', scene: 'arena', title: '对手预告', speaker: '黑袍老人', text: '下一层的对手。',
			key: 'rest:1', index: 1, total: 3, canSkip: true,
			roster: {name: '道馆 · 小刚', avatar: 'brock', pokemon: ['Onix', 'Geodude', 'Rhyhorn', 'Golem', 'Kabutops', 'Aerodactyl']}};
		c.room.receiveState(data);
		assert(c.room.html.includes('sprites/trainers/brock.png'));
		assert.equal((c.room.html.match(/class="rogue-roster-member"/g) || []).length, 6);
		assert(c.room.html.includes('Aerodactyl</span>'));
		assert(c.room.html.includes('name="storyNext"'));
	});
	it('shows the outside king on the party tabs and sends an ability choice for that member', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		data.run.blessings = {owned: [], pending: [], completed: [], levels: 0, shards: 0,
			dragonKing: {member: mon.id, species: mon.set.species, total: 732}};
		c.room.receiveState(data);
		assert(c.html.includes('title="队伍龙王"')); assert(c.html.includes('六项常驻能力合计 732'));
		assert(c.html.includes('name="chooseDragonKing"')); c.room.chooseDragonKing('drizzle');
		assert(c.sent[c.sent.length - 1].includes('"action":"dragonking"'));
		assert(c.sent[c.sent.length - 1].includes('"member":"' + mon.id + '"'));
	});
	it('confirms permanent tonic use on the selected partner and disables an already applied tonic', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		data.items.push({id: 'roguewine', name: '酒', kind: 'tonic', description: '使用后永久生效。'});
		data.run.bag.roguewine = 1; c.room.receiveState(data); const sent = c.sent.length;
		c.room.useItem('roguewine'); assert.equal(c.sent.length, sent);
		assert.equal(c.app.lastPopup.data.action, 'use'); assert.equal(c.app.lastPopup.data.details.member, mon.id);
		mon.tonics = {wine: true, cephalosporin: true, poison: true}; c.room.receiveState(data);
		assert(c.html.includes('value="roguewine" disabled')); assert(c.html.includes('毒招威力 ×1.5'));
	});
	it('uses separate original sprites for each experience candy size and sends rare candy as one level item', () => {
		const c = client(), data = adventure('ready');
		for (const size of ['xs', 's', 'm', 'l', 'xl']) {
			const id = 'expcandy' + size; data.items.push({id, name: id, kind: 'candy', amount: 100}); data.run.bag[id] = 1;
		}
		data.items.push({id: 'rarecandy', name: '神奇糖果', kind: 'rarecandy', description: '直接提升 1 级'}); data.run.bag.rarecandy = 1;
		c.room.receiveState(data);
		for (const id of ['expcandyxs', 'expcandys', 'expcandym', 'expcandyl', 'expcandyxl', 'rarecandy']) {
			assert(c.html.includes('candy/' + id + '.png'));
			assert(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/sprites/fantasy-rogue/candy/' + id + '.png')).length > 100);
		}
		c.room.useItem('rarecandy'); assert(!c.app.lastPopup); assert(c.sent.at(-1).includes('"value":"rarecandy"'));
		assert(c.sent.at(-1).includes('"action":"use"'));
	});
	it('previews batch candy levels, caps quantities and sends one atomic use command', () => {
		const c = client(), data = adventure('rest'), mon = data.run.team[0];
		data.items.push({id: 'expcandyxs', name: '经验糖果 XS', kind: 'candy', amount: 100});
		data.run.bag.expcandyxs = 8;
		mon.experienceProgress = {current: 0, needed: 91, total: 125, levels: Array.from({length: 100}, (_, i) => (i + 1) ** 3)};
		c.room.receiveState(data); const sent = c.sent.length; c.room.useItem('expcandyxs');
		assert.equal(c.sent.length, sent);
		const popup = Object.create(c.app.lastPopup.type), controls = {'input[name=candyCount]': 1}; let html;
		popup.$el = {html: value => {html = value;}}; popup.close = () => {};
		popup.$ = selector => ({val(value) {if (value !== undefined) controls[selector] = value; return controls[selector];},
			text(value) {controls[selector] = value;}, prop(name, value) {controls[selector + ':' + name] = value;}});
		popup.initialize(c.app.lastPopup.data); assert(html.includes('使用数量')); assert.equal(popup.maximum, 8);
		popup.chooseCount('5'); assert(controls['.rogue-candy-preview'].includes('Lv.5 → Lv.8'));
		assert(controls['.rogue-candy-preview'].includes('经验 +500'));
		assert(controls['.rogue-candy-preview'].includes('距下一级 104'));
		controls['input[name=candyCount]'] = 1.5; popup.updatePreview();
		assert(controls['button[name=confirmCandy]:disabled']); popup.confirmCandy(); assert.equal(c.sent.length, sent);
		popup.chooseCount('10'); assert.equal(controls['input[name=candyCount]'], 8);
		popup.chooseCount('5'); popup.confirmCandy();
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.count, 5); assert.equal(command.action, 'use'); assert.equal(command.member, mon.id);
	});
	it('keeps surplus candy at the level cap and refuses a preview after account or save changes', () => {
		const c = client(), data = adventure('rest'), mon = data.run.team[0];
		data.items.push({id: 'expcandyxs', name: '经验糖果 XS', kind: 'candy', amount: 100});
		data.run.bag.expcandyxs = 20; mon.set.level = 99;
		mon.experienceProgress = {total: 999950, levels: Array.from({length: 100}, (_, i) => (i + 1) ** 3)};
		c.room.receiveState(data); c.room.useItem('expcandyxs');
		const popup = Object.create(c.app.lastPopup.type);
		popup.$el = {html() {}}; popup.close = () => {};
		popup.$ = () => ({val: () => 1, text() {}, prop() {}});
		popup.initialize(c.app.lastPopup.data); assert.equal(popup.maximum, 1);
		assert.equal(popup.preview(1).level, 100); assert.equal(popup.preview(1).gained, 50);
		const sent = c.sent.length; data.account.revision++; popup.confirmCandy();
		assert.equal(c.sent.length, sent); assert(c.app.lastPopup.data.text.includes('已更新'));
		c.setUser('different'); popup.confirmCandy(); assert.equal(c.sent.length, sent);
	});
	it('shows limited rest candy and a compact preparation summary, including sold-out and insufficient funds', () => {
		const c = client(), data = adventure('rest'); data.run.floor = 9; data.run.node.kind = 'rest';
		data.run.emergencyCost = 2300; data.run.team[0].hp = 0;
		data.items.push({id: 'revive', name: '活力碎片', kind: 'revive', amount: .5},
			{id: 'expcandyxs', name: '经验糖果 XS', kind: 'candy', amount: 100, price: 80, shopFloor: 9, remaining: 4});
		data.run.bag.revive = 2; c.room.receiveState(data);
		assert(c.html.includes('限量经验糖果')); assert(c.html.includes('金币购买 · 剩余 4'));
		assert(c.html.includes('倒下伙伴 <b>1 / 1</b>')); assert(c.html.includes('复活道具 <b>2</b>'));
		assert(c.html.includes('全队急救 <b>2300</b> 金币（余额不足）'));
		data.items.at(-1).remaining = 0; c.room.receiveState(data);
		assert(c.html.includes('value="buy:expcandyxs" disabled')); assert(c.html.includes('本店已售罄'));
	});
	it('opens a PP target picker before consuming single-move Ether', () => {
		const c = client(), data = adventure('rest');
		data.items.push({id: 'ether', name: 'PP 单项小补剂', kind: 'ether', singleMove: true, amount: 10});
		data.run.bag.ether = 6;
		data.run.team[0].pp = [{id: 'tackle', pp: 0, maxpp: 35}, {id: 'growl', pp: 40, maxpp: 40}];
		c.room.receiveState(data); const sent = c.sent.length;
		c.room.useItem('ether'); assert.equal(c.sent.length, sent);
		const popup = Object.create(c.app.lastPopup.type); let html;
		popup.$el = {html: value => { html = value; }}; popup.close = () => {};
		popup.initialize(c.app.lastPopup.data);
		assert(html.includes('value="1" disabled'));
		popup.restorePP('0');
		assert(c.sent[c.sent.length - 1].includes('"slot":0'));
		assert(c.sent[c.sent.length - 1].includes('"value":"ether"'));
	});
	it('asks which IV to train and consumes no crown when dismissed', () => {
		for (const id of ['bottlecap', 'goldbottlecap']) {
			const c = client(), data = adventure('rest');
			data.items.push({id, name: id === 'bottlecap' ? '银色王冠' : '金色王冠', kind: 'crown', description: '提升个体值。'});
			data.run.bag[id] = 1; data.run.team[0].set.ivs.hp = 31;
			c.room.receiveState(data); const sent = c.sent.length; c.room.useItem(id);
			assert.equal(c.sent.length, sent);
			const popup = Object.create(c.app.lastPopup.type); let html;
			popup.$el = {html: value => {html = value;}}; popup.close = () => {};
			popup.initialize(c.app.lastPopup.data); popup.close(); assert.equal(c.sent.length, sent);
			assert(html.includes('rogue-control')); assert(html.includes('name="close"'));
			if (id === 'bottlecap') assert(html.includes('value="0" disabled'));
			popup.trainIV(id === 'bottlecap' ? '1' : 'all');
			const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
			assert.equal(command.action, 'use'); assert.equal(command.value, id);
			assert.equal(command.member, data.run.team[0].id);
			assert.equal(command.slot, id === 'bottlecap' ? 1 : undefined);
		}
	});
	it('shows battle goods separately from other held equipment', () => {
		const c = client(), data = adventure('rest'); data.run.floor = 99;
		data.items.push({id: 'metronome', name: '节拍器', kind: 'held', price: 5000, shopFloor: 99, category: '对战影响道具'});
		c.room.receiveState(data);
		assert(c.html.includes('对战影响道具 · 1 种'));
		assert(c.html.includes('进化与携带道具 · 1 种'));
		assert.equal((c.html.match(/value="buy:metronome"/g) || []).length, 1);
	});
	it('uses real medicine images and compact locked system cards', () => {
		const c = client(), data = adventure('rest');
		data.items = ['antidote', 'burnheal', 'iceheal', 'awakening', 'paralyzeheal'].map(id => ({id, name: id, kind: 'cure'}));
		data.items.forEach(item => { data.run.bag[item.id] = 1; });
		c.room.receiveState(data);
		for (const item of data.items) assert(c.html.includes('sprites/fantasy-rogue/' + item.id + '.png'));
		const systems = c.room.renderSystems(data.run);
		assert.equal((systems.match(/rogue-system-card is-locked/g) || []).length, 4);
		assert.equal((systems.match(/fa-lock/g) || []).length, 4);
		for (const name of ['太晶化', '超进化', '超巨进化', 'Z 招式']) assert(systems.includes('<strong>' + name + '</strong>'));
	});
	it('shows full PP supplies with bottle icons and player-facing full-recovery wording', () => {
		const c = client(), data = adventure('ready');
		data.items = [{id: 'maxether', icon: 'ether', name: 'PP 单项全补剂', kind: 'ether', amount: 999, singleMove: true},
			{id: 'maxelixir', icon: 'elixir', name: 'PP 多项全补剂', kind: 'ether', amount: 999}];
		data.items.forEach(i => {data.run.bag[i.id] = 1;}); c.room.receiveState(data);
		const html = c.room.renderBag(data.run, false);
		assert(html.includes('自选一个招式恢复 全部 PP')); assert(html.includes('当前各招式恢复 全部 PP'));
		assert(html.includes('rogue-item-ether')); assert(html.includes('rogue-item-elixir')); assert(!html.includes('999'));
	});
	it('draws patch, capsule, crowns and Max Revive icons instead of the missing-item question mark', () => {
		const c = client(), data = adventure('ready');
		data.items = ['abilitypatch', 'abilitycapsule', 'bottlecap', 'goldbottlecap', 'maxrevive'].map(id => ({id, name: id, kind: 'crown'}));
		data.items.push({id: 'roguecephalosporin', icon: 'fullheal', name: '头孢', kind: 'tonic'});
		data.items.forEach(item => { data.run.bag[item.id] = 1; }); c.room.receiveState(data);
		const html = c.room.renderBag(data.run, false);
		assert.equal((html.match(/<svg class="rogue-loot-icon"/g) || []).length, 3);
		for (const id of ['bottlecap', 'goldbottlecap']) assert(html.includes('crowns/' + id + '.png'));
		assert(html.includes('rogue-item-fullheal')); assert(!html.includes('class="itemicon"'));
	});
	it('uses compact readable badges for every primary and stacked status without duplicating them', () => {
		const c = client(), data = adventure('ready');
		for (const status of ['par', 'brn', 'psn', 'tox', 'slp', 'frz', 'fst']) {
			data.run.team[0].status = status; data.run.team[0].statuses = {[status]: {}};
			c.room.receiveState(data);
			assert(c.room.renderParty().includes('rogue-status-badge status-' + status));
		}
		data.run.team[0].status = 'par'; data.run.team[0].statuses = {par: {}, brn: {}};
		c.room.receiveState(data); const html = c.room.renderParty();
		assert.equal((html.match(/rogue-status-badge status-par/g) || []).length, 1);
		assert(html.includes('status-brn')); assert(html.includes('aria-hidden="true">ϟ'));
		data.run.team[0].hp = 0; c.room.receiveState(data);
		assert(c.room.renderParty().includes('status-fnt')); assert(!c.room.renderParty().includes('status-par'));
		delete data.run.team[0].status; data.run.team[0].statuses = {};
		c.room.receiveState(data); assert(c.room.renderParty().includes('status-fnt'));
		data.run.team[0].hp = data.run.team[0].maxhp;
		data.run.team[0].statuses = {brn: {}};
		c.room.receiveState(data);
		const statusOnly = c.room.renderParty();
		assert(statusOnly.includes('status-brn'));
		assert(!statusOnly.match(/<button[^>]*name="healMember"[^>]*>/)[0].includes('disabled'));
		data.run.team[0].statuses = {};
		c.room.receiveState(data);
		const healthy = c.room.renderParty();
		assert(!healthy.includes('状态正常')); assert(!healthy.includes('rogue-status-badge'));
		assert(healthy.match(/<button[^>]*name="healMember"[^>]*>/)[0].includes('disabled'));
	});
	it('spans trade-route description across the card instead of the icon column', () => {
		const c = client(), data = adventure('choose');
		data.run.choices = [{id: 'trade', name: '招式学习机商店', kind: 'trade', encounters: 0, reward: {money: 0, items: {}}}];
		c.room.receiveState(data);
		assert(c.html.includes('class="rogue-route-description">商品数量有限'));
	});

	it('only enables medicines matching a partner status, including stacked secondary statuses', () => {
		const c = client(), data = adventure('rest');
		data.items = [
			{id: 'awakening', name: '解眠药', kind: 'cure', cureStatuses: ['slp']},
			{id: 'antidote', name: '解毒药', kind: 'cure', cureStatuses: ['psn', 'tox']},
		];
		Object.assign(data.run.bag, {awakening: 1, antidote: 1});
		data.run.team[0].status = 'brn'; data.run.team[0].statuses = {brn: {}, slp: {time: 2}};
		c.room.receiveState(data);
		assert(!c.html.includes('value="awakening" disabled')); assert(c.html.includes('value="antidote" disabled'));
		data.run.team[0].status = ''; data.run.team[0].statuses = {tox: {stage: 2}};
		c.room.receiveState(data);
		assert(c.html.includes('value="awakening" disabled')); assert(!c.html.includes('value="antidote" disabled'));
	});
	it('keeps the adventure-screen escape action even for legacy locked event battles', () => {
		const c = client(), data = adventure('battle'); data.run.canRetreat = false;
		c.room.receiveState(data);
		assert(c.room.html.includes('value="retreat"')); assert(!c.room.html.includes('本次事件对战不能撤退'));
	});
	it('separates custom and enhanced content, uses a shared cup symbol, and matches blessing-family icons', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('guide');
		const move = {type: 'Normal', category: 'Physical', power: 50, accuracy: 100, pp: 20};
		c.room.receiveCodex({userid: 'rogueplayer', section: 'guide', guide: {intro: [], modules: {
			moves: [{...move, id: 'custom', name: '自制招式', origin: 'fantasy'}, {...move, id: 'tackle', name: '原版增强招式', origin: 'enhanced'}],
			abilities: [{id: 'customability', name: '自制特性', origin: 'fantasy'}, {id: 'shellarmor', name: '原版增强特性', origin: 'enhanced'}],
		}}});
		for (const [module, label] of [['moves', '招式'], ['abilities', '特性']]) {
			c.room.filterCodex(module); assert(c.room.html.includes('自制' + label));
			assert(!c.room.html.includes('<h3>原版增强' + label)); assert(c.room.html.includes('fa-trophy'));
			c.room.filterCodex(module + 'enhanced'); assert(c.room.html.includes('<h3>原版增强' + label));
			assert(!c.room.html.includes('<h3>自制' + label)); assert(c.room.html.includes('fa-trophy'));
		}
		c.room.openCodex('blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'inheritmovesfire', family: 'inheritmoves', name: '纽带', tier: 'gold', unlocked: true, text: '效果'},
		]});
		assert(c.room.html.includes('fa-share-alt'));
	});
	it('lets logged-out players click start and immediately explains the login requirement', () => {
		const c = client(true); c.setUser('');
		c.room.state = {account: null}; c.room.render();
		assert(!c.room.html.includes('name="enterGame" disabled'));
		c.room.enterGame();
		assert.equal(c.room.screen, 'home');
		assert(c.app.lastPopup.data.text.includes('请先登录账号'));
	});
	it('offers a prominent return button even while a codex is loading and filters event categories', () => {
		const c = client(true); c.room.receiveState(state());
		for (const section of ['guide', 'blessings', 'events']) {
			c.room.openCodex(section); assert(c.room.html.includes('button rogue-codex-back'));
		}
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: [
			{id: 'trade:mint', name: '薄荷商店', category: 'trade', unlocked: false, text: '？？？'},
			{id: 'forest', name: '斗蛐蛐！', category: 'event', unlocked: false, text: '？？？'},
		]});
		c.room.filterCodex('trade'); assert(c.room.html.includes('薄荷商店')); assert(!c.room.html.includes('斗蛐蛐！'));
		c.room.startMenu(); assert(c.room.html.includes('开始你的幻想杯肉鸽之旅'));
	});
	it('uses the supplied item sprite and separates general, exclusive and special item explanations', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('guide');
		const icons = []; c.Dex.getItemIcon = item => { icons.push(item); return 'background-position:-24px -48px'; };
		c.room.receiveCodex({userid: 'rogueplayer', section: 'guide', guide: {intro: [], modules: {items: [
			{id: 'fantasypowerlens', name: '幻之力量镜', text: '通用效果', category: 'general', spritenum: 34},
			{id: 'dadascloak', name: '阿爸的披风', text: '专属效果', category: 'exclusive', spritenum: 7},
		]}, itemNotes: [{id: 'typegems', name: '十八属性宝石', text: '特殊说明'}]}});
		c.room.filterCodex('items');
		assert.equal(icons[0].spritenum, 34); assert(!c.room.html.includes('专属效果'));
		c.room.filterCodex('exclusive'); assert(c.room.html.includes('专属效果')); assert(!c.room.html.includes('通用效果'));
		c.room.filterCodex('special'); assert(c.room.html.includes('特殊说明'));
	});
	it('opens trade stock directly without center healing and keeps abandon outside scrollable content', () => {
		const c = client(), data = adventure('rest');
		data.run.node = {kind: 'trade', name: '薄荷商店', trade: {kind: 'mint'}, reward: {money: 0, items: {}}};
		data.items = [{id: 'roguemintmodest', name: 'Modest薄荷', kind: 'mint', price: 500, shopFloor: 1, description: '特攻提高'}];
		data.run.node.trade.stock = data.items.map(item => ({...item, remaining: 1}));
		data.shopItems = ['roguemintmodest']; c.room.receiveState(data);
		assert(c.room.html.includes('欢迎来到薄荷商店！'));
		assert(c.room.html.includes('金币购买 · 剩余 1'));
		assert(!c.room.html.includes('恢复存活伙伴'));
		assert(c.room.html.startsWith('<div class="rogue-game-layout"><div class="pad rogue-game-content">'));
		assert(c.room.html.includes('</div><footer class="rogue-abandon"'));
	});
	it('starts on the four-button menu and enters the saved story only after pressing start', () => {
		const c = client(true), data = state();
		data.story = {stage: 'opening', scene: 'chamber', title: '醒来', text: '未点击前不显示的剧情', index: 0, total: 8};
		c.room.receiveState(data);
		assert(c.room.html.includes('开始你的幻想杯肉鸽之旅'));
		assert.equal((c.room.html.match(/name="openCodex"/g) || []).length, 4);
		assert(!c.room.html.includes(data.story.text));
		c.room.enterGame(); assert(c.room.html.includes(data.story.text));
		c.room.startMenu(); assert(!c.room.html.includes(data.story.text));
		c.room.enterGame(); assert.equal(c.room.state, data); assert.equal(c.sent.length, 0);
	});
	it('does not auto-open the saved tower spirit popup on the landing page', () => {
		const c = client(true), data = adventure('intro');
		data.run.id = 'saved'; data.run.spirit = {id: 'test', name: '塔灵', species: 'Mew'};
		let opened = 0; c.room.showSpirit = () => opened++;
		c.room.receiveState(data); assert.equal(opened, 0);
		c.room.enterGame(); assert.equal(opened, 1);
		c.room.startMenu(); c.room.enterGame(); assert.equal(opened, 1);
	});
	it('shows full unlocked effects, tier colors and locked question marks, with filters', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('blessings');
		assert.equal(c.sent[0], '/cmd fantasyroguecodex blessings');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries: [
			{id: 'a', name: '已选祝福', tier: 'gold', floors: [1], unlocked: true, text: '完整效果：伤害提升 20%。'},
			{id: 'b', name: '未选祝福', tier: 'prismatic', floors: [100, 150], unlocked: false, text: '？？？'},
		]});
		assert(c.room.html.includes('完整效果：伤害提升 20%。'));
		assert(c.room.html.includes('class="rogue-blessing-restriction">仅第 1 层出现</small>'));
		assert(c.room.html.includes('仅第 100、150 层出现</small>'));
		assert(c.room.html.includes('tier-prismatic is-locked')); assert(c.room.html.includes('？？？'));
		c.room.filterCodex('unlocked'); assert(!c.room.html.includes('未选祝福'));
		c.room.filterCodex('prismatic'); assert(!c.room.html.includes('已选祝福'));
	});
	it('shows all four blessing versions and safely emphasizes named Pokemon terms', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('blessings');
		const entries = [1, 50, 100, 150].map((floor, i) => ({id: 'money:' + floor, family: 'money',
			name: '来财，来' + '+'.repeat(i), tier: 'silver', floors: [floor], unlocked: true, text: '获得 ' + (i + 1) * 4000 + ' 金币。'}));
		entries.push({id: 'test', name: '词汇', tier: 'gold', unlocked: true, text: '获得【皮卡丘】，学会【十万伏特】。<script>alert(1)</script>'});
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries});
		for (const e of entries) assert(c.room.html.includes(e.name));
		assert(c.room.html.includes('按名称拼音首字母排列'));
		assert(c.room.html.includes('<strong class="rogue-term">【皮卡丘】</strong>'));
		assert(c.room.html.includes('<strong class="rogue-term">【十万伏特】</strong>'));
		assert(!c.room.html.includes('<script>')); assert(c.room.html.includes('&lt;script>'));
		assert(c.room.html.includes('仅第 150 层出现'));
	});
	it('reads event choices without submitting any gameplay commands or showing battle logs', () => {
		const c = client(true), data = adventure(); c.room.receiveState(data); c.room.openCodex('events');
		const before = JSON.stringify(data), sentBefore = c.sent.length;
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: [
			{id: 'forest', name: '斗蛐蛐！', unlocked: true, text: '概况', replay: {title: '斗蛐蛐！', start: 'start', pages: {
				start: {text: ['事件开头。⌈准备好了吗？⌋<script>bad</script>'], options: [{label: '⌈准备好了！⌋', next: 'battle'}]},
				battle: {text: ['战斗后的文字'], options: [], battleSkipped: true},
			}}}, {id: 'room', name: '房间', unlocked: false, text: '？？？'},
		]});
		c.room.readEvent('room'); assert(!c.room.codexReplay);
		c.room.readEvent('forest'); assert(c.room.html.includes('事件开头'));
		assert(c.room.html.includes('<strong class="rogue-spoken-line">『准备好了吗？』</strong>'));
		assert(c.room.html.includes('<strong class="rogue-spoken-line">『准备好了！』</strong>'));
		assert(c.room.html.includes('&lt;script>bad')); assert(!c.room.html.includes('<script>'));
		c.room.replayEventNext('nonexistent'); assert.equal(c.room.codexReplayHistory.length, 1);
		c.room.replayEventNext('battle'); assert(c.room.html.includes('战斗画面已跳过'));
		c.room.replayEventBack(); assert(c.room.html.includes('事件开头'));
		assert.equal(JSON.stringify(data), before); assert.equal(c.sent.length, sentBefore); assert.equal(c.joined.length, 0);
	});
	it('clears account-specific codex data on identity change and ignores responses for other users', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('events');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: []});
		c.setUser('other'); c.room.identityChanged();
		assert.equal(Object.keys(c.room.codices).length, 0); assert.equal(c.room.screen, 'home');
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: [{name: '不应展示'}]});
		assert.equal(Object.keys(c.room.codices).length, 0);
	});
});
describe('Fantasy Rogue story and clear-card controls', () => {
	it('loads both Aqua portrait expressions in story, challenge and trainer codex views', () => {
		const c = client(); c.room.receiveState(state()); c.room.openCodex('events');
		for (const id of ['aqua', 'archie']) {
			const file = 'sprites/rogue-dialogue/' + id + '.png';
			const png = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/' + file));
			assert.equal(png.subarray(1, 4).toString(), 'PNG');
			assert.equal(png.readUInt32BE(16), 2 * png.readUInt32BE(20), id + ' paired square cells');
			assert.equal(png[25], 6, id + ' RGBA transparency');
			for (const expression of ['neutral', 'approval']) {
				const art = c.room.storyArt({scene: 'arena', portrait: id, speaker: id, expression});
				assert(art.includes(file + '?v=20261101-fangame'));
				assert.equal(art.includes('is-approval'), expression === 'approval');
			}
			const run = adventure('event').run;
			run.challenge = {stage: 'offer', name: '海洋队挑战', portraits: [id], paragraphs: [], team: [], prizes: []};
			assert(c.room.renderChallenge(run, false).includes(file));
			assert(!c.room.renderChallenge(run, false).includes('-official.png'));
			c.room.receiveCodex({userid: 'rogueplayer', section: 'events', revision: 1,
				entries: [{id: 'trainer:' + id, name: id, category: 'trainer', portrait: id, roles: ['antagonist'], unlocked: true, text: ''}]});
			c.room.selectCodexCollection('companions');
			assert(c.room.renderCodex().includes(file));
		}
	});
	it('ships both expressions for every added gym leader and uses them in dialogue', () => {
		const c = client();
		for (const id of ['jasmine', 'winona', 'gardenia', 'candice', 'clair', 'clay', 'nanu', 'valerie', 'leon', 'cynthia', 'diantha', 'ash', 'lusamine']) {
			const png = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/sprites/rogue-dialogue/' + id + '.png'));
			assert.equal(png.subarray(1, 4).toString(), 'PNG');
			assert.equal(png.readUInt32BE(16), 2 * png.readUInt32BE(20), id + ' paired square cells');
			assert.equal(png[25], 6, id + ' RGBA transparency');
			for (const expression of ['neutral', 'approval']) {
				const art = c.room.storyArt({scene: 'arena', portrait: id, speaker: id, expression});
				const version = id === 'lusamine' ? '20261026-expressions' : id === 'ash' ? '20261024-cutout' : ['leon', 'cynthia', 'diantha'].includes(id) ? '20261024' : '20261023';
				assert(art.includes('rogue-dialogue/' + id + '.png?v=' + version));
				assert.equal(art.includes('is-approval'), expression === 'approval');
			}
		}
	});
	it('uses paired portraits with stable scene identity while changing expressions and speakers', () => {
		const c = client(), data = adventure('story'); c.room.receiveState(data);
		const page = {stage: 'interlude', performance: 'conversation1', scene: 'arena', portrait: 'jenny', speaker: '君莎', side: 'right', expression: 'neutral'};
		assert(c.room.storyArt(page).includes('rogue-dialogue/jenny.png'));
		assert(c.room.storyArt({...page, expression: 'approval'}).includes('is-approval'));
		assert.equal(c.room.storyArtKey(page), c.room.storyArtKey({...page, expression: 'approval'}));
		assert.notEqual(c.room.storyArtKey(page), c.room.storyArtKey({...page, portrait: 'guzma', side: 'left'}));
		assert(c.room.storyArt({...page, portrait: 'guzma', side: 'left'}).includes('rogue-companions/guzma-expressions.png'));
		assert(c.room.storyArt({...page, portrait: 'brock', avatar: 'brock'}).includes('rogue-dialogue/brock.png'));
		assert(!c.room.storyArt({...page, portrait: 'brock'}).includes('sprites/trainers/brock.png'));
		assert(c.room.storyArt({...page, portrait: 'kahili'}).includes('kahili.png?v=20261019-blue'));
		for (const expression of ['neutral', 'approval']) {
			const art = c.room.storyArt({...page, portrait: 'mewtwo', pokemon: 'Mewtwo-Fantasy', expression});
			assert(art.includes('rogue-mewtwo-bust rogue-dialogue-single')); assert(art.includes('mewtwo-official.png'));
			assert(art.includes('background-image'));
			assert(!art.includes('<img'));
		}
		assert.notEqual(c.room.storySignature(page), c.room.storySignature({...page, performance: 'conversation2'}));
	});
	it('automatically shows terminal failure once and returns home only after its acknowledged command', () => {
		const c = client(), data = adventure('defeated');
		data.run.failure = {key: 'failed1', title: '爬塔已无法推进', reason: '无恢复途径'};
		c.room.receiveState(data); assert.equal(c.app.lastPopup.type, c.RogueFailurePopup);
		const popupData = c.app.lastPopup.data; delete c.app.lastPopup;
		c.room.receiveState(data); assert(!c.app.lastPopup);
		c.room.acknowledgeFailure('stale'); assert.equal(c.sent.length, 0);
		const popup = Object.create(c.RogueFailurePopup); popup.$el = {html() {}}; popup.close = () => {};
		popup.initialize(popupData); popup.confirmFailure();
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'ackfailure'); assert.equal(request.value, 'failed1');
		assert.equal(c.room.screen, 'game');
		const result = state(); result.account.revision = data.account.revision + 1;
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: result});
		assert.equal(c.room.screen, 'home'); assert(!c.room.state.run);
	});
	it('does not acknowledge a failure modal after switching accounts or adventures', () => {
		const c = client(), data = adventure('defeated');
		data.run.failure = {key: 'failed1', title: '失败', reason: '无恢复途径'}; c.room.receiveState(data);
		const popup = Object.create(c.RogueFailurePopup); popup.$el = {html() {}}; popup.close = () => {};
		popup.initialize(c.app.lastPopup.data); c.setUser('another'); popup.confirmFailure();
		assert.equal(c.sent.length, 0);
	});
	it('offers only battle or preparation after the final boss line, with a guarded battle command', () => {
		const c = client(), data = adventure('story');
		data.story = {stage: 'bossintro', scene: 'summit', title: '最初的来意', speaker: '超梦',
			text: '可你还记得，自己为何而来吗？', pokemon: 'Mewtwo-Fantasy',
			key: 'run:bossintro:200:boss:0:summit:mewtwo:2', index: 2, total: 3, canSkip: true, battleReady: true};
		c.room.receiveState(data);
		assert(c.room.html.includes('战前 / 最初的来意'));
		assert(c.room.html.includes('开始吧')); assert(c.room.html.includes('再让我准备一下'));
		assert(!c.room.html.includes('name="storySkip"'));
		assert(c.room.html.includes('class="rogue-story-dialogue" disabled'));
		c.room.storyBattle(); c.room.storyBattle();
		assert.equal(c.sent.length, 1);
		const command = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'battle'); assert.equal(command.value, data.story.key);
	});
	it('keeps the trainer portrait and scene when paging into battle controls', () => {
		const c = client(), data = adventure('story');
		data.story = {stage: 'bossintro', scene: 'arena', title: '战前', speaker: '小刚', avatar: 'brock',
			text: '第一句', encounter: '20:boss:0:gym:brock', key: 'first', index: 0, total: 2, canSkip: true};
		c.room.receiveState(data); assert(c.html.includes('sprites/trainers/brock.png'));
		const nodes = {};
		for (const name of ['.rogue-story-scene', '.rogue-story-chapter', '.rogue-story-actions', 'strong', 'span', 'small']) nodes[name] = {};
		nodes['.rogue-story-dialogue'] = {setAttribute() {}, querySelector: key => nodes[key]};
		const section = {dataset: {story: c.room.storySignature(data.story)}, setAttribute() {}, querySelector: key => nodes[key]};
		c.room.$el[0] = {querySelector: () => section};
		c.room.$el.html = () => { throw new Error('Must retain the trainer scene while paging'); };
		const next = structuredClone(data); next.account.revision++;
		Object.assign(next.story, {index: 1, key: 'last', text: '准备好了吗？', battleReady: true});
		c.room.receiveState(next, true);
		assert.equal(nodes.span.innerHTML, '准备好了吗？'); assert(nodes['.rogue-story-dialogue'].disabled);
		assert(nodes['.rogue-story-actions'].innerHTML.includes('再让我准备一下'));
		assert(!nodes['.rogue-story-actions'].innerHTML.includes('storySkip'));
		c.room.storyNext();
		assert(c.sent[0].includes('"action":"storynext"')); assert(!c.sent[0].includes('"action":"battle"'));
		assert.notEqual(c.room.storySignature(next.story), c.room.storySignature({...next.story, encounter: '40:boss:0:gym:brock'}));
	});
	it('continues the server page, blocks duplicate clicks, and hides starter controls while reading', () => {
		const c = client(), data = state();
		data.story = {stage: 'opening', scene: 'chamber', title: '醒来', text: '你在塔里吗？', key: 'opening:0', index: 0, total: 8, canSkip: false};
		c.room.receiveState(data);
		assert(c.room.html.includes('你在塔里吗？'));
		assert(!c.room.html.includes('name="startAdventure"')); assert(!c.room.html.includes('name="storySkip"'));
		c.room.storyNext(); c.room.storyNext();
		assert.equal(c.sent.length, 1);
		const command = JSON.parse(c.sent[0].slice('/fantasyrogue story '.length));
		assert.equal(command.action, 'storynext'); assert.equal(command.value, 'opening:0');
		const next = structuredClone(data); next.story.index++; next.story.key = 'opening:1'; next.story.canSkip = true;
		c.room.receiveAction({userid: data.userid, id: command.id, ok: true, state: next});
		assert(c.room.html.includes('2/8')); assert(c.room.html.includes('name="storySkip"'));
	});
	it('keeps the same scene and dialogue nodes through pending, acknowledgement and repeated renders', () => {
		const c = client(), data = state();
		data.story = {stage: 'opening', scene: 'chamber', title: '醒来', text: '第一句', key: 'opening:0', index: 0, total: 8, canSkip: true};
		c.room.receiveState(data);
		const nodes = {};
		for (const name of ['.rogue-story-scene', '.rogue-story-chapter', 'strong', 'span', 'small', 'button[name=storySkip]']) nodes[name] = {};
		nodes['.rogue-story-dialogue'] = {setAttribute() {}, querySelector: key => nodes[key]};
		const section = {dataset: {story: c.room.storySignature(data.story)}, setAttribute() {}, querySelector: key => nodes[key]};
		c.room.$el[0] = {querySelector: () => section};
		c.room.$el.html = () => { throw new Error('Must not rebuild the scene on a page turn'); };
		c.room.updateParty = () => { throw new Error('Must not rebuild the unchanged party on a page turn'); };
		c.room.storyNext();
		assert(nodes['.rogue-story-dialogue'].disabled);
		assert(!c.room.html.includes('正在保存操作'));
		const command = JSON.parse(c.sent[0].slice('/fantasyrogue story '.length));
		const next = structuredClone(data); next.account.revision++;
		Object.assign(next.story, {index: 1, key: 'opening:1', text: '第二句', scene: 'letter'});
		c.room.receiveAction({userid: data.userid, id: command.id, ok: true, state: next});
		assert.equal(nodes.span.innerHTML, '第二句');
		assert.equal(nodes['.rogue-story-scene'].className, 'rogue-story-scene scene-letter');
		assert.equal(nodes['.rogue-story-dialogue'].disabled, false);
		c.room.render(true); assert.equal(nodes.small.textContent, '轻点继续 ▷ · 2/8');
	});
	it('cycles the deck by keyboard without claiming a card until it is clicked', () => {
		const c = client(), data = state();
		data.story = {stage: 'cards', cards: Array.from({length: 19}, (_, i) => ({id: String(i), type: '', name: '卡片 ' + i, text: '效果'}))};
		c.room.receiveState(data);
		let prevented = false;
		c.room.cardKey({key: 'ArrowLeft', preventDefault() { prevented = true; }});
		assert(prevented); assert.equal(c.room.startCardIndex, 18); assert.equal(c.sent.length, 0);
		assert(c.room.html.includes('value="18" class="rogue-start-card"'));
		c.room.cardKey({key: 'ArrowRight', preventDefault() {}}); assert.equal(c.room.startCardIndex, 0);
		c.room.pickStartCard('0'); c.room.pickStartCard('0'); assert.equal(c.sent.length, 1);
		assert.equal(JSON.parse(c.sent[0].slice('/fantasyrogue action '.length)).action, 'startcard');
	});
	it('hands the final battle an ending notice without interrupting its animation', () => {
		const c = client(), data = adventure('battle');
		data.run.id = 'last-run'; data.run.floor = 200; data.run.roomid = 'battle-final';
		c.room.receiveState(data);
		let updates = 0;
		c.app.rooms['battle-final'] = {fantasyRogue: {userid: data.userid}, updateControls() { updates++; }};
		const result = structuredClone(data); result.run.phase = 'complete'; delete result.run.roomid;
		result.story = {stage: 'ending', scene: 'summit', title: '塔顶', text: '旅途结束。', index: 0, total: 6};
		c.room.receiveState(result);
		assert(c.app.rooms['battle-final'].fantasyRogueEnding); assert.equal(updates, 1);
		assert.equal(c.joined.length, 0);
	});
	function gallery(c) {
		const room = Object.create(c.FantasyRogueGalleryRoom);
		room.$el = {addClass() {}, html: html => { room.html = html; }};
		room.$ = () => ({val: () => room.chosen || ''});
		room.listenTo = (source, event, callback) => source.on(event, callback.bind(room));
		room.initialize();
		room.receiveGallery({userid: 'rogueplayer', account: {revision: 1}, own: [], cards: [], invitations: [], offset: 0, rulesVersion: 'current'});
		return room;
	}
	it('publishes only the selected saved ID and requires confirmation before deleting a card', () => {
		const c = client(), room = gallery(c);
		room.publishCard('archive1|public'); room.publishCard('archive1|public'); assert.equal(c.sent.length, 1);
		const command = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(command.member, 'archive1'); assert.equal(command.value, 'public'); assert(!command.team);
		room.receiveMutation({userid: 'rogueplayer', id: command.id, ok: true});
		const count = c.sent.length;
		room.deleteCard('archive1'); assert.equal(c.sent.length, count);
		const popup = Object.create(c.RogueCardConfirmPopup);
		popup.$el = {html() {}}; popup.close = () => {};
		popup.initialize(c.app.lastPopup.data);
		c.setUser('differentplayer'); popup.confirmCard(); assert.equal(c.sent.length, count);
		c.setUser('rogueplayer'); popup.confirmCard();
		assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).action, 'deletecard');
	});
	it('shows faithful archived comparisons, effect sources and additional abilities in public cards', () => {
		const c = client(), room = gallery(c), data = adventure(), mon = structuredClone(data.run.team[0]);
		const baseline = {hp: 100, atk: 50, def: 40, spa: 60, spd: 40, spe: 70};
		const detail = {baseline, final: {...baseline, atk: 100}, delta: {...baseline, atk: 50}, percent: {...baseline, atk: 100},
			types: ['Grass'], sources: [{name: '个人永久训练', text: '双攻 +50%'}],
			extraAbilities: [{id: 'hugepower', source: '已获得的额外特性'}]};
		const card = {id: 'clear', owner: 'someone', name: '测试', completedAt: 1, contentVersion: 'test',
			snapshot: {team: [mon], boosts: data.run.boosts, blessings: [{id: 'hpgrowth', name: '越打命越硬', text: 'HP 提升', floor: 1}],
				memberDetails: {[mon.id]: detail}, blessingEffects: {owned: []}}};
		room.receiveGallery({userid: 'rogueplayer', account: {revision: 1}, own: [], cards: [card], invitations: [], offset: 0, rulesVersion: 'current'});
		for (const text of ['增幅前', '常驻最终值', '增加值', '增幅比例', '个人永久训练', '额外特性', '越打命越硬', '+100%', '<strong>100</strong>', '殿堂留影', 'rogue-clear-stat-tiles']) assert(room.html.includes(text), text);
		assert(!room.html.includes('<table'));
		assert(room.html.includes('<details class="rogue-clear-details" data-member="' + mon.id + '">'));
		assert(room.html.includes('data-clear-member="' + mon.id + '"'));
		assert(room.html.includes('viewBox="0 0 340 270"'));
		assert(room.html.includes('aria-label="HP 100，攻击 100，防御 40，速度 70，特防 40，特攻 60"'));
		assert(room.html.includes('data-stat-mode="numbers"'));
		assert(room.html.includes('alt="Grass"'));
		assert(room.html.includes('<strong>属性转：无</strong>'));
		assert(room.html.includes('data-type="Grass"'));
		assert(room.html.includes('攻击目标造成伤害'));
		assert(!room.html.includes('rogue-clear-confetti'));
		card.snapshot.spirit = 'mewtwo'; card.snapshot.spiritName = '蕾冠王的研悟';
		const pixels = []; c.Dex.getTeambuilderSprite = (set, gen, pixel) => { if (pixel) pixels.push([set.species, gen]); return ''; };
		room.render(); assert(pixels.some(([species, gen]) => species === 'Calyrex' && gen === 5));
		assert(room.html.includes('rogue-clear-spirit')); assert(room.html.includes('蕾冠王的研悟'));
		delete card.snapshot.memberDetails;
		room.render(); assert(room.html.includes('旧卡未记录增幅前数值'));
		assert(room.html.includes('历史 0 档'));
		card.snapshot.difficulty='easy';card.snapshot.difficultyLabel='护符庇佑';card.snapshot.difficultyScale=0.9;
		room.render();assert(room.html.includes('护符庇佑'));assert(room.html.includes('tempting-charm.webp'));
	});
	it('celebrates a newly completed journey once, without replaying confetti on old collections', () => {
		let now = 10000;
		const c = client(false, false, {Date: class extends Date {static now() {return now;}}});
		const data = adventure('ready'); data.storyEnabled = true; data.run.id = 'new-clear';
		c.room.receiveState(data);
		const completed = structuredClone(data); completed.run.phase = 'complete';
		completed.cards = [{id: 'clear', runId: completed.run.id, name: '测试', completedAt: now, snapshot: {
			team: completed.run.team, box: [], boosts: completed.run.boosts, blessings: [], difficulty: 0,
		}}];
		c.room.receiveState(completed); assert(c.room.html.includes('rogue-clear-confetti'));
		now += 5000; c.room.render(); assert(!c.room.html.includes('rogue-clear-confetti'));
		const fresh = client(); fresh.room.receiveState(completed);
		assert(!fresh.room.html.includes('rogue-clear-confetti'));
	});
	it('enters a duel only after an acknowledgement for the signed-in player', () => {
		const c = client(), room = gallery(c); room.chosen = 'myarchive';
		room.acceptDuel('invite1'); room.acceptDuel('invite1'); assert.equal(c.sent.length, 1);
		const command = JSON.parse(c.sent[0].slice('/fantasyrogue duel '.length));
		assert.equal(command.card, 'myarchive'); assert.equal(command.id, 'invite1'); assert(!command.team);
		room.receiveDuel({userid: 'another', ok: true, roomid: 'battle-other'}); assert.equal(c.joined.length, 0);
		room.receiveDuel({userid: 'rogueplayer', ok: true, roomid: 'battle-ours'}); assert.deepEqual(c.joined, ['battle-ours']);
	});
	it('offers a newly freed collection slot for a pending clear instead of forcing another replacement', () => {
		const c = client(); c.room.receiveState(state());
		const html = c.room.renderPendingClear({}, [{id: 'kept1'}, {id: 'kept2'}], false);
		assert(html.includes('收藏至空位')); assert(!html.includes('替换第'));
		c.room.resolveClear('');
		const popup = Object.create(c.RogueCardConfirmPopup);
		popup.$el = {html() {}}; popup.close = () => {};
		popup.initialize(c.app.lastPopup.data); popup.confirmCard();
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'saveclear'); assert.equal(command.value, '');
	});
});
describe('Fantasy Rogue medicine-backed rematch interface', () => {
	function treatment(insufficientHP = false) {
		const data = adventure('ready'); data.run.id = 'rematch-ui';
		data.run.retryHealing = {key: 'quote1', insufficientHP, items: [{id: 'potion', name: '伤药', count: 2}],
			missingCures: [{id: 'hurt', species: 'Bulbasaur', statuses: ['par']}], members: [
				{id: 'hurt', species: 'Bulbasaur', hp: 5, maxhp: 100, statuses: ['par'], disabled: false,
					items: [{id: 'potion', name: '伤药', count: 2}], missingCures: []},
				{id: 'healthy', species: 'Squirtle', hp: 100, maxhp: 100, statuses: [], disabled: true, items: [], missingCures: []},
				{id: 'dead', species: 'Charmander', hp: 0, maxhp: 100, statuses: [], disabled: true, dead: true, items: [], missingCures: []},
			]};
		return data;
	}
	it('shows item counts and missing cures without spending, then closes and joins only after server confirmation', () => {
		const c = client(), data = treatment(); c.room.receiveState(data);
		const popup = c.room.retryHealingPopup;
		assert(popup.html.includes('伤药 <b>×2</b>')); assert(popup.html.includes('缺少对应治疗药物'));
		assert.equal(c.sent.length, 0); assert.equal(c.joined.length, 0);
		const before = JSON.stringify(data); popup.confirmHealing();
		assert.equal(JSON.stringify(data), before); assert.equal(c.room.retryHealingPopup, popup);
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'retryheal'); assert.equal(request.value, 'quote1');
		popup.confirmHealing(); assert.equal(c.sent.length, 1, 'double clicks cannot spend twice');
		const next = structuredClone(data); delete next.run.retryHealing;
		next.run.phase = 'battle'; next.run.roomid = 'battle-rematch'; next.account.revision++;
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: next});
		assert(popup.removed); assert(!c.room.retryHealingPopup); assert(c.joined.includes('battle-rematch'));
	});
	it('lists all partners when supplies run short, rejects healthy/dead choices and sends the selected patient', () => {
		const c = client(), data = treatment(true); c.room.receiveState(data);
		const popup = c.room.retryHealingPopup;
		assert(popup.html.includes('药品不足')); assert(popup.html.includes('value="healthy" disabled'));
		assert(popup.html.includes('value="dead" disabled')); assert(popup.html.includes('本局已永久死亡'));
		popup.choosePatient('healthy'); popup.confirmHealing(); assert.equal(c.sent.length, 0);
		popup.choosePatient('dead'); assert(!popup.member);
		popup.choosePatient('hurt'); assert.equal(c.sent.length, 0); assert(popup.html.includes('伤药 <b>×2</b>'));
		popup.confirmHealing(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.member, 'hurt'); assert.equal(request.value, 'quote1');
		const next = structuredClone(data); next.run.retryHealing.key = 'quote2'; next.account.revision++;
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: next});
		assert.equal(c.room.retryHealingPopup, popup); assert.equal(popup.member, '');
	});
	it('confirms a single partner treatment without starting a rematch, even when medicine is insufficient', () => {
		const c = client(), data = treatment(true);
		data.run.retryHealing.purpose = 'heal'; data.run.retryHealing.member = data.run.team[0].id;
		c.room.receiveState(data); const popup = c.room.retryHealingPopup;
		assert(popup.html.includes('一键治疗')); assert(popup.html.includes('药品不足以完全恢复'));
		assert(!popup.html.includes('name="choosePatient"'));
		popup.confirmHealing();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'retryheal'); assert.equal(request.member, data.run.team[0].id);
		const next = structuredClone(data); delete next.run.retryHealing; next.account.revision++;
		next.run.team[0].hp = next.run.team[0].maxhp;
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: next});
		assert(popup.removed); assert(!c.room.retryHealingPopup); assert.equal(c.joined.length, 0);
		assert.equal(c.room.state.run.phase, 'ready');
	});
	it('supports reconnect, no medicine, cancellation and identity changes without stale submissions', () => {
		const c = client(), data = treatment(true); data.run.retryHealing.items = [];
		c.room.receiveState(data); const popup = c.room.retryHealingPopup;
		assert(popup.html.includes('不消耗道具，继续再战'));
		c.room.render(); assert.equal(c.app.popups.length, 1);
		popup.cancelHealing(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'retrycancel');
		c.room.receiveAction({userid: data.userid, id: request.id, ok: false, message: '连接已变化', state: data});
		assert(popup.html.includes('连接已变化')); assert(c.room.retryHealingPopup);
		c.setUser('another'); c.room.identityChanged(); assert(!c.room.retryHealingPopup);
		const count = c.sent.length; popup.confirmHealing(); popup.cancelHealing(); assert.equal(c.sent.length, count);
	});
	it('waits for move confirmation and keeps the landing page free of automatic retry popups', () => {
		const c = client(), data = treatment(); data.run.pendingMoves = [{member: data.run.team[0].id, move: 'vinewhip'}];
		c.room.receiveState(data); assert(c.room.pendingMovePopup); assert(!c.room.retryHealingPopup);
		data.run.pendingMoves = []; c.room.receiveState(data); assert(c.room.retryHealingPopup);
		c.room.startMenu(); assert(!c.room.retryHealingPopup); c.room.enterGame(); assert(c.room.retryHealingPopup);
	});
	it('returns to the landing menu when the adventure ends, without consuming the next opening', () => {
		const c = client(); c.room.receiveState(adventure('ready'));
		const next = state(); next.story = {stage: 'opening', scene: 'chamber', title: '醒来', text: '下一局的开场', index: 0, total: 8};
		c.room.receiveState(next); assert.equal(c.room.screen, 'home');
		assert(c.room.html.includes('开始你的幻想杯肉鸽之旅')); assert(!c.room.html.includes('下一局的开场'));
		c.room.enterGame(); assert(c.room.html.includes('下一局的开场'));
	});
});

function adventure(phase = 'choose') {
	const data = state();
	const stats = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
	data.items = [
		{id: 'potion', name: '伤药', kind: 'heal', amount: 20, price: 150},
		{id: 'pokeball', name: '精灵球', kind: 'ball', price: 200},
		{id: 'oranberry', name: '橙橙果', kind: 'held', price: 200},
	];
	data.run = {floor: 10, phase, money: 321, bag: {potion: 2, pokeball: 3, oranberry: 1}, boosts: stats,
		choices: [{id: 'wild', name: '草地', kind: 'wild', reward: {money: 162, items: {potion: 1}, points: 0}}],
		node: {name: 'Boss', kind: 'boss', reward: {money: 1200, items: {pokeball: 3}, points: 1}},
		lastReward: {floor: 8, money: 246, items: {potion: 1}, points: 0},
		team: [{id: 'run:1:member:0', hp: 10, maxhp: 20, status: '', baseStats: {...stats, hp: 45}, stats: {...stats, hp: 20},
			set: {species: 'Bulbasaur', level: 5, ability: 'Overgrow', item: '', moves: ['tackle', 'growl'], evs: {...stats, spa: 1}, ivs: stats},
			pp: [{id: 'tackle', pp: 2, maxpp: 35}, {id: 'growl', pp: 15, maxpp: 40}],
			moveMemory: [{id: 'tackle', pp: 2, maxpp: 35}, {id: 'growl', pp: 15, maxpp: 40}, {id: 'vinewhip', pp: 4, maxpp: 25}],
			abilityPool: [{id: 'overgrow', hidden: false}, {id: 'chlorophyll', hidden: true}],
		}]};
	return data;
}
describe('Fantasy Rogue event display and spectator playback', () => {
	it('keeps event choices usable when an optional secondary description is absent', () => {
		const c = client(), data = adventure('event');
		data.run.event = {id: 'masterballgift', key: 'masterball:offer', stage: 'choice', title: '无垠极境的终极馈赠',
			paragraphs: ['研究员托付了一份礼物。'], options: [{id: 'promise', name: '留给愿意一起走下去的伙伴。', disabled: false}]};
		c.room.receiveState(data);
		assert(c.room.html.includes('name="chooseEvent" value="promise"'));
		c.room.chooseEvent('promise');
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.member, 'masterball:offer'); assert.equal(command.value, 'promise');
	});
	it('renders and submits both fragment reward choices after loading a saved event', () => {
		for (const id of ['room', 'forest', 'bandits']) {
			for (const choice of ['fragments', 'supplies']) {
				const c = client(), data = adventure('event');
				data.run.floor = 56;
				data.run.node = {kind: 'event', name: '事件', reward: {money: 0, items: {}}};
				data.run.event = {id, key: 'saved-reward', stage: 'fragments', title: '奖励选择',
					paragraphs: ['门终于打开了。选一份，继续走吧。'], options: [
						{id: 'fragments', name: '带走幻想碎片。', text: '幻想碎片 ×10', disabled: false},
						{id: 'supplies', name: '带走工具箱和随附的小份碎片。', text: '', disabled: false},
					]};
				c.room.receiveState(data);
				for (const value of ['fragments', 'supplies']) assert(c.room.html.includes('name="chooseEvent" value="' + value + '"'));
				assert(!c.room.html.includes('整理完毕，继续前进'));
				c.room.chooseEvent(choice);
				const command = JSON.parse(c.sent[c.sent.length - 1].slice(c.sent[c.sent.length - 1].indexOf('{')));
				assert.equal(command.action, 'event'); assert.equal(command.member, 'saved-reward'); assert.equal(command.value, choice);
				const busy = c.room.renderEvent(data.run, true);
				assert(busy.includes('value="fragments" disabled')); assert(busy.includes('value="supplies" disabled'));
			}
		}
	});
	it('welcomes a trained returning partner through the placement panel without calling it a new capture', () => {
		const c = client(), data = adventure('settlement');
		data.run.pendingCapture = {...data.run.team[0], id: 'returning'}; data.run.returningPartner = true;
		c.room.receiveState(data);
		assert(c.room.html.includes('迎接修行伙伴')); assert(c.room.html.includes('修行归来的'));
		assert(!c.room.html.includes('捕捉解锁已保存')); assert(c.room.html.includes('告别这位伙伴'));
	});
	it('shows region, title and a lighter person subtitle in each active floor heading', () => {
		const c = client(), data = adventure('event');
		data.run.node = {kind: 'event', name: '旅途同行 · 露璃娜', reward: {money: 0, items: {}}};
		c.room.receiveState(data);
		assert(c.room.html.includes('第 10 / 200 层 · <strong class="rogue-heading-region" data-kind="event">事件</strong> · 旅途同行 · <span class="rogue-floor-subtitle">露璃娜</span>'));
	});
	it('uses Chinese gender labels in party sheets and blessing gifts, preserving the internal gender IDs', () => {
		for (const [gender, label] of [['M', '雄性'], ['F', '雌性'], ['N', '无性别']]) {
			const c = client(), data = adventure(); data.run.team[0].set.gender = gender;
			c.room.receiveState(data);
			assert(c.html.includes('性别<br /><b>' + label + '</b>'));
			data.run.blessings = {owned: [], pending: [{id: 'gift', kind: 'gift', title: '新伙伴', pokemon: data.run.team[0]}]};
			assert(c.room.renderBlessingChoice(data.run, false).includes(' · ' + label + '</p>'));
			assert.equal(data.run.team[0].set.gender, gender);
		}
	});
	it('links both robe blessings from Kill la Girl and clears filters when following either link', () => {
		const c = client(true); c.room.receiveState(state()); c.room.openCodex('blessings');
		const entries = [{id: 'killlagirl', family: 'killlagirl', name: '斩服少女', tier: 'prismatic', unlocked: true,
			text: '分别继承【神衣鲜血】与【神衣纯洁】。'}, ...Array.from({length: 12}, (_, i) => ({id: 'test' + i, family: 'test' + i, name: '测试' + i, text: '', tier: 'silver', unlocked: true})),
			...['godrobe', 'puregodrobe'].map((id, i) => ({id, family: id, name: i ? '神衣纯洁' : '神衣鲜血', text: '', tier: 'prismatic', unlocked: true}))];
		c.room.receiveCodex({userid: 'rogueplayer', section: 'blessings', entries});
		for (const family of ['godrobe', 'puregodrobe']) assert(c.room.html.includes('name="jumpBlessing" value="' + family + '"'));
		for (const family of ['godrobe', 'puregodrobe']) {
			c.room.codexQuery = '斩服少女'; c.room.codexFilter = 'gold'; c.room.jumpBlessing(family);
			assert.equal(c.room.codexFilter, 'all'); assert.equal(c.room.codexQuery, ''); assert.equal(c.room.codexPage, 1);
			assert(c.room.html.includes('data-codex-family="' + family + '"'));
		}
	});
	it('shows new affinity receipts beside portraits immediately without replaying them after reconnect', () => {
		let now = 10000;
		const c = client(false, false, {Date: class extends Date { static now() { return now; } }});
		const data = adventure();
		data.run.trainerBonds = [{id: 'marnie', score: 6, lastGain: {receipt: 'first'}}];
		c.room.receiveState(data);
		const story = {key: 'answer:1', scene: 'arena', title: '玛俐', portrait: 'marnie', affection: 8};
		assert(!c.room.storyArt(story).includes('好感度 +'));
		const next = structuredClone(data);
		next.run.trainerBonds[0] = {id: 'marnie', score: 8, lastGain: {receipt: 'second'}};
		c.room.receiveState(next);
		const html = c.room.storyArt(story);
		assert(html.includes('title="当前好感度：8"')); assert(html.includes('好感度 +2'));
		now += 3000; c.room.receiveState(structuredClone(next));
		assert(c.room.storyArt(story).includes('好感度 +2'), 'ordinary redraws retain the short-lived notice');
		now += 1001;
		assert(!c.room.storyArt(story).includes('好感度 +'), 'duplicate receipts do not restart the animation');
		const third = structuredClone(next);
		third.run.trainerBonds[0] = {id: 'marnie', score: 11, lastGain: {receipt: 'third'}};
		third.run.event = {title: '重逢', paragraphs: ['你好。'], options: [], rivalPortrait: 'marnie', affection: 11};
		c.room.receiveState(third);
		const event = c.room.renderEvent(third.run, false);
		assert(event.includes('title="当前好感度：11"')); assert(event.includes('好感度 +3'));
		const milestone = structuredClone(third);
		milestone.run.trainerBonds[0] = {id: 'marnie', score: 50, lastGain: {receipt: 'milestone'}};
		milestone.run.affectionScene = {id: 'marnie', name: '玛俐', title: '一路同行', stage: 50, text: '谢谢你。', options: []};
		c.room.receiveState(milestone);
		assert(c.html.includes('rogue-affection-scene-art'));
		assert(c.html.includes('好感度 +39'));
		const fourth = structuredClone(third); fourth.run.id = 'new-run'; c.room.receiveState(fourth);
		assert(!c.room.storyArt(story).includes('好感度 +'));
	});
	it('contains paired and native rival portraits alongside event text before all event controls', () => {
		const c = client(), data = adventure('ready');
		for (const portrait of ['silver', 'unknowntrainer']) {
			data.run.event = {title: '初次切磋', paragraphs: ['来对战吧。'], rivalPortrait: portrait, stage: 'battle'};
			const html = c.room.renderEvent(data.run, false);
			assert(html.includes('rogue-event-intro has-portrait'));
			assert.match(html, /<div class="rogue-event-text">[\s\S]*<\/div><(?:span|img)[\s\S]*<\/div><\/article>$/);
		}
	});
	it('makes region types the main heading while retaining biome details and escaped subtitles', () => {
		const c = client(), data = adventure();
		data.run.choices = [
			{id: 'wild', name: '天空之柱<test>', kind: 'wild', biome: {level: 3, tier: 0}},
			{id: 'elite', name: '精英挑战', kind: 'elite'},
			{id: 'adventure', name: '旅途中的相遇', kind: 'adventure'},
			{id: 'encounter', name: '治安协助', kind: 'encounter'},
		];
		c.room.receiveState(data);
		for (const type of ['战斗', '精英', '奇遇', '遭遇']) assert(c.room.html.includes('class="rogue-route-type">' + type + '</strong>'));
		assert(c.room.html.includes('class="rogue-route-subtitle">天空之柱&lt;test></span><small>Lv.3'));
		assert(!c.room.html.includes('rogue-route-orange')); assert(c.room.html.includes('rogue-route-rose'));
		assert.equal((c.room.html.match(/rogue-route-red/g) || []).length, 3);
	});
	it('renders auction budgets, lots and legal tutor choices using normal event commands', () => {
		const c = client(false, true), data = adventure('event');
		data.run.event = {id: 'auction', title: '落槌之前', key: 'auction-key', stage: 'choice',
			paragraphs: ['交替出价，落槌付款。'], auction: {catalog: '1. 【Light Ball】', npcs: [{name: '行商', budget: 6500}]},
			options: [{id: 'bid', name: '加价到 3000 金币。', text: '', disabled: false}]};
		c.room.receiveState(data);
		assert(c.html.includes('电气球') && c.html.includes('剩余预算') && c.html.includes('6500'));
		assert(c.html.includes('rogue-auction-board'));
		data.run.event = {id: 'fantasytutor', title: '幻想招式教学', key: 'tutor-key', stage: 'choice', paragraphs: [], options: [],
			picker: {label: '选择幻想招式', options: [{id: 'fantasymove:huanshenbu', name: 'Huan Shen Bu', text: '10 幻想碎片', disabled: false}]}};
		c.room.receiveState(data); c.room.controls['select[name=eventMove]'] = 'fantasymove:huanshenbu';
		assert(c.html.includes('10 幻想碎片')); assert(c.html.includes('确认学习'));
	});
	it('explains continuous wild battles and the saved five-turn environment before entry', () => {
		const c = client(), data = adventure('ready'); data.run.encounter = 0; data.run.encounters = 1;
		data.run.node = {kind: 'wild', name: '电厂', wildPack: 4, environment: {name: '电气场地'}, reward: {money: 0, items: {}}};
		c.room.receiveState(data); assert(c.html.includes('连续野生对战 · 4 只'));
		assert(c.html.includes('电气场地') && c.html.includes('持续 5 回合'));
	});
	it('renders companion portraits, contextual advice and only the consulted recommendation', () => {
		const c = client(), data = adventure('event');
		data.run.companions = [{id: 'bea', name: '彩豆', preferences: 3, canConsult: true,
			message: '一起训练吧。', abilityOptions: ['guts'], member: {species: 'Machop'}}];
		data.run.event = {key: 'companion-event', stage: 'choice', title: '挑战', paragraphs: [],
			options: [{id: 'fight', name: '接受挑战', text: ''}, {id: 'leave', name: '暂不参与', text: ''}]};
		c.room.receiveState(data);
		assert(c.panel.html.includes('sprites/rogue-companions/bea.png'));
		assert(c.panel.html.includes('你想听听我的建议吗？'));
		assert(!c.room.html.includes('彩豆推荐'));
		c.room.companionAction('bea|advice');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'companion'); assert.equal(request.member, 'bea'); assert.equal(request.value, 'advice');
		data.account.revision++; data.run.companions[0].recommended = 'fight'; c.room.pending = null;
		c.room.receiveState(data);
		assert(c.room.html.includes('接受挑战（彩豆推荐）')); assert(!c.room.html.includes('暂不参与（彩豆推荐）'));
	});
	it('shows a shared-slot invitation and submits the saved invitation key', () => {
		const c = client(), data = adventure('choose');
		data.run.companionInvitation = {key: 'saved-invite', name: '丹瑜', roster: [
			{id: 'kieran', name: '乌栗'}, {id: 'liko', name: '莉可'},
		]};
		c.room.receiveState(data);
		assert(c.room.html.includes('丹瑜希望与你同行'));
		assert(c.room.html.includes('向莉可告别，接受邀请'));
		assert(!c.room.html.includes('name="selectNode"'));
		c.room.companionInviteAction('liko');
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'companioninvite'); assert.equal(command.member, 'saved-invite');
		assert.equal(command.value, 'liko');
	});
	it('keeps departed blessing selections and renders permanent social preferences separately from temporary rivals', () => {
		const c = client(), data = adventure('event');
		data.run.blessings = {owned: [{family: 'companionwinter', name: '冰属性男子与酷酷女同事'}], pending: []};
		data.run.companions = []; data.run.selectedCompanions = ['grusha'];
		data.run.socialCompanions = [{id: 'brock', name: '小刚', region: '关都', preference: 'pokemon',
			areas: ['reward'], preferences: 7, canConsult: true, giftOptions: []}];
		data.run.rivalCompanions = [{id: 'kieran', name: '乌栗', text: '结伴至第 66 层', affection: 8, message: '一起训练吧。'}];
		data.run.trainerBonds = [{id: 'brock', name: '小刚', score: 14, active: true, gifts: [], pending: []}];
		c.room.receiveState(data);
		assert(!c.panel.html.includes('choosewinter')); assert(c.panel.html.includes('小刚 · 常驻同行'));
		assert(c.panel.html.includes('progress value="14" max="100"')); assert(c.panel.html.includes('乌栗 · 劲敌'));
		assert(c.panel.html.includes('偏好关都相关、宝可梦选项'));
		c.room.socialCompanionAction('brock|advice');
		const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(command.action, 'socialcompanion'); assert.equal(command.member, 'brock');
	});
	it('offers both band trainers and exposes deferred gift and extra-Z assignment controls', () => {
		const c = client(), data = adventure('ready');
		data.run.blessings = {owned: [{family: 'companionband', id: 'companionband', name: '少女乐队的呐喊', text: ''}], pending: [], shards: 0};
		data.run.companions = []; c.room.receiveState(data);
		for (const id of ['marnie', 'roxie']) assert(c.panel.html.includes('value="' + id + '|chooseband"'));
		data.account.revision++;
		data.run.companions = [{id: 'marnie', name: '玛俐', zMove: {name: '熙熙攘攘我们的城市', type: 'Dark', category: 'Special', base: 'snarl'}, zCandidates: [{id: 'darkmon', species: 'Umbreon'}]}];
		c.room.receiveState(data); assert(c.panel.html.includes('value="marnie|z:darkmon"')); assert(c.panel.html.includes('逃跑返还'));
		data.account.revision++;
		data.run.companions = [{id: 'acerola', name: '阿塞罗拉', giftCounter: true, giftPending: true, preferences: 15,
			giftOptions: [{id: 'spelltag', name: '诅咒之符'}, {id: 'silkscarf', name: '丝绸围巾'}]}];
		c.room.receiveState(data);
		for (const item of ['spelltag', 'silkscarf']) assert(c.panel.html.includes('value="acerola|gift:' + item + '"'));
	});
	it('uses the supplied paired Ash portrait for social companions', () => {
		const c = client(), data = adventure('event');
		data.run.socialCompanions = [{id: 'ash', name: '小智', region: '关都', preference: 'battle',
			areas: ['wild'], preferences: 0, giftOptions: []}];
		c.room.receiveState(data);
		assert(c.panel.html.includes('小智 · 常驻同行'));
		assert(c.panel.html.includes('rogue-dialogue/ash.png?v=20261024-cutout'));
		assert(!c.panel.html.includes('class="rogue-rival-native"'));
	});
	it('shows a native avatar for a social companion without an expression sheet', () => {
		const c = client(), data = adventure('event');
		data.run.socialCompanions = [{id: 'unknowntrainer', name: '未收录训练家', region: '关都', preference: 'battle',
			areas: ['wild'], preferences: 0, giftOptions: []}];
		c.room.receiveState(data);
		assert(c.panel.html.includes('class="rogue-rival-native"'));
		assert(!c.panel.html.includes('background-image:url()'));
	});
	it('chooses either streamer and displays event recommendations with the affinity record', () => {
		for (const id of ['iono', 'canari']) {
			const c = client(), data = adventure('event'), name = id === 'iono' ? '奇树' : '卡娜莉';
			data.run.blessings = {owned: [{family: 'companionstreamer', id: 'companionstreamer', name: '主播女孩重度依赖', text: ''}], pending: [], shards: 0};
			data.run.event = {key: 'streamer-event', stage: 'choice', title: '挑战', paragraphs: [], options: [{id: 'fight', name: '接受挑战', text: ''}]};
			c.room.receiveState(data);
			for (const trainer of ['iono', 'canari']) assert(c.panel.html.includes('sprites/rogue-companions/' + trainer + '.png'));
			c.room.companionAction(id + '|choosestreamer');
			const command = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
			assert.equal(command.value, 'choosestreamer'); assert.equal(command.member, id);
			data.account.revision++; c.room.pending = null;
			data.run.companions = [{id, name, preferences: 6, giftCounter: true, recommended: 'fight', canConsult: true, typeOptions: [], abilityOptions: []}];
			data.run.trainerBonds = [{id, name, score: 12, active: true, gifts: [], pending: []}];
			c.room.receiveState(data);
			assert(c.panel.html.includes('<strong>好感度</strong><progress value="12" max="100"'));
			assert(c.panel.html.includes('<b>12 / 100</b>')); assert(c.html.includes('接受挑战（' + name + '推荐）'));
		}
	});
	it('uses distinct AI portraits and offers acceptance only for successful previews', () => {
		const c = client(), data = adventure('ready');
		data.run.blessings = {owned: [{family: 'companionai', id: 'companionai', name: '乐园防卫程序', text: ''}], pending: [], shards: 0};
		c.room.receiveState(data);
		for (const id of ['sada', 'turo']) assert(c.panel.html.includes('sprites/rogue-companions/' + id + '.png'));
		data.run.preview = {trainer: 'sada', stage: 'result', won: true}; c.room.receiveState(data);
		assert(c.room.html.includes('previewresult:accept')); assert(c.room.html.includes('previewresult:personal'));
		assert(!c.room.html.includes('进入第 1'));
		data.run.preview.won = false; c.room.receiveState(data);
		assert(!c.room.html.includes('previewresult:accept')); assert(c.room.html.includes('previewresult:personal'));
	});
	it('emphasizes important dialogue safely without exposing HTML', () => {
		const c = client(), data = adventure('event');
		data.run.event = {title: '提醒', stage: 'choice', paragraphs: ['挑战【幻想精英】前准备好 300 金币。<img src=x onerror=alert(1)>'], options: []};
		c.room.receiveState(data);
		assert(c.room.html.includes('<strong>【幻想精英】</strong>')); assert(c.room.html.includes('<strong>300 金币</strong>'));
		assert(c.room.html.includes('&lt;img')); assert(!c.room.html.includes('<img src=x'));
	});
	it('localizes a move picker, retains the event key and sends only the selected move', () => {
		const c = client(), data = adventure('event');
		Object.assign(c.translations, {Bulbasaur: '妙蛙种子', 'Grass Pledge': '草之誓约', Grass: '草', Special: '特殊'});
		data.run.event = {key: 'tutor-key', stage: 'choice', title: '读万卷书，行万里路',
			paragraphs: ['为 Bulbasaur 选择一个尚未掌握的合法传授招式。'], options: [],
			picker: {label: '选择招式', options: [
				{id: 'move:grasspledge', name: 'Grass Pledge', text: '免费 · Grass · Special · 威力 80'},
				{id: 'move:gigadrain', name: 'Giga Drain', text: '1200 金币', disabled: true},
			]}};
		c.room.receiveState(data);
		for (const label of ['为 妙蛙种子', '草之誓约', '免费 · 草 · 特殊', '确认学习', 'value="move:gigadrain" disabled']) assert(c.room.html.includes(label), label);
		c.room.controls['select[name=eventMove]'] = 'move:grasspledge';
		c.room.chooseEventMove(); c.room.chooseEventMove();
		assert.equal(c.sent.length, 1);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.member, 'tutor-key'); assert.equal(request.value, 'move:grasspledge');
	});
	it('displays EV limits and remaining points, and sends the full allocation for server validation', () => {
		const c = client(), data = adventure('event'), empty = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
		data.run.event = {key: 'elder-key', stage: 'choice', title: '这是武术的胜利', paragraphs: [],
			options: [{id: 'allocate', name: '确认分配', text: ''}],
			evAllocation: {member: data.run.team[0].id, total: 30, minimum: {...empty, atk: 10}, current: {...empty, atk: 10}}};
		c.room.receiveState(data);
		assert(c.room.html.includes('尚待分配：20 点'));
		assert(c.room.html.includes('name="event-ev-atk" min="10" max="252"'));
		const evs = {...empty, atk: 10, spa: 20};
		for (const stat in evs) c.room.controls['input[name=event-ev-' + stat + ']'] = evs[stat];
		c.room.updateEventEVTotal(); assert.equal(c.room.controls['.rogue-event-ev-remaining'], '尚待分配：0 点');
		c.room.chooseEvent('allocate');
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.deepEqual(request.evs, evs); assert.equal(request.member, 'elder-key');
	});
	it('previews regional changes and distinguishes restoration from ordinary event battle costs', () => {
		const c = client(), data = adventure('event');
		data.run.event = {key: 'memory-key', stage: 'choice', title: '旅行的回忆', paragraphs: [], options: [],
			preview: {before: 'Vulpix', after: 'Vulpix-Alola', types: ['Ice'], ability: 'Snow Cloak', stats: data.run.team[0].stats,
				hp: 3, maxhp: 20, removed: ['flamethrower'], added: ['iceshard'], equipped: ['iceshard']}};
		c.room.receiveState(data); assert(c.room.html.includes('Vulpix → Vulpix-Alola'));
		for (const text of ['移除不合法招式', '新增当前等级招式', '转换后携带招式', '变化后 HP：3 / 20']) assert(c.room.html.includes(text));
		data.run.phase = 'ready'; data.run.event.memoryBattle = true; data.run.event.stage = 'battle'; c.room.receiveState(data);
		assert(c.room.html.includes('恢复原队伍与背包的战前状态'));
	});
	it('shows the renamed event, opponent preview, costs and disabled unaffordable choices', () => {
		const c = client(), data = adventure('event');
		data.run.event = {key: 'forest-one', stage: 'choice', title: '斗蛐蛐！', paragraphs: ['双方各有三只。'],
			teams: [[{species: 'Bulbasaur', level: 10}], [{species: 'Squirtle', level: 10}]],
			options: [{id: 'left', name: '声援左边', text: '观战后按实际结果结算'},
				{id: 'trade', name: '交换', text: '需要 500 金币', disabled: true}]};
		c.room.receiveState(data);
		assert(c.room.html.includes('斗蛐蛐！')); assert(c.room.html.includes('右边的队伍'));
		assert(c.room.html.includes('value="trade" disabled'));
		c.room.chooseEvent('left'); c.room.chooseEvent('left');
		assert.equal(c.sent.length, 1);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.member, 'forest-one'); assert.equal(request.value, 'left');
	});
	it('lets the player prepare after defeat and shows money losses with a single minus sign', () => {
		const c = client(), data = adventure('event');
		data.run.event = {key: 'closed-event', stage: 'result', title: '事件结束', paragraphs: ['损耗已保留。'], options: []};
		data.run.team[0].hp = 0;
		data.run.lastReward = {floor: 10, money: -500, items: {}};
		c.room.receiveState(data);
		assert(c.room.html.includes('已结算')); assert(c.room.html.includes('−500')); assert(!c.room.html.includes('+-500'));
		assert(c.room.html.includes('请先在右侧背包中复活'));
		assert(c.room.html.includes('value="continue" disabled'));
		data.run.team[0].hp = 5; c.room.receiveState(data);
		assert(!c.room.html.includes('value="continue" disabled'));
	});
	it('opens the native replay and cannot settle before playback ends or after the event changes', () => {
		const c = client(), data = adventure('event');
		data.run.event = {key: 'forest-watch', stage: 'watch', title: '斗蛐蛐！', paragraphs: [], replay: ['|start', '|win|左边的队伍']};
		c.room.receiveState(data); c.room.watchEvent();
		assert.equal(c.app.lastPopup.type, c.RogueEventReplayPopup);
		const popup = Object.create(c.RogueEventReplayPopup);
		popup.owner = c.room; popup.eventKey = data.run.event.key; popup.userid = 'rogueplayer';
		popup.battle = {ended: false, atQueueEnd: false}; popup.close = () => { popup.closed = true; };
		popup.finishEvent(); assert.equal(c.sent.length, 0); assert(!popup.closed);
		popup.battle.ended = true; popup.finishEvent(); assert.equal(c.sent.length, 0);
		popup.battle.atQueueEnd = true;
		c.room.state.run.event.key = 'new-event'; popup.finishEvent(); assert.equal(c.sent.length, 0);
		c.room.state.run.event.key = 'forest-watch'; popup.finishEvent();
		assert.equal(JSON.parse(c.sent[0].slice('/fantasyrogue action '.length)).value, 'watched');
	});
});
// Use the real layout/focus lifecycle: a focus-only mock misses a hidden room
// that was already marked as the current side room by preparePanel.
describe('Fantasy Rogue blessing controls', () => {
	function ready(phase = 'blessing') {
		const c = client(), data = adventure(phase);
		data.run.floor = 100; data.run.partyLimit = 6;
		data.run.blessings = { owned: [], pending: [], shards: 25, candy: 0, swordUses: 0, swordRewards: [], levels: 5,
			round: { tier: 'gold', remaining: 1, options: [{id: 'fategold', name: '黄金命运', text: '获得一个随机黄金祝福，不额外加级。', refreshes: 1}] } };
		c.room.receiveState(data); return {c, data};
	}
	it('shows phase-specific level costs and independently submits refreshes', () => {
		const {c} = ready();
		assert(c.room.html.includes('黄金命运')); assert(c.room.html.includes('固定首领 +15 级')); assert(c.room.html.includes('普通遭遇 +10 级'));
		assert(c.room.html.includes('刷新 1 次'));
		c.room.refreshBlessing('0');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'blessingrefresh'); assert.equal(request.slot, 0);
	});
	it('shows four pre-boss upgrades, retains three directions and submits the fourth choice', () => {
		const {c, data} = ready();
		delete data.run.blessings.round;
		data.run.blessings.evolutionCosts = [50, 100];
		data.run.blessings.evolutionBeforeBattle = true;
		data.run.blessings.stage = {kind: 'direction', options: [{id: 'stats', name: '数值进化'}]};
		c.room.receiveState(data);
		assert(c.room.html.includes('随后立即选择一次强化'));
		assert(c.room.html.includes('每次从四项能力中选一项'));
		assert(!c.room.html.includes('rogue-evolution-choices is-upgrade'));
		assert(c.room.html.includes('本轮按一份棱彩祝福'));
		c.room.chooseBlessingUpgrade('stats');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'blessing'); assert.equal(request.value, 'stats');
		data.run.floor = 200;
		data.run.blessings.stage = {kind: 'upgrade', options: ['hp', 'atk', 'def', 'spe'].map(stat => ({id: 'stat:' + stat, name: stat + ' +15%'}))};
		data.account.revision++;
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: data});
		assert(c.room.html.includes('已抵达第 200 层，强化后再挑战本层首领'));
		assert(!c.room.html.includes('完成最后一次强化后保存通关卡'));
		assert(c.room.html.includes('rogue-evolution-choices is-upgrade'));
		assert.equal((c.room.html.match(/name="chooseBlessingUpgrade"/g) || []).length, 4);
		assert(!c.room.html.includes('本轮按一份棱彩祝福'));
		c.room.chooseBlessingUpgrade('stat:spe');
		const fourth = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(fourth.value, 'stat:spe');
		data.run.blessings.evolutionBeforeBattle = false;
		c.room.receiveState(data);
		assert(c.room.html.includes('完成最后一次强化后保存通关卡'), 'old post-clear saves keep their pending reward');
	});
	it('selects a whole blessing card first and grants only on a second activation', () => {
		const {c, data} = ready();
		data.run.blessings.round.options.push({id: 'starters', name: '最初的伙伴', text: '选择伙伴', refreshes: 1});
		c.room.receiveState(data);
		const cards = data.run.blessings.round.options.map((option, index) => {
			const classes = new Set(), hint = {};
			return {value: String(index), hint, classList: {
				toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
				contains: name => classes.has(name),
			}, setAttribute(key, value) { this[key] = value; }, querySelector: () => hint};
		});
		c.room.controls['.rogue-blessing-card'] = cards;
		assert(c.room.html.includes('type="button" name="chooseBlessing"'));
		assert(!c.room.html.includes('获得此祝福'));
		c.room.chooseBlessing('0'); assert.equal(c.sent.length, 0);
		assert.equal(cards[0]['aria-pressed'], 'true'); assert(cards[0].hint.textContent.includes('再点一次领取'));
		c.room.chooseBlessing('1'); assert.equal(c.sent.length, 0);
		assert.equal(cards[0]['aria-pressed'], 'false'); assert.equal(cards[1]['aria-pressed'], 'true');
		c.room.chooseBlessing('1'); c.room.chooseBlessing('1');
		assert.equal(c.sent.length, 1);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'blessing'); assert.equal(request.slot, 1);
	});
	it('shows mixed slot qualities and costs in silver, gold, prismatic order', () => {
		const {c, data} = ready();
		data.run.blessings.round.tier = 'mixed';
		data.run.blessings.round.options = ['silver', 'gold', 'prismatic'].map((tier, index) => ({
			id: ['bond', 'smallfinal', 'psychic'][index], name: tier, text: '完整说明', tier, refreshes: 1,
		}));
		for (const floor of [1, 50, 100, 150]) {
			data.run.floor = floor;
			c.room.receiveState(data);
			const cards = [...c.room.html.matchAll(/<article class="rogue-blessing-option rogue-blessing-(\w+)">([\s\S]*?)<\/article>/g)];
			assert.deepEqual(cards.map(card => card[1]), ['silver', 'gold', 'prismatic']);
			assert(cards[0][2].includes('对手不额外加级'));
			const stage = Math.floor(floor / 50);
			assert(cards[1][2].includes('固定首领 +' + (stage + 1) * 5 + ' 级 · 普通遭遇 +' + stage * 5 + ' 级'));
			assert(cards[2][2].includes('固定首领 +' + (stage + 1) * 10 + ' 级 · 普通遭遇 +' + stage * 10 + ' 级'));
			assert(cards[1][2].includes('第 ' + (floor === 1 ? 11 : floor + 11) + ' 层起'));
			assert(cards.every(card => card[2].includes('刷新 1 次')));
		}
	});
	it('shows opening progress and uses the costs supplied by the server', () => {
		const {c, data} = ready();
		data.run.floor = 1; data.run.blessings.beforeAdventure = true;
		data.run.blessings.round.options[0].levelCost = {normal: 0, boss: 5};
		c.room.receiveState(data);
		assert(c.room.html.includes('启程祝福 · 第一层开战前'));
		assert(c.room.html.includes('固定首领 +5 级 · 普通遭遇 +0 级'));
		assert(!c.room.html.includes('+0.1'));
	});
	it('distinguishes active costs from saved pending costs and their activation floor', () => {
		const {c, data} = ready();
		data.run.blessings.levels = 5; data.run.blessings.bossLevels = 15;
		data.run.blessings.deferredLevels = [{floor: 100, startsAt: 111, normal: 20, boss: 30}];
		c.room.receiveState(data);
		const panel = c.room.renderBlessings(data.run, false);
		assert(panel.includes('祝福已生效加级：固定首领 +15 级 · 普通遭遇 +5 级'));
		assert(panel.includes('第 <b>111</b> 层起'));
		assert(panel.includes('固定首领再提高 <b>30</b> 级'));
		data.run.blessings.deferredLevels = [];
		c.room.receiveState(data);
		assert(!c.room.renderBlessings(data.run, false).includes('祝福准备期 · 待生效加级'));
	});
	it('refreshes without granting and requires selecting the replacement card again', () => {
		const {c, data} = ready();
		c.room.chooseBlessing('0'); c.room.refreshBlessing('0');
		assert.equal(c.sent.length, 1); assert.equal(c.room.selectedBlessing, null);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'blessingrefresh');
		const refreshed = structuredClone(data); refreshed.account.revision++;
		refreshed.run.blessings.round.options[0] = {id: 'starters', name: '最初的伙伴', text: '选择伙伴', refreshes: 0};
		c.room.receiveAction({userid: data.userid, id: request.id, ok: true, state: refreshed});
		c.room.refreshBlessing('0'); assert.equal(c.sent.length, 1, 'no refreshes remain');
		c.room.chooseBlessing('0'); assert.equal(c.sent.length, 1);
		c.room.chooseBlessing('0'); assert.equal(c.sent.length, 2);
	});
	it('clears blessing confirmation on a save revision, disconnect, or player change', () => {
		const {c, data} = ready();
		c.room.chooseBlessing('0');
		const revised = structuredClone(data); revised.account.revision++;
		c.room.receiveState(revised); assert.equal(c.room.selectedBlessing, null);
		c.room.chooseBlessing('0'); assert.equal(c.sent.length, 0);
		c.room.disconnected(); assert.equal(c.room.selectedBlessing, null);
		c.room.chooseBlessing('0'); assert.equal(c.sent.length, 0);
		c.room.identityChanged(); assert.equal(c.room.selectedBlessing, null);
	});
	it('blocks chosen cards, invalid slots, and cards hidden behind pending reward choices', () => {
		const {c, data} = ready();
		data.run.blessings.round.options[0].chosen = true;
		c.room.receiveState(data);
		c.room.chooseBlessing('0'); c.room.refreshBlessing('0');
		c.room.chooseBlessing('-1'); c.room.chooseBlessing('0.5'); c.room.chooseBlessing('99');
		assert.equal(c.sent.length, 0); assert.equal(c.room.selectedBlessing, null);
		assert(/rogue-blessing-card is-chosen[^>]+disabled/.test(c.room.html));
		data.run.blessings.round.options[0].chosen = false;
		data.run.blessings.pending.push({id: 'gift', kind: 'toolbox', title: '奖励', options: []});
		c.room.chooseBlessing('0'); c.room.refreshBlessing('0');
		assert.equal(c.sent.length, 0);
	});
	it('keeps the first pick claimed while selecting the second blessing in a two-pick round', () => {
		const {c, data} = ready();
		data.run.blessings.round.remaining = 2;
		data.run.blessings.round.options.push({id: 'bigmoney', name: '金金金金钱钱钱钱', text: '获得金币', refreshes: 1});
		c.room.receiveState(data); c.room.chooseBlessing('0'); c.room.chooseBlessing('0');
		const acknowledged = structuredClone(data); acknowledged.account.revision++;
		acknowledged.run.blessings.round.remaining = 1;
		acknowledged.run.blessings.round.options[0].chosen = true;
		c.room.receiveAction({userid: data.userid, id: c.room.pending.id, ok: true, state: acknowledged});
		c.room.chooseBlessing('0'); assert.equal(c.sent.length, 1);
		c.room.chooseBlessing('1'); assert.equal(c.sent.length, 1);
		c.room.chooseBlessing('1'); assert.equal(c.sent.length, 2);
		assert.equal(JSON.parse(c.sent[1].slice('/fantasyrogue action '.length)).slot, 1);
	});
	it('keeps owned blessings and overflowing psychic charge in the inventory tab', () => {
		const {c, data} = ready('choose');
		data.run.blessings.owned = [{id: 'psychic', family: 'psychic', tier: 'prismatic', name: '灵能百分百', text: '一击必杀'}];
		data.run.blessings.psychic = 102.75; c.room.receiveState(data);
		assert(c.panel.html.includes('102.75%')); assert(c.panel.html.includes('灵能百分百'));
		assert(!c.room.html.includes('102.75%'));
	});
	it('previews the actual blessed wild level while preserving the original ecology tier', () => {
		const {c, data} = ready('choose');
		data.run.choices[0].biome = {level: 51, tier: 2};
		data.run.blessings.levels = 20; c.room.receiveState(data);
		assert(c.room.html.includes('Lv.71（含祝福 +20）'));
		assert(c.room.html.includes('40～60 档宝可梦池'));
	});
	it('preserves the complete saved member ID in a permanent-upgrade confirmation', () => {
		const {c} = ready('choose');
		c.room.blessingMemberAction('fantasize:run:50:catch:2');
		assert.equal(c.app.lastPopup.data.details.member, 'run:50:catch:2');
		assert.equal(c.app.lastPopup.data.action, 'fantasize'); assert.equal(c.sent.length, 0);
	});
	it('asks before replacing a partner bound to a blessing', () => {
		const {c, data} = ready();
		data.run.blessings.owned = [{id: 'starquest', name: '下一站，巨星', target: data.run.team[0].id}];
		data.run.blessings.pending = [{id: 'reward:1', kind: 'gift', title: '新伙伴', pokemon: data.run.team[0]}];
		c.room.state = data;
		c.room.chooseBlessingReward(data.run.team[0].id);
		assert(c.app.lastPopup.data.text.includes('下一站，巨星')); assert.equal(c.sent.length, 0);
		assert.equal(c.app.lastPopup.data.details.member, 'reward:1');
	});
});

function enableRoomLayout(c, width) {
	function extend(properties) {
		function Class() {}
		Class.prototype = properties; Class.extend = extend; return Class;
	}
	const context = {
		Config: {}, navigator: {userAgent: 'Rogue layout test'}, document: {},
		Backbone: {Model: {extend}, Router: {extend}, View: {extend}},
		jQuery: () => ({on() {}, width: () => width}), BattleTooltips: {hideTooltip() {}},
	};
	context.window = context;
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client.js'), 'utf8'), context);
	const proto = context.App.prototype;
	for (const method of ['focusRoom', 'updateLayout', 'updateSideRoom', 'removeRoom', 'updateFantasyCalcdexLayout']) {
		c.app[method] = proto[method];
	}
	const prepare = room => Object.assign(room, {
		visible: false,
		show(position, boundary) { this.visible = true; this.position = position; this.boundary = boundary; },
		hide() { this.visible = false; }, focus() {}, destroy() { this.visible = false; },
	});
	prepare(c.room); prepare(c.panel);
	c.room.$el.removeClass = () => {}; c.room.$el.addClass = () => {};
	c.app.rooms.lobby = prepare({id: 'lobby', type: 'chat', isSideRoom: true, minWidth: 320, bestWidth: 1024});
	c.app.rooms[''] = prepare({id: '', tinyWidth: 320});
	c.app.roomList = [c.room]; c.app.sideRoomList = [c.panel, c.app.rooms.lobby];
	c.app.curRoom = c.room; c.app.sideRoom = c.app.rooms.lobby;
	c.app.topbar = {updateTabbar() { c.app.visibleTabs = Object.keys(c.app.rooms); }};
	c.app.navigate = () => {}; c.app.updateTitle = () => {};
	c.app.updateLayout();
}

describe('Fantasy Rogue client', () => {
	it('requires confirmation for evolution and only animates an acknowledged success once', () => {
		const c = client(), data = adventure(), mon = data.run.team[0];
		mon.evolutionDetails = [{species: 'Ivysaur', ready: true, requirements: []}];
		c.room.receiveState(data);
		assert(c.panel.html.includes('↑ 可进化'));
		c.room.evolveMember(mon.id + '|ivysaur');
		assert.equal(c.sent.length, 0);
		assert.equal(c.app.lastPopup.type, c.RogueEvolutionPopup);
		const popup = Object.create(c.RogueEvolutionPopup);
		popup.$el = {addClass() {}, html: html => { popup.html = html; }};
		popup.close = () => { popup.closed = true; };
		popup.initialize(c.app.lastPopup.data);
		assert(popup.html.includes('确认进化'));
		popup.close(); assert.equal(c.sent.length, 0, 'cancel has no side effects');
		popup.confirmEvolution();
		assert.equal(c.sent.length, 1);
		const command = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		const next = structuredClone(data); next.account.revision++; next.run.team[0].set.species = 'Ivysaur';
		const result = {userid: data.userid, id: command.id, ok: true, state: next};
		c.room.receiveAction(result);
		assert.equal(c.app.lastPopup.type, c.RogueEvolutionAnimationPopup);
		assert.equal(c.app.lastPopup.data.before.species, 'Bulbasaur');
		assert.equal(c.app.lastPopup.data.after.species, 'Ivysaur');
		c.app.lastPopup = null; c.room.receiveAction(result);
		assert.equal(c.app.lastPopup, null, 'duplicate acknowledgement must not replay');
	});
	it('rejects stale evolution confirmations and never plays an animation for a failed action', () => {
		const c = client(), data = adventure(), mon = data.run.team[0];
		mon.evolutionDetails = [{species: 'Ivysaur', ready: true, requirements: []}];
		c.room.receiveState(data); c.room.evolveMember(mon.id + '|ivysaur');
		const popup = Object.create(c.RogueEvolutionPopup);
		popup.$el = {addClass() {}, html() {}}; popup.close = () => {};
		popup.initialize(c.app.lastPopup.data);
		mon.evolutionDetails[0].ready = false; popup.confirmEvolution(); assert.equal(c.sent.length, 0);
		mon.evolutionDetails[0].ready = true; c.setUser('anotherplayer'); popup.confirmEvolution(); assert.equal(c.sent.length, 0);
		c.setUser(data.userid); popup.confirmEvolution();
		const id = c.room.pending.id; c.app.lastPopup = null;
		c.room.receiveAction({userid: data.userid, id, ok: false, message: '缺少进化道具。', state: data});
		assert.equal(c.app.lastPopup, null); assert.equal(c.room.error, '缺少进化道具。');
	});
	it('lets an evolution animation be skipped without a second command and offers eligible next evolution', () => {
		const c = client(), data = adventure(), mon = data.run.team[0];
		mon.set.species = 'Ivysaur'; mon.evolutionDetails = [{species: 'Venusaur', ready: true, requirements: []}];
		c.room.receiveState(data);
		const popup = Object.create(c.RogueEvolutionAnimationPopup);
		popup.$el = {addClass() {}, html: html => { popup.html = html; }};
		popup.$ = () => ({text() {}, html: html => { popup.actions = html; }});
		popup.close = () => { popup.closed = true; };
		popup.initialize({room: c.room, member: mon.id, before: {species: 'Bulbasaur'}, after: mon.set});
		assert(popup.html.includes('跳过动画')); popup.close(); assert.equal(c.sent.length, 0);
		popup.finishAnimation(); assert(popup.actions.includes('继续进化'));
		popup.continueEvolution(); assert.equal(c.app.lastPopup.type, c.RogueEvolutionPopup);
		assert.equal(c.sent.length, 0, 'next stage needs another confirmation');
	});
	it('reopens a closed party room and its tab without hiding the floor or changing the desktop split', () => {
		const c = client(); c.room.receiveState(adventure()); enableRoomLayout(c, 1920);
		const boundary = c.room.boundary;
		for (let i = 0; i < 3; i++) {
			c.room.openParty();
			assert(c.panel.visible, 'The panel must be shown, not only selected internally');
			assert(c.app.visibleTabs.includes(c.panel.id));
			assert.equal(c.app.curRoom, c.room); assert.equal(c.room.boundary, boundary);
			c.app.removeRoom(c.panel.id);
			assert(!c.panel.visible); assert(!c.app.rooms[c.panel.id]);
			assert(c.app.rooms.lobby.visible);
		}
		c.room.openParty(); c.app.focusRoom('lobby');
		c.room.receiveState(c.room.state); c.app.updateLayout();
		assert(c.app.rooms.lobby.visible && !c.panel.visible, 'Refreshing must respect the selected lobby tab');
	});
	it('can reopen the party with no other right tabs and on a single-panel screen', () => {
		for (const width of [1920, 390]) {
			const c = client(); c.room.receiveState(adventure()); enableRoomLayout(c, width);
			c.app.removeRoom(c.panel.id); c.app.removeRoom('lobby');
			c.room.openParty();
			assert(c.panel.visible); assert(c.app.visibleTabs.includes(c.panel.id));
			assert.equal(c.panel.position, width === 390 ? 'full' : 'right');
		}
	});
	it('shares the selected party member with the bag in both directions, without retaining a stale item target', () => {
		const c = client(), data = adventure();
		const first = data.run.team[0];
		data.run.team.push({...first, id: 'other', hp: 20, status: ''});
		first.hp = 5; first.status = 'psn';
		c.room.itemTarget = 'other'; c.room.receiveState(data);
		assert(c.panel.html.includes('value="' + first.id + '" selected'));
		assert(c.panel.html.includes('name="useItem" value="potion">使用'));
		c.panel.changeItemTarget({currentTarget: {value: 'other'}});
		assert.equal(c.room.selectedPokemon().id, 'other');
		assert(c.panel.html.includes('name="useItem" value="potion" disabled>HP 已满'));
		c.room.selectMember(first.id); c.room.useItem('potion');
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.member, first.id); assert.equal(request.value, 'potion');
	});
	it('keeps abandon and its confirmation only below the floor content', () => {
		const c = client(); c.room.receiveState(adventure());
		assert(c.room.html.includes('name="askAbandon"')); assert(!c.panel.html.includes('name="askAbandon"'));
		c.room.askAbandon();
		assert(c.room.html.includes('name="abandon"')); assert(!c.panel.html.includes('name="abandon"'));
		c.room.receiveState(adventure('battle')); assert(!c.room.html.includes('name="abandon"'));
	});
	it('keeps floor content on the left and party, inventory and growth in a native side room', () => {
		const c = client(); c.room.receiveState(adventure('rest'));
		assert(c.room.html.includes('宝可梦中心商店'));
		assert(!c.room.html.includes('rogue-editor') && !c.room.html.includes('rogue-bag'));
		assert(!c.room.html.includes('局外成长 · 余额'));
		assert(c.panel.html.includes('宝可梦队伍') && c.panel.html.includes('rogue-bag'));
		assert(c.panel.html.includes('局外成长 · 余额'));
		assert(!c.panel.html.includes('宝可梦中心商店'));
		assert.equal(c.panel.title, '队伍及背包'); assert(c.panel.isSideRoom);
	});
	it('opens the party for a new adventure but respects the chosen chat tab on subsequent refreshes', () => {
		const c = client(), data = adventure(); data.run.id = 'first';
		c.room.receiveState(data); c.room.preparePanel();
		assert.equal(c.app.sideRoom, c.panel);
		const lobby = {id: 'lobby'}; c.app.sideRoom = lobby;
		c.room.receiveState(data); c.room.preparePanel();
		assert.equal(c.app.sideRoom, lobby);
		c.room.receiveState({...data, run: {...data.run, id: 'next'}}); c.room.preparePanel();
		assert.equal(c.app.sideRoom, c.panel);
	});
	it('routes party controls through the same command guard and updates both panels while saving', () => {
		const c = client(), data = adventure(); c.room.receiveState(data);
		c.panel.dispatchClickButton({currentTarget: {name: 'chooseAbility', value: 'chlorophyll'}});
		c.panel.dispatchClickButton({currentTarget: {name: 'chooseAbility', value: 'chlorophyll'}});
		assert.equal(c.sent.length, 1);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'ability'); assert.equal(request.member, data.run.team[0].id);
		assert(!c.room.html.includes('正在保存操作')); assert(!c.panel.html.includes('正在保存操作'));
	});
	it('clears the side panel after an account switch rather than displaying the previous party', () => {
		const c = client(); c.room.receiveState(adventure());
		assert(c.panel.html.includes('Bulbasaur'));
		c.setUser('other'); c.room.identityChanged();
		assert(!c.panel.html.includes('Bulbasaur')); assert(!c.panel.html.includes('局外成长 · 余额'));
	});
	it('shows the local spirit toggle, choice, and one opening popup without repeating on refresh', () => {
		const c = client(), data = state();
		data.account.spiritUnlocked = true; data.localSpirits = true;
		data.spirits = [{id: 'yveltal', name: '伊裴尔塔尔的交易'}];
		c.room.useSpirit = true; c.room.receiveState(data);
		assert(c.html.includes('name="useSpirit" checked'));
		assert(c.html.includes('name="testSpirit"'));
		const run = adventure('intro');
		run.run.id = 'intro-test'; run.run.partyLimit = 6;
		run.run.spirit = {id: 'yveltal', species: 'Yveltal', name: '伊裴尔塔尔的交易', text: '每店最多血付 3 件'};
		c.room.receiveState(run); assert.equal(c.app.lastPopup.type, c.RogueSpiritPopup);
		assert(c.html.includes('name="showSpirit"')); assert(!c.html.includes('原生对战 · 捕捉伙伴'));
		delete c.app.lastPopup; c.room.receiveState(run); assert(!c.app.lastPopup);
	});
	it('offers only cleared spirits remotely and sends the manual choice with the starting party', () => {
		const c = client(), data = state();
		data.configured = true; data.starters = [{id: 'bulbasaur', species: 'Bulbasaur', available: true}];
		data.account.spiritUnlocked = true;
		data.selectableSpirits = [{id: 'kyogre', name: '盖欧卡的降雨', clearedTier: 3}];
		c.room.useSpirit = true; c.room.selectedSpirit = 'kyogre'; c.room.receiveState(data);
		assert(c.html.includes('name="selectedSpirit"'));
		assert(c.html.includes('>随机抽取</option>'));
		assert(!c.html.includes('（包含未通关塔灵）'));
		assert(c.html.includes('rogue-spirit-toggle is-enabled'));
		assert(c.html.includes('value="kyogre" selected'));
		assert(c.html.includes('3 档及以下')); assert(c.html.includes('默认赠礼模式按 0 档筛选'));
		assert(!c.html.includes('name="testSpirit"'));
		c.room.selectedStarters = ['bulbasaur']; c.room.startAdventure();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.selectedSpirit, 'kyogre'); assert.equal(request.useSpirit, true);
		assert.equal(request.testSpirit, undefined);
	});
	it('offers the explicit charm tier for earned charm-only spirit selection, without Nuzlocke', () => {
		const c = client(), data = state();
		data.account.preferredDifficulty = 'easy'; data.account.spiritUnlocked = true;
		data.difficulties = [{id: 'easy', name: '护符庇佑', unlocked: true, spirit: true},
			{id: 0, name: '0 档', unlocked: true, spirit: true}];
		data.selectableSpirits = [{id: 'kyogre', name: '盖欧卡的降雨', clearedTier: 'easy'}];
		c.room.useSpirit = true; c.room.receiveState(data);
		assert(c.panel.html.includes('value="easy" selected'));
		assert(!c.panel.html.includes('name="nuzlocke"'));
		assert(c.html.includes('盖欧卡的降雨（护符档）'));
		assert(c.panel.html.includes('所有已解锁档位均可开启随机塔灵'));
	});
	it('offers HP purchases for all shop categories and disables them at the shared limit', () => {
		const c = client(), data = adventure('rest');
		data.run.spirit = {id: 'yveltal', name: '交易', species: 'Yveltal'};
		data.run.node.hpPurchases = 3; c.room.receiveState(data);
		assert(c.html.includes('本店剩余 <b>0 / 3</b>'));
		assert(c.html.includes('name="buyWithHP" value="potion" disabled'));
		assert(c.html.includes('value="buy:potion"'));
		assert(c.html.includes('不恢复 HP'));
	});
	it('displays special-shop candies and keeps box/merge controls locked during battle', () => {
		const c = client(), data = adventure('rest');
		data.run.spirit = {id: 'meowth', name: '商道', species: 'Meowth'};
		data.items.push({id: 'expcandyxs', name: '经验糖果 XS', kind: 'candy', amount: 100, price: 250, shopFloor: 9});
		c.room.receiveState(data); assert(c.html.includes('value="buy:expcandyxs"'));
		data.run.phase = 'battle'; data.run.spirit.id = 'zygarde';
		data.run.box = [0, 1].map(i => ({...structuredClone(data.run.team[0]), id: 'boxed' + i}));
		c.room.receiveState(data);
		assert(c.html.includes('宝可梦箱子 · 2 / 30'));
		assert(c.html.includes('name="mergeMember" value="boxed0" disabled'));
	});
	it('places the shop before the party, filters locked stock and candy, and offers shop-only treasure exchange', () => {
		const c = client(); const data = adventure('rest'); data.run.floor = 19;
		data.items.push({id: 'tinymushroom', name: '小蘑菇', kind: 'treasure', sellPrice: 250, shopFloor: false},
			{id: 'healthfeather', name: '体力之羽', kind: 'effort', stat: 'hp', amount: 1, price: 500, shopFloor: 19},
			{id: 'protein', name: '攻击增强剂', kind: 'effort', stat: 'atk', amount: 10, price: 4000, shopFloor: 89},
			{id: 'expcandyxs', name: '经验糖果 XS', kind: 'candy', amount: 100, price: 100, shopFloor: false});
		data.run.bag.tinymushroom = 3; data.run.bag.expcandyxs = 2; data.run.bag.healthfeather = 1;
		c.room.receiveState(data);
		assert(c.html.indexOf('宝可梦中心商店') < c.html.indexOf('宝可梦队伍'));
		assert(c.html.includes('value="buy:healthfeather"'));
		assert(c.html.includes('<section class="rogue-shop-group"'));
		assert(!c.html.includes('<details class="rogue-shop-group"'));
		assert(!c.html.includes('value="buy:protein"'));
		assert(!c.html.includes('value="buy:expcandyxs"'));
		assert(!c.html.includes('value="useItem:tinymushroom"'));
		assert(c.html.includes('可兑换 <b>750</b>'));
		assert(c.html.includes('value="sell:all"'));
		assert(c.html.includes('sprites/fantasy-rogue/tinymushroom.png'));
		c.room.act('sell:all'); assert.equal(JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length)).action, 'sell');
		data.run.phase = 'ready'; c.room.receiveState(data);
		assert(!c.html.includes('value="sell:all"'));
		assert(c.html.includes('到商店兑换金币'));
	});
	it('waits for team confirmation, validates unlocked choices, and starts directly from the final configuration', () => {
		const c = client(); const data = state(); data.configured = true;
		const base = {hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20};
		data.natures = [{id: 'modest', name: 'Modest', plus: 'spa', minus: 'atk'}, {id: 'adamant', name: 'Adamant'}];
		data.starters = [{id: 'bulbasaur', species: 'Bulbasaur', available: true, defaultMoves: ['tackle'],
			abilities: [{id: 'chlorophyll', name: 'Chlorophyll', hidden: true}],
			moves: ['tackle', 'vinewhip'], traits: {natures: ['modest'], genders: ['F'], abilities: ['chlorophyll'], moves: ['vinewhip'],
				ivs: {min: {...base, atk: 0}, max: {...base, spa: 29}}}}];
		c.room.receiveState(data);
		const input = {value: 'bulbasaur', checked: true};
		c.room.changeStarter({currentTarget: input});
		assert(!c.app.lastPopup);
		assert(c.room.html.includes('确认队伍，继续配置'));
		assert(!c.room.html.includes('开始新的冒险'));
		c.room.confirmStarters();
		assert.equal(c.app.lastPopup.data.starters[0], 'bulbasaur');
		assert.equal(c.room.starterBuilds.bulbasaur.ivs.spa, 29);
		assert.equal(c.sent.length, 0);
		const popup = Object.create(c.app.lastPopup.type);
		popup.$el = {addClass() {}, html: html => { popup.html = html; }};
		popup.$ = () => ({text: value => { popup.error = value; }});
		popup.close = () => { popup.closed = true; };
		popup.initialize(c.app.lastPopup.data);
		assert(popup.html.includes('随机（全部 25 种性格）'));
		assert(popup.html.includes('value="modest"') && !popup.html.includes('value="adamant"'));
		assert(popup.html.includes('雌性') && !popup.html.includes('雄性'));
		assert(!popup.html.includes('name="move-'));
		assert(popup.html.includes('Chlorophyll（隐藏特性）'));
		assert(popup.html.includes('开始本次冒险'));
		const form = {nature: 'modest', gender: 'F', ability: 'chlorophyll'};
		for (const stat of Object.keys(base)) form['iv-' + stat] = String(base[stat]);
		popup.submit({...form, 'iv-spa': '30'}); assert(!popup.closed && popup.error);
		popup.submit({...form, ability: 'levitate'}); assert(!popup.closed);
		popup.submit({...form, 'iv-spa': '25', 'iv-atk': '0'}); assert(popup.closed);
		popup.submit(form); assert.equal(c.sent.length, 1);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.starterBuilds.bulbasaur.nature, 'modest');
		assert.equal(request.starterBuilds.bulbasaur.gender, 'F');
		assert.equal(request.starterBuilds.bulbasaur.ivs.spa, 25);
		assert.equal(request.starterBuilds.bulbasaur.ability, 'chlorophyll');
		assert(!request.starterBuilds.bulbasaur.moves);
	});
	it('configures the confirmed team in order in one window and retains builds when going back', () => {
		const c = client(), data = state(); data.configured = true; data.account.slots = 3;
		data.starters = ['bulbasaur', 'charmander', 'squirtle'].map(id => ({id, species: id, available: true}));
		c.room.receiveState(data);
		for (const starter of data.starters) c.room.changeStarter({currentTarget: {value: starter.id, checked: true}});
		assert(!c.app.lastPopup); c.room.confirmStarters();
		const popup = Object.create(c.RogueStarterPopup);
		const form = {nature: 'random', gender: 'random', ability: 'random'};
		for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) form['iv-' + stat] = '20';
		popup.$el = {addClass() {}, html: html => { popup.html = html; }};
		popup.$ = () => ({serializeArray: () => Object.entries(form).map(([name, value]) => ({name, value})), text() {}});
		popup.close = () => { popup.closed = true; };
		popup.initialize(c.app.lastPopup.data);
		assert(popup.html.includes('1 / 3')); assert(popup.html.includes('确认配置，下一只'));
		popup.submit(form); assert(!popup.closed); assert.equal(c.sent.length, 0);
		assert.equal(popup.starter.id, 'charmander'); assert(popup.html.includes('2 / 3'));
		popup.previousStarter(); assert.equal(popup.starter.id, 'bulbasaur');
		assert(c.room.starterBuilds.charmander);
		popup.submit(form); popup.submit(form);
		assert.equal(popup.starter.id, 'squirtle'); assert(popup.html.includes('开始本次冒险'));
		assert.equal(c.sent.length, 0);
		popup.submit(form);
		const command = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.deepEqual(command.starters, ['bulbasaur', 'charmander', 'squirtle']);
		assert.equal(Object.keys(command.starterBuilds).length, 3);
		assert(popup.closed);
	});
	it('does not submit a configuration after switching account or changing the confirmed roster', () => {
		for (const accountChange of [true, false]) {
			const c = client(), data = state(); data.configured = true;
			data.starters = [{id: 'bulbasaur', species: 'Bulbasaur', available: true}];
			c.room.receiveState(data); c.room.changeStarter({currentTarget: {value: 'bulbasaur', checked: true}});
			c.room.confirmStarters();
			const popup = Object.create(c.RogueStarterPopup);
			popup.$el = {addClass() {}, html() {}}; popup.close = () => { popup.closed = true; };
			popup.initialize(c.app.lastPopup.data);
			if (accountChange) c.setUser('other');
			else c.room.selectedStarters = [];
			popup.submit({}); assert(popup.closed); assert.equal(c.sent.length, 0);
		}
	});
	it('shows unlock requirements instead of locked species, and uses the current slot price', () => {
		const c = client(); const data = state();
		data.starters = [{id: 'bulbasaur', species: 'Bulbasaur', available: true}, {id: 'mew', species: 'Mew', available: false}];
		data.account.slots = 2; data.account.slotCost = 40;
		c.room.receiveState(data);
		assert(!c.html.includes('value="mew"'));
		assert(!c.html.includes('捕捉可解锁更多伙伴'));
		assert(c.html.includes('究极异兽') && c.html.includes('二级神') && c.html.includes('10 次'));
		assert(c.html.includes('name="act" value="upgrade:slot" disabled>花费 40 点扩展'));
		const full = JSON.parse(JSON.stringify(data)); full.account.slots = 6; full.account.slotCost = 0;
		c.room.receiveState(full);
		assert(c.html.includes('已扩展至上限'));
		assert(!c.html.includes('value="upgrade:slot"'));
	});
	it('caps selected starters, disables unselected inputs, and re-enables them on deselection', () => {
		const c = client(); const data = state(); data.configured = true;
		data.starters = ['bulbasaur', 'charmander', 'squirtle'].map(id => ({id, species: id, available: true}));
		const inputs = data.starters.map(starter => ({value: starter.id, checked: false, disabled: false,
			parentElement: {classList: {toggle() {}}}}));
		c.room.controls['input[name=starter]'] = inputs;
		c.room.receiveState(data);
		inputs[0].checked = true; c.room.changeStarter({currentTarget: inputs[0]});
		assert.deepEqual(inputs.map(input => input.disabled), [false, true, true]);
		inputs[1].checked = true; c.room.changeStarter({currentTarget: inputs[1]});
		assert.equal(inputs[1].checked, false);
		assert.equal(c.room.selectedStarters.join(), 'bulbasaur');
		c.room.receiveState(JSON.parse(JSON.stringify(data)));
		assert(c.html.includes('value="bulbasaur" checked'));
		assert(c.html.includes('value="charmander" disabled'));
		inputs[0].checked = false; c.room.changeStarter({currentTarget: inputs[0]});
		assert(inputs.every(input => !input.disabled));
		assert.equal(c.room.controls['button[name=confirmStarters]'].disabled, true);
		const expanded = JSON.parse(JSON.stringify(data)); expanded.account.slots = 2; expanded.account.revision++;
		c.room.receiveState(expanded);
		for (const input of inputs.slice(0, 2)) { input.checked = true; c.room.changeStarter({currentTarget: input}); }
		assert.deepEqual(inputs.map(input => input.disabled), [false, false, true]);
		c.room.startAdventure();
		assert.deepEqual(JSON.parse(c.sent[0].slice('/fantasyrogue action '.length)).starters, ['bulbasaur', 'charmander']);
	});
	it('uses the starter slot budget for legendaries and preserves a valid selection after refresh', () => {
		const c = client(), data = state(); data.configured = true; data.account.slots = 6;
		data.starters = [{id: 'mew', species: 'Mew', slotCost: 4, available: true},
			{id: 'mewtwo', species: 'Mewtwo', slotCost: 6, available: true},
			{id: 'bulbasaur', species: 'Bulbasaur', slotCost: 1, available: true},
			{id: 'charmander', species: 'Charmander', slotCost: 1, available: true}];
		const inputs = data.starters.map(s => ({value: s.id, checked: false, disabled: false, parentElement: {classList: {toggle() {}}}}));
		c.room.controls['input[name=starter]'] = inputs; c.room.receiveState(data);
		for (const i of [0, 2, 3]) {inputs[i].checked = true; c.room.changeStarter({currentTarget: inputs[i]});}
		assert.equal(c.room.starterSlotsUsed(), 6); assert.equal(c.room.selectedStarters.length, 3); assert(inputs[1].disabled);
		c.room.receiveState(JSON.parse(JSON.stringify(data))); assert.equal(c.room.starterSlotsUsed(), 6);
		assert(c.html.includes('已用 6 / 6 个初始名额'));
		inputs[1].checked = true; c.room.changeStarter({currentTarget: inputs[1]}); assert.equal(inputs[1].checked, false);
		for (const i of [0, 2, 3]) {inputs[i].checked = false; c.room.changeStarter({currentTarget: inputs[i]});}
		inputs[1].checked = true; c.room.changeStarter({currentTarget: inputs[1]});
		assert.equal(c.room.selectedStarters.join(), 'mewtwo'); assert.equal(c.room.starterSlotsUsed(), 6);
		data.account.slots = 4; c.room.receiveState(data); assert.equal(c.room.selectedStarters.length, 0);
	});
	it('selects a route on first click, switches selection, and submits only on the second click', () => {
		const c = client(); const data = adventure();
		data.run.choices.push({id: 'reward', name: '奖励', kind: 'reward', reward: {money: 10, items: {}}});
		c.room.receiveState(data);
		assert(!c.html.includes('选择此路线'));
		assert(c.html.includes('rogue-route-red') && c.html.includes('rogue-route-blue'));
		const cards = data.run.choices.map(node => ({value: node.id, classList: {toggle() {}},
			setAttribute(key, value) { this[key] = value; }, querySelector() { return {}; }}));
		c.room.controls['.rogue-route'] = cards;
		c.room.chooseRoute('wild'); assert.equal(c.sent.length, 0);
		assert.equal(cards[0]['aria-pressed'], 'true');
		c.room.chooseRoute('reward'); assert.equal(c.sent.length, 0);
		assert.equal(cards[0]['aria-pressed'], 'false');
		assert.equal(cards[1]['aria-pressed'], 'true');
		c.room.chooseRoute('reward'); c.room.chooseRoute('reward');
		assert.equal(c.sent.length, 1);
		assert.equal(JSON.parse(c.sent[0].slice('/fantasyrogue action '.length)).value, 'reward');
	});
	it('clears route confirmation after a state revision, floor change or disconnect', () => {
		const c = client(); const data = adventure();
		c.room.receiveState(data); c.room.chooseRoute('wild');
		const changed = JSON.parse(JSON.stringify(data)); changed.account.revision++;
		c.room.receiveState(changed); c.room.chooseRoute('wild');
		assert.equal(c.sent.length, 0);
		c.room.disconnected(); assert.equal(c.room.selectedRoute, null);
		const next = JSON.parse(JSON.stringify(changed)); next.run.floor++;
		c.room.receiveState(next); c.room.chooseRoute('wild');
		assert.equal(c.sent.length, 0);
	});
	it('shows all evolution branches, exact item names, friendship and tower time', () => {
		const c = client(), data = adventure();
		data.run.time = { id: 'dusk', name: '黄昏' };
		const mon = data.run.team[0];
		mon.friendship = 159;
		mon.evolutionDetails = [{species: 'Pikachu', ready: false, requirements: [
			{text: '亲密度达到 160（当前 159）', met: false}, {text: '满足上述条件后升 1 级', met: false},
		]}, {species: 'Vaporeon', ready: false, requirements: [{text: '使用', name: 'Water Stone', met: false}]}];
		c.room.receiveState(data);
		assert(c.panel.html.includes('亲密度 159 / 255'));
		assert(c.panel.html.includes('亲密度达到 160（当前 159）'));
		assert(c.panel.html.includes('Water Stone'));
		assert(c.room.html.includes('黄昏'));
		assert(c.panel.html.indexOf('rogue-evolution-details') > c.panel.html.indexOf('rogue-stats'));
		assert(/name="evolveMember"[^>]*disabled/.test(c.panel.html));
	});
	it('renders the unconfigured lobby and six growth branches without a fake start', () => {
		const c = client(); c.room.receiveState(state());
		assert(c.html.includes('等待配置'));
		assert(c.html.includes('name="confirmStarters" value="" disabled'));
		assert.equal((c.html.match(/花费 1 点提升/g) || []).length, 6);
		assert(c.html.includes('从下一次冒险生效'));
	});
	it('shows independently increasing stat costs and blocks unaffordable upgrades', () => {
		const c = client(), data = state(); data.account.points = 4;
		data.account.boosts.hp = 4; data.account.boosts.spe = 10;
		c.room.receiveState(data);
		assert(c.html.includes('value="upgrade:hp" disabled'));
		assert(c.html.includes('花费 5 点提升'));
		assert(!c.html.includes('value="upgrade:atk" disabled'));
		assert(!c.html.includes('value="upgrade:spe"'));
	});
	it('offers the optional challenge after saving the clear and submits a single decision', () => {
		const c = client(), data = state();
		data.run = {phase: 'postgame', postgame: 'offer', floor: 200, team: [], bag: {}, boosts: data.account.boosts};
		c.room.receiveState(data);
		assert(c.room.html.includes('通关卡已保存'));
		assert(c.room.html.includes('value="godchallenge:accept"'));
		assert(c.room.html.includes('value="godchallenge:decline"'));
		assert(!c.room.html.includes('name="askAbandon"'));
		c.room.act('godchallenge:accept');
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'godchallenge'); assert.equal(request.value, 'accept');
	});
	it('sends only an action and revision, blocks double clicks, and retries the identical request', () => {
		const c = client(); c.room.receiveState(state());
		c.room.act('upgrade:hp'); c.room.act('upgrade:atk');
		assert.equal(c.sent.length, 1);
		c.room.sendPending();
		assert.equal(c.sent[0], c.sent[1]);
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.revision, 1); assert.equal(request.value, 'hp');
		assert(!('team' in request)); assert(!('points' in request));
	});
	it('ignores stale states and wrong-user responses, then opens the server-created battle room', () => {
		const c = client(); c.room.receiveState(state());
		c.room.submit('battle');
		const id = c.room.pending.id;
		c.room.receiveAction({userid: 'someoneelse', id, ok: true, state: state()});
		assert(c.room.pending);
		const next = state(); next.account.revision = 3;
		next.run = {phase: 'battle', floor: 1, roomid: 'battle-gen9fantasyrogue-1', team: [], bag: {}, boosts: next.account.boosts};
		c.room.receiveAction({userid: 'rogueplayer', id, ok: true, state: next});
		assert.deepEqual(c.joined, ['battle-gen9fantasyrogue-1']);
		c.room.receiveState(state());
		assert.equal(c.room.state.account.revision, 3);
	});
	it('renders paid center care alongside an equally prominent continue action', () => {
		const c = client(); const data = state();
		data.items = [{id: 'revive', name: '活力碎片', kind: 'revive', price: 20}];
		data.run = {phase: 'rest', floor: 9, money: 1000, centerCare: {cost: 550, needed: true, fainted: 1}, team: [], bag: {revive: 1}, boosts: data.account.boosts};
		c.room.receiveState(data);
		assert(c.html.includes('全队治疗 · 550 金币'));
		assert(c.html.includes('rogue-center-actions'));
		assert(c.html.includes('活力碎片'));
		assert(c.html.includes('补给完成，进入下一层'));
		assert(!c.html.includes('选择本层路线'));
	});
	it('escapes server text and discards state when the account changes', () => {
		const c = client(); const data = state(); data.message = '<img src=x onerror=alert(1)>';
		c.room.receiveState(data);
		assert(!c.html.includes('<img'));
		c.setUser('another'); c.room.identityChanged();
		assert.equal(c.room.state, null);
	});
	it('refreshes a denied save after the server confirms login with the same user ID', () => {
		const c = client(); const denied = state();
		denied.account = null; denied.message = '请先登录注册账号，以保存冒险进度。';
		c.room.receiveState(denied);
		assert(c.html.includes('请先登录注册账号'));
		c.app.emit('init:choosename');
		assert.deepEqual(c.sent, ['/cmd fantasyrogue']);
		c.room.receiveState(state());
		assert(!c.html.includes('请先登录注册账号'));
		assert(c.html.includes('花费 1 点提升'));
	});
	it('wires the home entry directly below AI challenge and includes the room script', () => {
		const home = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-mainmenu.js'), 'utf8');
		assert(/value="fantasyai"[^\n]*\n[^\n]*value="fantasyrogue"/.test(home));
		const template = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/index.template.html'), 'utf8');
		assert(template.includes('client-fantasy-rogue.js'));
	});
	it('blocks floor advancement while learning and submits the pending member rather than a client team', () => {
		const c = client(); const data = state();
		data.run = {phase: 'ready', floor: 1, encounter: 0, encounters: 3, money: 100, bag: {}, boosts: data.account.boosts,
			team: [{id: 'run:floor:catch', set: {species: 'Bulbasaur', level: 9, moves: ['tackle']}, hp: 20, maxhp: 20, pp: []}],
			pendingMoves: [{member: 'run:floor:catch', move: 'vinewhip'}]};
		c.room.receiveState(data);
		assert(c.html.includes('name="act" value="battle" disabled'));
		c.room.learnMove('0');
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'learn'); assert.equal(request.member, 'run:floor:catch');
		assert.equal(request.value, '0'); assert(!('team' in request));
	});
	it('queues a separate move modal, preserves both panes, and closes only after acknowledgement', () => {
		const c = client(), data = adventure('ready'); data.run.id = 'modal-test';
		c.room.receiveState(data); c.room.scroll = 650;
		let rightScroll = 480;
		c.panel.$el.scrollTop = value => { if (value !== undefined) rightScroll = value; return rightScroll; };
		data.run.pendingMoves = [{member: data.run.team[0].id, move: 'vinewhip'}];
		c.room.receiveState(data);
		const first = c.room.pendingMovePopup;
		assert(first && first.html.includes('学习到了新的招式，请先确认'));
		assert(!c.room.html.includes('class="rogue-pending-move"'));
		assert.equal(c.room.scroll, 650); assert.equal(rightScroll, 480);
		c.room.render(); assert.equal(c.room.pendingMovePopup, first); assert.equal(c.app.popups.length, 1);
		first.learnMove('skip'); assert.equal(c.room.pendingMovePopup, first);
		assert(first.html.includes(' disabled'));
		c.room.receiveAction({userid: data.userid, id: c.room.pending.id, ok: false, message: '请重试', state: data});
		assert.equal(c.room.pendingMovePopup, first); assert(first.html.includes('请重试'));
		data.run.pendingMoves = [{member: data.run.team[0].id, move: 'growl'}]; c.room.receiveState(data);
		assert(first.removed); assert.notEqual(c.room.pendingMovePopup, first);
		const requests = c.sent.length; first.learnMove('0'); assert.equal(c.sent.length, requests, 'stale modal cannot act');
		data.run.pendingMoves = []; c.room.receiveState(data);
		assert(!c.room.pendingMovePopup); assert.equal(c.app.popups.length, 0);
		const evolution = {type: 'modal'}; c.app.popups.push(evolution);
		data.run.pendingMoves = [{member: data.run.team[0].id, move: 'tackle'}]; c.room.receiveState(data);
		assert(!c.room.pendingMovePopup, 'wait for evolution animation');
		c.app.popups = []; c.room.revealPendingMove(); assert(c.room.pendingMovePopup);
		c.room.screen = 'home'; c.room.render(); assert(!c.room.pendingMovePopup);
		c.room.screen = 'game'; c.room.render(); assert(c.room.pendingMovePopup);
		c.setUser('someoneelse'); c.room.identityChanged(); assert(!c.room.pendingMovePopup);
	});
	it('offers learning then evolution in the active battle pause, without changing the current room', () => {
		const c = client(), data = adventure('battle'), mon = data.run.team[0];
		data.run.id = 'live-growth'; data.run.roomid = 'battle-growth'; data.run.growthPaused = true;
		data.run.pendingMoves = [{member: mon.id, move: 'vinewhip'}];
		mon.evolutionNotice = true;
		mon.evolutionDetails = [{species: 'Ivysaur', ready: true, requirements: []}];
		c.app.curRoom = {id: data.run.roomid};
		c.room.receiveState(data); const learn = c.room.pendingMovePopup;
		assert(learn); assert.equal(c.app.lastPopup.type, c.RogueLearnMovePopup);
		learn.learnMove('skip'); const id = c.room.pending.id;
		const next = structuredClone(data); next.run.pendingMoves = []; next.account.revision++;
		c.room.receiveAction({userid: data.userid, id, ok: true, state: next});
		assert(learn.removed); assert.equal(c.app.lastPopup.type, c.RogueEvolutionNoticePopup);
		const notice = Object.create(c.RogueEvolutionNoticePopup);
		notice.$el = {html() {}}; notice.close = () => { notice.closed = true; };
		notice.initialize(c.app.lastPopup.data); notice.evolveNow();
		assert(notice.closed); assert.equal(c.app.lastPopup.type, c.RogueEvolutionPopup);
		assert.equal(c.app.curRoom.id, 'battle-growth'); assert.equal(c.joined.length, 0);
	});
	it('ignores stale evolution notices and can postpone a valid live evolution', () => {
		const c = client(), data = adventure('battle'), mon = data.run.team[0];
		data.run.id = 'live-growth'; data.run.growthPaused = true; mon.evolutionNotice = true;
		mon.evolutionDetails = [{species: 'Ivysaur', ready: true, requirements: []}];
		c.room.receiveState(data);
		const notice = Object.create(c.RogueEvolutionNoticePopup);
		notice.$el = {html() {}}; notice.close = () => {};
		notice.initialize({room: c.room, member: mon.id, species: mon.set.species});
		c.setUser('another'); notice.later(); assert.equal(c.sent.length, 0);
		c.setUser(data.userid); data.run.id = 'another-run'; notice.later(); assert.equal(c.sent.length, 0);
		data.run.id = 'live-growth'; mon.hp = 0; notice.later(); assert.equal(c.sent.length, 0);
		mon.hp = 10; notice.later();
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'evolutionnotice'); assert.equal(request.member, mon.id);
	});
	it('preserves the full colon-containing member id when replacing a captured party member', () => {
		const c = client(), data = adventure('settlement');
		data.run.pendingCapture = {...data.run.team[0], id: 'capture:next'};
		data.run.team[0].id = 'run:15:elite:0';
		data.run.team[0].replacementRelease = {reason: '', experience: 100, items: {expcandyxs: 1}};
		c.room.receiveState(data);
		c.room.replaceMember('run:15:elite:0');
		assert.equal(c.sent.length, 0, 'confirmation must precede the irreversible action');
		const popup = Object.create(c.RogueCardConfirmPopup);
		popup.data = c.app.lastPopup.data; popup.userid = data.userid; popup.close = () => {};
		popup.confirmCard();
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'replace'); assert.equal(request.value, 'run:15:elite:0');
		assert.equal(request.member, 'capture:next'); assert.equal(request.confirmed, true);
	});
	it('places release immediately after healing and presents the server reward before confirmation', () => {
		const c = client(), data = adventure('ready'), mon = data.run.team[0];
		mon.release = {reason: '', experience: 1300, items: {expcandys: 1, expcandyxs: 5}};
		c.room.receiveState(data);
		const html = c.room.renderEditor(data.run, false);
		assert(html.indexOf('name="releaseMember"') > html.indexOf('name="healMember"'));
		assert(html.indexOf('name="releaseMember"') < html.indexOf('name="moveMember"'));
		c.room.releaseMember(mon.id);
		assert.equal(c.sent.length, 0); assert(c.app.lastPopup.data.text.includes('1300'));
		const popup = Object.create(c.RogueCardConfirmPopup);
		popup.data = c.app.lastPopup.data; popup.userid = data.userid; popup.close = () => {};
		c.setUser('changed'); popup.confirmCard(); assert.equal(c.sent.length, 0);
		c.setUser(data.userid); popup.confirmCard();
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'release'); assert.equal(request.member, mon.id); assert.equal(request.confirmed, true);
	});
	it('names all five release candies even without the battle item Dex or translator', () => {
		for (const localized of [false, true]) {
			const c = client(false, localized), data = adventure('settlement'), mon = data.run.team[0];
			const quote = {experience: 55200, items: {expcandyxl: 1, expcandyl: 2, expcandym: 1, expcandys: 2, expcandyxs: 6}};
			mon.release = quote; mon.replacementRelease = quote;
			for (const replacement of [false, true]) {
				const text = c.room.releaseDescription(mon, replacement);
				for (const [size, count] of [['XL', 1], ['L', 2], ['M', 1], ['S', 2], ['XS', 6]]) {
					assert(text.includes('经验糖果 ' + size + ' ×' + count), text);
				}
				assert(!/expcandy|雄性|雌性/.test(text), text);
				assert(text.includes('55200'));
			}
		}
	});
	it('shows admission notices once and routes co-op release confirmation to the selected owner', () => {
		const c = client(), data = adventure('settlement');
		data.run.pendingCapture = {...data.run.team[0], id: 'waiting-1'};
		c.room.receiveState(data); assert.equal(c.app.lastPopup.type, c.RogueNoticePopup);
		delete c.app.lastPopup; c.room.receiveState(data); assert(!c.app.lastPopup);
		c.room.screen = 'coop';
		c.room.coopState = {userid: data.userid, session: {delegatedTo: data.userid, partnerUserId: 'friend', adventure: {
			phase: 'settlement', partnerPendingCapture: data.run.pendingCapture,
			partnerTeam: [{id: 'friend:old', species: 'Eevee', replacementRelease: {reason: '', experience: 100, items: {expcandyxs: 1}}}],
		}}};
		c.room.releaseCoopMember('friend|friend:old');
		assert.equal(c.sent.length, 0);
		const popup = Object.create(c.RogueCardConfirmPopup);
		popup.data = c.app.lastPopup.data; popup.userid = data.userid; popup.close = () => {}; popup.confirmCard();
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue coop '.length));
		assert.deepEqual(request, {action: 'replace', owner: 'friend', member: 'friend:old', confirmed: true, id: 'waiting-1'});
	});
	it('puts floor actions and itemized rewards above boosts, and shows the money balance in the bag', () => {
		const c = client(); c.room.receiveState(adventure());
		const html = c.html;
		assert(html.indexOf('选择本层路线') < html.indexOf('局外能力加成'));
		assert(html.includes('已到账 · 第 8 层') && html.includes('+246') && html.includes('×1'));
		assert(!html.includes('+162'));
		assert(html.indexOf('>321<') > html.indexOf('背包</h3>'));
		assert.equal((html.match(/>321</g) || []).length, 1);
		assert(html.includes('rogue-item-potion') && html.includes('精灵球') && html.includes('橙橙果'));
		assert(html.includes('当前冒险进行中'));
		assert(!html.includes('value="upgrade:'));
	});
	it('shows Tera locked for legacy and new adventures until the server grants the event unlock', () => {
		const c = client(); const data = adventure();
		c.room.receiveState(data);
		assert.match(c.room.renderSystems(data.run), /rogue-system-card is-locked">[^]*?<strong>太晶化<\/strong><small>未解锁<\/small>/);
		assert(c.html.includes('预定祝福或第 100 层馆主赠礼'));
		data.run.teraUnlocked = true;
		c.room.receiveState(data);
		assert.match(c.room.renderSystems(data.run), /rogue-system-card is-unlocked">[^]*?<strong>太晶化<\/strong><small>已解锁<\/small>/);
		assert(!c.html.includes('预定祝福或第 100 层馆主赠礼'));
	});
	it('displays Boss reward quantities, full move details and a localized short description during learning', () => {
		const c = client(); const data = adventure('settlement');
		data.run.pendingMoves = [{member: data.run.team[0].id, move: 'vinewhip'}];
		c.room.receiveState(data);
		assert(!c.html.includes('+1200') && !c.html.includes('本场胜利／捕捉成功可获得'));
		for (const text of ['alt="Grass"', 'alt="Physical"', '威力', '命中率', '100%', 'PP', '攻击目标造成伤害']) {
			assert(c.html.includes(text), text);
		}
		assert(c.room.pendingMovePopup.html.includes('学习招式'));
		assert(!c.room.html.includes('学习招式'));
		assert(c.html.includes('<small>PP</small>25'));
	});
	it('offers only learned moves, displays hidden ability labels and keeps EVs locked without an event', () => {
		const c = client(); c.room.receiveState(adventure());
		assert(c.html.includes('种族值') && c.html.includes('努力值') && c.html.includes('个体值'));
		assert(!c.html.includes('name="ev-hp"'));
		c.room.editSection('moves:1');
		assert(c.html.includes('vinewhip') && c.html.includes('4/25'));
		assert(c.html.includes('class="rogue-move-picker"'));
		assert(c.html.includes('data-rogue-key="moves:run:1:member:0"'));
		assert(c.html.includes('aria-label="可更换招式，列表内上下滚动"'));
		c.room.chooseMove('vinewhip');
		let request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'setmove');
		assert.equal(request.member, 'run:1:member:0'); assert.equal(request.slot, 1);
		assert(!('team' in request) && !('pp' in request));
		c.room.pending = null; c.room.editSection('abilities');
		assert(c.html.includes('隐藏特性') && c.html.includes('特性效果'));
		c.room.chooseAbility('chlorophyll');
		request = JSON.parse(c.sent[1].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'ability');
	});
	it('puts equipped moves first in slot order, includes the fifth slot and preserves learned PP data', () => {
		const c = client(), data = adventure(), mon = data.run.team[0];
		data.run.moveSlots = 5;
		mon.set.moves = ['growl', 'tackle', 'vinewhip', 'cut', 'surf'];
		mon.moveMemory.unshift({id: 'cut', pp: 3, maxpp: 30});
		mon.moveMemory.push({id: 'razorleaf', pp: 6, maxpp: 25});
		mon.blessingMoves = ['surf']; mon.blessingPP = [{id: 'surf', pp: 1, maxpp: 15}];
		const before = JSON.stringify(mon);
		c.room.receiveState(data); c.room.editSection('moves:2');
		const rows = [...c.panel.html.matchAll(/class="rogue-choice-row( is-equipped)?" data-rogue-key="move:([^"]+)"/g)];
		assert.deepEqual(rows.map(row => row[2]), ['growl', 'tackle', 'vinewhip', 'cut', 'surf', 'razorleaf']);
		assert(rows.slice(0, 5).every(row => row[1])); assert(!rows[5][1]);
		for (let i = 1; i <= 5; i++) assert(c.panel.html.includes('title="已装备 · 第 ' + i + ' 位">' + i + '</span>'));
		assert(c.panel.html.includes('1/15')); assert(c.panel.html.includes('4/25'));
		assert.equal(JSON.stringify(mon), before);
	});
	it('sends stable party and move ordering, and exposes one-time event EV inputs only when granted', () => {
		const c = client(); const data = adventure();
		const second = JSON.parse(JSON.stringify(data.run.team[0])); second.id = 'other:member';
		data.run.team.push(second);
		c.room.receiveState(data); c.room.moveMember('1');
		let request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.deepEqual(request.order, ['other:member', 'run:1:member:0']);
		c.room.pending = null; c.room.moveSlotUp('1');
		request = JSON.parse(c.sent[1].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'moves'); assert.deepEqual(request.order, ['growl', 'tackle']);
		data.run.team[0].evRespec = {total: 1}; c.room.editPanel = 'stats'; c.room.receiveState(data);
		assert(c.html.includes('name="ev-hp"') && c.html.includes('保存本次努力值分配'));
	});
	it('opens permanent upgrades after completion and excludes non-shop held items from purchasing', () => {
		const c = client(); const data = adventure('complete');
		c.room.receiveState(data);
		assert(c.html.includes('value="upgrade:hp"'));
		data.run.phase = 'rest'; data.shopItems = ['potion'];
		c.room.receiveState(data);
		assert(c.html.includes('value="buy:potion"'));
		assert(!c.html.includes('value="buy:oranberry"'));
	});
	it('keeps the current encounter after a wipe and offers emergency treatment only when the server allows it', () => {
		const c = client(); const data = adventure('ready');
		Object.assign(data.run, {encounter: 2, encounters: 3, recovery: 'defeat', canEmergency: true, emergencyCost: 5000, money: 4999});
		data.run.team[0].hp = 0;
		c.room.receiveState(data);
		assert(c.html.includes('继续第 3 / 3 场战斗'));
		assert(c.html.includes('value="battle" disabled'));
		assert(c.html.includes('value="emergency" disabled'));
		assert(c.html.includes('还需 1 金币'));
		assert(!c.html.includes('免费重试整层'));
		data.run.money = 5000; c.room.receiveState(data);
		assert(!c.html.includes('value="emergency" disabled'));
		c.room.act('emergency'); c.room.act('emergency');
		assert.equal(c.sent.length, 1);
		assert.equal(JSON.parse(c.sent[0].slice('/fantasyrogue action '.length)).action, 'emergency');
		c.room.pending = null; data.run.canEmergency = false; c.room.receiveState(data);
		assert(!c.html.includes('value="emergency"'));
	});
	it('blocks supplies in a continuous challenge and shows checkpoint retry only after its wipe', () => {
		const c = client(); const data = adventure('ready');
		data.run.node.noHealing = true; data.run.healingLocked = true;
		c.room.receiveState(data);
		assert(c.html.includes('连续挑战期间限制场外治疗'));
		assert(c.html.includes('value="potion" disabled'));
		data.run.phase = 'failed'; data.run.recovery = 'defeat'; c.room.receiveState(data);
		assert(c.html.includes('免费重试整层'));
		assert(!c.html.includes('下一次仍挑战第'));
	});
});

describe('Fantasy Rogue native battle recovery UI', () => {
	function battleClient() {
		const sent = [], joined = [];
		const extend = value => value;
		const context = {jQuery: {}, ConsoleRoom: {extend}, Popup: {extend},
			Dex: {prefs: () => false, getItemIcon: () => ''}, BattleLog: {escapeHTML: value => String(value)}, Config: {routes: {replays: 'replay.test'}},
			app: {user: {get: () => 'rogueplayer'}, joinRoom: id => joined.push(id), topbar: {updateTabbar() {}}}};
		vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-battle.js'), 'utf8'), context);
		const room = Object.create(context.BattleRoom);
		Object.assign(room, {fantasyRogue: {userid: 'rogueplayer'}, send: message => sent.push(message),
			close: () => { room.closed = true; }, request: {requestType: 'move'}, updateSide() {},
			updateMoveControls() { room.html = ''; }, updateWaitControls() { room.html = ''; },
			side: 'p1', closeNotification() {}, getTimerHTML: () => '',
			battle: {scene: {}, seeking: null, atQueueEnd: false, paused: false, ended: false, stepQueue: [], add() {}},
			$controls: {find: () => ({remove() {}, html() {}}), html: html => { room.html = html; },
				append: html => { room.html += html; }, prepend: html => { room.html = html + room.html; }}});
		return {room, sent, joined, app: context.app, context};
	}
	it('routes native cooperative retreat into shared consent and never offers solo paid rematch', () => {
		const c = battleClient(), room = c.room;
		room.fantasyRogue.cooperative = true; room.html = '';
		c.app.rooms = {fantasyrogue: {openCoop() { c.openedCoop = true; }}};
		c.app.send = value => c.sent.push(value);
		room.updateRogueEscape();
		assert(room.html.includes('协商共同撤退')); assert(!room.html.includes('name="rematchRogue"'));
		room.rematchRogue(); assert.equal(c.sent.length, 0);
		room.retreatRogue(); assert(c.openedCoop);
		assert.equal(c.sent.at(-1), '/fantasyrogue coop {"action":"proposeexit","value":"retreat"}');
	});
	it('seeks to the current restored turn without replaying history or replacing the pending choice', () => {
		const {room} = battleClient(), seeks = [];
		room.battle.seekTurn = (...args) => seeks.push(args);
		room.updateControls = () => { room.controlsRefreshed = true; };
		room.choice = {waiting: true, choices: ['move 2']};
		const choice = room.choice;
		room.add('|turn|5');
		assert.equal(seeks.length, 0, 'ordinary live turns keep their animations');
		room.add('|fantasyrogueresumed|');
		assert.deepEqual(seeks, [[Infinity, true]]);
		assert.equal(room.choice, choice); assert(room.controlsRefreshed);
		assert.equal(room.battle.stepQueue.at(-1), '|turn|5', 'the resume notice is not part of the battle log');
	});
	it('offers revival during an uncatchable battle and validates the item and fainted target', () => {
		const c = battleClient(), room = c.room;
		c.context.translations = {Mew: '梦幻'};
		room.request.fantasyRogue = {catchable: false, revival: {targets: [{slot: 2, name: 'Mew'}],
			items: [{id: 'revive', name: '活力碎片', count: 2}, {id: 'maxrevive', name: '活力块', count: 0}]}};
		const html = room.rogueBallControls();
		assert(html.includes('梦幻')); assert(html.includes('使用道具占用本次行动'));
		assert(html.includes('value="maxrevive" disabled'));
		let slot = '2'; room.$ = () => ({val: () => slot}); room.choice = {choices: []};
		room.endChoice = () => { room.completed = true; };
		room.chooseRogueRevival('potion'); room.chooseRogueRevival('maxrevive');
		slot = '1'; room.chooseRogueRevival('revive'); assert.equal(room.choice.choices.length, 0);
		slot = '2'; room.chooseRogueRevival('revive');
		assert.equal(room.choice.choices[0], 'roguerevive revive 2'); assert(room.completed);
		room.request.fantasyRogue.revival.targets = [];
		assert(room.rogueBallControls().includes('暂无无法战斗的伙伴'));
	});
	it('displays Super Number as x5', () => {
		const {room} = battleClient();
		room.request.fantasyRogue = {catchable: false, number: {available: true, super: true, stats: ['all']}};
		assert(room.rogueBallControls().includes('五项全部 ×5'));
		assert(!room.rogueBallControls().includes('×4'));
	});
	it('preserves the number choice through doubles target selection', () => {
		const {room} = battleClient();
		room.request.fantasyRogue = {catchable: false, number: {available: true, super: false, stats: ['atk', 'def', 'spa', 'spd', 'spe']}};
		assert(room.rogueBallControls().includes('大数字'));
		room.choice = {choices: []}; room.battle.nearSide = {active: [{}, {}]};
		room.tooltips = {hideTooltip() {}}; room.updateControlsForPlayer = () => {};
		room.$ = selector => ({prop: () => false, val: () => selector === 'select[name=rogueNumberStat]' ? 'atk' : ''});
		room.endChoice = () => {};
		room.chooseMove('2', {getAttribute: () => 'normal'}); room.chooseMoveTarget('1');
		assert.equal(room.choice.choices[0], 'roguenumber atk move 2 1');
		room.request.fantasyRogue.number.available = false;
		assert(room.rogueBallControls().includes('name="rogueNumberStat" disabled'));
	});
	it('preserves a selected blood boost through doubles target selection and shows its real cost', () => {
		const c = battleClient(), room = c.room;
		room.request.fantasyRogue = {catchable: false, blood: [{available: true, cost: 11, factor: 1.6}]};
		const html = room.rogueBallControls();
		assert(html.includes('消耗 11 HP')); assert(html.includes('伤害 +60%'));
		room.choice = {choices: []}; room.battle.nearSide = {active: [{}, {}]};
		room.tooltips = {hideTooltip() {}}; room.updateControlsForPlayer = () => {};
		room.$ = selector => ({prop: () => selector === 'input[name=rogueBloodBoost]'});
		room.endChoice = () => { room.finishedChoice = true; };
		room.chooseMove('2', {getAttribute: () => 'normal'});
		assert.equal(room.choice.type, 'movetarget'); assert(!room.finishedChoice);
		room.chooseMoveTarget('1'); assert.equal(room.choice.choices[0], 'rogueblood move 2 1'); assert(room.finishedChoice);
		room.choice.choices = []; room.request.fantasyRogue.blood[0].available = false;
		assert(room.rogueBallControls().includes('name="rogueBloodBoost" disabled'));
	});
	it('uses filtered succession choices in battle and refuses a stale duplicate ability click', () => {
		const c = battleClient(), king = {member: 'next', species: 'Dragonite', token: 4, pending: true, options: ['longzhihuxi']};
		c.room.request = {rqid: 9, fantasyRogue: {dragonKing: king}};
		const html = c.room.dragonKingControls(king);
		assert(html.includes('value="longzhihuxi"')); assert(!html.includes('value="drizzle"'));
		c.room.chooseDragonKing('drizzle'); assert.equal(c.sent.length, 0);
		c.room.chooseDragonKing('longzhihuxi'); assert.deepEqual(c.sent, ['/choose rogueking longzhihuxi 4|9']);
	});
	it('prompts once per king succession, keeps fallback controls and rejects stale popup clicks', () => {
		const c = battleClient(), popups = [];
		c.context.translations = {Dratini: '迷你龙'};
		c.app.addPopup = (type, data) => popups.push({type, data});
		c.room.request = {rqid: 8, requestType: 'switch', fantasyRogue: {dragonKing: {member: 'second', species: 'Dratini', token: 2, pending: true}}};
		c.room.updateControlsForPlayer(); c.room.updateControlsForPlayer();
		assert.equal(popups.length, 1); assert(c.room.html.includes('龙王的工作 · 继任')); assert(c.room.html.includes('name="chooseDragonKing"'));
		assert(c.room.html.includes('迷你龙接任本场龙王'));
		assert(c.room.html.includes('name="retreatRogue"'));
		c.room.chooseDragonKing('drizzle', {}); assert.deepEqual(c.sent, ['/choose rogueking drizzle 2|8']);
		c.room.chooseDragonKing('drizzle', 1); assert.equal(c.sent.length, 1);
		const popup = Object.create(popups[0].type); popup.$el = {html() {}}; popup.close = () => {};
		popup.initialize(popups[0].data);
		c.room.request.fantasyRogue.dragonKing.token = 3; c.room.updateControlsForPlayer(); assert.equal(popups.length, 2);
		popup.chooseDragonKing('longzhihuxi'); assert.equal(c.sent.length, 1);
	});
	it('shows precise capture probability in ball hover content, including certain and tiny chances', () => {
		const c = battleClient();
		c.room.request.fantasyRogue = {catchable: true, balls: [
			{id: 'pokeball', name: '精灵球', count: 3, chance: .123456},
			{id: 'ultraball', name: '高级球', count: 1, chance: 1},
			{id: 'tiny', name: '测试球', count: 1, chance: .000001},
		]};
		const html = c.room.rogueBallControls();
		for (const text of ['12.35%', '100%', '低于 0.01%', 'role="tooltip"', '含会心捕捉']) assert(html.includes(text), text);
		c.room.request.fantasyRogue.catchable = false; assert.equal(c.room.rogueBallControls(), '');
	});
	it('offers an independent companion Z during trainer or PVP battles and sends the chosen target', () => {
		const c = battleClient();
		c.room.request.fantasyRogue = {catchable: false, companionZ: [{move: 'roguecitydark', name: '熙熙攘攘我们的城市', target: 'normal', source: '【同行训练家 - 玛俐】', category: 'Special'}]};
		c.room.battle.farSide = {active: [{name: '甲'}, {name: '乙'}]}; c.room.choice = {choices: []};
		c.room.endChoice = () => { c.room.finishedChoice = true; };
		const html = c.room.rogueBallControls();
		assert(html.includes('move|roguecitydark|0')); assert(html.includes('威力 <b>185</b>')); assert(html.includes('同行训练家 - 玛俐'));
		c.room.chooseRogueCompanionZ('2'); assert.equal(c.room.choice.choices[0], 'roguecompanionz 2'); assert(c.room.finishedChoice);
		c.room.choice.choices = []; c.room.request.fantasyRogue.companionZ = [null];
		c.room.chooseRogueCompanionZ('1'); assert.equal(c.room.choice.choices.length, 0);
	});
	it('renders and sends retreat only for the campaign owner, including while waiting on a turn', () => {
		const c = battleClient(); c.room.updateControlsForPlayer();
		assert(c.room.html.includes('name="retreatRogue"'));
		c.room.choice.waiting = true; c.room.updateControlsForPlayer();
		assert(c.room.html.includes('name="retreatRogue"'));
		c.room.retreatRogue(); assert.deepEqual(c.sent, ['/fantasyrogue retreat']);
		c.room.fantasyRogue.userid = 'someoneelse'; c.room.updateControlsForPlayer();
		assert(!c.room.html.includes('name="retreatRogue"'));
		c.room.retreatRogue(); assert.equal(c.sent.length, 1);
	});
	it('keeps event escape and routes the native forfeit popup through the same escape action', () => {
		const c = battleClient(); c.room.fantasyRogue.canRetreat = false;
		c.room.updateControlsForPlayer(); assert(c.room.html.includes('name="retreatRogue"'));
		c.room.retreatRogue(); assert.equal(c.sent.length, 1);
		const popup = Object.create(c.context.ForfeitPopup);
		popup.$el = {html: html => { popup.html = html; }};
		popup.initialize({room: c.room, gameType: 'battle'});
		assert(popup.html.includes('道具消耗保留')); assert(popup.html.includes('type="submit"'));
		popup.close = () => {}; popup.submit({}); assert.deepEqual(c.sent, ['/fantasyrogue retreat', '/fantasyrogue retreat']);
	});
	it('shows overflowing psychic charge during trainer battles and spends a normal action', () => {
		const c = battleClient();
		c.room.request.fantasyRogue = {catchable: false, psychic: 105.5};
		assert(c.room.rogueBallControls().includes('105.5%'));
		assert(c.room.rogueBallControls().includes('释放灵能 · 一击必杀'));
		c.room.choice = {choices: []}; c.room.endChoice = () => { c.room.finishedChoice = true; };
		c.room.chooseRoguePsychic();
		assert.equal(c.room.choice.choices.join(','), 'roguepsychic 1'); assert(c.room.finishedChoice);
		c.room.choice.choices = []; c.room.request.fantasyRogue.psychic = 99;
		assert(c.room.rogueBallControls().includes('disabled'));
		c.room.chooseRoguePsychic(); assert.equal(c.room.choice.choices.length, 0);
	});
	it('still returns immediately after an explicit retreat only for its owner', () => {
		const c = battleClient(); c.room.add('|fantasyrogueend|');
		assert.deepEqual(c.joined, ['fantasyrogue']); assert(c.room.closed && c.room.battleEnded);
		const spectator = battleClient(); spectator.room.fantasyRogue.userid = 'someoneelse';
		spectator.room.add('|fantasyrogueend|');
		assert(!spectator.room.closed); assert.deepEqual(spectator.joined, []);
	});
	it('reports restored resources after a memory battle defeat without telling players to revive again', () => {
		const c = battleClient();
		c.room.battle.ended = true; c.room.battle.atQueueEnd = true;
		c.room.add('|fantasyroguedefeat|' + JSON.stringify({floor: 41, eventClosed: true, memoryRestored: true}));
		assert(c.room.html.includes('已恢复到战前状态'));
		assert(c.room.html.includes('保留实际经验与捕捉结果'));
		assert(!c.room.html.includes('消耗已保存'));
		assert(!c.room.html.includes('复活至少一名伙伴'));
	});
	it('keeps the clue search open after an ambush defeat and preserves resource losses', () => {
		const c = battleClient(); c.room.battle.ended = true; c.room.battle.atQueueEnd = true;
		c.room.add('|fantasyroguedefeat|' + JSON.stringify({floor: 81, eventContinues: true}));
		assert(c.room.html.includes('继续寻找线索'));
		assert(c.room.html.includes('消耗已保存'));
		assert(!c.room.html.includes('事件已经结束'));
		assert(!c.room.html.includes('下次仍挑战'));
	});
	it('preserves the clear after a god-challenge loss and offers the ending instead of a retry', () => {
		const c = battleClient(); c.room.battle.ended = true; c.room.battle.atQueueEnd = true;
		c.room.add('|fantasyroguedefeat|' + JSON.stringify({floor: 200, postgame: true}));
		assert(c.room.html.includes('200 层通关成果与通关卡已保留'));
		assert(!c.room.html.includes('消耗已保存'));
		assert(!c.room.html.includes('免费重试'));
	});
	it('plays the final turn before showing defeat consequences and waits for manual return', () => {
		const c = battleClient();
		const defeat = {floor: 21, encounter: 3, encounters: 3, retryFloor: false, noHealing: false, emergencyCost: 5000};
		c.room.add('|fantasyroguedefeat|' + JSON.stringify(defeat));
		assert(!c.room.closed); assert.deepEqual(c.joined, []);
		assert(!c.room.html.includes('本场战败'));
		const finalTurn = '|move|p2a: Bulbasaur|Tackle|p1a: Magikarp\n|-damage|p1a: Magikarp|0 fnt\n|faint|p1a: Magikarp\n|win|Wild';
		c.room.add(finalTurn);
		assert.equal(c.room.battle.stepQueue.join('\n'), finalTurn);
		assert(!c.room.closed); assert(!c.room.html.includes('本场战败'));
		c.room.battle.ended = true; c.room.battle.atQueueEnd = true; c.room.updateControls();
		assert(c.room.html.includes('本场战败')); assert(c.room.html.includes('3 / 3'));
		assert(c.room.html.includes('5000')); assert(c.room.html.includes('余额足够会自动支付'));
		assert(c.room.html.includes('HP、PP')); assert(!c.room.html.includes('需重试整层'));
		assert(!c.room.closed); assert.deepEqual(c.joined, []);
		c.room.closeAndRematch(); assert(c.room.closed); assert.deepEqual(c.joined, ['fantasyrogue']);
	});
	it('opens the saved ending once only after the final victory playback finishes', () => {
		const c = battleClient(); c.app.curRoom = c.room; c.room.fantasyRogueEnding = true;
		c.room.updateControls(); assert.equal(c.joined.length, 0);
		c.room.battle.ended = true; c.room.updateControls(); assert.equal(c.joined.length, 0);
		c.room.battle.atQueueEnd = true; c.room.updateControls();
		assert.deepEqual(c.joined, ['fantasyrogue']); assert(!c.room.closed);
		c.room.updateControls(); assert.equal(c.joined.length, 1);
		const spectator = battleClient(); spectator.app.curRoom = spectator.room;
		spectator.room.fantasyRogueEnding = true; spectator.room.fantasyRogue.userid = 'other';
		spectator.room.battle.ended = true; spectator.room.battle.atQueueEnd = true; spectator.room.updateControls();
		assert.equal(spectator.joined.length, 0);
	});
	it('restores the defeat notice after playback has already ended and distinguishes continuous challenges', () => {
		const c = battleClient(); c.room.battle.ended = true; c.room.battle.atQueueEnd = true;
		c.room.add('|fantasyroguedefeat|' + JSON.stringify({floor: 21, encounter: 3, encounters: 3, retryFloor: true, noHealing: true}));
		assert(c.room.html.includes('需重试整层')); assert(c.room.html.includes('撤回本层收益'));
		assert(!c.room.html.includes('急救全队')); assert(!c.room.closed);
		const spectator = battleClient(); spectator.room.fantasyRogue.userid = 'someoneelse';
		spectator.room.add('|fantasyroguedefeat|{}');
		assert(!spectator.room.fantasyRogueDefeat); assert(!spectator.room.closed);
	});
});


describe('Compact tower controls and live ski input', () => {
 it('focuses the slope immediately after starting and responds to held arrow keys and A/D', () => {
  let now = 1000, focused = 0, prevented = 0;
  const frames = [], c = client(false, false, {Date: class extends Date {static now() {return now;}},
   requestAnimationFrame: cb => {frames.push(cb); return frames.length;}, cancelAnimationFrame() {}});
  const data = adventure('event');
  data.run.event = {key: 'ski-focus', stage: 'choice', ski: {started: 1000, now: 1000, lane: 1, obstacles: []}};
  c.room.state = data; c.app.curRoom = c.room;
  const oldQuery = c.room.$;
  c.room.$ = selector => selector === '.rogue-ski' ? [{focus() {focused++;}}] : selector === '.rogue-ski canvas' ?
   [{isConnected: true, getContext: () => new Proxy({}, {get: () => () => {}})}] : oldQuery(selector);
  c.room.startSkiClock(); assert.equal(focused, 1);
  const moves = []; c.room.skiMove = value => moves.push(value);
  const key = (value, repeat = false) => c.room.skiKey({key: value, repeat, preventDefault() {prevented++;}, stopPropagation() {}});
  key('ArrowLeft'); now += 80; key('ArrowLeft', true); now += 80; key('ArrowLeft', true); key('D');
  assert.deepEqual(moves, ['skileft', 'skileft', 'skiright']); assert.equal(prevented, 4);
  c.app.curRoom = {}; c.room.startSkiClock(); assert.equal(focused, 1, 'Do not steal focus from another room');
 });
 it('queues rapid direction presses without a cooldown and reconciles authoritative lanes', () => {
  const c = client(), data = adventure('event');
  data.run.event = {key: 'ski-input', stage: 'choice', ski: {lane: 1, started: Date.now(), now: Date.now(), duration: 15000, obstacles: []}};
  c.room.state = data;
  c.room.skiMove('skileft'); c.room.skiMove('skiright'); c.room.skiMove('skiright');
  assert.equal(c.sent.length, 1); assert.equal(c.room.skiDisplayLane(1), 2);
  const request = JSON.parse(c.sent[0].slice('/fantasyrogue ski '.length));
  assert(Number.isFinite(request.skiAt));
  c.room.receiveSki({userid: data.userid, id: request.id, ok: true, revision: 2, event: {...data.run.event, ski: {...data.run.event.ski, lane: 0}}});
  assert.equal(c.sent.length, 2); assert.equal(c.room.skiDisplayLane(0), 2);
  assert.equal(JSON.parse(c.sent[1].slice('/fantasyrogue ski '.length)).revision, 2);
  assert(!c.room.pending); assert(!c.room.renderSki(data.run.event, false).includes('disabled'));
  c.room.receiveSki({userid: data.userid, id: c.room.skiPending.id, ok: true, revision: 3, event: {key: 'ski-input', stage: 'result'}});
  assert.equal(c.room.skiQueue.length, 0); assert.equal(c.sent.at(-1), '/cmd fantasyrogue');
 });
 it('shows type, power, accuracy and current/max PP on compact move buttons', () => {
  const c = client(), data = adventure('ready'); c.room.receiveState(data);
  assert(c.panel.html.includes('rogue-equipped-move')); assert(c.panel.html.includes('data-type="Grass"'));
  assert(c.panel.html.includes('威力 45')); assert(c.panel.html.includes('命中 100%')); assert(c.panel.html.includes('PP '));
 });
 it('does not show the game or codex after a denied direct link', () => {
  const c = client(true); c.room.receiveState({...state(), enabled: false, account: null, message: '需要内测权限'});
  assert(c.room.html.includes('当前账号未开放')); assert(!c.room.html.includes('事件图鉴'));
 });
});

describe('Cooperative fishing controls', () => {
	function setup() {
		let time = 10000, tick;
		const cancelled = [], nodes = {};
		const c = client(true, false, {Date: class extends Date {static now() { return time; }},
			requestAnimationFrame: fn => { tick = fn; return 17; },
			cancelAnimationFrame: id => { cancelled.push(id); tick = null; }});
		c.room.receiveState(state()); c.room.openCoop();
		for (const selector of ['.rogue-fishing', '.rogue-fishing-cursor', '.rogue-fishing-zone',
			'.rogue-fishing-progress i', '.rogue-fishing-feedback', 'button[name="chooseCoopEvent"][value="fishfinish"]',
			'button[name="chooseCoopEvent"][value="fishtap"]']) {
			nodes[selector] = {style: {}, disabled: true, textContent: ''};
		}
		c.room.$el[0] = {querySelector: selector => nodes[selector] || null};
		const event = {id: 'fishing', key: 'fish-step', stage: 'choice', title: '钓鱼', paragraphs: [],
			fishing: {started: 20000, anchor: 20000, now: 20000, travel: 0, hits: 0, misses: 0, center: 0.5, width: 0.32},
			branchOptions: [{id: 'fishtap', name: '收线'}, {id: 'fishfinish', name: '查看收获', disabled: true}]};
		const session = {id: 'fish-session', role: 'host', hostName: 'rogueplayer', guestName: 'friend',
			partnerUserId: 'friend', status: 'active', canControl: true, adventure: {id: 'fish-run', floor: 61,
				phase: 'route-interaction', team: [], partnerTeam: [], money: 0, bag: {},
				selectedRoute: {kind: 'event'}, coopEvent: event}};
		const receive = () => c.room.receiveCoop({userid: 'rogueplayer', ok: true, action: 'refresh',
			state: {userid: 'rogueplayer', session, players: [], invitations: []}});
		receive();
		return {c, session, event, receive, nodes, cancelled, advance: ms => {time += ms;},
			tick: () => {const next = tick; tick = null; if (next) next();}, active: () => !!tick};
	}
	it('renders one shared fishing scene and uses the latest visit without client time or score fields', () => {
		const f = setup();
		assert(f.c.room.html.includes('共同钓鱼')); assert(f.c.room.html.includes('rogue-fishing-scene'));
		assert.equal((f.c.room.html.match(/value="fishtap"/g) || []).length, 1);
		f.advance(600); f.tick(); assert.equal(f.nodes['.rogue-fishing-cursor'].style.top, '50%');
		f.event.key = 'fish-next'; f.receive(); f.c.room.chooseCoopEvent('fishtap');
		const command = JSON.parse(f.c.sent.at(-1).slice('/fantasyrogue coop '.length));
		assert.deepEqual(command, {action: 'eventchoice', value: 'fishtap', visit: 'fish-next'});
	});
	it('enables the common finish control after expiry without automatically voting or paying out', () => {
		const f = setup(), sent = f.c.sent.length; f.advance(14000); f.tick();
		assert.equal(f.c.sent.length, sent); assert(!f.active());
		assert(f.nodes['button[name="chooseCoopEvent"][value="fishtap"]'].disabled);
		assert.equal(f.nodes['button[name="chooseCoopEvent"][value="fishfinish"]'].disabled, false);
		assert(f.nodes['.rogue-fishing-feedback'].textContent.includes('双方确认'));
	});
	it('keeps finish disabled for a delegated-away owner and stops on pause or another screen', () => {
		const f = setup(); f.session.delegatedTo = 'friend'; f.receive(); f.advance(14000); f.tick();
		assert(f.nodes['button[name="chooseCoopEvent"][value="fishfinish"]'].disabled);
		f.session.status = 'paused'; f.receive(); assert.equal(f.c.room.fishingFrame, null); assert(!f.active());
		assert(f.cancelled.includes(17));
		f.session.status = 'active'; f.event.fishing.now += 14000; f.receive();
		f.c.room.screen = 'home'; f.tick(); assert(!f.active());
	});
	it('removes the timer after settlement and cannot reuse a detached event record', () => {
		const f = setup(); assert(f.active());
		f.event.stage = 'result'; delete f.event.fishing; f.receive();
		assert.equal(f.c.room.fishingFrame, null); assert(!f.c.room.html.includes('rogue-fishing-scene'));
		f.c.room.coopState.session = null; assert.equal(f.c.room.coopFishingEvent(), null);
	});
});

describe('October 21 expansion controls', () => {
	it('shows per-floor weather beside time and displays genuine evolution progress meters', () => {
		const c = client(), data = adventure('ready');
		data.run.time = {id: 'night', name: '夜晚'};
		data.run.floorEnvironment = {floor: 10, name: '下雨 · 精神场地', weather: 'raindance', terrain: 'psychicterrain'};
		data.run.team[0].set.species = 'Primeape'; data.run.team[0].evolutionProgress = {moves: {ragefist: 12}};
		c.room.receiveState(data); assert(c.room.html.includes('rogue-environment'));
		assert(c.room.html.includes('下雨 · 精神场地')); assert(c.html.includes('value="12" max="20"'));
		assert(c.html.includes('真实使用次数')); assert(c.html.includes('<strong>ragefist修行</strong>'));
	});
	it('renders two cat ability groups and sends a stable full member id without editing a team', () => {
		const c = client(), data = adventure('ready'), id = data.run.team[0].id;
		data.run.blessings = {owned: [{id: 'cats', family: 'cats', tier: 'prismatic', name: '尼古喵喵', text: ''}], pending: [], cats: [
			{member: id, species: 'Meowth', selected: ['poisonheal', 'cutecharm'], groups: [
				[{id: 'poisonheal', name: 'Poison Heal'}, {id: 'quickfeet', name: 'Quick Feet'}], [{id: 'cutecharm', name: 'Cute Charm+'}, {id: 'woju', name: '蜗居'}],
			]},
		]};
		c.room.receiveState(data); assert(c.html.includes('第 1 组') && c.html.includes('第 2 组'));
		c.room.chooseCatAbility(encodeURIComponent(id) + '|0:quickfeet');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.member, id); assert.equal(request.action, 'catability'); assert.equal(request.value, '0:quickfeet'); assert(!request.team);
	});
	it('keeps rhythm position on server time, uses the latest response key and cleans up on identity change', () => {
		let tick, now = 900000; const cleared = [], styles = {};
		const c = client(false, false, {Date: class extends Date {static now() {return now;}},
			setInterval: callback => {tick = callback; return 17;}, clearInterval: id => cleared.push(id)});
		const select = c.room.$; c.room.$ = selector => ({...select(selector), css: (key, value) => {styles[selector + ':' + key] = value;}});
		const data = adventure('event'); data.run.node.kind = 'event';
		data.run.event = {title: '舞台', key: 'beat-1', stage: 'choice', paragraphs: ['跟着拍子。'], options: [],
			activity: {startedAt: 1000, now: 1100, period: 800, duration: 12000}};
		c.room.receiveState(data); tick(); assert.equal(styles['.rogue-activity-beat:left'], '12.5%');
		assert(c.room.html.includes('rogue-activity-zone'));
		data.account.revision++; data.run.event.key = 'beat-2'; c.room.receiveState(data);
		now += 12000; tick(); const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'event'); assert.equal(request.value, 'finish'); assert.equal(request.member, 'beat-2');
		c.room.identityChanged(); assert(cleared.includes(17)); assert.equal(c.room.activityClock, null);
	});
	it('uses the matching Peat Block PNG rather than an unknown icon', () => {
		const c = client(), data = adventure('ready'); data.items.push({id: 'peatblock', name: '泥炭块', kind: 'evolution'}); data.run.bag.peatblock = 1;
		c.room.receiveState(data); assert(c.html.includes('sprites/fantasy-rogue/peatblock.png'));
		assert(fs.statSync(require.resolve('../play.pokemonshowdown.com/sprites/fantasy-rogue/peatblock.png')).size > 100);
	});
});
