(function () {
	'use strict';
	var escape = BattleLog.escapeHTML;
	var globals = this;
	function localName(name) {
		if (name === 'Rogue Great Mage') return '大法师';
		return globals.translations && globals.translations[name] || name;
	}
	var statNames = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
	function starterTraits(starter) {
		var base = {hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20};
		return Object.assign({natures: [], genders: [], abilities: [], moves: [], ivs: {min: base, max: base}}, starter.traits || {});
	}
	function natureLabel(nature) {
		var label = localName(nature.name);
		if (/[（(]/.test(label)) return label;
		return label + (nature.plus && nature.minus ? '（+' + statNames[nature.plus] + '，−' + statNames[nature.minus] + '）' : '（无修正）');
	}
	var kindNames = {wild: '野生战斗', battle: '战斗', elite: '精英', encounter: '遭遇', trainer: '训练家', rest: '休整',
		boss: '首领', gym: '道馆', event: '事件', reward: '奖励', shop: '商店', adventure: '奇遇', fog: '未知区域'};
	function routeTone(kind) {
		if (kind === 'rest') return 'green';
		if (kind === 'adventure' || kind === 'fog') return 'rose';
		if (['event', 'reward', 'shop'].indexOf(kind) >= 0) return 'blue';
		return 'red';
	}
	function cardSelectionMarker() {
		return '<span class="rogue-route-marker" aria-hidden="true"><svg width="18" height="25" viewBox="0 0 18 25">' +
			'<path d="M9 0 18 10 9 25 0 10Z" fill="currentColor"/><path d="M9 4 14 10 9 19 4 10Z" fill="white"/></svg></span>';
	}
	function routeEmblem(kind) {
		var icons = {wild: 'compass', battle: 'bolt', elite: 'shield', encounter: 'bolt', trainer: 'flag',
			boss: 'trophy', gym: 'university', event: 'question', reward: 'gift', shop: 'shopping-bag', rest: 'medkit', adventure: 'magic'};
		return cardSelectionMarker() +
			'<span class="rogue-route-emblem" aria-hidden="true"><i class="fa fa-' + (icons[kind] || 'compass') + '"></i></span>';
	}
	function blessingIcon(option) {
		var icons = {coin: 'adjust', dice: 'cube', friend: 'paw', catcher: 'bullseye', battletask: 'flag', eventtask: 'map-signs',
			supercombo: 'bolt', lowhp: 'heartbeat', pivot: 'exchange', swapstats: 'exchange', kid: 'child', slacker: 'moon-o',
			passdrops: 'level-down', bond: 'heart', pandorasilver: 'random', detect: 'eye', reservation: 'magic', money: 'money',
			starquest: 'star', weakness: 'shield', typexp: 'graduation-cap', overtime: 'hourglass-half', singer: 'microphone',
			dancer: 'music', ordinary: 'users', smallfinal: 'arrow-up', prayer: 'hand-peace-o', topclearmind: 'bolt',
			hazards: 'warning', toxic: 'flask', stackstatus: 'asterisk', starters: 'paw', bugchoir: 'music', pandoragold: 'random',
			survive: 'heart', seeds: 'leaf', secondchoice: 'exchange', bigmoney: 'money', learnall: 'book', style: 'trophy',
			medic: 'medkit', insight: 'sun-o', inheritmoves: 'share-alt', entrance: 'star', meltan: 'cubes', swords: 'gavel',
			execute: 'crosshairs', hpgrowth: 'heartbeat', regis: 'university', sound: 'volume-up', multihit: 'forward',
			hoopa: 'magic', typelink: 'link', typeevolution: 'diamond', psychic: 'superpowers'};
		if ((option.family || option.id).indexOf('fate') === 0) return 'diamond';
		return icons[option.family || option.id] || 'star';
	}
	var routeParticles = '';
	function routeVortex() {
		if (routeParticles) return routeParticles;
		// Four static particle fields scale outwards. Only their transform and opacity
		// animate; there is no per-frame JavaScript, canvas drawing, or rotating path.
		routeParticles = '<span class="rogue-vortex" aria-hidden="true">';
		for (var layer = 0; layer < 4; layer++) {
			routeParticles += '<svg class="rogue-particle-field" width="100%" height="100%" focusable="false" style="--particle-delay: -' + layer * 1.5 + 's">';
			for (var i = 0; i < 32; i++) {
				var edge = (i + layer * .27) / 8;
				var x = edge < 1 ? -1 + edge * 2 : edge < 2 ? 1 : edge < 3 ? 5 - edge * 2 : -1;
				var y = edge < 1 ? -1 : edge < 2 ? edge * 2 - 3 : edge < 3 ? 1 : 7 - edge * 2;
				var radius = .72 + ((i * 13 + layer * 7) % 17) / 60;
				var size = 3.6 + ((i * 7 + layer * 3) % 9) * .3;
				routeParticles += '<rect x="' + (50 + x * radius * 48).toFixed(2) + '%" y="' +
					(50 + y * radius * 48).toFixed(2) + '%" width="' + size + '" height="' + size + '" />';
			}
			routeParticles += '</svg>';
		}
		return (routeParticles += '</span>');
	}
	var itemKinds = {ball: '精灵球', heal: '恢复道具', revive: '复活道具', cure: '状态恢复', ether: 'PP 恢复', candy: '经验糖果', evolution: '进化道具', held: '携带道具', treasure: '贵重物品', effort: '基础点数'};
	var economyIcons = ['tinymushroom', 'balmmushroom', 'prettyfeather', 'stardust', 'starpiece', 'cometshard', 'pearl', 'bigpearl', 'pearlstring',
		'healthfeather', 'musclefeather', 'resistfeather', 'geniusfeather', 'cleverfeather', 'swiftfeather'];
	function dex() { return Dex.mod ? Dex.mod('gen9fantasy') : Dex; }
	function idOf(name) { return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
	function fa(name) { return '<i class="fa fa-' + name + '" aria-hidden="true"></i> '; }
	function itemIcon(item) {
		if (economyIcons.indexOf(item.id) >= 0) return '<img class="rogue-loot-icon" src="sprites/fantasy-rogue/' + item.id + '.png" alt="" /> ';
		var frame = item.id.indexOf('expcandy') === 0 ? 'candy' : item.id === 'linkingcord' ? 'cord' :
			['potion', 'superpotion', 'hyperpotion', 'revive', 'fullheal', 'elixir', 'blackaugurite',
				'bigmushroom', 'nugget', 'bignugget', 'hpup', 'protein', 'iron', 'calcium', 'zinc', 'carbos'].indexOf(item.id) >= 0 ? item.id : '';
		if (frame) return '<span class="rogue-item rogue-item-' + frame + '" aria-hidden="true"></span> ';
		return typeof Dex.getItemIcon === 'function' ? '<span class="itemicon" aria-hidden="true" style="' +
			Dex.getItemIcon(item.icon || item.id) + '"></span> ' : fa('cube');
	}
	function button(name, value, label, disabled, icon) {
		return '<button class="button" name="' + name + '" value="' + escape(value || '') + '"' +
			(disabled ? ' disabled' : '') + '>' + (icon || '') + escape(label) + '</button> ';
	}
	function typeIcons(types) {
		return (types || []).map(function (type) {
			return Dex.getTypeIcon ? Dex.getTypeIcon(type) : escape(localName(type));
		}).join(' ');
	}
	function moveRow(id, pp) {
		var move = dex().moves.get(id);
		var maximum = move.pp;
		return '<div class="rogue-move-row"><strong class="rogue-move-name">' + escape(localName(move.name)) + '</strong>' +
			'<span class="rogue-move-icons">' + typeIcons([move.type || 'Normal']) + ' ' +
			(Dex.getCategoryIcon ? Dex.getCategoryIcon(move.category) : escape(localName(move.category || ''))) + '</span>' +
			'<span><small>威力</small>' + (move.basePower || '—') + '</span>' +
			'<span><small>命中率</small>' + (move.accuracy === true ? '—' : (move.accuracy || '—') + '%') + '</span>' +
			'<span><small>PP</small>' + (pp ? pp.pp + '/' + pp.maxpp : maximum || '—') + '</span>' +
			'<span class="rogue-move-desc">' + escape(localName(move.shortDesc || move.desc || '暂无招式简介')) + '</span></div>';
	}
	function itemDescription(item) {
		if (item.kind === 'treasure') return '仅商店兑换 · 每个 ' + item.sellPrice + ' 金币';
		if (item.kind === 'effort') return statNames[item.stat] + '基础点数 +' + item.amount + '（单项上限 252，总计 510）';
		if (item.kind === 'held' && dex().items) {
			var data = dex().items.get(item.id);
			return localName(data.shortDesc || data.desc || '');
		}
		if (item.kind === 'ball') return '战斗中投掷，占用一次行动';
		if (item.kind === 'heal') return '恢复 ' + item.amount + ' HP，不复活倒下成员';
		if (item.kind === 'revive') return '复活并恢复 ' + Math.round(item.amount * 100) + '% HP';
		if (item.kind === 'cure') return '解除存活伙伴的异常状态';
		if (item.kind === 'ether') return '当前各招式恢复 ' + item.amount + ' PP';
		if (item.kind === 'candy') return '增加 ' + item.amount + ' 经验';
		return '在队伍面板选择符合条件的进化';
	}
	function editable(run) {
		return ['choose', 'ready', 'rest', 'reward', 'event'].indexOf(run.phase) >= 0 &&
			!run.pendingCapture && !(run.pendingMoves || []).length;
	}
	function loot(reward, items, inline) {
		if (!reward) return '';
		var tag = inline ? 'span' : 'div';
		var html = '<' + tag + ' class="rogue-loot">';
		if (reward.money) html += '<span' + (reward.money < 0 ? ' class="rogue-cost"' : '') + '>' + fa('money') +
			'金币 <strong>' + (reward.money > 0 ? '+' : '−') + Math.abs(reward.money) + '</strong></span>';
		Object.keys(reward.items || {}).forEach(function (id) {
			var item = items.filter(function (entry) { return entry.id === id; })[0] || {id: id, name: id};
			html += '<span>' + itemIcon(item) + escape(localName(item.name)) + ' <strong>×' + reward.items[id] + '</strong></span>';
		});
		if (reward.points) html += '<span class="rogue-growth-reward">' + fa('star') + '成长点 <strong>+' + reward.points + '</strong></span>';
		return html + '</' + tag + '>';
	}
	function wildLootSummary(entries, items) {
		var total = {};
		(entries || []).forEach(function (entry) {
			Object.keys(entry).forEach(function (id) { total[id] = (total[id] || 0) + entry[id]; });
		});
		return loot({items: total}, items, true);
	}
	function noticeText(text) {
		// Settlement text contains species/move names as separate phrases.
		return text.replace(/^(.+?) (获得|升到|进化为|学会了)/, function (all, name, verb) {
			return localName(name) + ' ' + verb;
		}).replace(/(进化为|学会了) (.+?)([！。])$/, function (all, verb, name, end) {
			return verb + ' ' + localName(name) + end;
		});
	}
	function clearCardHTML(card) {
		var snap = card.snapshot;
		var html = '<article class="rogue-clear-card"><header><span class="rogue-caption">第 200 层 · 通关纪念</span><h3>' + escape(card.name) +
			'的旅途</h3><p><b>' + escape(snap.spiritName || (snap.spirit ? snap.spirit : '无塔灵')) + '</b> · ' +
			escape(new Date(card.completedAt).toLocaleDateString()) + '</p></header><div class="rogue-clear-team">';
		snap.team.forEach(function (mon) {
			html += '<div class="rogue-clear-mon"><div class="rogue-clear-sprite" style="' + Dex.getTeambuilderSprite(mon.set) + '"></div>' +
				'<strong>' + escape(localName(mon.set.species)) + '</strong><span>Lv.' + mon.set.level + ' · ' + (mon.stars || 1) + ' 星</span></div>';
		});
		html += '</div><details><summary>查看队伍数值与本局效果</summary>';
		snap.team.forEach(function (mon) {
			html += '<section class="rogue-clear-details"><h4>' + escape(localName(mon.set.species)) + '</h4><p>' +
				escape(localName(mon.set.nature || '')) + ' · ' + escape(mon.set.gender || 'N') + ' · ' + escape(localName(mon.set.ability)) +
				' · 携带：' + escape(mon.set.item ? localName(dex().items.get(mon.set.item).name) : '无道具') +
				' · 亲密度 ' + mon.set.happiness + '</p><table><thead><tr><th>能力</th><th>个体值</th><th>努力值</th><th>最终数值</th></tr></thead><tbody>';
			Object.keys(statNames).forEach(function (stat) {
				html += '<tr><td>' + statNames[stat] + '</td><td>' + (mon.set.ivs ? mon.set.ivs[stat] : 31) + '</td><td>' +
					(mon.set.evs ? mon.set.evs[stat] : 0) + '</td><td><b>' + (mon.stats ? mon.stats[stat] : '—') + '</b></td></tr>';
			});
			html += '</tbody></table><p>通关时 HP ' + mon.hp + '/' + mon.maxhp + ' · ' + escape(mon.status || '状态正常') + '</p><p>' +
				mon.pp.map(function (slot) { return escape(localName(dex().moves.get(slot.id).name)) + ' ' + slot.pp + '/' + slot.maxpp; }).join(' / ') +
				'</p><p>太晶属性：' + escape(localName(mon.set.teraType || dex().species.get(mon.set.species).types[0])) + '</p></section>';
		});
		if (snap.spirit === 'hoopamischief' && snap.hazards) html += '<p>最终战斗场地：己方 ' +
			escape(localName(dex().moves.get(snap.hazards[0]).name)) + ' · 对方 ' + escape(localName(dex().moves.get(snap.hazards[1]).name)) +
			'。约战时按双方卡片的敌我方向合并，遵守层数上限。</p>';
		html += '<p>永久六维加成：' + Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + snap.boosts[stat]; }).join(' / ') + '</p>' +
			'<p>太晶化：' + (snap.teraUnlocked ? '已解锁' : '未解锁') + '</p><p>' + escape(snap.spiritText || '本局未开启塔灵。') + '</p>' +
			'<p>开局卡：' + escape(snap.cardName || '无（旧版冒险）') + '</p><p>' + escape(snap.cardText || '') + '</p>' +
			'<p>祝福：' + (snap.blessings.length ? snap.blessings.map(function (entry) { return escape(entry.text); }).join('；') : '未选择祝福') + '</p>' +
			'<p class="rogue-caption">约战前全队恢复 HP、PP 和异常状态；禁止背包道具与捕捉。仅相同塔灵互战。版本：' + escape(card.contentVersion) + '</p>';
		return html + '</details></article>';
	}
	this.FantasyRogueRoom = this.Room.extend({
		type: 'fantasyrogue', title: '幻想杯肉鸽', minWidth: 320, bestWidth: 960,
		events: {'change input[name=starter]': 'changeStarter', 'change input[name=useSpirit]': 'changeSpirit',
			'change select[name=testSpirit]': 'changeSpirit', 'change select[name=hpTarget]': 'changeHPTarget',
			'change select[name=target]': 'changeItemTarget', 'keydown .rogue-start-deck': 'cardKey',
			'keydown input[name=codexSearch]': 'codexSearchKey'},
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue');
			this.state = null;
			this.screen = 'home';
			this.codices = {};
			this.codexFilter = 'all'; this.codexPage = 0; this.codexQuery = '';
			this.pending = null;
			this.error = '';
			this.selectedStarters = [];
			this.starterBuilds = {};
			this.selectedRoute = null;
			this.selectedBlessing = null;
			this.openPartyOnLayout = true;
			this.listenTo(app, 'response:fantasyrogue', this.receiveState);
			this.listenTo(app, 'response:fantasyrogueaction', this.receiveAction);
			this.listenTo(app, 'response:fantasyroguecodex', this.receiveCodex);
			this.listenTo(app, 'init:socketopened', this.refresh);
			this.listenTo(app, 'init:socketclosed', this.disconnected);
			// Sent after the server confirms a login, even if the user ID did not change.
			this.listenTo(app, 'init:choosename', this.refresh);
			this.listenTo(app.user, 'change:userid', this.identityChanged);
			this.render();
		},
		join: function () { this.refresh(); },
		rejoin: function () { this.refresh(); },
		show: function () {
			var entering = !this.visible;
			this.visible = true;
			Room.prototype.show.apply(this, arguments);
			if (entering) this.refresh();
		},
		hide: function () { this.visible = false; Room.prototype.hide.apply(this, arguments); },
		preparePanel: function () {
			if (!this.openPartyOnLayout) return;
			this.openPartyOnLayout = false;
			var panel = app.rooms.fantasyrogueparty || app._addRoom('fantasyrogueparty', null, true);
			panel.render();
			app.updateSideRoom(panel.id);
		},
		openParty: function () {
			this.openPartyOnLayout = true;
			this.preparePanel();
			// preparePanel selects the side room before focusRoom checks it. Apply
			// the layout first so a recreated room is actually shown and gets a tab.
			app.updateLayout();
			app.focusRoom('fantasyrogueparty');
		},
		$: function (selector) {
			// One controller owns both rooms: never duplicate adventure state or inputs.
			var roots = this.$el;
			if (app.rooms.fantasyrogueparty) roots = roots.add(app.rooms.fantasyrogueparty.$el);
			return roots.find(selector);
		},
		leave: function () {
			clearTimeout(this.timer); this.stopListening();
			if (app.rooms.fantasyrogueparty) app.removeRoom('fantasyrogueparty');
		},
		joinRoom: function (id) { app.joinRoom(id); },
		identityChanged: function () {
			this.screen = 'home'; this.codices = {}; this.codexReplay = null; this.codexQuery = ''; this.codexPage = 0;
			this.evolutionPreview = null;
			this.starterBuilds = {};
			this.useSpirit = false; this.testSpirit = ''; this.hpTarget = null; this.spiritPopupRun = null;
			this.selectedStarters = []; this.selectedRoute = null; this.selectedBlessing = null;
			this.selectedMember = null; this.itemTarget = null; this.state = null; this.pending = null; this.error = ''; this.refresh();
		},
		disconnected: function () {
			this.evolutionPreview = null;
			clearTimeout(this.timer);
			this.pending = null;
			this.selectedRoute = null;
			this.selectedBlessing = null;
			this.error = '连接已断开。重新连接后将读取服务器存档。';
			this.render();
		},
		refresh: function () {
			if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyrogue');
			if (['guide', 'blessings', 'events'].indexOf(this.screen) >= 0) this.loadCodex(this.screen);
			this.render();
		},
		enterGame: function () {
			if (!this.state || !this.state.account) return;
			this.screen = 'game'; this.openPartyOnLayout = true;
			this.render(); app.updateLayout();
			this.maybeShowSpirit();
		},
		startMenu: function () { this.screen = 'home'; this.codexReplay = null; this.render(); this.scrollCodexTop(); },
		scrollCodexTop: function () { if (this.$el.scrollTop) this.$el.scrollTop(0); },
		openCodex: function (section) {
			if (['guide', 'blessings', 'events'].indexOf(section) < 0) return;
			this.screen = section; this.codexFilter = section === 'guide' ? 'items' : 'all';
			this.codexQuery = ''; this.codexPage = 0; this.codexReplay = null;
			this.loadCodex(section); this.render(); this.scrollCodexTop();
		},
		loadCodex: function (section) {
			if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyroguecodex ' + section);
		},
		receiveCodex: function (data) {
			if (!data || data.userid !== app.user.get('userid') || ['guide', 'blessings', 'events'].indexOf(data.section) < 0) return;
			var old = this.codices[data.section];
			if (old && old.revision > data.revision) return;
			this.codices[data.section] = data;
			if (this.screen === data.section) this.render();
		},
		filterCodex: function (filter) { this.codexFilter = filter; this.codexPage = 0; this.render(); },
		searchCodex: function () { this.codexQuery = this.$el.find('input[name=codexSearch]').val().trim(); this.codexPage = 0; this.render(); },
		codexSearchKey: function (event) { if (event.key === 'Enter') { event.preventDefault(); this.searchCodex(); } },
		pageCodex: function (page) { this.codexPage = Math.max(0, Number(page) || 0); this.render(); this.scrollCodexTop(); },
		readEvent: function (id) {
			var entry = ((this.codices.events || {}).entries || []).find(function (event) { return event.id === id; });
			if (!entry || !entry.unlocked || !entry.replay) return;
			this.codexReplay = entry.replay; this.codexReplayHistory = [entry.replay.start];
			this.render(); this.scrollCodexTop();
		},
		replayEventNext: function (key) {
			var replay = this.codexReplay, history = this.codexReplayHistory;
			if (!replay || !history || !replay.pages[history[history.length - 1]].options.some(function (option) { return option.next === key; })) return;
			history.push(key); this.render(); this.scrollCodexTop();
		},
		replayEventBack: function () {
			if (this.codexReplayHistory && this.codexReplayHistory.length > 1) this.codexReplayHistory.pop();
			this.render();
		},
		replayEventRestart: function () { if (this.codexReplay) this.codexReplayHistory = [this.codexReplay.start]; this.render(); },
		closeEventReplay: function () { this.codexReplay = null; this.render(); },
		maybeShowSpirit: function () {
			var run = this.state && this.state.run;
			if (this.screen === 'game' && run && run.phase === 'intro' && run.spirit &&
				(!run.story || run.story.stage === 'spiritEffect') && this.spiritPopupRun !== run.id) {
				this.spiritPopupRun = run.id; this.showSpirit();
			}
		},
		receiveState: function (state, storyOnly) {
			if (!state || state.userid !== app.user.get('userid')) return;
			if (state.protocolVersion !== 1) { this.error = '请刷新客户端以更新肉鸽页面。'; this.render(); return; }
			if (this.state && this.state.account && state.account && state.account.revision < this.state.account.revision) return;
			var previous = this.state && this.state.run;
			var incoming = state.run;
			if (incoming && (!previous || previous.id !== incoming.id)) this.openPartyOnLayout = true;
			if (!previous || !incoming || previous.id !== incoming.id || previous.floor !== incoming.floor ||
				previous.phase !== incoming.phase || this.state.account.revision !== state.account.revision) {
				this.selectedRoute = null;
				this.selectedBlessing = null;
			}
			var focusFloor = incoming && (!previous || previous.id !== incoming.id || previous.floor !== incoming.floor ||
				previous.recovery !== incoming.recovery ||
				JSON.stringify((previous.pendingMoves || [])[0]) !== JSON.stringify((incoming.pendingMoves || [])[0]) ||
				!!previous.pendingCapture !== !!incoming.pendingCapture);
			this.state = state;
			this.normalizeStarters();
			this.render(storyOnly === true);
			// Finish the last native battle animation before entering the saved ending.
			if (state.story && state.story.stage === 'ending' && previous && previous.roomid &&
				incoming && incoming.id === previous.id) {
				var finalBattle = app.rooms[previous.roomid];
				if (finalBattle && finalBattle.fantasyRogue && finalBattle.fantasyRogue.userid === state.userid) {
					finalBattle.fantasyRogueEnding = true;
					finalBattle.updateControls();
				}
			}
			if (app.curRoom === this && !storyOnly) app.updateLayout();
			if (focusFloor && this.$el.scrollTop) this.$el.scrollTop(0);
			this.maybeShowSpirit();
		},
		receiveAction: function (result) {
			if (result.userid !== app.user.get('userid') || !this.pending || result.id !== this.pending.id) return;
			var action = this.pending.action;
			var evolution = this.evolutionPreview;
			this.evolutionPreview = null;
			clearTimeout(this.timer);
			this.pending = null;
			this.error = result.ok ? '' : result.message;
			if (result.state) this.receiveState(result.state, action === 'storynext' || action === 'storyskip');
			else this.refresh();
			if (result.ok && action === 'battle' && result.state.run && result.state.run.roomid) app.joinRoom(result.state.run.roomid);
			if (result.ok && action === 'evolve' && evolution && result.state && result.state.run &&
				result.state.run.id === evolution.runid) {
				var evolved = result.state.run.team.find(function (mon) { return mon.id === evolution.member; });
				if (evolved && evolved.set.species !== evolution.before.species) {
					app.addPopup(globals.RogueEvolutionAnimationPopup, {
						room: this, member: evolved.id, before: evolution.before, after: evolved.set
					});
				}
			}
		},
		submit: function (action, details) {
			if (this.pending || !this.state || !this.state.account) return;
			if (!app.socket || app.socket.readyState !== 1) { this.disconnected(); return; }
			var command = Object.assign({
				id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
				revision: this.state.account.revision, action: action
			}, details || {});
			this.pending = command;
			this.evolutionPreview = null;
			if (action === 'evolve' && this.state.run) {
				var mon = this.state.run.team.find(function (member) { return member.id === command.member; });
				if (mon) this.evolutionPreview = {runid: this.state.run.id, member: mon.id, before: Object.assign({}, mon.set)};
			}
			this.error = '';
			this.sendPending();
		},
		sendPending: function () {
			if (!this.pending) return;
			var story = this.pending.action === 'storynext' || this.pending.action === 'storyskip';
			app.send('/fantasyrogue ' + (story ? 'story ' : 'action ') + JSON.stringify(this.pending));
			clearTimeout(this.timer);
			var self = this;
			this.timer = setTimeout(function () {
				self.error = '尚未收到操作结果，可刷新存档或重发同一请求。';
				self.refresh();
			}, 10000);
			this.render(story);
		},
		act: function (value) {
			var parts = value.split(':');
			this.submit(parts[0], {value: parts[1]});
		},
		normalizeStarters: function () {
			var state = this.state;
			if (!state || !state.account || (state.run && state.run.phase !== 'complete')) {
				this.selectedStarters = []; this.starterBuilds = {}; return;
			}
			var available = (state.starters || []).filter(function (starter) { return starter.available; }).map(function (starter) { return starter.id; });
			this.selectedStarters = this.selectedStarters.filter(function (id) { return available.indexOf(id) >= 0; }).slice(0, state.account.slots);
			var self = this;
			Object.keys(this.starterBuilds).forEach(function (id) {
				if (self.selectedStarters.indexOf(id) < 0) delete self.starterBuilds[id];
			});
		},
		changeStarter: function (event) {
			if (!this.state || !this.state.account || this.pending) return;
			this.normalizeStarters();
			var input = event.currentTarget;
			var index = this.selectedStarters.indexOf(input.value);
			var available = this.state.starters.some(function (starter) { return starter.id === input.value && starter.available; });
			var added = input.checked && available && index < 0 && this.selectedStarters.length < this.state.account.slots;
			if (added) {
				this.selectedStarters.push(input.value);
				var starter = this.state.starters.find(function (entry) { return entry.id === input.value; });
				this.starterBuilds[input.value] = {nature: 'random', gender: 'random', ability: 'random',
					ivs: Object.assign({}, starterTraits(starter).ivs.max)};
			}
			if (!input.checked && index >= 0) this.selectedStarters.splice(index, 1);
			var chosen = this.selectedStarters, full = chosen.length >= this.state.account.slots;
			this.$('input[name=starter]').each(function () {
				this.checked = chosen.indexOf(this.value) >= 0;
				this.disabled = full && !this.checked;
				this.parentElement.classList.toggle('is-disabled', this.disabled);
			});
			this.$('.rogue-starter-count').text('已选择 ' + chosen.length + ' / ' + this.state.account.slots + ' 只');
			this.$('button[name=confirmStarters]').prop('disabled', !chosen.length || !this.state.configured);
			this.render();
		},
		confirmStarters: function () {
			this.normalizeStarters();
			if (this.pending || !this.state || !this.state.configured || !this.selectedStarters.length) return;
			app.addPopup(globals.RogueStarterPopup, {room: this, starters: this.selectedStarters.slice()});
		},
		chooseRoute: function (id) {
			var run = this.state && this.state.run;
			if (this.pending || !run || run.phase !== 'choose' || run.pendingCapture || (run.pendingMoves || []).length ||
				!app.socket || app.socket.readyState !== 1 || !(run.choices || []).some(function (node) { return node.id === id; })) return;
			if (this.selectedRoute === id) { this.submit('select', {value: id}); return; }
			this.selectedRoute = id;
			this.$('.rogue-route').each(function () {
				var selected = this.value === id;
				this.classList.toggle('is-selected', selected);
				this.setAttribute('aria-pressed', String(selected));
				this.querySelector('.rogue-route-hint').textContent = selected ? '已选中 · 再点一次进入' : '点击选中';
			});
		},
		startAdventure: function () {
			this.normalizeStarters();
			if (!this.selectedStarters.length) return;
			var details = {starters: this.selectedStarters.slice(), starterBuilds: this.starterBuilds, useSpirit: !!this.useSpirit};
			if (this.useSpirit && this.state.localSpirits && this.testSpirit) details.testSpirit = this.testSpirit;
			this.submit('start', details);
		},
		storyNext: function () { if (this.state.story) this.submit('storynext', {value: this.state.story.key}); },
		storySkip: function () { if (this.state.story) this.submit('storyskip', {value: this.state.story.key}); },
		cycleCard: function (direction) {
			if (this.pending || !this.state.story || this.state.story.stage !== 'cards') return;
			var count = this.state.story.cards.length;
			this.startCardIndex = ((this.startCardIndex || 0) + Number(direction) + count) % count;
			this.render();
			this.$('.rogue-start-deck').trigger('focus');
		},
		cardKey: function (event) {
			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				event.preventDefault(); this.cycleCard(event.key === 'ArrowLeft' ? '-1' : '1');
			}
		},
		pickStartCard: function (id) { this.submit('startcard', {value: id}); },
		updateStory: function (story, busy) {
			// Keep the scene, dialogue button and scroll position alive while saving
			// and turning pages. Replacing the room made every click jump vertically.
			var section = this.$el[0] && this.$el[0].querySelector('.rogue-story');
			if (!section || !story || story.stage === 'cards' || this.error || this.storyHadError) return false;
			var signature = this.storySignature(story);
			if (section.dataset.story !== signature) return false;
			var spirit = this.state.run && this.state.run.spirit;
			section.setAttribute('aria-label', story.title);
			section.querySelector('.rogue-story-scene').className = 'rogue-story-scene scene-' + story.scene;
			section.querySelector('.rogue-story-chapter').textContent = (story.stage === 'ending' ? '终章' : story.stage === 'gymgift' ? '途中' : '序章') + ' / ' + story.title;
			var dialogue = section.querySelector('.rogue-story-dialogue');
			dialogue.disabled = busy;
			dialogue.setAttribute('aria-busy', String(busy));
			dialogue.querySelector('strong').textContent = story.speaker || (story.scene === 'spirit' && spirit ? spirit.name : story.title);
			dialogue.querySelector('span').textContent = story.text;
			dialogue.querySelector('small').textContent = '轻点继续 ▷ · ' + (story.index + 1) + '/' + story.total;
			var skip = section.querySelector('button[name=storySkip]');
			if (skip) skip.disabled = busy;
			return true;
		},
		storySignature: function (story) {
			return [this.state.userid, this.state.run && this.state.run.id || '', story.stage, !!story.canSkip].join(':');
		},
		renderStory: function (story, busy) {
			if (story.stage === 'cards') {
				var index = this.startCardIndex || 0, card = story.cards[index];
				var html = '<section class="rogue-card-choice"><span class="rogue-caption">黑袍人的赠礼</span><h3>你喜欢什么属性的宝可梦？</h3>' +
					'<p>左右切换卡片，点击亮边的卡片收入背包。</p><div class="rogue-start-deck" tabindex="0" aria-label="用左右方向键挑选开局卡片">';
				for (var i = 3; i > 0; i--) html += '<div class="rogue-card-back" style="--stack:' + i + '" aria-hidden="true">◇</div>';
				html += '<button name="pickStartCard" value="' + card.id + '" class="rogue-start-card"' + (busy ? ' disabled' : '') + '>' +
					'<span class="rogue-card-symbol">' + (card.type ? typeIcons([card.type]) : '✧') + '</span><strong>' + escape(card.name) +
					'</strong><span>' + escape(card.text) + '</span><small>已选中 · 轻点收下</small></button></div><div class="rogue-card-navigation">' +
					button('cycleCard', '-1', '← 上一张', busy) + '<span>' + (index + 1) + ' / 19</span>' + button('cycleCard', '1', '下一张 →', busy) + '</div></section>';
				return html;
			}
			var spirit = this.state.run && this.state.run.spirit;
			var art = story.scene === 'spirit' && spirit ? '<div class="rogue-story-spirit" style="' + Dex.getTeambuilderSprite({species: spirit.species}) + '"></div>' : '';
			return '<section class="rogue-story" data-story="' + escape(this.storySignature(story)) + '" aria-label="' + escape(story.title) + '"><div class="rogue-story-scene scene-' + story.scene + '">' +
				'<span class="rogue-story-chapter">' + (story.stage === 'ending' ? '终章' : story.stage === 'gymgift' ? '途中' : '序章') + ' / ' + escape(story.title) + '</span>' +
				'<div class="rogue-story-window"></div><div class="rogue-story-letter">求救信</div><div class="rogue-story-figure"></div>' +
				'<div class="rogue-story-portal"></div>' + art + '</div><button name="storyNext" class="rogue-story-dialogue"' + (busy ? ' disabled' : '') + '>' +
				'<strong>' + escape(story.speaker || (story.scene === 'spirit' && spirit ? spirit.name : story.title)) + '</strong>' +
				'<span>' + escape(story.text) + '</span><small>轻点继续 ▷ · ' + (story.index + 1) + '/' + story.total +
				'</small></button><div class="rogue-story-actions">' + (story.canSkip ? button('storySkip', '', '跳过剧情', busy) :
				'<span class="rogue-caption">首次冒险 · 轻点文字继续，下次可跳过剧情</span>') + '</div></section>';
		},
		changeSpirit: function () {
			this.useSpirit = this.$('input[name=useSpirit]').prop('checked');
			this.testSpirit = this.$('select[name=testSpirit]').val() || '';
			this.render();
		},
		showSpirit: function () {
			if (this.state && this.state.run && this.state.run.spirit) app.addPopup(globals.RogueSpiritPopup, {room: this});
		},
		trimParty: function (id) { this.submit('trimparty', {member: id}); },
		changeHPTarget: function () { this.hpTarget = this.$('select[name=hpTarget]').val(); this.render(); },
		buyWithHP: function (id) {
			var buyer = this.state.run.team.find(function (mon) { return mon.id === this.hpTarget; }, this) || this.state.run.team[0];
			this.submit('buyhp', {value: id, member: buyer.id});
		},
		boxMember: function (id) {
			var target = this.$('select[name=boxTarget]').val() || '';
			this.submit('box', {member: id, value: target});
		},
		mergeMember: function (id) { app.addPopup(globals.RogueMergePopup, {room: this, member: id}); },
		useItem: function (id) {
			var mon = this.selectedPokemon();
			if (!mon) return;
			this.submit('use', {value: id, member: mon.id});
		},
		changeItemTarget: function (event) { this.selectMember(event.currentTarget.value); },
		learnMove: function (slot) {
			var move = this.state.run.pendingMoves[0];
			if (move) this.submit('learn', {value: slot, member: move.member});
		},
		replaceMember: function (id) { this.submit('replace', {value: id}); },
		evolveMember: function (value) {
			var parts = value.split('|');
			if (!this.pending && this.state.run && editable(this.state.run) && !this.state.run.healingLocked) {
				app.addPopup(globals.RogueEvolutionPopup, {room: this, member: parts[0], target: parts[1]});
			}
		},
		showEvolutionChoices: function (member) {
			if (!this.pending && this.state.run && editable(this.state.run) && !this.state.run.healingLocked) {
				app.addPopup(globals.RogueEvolutionPopup, {room: this, member: member});
			}
		},
		askAbandon: function () { this.abandonPrompt = true; this.render(); },
		cancelAbandon: function () { this.abandonPrompt = false; this.render(); },
		abandon: function () { this.abandonPrompt = false; this.submit('abandon'); },
		selectedPokemon: function () {
			var team = this.state.run.team;
			return team.filter(function (mon) { return mon.id === this.selectedMember; }, this)[0] || team[0];
		},
		selectMember: function (id) { this.selectedMember = id; this.itemTarget = id; this.error = ''; this.render(); },
		editSection: function (value) {
			var parts = value.split(':');
			this.editPanel = parts[0];
			if (parts[0] === 'moves') this.moveSlot = Number(parts[1] || 0);
			this.render();
		},
		openHeldItems: function () {
			this.editSection('items');
			this.$('.rogue-editor-options')[0].scrollIntoView({block: 'nearest'});
		},
		moveMember: function (direction) {
			var team = this.state.run.team;
			var mon = this.selectedPokemon();
			var index = team.indexOf(mon), next = index + Number(direction);
			if (next < 0 || next >= team.length) return;
			var order = team.map(function (member) { return member.id; });
			order[index] = order[next]; order[next] = mon.id;
			this.submit('order', {order: order});
		},
		moveSlotUp: function (slot) {
			var mon = this.selectedPokemon();
			var order = mon.set.moves.map(idOf);
			var index = Number(slot);
			if (index <= 0 || index >= order.length) return;
			var previous = order[index - 1]; order[index - 1] = order[index]; order[index] = previous;
			this.moveSlot = index - 1;
			this.submit('moves', {member: mon.id, order: order});
		},
		chooseMove: function (id) {
			this.submit('setmove', {member: this.selectedPokemon().id, slot: this.moveSlot || 0, value: id});
		},
		chooseAbility: function (id) { this.submit('ability', {member: this.selectedPokemon().id, value: id}); },
		equipItem: function (id) { this.submit('equip', {member: this.selectedPokemon().id, value: id}); },
		applyEVs: function () {
			var evs = {}, self = this;
			Object.keys(statNames).forEach(function (stat) { evs[stat] = Number(self.$('input[name=ev-' + stat + ']').val()); });
			this.submit('evs', {member: this.selectedPokemon().id, evs: evs});
		},
		blessingOption: function (slot) {
			var run = this.state && this.state.run;
			if (this.pending || !run || run.phase !== 'blessing' || !app.socket || app.socket.readyState !== 1) return null;
			var state = run.blessings;
			if (!state || !state.round || state.stage || (state.pending || []).length || !Number.isInteger(Number(slot))) return null;
			var option = state.round.options[Number(slot)];
			return option && !option.chosen ? option : null;
		},
		chooseBlessing: function (slot) {
			if (!this.blessingOption(slot)) return;
			slot = Number(slot);
			if (this.selectedBlessing === slot) { this.submit('blessing', {slot: slot}); return; }
			this.selectedBlessing = slot;
			this.$('.rogue-blessing-card').each(function () {
				var selected = Number(this.value) === slot;
				this.classList.toggle('is-selected', selected);
				this.setAttribute('aria-pressed', String(selected));
				if (!this.classList.contains('is-chosen')) {
					this.querySelector('.rogue-route-hint').textContent = selected ? '已选中 · 再点一次领取' : '点击选中';
				}
			});
		},
		refreshBlessing: function (slot) {
			var option = this.blessingOption(slot);
			if (!option || !option.refreshes) return;
			this.selectedBlessing = null;
			this.submit('blessingrefresh', {slot: Number(slot)});
		},
		chooseBlessingUpgrade: function (value) { this.submit('blessing', {value: value}); },
		chooseLongBlessingReward: function () { this.chooseBlessingReward(this.$('select[name=blessingRewardItem]').val()); },
		challengeShop: function () {
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'shopchallenge', title: '发起零元购挑战',
				text: '胜利可获得本店随机三种商品，各一件。无论胜负，战斗结束后本层商店都会关闭。确定现在挑战？'});
		},
		chooseBlessingReward: function (value) {
			var run = this.state.run, pending = run.blessings.pending[0];
			if (!pending) return;
			var replaced = run.team.filter(function (mon) { return mon.id === value; })[0];
			if (pending.kind === 'gift' && (value === 'release' || replaced)) {
				var departing = replaced || pending.pokemon;
				var bound = run.blessings.owned.filter(function (entry) { return entry.target === departing.id; });
				app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'blessingreward', title: '确认伙伴去向',
					details: {member: pending.id, value: value}, text: '确定放走' + localName(departing.set.species) +
					(replaced ? '，让新伙伴加入队伍' : '') + '？' + (bound.length ? '这只伙伴绑定了“' + bound.map(function (entry) { return entry.name; }).join('、') + '”，放走后无法找回。' : '')});
				return;
			}
			this.submit('blessingreward', {member: pending.id, value: value});
		},
		blessingMemberAction: function (value) {
			var parts = value.split(':');
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: parts[0], details: {member: parts.slice(1).join(':')},
				text: parts[0] === 'fantasize' ? '消耗 100 幻想碎片，将该伙伴转换为对应幻想形态？' :
					parts[0] === 'meltanevolve' ? '消耗 400 个美录坦糖果，进化为美录梅塔？' : '为这位圣剑士领取永久额外特性“锋锐”？'});
		},
		renderBlessingChoice: function (run, busy) {
			var state = run.blessings;
			if (!state) return '<p>正在读取祝福…</p>';
			var tierNames = {silver: '白银', gold: '黄金', prismatic: '棱彩', mixed: '银 · 金 · 彩'};
			var html = '<h3>塔中的祝福</h3>', reward = state.pending[0];
			if (reward) {
				html += '<h4>' + escape(reward.title) + '</h4>';
				if (reward.pokemon) {
					var mon = reward.pokemon;
					html += '<div class="rogue-blessing-gift"><span class="picon" style="' + Dex.getPokemonIcon(mon.set.species) + '"></span><strong>' +
					escape(localName(mon.set.species)) + '</strong> · Lv.' + mon.set.level + ' · ' + '★'.repeat(mon.stars || 1) + (mon.set.shiny ? ' · 闪光' : '') +
						'<p>' + escape(localName(mon.set.nature)) + ' · ' + escape(localName(mon.set.ability)) + ' · ' + escape(mon.set.gender || '无性别') + '</p><p>个体值：' +
						Object.keys(statNames).map(function (key) { return statNames[key] + ' ' + mon.set.ivs[key]; }).join(' / ') + '</p><p>能力值：' +
						Object.keys(statNames).map(function (key) { return statNames[key] + ' ' + ((mon.stats || {})[key] || (key === 'hp' ? mon.maxhp : '—')); }).join(' / ') + '</p><p>' +
						mon.set.moves.map(function (move) { return escape(localName(dex().moves.get(move).name)); }).join(' / ') + '</p></div>' +
						'<p class="rogue-caption">捕捉解锁已记录。选择新伙伴的去向：</p>';
					if (run.team.length < run.partyLimit) html += button('chooseBlessingReward', 'join', '加入队伍', busy);
					if (run.box && run.box.length < 30) html += button('chooseBlessingReward', 'box', '存入箱子', busy);
					run.team.forEach(function (member) { html += button('chooseBlessingReward', member.id, '替换 ' + localName(member.set.species), busy); });
					html += button('chooseBlessingReward', 'release', '放走新伙伴', busy);
				} else {
					html += '<p>请选择一项：</p><div class="rogue-blessing-rewards">';
					if (reward.options && reward.options.length > 16) {
						html += '<select name="blessingRewardItem" aria-label="选择奖励道具">' + reward.options.map(function (option) {
							return '<option value="' + escape(option.id) + '">' + escape(localName(option.name)) + '</option>';
						}).join('') + '</select> ' + button('chooseLongBlessingReward', '', '确认领取', busy);
					} else (reward.options || []).forEach(function (option) { html += button('chooseBlessingReward', option.id, localName(option.name), busy); });
					html += '</div>';
				}
			} else if (state.stage) {
				html += '<p>' + (state.stage.kind === 'direction' ? '选择此后的属性进化方向' : '选择本次属性强化') + '</p><div class="rogue-blessing-rewards">';
				state.stage.options.forEach(function (option) { html += button('chooseBlessingUpgrade', option.id, option.name, busy); });
				html += '</div>';
			} else if (state.round) {
				var round = state.round;
				var selectedSlot = this.selectedBlessing;
				html += '<div class="rogue-blessing-intro"><span class="rogue-blessing-tier-badge rogue-blessing-' + round.tier + '">' +
					tierNames[round.tier] + (round.tier === 'mixed' ? '' : '阶') + '</span><span>还可选择 <strong>' + round.remaining + '</strong> 项</span>' +
					'<span class="rogue-caption">点击卡片选中，再点一次领取</span></div>' +
					'<div class="rogue-blessing-options">';
				round.options.forEach(function (option, index) {
					var selected = selectedSlot === index && !option.chosen;
					var tier = option.tier || (round.tier === 'mixed' ? ['silver', 'gold', 'prismatic'][index] : round.tier);
					var levels = tier === 'silver' ? 0 : run.floor / (tier === 'gold' ? 10 : 5);
					html += '<article class="rogue-blessing-option rogue-blessing-' + tier + '"><button type="button" name="chooseBlessing" value="' + index +
						'" class="rogue-route rogue-blessing-card' + (option.chosen ? ' is-chosen' : '') + (selected ? ' is-selected' : '') +
						'" aria-pressed="' + selected + '"' + (busy || option.chosen ? ' disabled' : '') + '>' + cardSelectionMarker() +
						'<span class="rogue-blessing-quality">' + tierNames[tier] + '阶</span>' +
						'<span class="rogue-blessing-art" aria-hidden="true"><span class="rogue-blessing-emblem">' + fa(blessingIcon(option)) + '</span></span>' +
						'<strong class="rogue-blessing-title">' + escape(option.name) + '</strong>' +
						(option.type ? '<span class="rogue-blessing-type">' + escape(localName(option.type)) + '</span>' : '') +
						'<span class="rogue-blessing-description">' + escape(option.text) + '</span>' +
						'<span class="rogue-blessing-cost">' + (levels ? '对手等级 +' + levels : '对手不额外加级') + '</span>' +
						'<span class="rogue-route-hint">' + (option.chosen ? '已获得' : selected ? '已选中 · 再点一次领取' : '点击选中') + '</span></button>' +
						'<div class="rogue-blessing-refresh">' + button('refreshBlessing', String(index), '刷新 ' + option.refreshes + ' 次',
							busy || option.chosen || !option.refreshes, fa('refresh')) + '</div></article>';
				});
				html += '</div><p class="rogue-caption rogue-blessing-note">每张卡片独立刷新，品质保持不变。<br />' +
					'本轮每获得一个黄金祝福，对手额外 +' + (run.floor / 10) + ' 级；棱彩额外 +' + (run.floor / 5) + ' 级，允许超过 100 级。捕捉后移除这部分等级。</p>';
			}
			return html;
		},
		renderBlessings: function (run, busy) {
			var state = run.blessings;
			if (!state) return '';
			var html = '<section class="rogue-owned-blessings"><h3>' + fa('star') + '本局祝福</h3><p>幻想碎片 <strong>' + state.shards + '</strong> / 100';
			if (state.owned.some(function (b) { return b.family === 'meltan'; })) html += ' · 美录坦糖果 <strong>' + state.candy + '</strong> / 400';
			if (state.owned.some(function (b) { return b.family === 'swords'; })) html += ' · 圣剑使用 <strong>' + state.swordUses + '</strong> 次';
			if (state.owned.some(function (b) { return b.family === 'psychic'; })) html += ' · 灵能 <strong>' + Number((state.psychic || 0).toFixed(2)) + '%</strong>';
			html += '</p><p class="rogue-caption">祝福带来的对手等级加成：+' + state.levels + '。每 50 层的祝福和任务进度会随存档保存。</p>';
			if (!state.owned.length) html += '<p>通关第 50、100、150 层后选择祝福。</p>';
			state.owned.forEach(function (entry) {
				html += '<details class="rogue-owned-blessing rogue-blessing-' + entry.tier + '"><summary>' + escape(entry.name) +
					(entry.progress !== undefined ? ' · ' + entry.progress + (entry.family === 'starquest' ? ' 次击倒' : ' / 15 区域') : '') +
					(entry.completed ? ' · 已完成' : '') + '</summary><p>' + escape(entry.text) + '</p>' +
					(entry.targetName ? '<p>指定伙伴：' + escape(localName(entry.targetName)) + '</p>' : '') + '</details>';
			});
			if (state.evolution) {
				html += '<p><strong>属性进化：</strong>' + escape(localName(state.evolution.type)) + ' · 招式威力 +' + Math.round(state.evolution.power * 100) + '%</p>';
				var evo = state.evolution, extraNames = {accuracy: '非一击必杀招式必中', crit: '要害等级 +2', brn: '50% 烧伤', par: '50% 麻痹', frostbite: '50% 冻伤', atk: '50% 攻击 +1', spa: '50% 特攻 +1', spe: '50% 速度 +1'};
				html += '<ul class="rogue-caption">';
				Object.keys(evo.stats || {}).forEach(function (key) { html += '<li>' + statNames[key] + ' +' + Math.round(evo.stats[key] * 100) + '%</li>'; });
				Object.keys(evo.offense || {}).forEach(function (type) { html += '<li>对' + escape(localName(type)) + '属性打击面强化 ' + evo.offense[type] + ' 档</li>'; });
				Object.keys(evo.defense || {}).forEach(function (type) { html += '<li>对' + escape(localName(type)) + '属性抗性强化 ' + (-evo.defense[type]) + ' 档</li>'; });
				(evo.extras || []).forEach(function (id) { html += '<li>' + escape(extraNames[id] || id) + '</li>'; });
				html += '</ul>';
			}
			var locked = busy || !editable(run) || run.healingLocked;
			(state.learning || []).forEach(function (entry) {
				var mon = run.team.find(function (p) { return p.id === entry.member; });
				if (mon) html += button('learnBlessingMove', mon.id, localName(mon.set.species) + ' · 学习一个招式', locked || !entry.moves.length);
			});
			if (state.owned.some(function (b) { return b.family === 'fantasysix'; }) && run.team.length === 6 &&
				run.team.every(function (mon) { return /Fantasy/.test(mon.set.species); })) {
				html += '<p>每片幻想碎片可兑换 150 金币：' + ['1', '10', 'all'].map(function (count) {
					return button('exchangeShards', count, count === 'all' ? '兑换全部' : '兑换 ' + count + ' 片',
						locked || state.shards < (count === 'all' ? 1 : Number(count)));
				}).join(' ') + '</p>';
			}
			run.team.forEach(function (mon) {
				if (mon.fantasyForm && state.shards >= 100) html += button('blessingMemberAction', 'fantasize:' + mon.id, localName(mon.set.species) + ' · 幻想化', locked);
				if (idOf(mon.set.species) === 'meltan' && state.candy >= 400) html += button('blessingMemberAction', 'meltanevolve:' + mon.id, '美录坦 · 糖果进化', locked);
				var species = idOf(mon.set.species);
				if (['cobalion', 'terrakion', 'virizion'].indexOf(species) >= 0 && state.swordRewards.indexOf(species) < 0 &&
					state.swordUses >= (state.swordRewards.length + 1) * 15) html += button('blessingMemberAction', 'swordreward:' + mon.id, localName(mon.set.species) + ' · 领取锋锐', locked);
			});
			Object.keys(state.teraShards || {}).forEach(function (type) {
				html += '<details><summary>' + escape(localName(type)) + '太晶碎片：' + state.teraShards[type] + '</summary><p>消耗 50 片，为以下伙伴更改太晶属性：</p>';
				run.team.forEach(function (mon) {
					html += button('changeTera', mon.id + ':' + type, localName(mon.set.species), locked || !run.teraUnlocked ||
						state.teraShards[type] < 50 || mon.set.teraType === type);
				});
				html += '</details>';
			});
			return html + '</section>';
		},
		changeTera: function (value) {
			var parts = value.split(':');
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'settera', title: '更改太晶属性',
				text: '消耗 50 片' + localName(parts[1]) + '太晶碎片，为这位伙伴更改太晶属性？',
				details: {member: parts[0], value: parts[1]}});
		},
		learnBlessingMove: function (id) { app.addPopup(globals.RogueBlessingLearnPopup, {room: this, member: id}); },
		exchangeShards: function (value) { this.submit('exchangeshards', {value: value}); },
		chooseEvent: function (choice) {
			var event = this.state && this.state.run && this.state.run.event;
			if (event) this.submit('event', {member: event.key, value: choice});
		},
		watchEvent: function () {
			var event = this.state && this.state.run && this.state.run.event;
			if (event && event.stage === 'watch' && event.replay) app.addPopup(globals.RogueEventReplayPopup, {room: this, event: event});
		},
		renderEvent: function (run, busy) {
			var event = run.event;
			if (!event) return '';
			var html = '<article class="rogue-event"><h3>' + escape(event.title) + '</h3><div class="rogue-event-text">' +
				(event.paragraphs || []).map(function (line) { return '<p>' + escape(line) + '</p>'; }).join('') + '</div>';
			if (event.stage === 'choice' && event.teams) {
				html += '<div class="rogue-event-teams">' + event.teams.map(function (team, index) {
					return '<div><strong>' + (index ? '右边的队伍' : '左边的队伍') + '</strong>' + team.map(function (mon) {
						return '<p><span class="picon" style="' + Dex.getPokemonIcon(mon.species) + '"></span>' + escape(localName(mon.species)) + ' · Lv.' + Number(mon.level) + '</p>';
					}).join('') + '</div>';
				}).join('') + '</div>';
			}
			if (event.stage === 'watch') {
				html += '<p class="rogue-caption">两队由 AI 进行真实对战，观看结束后按实际胜负结算。旁观不消耗队伍状态或增益次数。</p>' +
					button('watchEvent', '', '观看对战', busy, fa('play'));
			} else if (event.stage === 'result') {
				var allFainted = !run.team.some(function (mon) { return mon.hp > 0; });
				html += button('act', 'continue', '整理完毕，继续前进', busy || allFainted);
				if (allFainted) html += '<p>请先在右侧背包中复活至少一名伙伴，再继续前进。</p>';
				if (run.canEmergency) html += button('act', 'emergency', '花费 ' + run.emergencyCost + ' 金币急救全队', busy || run.money < run.emergencyCost);
			} else if (event.stage === 'choice') {
				html += '<div class="rogue-event-options">' + event.options.map(function (option) {
					return '<button class="button rogue-event-option" name="chooseEvent" value="' + escape(option.id) + '"' +
						(busy || option.disabled ? ' disabled' : '') + '><strong>' + escape(option.name) + '</strong><small>' + escape(option.text) + '</small></button>';
				}).join('') + '</div>';
			}
			return html + '</article>';
		},
		renderFloor: function (run, busy) {
			var html = '<section class="rogue-floor" aria-label="本层操作">';
			if (run.recovery) {
				html += '<p class="rogue-recovery"><strong>' + (run.recovery === 'retreat' ? '已撤退' : '本场战败') +
					'</strong> · 伤害、PP、异常状态和道具消耗已保留。' + (run.phase === 'failed' ? '本层需重新连续挑战。' :
					'下一次仍挑战第 ' + (run.encounter + 1) + ' 场，对手恢复本场初始状态。') + '</p>';
			}
			if (run.node && run.node.noHealing) html += '<p class="rogue-caption">连续挑战：开战后禁止场外治疗和急救，全队倒下需重新挑战整层。</p>';
			if (run.lastReward && (run.lastReward.money || run.lastReward.points || Object.keys(run.lastReward.items || {}).length)) {
				html += '<div class="rogue-receipt"><strong>' + fa('check-circle') + (run.lastReward.money < 0 ? '已结算' : '已到账') + ' · 第 ' + run.lastReward.floor + ' 层' +
					(run.lastReward.encounter ? ' · 第 ' + run.lastReward.encounter + ' 场' : '') + '</strong>' +
					loot(run.lastReward, this.state.items) + '</div>';
			}
			if (run.pendingCapture) {
				html += '<h3>队伍已满 · 安置新伙伴</h3><p>' + (run.phase === 'intro' ? '塔灵赠送了 ' : '捕获了 ') + escape(localName(run.pendingCapture.set.species)) +
					' Lv.' + run.pendingCapture.set.level + (run.phase === 'intro' ? '。等级固定为 40。' : '。捕捉解锁已保存。') + '</p><p>';
				run.team.forEach(function (mon) { html += button('replaceMember', mon.id, '替换 ' + localName(mon.set.species), busy); });
				html += button('replaceMember', 'release', '放走新捕获成员', busy) + '</p>';
			}
			if ((run.pendingMoves || []).length) {
				var pending = run.pendingMoves[0];
				var learner = run.team.filter(function (mon) { return mon.id === pending.member; })[0];
				if (learner) {
					html += '<h3>学习招式 · ' + escape(localName(learner.set.species)) + '</h3>' +
						'<div class="rogue-new-move">' + moveRow(pending.move) + '</div><p>选择替换位置。替换下来的招式会保留在可更换列表中。</p>';
					learner.set.moves.forEach(function (move, i) {
						html += '<div class="rogue-choice-row">' + moveRow(move, learner.pp[i]) +
							button('learnMove', String(i), '替换此招式', busy) + '</div>';
					});
					html += '<p>' + button('learnMove', 'skip', '暂不装备，保留在可更换列表', busy) + '</p>';
				}
			}
			busy = busy || !!run.pendingCapture || !!(run.pendingMoves || []).length;
			if (run.phase === 'intro') {
				html += '<h3>本局塔灵 · ' + escape(run.spirit.name) + '</h3><p>' + escape(run.spirit.text) + '</p>';
				if (run.team.length > run.partyLimit) {
					html += '<p>请留下 ' + run.partyLimit + ' 位初始伙伴：</p>';
					run.team.forEach(function (mon) { html += button('trimParty', mon.id, '移除 ' + localName(mon.set.species), busy); });
				}
				html += '<p>' + button('act', 'spiritack', '接受塔灵，开始旅程', busy || run.team.length > run.partyLimit) + '</p>';
			} else if (run.phase === 'blessing') {
				html += this.renderBlessingChoice(run, busy);
			} else if (run.phase === 'event') {
				html += this.renderEvent(run, busy);
			} else if (run.phase === 'choose') {
				html += '<h3>选择本层路线</h3><span class="rogue-caption">点击卡片选中，再点一次进入</span><div class="rogue-routes">';
				(run.choices || []).forEach(function (node) {
					var selected = this.selectedRoute === node.id;
					html += '<button type="button" name="chooseRoute" value="' + escape(node.id) + '" class="rogue-route rogue-route-' + routeTone(node.kind) +
						(selected ? ' is-selected' : '') + '" aria-pressed="' + selected + '"' + (busy ? ' disabled' : '') + '>' + routeVortex() + routeEmblem(node.kind) +
						'<strong>' + escape(node.name) + '</strong><small>' + escape(kindNames[node.kind] || node.kind) +
						(node.biome ? ' · Lv.' + (node.biome.level + (run.blessings ? run.blessings.levels : 0)) +
							(run.blessings && run.blessings.levels ? '（含祝福 +' + run.blessings.levels + '）' : '') + ' · ' + (node.biome.tier * 20) + '～' +
							(node.biome.tier * 20 + 20) + ' 档宝可梦池' : '') +
						'</small><span class="rogue-caption">' + (node.fogged ? '路线与收益被迷雾遮蔽' : node.wildLoot ? '本层战利品 · 每场结束入包' : node.kind === 'event' ? '进入后揭晓事件，选择会影响收益与风险' : '整层完成奖励') + '</span>' +
						(node.wildLoot ? wildLootSummary(node.wildLoot, this.state.items) : loot(node.reward, this.state.items, true)) +
						'<span class="rogue-route-hint">' + (selected ? '已选中 · 再点一次进入' : '点击选中') + '</span></button>';
				}, this);
				html += '</div>';
				if (!(run.choices || []).length) html += '<p>本层内容等待配置，存档已保留。</p>';
			} else if (run.phase === 'ready') {
				if (run.event) html += this.renderEvent(run, busy) + '<p class="rogue-caption">可先调整队伍。战败或撤退后事件结束，保留损耗，不发胜利奖励。</p>';
				if (run.node && run.node.rocket && !run.node.rocket.cleared) html += '<p><strong>火箭队袭击！</strong>击败后开放商店，并获得 <b>' + run.node.rocket.reward + ' 金币</b>。</p>';
				if (run.node && run.node.bonusEncounter) html += '<p><strong>额外遭遇</strong> · 发现了区域名单之外的宝可梦！</p>';
				var allFainted = !run.team.some(function (mon) { return mon.hp > 0; });
				html += '<h3>本层战斗 · ' + (run.encounter + 1) + ' / ' + run.encounters + '</h3>' +
					button('act', 'battle', (run.recovery ? '继续第 ' : '进入第 ') + (run.encounter + 1) + ' / ' + run.encounters + ' 场战斗', busy || allFainted);
				if (allFainted) html += '<p>全队濒死，请先在背包中使用复活道具。</p>';
				if (run.canEmergency) {
					html += '<p>已无复活道具，可送往宝可梦中心急救：复活全队并恢复全部 HP、PP 和异常状态。</p>' +
						button('act', 'emergency', '花费 ' + run.emergencyCost + ' 金币急救全队', busy || run.money < run.emergencyCost, fa('medkit'));
					if (run.money < run.emergencyCost) html += '<p class="rogue-caption">金币不足，还需 ' + (run.emergencyCost - run.money) + ' 金币。</p>';
				}
			} else if (run.phase === 'battle') {
				html += '<h3>' + (run.retreating ? '正在保存撤退结果…' : '战斗进行中') + '</h3>' +
					button('joinRoom', run.roomid, '返回当前战斗', !run.roomid) + button('act', 'retreat', '撤退', busy || run.retreating);
			} else if (run.phase === 'failed') {
				html += '<h3>连续挑战失败</h3><p>本层不允许途中治疗。重新挑战会恢复入层时的队伍和资源，已保存的捕捉解锁保留。</p>' +
					button('act', 'retry', '免费重试整层', busy);
			} else if (run.phase === 'rest') {
				html += '<h3>宝可梦中心</h3><p>' + (run.spirit && run.spirit.id === 'yveltal' ? '塔灵交易：不恢复 HP；' : '无限次恢复存活伙伴的 HP、') +
					'全部已学招式 PP 和异常状态可恢复。倒下伙伴需要先使用活力碎片。</p>' +
					button('act', 'heal', '恢复存活伙伴', busy, fa('heart')) +
					button('act', 'continue', '补给完成，进入下一层', busy);
			} else if (run.phase === 'reward') {
				html += '<h3>领取本层奖励</h3>' + button('act', 'continue', '领取本层奖励并继续', busy, fa('gift'));
			} else if (run.phase === 'complete') {
				html += '<h3>已完成 200 层冒险！</h3>';
			}
			if (run.node && run.node.reward && ['ready', 'battle', 'settlement', 'reward', 'failed'].indexOf(run.phase) >= 0) {
				if (run.node.wildLoot) {
					html += '<div class="rogue-reward-preview"><strong>' + fa('gift') + '本场胜利／捕捉成功可获得</strong>' +
						loot({items: run.node.encounterLoot}, this.state.items) +
						'<small>贵重物品收入背包，经过商店时兑换金币。</small>' +
						(run.node.reward.points ? loot({points: run.node.reward.points}, this.state.items) : '') + '</div>';
				} else {
					html += '<div class="rogue-reward-preview"><strong>' + fa('gift') + '完成整层可获得</strong>' +
						loot(run.node.reward, this.state.items) + '</div>';
				}
			}
			return html + '</section>';
		},
		renderStats: function (mon, locked) {
			var evs = mon.set.evs || {}, total = 0;
			Object.keys(statNames).forEach(function (stat) { total += evs[stat] || 0; });
			var html = '<h4>能力与努力值</h4><p class="rogue-caption">击败对手获得努力值 · 已分配 ' + total + ' / 510 · 单项上限 252</p>' +
				'<table class="rogue-stats"><colgroup><col class="rogue-stat-label-col" /><col class="rogue-stat-base-col" /><col /><col /><col /></colgroup>' +
				'<thead><tr><th>能力</th><th>种族值</th><th>努力值</th><th>个体值</th><th>最终能力</th></tr></thead><tbody>';
			Object.keys(statNames).forEach(function (stat) {
				var base = (mon.baseStats || {})[stat] || 0;
				html += '<tr><th>' + statNames[stat] + '</th><td><span class="rogue-stat-number">' + base + '</span>' +
					'<span class="rogue-stat-track"><span class="rogue-stat-bar" style="width:' + Math.min(100, base / 255 * 100) + '%"></span></span></td><td>' +
					(mon.evRespec ? '<input type="number" class="textbox" aria-label="' + statNames[stat] + '努力值" name="ev-' + stat +
						'" min="0" max="252" step="1" value="' + (evs[stat] || 0) + '"' + (locked ? ' disabled' : '') + ' />' : evs[stat] || 0) +
					'</td><td>' + ((mon.set.ivs || {})[stat] === undefined ? '—' : mon.set.ivs[stat]) + '</td><td><strong>' +
					((mon.stats || {})[stat] || (stat === 'hp' ? mon.maxhp : '—')) + '</strong></td></tr>';
			});
			html += '</tbody></table>';
			if (mon.evRespec) html += '<p>事件允许重新分配一次：请保留总计 ' + mon.evRespec.total + ' 点。</p>' +
				button('applyEVs', '', '保存本次努力值分配', locked);
			else html += '<p class="rogue-caption">' + fa('lock') + '努力值平时不可修改；特殊事件开放后，可在这里重新分配。</p>';
			return html;
		},
		renderEditor: function (run, busy) {
			var mon = this.selectedPokemon();
			if (!mon) return '';
			this.selectedMember = mon.id;
			var locked = busy || !editable(run);
			var panel = this.editPanel || 'stats';
			var slot = Math.min(this.moveSlot || 0, Math.min((run.moveSlots || 4) - 1, mon.set.moves.length));
			this.moveSlot = slot;
			var species = dex().species ? dex().species.get(mon.set.species) : {};
			var html = '<section class="rogue-editor" aria-label="队伍编辑器"><h3>宝可梦队伍</h3><div class="rogue-team-tabs" role="tablist">';
			run.team.forEach(function (member) {
				html += '<button role="tab" aria-selected="' + (member.id === mon.id) + '" name="selectMember" value="' + escape(member.id) + '">' +
					'<span class="picon" style="' + Dex.getPokemonIcon(member.set.species) + '"></span><span>' + escape(localName(member.set.species)) +
					((member.evolutionDetails || []).some(function (evo) { return evo.ready; }) ? '<em class="rogue-evolution-mark" title="已满足进化条件">↑</em>' : '') +
					'</span><small>Lv.' + member.set.level + ' · ' + (member.hp ? 'HP ' + member.hp + '/' + member.maxhp : '已倒下') + '</small></button>';
			});
			html += '</div><div class="rogue-member-toolbar"><span><strong>' + escape(localName(mon.set.species)) + '</strong>' +
				((mon.evolutionDetails || []).some(function (evo) { return evo.ready; }) ?
					'<button class="button rogue-evolution-trigger" name="showEvolutionChoices" value="' + escape(mon.id) + '"' +
					(locked || run.healingLocked ? ' disabled' : '') + '>↑ 可进化</button>' : '') + '</span><span>' +
				button('moveMember', '-1', '前移', locked || run.team[0] === mon, fa('arrow-left')) +
				button('moveMember', '1', '后移', locked || run.team[run.team.length - 1] === mon, fa('arrow-right')) + '</span></div>';
			html += '<div class="rogue-member-sheet"><div class="rogue-identity">' +
				'<div class="rogue-sprite-frame"><div class="rogue-sprite" role="img" aria-label="' + escape(localName(mon.set.species)) + '" style="' +
				(typeof Dex.getTeambuilderSprite === 'function' ? Dex.getTeambuilderSprite(mon.set) : '') + '"></div></div>' +
				'<div>' + typeIcons(mon.types || species.types) + '</div>' + (mon.stars > 1 || run.spirit && run.spirit.id === 'zygarde' ? '<b class="rogue-stars">' + '★'.repeat(mon.stars || 1) + '</b>' : '') +
				'<strong>HP ' + mon.hp + ' / ' + mon.maxhp + '</strong>' +
				'<meter min="0" max="' + mon.maxhp + '" value="' + mon.hp + '" aria-label="生命值"></meter>' +
				'<small>' + (mon.hp ? (Object.keys(mon.statuses || {}).length ? Object.keys(mon.statuses).map(function (id) { return escape(localName(id)); }).join(' / ') : escape(localName(mon.status || '状态正常'))) : '已倒下') + '</small></div>';
			var exp = mon.experienceProgress;
			var ability = dex().abilities ? dex().abilities.get(mon.set.ability || '') : {name: mon.set.ability || ''};
			var item = this.state.items.filter(function (entry) { return entry.id === idOf(mon.set.item); })[0];
			var nature = localName(mon.set.nature || '—');
			var natureParts = nature.split(/\s*(?=[（(])/);
			html += '<div class="rogue-member-details"><div class="rogue-details-line"><span>等级<br /><b>' + mon.set.level +
				'</b></span><span>性别<br /><b>' + escape(mon.set.gender || '—') + '</b></span><span class="rogue-nature">性格<br /><b>' +
				escape(natureParts[0]) + '<span class="rogue-nature-effect">' + escape(natureParts.slice(1).join('')) + '</span></b></span></div>' +
				'<p class="rogue-exp">' + (mon.fixedLevel ? '驻时伙伴 · 等级固定 ' + mon.fixedLevel : exp ? '经验：' + (exp.needed ? exp.current + ' / ' + exp.needed + '（下一级）' : '已达 100 级') : '经验：—') + '</p>' +
				'<label>携带道具</label>' + button('editSection', 'items', item ? localName(item.name) : mon.set.item ? localName(mon.set.item) : '无道具', false, item ? itemIcon(item) : fa('cube')) +
				'<label>特性</label>' + button('editSection', 'abilities', localName(ability.name || '—'), false) + '</div>';
			html += '<div class="rogue-equipped-moves"><label>招式 · 点击更换</label>';
			for (var i = 0; i < (run.moveSlots || 4); i++) {
				var move = mon.set.moves[i] && dex().moves.get(mon.set.moves[i]);
				var pp = (mon.pp || [])[i];
				html += '<div' + (panel === 'moves' && slot === i ? ' class="selected"' : '') + '>' +
					button('editSection', 'moves:' + i, move ? localName(move.name) + (pp ? ' ' + pp.pp + '/' + pp.maxpp : '') : '空招式位', i > mon.set.moves.length) +
					(i > 0 && move ? button('moveSlotUp', String(i), '↑', locked) : '') + '</div>';
			}
			html += '</div><button class="rogue-stat-summary" name="editSection" value="stats"><strong>能力 / 努力值</strong>';
			Object.keys(statNames).forEach(function (stat) {
				html += '<span>' + statNames[stat] + '<b>' + ((mon.stats || {})[stat] || (stat === 'hp' ? mon.maxhp : '—')) +
					'</b><small>' + ((mon.set.evs || {})[stat] || 0) + '</small></span>';
			});
			html += '</button></div>';
			var growth = [];
			if (mon.bond !== undefined) growth.push('羁绊 ' + mon.bond + ' / 100');
			if (mon.insight) growth.push('生死领悟 ' + mon.insight.points + ' / 100 · 每次 +' + mon.insight.gain);
			if (mon.bonusHP) growth.push('永久 HP +' + mon.bonusHP);
			if ((mon.extraAbilities || []).length) growth.push('额外特性：' + mon.extraAbilities.map(function (id) { return localName(dex().abilities.get(id).name); }).join('、'));
			if (growth.length) html += '<p class="rogue-caption rogue-permanent-growth">' + escape(growth.join(' · ')) + '</p>';
			if (!editable(run)) html += '<p class="rogue-caption">当前可查看队伍，完成战斗及待处理结算后可调整。</p>';
			html += '<div class="rogue-editor-options">';
			if (panel === 'moves') {
				html += '<h4>可更换招式 · 第 ' + (slot + 1) + ' 个位置</h4><p class="rogue-caption">已学与替换下来的招式都会保留；更换保留剩余 PP。</p>';
				var learnedMoves = mon.moveMemory || mon.pp;
				learnedMoves.concat((mon.blessingPP || []).filter(function (move) {
					return (mon.blessingMoves || []).indexOf(move.id) >= 0 && !learnedMoves.some(function (known) { return known.id === move.id; });
				})).forEach(function (move) {
					var equipped = mon.set.moves.map(idOf).indexOf(move.id);
					html += '<div class="rogue-choice-row">' + moveRow(move.id, move) +
						button('chooseMove', move.id, equipped === slot ? '已装备' : equipped >= 0 ? '交换到此位置' : '装备此招式',
							locked || equipped === slot || (equipped >= 0 && slot === mon.set.moves.length)) + '</div>';
				});
			} else if (panel === 'abilities') {
				html += '<h4>可更换特性</h4><p class="rogue-caption">事件解锁的新特性会加入此列表。</p>';
				(mon.abilityPool || [{id: idOf(mon.set.ability)}]).forEach(function (entry) {
					var data = dex().abilities ? dex().abilities.get(entry.id) : {name: entry.id};
					var hidden = entry.hidden || species.abilities && idOf(species.abilities.H) === entry.id;
					html += '<div class="rogue-option"><strong>' + escape(localName(data.name)) +
						(hidden ? ' <span class="rogue-badge">隐藏特性</span>' : '') + '</strong><p>' +
						escape(localName(data.shortDesc || data.desc || '')) + '</p>' +
						button('chooseAbility', entry.id, entry.id === idOf(mon.set.ability) ? '当前特性' : '更换为此特性',
							locked || entry.id === idOf(mon.set.ability)) + '</div>';
				});
			} else if (panel === 'items') {
				html += '<h4>选择携带道具</h4><p class="rogue-caption">从背包取出，替换下来的道具回到背包。</p>' +
					button('equipItem', '', '卸下当前道具', locked || !mon.set.item);
				this.state.items.filter(function (entry) { return entry.kind === 'held' && run.bag[entry.id] > 0; }).forEach(function (entry) {
					html += '<div class="rogue-option"><strong>' + itemIcon(entry) + escape(localName(entry.name)) + ' ×' + run.bag[entry.id] +
						'</strong><p>' + escape(itemDescription(entry)) + '</p>' + button('equipItem', entry.id, '携带', locked) + '</div>';
				});
			} else {
				html += this.renderStats(mon, locked);
			}
			html += '</div><div class="rogue-evolution-details"><h4>进化条件' +
				(typeof mon.friendship === 'number' ? '<span class="rogue-caption">亲密度 ' + mon.friendship + ' / 255</span>' : '') + '</h4>';
			if (Array.isArray(mon.evolutionDetails)) {
				if (!mon.evolutionDetails.length) html += '<p>已无后续进化。</p>';
				mon.evolutionDetails.forEach(function (evo) {
					html += '<div class="rogue-evolution-branch"><strong>' + escape(localName(evo.species)) + '</strong><ul>';
					evo.requirements.forEach(function (condition) {
						html += '<li class="' + (condition.met ? 'met' : 'unmet') + '">' + (condition.met ? '✓ ' : '○ ') +
							escape(condition.text) + (condition.name ? ' ' + escape(localName(condition.name)) : '') + '</li>';
					});
					html += '</ul>' + button('evolveMember', mon.id + '|' + idOf(evo.species), '进化',
						locked || run.healingLocked || !evo.ready) + '</div>';
				});
			} else {
				html += '<p class="rogue-caption">进化条件等待服务器更新。</p>';
				(mon.evolutions || []).forEach(function (evo) {
					html += button('evolveMember', mon.id + '|' + idOf(evo.species), '进化为 ' + localName(evo.species),
						locked || run.healingLocked || !mon.hp || (evo.item && !run.bag[evo.item]));
				});
			}
			return html + '</div></section>';
		},
		renderBox: function (run, busy) {
			if (!run.box) return '';
			var locked = busy || !editable(run) || run.healingLocked;
			var owned = run.team.concat(run.box);
			var html = '<section class="rogue-box"><h3>' + fa('archive') + '宝可梦箱子 · ' + run.box.length + ' / 30</h3>' +
				'<p class="rogue-caption">调换不恢复 HP、PP 或状态。升星需选定一位保留成员及两位消耗成员，消耗成员的道具会返还。</p>' +
				'<label>取出时：<select name="boxTarget"><option value="">加入队伍空位</option>' + run.team.map(function (mon) {
					return '<option value="' + escape(mon.id) + '">交换 ' + escape(localName(mon.set.species)) + '</option>';
				}).join('') + '</select></label><div class="rogue-inventory">';
			owned.forEach(function (mon) {
				var inTeam = run.team.indexOf(mon) >= 0;
				var matches = owned.filter(function (other) { return idOf(mon.set.species) === idOf(other.set.species) && (mon.stars || 1) === (other.stars || 1); });
				html += '<div class="rogue-item-card"><strong><span class="picon" style="' + Dex.getPokemonIcon(mon.set.species) + '"></span>' +
					escape(localName(mon.set.species)) + ' ' + '★'.repeat(mon.stars || 1) + '</strong><p>' + (inTeam ? '队伍' : '箱子') +
					' · Lv.' + mon.set.level + ' · HP ' + mon.hp + '/' + mon.maxhp + '</p>' +
					'<div class="rogue-item-actions">' +
					button('boxMember', mon.id, inTeam ? '存入箱子' : '取出／交换', locked || inTeam && (run.team.length <= 1 || run.box.length >= 30)) +
					button('mergeMember', mon.id, '保留此伙伴并升星', locked || matches.length < 3 || mon.stars >= 4) + '</div></div>';
			});
			return html + '</div></section>';
		},
		renderBag: function (run, busy) {
			var usable = editable(run) && !busy && !run.healingLocked;
			var target = this.selectedPokemon();
			var itemTarget = target && target.id;
			var html = '<section class="rogue-bag"><h3>' + fa('suitcase') + '背包</h3>' +
				'<div class="rogue-wallet">' + fa('money') + '金币 <strong>' + run.money + '</strong></div>' +
				'<p><label>道具目标：<select name="target">' + run.team.map(function (mon) {
					return '<option value="' + escape(mon.id) + '"' + (mon.id === itemTarget ? ' selected' : '') + '>' +
						escape(localName(mon.set.species)) + ' · Lv.' + mon.set.level + ' · HP ' + mon.hp + '/' + mon.maxhp + '</option>';
				}).join('') + '</select></label></p><div class="rogue-inventory">';
			var held = this.state.items.filter(function (item) { return item.kind !== 'treasure' && run.bag[item.id] > 0; });
			held.forEach(function (item) {
				html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
					'</strong><b>×' + run.bag[item.id] + '</b></div><small>' + escape(item.category || itemKinds[item.kind]) + '</small><p>' + escape(itemDescription(item)) + '</p>';
				if (['ball', 'evolution', 'held'].indexOf(item.kind) < 0) {
					var reason = !target ? '请选择目标' : '';
					if (target) {
						if (item.kind === 'heal') reason = !target.hp ? '需先复活' : target.hp >= target.maxhp ? 'HP 已满' : '';
						if (item.kind === 'revive') reason = target.hp ? '仅能复活濒死伙伴' : '';
						if (item.kind === 'cure') reason = !target.hp ? '需先复活' : !target.status ? '无异常状态' : '';
						if (item.kind === 'ether') reason = !target.hp ? '需先复活' : !target.pp.some(function (slot) { return slot.pp < slot.maxpp; }) ? 'PP 已满' : '';
						if (item.kind === 'candy') reason = !target.hp ? '需先复活' : target.fixedLevel || target.set.level >= 100 ? '无法获得经验' : '';
						if (item.kind === 'effort') reason = target.set.evs[item.stat] >= 252 || Object.keys(statNames).reduce(function (sum, stat) {
							return sum + (target.set.evs[stat] || 0);
						}, 0) >= 510 ? '基础点数已达上限' : '';
					}
					html += button('useItem', item.id, reason || '使用', !usable || !!reason);
				}
				if (item.kind === 'held') html += button('openHeldItems', '', '在队伍中装备', !run.team.length);
				html += '</div>';
			});
			if (!held.length) html += '<p class="rogue-caption">暂无物品</p>';
			html += '</div>';
			var treasures = this.state.items.filter(function (item) { return item.kind === 'treasure' && run.bag[item.id] > 0; });
			if (treasures.length) {
				html += '<div class="rogue-treasures"><h4>' + fa('diamond') + '贵重物品 <small>到商店兑换金币</small></h4><div class="rogue-inventory">';
				treasures.forEach(function (item) {
					html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(item.name) +
						'</strong><b>×' + run.bag[item.id] + '</b></div><p>每个 ' + item.sellPrice + ' 金币 · 合计 <b>' +
						(run.bag[item.id] * item.sellPrice) + '</b></p></div>';
				});
				html += '</div></div>';
			}
			return html + '</section>';
		},
		renderShop: function (run, busy) {
			if (run.phase !== 'rest') return '';
			var sections = this.shopSections || (this.shopSections = {});
			this.$('.rogue-shop details[data-shop-group]').each(function () {
				sections[this.getAttribute('data-shop-group')] = this.open;
			});
			var usable = editable(run) && !busy && !run.healingLocked;
			var treasures = this.state.items.filter(function (item) { return item.kind === 'treasure' && run.bag[item.id] > 0; });
			var total = treasures.reduce(function (sum, item) { return sum + run.bag[item.id] * item.sellPrice; }, 0);
			var html = '<section class="rogue-shop rogue-floor" aria-label="商店"><h3>' + fa('shopping-cart') +
				'宝可梦中心商店</h3><span class="rogue-shop-balance">金币 <b>' + run.money + '</b></span>' +
				'<div class="rogue-exchange"><strong>' + fa('diamond') + '战利品兑换</strong> ' +
				(total ? '可兑换 <b>' + total + '</b> 金币 ' + button('act', 'sell:all', '全部兑换', !usable) : '<span class="rogue-caption">暂时没有贵重物品</span>');
			if (treasures.length) {
				html += '<details data-shop-group="exchange"' + (sections.exchange ? ' open' : '') +
					'><summary>查看／按种类兑换</summary><div class="rogue-inventory">';
				treasures.forEach(function (item) {
					html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(item.name) +
						'</strong><b>×' + run.bag[item.id] + '</b></div><p>单价 ' + item.sellPrice + ' 金币</p>' +
						button('act', 'sell:' + item.id, '兑换 +' + (run.bag[item.id] * item.sellPrice), !usable) + '</div>';
				});
				html += '</div></details>';
			}
			html += '</div>';
			var hpBuyer = run.team.find(function (mon) { return mon.id === this.hpTarget; }, this) || run.team[0];
			if (run.blessings && run.blessings.owned.some(function (entry) { return entry.family === 'shopraid'; }) && !run.node.shopChallenge) {
				html += '<p class="rogue-shop-challenge">' + button('challengeShop', '', '零元购 · 挑战店主', !usable || !run.team.some(function (mon) { return mon.hp > 0; }), fa('flag')) +
					'<span class="rogue-caption"> 胜利获得三种商品；无论胜负，本店随后关闭。</span></p>';
			}
			var hpRemaining = run.spirit && run.spirit.id === 'yveltal' ? 3 - (run.node.hpPurchases || 0) : 0;
			if (run.spirit && run.spirit.id === 'yveltal') html += '<p class="rogue-hp-shop">血量支付：本店剩余 <b>' + hpRemaining + ' / 3</b> 件 · <select name="hpTarget">' +
				run.team.map(function (mon) { return '<option value="' + escape(mon.id) + '"' + (mon === hpBuyer ? ' selected' : '') + '>' +
					escape(localName(mon.set.species)) + ' HP ' + mon.hp + '/' + mon.maxhp + '</option>'; }).join('') + '</select>（至少保留 1 HP）</p>';
			var stock = this.state.items.filter(function (item) {
				return item.kind !== 'treasure' && (item.kind !== 'candy' || typeof item.shopFloor === 'number') && item.shopFloor !== false && (item.shopFloor || 1) <= run.floor &&
					(!this.state.shopItems || this.state.shopItems.indexOf(item.id) >= 0);
			}, this);
			var groups = [{name: '精灵球与补给', kinds: ['ball', 'heal', 'revive', 'cure', 'ether']},
				{name: '基础点数训练', kinds: ['effort']}, {name: '进化与携带道具', kinds: ['evolution', 'held']}, {name: '塔灵特供 · 经验糖果', kinds: ['candy']}];
			groups.forEach(function (group, index) {
				var entries = stock.filter(function (item) { return group.kinds.indexOf(item.kind) >= 0; });
				if (!entries.length) return;
				html += '<details class="rogue-shop-group" data-shop-group="' + index + '"' +
					(sections[index] === undefined ? (index === 0 ? ' open' : '') : sections[index] ? ' open' : '') +
					'><summary>' + group.name + ' · ' + entries.length +
					' 种</summary><div class="rogue-inventory">';
				entries.forEach(function (item) {
					html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
						'</strong></div><p>' + escape(itemDescription(item)) + '</p><p>' + fa('money') + '<b>' + item.price + '</b> 金币 · 持有 ' +
						(run.bag[item.id] || 0) + '</p><div class="rogue-item-actions">' +
						button('act', 'buy:' + item.id, '金币购买', !usable || run.money < item.price);
					if (run.spirit && run.spirit.id === 'yveltal') {
						var hpCost = Math.ceil(hpBuyer.maxhp * Math.min(.8, Math.max(.1, Math.ceil(item.price / 250) * .05)));
						html += button('buyWithHP', item.id, '支付 ' + hpCost + ' HP', !usable || hpRemaining <= 0 || hpBuyer.hp <= hpCost);
					}
					html += '</div></div>';
				});
				html += '</div></details>';
			});
			var later = this.state.items.filter(function (item) { return typeof item.shopFloor === 'number' && item.shopFloor > run.floor; });
			if (later.length) {
				var next = Math.min.apply(null, later.map(function (item) { return item.shopFloor; }));
				html += '<p class="rogue-caption">第 ' + next + ' 层解锁：' + later.filter(function (item) { return item.shopFloor === next; })
					.map(function (item) { return escape(localName(item.name)); }).join('、') + '</p>';
			}
			return html + '</section>';
		},
		updateParty: function () {
			var panel = app.rooms && app.rooms.fantasyrogueparty;
			if (panel) panel.render();
		},
		renderParty: function () {
			var state = this.state;
			if (!state || !state.account) return '<p>请先在左侧打开幻想杯肉鸽，读取冒险存档。</p>';
			var run = state.run, busy = !!this.pending || !app.socket || app.socket.readyState !== 1;
			var html = '<h2>队伍及背包</h2>';
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (this.pending) html += '<p role="status">正在保存操作…</p>';
			if (run) {
				if (run.eventBuff && run.eventBuff.battles > 0) html += '<div class="rogue-keepsake"><strong>' + fa('leaf') + '奇异活力 · 剩余 ' +
					Number(run.eventBuff.battles) + ' 场</strong><p>全队造成伤害 +20%，受到伤害 −10%；后来加入的伙伴同样生效。每次开战消耗一场，旁观不消耗。</p></div>';
				if (run.startCard) html += '<div class="rogue-keepsake"><strong>' + fa('clone') + escape(run.startCard.name) +
					'</strong><p>' + escape(run.startCard.text) + '</p></div>';
				html += '<p class="rogue-boosts">本局永久加成：' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + run.boosts[stat]; }).join(' / ') + '</p>' +
					'<p class="rogue-tera">' + fa(run.teraUnlocked ? 'diamond' : 'lock') + '太晶化：' +
					(run.teraUnlocked ? '本局已解锁，每场战斗限用一次。' : '未解锁，可通过预定祝福或第 100 层馆主赠礼解锁。') + '</p>' +
					'<p class="rogue-caption">超进化：' + (run.megaUnlocked ? '已解锁' : '未解锁') + ' · 超巨进化：' + (run.gmegaUnlocked ? '已解锁' : '未解锁') + ' · Z 招式：' + (run.zUnlocked ? '已解锁' : '未解锁') +
					'。普通超级石与 Z 纯晶需先解锁系统，再携带使用。</p>' +
					this.renderEditor(run, busy) + this.renderBox(run, busy) + this.renderBag(run, busy) + this.renderBlessings(run, busy);
				if (run.notices && run.notices.length) html += '<details class="rogue-notices"><summary>本次战斗的经验与成长明细</summary><ul>' +
					run.notices.map(function (notice) { return '<li>' + escape(noticeText(notice)) + '</li>'; }).join('') + '</ul></details>';
			} else html += '<p class="rogue-caption">开始冒险后，在这里调整队伍、使用道具。</p>';
			return html + this.renderGrowth(state.account, run, busy);
		},
		renderAbandon: function (run, busy) {
			if (!run || run.phase === 'complete' || run.phase === 'battle') return '';
			return '<footer class="rogue-abandon" aria-label="结束本局冒险"><p class="rogue-abandon-note">' +
				(this.abandonPrompt ? '确认结束这次冒险？本局队伍和物品将被清除，永久成长及解锁会保留。' : '放弃将结束本次冒险，永久成长及解锁会保留。') +
				'</p><div class="rogue-abandon-actions">' + (this.abandonPrompt ? button('cancelAbandon', '', '继续冒险') +
				button('abandon', '', '确认放弃', busy) : button('askAbandon', '', '放弃本局', busy)) + '</div></footer>';
		},
		renderGrowth: function (account, run, busy) {
			var ongoing = run && run.phase !== 'complete';
			var html = '<h3>' + fa('star') + '局外成长 · 余额 ' + account.points + ' 点</h3><p>每战胜一次 Boss 获得 1 点。购买后从下一次冒险生效。</p>';
			if (ongoing) {
				html += '<p class="infobox">' + fa('lock') + '当前冒险进行中，结束或放弃本局后开放加点和初始栏位购买。</p>';
			} else {
				html += '<div class="rogue-upgrades">';
				Object.keys(statNames).forEach(function (stat) {
					html += '<p>' + statNames[stat] + ' +' + account.boosts[stat] + ' / 10 ' +
						button('act', 'upgrade:' + stat, '花费 1 点提升', busy || !account.points || account.boosts[stat] >= 10) + '</p>';
				});
				var slotCost = account.slotCost === undefined ? account.slots * 20 : account.slotCost;
				html += '</div><p>初始栏位 ' + account.slots + ' / 6 ' + (account.slots >= 6 ? '<strong>已扩展至上限</strong>' :
					button('act', 'upgrade:slot', '花费 ' + slotCost + ' 点扩展', busy || account.points < slotCost)) +
					'</p><p class="rogue-caption">每次扩展费用增加 20 点：20 / 40 / 60 / 80 / 100 点。</p>';
			}
			return html;
		},
		renderStartMenu: function () {
			var state = this.state, run = state && state.run;
			var hint = run && run.phase !== 'complete' ? '继续存档 · 第 ' + run.floor + ' 层' : '选择伙伴，开启一段新的旅途';
			return '<section class="rogue-start-menu" aria-label="幻想杯肉鸽开始界面">' +
				'<div class="rogue-start-heading"><span class="rogue-caption">一座塔，无数种可能</span><h2>你的幻想，从这里开始</h2>' +
				'<p>与宝可梦同行，发现每次旅途的不一样。</p></div>' +
				'<button class="rogue-start-primary" name="enterGame"' + (!state || !state.account ? ' disabled' : '') + '>' +
				'<span class="rogue-start-symbol" aria-hidden="true">' + fa('compass') + '</span><span><strong>开始你的幻想杯肉鸽之旅</strong><small>' +
				escape(hint) + '</small></span><span class="rogue-start-arrow" aria-hidden="true">→</span></button>' +
				'<div class="rogue-start-books">' + [
					['guide', 'book', '幻想杯图鉴', '认识幻想杯', '玩法入门 · 幻想宝可梦\n招式、特性与道具'],
					['blessings', 'diamond', '祝福图鉴', '收集旅途的力量', '白银 · 黄金 · 棱彩\n回顾已经获得的祝福'],
					['events', 'map-signs', '事件图鉴', '重温塔中的见闻', '每次选择，都是故事\n翻阅已经经历的事件'],
				].map(function (entry) {
					return '<button class="rogue-start-book book-' + entry[0] + '" name="openCodex" value="' + entry[0] + '">' +
						'<span class="rogue-book-emblem" aria-hidden="true">' + fa(entry[1]) + '</span><strong>' + entry[2] + '</strong>' +
						'<span>' + entry[3] + '</span><small>' + entry[4].replace('\n', '<br />') + '</small><b aria-hidden="true">翻开图鉴 ↗</b></button>';
				}).join('') + '</div><p class="rogue-start-note">旅途进度自动保存；进入后可随时返回开始页。</p></section>';
		},
		renderCodex: function () {
			var section = this.screen, data = this.codices[section], titles = {guide: '幻想杯图鉴', blessings: '祝福图鉴', events: '事件图鉴'};
			var html = '<section class="rogue-codex"><div class="rogue-codex-heading"><span class="rogue-caption">旅途手册 / ' + titles[section] +
				'</span><h2>' + titles[section] + '</h2></div>';
			if (!data) return html + '<p>正在翻开图鉴…</p></section>';
			if (section === 'events' && this.codexReplay) {
				var replay = this.codexReplay, history = this.codexReplayHistory, page = replay.pages[history[history.length - 1]];
				return html + button('closeEventReplay', '', '返回事件列表', false, fa('arrow-left')) +
					'<article class="rogue-event-reading"><span class="rogue-caption">文字回顾 · 可探索不同分支</span><h3>' + escape(replay.title) + '</h3>' +
					'<p class="rogue-reading-note">不消耗资源、不发放奖励，不影响当前冒险。奖励数量随实际冒险楼层变化。</p>' +
					page.text.map(function (paragraph) { return '<p>' + escape(paragraph) + '</p>'; }).join('') +
					(page.battleSkipped ? '<p class="rogue-reading-skip">' + fa('forward') + '战斗画面已跳过，可继续查看结果。</p>' : '') +
					'<div class="rogue-reading-options">' + page.options.map(function (option) {
						return button('replayEventNext', option.next, option.label);
					}).join('') + (!page.options.length ? '<p>这段见闻到这里告一段落。</p>' : '') + '</div><footer>' +
					button('replayEventBack', '', '返回上一段', history.length <= 1) + button('replayEventRestart', '', '从头回顾') + '</footer></article></section>';
			}
			var filters, entries;
			if (section === 'guide') {
				html += '<div class="rogue-guide-intro">' + data.guide.intro.slice(0, 2).map(function (entry) {
					return '<article><h3>' + escape(entry.title) + '</h3><p>' + escape(entry.text) + '</p></article>';
				}).join('') + '</div><details class="rogue-guide-rules"><summary>出发前，了解这些基础规则</summary>' +
					data.guide.intro.slice(2).map(function (entry) { return '<h4>' + escape(entry.title) + '</h4><p>' + escape(entry.text) + '</p>'; }).join('') + '</details>';
				filters = [['items', '道具'], ['moves', '招式'], ['abilities', '特性'], ['pokemon', '幻想宝可梦']];
				entries = data.guide.modules[this.codexFilter] || [];
				html += '<p class="rogue-caption">以下为幻想形态与主要调整内容；形态、道具能否在爬塔中使用，还需满足相应获取和解锁条件。</p>';
			} else {
				filters = section === 'blessings' ? [['all', '全部'], ['silver', '白银'], ['gold', '黄金'], ['prismatic', '棱彩'], ['unlocked', '已解锁']] :
					[['all', '全部'], ['unlocked', '已经历']];
				entries = data.entries;
				var unlocked = entries.filter(function (entry) { return entry.unlocked; }).length;
				html += '<p class="rogue-codex-progress">' + (section === 'blessings' ? '已解锁 ' : '已经历 ') + '<b>' + unlocked + ' / ' + entries.length +
					'</b><span>' + (section === 'blessings' ? '获得过的祝福会完整记录，后续冒险仍可查阅。' : '进入过的事件会收入图鉴，可以重读文字分支。') + '</span></p>';
				var filter = this.codexFilter;
				entries = entries.filter(function (entry) { return filter === 'all' || (filter === 'unlocked' ? entry.unlocked : entry.tier === filter); });
			}
			var active = this.codexFilter, query = this.codexQuery.toLowerCase();
			html += '<nav class="rogue-codex-filters" aria-label="图鉴分类">' + filters.map(function (entry) {
				return '<button class="button' + (active === entry[0] ? ' is-active' : '') + '" aria-pressed="' + (active === entry[0]) +
					'" name="filterCodex" value="' + entry[0] + '">' + entry[1] + '</button>';
			}).join('') + '</nav><div class="rogue-codex-search"><label>按名称查找 <input type="search" name="codexSearch" value="' +
				escape(this.codexQuery) + '" placeholder="输入名称，按回车" /></label>' + button('searchCodex', '', '查找', false, fa('search')) + '</div>';
			entries = entries.filter(function (entry) { return !query || (localName(entry.name) + ' ' + entry.name).toLowerCase().indexOf(query) >= 0; });
			var total = Math.max(1, Math.ceil(entries.length / 12)); this.codexPage = Math.min(this.codexPage, total - 1);
			html += '<div class="rogue-codex-grid">' + entries.slice(this.codexPage * 12, (this.codexPage + 1) * 12).map(function (entry) {
				var tier = {silver: '白银', gold: '黄金', prismatic: '棱彩'}[entry.tier];
				var icon = section === 'guide' ? (active === 'pokemon' ? '<span class="picon" style="' + Dex.getPokemonIcon(entry.name) + '"></span>' :
					active === 'items' ? itemIcon(entry) : fa(active === 'moves' ? 'bolt' : 'sun-o')) : fa(section === 'events' ? 'map-signs' : 'diamond');
				var body = '<p class="rogue-codex-effect">' + escape(localName(entry.text || '')) + '</p>';
				if (section === 'guide' && active === 'moves') body = '<p class="rogue-caption">' + typeIcons([entry.type]) + ' · ' + escape(localName(entry.category)) +
					' · 威力 ' + (entry.power || '—') + ' · 命中 ' + (entry.accuracy === true ? '必中' : entry.accuracy + '%') + ' · PP ' + entry.pp + '</p>' + body;
				if (section === 'guide' && active === 'pokemon') body = '<p>' + typeIcons(entry.types) + '</p><p>特性：' +
					entry.abilities.map(function (name) { return escape(localName(name)); }).join(' / ') + '</p><p class="rogue-caption">' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' ' + entry.stats[stat]; }).join(' · ') + '</p>' +
					(entry.battleOnly ? '<p class="rogue-caption">战斗中触发的特殊形态' + (entry.requiredItem ? ' · ' + escape(localName(entry.requiredItem)) : '') + '</p>' : '');
				return '<article class="rogue-codex-entry tier-' + (entry.tier || 'plain') + (entry.unlocked === false ? ' is-locked' : '') + '">' +
					'<div class="rogue-codex-entry-top"><span>' + icon + '</span><small>' + (tier ? tier + '阶' : section === 'events' ? '事件' : '幻想杯') +
					'</small>' + (entry.unlocked === false ? '<span class="rogue-codex-lock">' + fa('lock') + '未解锁</span>' : '') + '</div>' +
					'<h3>' + escape(localName(entry.name)) + '</h3>' + body + (section === 'events' && entry.unlocked ?
					button('readEvent', entry.id, '回顾这段见闻', false, fa('book')) : '') + '</article>';
			}).join('') + '</div>';
			if (!entries.length) html += '<p class="rogue-codex-empty">这里还没有符合条件的记录。</p>';
			return html + '<div class="rogue-codex-pagination">' + button('pageCodex', String(this.codexPage - 1), '上一页', this.codexPage === 0) +
				'<span>第 ' + (this.codexPage + 1) + ' / ' + total + ' 页 · ' + entries.length + ' 项</span>' +
				button('pageCodex', String(this.codexPage + 1), '下一页', this.codexPage + 1 >= total) + '</div></section>';
		},
		render: function (storyOnly) {
			var state = this.state;
			var busy = !!this.pending || !app.socket || app.socket.readyState !== 1;
			if (this.screen === 'game' && storyOnly === true && state && this.updateStory(state.story, busy)) return;
			this.storyHadError = !!this.error;
			var html = '<div class="pad"><p>' + button('joinRoom', '', '返回首页') + button('refresh', '', '刷新存档') + button('openParty', '', '队伍及背包', false, fa('suitcase')) +
				button('joinRoom', 'fantasyroguegallery', '通关卡展示', false, fa('clone')) +
				(this.screen !== 'home' ? button('startMenu', '', '开始页', false, fa('compass')) : '') + '</p>' +
				'<h2>幻想杯肉鸽</h2>' + (state && state.run && state.run.spirit ? '<p class="rogue-spirit-badge">' +
				button('showSpirit', '', state.run.spirit.name, false, '<span class="picon" style="' + Dex.getPokemonIcon(state.run.spirit.species) + '"></span>') +
				'<span class="rogue-caption">点击查看本局效果</span></p>' : '<p>原生对战 · 捕捉伙伴 · 逐层成长</p>');
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (this.pending && (!state || !state.story || this.error)) html += '<p>正在保存操作… ' + button('sendPending', '', '查询／重发同一请求') + '</p>';
			this.updateParty();
			if (this.screen !== 'game') {
				if (!state) html += '<p class="rogue-caption">正在读取服务器存档…</p>';
				else if (!state.account && state.message) html += '<p class="infobox">' + escape(state.message) + '</p>';
				this.$el.html(html + (this.screen === 'home' ? this.renderStartMenu() : this.renderCodex()) + '</div>'); return;
			}
			if (!state) { this.$el.html(html + '<p>正在读取服务器存档…</p></div>'); return; }
			if (state.message) html += '<p class="infobox">' + escape(state.message) + '</p>';
			if (!state.account) { this.$el.html(html + '</div>'); return; }
			var account = state.account, run = state.run;
			if (state.story) { this.$el.html(html + this.renderStory(state.story, busy) + '</div>'); return; }
			if (state.storyEnabled && run && run.phase === 'complete') {
				html += '<h3>留在床头的卡片</h3><p>这次旅途已经留存。下一次醒来，会遇到什么呢？</p>';
				var card = state.pendingClear || (state.cards || []).find(function (entry) { return entry.runId === run.id; });
				if (card) html += clearCardHTML(card);
				html += state.pendingClear ? this.renderPendingClear(state.pendingClear, state.cards, busy) :
					'<p>' + (card ? card.public ? '通关卡已公开，可在展示页管理。' : '通关卡已私下收藏，可在展示页主动公开。' :
						'这次旅途已结束；本次通关卡未保留在收藏中。') + '</p>' + button('act', 'newstory', '开启新的篇章', busy);
				this.$el.html(html + button('joinRoom', 'fantasyroguegallery', '前往通关卡展示') + '</div>'); return;
			}
			var ongoing = run && run.phase !== 'complete';
			if (run) html += '<h3>' + (run.phase === 'intro' ? '启程之前' : '第 ' + run.floor + ' / 200 层') + (run.node ? ' · ' + escape(run.node.name) : '') +
				(run.time ? '<span class="rogue-time" title="白天两层 → 黄昏一层 → 夜晚两层 → 黎明一层，循环交替">' + escape(run.time.name) + '</span>' : '') + '</h3>' +
				this.renderFloor(run, busy) + this.renderShop(run, busy) + this.renderAbandon(run, busy);
			if (!ongoing) {
				html += '<h3>选择本次冒险的伙伴</h3><p class="rogue-caption">先选好队伍，再依次配置每一只宝可梦。</p>';
				if (account.spiritUnlocked) {
					html += '<p><label><input type="checkbox" name="useSpirit"' + (this.useSpirit ? ' checked' : '') + (busy ? ' disabled' : '') + ' /> 开启塔灵</label>' +
						'<span class="rogue-caption"> · 开局随机，影响整局冒险' + (state.localSpirits ? ' · 本地测试已解锁' : '') + '</span></p>';
					if (this.useSpirit && state.localSpirits) html += '<p><label>测试塔灵：<select name="testSpirit"><option value="">随机抽取</option>' +
						(state.spirits || []).map(function (spirit) { return '<option value="' + escape(spirit.id) + '"' + (this.testSpirit === spirit.id ? ' selected' : '') + '>' +
							escape(spirit.name) + '</option>'; }, this).join('') + '</select></label></p>';
				} else html += '<p class="rogue-caption">无塔灵通关 200 层，可解锁“开启塔灵”。</p>';
				html += '<p><strong class="rogue-starter-count" aria-live="polite">已选择 ' + this.selectedStarters.length +
					' / ' + account.slots + ' 只</strong> · 选满后取消一个，才能更换伙伴。</p><div class="rogue-starters">';
				var selectedStarters = this.selectedStarters;
				var renderStarter = function (starter) {
					var checked = selectedStarters.indexOf(starter.id) >= 0;
					var disabled = busy || (!checked && selectedStarters.length >= account.slots);
					html += '<label' + (disabled && !checked ? ' class="is-disabled"' : '') + '><input type="checkbox" name="starter" value="' +
						escape(starter.id) + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' />' +
						'<span class="picon" style="' + Dex.getPokemonIcon(starter.species) + '"></span>' + escape(localName(starter.species)) + '</label> ';
				};
				state.starters.filter(function (starter) { return starter.available; }).forEach(renderStarter);
				html += '</div>';
				var counts = state.unlockRequirements || {ordinary: 1, special: 10};
				html += '<div class="rogue-unlock-guide"><strong>如何解锁更多伙伴</strong><ul>' +
					'<li>普通宝可梦：累计捕捉 <b>' + counts.ordinary + ' 次</b>。</li>' +
					'<li>一级神、二级神、幻兽、究极异兽、悖谬宝可梦：累计捕捉 <b>' + (counts.special || 10) + ' 次</b>。</li></ul>' +
					'<p class="rogue-caption">同一进化链合并计数，解锁对应最初形态；捕捉成功立即保存，同层同一只重复捕捉不重复计数。</p></div>';
				html += '<p>' + button('confirmStarters', '', '确认队伍，继续配置', busy || !state.configured || !this.selectedStarters.length) + '</p>';
			}
			this.$el.html(html + '</div>');
		},
		renderPendingClear: function (pending, cards, busy) {
			if ((cards || []).length < 3) return '<div class="rogue-keepsake"><h4>保存本次通关卡</h4><p>收藏中已有空位，可直接收下本次记录。</p>' +
				button('resolveClear', '', '收藏至空位', busy) + button('resolveClear', 'discard', '放下本次新卡片', busy) + '</div>';
			return '<div class="rogue-keepsake"><h4>收藏已满 · 请保存本次通关卡</h4><p>最多收藏三张。请选择要替换的记录，或放下新卡片。旧卡不会自动删除。</p>' +
				(cards || []).map(function (card, i) { return button('resolveClear', card.id, '替换第 ' + (i + 1) + ' 张 · ' +
					new Date(card.completedAt).toLocaleDateString(), busy); }).join('') + button('resolveClear', 'discard', '放下本次新卡片', busy) + '</div>';
		},
		resolveClear: function (id) {
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'saveclear', details: {value: id},
				text: id === 'discard' ? '放下本次新通关卡？现有收藏不受影响。' : id ?
					'用本次通关卡替换所选旧卡？旧卡和展示记录将移除。' : '将本次通关卡保存到空位？'});
		}
	});
	this.FantasyRogueGalleryRoom = this.Room.extend({
		type: 'fantasyroguegallery', title: '通关卡展示', minWidth: 320, bestWidth: 1100,
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue rogue-gallery');
			this.offset = 0; this.state = null; this.error = ''; this.pending = null;
			this.listenTo(app, 'response:fantasyroguegallery', this.receiveGallery);
			this.listenTo(app, 'response:fantasyrogueaction', this.receiveMutation);
			this.listenTo(app, 'response:fantasyrogueduel', this.receiveDuel);
			this.listenTo(app, 'response:fantasyrogueduelnotice', this.refresh);
			this.listenTo(app, 'init:socketopened', this.refresh);
			this.listenTo(app, 'init:socketclosed', this.disconnected);
			this.listenTo(app, 'init:choosename', this.refresh);
			this.listenTo(app.user, 'change:userid', this.identityChanged);
			this.render();
		},
		join: function () { this.refresh(); },
		show: function () { Room.prototype.show.apply(this, arguments); this.refresh(); },
		leave: function () { clearTimeout(this.timeout); this.stopListening(); },
		identityChanged: function () { this.state = null; this.pending = null; this.offset = 0; this.refresh(); },
		disconnected: function () { this.pending = null; this.error = '连接已断开，请重新连接后刷新。'; this.render(); },
		refresh: function () { if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyroguegallery ' + this.offset); },
		joinRoom: function (id) { app.joinRoom(id); },
		receiveGallery: function (state) {
			if (!state || state.userid !== app.user.get('userid')) return;
			this.state = state; this.render();
		},
		submit: function (action, details) {
			if (this.pending || !this.state || !this.state.account || !app.socket || app.socket.readyState !== 1) return;
			var request = Object.assign({id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), action: action,
				revision: this.state.account.revision}, details || {});
			this.pending = request.id; this.error = '';
			app.send('/fantasyrogue action ' + JSON.stringify(request)); this.waitForReply();
		},
		waitForReply: function () {
			clearTimeout(this.timeout); var self = this;
			this.timeout = setTimeout(function () { self.pending = null; self.error = '暂未收到结果，请刷新后查看状态再操作。'; self.refresh(); self.render(); }, 10000);
			this.render();
		},
		receiveMutation: function (result) {
			if (result.userid !== app.user.get('userid') || result.id !== this.pending) return;
			clearTimeout(this.timeout); this.pending = null; this.error = result.ok ? '' : result.message;
			this.refresh();
			if (app.rooms.fantasyrogue) app.rooms.fantasyrogue.refresh();
		},
		sendDuel: function (details) {
			if (this.pending || !app.socket || app.socket.readyState !== 1) return;
			this.pending = 'duel'; this.error = '';
			app.send('/fantasyrogue duel ' + JSON.stringify(details)); this.waitForReply();
		},
		receiveDuel: function (result) {
			if (result.userid !== app.user.get('userid') || this.pending !== 'duel') return;
			clearTimeout(this.timeout); this.pending = null;
			this.error = result.ok ? '' : result.message;
			this.refresh();
			if (result.roomid) app.joinRoom(result.roomid);
		},
		publishCard: function (value) { var parts = value.split('|'); this.submit('publishcard', {member: parts[0], value: parts[1]}); },
		deleteCard: function (id) {
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'deletecard', details: {member: id}, text: '删除这张通关卡及其公开展示？这个操作无法撤回。'});
		},
		resolveClear: function (id) { globals.FantasyRogueRoom.prototype ? globals.FantasyRogueRoom.prototype.resolveClear.call(this, id) : globals.FantasyRogueRoom.resolveClear.call(this, id); },
		changePage: function (value) { this.offset = Math.max(0, this.offset + Number(value)); this.refresh(); },
		challengeCard: function (target) { this.sendDuel({action: 'challenge', card: this.$('select[name=duelCard]').val(), target: target}); },
		acceptDuel: function (id) { this.sendDuel({action: 'accept', id: id, card: this.$('select[name=duelCard]').val()}); },
		declineDuel: function (id) { this.sendDuel({action: 'decline', id: id}); },
		cancelDuel: function (id) { this.sendDuel({action: 'cancel', id: id}); },
		render: function () {
			var state = this.state, busy = !!this.pending;
			var selected = this.$('select[name=duelCard]').val();
			var html = '<div class="pad"><p>' + button('joinRoom', 'fantasyrogue', '返回爬塔') + button('refresh', '', '刷新展示') + '</p>' +
				'<h2>留在床头的卡片</h2><p>收藏旅途，展示伙伴。以通关时的成长和力量，再进行一场对战。</p>';
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (!state) { this.$el.html(html + '<p>正在读取通关记录…</p></div>'); return; }
			if (state.account) {
				html += '<h3>我的收藏 · ' + state.own.length + ' / 3</h3><p class="rogue-caption">新卡默认私有，公开后所有玩家都能查看完整队伍。</p><div class="rogue-gallery-grid">';
				state.own.forEach(function (card) {
					html += '<div>' + clearCardHTML(card) + '<p>' + button('publishCard', card.id + '|' + (card.public ? 'private' : 'public'),
						card.public ? '停止公开' : '公开展示', busy) + button('deleteCard', card.id, '删除收藏', busy) + '</p></div>';
				});
				html += '</div>';
				if (!state.own.length) html += '<p>完成 200 层后，第一张通关卡将留在这里。</p>';
				if (state.pending) {
					html += clearCardHTML(state.pending);
					var proto = globals.FantasyRogueRoom.prototype || globals.FantasyRogueRoom;
					html += proto.renderPendingClear.call(this, state.pending, state.own, busy);
				}
				var choices = state.own.filter(function (card) { return card.public && card.rulesVersion === state.rulesVersion; });
				html += '<h3>通关队伍约战</h3><p>全队恢复 HP、PP 和异常状态后开战；禁止使用背包道具与捕捉。仅相同塔灵互战，无塔灵单独成组。</p>' +
					'<label>使用我的卡片：<select name="duelCard"><option value="">选择已公开的通关卡</option>' + choices.map(function (card) {
						return '<option value="' + card.id + '"' + (card.id === selected ? ' selected' : '') + '>' + escape(card.snapshot.spiritName || '无塔灵') +
							' · ' + new Date(card.completedAt).toLocaleString() + '</option>';
					}).join('') + '</select></label>';
				(state.invitations || []).forEach(function (invite) {
					var incoming = invite.to === state.userid;
					html += '<p class="rogue-keepsake">' + escape(incoming ? invite.fromName + ' 向你发来约战' : '等待 ' + invite.toName + ' 接受') + ' ' +
						(incoming ? button('acceptDuel', invite.id, '使用上方卡片接受', busy) + button('declineDuel', invite.id, '拒绝', busy) :
							button('cancelDuel', invite.id, '取消约战', busy)) + '</p>';
				});
			}
			html += '<h3>公开展示</h3><div class="rogue-gallery-grid">';
			state.cards.forEach(function (card) {
				var usable = card.rulesVersion === state.rulesVersion;
				html += '<div>' + clearCardHTML(card) + '<p>' + (usable ? button('challengeCard', card.id, card.online ? '邀请约战' : '当前离线',
					busy || !state.account || !card.online || card.owner === state.userid) : '<span class="rogue-caption">历史规则版本 · 仅供展示</span>') + '</p></div>';
			});
			html += '</div>' + (!state.cards.length ? '<p>还没有公开展示的通关卡。</p>' : '') + '<p>' +
				button('changePage', '-12', '上一页', busy || !state.offset) + button('changePage', '12', '下一页', busy || state.cards.length < 12) + '</p></div>';
			this.$el.html(html);
		}
	});
	this.RogueEventReplayPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.owner = data.room; this.eventKey = data.event.key; this.userid = app.user.get('userid');
			this.$el.addClass('rogue-event-replay').html('<h3>斗蛐蛐！ · 观战</h3><div class="battle"></div><div class="battle-log"></div>' +
				'<p>' + button('togglePlayback', '', '暂停／继续') + button('finishEvent', '', '观战结束，查看结果', true) + button('close', '', '暂时收起') + '</p>');
			this.battle = new Battle({$frame: this.$('.battle'), $logFrame: this.$('.battle-log'), log: data.event.replay, paused: true, isReplay: true, autoresize: true});
			var self = this;
			this.battle.subscribe(function () { self.$('button[name=finishEvent]').prop('disabled', !self.battle.ended || !self.battle.atQueueEnd); });
			var saved = this.owner.eventPlayback;
			if (saved && saved.key === this.eventKey) this.battle.seekTurn(saved.turn);
			this.playTimer = setTimeout(function () { self.battle.play(); }, 0);
		},
		togglePlayback: function () { if (this.battle.paused) this.battle.play(); else this.battle.pause(); },
		finishEvent: function () {
			if (!this.battle.ended || !this.battle.atQueueEnd || app.user.get('userid') !== this.userid) return;
			var event = this.owner.state && this.owner.state.run && this.owner.state.run.event;
			if (event && event.key === this.eventKey && event.stage === 'watch') this.owner.chooseEvent('watched');
			this.close();
		},
		remove: function () {
			clearTimeout(this.playTimer);
			if (this.battle) {
				this.owner.eventPlayback = {key: this.eventKey, turn: this.battle.ended && this.battle.atQueueEnd ? Infinity : this.battle.turn};
				this.battle.destroy(); this.battle = null;
			}
			return globals.Popup.prototype.remove.apply(this, arguments);
		}
	});
	this.RogueCardConfirmPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			this.$el.html('<h3>' + escape(data.title || '确认操作') + '</h3><p>' + escape(data.text) + '</p>' + button('confirmCard', '', '确认') + button('close', '', '取消'));
		},
		confirmCard: function () {
			if (app.user.get('userid') === this.userid) this.data.room.submit(this.data.action, this.data.details);
			this.close();
		}
	});
	this.FantasyRoguePartyRoom = this.Room.extend({
		type: 'fantasyrogueparty', title: '队伍及背包', isSideRoom: true, minWidth: 320, bestWidth: 960,
		events: {'change select[name=target]': 'changeItemTarget'},
		changeItemTarget: function (event) {
			var owner = app.rooms.fantasyrogue;
			if (owner) owner.changeItemTarget(event);
		},
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue rogue-party-room');
			this.render();
		},
		dispatchClickButton: function (e) {
			var owner = app.rooms.fantasyrogue;
			if (owner) Room.prototype.dispatchClickButton.call(owner, e);
		},
		render: function () {
			var owner = app.rooms.fantasyrogue;
			var scroll = this.$el.scrollTop();
			this.$el.html('<div class="pad">' + (owner ? owner.renderParty() : '<p>请先打开幻想杯肉鸽。</p>') + '</div>');
			this.$el.scrollTop(scroll);
		}
	});
	this.RogueBlessingLearnPopup = this.Popup.extend({
		initialize: function (data) {
			this.room = data.room; this.member = data.member;
			this.runid = this.room.state.run.id;
			var entry = (this.room.state.run.blessings.learning || []).find(function (e) { return e.member === data.member; });
			var html = '<h3>选择一个新招式</h3><p>本局每只伙伴只能领取一次，可在学会后自由装备。</p><select name="learnMove">';
			(entry && entry.moves || []).forEach(function (id) { var move = dex().moves.get(id);
				html += '<option value="' + escape(id) + '">' + escape(localName(move.name) + ' · ' + localName(move.type) + ' · ' + localName(move.category)) + '</option>';
			});
			this.$el.html(html + '</select><p>' + button('confirmLearn', '', '确认学习') + button('close', '', '稍后再学') + '</p>');
		},
		confirmLearn: function () {
			if (this.room.state.run && this.room.state.run.id === this.runid) this.room.submit('learnbonus', {member: this.member, value: this.$('select[name=learnMove]').val()});
			this.close();
		}
	});
	this.RogueEvolutionPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.member = data.member; this.target = data.target;
			this.userid = app.user.get('userid');
			var run = this.room.state.run;
			this.runid = run.id;
			var mon = run.team.find(function (entry) { return entry.id === data.member; });
			this.species = mon && mon.set.species;
			var options = mon ? (mon.evolutionDetails || []).filter(function (evo) { return evo.ready; }) : [];
			if (!this.target && options.length === 1) this.target = idOf(options[0].species);
			var target = this.target;
			var option = options.find(function (evo) { return idOf(evo.species) === target; });
			this.$el.addClass('rogue-evolution-popup');
			var html = '<h3>' + (target ? '确认进化' : '选择进化方向') + '</h3>';
			if (option) {
				html += '<p><strong>' + escape(localName(mon.set.species)) + ' → ' + escape(localName(option.species)) + '</strong></p>' +
					'<p>进化后无法退回原形态。性格、资质及成长记录保留，不会补满 HP 或 PP。</p>';
				option.requirements.filter(function (condition) { return condition.resource || /消耗/.test(condition.text); }).forEach(function (condition) {
					html += '<p class="rogue-evolution-cost">消耗 1 个 ' + escape(localName(condition.name || option.item)) + '</p>';
				});
				html += button('confirmEvolution', '', '确认进化');
			} else if (!target && options.length) {
				html += '<p>请选择一个方向，随后会再次确认。</p>';
				options.forEach(function (evo) {
					html += '<p>' + button('chooseEvolution', idOf(evo.species), '进化为 ' + localName(evo.species)) + '</p>';
				});
			} else html += '<p>当前进化条件已改变，请返回队伍重新查看。</p>';
			this.$el.html(html + button('close', '', '取消'));
		},
		chooseEvolution: function (target) {
			this.close(); this.room.evolveMember(this.member + '|' + target);
		},
		confirmEvolution: function () {
			var run = this.room.state && this.room.state.run, self = this;
			var mon = run && run.team.find(function (entry) { return entry.id === self.member; });
			if (app.user.get('userid') === this.userid && run && run.id === this.runid && editable(run) &&
				!run.healingLocked && !this.room.pending && mon && mon.set.species === this.species &&
				(mon.evolutionDetails || []).some(function (evo) { return evo.ready && idOf(evo.species) === self.target; })) {
				this.room.submit('evolve', {member: this.member, value: this.target});
			}
			this.close();
		}
	});
	this.RogueEvolutionAnimationPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.member = data.member;
			this.runid = this.room.state.run.id; this.userid = app.user.get('userid');
			this.afterName = localName(data.after.species);
			this.$el.addClass('rogue-evolution-animation');
			var sprite = function (set, stage) {
				return '<div class="rogue-evolution-sprite ' + stage + '" role="img" aria-label="' + escape(localName(set.species)) +
					'" style="' + Dex.getTeambuilderSprite(set) + '"></div>';
			};
			var particles = '';
			for (var i = 0; i < 8; i++) particles += '<i style="--angle:' + (i * 45) + 'deg;--delay:' + (i * 65) + 'ms"></i>';
			this.$el.html('<h3>伙伴进化</h3><div class="rogue-evolution-stage" aria-hidden="true"><div class="rogue-evolution-glow"></div>' +
				'<div class="rogue-evolution-sparks">' + particles + '</div>' + sprite(data.before, 'before') + sprite(data.after, 'after') +
				'</div><p class="rogue-evolution-result" role="status">' + escape(localName(data.before.species)) + '正在进化……</p>' +
				'<div class="rogue-evolution-actions">' + button('close', '', '跳过动画') + '</div>');
			var self = this;
			if (globals.matchMedia && globals.matchMedia('(prefers-reduced-motion: reduce)').matches) this.finishAnimation();
			else this.animationTimer = setTimeout(function () { self.finishAnimation(); }, 3200);
		},
		finishAnimation: function () {
			clearTimeout(this.animationTimer);
			this.$el.addClass('complete');
			this.$('.rogue-evolution-result').text('进化完成！成为了' + this.afterName + '。');
			var run = this.room.state && this.room.state.run, self = this;
			var mon = run && run.team.find(function (entry) { return entry.id === self.member; });
			var again = run && run.id === this.runid && editable(run) && mon &&
				(mon.evolutionDetails || []).some(function (evo) { return evo.ready; });
			this.$('.rogue-evolution-actions').html(button('close', '', '返回队伍') + (again ? button('continueEvolution', '', '继续进化') : ''));
		},
		continueEvolution: function () {
			var run = this.room.state && this.room.state.run;
			this.close();
			if (app.user.get('userid') === this.userid && run && run.id === this.runid) this.room.showEvolutionChoices(this.member);
		},
		remove: function () {
			clearTimeout(this.animationTimer);
			return globals.Popup.prototype.remove.apply(this, arguments);
		}
	});
	this.RogueSpiritPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room;
			var run = this.room.state.run, spirit = run.spirit;
			this.runid = run.id;
			this.$el.addClass('rogue-spirit-popup');
			var needsParty = run.pendingCapture || run.team.length > run.partyLimit;
			this.$el.html('<div class="rogue-spirit-art" role="img" aria-label="' + escape(localName(spirit.species)) + '" style="' +
				Dex.getTeambuilderSprite({species: spirit.species}) + '"></div><span class="rogue-caption">本局塔灵</span><h3>' +
				escape(spirit.name) + '</h3><p>' + escape(spirit.text) + '</p>' +
				button('acceptSpirit', '', run.phase === 'intro' ? needsParty ? '先安排初始队伍' : '轻点收起 · 开始旅程' : '收起', !!this.room.pending));
		},
		acceptSpirit: function () {
			var run = this.room.state.run;
			if (run && run.id === this.runid && run.phase === 'intro' && !run.pendingCapture && run.team.length <= run.partyLimit) this.room.submit('spiritack');
			this.close();
		}
	});
	this.RogueMergePopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room;
			var run = this.room.state.run;
			this.runid = run.id;
			this.userid = app.user.get('userid');
			this.member = data.member;
			var owned = run.team.concat(run.box || []);
			var keep = owned.find(function (mon) { return mon.id === data.member; });
			if (!keep) { this.$el.html('伙伴已变更，请重新打开。'); return; }
			this.candidates = owned.filter(function (mon) { return mon !== keep && idOf(mon.set.species) === idOf(keep.set.species) && (mon.stars || 1) === (keep.stars || 1); });
			var label = function (mon) { return escape(localName(mon.set.species)) + ' · Lv.' + mon.set.level + ' · ' +
				escape(localName(mon.set.nature || '')) + ' · HP ' + mon.hp + '/' + mon.maxhp + (run.box.indexOf(mon) >= 0 ? '（箱子）' : '（队伍）'); };
			var html = '<h3>确认升星 · ' + (keep.stars || 1) + ' → ' + ((keep.stars || 1) + 1) + ' 星</h3><p><b>保留：</b>' + label(keep) +
				'</p><p>保留此伙伴的性格、个体值、努力值、招式及状态；以下两位伙伴将被消耗，携带道具返还背包。</p>';
			for (var i = 0; i < 2; i++) html += '<p><label>消耗伙伴 ' + (i + 1) + '：<select name="merge-' + i + '">' +
				this.candidates.map(function (mon, n) { return '<option value="' + escape(mon.id) + '"' + (n === i ? ' selected' : '') + '>' + label(mon) + '</option>'; }).join('') + '</select></label></p>';
			this.$el.html(html + button('confirmMerge', '', '确认消耗并升星', this.candidates.length < 2 || keep.stars >= 4) + button('close', '', '取消'));
		},
		confirmMerge: function () {
			var run = this.room.state.run;
			if (app.user.get('userid') !== this.userid || !run || run.id !== this.runid) { this.close(); return; }
			this.room.submit('merge', {member: this.member, order: [this.$('select[name=merge-0]').val(), this.$('select[name=merge-1]').val()]});
			this.close();
		}
	});
	this.RogueStarterPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.$el.addClass('rogue-starter-popup');
			this.room = data.room;
			this.starters = data.starters;
			this.index = 0;
			this.userid = app.user.get('userid');
			this.renderConfig();
		},
		renderConfig: function () {
			var id = this.starters[this.index];
			this.starter = this.room.state.starters.find(function (entry) { return entry.id === id && entry.available; });
			if (!this.starter) { this.close(); return; }
			var data = {starter: this.starter};
			var traits = starterTraits(data.starter);
			var build = this.room.starterBuilds[data.starter.id] || {nature: 'random', gender: 'random', ability: 'random', ivs: traits.ivs.max};
			var html = '<form class="rogue-starter-config"><p class="rogue-config-progress">配置伙伴 · ' + (this.index + 1) + ' / ' + this.starters.length + '</p>' +
				'<h3>' + escape(localName(data.starter.species)) + ' · 初始配置</h3>' +
				'<p><label>性格 <select name="nature" class="autofocus"><option value="random">随机（全部 25 种性格）</option>';
			(this.room.state.natures || []).filter(function (nature) { return traits.natures.indexOf(nature.id) >= 0; }).forEach(function (nature) {
				html += '<option value="' + escape(nature.id) + '"' + (build.nature === nature.id ? ' selected' : '') + '>' + escape(natureLabel(nature)) + '</option>';
			});
			html += '</select></label></p><p><label>性别 <select name="gender">';
			if (data.starter.gender === 'N') {
				html += '<option value="N">无性别（固定）</option>';
			} else {
				html += '<option value="random">随机（按物种性别比例）</option>';
				traits.genders.filter(function (gender) { return gender !== 'N' && (!data.starter.gender || gender === data.starter.gender); }).forEach(function (gender) {
					html += '<option value="' + gender + '"' + (build.gender === gender ? ' selected' : '') + '>' + (gender === 'M' ? '雄性 ♂' : '雌性 ♀') + '</option>';
				});
			}
			html += '</select></label></p><p><label>特性 <select name="ability"><option value="random">随机（普通特性）</option>';
			(data.starter.abilities || []).filter(function (ability) { return traits.abilities.indexOf(ability.id) >= 0; }).forEach(function (ability) {
				html += '<option value="' + escape(ability.id) + '"' + (build.ability === ability.id ? ' selected' : '') + '>' +
					escape(localName(ability.name)) + (ability.hidden ? '（隐藏特性）' : '') + '</option>';
			});
			html += '</select></label></p><p class="rogue-config-note">捕捉过的性格、性别和特性可指定；随机项在开始冒险时确定。</p>' +
				'<table><thead><tr><th>能力</th><th>个体值</th><th>已解锁范围</th></tr></thead><tbody>';
			Object.keys(statNames).forEach(function (stat) {
				html += '<tr><th><label for="rogue-iv-' + stat + '">' + statNames[stat] + '</label></th><td>' +
					'<input class="textbox" type="number" name="iv-' + stat + '" id="rogue-iv-' + stat + '" min="' + traits.ivs.min[stat] +
					'" max="' + traits.ivs.max[stat] + '" step="1" required value="' + build.ivs[stat] + '" /></td><td>' +
					traits.ivs.min[stat] + '～' + traits.ivs.max[stat] + '</td></tr>';
			});
			html += '</tbody></table><p class="rogue-config-note">初始均为 20；捕捉与事件分别拓展六项范围，默认选已解锁最大值。同一进化链共用，地区初始形态分开记录。</p>' +
				'<p class="rogue-config-note">招式自动装配；进入冒险后，可自由更换已解锁的合法招式。</p>' +
				'<p class="rogue-config-error" role="alert"></p><p class="buttonbar"><button type="submit" class="button"><strong>' +
				(this.index === this.starters.length - 1 ? '开始本次冒险' : '确认配置，下一只') + '</strong></button> ' +
				(this.index ? '<button type="button" name="previousStarter" class="button">上一只</button> ' : '') +
				'<button type="button" name="close" class="button">返回选择人选</button></p></form>';
			this.$el.html(html);
		},
		previousStarter: function () {
			var data = {};
			this.$('form').serializeArray().forEach(function (entry) { data[entry.name] = entry.value; });
			if (!this.saveConfig(data)) return;
			this.index--; this.renderConfig();
		},
		saveConfig: function (data) {
			var room = this.room, id = this.starter.id;
			var starter = room.state && room.state.starters.find(function (entry) { return entry.id === id && entry.available; });
			if (app.user.get('userid') !== this.userid || !starter || room.pending ||
				room.selectedStarters.join(',') !== this.starters.join(',')) { this.close(); return false; }
			var traits = starterTraits(starter), ivs = {};
			var valid = data.nature === 'random' || traits.natures.indexOf(data.nature) >= 0;
			valid = valid && (data.gender === 'random' || traits.genders.indexOf(data.gender) >= 0 || (data.gender === 'N' && starter.gender === 'N'));
			valid = valid && (data.ability === 'random' || ((traits.abilities || []).indexOf(data.ability) >= 0 &&
				(starter.abilities || []).some(function (ability) { return ability.id === data.ability; })));
			Object.keys(statNames).forEach(function (stat) {
				ivs[stat] = Number(data['iv-' + stat]);
				if (data['iv-' + stat] === '' || !Number.isInteger(ivs[stat]) || ivs[stat] < traits.ivs.min[stat] || ivs[stat] > traits.ivs.max[stat]) valid = false;
			});
			if (!valid) { this.$('.rogue-config-error').text('请选择已解锁的性格、性别、特性，以及范围内的整数个体值。'); return false; }
			room.starterBuilds[id] = {nature: data.nature, gender: data.gender, ivs: ivs, ability: data.ability};
			return true;
		},
		submit: function (data) {
			if (!this.saveConfig(data)) return;
			if (this.index < this.starters.length - 1) {
				this.index++; this.renderConfig();
			} else {
				this.close(); this.room.startAdventure();
			}
		}
	});
}).call(this);
