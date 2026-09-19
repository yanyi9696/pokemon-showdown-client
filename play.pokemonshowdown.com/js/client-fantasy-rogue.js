(function () {
	'use strict';
	var escape = BattleLog.escapeHTML;
	var statNames = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
	var kindNames = {wild: '野生战斗', elite: '精英', trainer: '训练家', rest: '宝可梦中心', boss: '首领', reward: '奖励'};
	function button(name, value, label, disabled) {
		return '<button class="button" name="' + name + '" value="' + escape(value || '') + '"' +
			(disabled ? ' disabled' : '') + '>' + escape(label) + '</button> ';
	}
	this.FantasyRogueRoom = this.Room.extend({
		type: 'fantasyrogue', title: '幻想杯肉鸽', minWidth: 320, bestWidth: 659,
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue');
			this.state = null;
			this.pending = null;
			this.error = '';
			this.listenTo(app, 'response:fantasyrogue', this.receiveState);
			this.listenTo(app, 'response:fantasyrogueaction', this.receiveAction);
			this.listenTo(app, 'init:socketopened', this.refresh);
			this.listenTo(app, 'init:socketclosed', this.disconnected);
			this.listenTo(app.user, 'change:userid', this.identityChanged);
			this.render();
		},
		join: function () { this.refresh(); },
		rejoin: function () { this.refresh(); },
		show: function () { Room.prototype.show.apply(this, arguments); this.refresh(); },
		leave: function () { clearTimeout(this.timer); this.stopListening(); },
		joinRoom: function (id) { app.joinRoom(id); },
		identityChanged: function () { this.state = null; this.pending = null; this.error = ''; this.refresh(); },
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
			this.state = state;
			this.render();
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
			this.submit('use', {value: id, member: this.$('select[name=target]').val()});
		},
		askAbandon: function () { this.abandonPrompt = true; this.render(); },
		cancelAbandon: function () { this.abandonPrompt = false; this.render(); },
		abandon: function () { this.abandonPrompt = false; this.submit('abandon'); },
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
			var account = state.account;
			var run = state.run;
			if (run) {
				html += '<h3>第 ' + run.floor + ' / 200 层' + (run.node ? ' · ' + escape(run.node.name) : '') + '</h3>' +
					'<p>货币：<strong>' + run.money + '</strong> · 本局永久加成：' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + run.boosts[stat]; }).join(' / ') + '</p>';
				html += '<ul class="rogue-party">' + run.team.map(function (mon) {
					return '<li><span class="picon" style="' + Dex.getPokemonIcon(mon.set.species) + '"></span> ' +
						escape(mon.set.species) + ' Lv.' + mon.set.level + ' — HP ' + mon.hp + '/' + mon.maxhp +
						(mon.hp ? ' ' + escape(mon.status) : '（倒下）') + '<br /><small>' +
						mon.pp.map(function (move) { return escape(Dex.moves.get(move.id).name) + ' ' + move.pp + '/' + move.maxpp; }).join(' · ') + '</small></li>';
				}).join('') + '</ul>';
				if (run.phase === 'choose') {
					html += '<p>' + (run.choices.length ? '选择本层路线：' : '本层正式内容等待配置，存档已保留。') + '</p><p>';
					run.choices.forEach(function (node) {
						html += button('act', 'select:' + node.id, node.name + ' · ' + kindNames[node.kind], busy);
					});
					html += '</p>';
				} else if (run.phase === 'ready') {
					html += '<p>' + button('act', 'battle', '进入第 ' + (run.encounter + 1) + ' / ' + run.encounters + ' 场战斗', busy) + '</p>';
				} else if (run.phase === 'battle') {
					html += '<p>' + button('joinRoom', run.roomid, '返回当前战斗', !run.roomid) + '</p>';
				} else if (run.phase === 'failed') {
					html += '<p>本层挑战失败。免费重试会恢复入层时的队伍、道具和货币；已保存的捕捉解锁保留，同一只不重复计数。</p>' +
						'<p>' + button('act', 'retry', '免费重试整层', busy) + '</p>';
				} else if (run.phase === 'rest') {
					html += '<h3>宝可梦中心</h3><p>恢复存活伙伴的 HP、PP 和异常状态。可以在本层反复恢复。</p><p>' +
						button('act', 'heal', '恢复存活伙伴', busy) + '</p><p><label>道具目标：<select name="target">' +
						run.team.map(function (mon) { return '<option value="' + escape(mon.id) + '">' + escape(mon.set.species) + ' · HP ' + mon.hp + '/' + mon.maxhp + '</option>'; }).join('') + '</select></label></p>';
					html += '<ul>' + state.items.map(function (item) {
						return '<li>' + escape(item.name) + ' · ' + item.price + ' 金币 · 持有 ' + (run.bag[item.id] || 0) + ' ' +
							button('act', 'buy:' + item.id, '购买', busy || run.money < item.price) +
							(item.kind === 'ball' ? '' : button('useItem', item.id, '使用', busy || !run.bag[item.id])) + '</li>';
					}).join('') + '</ul><p>' + button('act', 'continue', '补给完成，进入下一层', busy) + '</p>';
				} else if (run.phase === 'reward') {
					html += '<p>' + button('act', 'continue', '领取本层奖励并继续', busy) + '</p>';
				} else if (run.phase === 'complete') {
					html += '<p class="infobox">已完成 200 层冒险！</p>';
				}
				if (run.phase !== 'rest') html += '<p>背包：' + (state.items.filter(function (item) { return run.bag[item.id]; }).map(function (item) {
					return escape(item.name) + ' × ' + run.bag[item.id];
				}).join(' · ') || '空') + '</p>';
				if (run.phase !== 'battle' && run.phase !== 'complete') html += this.abandonPrompt ?
					'<p>放弃会删除本局队伍和物品，保留永久成长及解锁。' + button('abandon', '', '确认放弃', busy) + button('cancelAbandon', '', '继续冒险') + '</p>' :
					'<p>' + button('askAbandon', '', '放弃本局', busy) + '</p>';
			}
			if (!run || run.phase === 'complete') {
				html += '<h3>开始冒险</h3><p>可携带 ' + account.slots + ' 只初始伙伴。</p><div class="rogue-starters">';
				state.starters.forEach(function (starter) {
					html += '<label><input type="checkbox" name="starter" value="' + escape(starter.id) + '"' + (starter.available ? '' : ' disabled') + ' />' +
						'<span class="picon" style="' + Dex.getPokemonIcon(starter.species) + '"></span>' + escape(starter.species) +
						(starter.available ? '' : '（未解锁，捕捉 ' + (account.captures[starter.id] || 0) + ' 次）') + '</label> ';
				});
				html += '</div><p>' + button('startAdventure', '', '开始新的冒险', busy || !state.configured) + '</p>';
			}
			html += '<h3>局外成长 · 余额 ' + account.points + ' 点</h3><p>购买后从下一次冒险生效。每通关整层获得 1 点。</p><div class="rogue-upgrades">';
			Object.keys(statNames).forEach(function (stat) {
				html += '<p>' + statNames[stat] + ' +' + account.boosts[stat] + ' / 10 ' +
					button('act', 'upgrade:' + stat, '花费 1 点提升', busy || !account.points || account.boosts[stat] >= 10) + '</p>';
			});
			html += '</div><p>初始栏位 ' + account.slots + ' / 6 ' + button('act', 'upgrade:slot', '花费 20 点扩展', busy || account.points < 20 || account.slots >= 6) + '</p></div>';
			this.$el.html(html);
		}
	});
}).call(this);
