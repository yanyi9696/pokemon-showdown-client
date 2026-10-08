(function () {
	'use strict';
	var escape = BattleLog.escapeHTML;
	var globals = this;
	function localName(name) {
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
	function routeEmblem(kind) {
		var icons = {wild: 'compass', battle: 'bolt', elite: 'shield', encounter: 'bolt', trainer: 'flag',
			boss: 'trophy', gym: 'university', event: 'question', reward: 'gift', shop: 'shopping-bag', rest: 'medkit', adventure: 'magic'};
		return '<span class="rogue-route-marker" aria-hidden="true"><svg width="18" height="25" viewBox="0 0 18 25">' +
			'<path d="M9 0 18 10 9 25 0 10Z" fill="white"/><path d="M9 4 14 10 9 19 4 10Z" fill="#172231"/></svg></span>' +
			'<span class="rogue-route-emblem" aria-hidden="true"><i class="fa fa-' + (icons[kind] || 'compass') + '"></i></span>';
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
		return ['choose', 'ready', 'rest', 'reward'].indexOf(run.phase) >= 0 &&
			!run.pendingCapture && !(run.pendingMoves || []).length;
	}
	function loot(reward, items, inline) {
		if (!reward) return '';
		var tag = inline ? 'span' : 'div';
		var html = '<' + tag + ' class="rogue-loot">';
		if (reward.money) html += '<span>' + fa('money') + '金币 <strong>+' + reward.money + '</strong></span>';
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
	this.FantasyRogueRoom = this.Room.extend({
		type: 'fantasyrogue', title: '幻想杯肉鸽', minWidth: 320, bestWidth: 960,
		events: {'change input[name=starter]': 'changeStarter', 'change input[name=useSpirit]': 'changeSpirit',
			'change select[name=testSpirit]': 'changeSpirit', 'change select[name=hpTarget]': 'changeHPTarget'},
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue');
			this.state = null;
			this.pending = null;
			this.error = '';
			this.selectedStarters = [];
			this.starterBuilds = {};
			this.selectedRoute = null;
			this.openPartyOnLayout = true;
			this.listenTo(app, 'response:fantasyrogue', this.receiveState);
			this.listenTo(app, 'response:fantasyrogueaction', this.receiveAction);
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
			this.starterBuilds = {};
			this.useSpirit = false; this.testSpirit = ''; this.hpTarget = null; this.spiritPopupRun = null;
			this.selectedStarters = []; this.selectedRoute = null;
			this.selectedMember = null; this.itemTarget = null; this.state = null; this.pending = null; this.error = ''; this.refresh();
		},
		disconnected: function () {
			clearTimeout(this.timer);
			this.pending = null;
			this.selectedRoute = null;
			this.error = '连接已断开。重新连接后将读取服务器存档。';
			this.render();
		},
		refresh: function () {
			if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyrogue');
			this.render();
		},
			receiveState: function (state) {
			if (!state || state.userid !== app.user.get('userid')) return;
			if (state.protocolVersion !== 1) { this.error = '请刷新客户端以更新肉鸽页面。'; this.render(); return; }
			if (this.state && this.state.account && state.account && state.account.revision < this.state.account.revision) return;
			var previous = this.state && this.state.run;
			var incoming = state.run;
			if (incoming && (!previous || previous.id !== incoming.id)) this.openPartyOnLayout = true;
			if (!previous || !incoming || previous.id !== incoming.id || previous.floor !== incoming.floor ||
				previous.phase !== incoming.phase || this.state.account.revision !== state.account.revision) this.selectedRoute = null;
			var focusFloor = incoming && (!previous || previous.id !== incoming.id || previous.floor !== incoming.floor ||
				previous.recovery !== incoming.recovery ||
				JSON.stringify((previous.pendingMoves || [])[0]) !== JSON.stringify((incoming.pendingMoves || [])[0]) ||
				!!previous.pendingCapture !== !!incoming.pendingCapture);
			this.state = state;
			this.normalizeStarters();
			this.render();
			if (app.curRoom === this) app.updateLayout();
			if (focusFloor && this.$el.scrollTop) this.$el.scrollTop(0);
			if (incoming && incoming.phase === 'intro' && incoming.spirit && this.spiritPopupRun !== incoming.id) {
				this.spiritPopupRun = incoming.id;
				this.showSpirit();
			}
		},
		receiveAction: function (result) {
			if (result.userid !== app.user.get('userid') || !this.pending || result.id !== this.pending.id) return;
			var action = this.pending.action;
			clearTimeout(this.timer);
			this.pending = null;
			this.error = result.ok ? '' : result.message;
			if (result.state) this.receiveState(result.state);
			else this.refresh();
			if (result.ok && action === 'battle' && result.state.run && result.state.run.roomid) app.joinRoom(result.state.run.roomid);
			this.render();
		},
		submit: function (action, details) {
			if (this.pending || !this.state || !this.state.account) return;
			if (!app.socket || app.socket.readyState !== 1) { this.disconnected(); return; }
			var command = Object.assign({
				id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
				revision: this.state.account.revision, action: action
			}, details || {});
			this.pending = command;
			this.error = '';
			this.sendPending();
		},
		sendPending: function () {
			if (!this.pending) return;
			app.send('/fantasyrogue action ' + JSON.stringify(this.pending));
			clearTimeout(this.timer);
			var self = this;
			this.timer = setTimeout(function () {
				self.error = '尚未收到操作结果，可刷新存档或重发同一请求。';
				self.refresh();
			}, 10000);
			this.render();
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
			this.$('button[name=startAdventure]').prop('disabled', !chosen.length || !this.state.configured);
			this.render();
			if (added) this.configureStarter(input.value);
		},
		configureStarter: function (id) {
			if (this.pending || this.selectedStarters.indexOf(id) < 0) return;
			var starter = this.state.starters.find(function (entry) { return entry.id === id && entry.available; });
			if (!starter) return;
			app.addPopup(globals.RogueStarterPopup, {room: this, starter: starter});
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
			this.itemTarget = this.$('select[name=target]').val();
			this.submit('use', {value: id, member: this.itemTarget});
		},
		learnMove: function (slot) {
			var move = this.state.run.pendingMoves[0];
			if (move) this.submit('learn', {value: slot, member: move.member});
		},
		replaceMember: function (id) { this.submit('replace', {value: id}); },
		evolveMember: function (value) {
			var parts = value.split('|');
			this.submit('evolve', {member: parts[0], value: parts[1]});
		},
		askAbandon: function () { this.abandonPrompt = true; this.render(); },
		cancelAbandon: function () { this.abandonPrompt = false; this.render(); },
		abandon: function () { this.abandonPrompt = false; this.submit('abandon'); },
		selectedPokemon: function () {
			var team = this.state.run.team;
			return team.filter(function (mon) { return mon.id === this.selectedMember; }, this)[0] || team[0];
		},
		selectMember: function (id) { this.selectedMember = id; this.render(); },
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
		renderFloor: function (run, busy) {
			var html = '<section class="rogue-floor" aria-label="本层操作">';
			if (run.recovery) {
				html += '<p class="rogue-recovery"><strong>' + (run.recovery === 'retreat' ? '已撤退' : '本场战败') +
					'</strong> · 伤害、PP、异常状态和道具消耗已保留。' + (run.phase === 'failed' ? '本层需重新连续挑战。' :
					'下一次仍挑战第 ' + (run.encounter + 1) + ' 场，对手恢复本场初始状态。') + '</p>';
			}
			if (run.node && run.node.noHealing) html += '<p class="rogue-caption">连续挑战：开战后禁止场外治疗和急救，全队倒下需重新挑战整层。</p>';
			if (run.lastReward && (run.lastReward.money || run.lastReward.points || Object.keys(run.lastReward.items || {}).length)) {
				html += '<div class="rogue-receipt"><strong>' + fa('check-circle') + '已到账 · 第 ' + run.lastReward.floor + ' 层' +
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
			} else if (run.phase === 'choose') {
				html += '<h3>选择本层路线</h3><span class="rogue-caption">点击卡片选中，再点一次进入</span><div class="rogue-routes">';
				(run.choices || []).forEach(function (node) {
					var selected = this.selectedRoute === node.id;
					html += '<button type="button" name="chooseRoute" value="' + escape(node.id) + '" class="rogue-route rogue-route-' + routeTone(node.kind) +
						(selected ? ' is-selected' : '') + '" aria-pressed="' + selected + '"' + (busy ? ' disabled' : '') + '>' + routeVortex() + routeEmblem(node.kind) +
						'<strong>' + escape(node.name) + '</strong><small>' + escape(kindNames[node.kind] || node.kind) +
						(node.biome ? ' · Lv.' + node.biome.level + ' · ' + (node.biome.tier * 20) + '～' +
							(node.biome.tier * 20 + 20) + ' 档宝可梦池' : '') +
						'</small><span class="rogue-caption">' + (node.fogged ? '路线与收益被迷雾遮蔽' : node.wildLoot ? '本层战利品 · 每场结束入包' : '整层完成奖励') + '</span>' +
						(node.wildLoot ? wildLootSummary(node.wildLoot, this.state.items) : loot(node.reward, this.state.items, true)) +
						'<span class="rogue-route-hint">' + (selected ? '已选中 · 再点一次进入' : '点击选中') + '</span></button>';
				}, this);
				html += '</div>';
				if (!(run.choices || []).length) html += '<p>本层内容等待配置，存档已保留。</p>';
			} else if (run.phase === 'ready') {
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
				'<table class="rogue-stats"><thead><tr><th>能力</th><th>种族值</th><th>努力值</th><th>个体值</th><th>最终能力</th></tr></thead><tbody>';
			Object.keys(statNames).forEach(function (stat) {
				var base = (mon.baseStats || {})[stat] || 0;
				html += '<tr><th>' + statNames[stat] + '</th><td><span class="rogue-stat-number">' + base + '</span>' +
					'<span class="rogue-stat-bar" style="width:' + Math.min(110, base / 2) + 'px"></span></td><td>' +
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
			var slot = Math.min(this.moveSlot || 0, Math.min(3, mon.set.moves.length));
			this.moveSlot = slot;
			var species = dex().species ? dex().species.get(mon.set.species) : {};
			var html = '<section class="rogue-editor" aria-label="队伍编辑器"><h3>宝可梦队伍</h3><div class="rogue-team-tabs" role="tablist">';
			run.team.forEach(function (member) {
				html += '<button role="tab" aria-selected="' + (member.id === mon.id) + '" name="selectMember" value="' + escape(member.id) + '">' +
					'<span class="picon" style="' + Dex.getPokemonIcon(member.set.species) + '"></span><span>' + escape(localName(member.set.species)) +
					'</span><small>Lv.' + member.set.level + ' · ' + (member.hp ? 'HP ' + member.hp + '/' + member.maxhp : '已倒下') + '</small></button>';
			});
			html += '</div><div class="rogue-member-toolbar"><strong>' + escape(localName(mon.set.species)) + '</strong><span>' +
				button('moveMember', '-1', '前移', locked || run.team[0] === mon, fa('arrow-left')) +
				button('moveMember', '1', '后移', locked || run.team[run.team.length - 1] === mon, fa('arrow-right')) + '</span></div>';
			html += '<div class="rogue-member-sheet"><div class="rogue-identity">' +
				'<div class="rogue-sprite-frame"><div class="rogue-sprite" role="img" aria-label="' + escape(localName(mon.set.species)) + '" style="' +
				(typeof Dex.getTeambuilderSprite === 'function' ? Dex.getTeambuilderSprite(mon.set) : '') + '"></div></div>' +
				'<div>' + typeIcons(mon.types || species.types) + '</div>' + (run.spirit && run.spirit.id === 'zygarde' ? '<b class="rogue-stars">' + '★'.repeat(mon.stars || 1) + '</b>' : '') +
				'<strong>HP ' + mon.hp + ' / ' + mon.maxhp + '</strong>' +
				'<meter min="0" max="' + mon.maxhp + '" value="' + mon.hp + '" aria-label="生命值"></meter>' +
				'<small>' + (mon.hp ? escape(localName(mon.status || '状态正常')) : '已倒下') + '</small></div>';
			var exp = mon.experienceProgress;
			var ability = dex().abilities ? dex().abilities.get(mon.set.ability || '') : {name: mon.set.ability || ''};
			var item = this.state.items.filter(function (entry) { return entry.id === idOf(mon.set.item); })[0];
			html += '<div class="rogue-member-details"><div class="rogue-details-line"><span>等级<br /><b>' + mon.set.level +
				'</b></span><span>性别<br /><b>' + escape(mon.set.gender || '—') + '</b></span><span>性格<br /><b>' +
				escape(localName(mon.set.nature || '—')) + '</b></span></div>' +
				(mon.fixedLevel ? '<p class="rogue-exp">驻时伙伴 · 等级固定 ' + mon.fixedLevel + '</p>' : exp ? '<p class="rogue-exp">经验：' + (exp.needed ? exp.current + ' / ' + exp.needed + '（下一级）' : '已达 100 级') + '</p>' : '') +
				'<label>携带道具</label>' + button('editSection', 'items', item ? localName(item.name) : mon.set.item ? localName(mon.set.item) : '无道具', false, item ? itemIcon(item) : fa('cube')) +
				'<label>特性</label>' + button('editSection', 'abilities', localName(ability.name || '—'), false) + '</div>';
			html += '<div class="rogue-equipped-moves"><label>招式 · 点击更换</label>';
			for (var i = 0; i < 4; i++) {
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
			if (!editable(run)) html += '<p class="rogue-caption">当前可查看队伍，完成战斗及待处理结算后可调整。</p>';
			(mon.evolutions || []).forEach(function (evo) {
				html += button('evolveMember', mon.id + '|' + idOf(evo.species), '进化为 ' + localName(evo.species) +
					(evo.item ? '（消耗进化道具）' : ''), locked || run.healingLocked || !mon.hp || (evo.item && !run.bag[evo.item]));
			});
			html += '<div class="rogue-editor-options">';
			if (panel === 'moves') {
				html += '<h4>可更换招式 · 第 ' + (slot + 1) + ' 个位置</h4><p class="rogue-caption">已学与替换下来的招式都会保留；更换保留剩余 PP。</p>';
				(mon.moveMemory || mon.pp).forEach(function (move) {
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
			var itemTarget = this.itemTarget || this.selectedMember;
			var html = '<section class="rogue-bag"><h3>' + fa('suitcase') + '背包</h3>' +
				'<div class="rogue-wallet">' + fa('money') + '金币 <strong>' + run.money + '</strong></div>' +
				'<p><label>道具目标：<select name="target">' + run.team.map(function (mon) {
					return '<option value="' + escape(mon.id) + '"' + (mon.id === itemTarget ? ' selected' : '') + '>' +
						escape(localName(mon.set.species)) + ' · Lv.' + mon.set.level + ' · HP ' + mon.hp + '/' + mon.maxhp + '</option>';
				}).join('') + '</select></label></p><div class="rogue-inventory">';
			var held = this.state.items.filter(function (item) { return item.kind !== 'treasure' && run.bag[item.id] > 0; });
			held.forEach(function (item) {
				html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
					'</strong><b>×' + run.bag[item.id] + '</b></div><small>' + itemKinds[item.kind] + '</small><p>' + escape(itemDescription(item)) + '</p>';
				if (['ball', 'evolution', 'held'].indexOf(item.kind) < 0) html += button('useItem', item.id, '使用', !usable);
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
				html += '<p class="rogue-boosts">本局永久加成：' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + run.boosts[stat]; }).join(' / ') + '</p>' +
					'<p class="rogue-tera">' + fa(run.teraUnlocked ? 'diamond' : 'lock') + '太晶化：' +
					(run.teraUnlocked ? '本局已解锁，每场战斗限用一次。' : '未解锁，需通过冒险事件解锁。') + '</p>' +
					this.renderEditor(run, busy) + this.renderBox(run, busy) + this.renderBag(run, busy);
				if (run.notices && run.notices.length) html += '<details class="rogue-notices"><summary>本次战斗的经验与成长明细</summary><ul>' +
					run.notices.map(function (notice) { return '<li>' + escape(noticeText(notice)) + '</li>'; }).join('') + '</ul></details>';
			} else html += '<p class="rogue-caption">开始冒险后，在这里调整队伍、使用道具。</p>';
			return html + this.renderGrowth(state.account, run, busy);
		},
		renderGrowth: function (account, run, busy) {
			var ongoing = run && run.phase !== 'complete';
			var html = '<h3>' + fa('star') + '局外成长 · 余额 ' + account.points + ' 点</h3><p>每战胜一次 Boss 获得 1 点。购买后从下一次冒险生效。</p>';
			if (ongoing) {
				html += '<p class="infobox">' + fa('lock') + '当前冒险进行中，结束或放弃本局后开放加点和初始栏位购买。</p>';
				if (run.phase !== 'battle') html += this.abandonPrompt ?
					'<p>放弃会删除本局队伍和物品，保留永久成长及解锁。' + button('abandon', '', '确认放弃', busy) +
					button('cancelAbandon', '', '继续冒险') + '</p>' : '<p>' + button('askAbandon', '', '放弃本局', busy) + '</p>';
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
		render: function () {
			var state = this.state;
			var busy = !!this.pending || !app.socket || app.socket.readyState !== 1;
			var html = '<div class="pad"><p>' + button('joinRoom', '', '返回首页') + button('refresh', '', '刷新存档') + button('openParty', '', '队伍及背包', false, fa('suitcase')) + '</p>' +
				'<h2>幻想杯肉鸽</h2>' + (state && state.run && state.run.spirit ? '<p class="rogue-spirit-badge">' +
				button('showSpirit', '', state.run.spirit.name, false, '<span class="picon" style="' + Dex.getPokemonIcon(state.run.spirit.species) + '"></span>') +
				'<span class="rogue-caption">点击查看本局效果</span></p>' : '<p>原生对战 · 捕捉伙伴 · 逐层成长</p>');
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (this.pending) html += '<p>正在保存操作… ' + button('sendPending', '', '查询／重发同一请求') + '</p>';
			this.updateParty();
			if (!state) { this.$el.html(html + '<p>正在读取服务器存档…</p></div>'); return; }
			if (state.message) html += '<p class="infobox">' + escape(state.message) + '</p>';
			if (!state.account) { this.$el.html(html + '</div>'); return; }
			var account = state.account, run = state.run;
			var ongoing = run && run.phase !== 'complete';
			if (run) html += '<h3>第 ' + run.floor + ' / 200 层' + (run.node ? ' · ' + escape(run.node.name) : '') + '</h3>' +
				this.renderFloor(run, busy) + this.renderShop(run, busy);
			if (!ongoing) {
				html += '<h3>开始冒险</h3>';
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
				var self = this;
				if (selectedStarters.length) html += '<div class="rogue-starter-builds">' + selectedStarters.map(function (id) {
					var starter = state.starters.find(function (entry) { return entry.id === id; });
					var build = self.starterBuilds[id];
					var nature = build && (state.natures || []).find(function (entry) { return entry.id === build.nature; });
					return '<p><strong>' + escape(localName(starter.species)) + '</strong> · ' + escape(nature ? natureLabel(nature) : '随机性格') +
						' ' + button('configureStarter', id, '初始配置', busy) + '</p>';
				}).join('') + '</div>';
				var counts = state.unlockRequirements || {ordinary: 1, special: 10};
				html += '<div class="rogue-unlock-guide"><strong>如何解锁更多伙伴</strong><ul>' +
					'<li>普通宝可梦：累计捕捉 <b>' + counts.ordinary + ' 次</b>。</li>' +
					'<li>一级神、二级神、幻兽、究极异兽、悖谬宝可梦：累计捕捉 <b>' + (counts.special || 10) + ' 次</b>。</li></ul>' +
					'<p class="rogue-caption">同一进化链合并计数，解锁对应最初形态；捕捉成功立即保存，同层同一只重复捕捉不重复计数。</p></div>';
				html += '<p>' + button('startAdventure', '', '开始新的冒险', busy || !state.configured || !this.selectedStarters.length) + '</p>';
			}
			this.$el.html(html + '</div>');
		}
	});
	this.FantasyRoguePartyRoom = this.Room.extend({
		type: 'fantasyrogueparty', title: '队伍及背包', isSideRoom: true, minWidth: 320, bestWidth: 960,
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
			this.starter = data.starter;
			this.userid = app.user.get('userid');
			var traits = starterTraits(data.starter);
			var build = this.room.starterBuilds[data.starter.id] || {nature: 'random', gender: 'random', ability: 'random', ivs: traits.ivs.max};
			var html = '<form class="rogue-starter-config"><h3>' + escape(localName(data.starter.species)) + ' · 初始配置</h3>' +
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
				'<p class="rogue-config-error" role="alert"></p><p class="buttonbar"><button type="submit" class="button"><strong>确定配置</strong></button> ' +
				'<button type="button" name="close" class="button">保留原配置</button></p></form>';
			this.$el.html(html);
		},
		submit: function (data) {
			var room = this.room, id = this.starter.id;
			var starter = room.state && room.state.starters.find(function (entry) { return entry.id === id && entry.available; });
			if (app.user.get('userid') !== this.userid || !starter || room.pending || room.selectedStarters.indexOf(id) < 0) { this.close(); return; }
			var traits = starterTraits(starter), ivs = {};
			var valid = data.nature === 'random' || traits.natures.indexOf(data.nature) >= 0;
			valid = valid && (data.gender === 'random' || traits.genders.indexOf(data.gender) >= 0 || (data.gender === 'N' && starter.gender === 'N'));
			valid = valid && (data.ability === 'random' || ((traits.abilities || []).indexOf(data.ability) >= 0 &&
				(starter.abilities || []).some(function (ability) { return ability.id === data.ability; })));
			Object.keys(statNames).forEach(function (stat) {
				ivs[stat] = Number(data['iv-' + stat]);
				if (data['iv-' + stat] === '' || !Number.isInteger(ivs[stat]) || ivs[stat] < traits.ivs.min[stat] || ivs[stat] > traits.ivs.max[stat]) valid = false;
			});
			if (!valid) { this.$('.rogue-config-error').text('请选择已解锁的性格、性别、特性，以及范围内的整数个体值。'); return; }
			room.starterBuilds[id] = {nature: data.nature, gender: data.gender, ivs: ivs, ability: data.ability};
			this.close(); room.render();
		}
	});
}).call(this);
