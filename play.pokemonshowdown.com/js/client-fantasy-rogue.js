(function () {
	'use strict';
	var escape = BattleLog.escapeHTML;
	var globals = this;
	function localName(name) {
		return globals.translations && globals.translations[name] || name;
	}
	var statNames = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
	var kindNames = {wild: '野生战斗', elite: '精英', trainer: '训练家', rest: '宝可梦中心', boss: 'Boss', reward: '奖励'};
	var itemKinds = {ball: '精灵球', heal: '恢复道具', revive: '复活道具', cure: '状态恢复', ether: 'PP 恢复', candy: '经验糖果', evolution: '进化道具', held: '携带道具'};
	function dex() { return Dex.mod ? Dex.mod('gen9fantasy') : Dex; }
	function idOf(name) { return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
	function fa(name) { return '<i class="fa fa-' + name + '" aria-hidden="true"></i> '; }
	function itemIcon(item) {
		var frame = item.id.indexOf('expcandy') === 0 ? 'candy' : item.id === 'linkingcord' ? 'cord' :
			['potion', 'superpotion', 'hyperpotion', 'revive', 'fullheal', 'elixir'].indexOf(item.id) >= 0 ? item.id : '';
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
		var maximum = move.noPPBoosts || move.isZ ? move.pp : Math.floor(move.pp * 8 / 5);
		return '<div class="rogue-move-row"><strong class="rogue-move-name">' + escape(localName(move.name)) + '</strong>' +
			'<span class="rogue-move-icons">' + typeIcons([move.type || 'Normal']) + ' ' +
			(Dex.getCategoryIcon ? Dex.getCategoryIcon(move.category) : escape(localName(move.category || ''))) + '</span>' +
			'<span><small>威力</small>' + (move.basePower || '—') + '</span>' +
			'<span><small>命中率</small>' + (move.accuracy === true ? '—' : (move.accuracy || '—') + '%') + '</span>' +
			'<span><small>PP</small>' + (pp ? pp.pp + '/' + pp.maxpp : maximum || '—') + '</span>' +
			'<span class="rogue-move-desc">' + escape(localName(move.shortDesc || move.desc || '暂无招式简介')) + '</span></div>';
	}
	function itemDescription(item) {
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
	function loot(reward, items) {
		if (!reward) return '';
		var html = '<div class="rogue-loot">';
		if (reward.money) html += '<span>' + fa('money') + '金币 <strong>+' + reward.money + '</strong></span>';
		Object.keys(reward.items || {}).forEach(function (id) {
			var item = items.filter(function (entry) { return entry.id === id; })[0] || {id: id, name: id};
			html += '<span>' + itemIcon(item) + escape(localName(item.name)) + ' <strong>×' + reward.items[id] + '</strong></span>';
		});
		if (reward.points) html += '<span class="rogue-growth-reward">' + fa('star') + '成长点 <strong>+' + reward.points + '</strong></span>';
		return html + '</div>';
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
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue');
			this.state = null;
			this.pending = null;
			this.error = '';
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
		show: function () { Room.prototype.show.apply(this, arguments); this.refresh(); },
		leave: function () { clearTimeout(this.timer); this.stopListening(); },
		joinRoom: function (id) { app.joinRoom(id); },
		identityChanged: function () { this.selectedMember = null; this.itemTarget = null; this.state = null; this.pending = null; this.error = ''; this.refresh(); },
		disconnected: function () {
			clearTimeout(this.timer);
			this.pending = null;
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
			var focusFloor = incoming && (!previous || previous.id !== incoming.id || previous.floor !== incoming.floor ||
				JSON.stringify((previous.pendingMoves || [])[0]) !== JSON.stringify((incoming.pendingMoves || [])[0]) ||
				!!previous.pendingCapture !== !!incoming.pendingCapture);
			this.state = state;
			this.render();
			if (focusFloor && this.$el.scrollTop) this.$el.scrollTop(0);
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
		startAdventure: function () {
			var starters = this.$('input[name=starter]:checked').map(function () { return this.value; }).get();
			this.submit('start', {starters: starters});
		},
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
			if (run.lastReward && (run.lastReward.money || run.lastReward.points || Object.keys(run.lastReward.items || {}).length)) {
				html += '<div class="rogue-receipt"><strong>' + fa('check-circle') + '已到账 · 第 ' + run.lastReward.floor + ' 层</strong>' +
					loot(run.lastReward, this.state.items) + '</div>';
			}
			if (run.pendingCapture) {
				html += '<h3>队伍已满 · 安置新伙伴</h3><p>捕获了 ' + escape(localName(run.pendingCapture.set.species)) +
					' Lv.' + run.pendingCapture.set.level + '。捕捉解锁已保存。</p><p>';
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
			if (run.phase === 'choose') {
				html += '<h3>选择本层路线</h3><div class="rogue-routes">';
				(run.choices || []).forEach(function (node) {
					html += '<div class="rogue-route"><strong>' + escape(node.name) + '</strong><small>' + kindNames[node.kind] +
						'</small><p class="rogue-caption">整层完成奖励</p>' + loot(node.reward, this.state.items) +
						button('act', 'select:' + node.id, '选择此路线', busy) + '</div>';
				}, this);
				html += '</div>';
				if (!(run.choices || []).length) html += '<p>本层内容等待配置，存档已保留。</p>';
			} else if (run.phase === 'ready') {
				html += '<h3>本层战斗 · ' + (run.encounter + 1) + ' / ' + run.encounters + '</h3>' +
					button('act', 'battle', '进入第 ' + (run.encounter + 1) + ' / ' + run.encounters + ' 场战斗', busy);
			} else if (run.phase === 'battle') {
				html += '<h3>战斗进行中</h3>' + button('joinRoom', run.roomid, '返回当前战斗', !run.roomid);
			} else if (run.phase === 'failed') {
				html += '<h3>本层挑战失败</h3><p>免费重试会恢复入层时的队伍、经验、道具和货币。已保存的捕捉解锁保留，同一只不重复计数。</p>' +
					button('act', 'retry', '免费重试整层', busy);
			} else if (run.phase === 'rest') {
				html += '<h3>宝可梦中心</h3><p>无限次恢复存活伙伴的 HP、全部已学招式 PP 和异常状态。倒下伙伴需要先使用活力碎片。</p>' +
					button('act', 'heal', '恢复存活伙伴', busy, fa('heart')) +
					button('act', 'continue', '补给完成，进入下一层', busy);
			} else if (run.phase === 'reward') {
				html += '<h3>领取本层奖励</h3>' + button('act', 'continue', '领取本层奖励并继续', busy, fa('gift'));
			} else if (run.phase === 'complete') {
				html += '<h3>已完成 200 层冒险！</h3>';
			}
			if (run.node && run.node.reward && ['ready', 'battle', 'settlement', 'reward', 'failed'].indexOf(run.phase) >= 0) {
				html += '<div class="rogue-reward-preview"><strong>' + fa('gift') + '完成整层可获得</strong>' +
					loot(run.node.reward, this.state.items) + '</div>';
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
				'<div>' + typeIcons(mon.types || species.types) + '</div><strong>HP ' + mon.hp + ' / ' + mon.maxhp + '</strong>' +
				'<meter min="0" max="' + mon.maxhp + '" value="' + mon.hp + '" aria-label="生命值"></meter>' +
				'<small>' + (mon.hp ? escape(localName(mon.status || '状态正常')) : '已倒下') + '</small></div>';
			var exp = mon.experienceProgress;
			var ability = dex().abilities ? dex().abilities.get(mon.set.ability || '') : {name: mon.set.ability || ''};
			var item = this.state.items.filter(function (entry) { return entry.id === idOf(mon.set.item); })[0];
			html += '<div class="rogue-member-details"><div class="rogue-details-line"><span>等级<br /><b>' + mon.set.level +
				'</b></span><span>性别<br /><b>' + escape(mon.set.gender || '—') + '</b></span><span>性格<br /><b>' +
				escape(localName(mon.set.nature || '—')) + '</b></span></div>' +
				(exp ? '<p class="rogue-exp">经验：' + (exp.needed ? exp.current + ' / ' + exp.needed + '（下一级）' : '已达 100 级') + '</p>' : '') +
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
					(evo.item ? '（消耗进化道具）' : ''), locked || !mon.hp || (evo.item && !run.bag[evo.item]));
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
		renderBag: function (run, busy) {
			var usable = editable(run) && !busy;
			var itemTarget = this.itemTarget || this.selectedMember;
			var html = '<section class="rogue-bag"><h3>' + fa('suitcase') + '背包</h3>' +
				'<div class="rogue-wallet">' + fa('money') + '金币 <strong>' + run.money + '</strong></div>' +
				'<p><label>道具目标：<select name="target">' + run.team.map(function (mon) {
					return '<option value="' + escape(mon.id) + '"' + (mon.id === itemTarget ? ' selected' : '') + '>' +
						escape(localName(mon.set.species)) + ' · Lv.' + mon.set.level + ' · HP ' + mon.hp + '/' + mon.maxhp + '</option>';
				}).join('') + '</select></label></p><div class="rogue-inventory">';
			var held = this.state.items.filter(function (item) { return run.bag[item.id] > 0; });
			held.forEach(function (item) {
				html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
					'</strong><b>×' + run.bag[item.id] + '</b></div><small>' + itemKinds[item.kind] + '</small><p>' + escape(itemDescription(item)) + '</p>';
				if (['ball', 'evolution', 'held'].indexOf(item.kind) < 0) html += button('useItem', item.id, '使用', !usable);
				if (item.kind === 'held') html += button('openHeldItems', '', '在队伍中装备', !run.team.length);
				html += '</div>';
			});
			if (!held.length) html += '<p class="rogue-caption">暂无物品</p>';
			html += '</div></section>';
			if (run.phase === 'rest') {
				html += '<section class="rogue-shop"><h3>' + fa('shopping-cart') + '宝可梦中心商店</h3><div class="rogue-inventory">';
				this.state.items.filter(function (item) { return !this.state.shopItems || this.state.shopItems.indexOf(item.id) >= 0; }, this).forEach(function (item) {
					html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
						'</strong></div><p>' + escape(itemDescription(item)) + '</p><p>' + fa('money') + '<b>' + item.price + '</b> 金币 · 持有 ' +
						(run.bag[item.id] || 0) + '</p>' + button('act', 'buy:' + item.id, '购买', !usable || run.money < item.price) + '</div>';
				});
				html += '</div></section>';
			}
			return html;
		},
		render: function () {
			var state = this.state;
			var busy = !!this.pending || !app.socket || app.socket.readyState !== 1;
			var html = '<div class="pad"><p>' + button('joinRoom', '', '返回首页') + button('refresh', '', '刷新存档') + '</p>' +
				'<h2>幻想杯肉鸽</h2><p>原生对战 · 捕捉伙伴 · 逐层成长</p>';
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (this.pending) html += '<p>正在保存操作… ' + button('sendPending', '', '查询／重发同一请求') + '</p>';
			if (!state) { this.$el.html(html + '<p>正在读取服务器存档…</p></div>'); return; }
			if (state.message) html += '<p class="infobox">' + escape(state.message) + '</p>';
			if (!state.account) { this.$el.html(html + '</div>'); return; }
			var account = state.account, run = state.run;
			var ongoing = run && run.phase !== 'complete';
			if (run) {
				html += '<h3>第 ' + run.floor + ' / 200 层' + (run.node ? ' · ' + escape(run.node.name) : '') + '</h3>' +
					this.renderFloor(run, busy) + '<p class="rogue-boosts">本局永久加成：' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + run.boosts[stat]; }).join(' / ') + '</p>' +
					'<p class="rogue-tera">' + fa(run.teraUnlocked ? 'diamond' : 'lock') + '太晶化：' +
					(run.teraUnlocked ? '本局已解锁，每场战斗限用一次。' : '未解锁，需通过冒险事件解锁。') + '</p>' +
					this.renderEditor(run, busy) + this.renderBag(run, busy);
				if (run.notices && run.notices.length) html += '<details class="rogue-notices"><summary>本次战斗的经验与成长明细</summary><ul>' +
					run.notices.map(function (notice) { return '<li>' + escape(noticeText(notice)) + '</li>'; }).join('') + '</ul></details>';
			}
			html += '<h3>' + fa('star') + '局外成长 · 余额 ' + account.points + ' 点</h3><p>每战胜一次 Boss 获得 1 点。购买后从下一次冒险生效。</p>';
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
				html += '</div><p>初始栏位 ' + account.slots + ' / 6 ' + button('act', 'upgrade:slot', '花费 20 点扩展', busy || account.points < 20 || account.slots >= 6) + '</p>';
				html += '<h3>开始冒险</h3><p>可携带 ' + account.slots + ' 只初始伙伴。</p><div class="rogue-starters">';
				var renderStarter = function (starter) {
					html += '<label><input type="checkbox" name="starter" value="' + escape(starter.id) + '"' + (starter.available ? '' : ' disabled') + ' />' +
						'<span class="picon" style="' + Dex.getPokemonIcon(starter.species) + '"></span>' + escape(localName(starter.species)) +
						(starter.available ? '' : '（未解锁，捕捉 ' + (account.captures[starter.id] || 0) + ' 次）') + '</label> ';
				};
				state.starters.filter(function (starter) { return starter.available; }).forEach(renderStarter);
				html += '</div>';
				var lockedStarters = state.starters.filter(function (starter) { return !starter.available; });
				if (lockedStarters.length) {
					html += '<details><summary>捕捉可解锁更多伙伴（' + lockedStarters.length + ' 种）</summary><div class="rogue-starters">';
					lockedStarters.forEach(renderStarter);
					html += '</div></details>';
				}
				html += '<p>' + button('startAdventure', '', '开始新的冒险', busy || !state.configured) + '</p>';
			}
			this.$el.html(html + '</div>');
		}
	});
}).call(this);
