const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const {EventEmitter} = require('events');

function client() {
	const sent = [], joined = [];
	let userid = 'rogueplayer';
	const context = {
		Room: {extend: room => room},
		BattleLog: {escapeHTML: text => String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')},
		Dex: {getPokemonIcon: () => '', moves: {get: id => ({name: id})}},
		app: Object.assign(new EventEmitter(), {
			user: Object.assign(new EventEmitter(), {get: () => userid}),
			socket: {readyState: 1}, send: message => sent.push(message), joinRoom: id => joined.push(id),
		}),
		setTimeout: () => 1, clearTimeout: () => {},
	};
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-fantasy-rogue.js'), 'utf8'), context);
	const room = Object.create(context.FantasyRogueRoom);
	room.$el = {addClass() {}, html: html => { room.html = html; }};
	room.listenTo = (source, event, callback) => source.on(event, callback.bind(room));
	room.initialize();
	return {...context, room, sent, joined, setUser: id => { userid = id; }};
}
function state() {
	return {userid: 'rogueplayer', protocolVersion: 1, enabled: true, configured: false,
		message: '正式队伍与数值等待配置', starters: [], items: [], run: null,
		account: {revision: 1, points: 25, slots: 1, boosts: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, captures: {}}};
}
describe('Fantasy Rogue client', () => {
	it('renders the unconfigured lobby and six growth branches without a fake start', () => {
		const c = client(); c.room.receiveState(state());
		assert(c.room.html.includes('等待配置'));
		assert(c.room.html.includes('name="startAdventure" value="" disabled'));
		assert.equal((c.room.html.match(/花费 1 点提升/g) || []).length, 6);
		assert(c.room.html.includes('从下一次冒险生效'));
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
	it('renders fixed rest without route choices and keeps repeated healing and revive available', () => {
		const c = client(); const data = state();
		data.items = [{id: 'revive', name: '活力碎片', kind: 'revive', price: 20}];
		data.run = {phase: 'rest', floor: 9, money: 100, team: [], bag: {revive: 1}, boosts: data.account.boosts};
		c.room.receiveState(data);
		assert(c.room.html.includes('恢复存活伙伴'));
		assert(c.room.html.includes('活力碎片'));
		assert(c.room.html.includes('补给完成，进入下一层'));
		assert(!c.room.html.includes('选择本层路线'));
	});
	it('escapes server text and discards state when the account changes', () => {
		const c = client(); const data = state(); data.message = '<img src=x onerror=alert(1)>';
		c.room.receiveState(data);
		assert(!c.room.html.includes('<img'));
		c.setUser('another'); c.room.identityChanged();
		assert.equal(c.room.state, null);
	});
	it('refreshes a denied save after the server confirms login with the same user ID', () => {
		const c = client(); const denied = state();
		denied.account = null; denied.message = '请先登录注册账号，以保存冒险进度。';
		c.room.receiveState(denied);
		assert(c.room.html.includes('请先登录注册账号'));
		c.app.emit('init:choosename');
		assert.deepEqual(c.sent, ['/cmd fantasyrogue']);
		c.room.receiveState(state());
		assert(!c.room.html.includes('请先登录注册账号'));
		assert(c.room.html.includes('花费 1 点提升'));
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
		assert(c.room.html.includes('name="act" value="battle" disabled'));
		c.room.learnMove('0');
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'learn'); assert.equal(request.member, 'run:floor:catch');
		assert.equal(request.value, '0'); assert(!('team' in request));
	});
	it('preserves the full colon-containing member id when replacing a captured party member', () => {
		const c = client(); c.room.receiveState(state());
		c.room.replaceMember('run:15:elite:0');
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'replace'); assert.equal(request.value, 'run:15:elite:0');
	});
});
