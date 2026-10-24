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
		}}}, Popup: {extend: popup => popup},
		BattleLog: {escapeHTML: text => String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')},
		Dex: {
			resolveAvatar: id => 'sprites/trainers/' + id + '.png',
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
	return {...context, room, panel, get html() { return room.html + panel.html; }, sent, joined, setUser: id => { userid = id; }};
}
function state() {
	return {userid: 'rogueplayer', protocolVersion: 1, enabled: true, configured: false,
		message: '正式队伍与数值等待配置', starters: [], items: [], run: null,
		account: {revision: 1, points: 25, slots: 1, boosts: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, captures: {}}};
}
describe('Fantasy Rogue start menu and codex', () => {
	it('selects numeric difficulty before departure and keeps spirit access separate for each tier', () => {
		const c = client(), data = state();data.configured=true;
		data.starters=[{id:'bulbasaur',species:'Bulbasaur',available:true}];
		data.account.spiritUnlocked=true;
		data.difficulties=[{id:0,name:'0 档',text:'基础',unlocked:true,spirit:true},
			{id:1,name:'1 档',text:'进阶',rewards:'补给提前 4 层',unlocked:true,spirit:false},
			{id:2,name:'2 档',text:'进阶',unlocked:false,spirit:false},
			{id:'easy',name:'护符庇佑',text:'练习',unlocked:true,spirit:false}];
		c.room.receiveState(data);assert(c.html.includes('name="useSpirit"'));assert(c.html.includes('value="2" disabled'));
		c.room.useSpirit=true;c.room.changeDifficulty({currentTarget:{value:'1'}});
		assert.equal(c.room.useSpirit,false);assert(!c.html.includes('name="useSpirit"'));assert(c.html.includes('补给提前 4 层'));
		c.room.selectedStarters=['bulbasaur'];c.room.startAdventure();
		const request=JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));assert.equal(request.difficulty,1);
		assert.equal(request.useSpirit,false);
	});
	it('renders charm decisions and exact acquisition effects, and submits each distinct action', () => {
		for(const [stage,method,action,value] of [['charm','chooseCharm','charm','accept'],['difficultyconfirm','confirmDifficulty','confirmdifficulty'],['difficultyconfirm','restartSetup','restartsetup']]) {
			const c=client(),data=adventure('story');
			data.story={stage,title:'准备出发',text:stage==='charm'?'它能帮你压一压对手的力量。':'本局个体值上限为 10。',
				difficulty:'easy',difficultyLabel:'护符庇佑',charmText:'本局个体值上限为 10。'};
			c.room.receiveState(data);assert(c.html.includes('old-charm.png'));assert(c.html.includes('个体值上限为 10'));
			assert(!c.html.includes('name="storyNext"'));
			c.room[method](value);const request=JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));assert.equal(request.action,action);
			if(value)assert.equal(request.value,value);
		}
	});
	it('shows the non-tradeable charm, exact current scales and advanced supplies in the bag', () => {
		const c=client(),data=adventure('ready');data.run.difficulty='easy';data.run.difficultyLabel='护符庇佑';
		data.run.difficultyScales={player:0.9,opponent:0.65};data.run.charm={name:'古代护符',description:'不获得局外点数。'};
		c.room.receiveState(data);assert(c.html.includes('我方 90.0%'));assert(c.html.includes('对手 65.0%'));
		assert(c.html.includes('本局护符 · 不占携带道具位'));assert(!c.html.includes('value="use:oldcharm"'));assert(!c.html.includes('value="sell:oldcharm"'));
		const png=fs.readFileSync(require.resolve('../play.pokemonshowdown.com/sprites/fantasy-rogue/key-items/old-charm.png'));
		assert.equal(png.readUInt32BE(16),32);assert.equal(png.readUInt32BE(20),32);
		data.run.difficulty=5;data.run.difficultyLabel='5 档';delete data.run.charm;data.run.difficultyRewards='道馆首胜额外碎片 ×10';
		c.room.receiveState(data);assert(c.html.includes('本档培养补给'));assert(c.html.includes('道馆首胜额外碎片 ×10'));
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
	it('starts with generation groups collapsed and filters starters by either type', () => {
		const c = client(), data = state(); data.configured = true;
		data.starters = [{id: 'bulbasaur', species: 'Bulbasaur', gen: 1, types: ['Grass', 'Poison'], available: true},
			{id: 'ferroseed', species: 'Ferroseed', gen: 5, types: ['Grass', 'Steel'], available: true}];
		c.room.receiveState(data);
		assert(c.html.includes('<details data-rogue-key="starter-gen-1">'));
		assert(c.html.includes('<details data-rogue-key="starter-gen-5">'));
		c.room.filterStarterType({currentTarget: {value: 'Steel'}});
		assert(c.html.includes('value="ferroseed"')); assert(!c.html.includes('value="bulbasaur"'));
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
		assert(c.room.html.includes('【迷人之躯+】'));
		assert(c.room.html.includes('【毒傀儡】')); assert(!c.room.html.includes('毒傀儡🔄'));
		assert(c.room.html.includes('【旋风刀🔄】'));
	});
	it('offers an ecology guide with anonymous black silhouettes and named caught pixel icons', () => {
		const c = client(true), calls = []; c.room.receiveState(state()); c.room.openCodex('events');
		c.Dex.getPokemonIcon = name => {calls.push(name); return 'background-position:0 0;';};
		c.room.receiveCodex({userid: 'rogueplayer', codexSchema: 3, section: 'events', entries: [
			{id: 'biome01', category: 'ecology', unlocked: true, name: '绿茵森林', text: '在这里捕捉', pokemon: [{species: 'Caterpie', caught: false}, {species: 'Weedle', caught: true}], visitors: [{species: 'Paras', caught: false}]},
		]});
		c.room.filterCodex('ecology');
		assert(c.room.html.includes('生态区域')); assert(c.room.html.includes('绿茵森林'));
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
		data.codexSchema = 3;
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
		c.room.receiveCodex({userid: 'rogueplayer', codexSchema: 3, section: 'guide',
			guide: {intro: [], beginner: data.beginnerGuide, modules: {}}});
		c.room.filterCodex('beginner');
		assert(c.room.html.includes('两个同行名额')); assert(!c.room.html.includes('<script>'));
		assert(c.room.html.includes('<strong>15 次偏好选择</strong>'));
		assert(!c.room.html.includes('图鉴与当前客户端的版本不一致'));
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
	it('uses real medicine images and uniform system-status text', () => {
		const c = client(), data = adventure('rest');
		data.items = ['antidote', 'burnheal', 'iceheal', 'awakening', 'paralyzeheal'].map(id => ({id, name: id, kind: 'cure'}));
		data.items.forEach(item => { data.run.bag[item.id] = 1; });
		c.room.receiveState(data);
		for (const item of data.items) assert(c.html.includes('sprites/fantasy-rogue/' + item.id + '.png'));
		assert(c.html.includes('rogue-tera rogue-system-status'));
		assert(c.html.includes('class="rogue-system-status">超进化：'));
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
		assert.equal((html.match(/<svg class="rogue-loot-icon"/g) || []).length, 5);
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
	it('ships both expressions for every added gym leader and uses them in dialogue', () => {
		const c = client();
		for (const id of ['jasmine', 'winona', 'gardenia', 'candice', 'clair', 'clay', 'nanu', 'valerie', 'leon', 'cynthia', 'diantha', 'ash']) {
			const png = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/sprites/rogue-dialogue/' + id + '.png'));
			assert.equal(png.subarray(1, 4).toString(), 'PNG');
			assert.equal(png.readUInt32BE(16), 2 * png.readUInt32BE(20), id + ' paired square cells');
			assert.equal(png[25], 6, id + ' RGBA transparency');
			for (const expression of ['neutral', 'approval']) {
				const art = c.room.storyArt({scene: 'arena', portrait: id, speaker: id, expression});
				const version = id === 'ash' ? '20261024-cutout' : ['leon', 'cynthia', 'diantha'].includes(id) ? '20261024' : '20261023';
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
		for (const text of ['增幅前', '常驻最终值', '增加值', '增幅比例', '个人永久训练', '额外特性', '越打命越硬', '+100%', '<b>100</b>']) assert(room.html.includes(text), text);
		delete card.snapshot.memberDetails;
		room.render(); assert(room.html.includes('旧卡未记录增幅前数值'));
		assert(room.html.includes('历史 0 档'));
		card.snapshot.difficulty='easy';card.snapshot.difficultyLabel='护符庇佑';card.snapshot.difficultyScale=0.9;
		room.render();assert(room.html.includes('护符庇佑'));assert(room.html.includes('old-charm.png'));
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
	it('shows affinity on portraits and animates each committed choice once', () => {
		const c = client(); c.room.receiveState(adventure());
		const story = {key: 'answer:1', scene: 'arena', title: '玛俐', portrait: 'marnie', affection: 8, affectionGain: 2};
		const html = c.room.storyArt(story);
		assert(html.includes('title="当前好感度：8"')); assert(html.includes('好感度 +2'));
		assert(!c.room.storyArt(story).includes('好感度 +2'));
		assert(c.room.storyArt({...story, key: 'answer:2', affection: 11, affectionGain: 3}).includes('好感度 +3'));
		const run = adventure('event').run;
		run.event = {title: '重逢', paragraphs: ['你好。'], options: [], rivalPortrait: 'marnie', affection: 11};
		assert(c.room.renderEvent(run, false).includes('title="当前好感度：11"'));
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
		c.room.receiveState(data);
		assert(!c.panel.html.includes('choosewinter')); assert(c.panel.html.includes('小刚 · 常驻同行'));
		assert(c.panel.html.includes('progress value="7" max="15"')); assert(c.panel.html.includes('乌栗 · 劲敌'));
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
	it('chooses either streamer and displays event recommendations with the preference counter', () => {
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
			c.room.receiveState(data);
			assert(c.panel.html.includes('<strong>同行训练家的赠礼</strong><progress value="6" max="15"'));
			assert(c.panel.html.includes('<b>6 / 15</b>')); assert(c.html.includes('接受挑战（' + name + '推荐）'));
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
	it('explains immediate attribute upgrades, paid checkpoint costs and the final card step', () => {
		const {c, data} = ready();
		delete data.run.blessings.round;
		data.run.blessings.evolutionCosts = [50, 100];
		data.run.blessings.stage = {kind: 'direction', options: [{id: 'stats', name: '数值进化'}]};
		c.room.receiveState(data);
		assert(c.room.html.includes('随后立即选择一次强化'));
		assert(c.room.html.includes('本轮已按一份棱彩祝福'));
		c.room.chooseBlessingUpgrade('stats');
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.action, 'blessing'); assert.equal(request.value, 'stats');
		data.run.floor = 200;
		data.run.blessings.stage = {kind: 'upgrade', options: [{id: 'stat:hp', name: 'HP +15%'}]};
		c.room.receiveState(data);
		assert(c.room.html.includes('完成最后一次强化后保存通关卡'));
		assert(!c.room.html.includes('本轮已按一份棱彩祝福'));
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
		data.selectableSpirits = [{id: 'kyogre', name: '盖欧卡的降雨'}];
		c.room.useSpirit = true; c.room.selectedSpirit = 'kyogre'; c.room.receiveState(data);
		assert(c.html.includes('name="selectedSpirit"'));
		assert(c.html.includes('随机抽取（包含未通关塔灵）'));
		assert(c.html.includes('value="kyogre" selected'));
		assert(!c.html.includes('name="testSpirit"'));
		c.room.selectedStarters = ['bulbasaur']; c.room.startAdventure();
		const request = JSON.parse(c.sent.at(-1).slice('/fantasyrogue action '.length));
		assert.equal(request.selectedSpirit, 'kyogre'); assert.equal(request.useSpirit, true);
		assert.equal(request.testSpirit, undefined);
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
	it('scrolls to each newly pending move once and waits until the learning panel is visible', () => {
		let reduced = false;
		const c = client(false, false, {matchMedia: () => ({matches: reduced})}), data = adventure('ready'), calls = [];
		data.run.id = 'scroll-test';
		const root = {scrollTop: 650, clientHeight: 500, getBoundingClientRect: () => ({top: 10}),
			querySelector: () => c.room.html.includes('class="rogue-pending-move"') ? {
				getBoundingClientRect: () => ({top: 210 - root.scrollTop}),
			} : null,
			scrollTo: options => {calls.push(options); root.scrollTop = options.top;}};
		c.room.$el[0] = root;
		const pending = move => [{member: data.run.team[0].id, move}];
		data.run.pendingMoves = pending('vinewhip'); c.room.receiveState(data);
		assert.equal(calls.length, 1); assert.equal(calls[0].top, 0); assert.equal(calls[0].behavior, 'instant');
		assert(c.room.html.includes('学习到了新的招式，请先确认'));
		assert(c.room.html.indexOf('class="rogue-pending-move"') < c.room.html.indexOf('<h2>幻想杯肉鸽'));
		c.room.render(); c.room.receiveState(data); assert.equal(calls.length, 1);
		data.run.pendingMoves = pending('growl'); c.room.receiveState(data); assert.equal(calls.length, 2);
		data.run.pendingMoves = []; c.room.receiveState(data);
		reduced = true; data.run.pendingMoves = pending('growl'); c.room.receiveState(data);
		assert.equal(calls.length, 3); assert.equal(calls[2].top, 0); assert.equal(calls[2].behavior, 'instant');
		c.room.screen = 'home'; data.run.pendingMoves = pending('tackle'); c.room.receiveState(data);
		assert.equal(calls.length, 3);
		c.room.screen = 'game'; root.clientHeight = 0; c.room.render(); assert.equal(calls.length, 3);
		root.clientHeight = 500; c.room.revealPendingMove(); assert.equal(calls.length, 4);
		data.run.pendingMoves = pending('cut'); root.clientHeight = 0;
		c.app.curRoom = c.panel; let focused;
		c.app.focusRoom = id => {focused = id; c.app.curRoom = c.room; root.clientHeight = 500; c.room.revealPendingMove();};
		c.room.receiveState(data);
		assert.equal(focused, 'fantasyrogue'); assert.equal(calls.length, 5);
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
		assert(!c.html.includes('+1200') && !c.html.includes('本场胜利／捕捉成功可获得'));
		for (const text of ['alt="Grass"', 'alt="Physical"', '威力', '命中率', '100%', 'PP', '攻击目标造成伤害']) {
			assert(c.html.includes(text), text);
		}
		assert(c.html.indexOf('学习招式') < c.html.indexOf('局外能力加成'));
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
