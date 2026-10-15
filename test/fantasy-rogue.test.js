const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const {EventEmitter} = require('events');

function client(startScreen = false) {
	const sent = [], joined = [];
	let userid = 'rogueplayer';
	const context = {
		Room: {extend: room => room, prototype: {dispatchClickButton(e) {
			this[e.currentTarget.name](e.currentTarget.value, e.currentTarget);
		}}}, Popup: {extend: popup => popup},
		BattleLog: {escapeHTML: text => String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')},
		Dex: {
			getPokemonIcon: () => '', getItemIcon: () => '', getTeambuilderSprite: () => '',
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
			rooms: {},
			user: Object.assign(new EventEmitter(), {get: () => userid}),
			socket: {readyState: 1}, send: message => sent.push(message), joinRoom: id => joined.push(id), updateLayout() {},
			addPopup: (type, data) => { context.app.lastPopup = {type, data}; },
		}),
		setTimeout: () => 1, clearTimeout: () => {},
	};
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-fantasy-rogue.js'), 'utf8'), context);
	const room = Object.create(context.FantasyRogueRoom);
	room.id = 'fantasyrogue';
	context.app.rooms.fantasyrogue = room;
	const panel = Object.create(context.FantasyRoguePartyRoom);
	panel.id = 'fantasyrogueparty';
	panel.$el = {addClass() {}, html: html => { panel.html = html; }, scrollTop: () => 0};
	context.app._addRoom = id => { context.app.rooms[id] = panel; return panel; };
	context.app.updateSideRoom = id => { context.app.sideRoom = context.app.rooms[id]; };
	room.$el = {addClass() {}, html: html => { room.html = html; }};
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
	return {...context, room, panel, get html() { return room.html + panel.html; }, sent, joined, setUser: id => { userid = id; }};
}
function state() {
	return {userid: 'rogueplayer', protocolVersion: 1, enabled: true, configured: false,
		message: '正式队伍与数值等待配置', starters: [], items: [], run: null,
		account: {revision: 1, points: 25, slots: 1, boosts: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, captures: {}}};
}
describe('Fantasy Rogue start menu and codex', () => {
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
	it('uses real medicine images and uniform system-status text', () => {
		const c = client(), data = adventure('rest');
		data.items = ['antidote', 'burnheal', 'iceheal', 'awakening', 'paralyzeheal'].map(id => ({id, name: id, kind: 'cure'}));
		data.items.forEach(item => { data.run.bag[item.id] = 1; });
		c.room.receiveState(data);
		for (const item of data.items) assert(c.html.includes('sprites/fantasy-rogue/' + item.id + '.png'));
		assert(c.html.includes('rogue-tera rogue-system-status'));
		assert(c.html.includes('class="rogue-system-status">超进化：'));
	});
	it('spans trade-route description across the card instead of the icon column', () => {
		const c = client(), data = adventure('choose');
		data.run.choices = [{id: 'trade', name: '招式学习机商店', kind: 'trade', encounters: 0, reward: {money: 0, items: {}}}];
		c.room.receiveState(data);
		assert(c.html.includes('class="rogue-route-description">每种商品限购一件'));
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
	it('hides the adventure-screen retreat action for locked event battles', () => {
		const c = client(), data = adventure('battle'); data.run.canRetreat = false;
		c.room.receiveState(data);
		assert(!c.room.html.includes('value="retreat"')); assert(c.room.html.includes('本次事件对战不能撤退'));
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
		assert.equal(icons[0].spritenum, 34); assert(!c.room.html.includes('专属效果'));
		c.room.filterCodex('exclusive'); assert(c.room.html.includes('专属效果')); assert(!c.room.html.includes('通用效果'));
		c.room.filterCodex('special'); assert(c.room.html.includes('特殊说明'));
	});
	it('opens trade stock directly without center healing and keeps abandon outside scrollable content', () => {
		const c = client(), data = adventure('rest');
		data.run.node = {kind: 'trade', name: '薄荷商店', trade: {kind: 'mint'}, reward: {money: 0, items: {}}};
		data.items = [{id: 'roguemintmodest', name: 'Modest薄荷', kind: 'mint', price: 500, shopFloor: 1, description: '特攻提高'}];
		data.shopItems = ['roguemintmodest']; c.room.receiveState(data);
		assert(c.room.html.includes('欢迎来到薄荷商店！'));
		assert(c.room.html.includes('金币购买 · 限购 1'));
		assert(!c.room.html.includes('恢复存活伙伴'));
		assert(c.room.html.startsWith('<div class="rogue-game-layout"><div class="pad rogue-game-content">'));
		assert(c.room.html.includes('</div><footer class="rogue-abandon"'));
	});
	it('starts on the four-button menu and enters the saved story only after pressing start', () => {
		const c = client(true), data = state();
		data.story = {stage: 'opening', scene: 'chamber', title: '醒来', text: '未点击前不显示的剧情', index: 0, total: 8};
		c.room.receiveState(data);
		assert(c.room.html.includes('开始你的幻想杯肉鸽之旅'));
		assert.equal((c.room.html.match(/name="openCodex"/g) || []).length, 3);
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
			{id: 'a', name: '已选祝福', tier: 'gold', unlocked: true, text: '完整效果：伤害提升 20%。'},
			{id: 'b', name: '未选祝福', tier: 'prismatic', unlocked: false, text: '？？？'},
		]});
		assert(c.room.html.includes('完整效果：伤害提升 20%。'));
		assert(c.room.html.includes('tier-prismatic is-locked')); assert(c.room.html.includes('？？？'));
		c.room.filterCodex('unlocked'); assert(!c.room.html.includes('未选祝福'));
		c.room.filterCodex('prismatic'); assert(!c.room.html.includes('已选祝福'));
	});
	it('reads event choices without submitting any gameplay commands or showing battle logs', () => {
		const c = client(true), data = adventure(); c.room.receiveState(data); c.room.openCodex('events');
		const before = JSON.stringify(data), sentBefore = c.sent.length;
		c.room.receiveCodex({userid: 'rogueplayer', section: 'events', entries: [
			{id: 'forest', name: '斗蛐蛐！', unlocked: true, text: '概况', replay: {title: '斗蛐蛐！', start: 'start', pages: {
				start: {text: ['事件开头'], options: [{label: '声援', next: 'battle'}]},
				battle: {text: ['战斗后的文字'], options: [], battleSkipped: true},
			}}}, {id: 'room', name: '房间', unlocked: false, text: '？？？'},
		]});
		c.room.readEvent('room'); assert(!c.room.codexReplay);
		c.room.readEvent('forest'); assert(c.room.html.includes('事件开头'));
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
		assert.equal(nodes.span.textContent, '第二句');
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
		assert(c.room.html.includes('黄金命运')); assert(c.room.html.includes('额外 +10 级')); assert(c.room.html.includes('额外 +20 级'));
		assert(c.room.html.includes('刷新 1 次'));
		c.room.refreshBlessing('0');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'blessingrefresh'); assert.equal(request.slot, 0);
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
		for (const floor of [50, 100, 150]) {
			data.run.floor = floor;
			c.room.receiveState(data);
			const cards = [...c.room.html.matchAll(/<article class="rogue-blessing-option rogue-blessing-(\w+)">([\s\S]*?)<\/article>/g)];
			assert.deepEqual(cards.map(card => card[1]), ['silver', 'gold', 'prismatic']);
			assert(cards[0][2].includes('对手不额外加级'));
			assert(cards[1][2].includes('对手等级 +' + floor / 10));
			assert(cards[2][2].includes('对手等级 +' + floor / 5));
			assert(cards.every(card => card[2].includes('刷新 1 次')));
		}
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
		assert(c.room.html.includes('正在保存操作')); assert(c.panel.html.includes('正在保存操作'));
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
	it('preserves the full colon-containing member id when replacing a captured party member', () => {
		const c = client(); c.room.receiveState(state());
		c.room.replaceMember('run:15:elite:0');
		const request = JSON.parse(c.sent[0].slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'replace'); assert.equal(request.value, 'run:15:elite:0');
	});
	it('puts floor actions and itemized rewards above boosts, and shows the money balance in the bag', () => {
		const c = client(); c.room.receiveState(adventure());
		const html = c.html;
		assert(html.indexOf('选择本层路线') < html.indexOf('本局永久加成'));
		assert(html.includes('已到账 · 第 8 层') && html.includes('+246') && html.includes('×1'));
		assert(html.includes('+162'));
		assert(html.indexOf('>321<') > html.indexOf('背包</h3>'));
		assert.equal((html.match(/>321</g) || []).length, 1);
		assert(html.includes('rogue-item-potion') && html.includes('精灵球') && html.includes('橙橙果'));
		assert(html.includes('当前冒险进行中'));
		assert(!html.includes('value="upgrade:'));
	});
	it('shows Tera locked for legacy and new adventures until the server grants the event unlock', () => {
		const c = client(); const data = adventure();
		c.room.receiveState(data);
		assert(c.html.includes('未解锁，可通过预定祝福或第 100 层馆主赠礼解锁'));
		data.run.teraUnlocked = true;
		c.room.receiveState(data);
		assert(c.html.includes('本局已解锁，每场战斗限用一次'));
		assert(!c.html.includes('未解锁，可通过预定祝福或第 100 层馆主赠礼解锁'));
	});
	it('displays Boss reward quantities, full move details and a localized short description during learning', () => {
		const c = client(); const data = adventure('settlement');
		data.run.pendingMoves = [{member: data.run.team[0].id, move: 'vinewhip'}];
		c.room.receiveState(data);
		assert(c.html.includes('+1200') && c.html.includes('成长点 <strong>+1') && c.html.includes('×3'));
		for (const text of ['alt="Grass"', 'alt="Physical"', '威力', '命中率', '100%', 'PP', '攻击目标造成伤害']) {
			assert(c.html.includes(text), text);
		}
		assert(c.html.indexOf('学习招式') < c.html.indexOf('本局永久加成'));
		assert(c.html.includes('<small>PP</small>25'));
	});
	it('offers only learned moves, displays hidden ability labels and keeps EVs locked without an event', () => {
		const c = client(); c.room.receiveState(adventure());
		assert(c.html.includes('种族值') && c.html.includes('努力值') && c.html.includes('个体值'));
		assert(!c.html.includes('name="ev-hp"'));
		c.room.editSection('moves:1');
		assert(c.html.includes('vinewhip') && c.html.includes('4/25'));
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
		assert(c.html.includes('禁止场外治疗和急救'));
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
	it('prompts once per king succession, keeps fallback controls and rejects stale popup clicks', () => {
		const c = battleClient(), popups = [];
		c.context.translations = {Dratini: '迷你龙'};
		c.app.addPopup = (type, data) => popups.push({type, data});
		c.room.request = {rqid: 8, requestType: 'switch', fantasyRogue: {dragonKing: {member: 'second', species: 'Dratini', token: 2, pending: true}}};
		c.room.updateControlsForPlayer(); c.room.updateControlsForPlayer();
		assert.equal(popups.length, 1); assert(c.room.html.includes('龙王的工作 · 继任')); assert(c.room.html.includes('name="chooseDragonKing"'));
		assert(c.room.html.includes('迷你龙接任本场龙王'));
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
	it('omits event retreat and blocks the native forfeit popup while the encounter remains playable', () => {
		const c = battleClient(); c.room.fantasyRogue.canRetreat = false;
		c.room.updateControlsForPlayer(); assert(!c.room.html.includes('name="retreatRogue"'));
		c.room.retreatRogue(); assert.equal(c.sent.length, 0);
		const popup = Object.create(c.context.ForfeitPopup);
		popup.$el = {html: html => { popup.html = html; }};
		popup.initialize({room: c.room, gameType: 'battle'});
		assert(popup.html.includes('不能撤退或投降')); assert(!popup.html.includes('type="submit"'));
		popup.submit({}); assert.equal(c.sent.length, 0);
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
		assert(c.room.html.includes('5000')); assert(c.room.html.includes('不会自动扣除'));
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
