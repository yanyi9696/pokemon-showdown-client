(function () {
	'use strict';

	var FantasyAI = this.FantasyAI = {
		newId: function () {
			return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 14);
		},
		teamSignature: function (team) {
			return JSON.stringify([team.teamid || 0, team.name, team.folder || '', team.format, team.team]);
		},
		/** Keep live object identity through edits; on reload only restore unique, exact matches. */
		reconcileTeams: function (teams, records) {
			var counts = {};
			teams.forEach(function (team) {
				if (team.fantasyAIId) counts[team.fantasyAIId] = (counts[team.fantasyAIId] || 0) + 1;
			});
			var signatures = teams.map(FantasyAI.teamSignature);
			var used = {};
			return teams.map(function (team, index) {
				var signature = signatures[index];
				if (!team.fantasyAIId || counts[team.fantasyAIId] !== 1) {
					var matches = records.filter(function (record) { return record.signature === signature; });
					team.fantasyAIId = matches.length === 1 && !counts[matches[0].id] && !used[matches[0].id] &&
						signatures.indexOf(signature) === signatures.lastIndexOf(signature) ?
						matches[0].id : FantasyAI.newId();
				}
				used[team.fantasyAIId] = true;
				return { id: team.fantasyAIId, signature: signature };
			});
		},
		syncTeams: function () {
			if (!Storage.whenTeamsLoaded.isLoaded) return;
			var records = Storage.prefs('fantasyaiteamids');
			if (!Array.isArray(records)) records = [];
			records = records.filter(function (record) {
				return record && typeof record.id === 'string' && typeof record.signature === 'string';
			});
			// The editor may still have unflushed changes in its active set list.
			Storage.teams.forEach(function (team) { Storage.getPackedTeam(team); });
			Storage.prefs('fantasyaiteamids', FantasyAI.reconcileTeams(Storage.teams, records));
		},
		scope: function () {
			return JSON.stringify([Config.server.id, Config.server.host, Config.server.port, app.user.get('userid') || '']);
		},
		read: function (scope) {
			var all = Storage.prefs('fantasyai') || {};
			var saved = all[scope] || {};
			var pending = saved.pending;
			if (!pending || typeof pending.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(pending.requestId)) pending = null;
			return {
				format: typeof saved.format === 'string' ? saved.format : '',
				trainerId: saved.trainerId || '', difficulty: saved.difficulty === 'hard' ? 'hard' : 'normal',
				teamId: saved.teamId || '', pending: pending,
				battles: saved.battles && typeof saved.battles === 'object' ? saved.battles : {}
			};
		},
		write: function (scope, saved) {
			var all = Storage.prefs('fantasyai') || {};
			if (typeof all !== 'object' || Array.isArray(all)) all = {};
			all[scope] = saved;
			Storage.prefs('fantasyai', all);
		},
		rememberBattle: function (roomid, metadata) {
			if (metadata.userid !== app.user.get('userid')) return;
			var scope = FantasyAI.scope();
			var saved = FantasyAI.read(scope);
			var previous = saved.battles[roomid];
			var pending = saved.pending;
			var matching = pending && pending.trainerId === metadata.trainerId && pending.difficulty === metadata.difficulty &&
				(!pending.format || pending.format === metadata.format);
			saved.battles[roomid] = {
				trainerId: metadata.trainerId, format: metadata.format || (previous && previous.format) || '', difficulty: metadata.difficulty,
				teamId: previous ? previous.teamId : matching ? pending.teamId : ''
			};
			var ids = Object.keys(saved.battles);
			while (ids.length > 30) delete saved.battles[ids.shift()];
			FantasyAI.write(scope, saved);
		},
		rematch: function (roomid, metadata) {
			if (metadata.userid !== app.user.get('userid')) return;
			FantasyAI.rememberBattle(roomid, metadata);
			var room = app.joinRoom('fantasyai');
			room.restoreBattle(roomid);
		}
	};

	this.FantasyAIRoom = this.Room.extend({
		type: 'fantasyai', title: 'AI 挑战', minWidth: 320, bestWidth: 659,
		events: {
			'change select[name=format]': 'changeFormat',
			'change select[name=trainer]': 'changeTrainer',
			'change select[name=difficulty]': 'changeDifficulty',
			'change select[name=team]': 'changeTeam'
		},
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable');
			this.scope = FantasyAI.scope();
			this.wasNamed = app.user.get('named');
			this.guestSelectionChanged = false;
			this.selection = FantasyAI.read(this.scope);
			this.state = null;
			this.loading = false;
			this.error = '';
			this.listenTo(app, 'response:fantasyai', this.receiveState);
			this.listenTo(app, 'response:fantasyaichallenge', this.receiveChallenge);
			this.listenTo(app, 'init:socketopened', this.refresh);
			this.listenTo(app, 'init:socketclosed', this.disconnected);
			this.listenTo(app.user, 'change:userid', this.identityChanged);
			this.listenTo(app.user, 'saveteams', this.teamsChanged);
			Storage.whenTeamsLoaded(this.teamsChanged, this);
			this.render();
		},
		join: function () { this.refresh(); },
		rejoin: function () { this.refresh(); },
		joinRoom: function (roomid) { app.joinRoom(roomid); },
		leave: function () {
			clearTimeout(this.loadTimer);
			clearTimeout(this.challengeTimer);
			this.stopListening();
		},
		show: function () {
			Room.prototype.show.apply(this, arguments);
			this.teamsChanged();
		},
		identityChanged: function () {
			var previous = this.selection;
			this.scope = FantasyAI.scope();
			this.selection = FantasyAI.read(this.scope);
			var hasSavedChoice = this.selection.format || this.selection.trainerId || this.selection.teamId || this.selection.difficulty === 'hard';
			// Returning players recover their own choices; explicit edits made before login take priority.
			if (!this.wasNamed && app.user.get('named') && !this.selection.pending &&
				(this.guestSelectionChanged || !hasSavedChoice)) {
				this.selection.format = previous.format || '';
				this.selection.trainerId = previous.trainerId;
				this.selection.difficulty = previous.difficulty;
				this.selection.teamId = previous.teamId;
				this.save();
			}
			this.wasNamed = app.user.get('named');
			if (this.wasNamed) this.guestSelectionChanged = false;
			this.state = null;
			this.error = '';
			this.refresh();
		},
		teamsChanged: function () {
			FantasyAI.syncTeams();
			this.render();
		},
		save: function () { FantasyAI.write(this.scope, this.selection); },
		disconnected: function () {
			clearTimeout(this.loadTimer);
			clearTimeout(this.challengeTimer);
			this.loading = false;
			this.error = '连接已断开。AI 对局默认保留十分钟；请通过客户端重新连接，再查询已有对局。';
			this.render();
		},
		refresh: function () {
			clearTimeout(this.loadTimer);
			if (!app.socket || app.socket.readyState !== 1 || app.isDisconnected) {
				this.loading = false;
				this.error = '尚未连接服务器。请等待连接完成，或使用客户端的重新连接入口。';
				return this.render();
			}
			this.loading = true;
			this.error = '';
			app.send('/cmd fantasyai' + (this.selection.pending ? ' ' + this.selection.pending.requestId : ''));
			var self = this;
			this.loadTimer = setTimeout(function () {
				self.loading = false;
				self.error = '读取 AI 挑战信息超时。请重试查询；不会自动再次创建对局。';
				self.render();
			}, 10000);
			this.render();
		},
		receiveState: function (data) {
			if (data && data.userid && data.userid !== app.user.get('userid')) return;
			clearTimeout(this.loadTimer);
			this.loading = false;
			if (!data || !Array.isArray(data.trainers) || !Array.isArray(data.activeBattles)) {
				this.state = null;
				this.error = '服务器未返回有效的 AI 挑战信息，请重试或稍后再来。';
				return this.render();
			}
			if (data.protocolVersion !== 2) {
				this.state = null;
				this.error = '服务器版本尚不支持这个 AI 挑战入口，请更新服务器后重试。';
				return this.render();
			}
			if (!Array.isArray(data.formats)) {
				this.state = null;
				this.error = '服务器未返回可选赛制，请重试查询。';
				return this.render();
			}
			this.state = data;
			if (!this.selection.format && this.selection.trainerId) {
				var previousTrainer = data.trainers.find(function (entry) { return entry.id === this.selection.trainerId; }, this);
				if (previousTrainer && data.formats.some(function (entry) { return entry.id === previousTrainer.format; })) {
					this.selection.format = previousTrainer.format;
					this.save();
				}
			}
			if (data.challenge) this.receiveChallenge(data.challenge);
			this.render();
		},
		receiveChallenge: function (result) {
			var pending = this.selection.pending;
			if (!result || !pending || result.requestId !== pending.requestId ||
				(result.userid && result.userid !== app.user.get('userid'))) return;
			clearTimeout(this.challengeTimer);
			if (result.status === 'pending') {
				this.error = '服务器仍在创建对局，请稍后点击“刷新 / 查询结果”。';
			} else if (result.status === 'success' && /^battle-[a-z0-9-]+$/.test(result.roomid)) {
				this.selection.battles[result.roomid] = {
					trainerId: pending.trainerId, format: pending.format || this.selection.format,
					difficulty: pending.difficulty, teamId: pending.teamId
				};
				this.selection.pending = null;
				if (this.state) this.state.activeBattles = [result.roomid];
				this.error = '';
				this.save();
				app.joinRoom(result.roomid);
				return;
			} else if (result.status === 'error' || result.status === 'unknown') {
				this.selection.pending = null;
				this.error = result.message || '未查到这次创建请求。请先检查已有对局，再手动开始新的挑战。';
			}
			this.save();
			this.render();
		},
		selectedTeam: function () {
			var id = this.selection.teamId;
			return Storage.teams.find(function (team) { return team.fantasyAIId === id; });
		},
		selectedTrainer: function () {
			var id = this.selection.trainerId;
			return this.availableTrainers().find(function (trainer) { return trainer.id === id; });
		},
		selectedFormat: function () {
			var format = this.selection.format;
			return this.state && this.state.formats.find(function (entry) { return entry.id === format; });
		},
		availableTrainers: function () {
			var format = this.selectedFormat();
			return format ? this.state.trainers.filter(function (trainer) { return trainer.format === format.id; }) : [];
		},
		changeFormat: function (e) {
			if (!app.user.get('named')) this.guestSelectionChanged = true;
			this.selection.format = e.currentTarget.value;
			if (!this.selectedTrainer()) this.selection.trainerId = '';
			this.error = '';
			this.save(); this.render();
		},
		changeTrainer: function (e) {
			if (!app.user.get('named')) this.guestSelectionChanged = true;
			this.selection.trainerId = e.currentTarget.value;
			this.error = '';
			this.save(); this.render();
		},
		changeDifficulty: function (e) {
			if (!app.user.get('named')) this.guestSelectionChanged = true;
			this.selection.difficulty = e.currentTarget.value === 'hard' ? 'hard' : 'normal';
			this.save(); this.render();
		},
		changeTeam: function (e) {
			if (!app.user.get('named')) this.guestSelectionChanged = true;
			this.selection.teamId = e.currentTarget.value;
			this.error = '';
			this.save(); this.render();
		},
		login: function () { app.addPopup(LoginPopup); },
		editTeam: function () {
			var team = this.selectedTeam();
			var room = app.joinRoom('teambuilder');
			if (team) room.edit('' + Storage.teams.indexOf(team));
		},
		restoreBattle: function (roomid) {
			this.selection = FantasyAI.read(this.scope);
			var previous = this.selection.battles[roomid];
			if (!previous) return;
			this.selection.format = previous.format || '';
			this.selection.trainerId = previous.trainerId;
			this.selection.difficulty = previous.difficulty;
			this.selection.teamId = previous.teamId;
			this.save();
			this.refresh();
		},
		startChallenge: function () {
			FantasyAI.syncTeams();
			var trainer = this.selectedTrainer();
			var team = this.selectedTeam();
			if (this.loading || this.selection.pending || !this.state || !this.state.enabled ||
				!trainer || !team || this.state.activeBattles.length) return;
			if (!app.user.get('named')) return this.login();
			if (!app.socket || app.socket.readyState !== 1 || app.isDisconnected) return this.disconnected();
			if (!Storage.getPackedTeam(team) || Storage.getPackedTeam(team).length > 20000) {
				this.error = '所选队伍为空或数据过长，请先在队伍编辑器修改。';
				return this.render();
			}
			var scope = this.scope;
			var pending = {
				requestId: FantasyAI.newId(), trainerId: trainer.id, format: this.selection.format, difficulty: this.selection.difficulty,
				teamId: team.fantasyAIId
			};
			this.selection.pending = pending;
			this.save(); this.render();
			var self = this;
			app.sendTeam(team, function () {
				if (self.scope !== scope || self.selectedTeam() !== team || self.selection.pending !== pending ||
					!app.socket || app.socket.readyState !== 1) return;
				app.send('/fantasyai challenge ' + trainer.id + ', ' + pending.difficulty + ', ' + pending.requestId + ', ' + pending.format);
			});
			this.challengeTimer = setTimeout(function () {
				if (self.scope === scope && self.selection.pending === pending) self.refresh();
			}, 12000);
		},
		render: function () {
			var escape = BattleLog.escapeHTML;
			var selection = this.selection;
			if (!selection) return;
			var trainer = this.selectedTrainer();
			var format = this.selectedFormat();
			var trainers = this.availableTrainers();
			var team = this.selectedTeam();
			var state = this.state;
			var pending = !!selection.pending;
			var unavailable = !state || !state.enabled;
			var connected = app.socket && app.socket.readyState === 1 && !app.isDisconnected;
			var disabled = this.loading || pending || unavailable || !connected;
			var buf = '<div class="pad fantasy-ai"><p><button class="button" name="joinRoom" value="">返回首页</button></p><h2>AI 挑战</h2>';
			buf += '<p>选择赛制、训练家、难度和自己的队伍，开始不计天梯的六对六对战。</p>';
			buf += '<div role="status" aria-live="polite">';
			if (this.loading) buf += '<p><em>正在读取训练家和已有对局…</em></p>';
			if (this.error) buf += '<p class="message-error fantasy-ai-error">' + escape(this.error) + '</p>';
			if (state && !state.enabled) buf += '<p class="message-error">AI 挑战尚未开放。</p>';
			else if (state && !state.trainers.length) buf += '<p class="message-error">目前没有可挑战的 AI 训练家。</p>';
			if (pending) buf += '<p>正在创建或确认对局结果，请稍候。刷新只查询状态，不会重复开战。</p>';
			if (state && state.activeBattles.length) {
				buf += '<p>你已有未结束的 AI 对局：</p><p>';
				state.activeBattles.forEach(function (roomid) {
					buf += '<button class="button" name="joinRoom" value="' + escape(roomid) + '">返回已有对局</button> ';
				});
				buf += '</p>';
			}
			buf += '</div><p><button class="button" name="refresh"' + (this.loading ? ' disabled' : '') + '>刷新 / 查询结果</button></p>';
			buf += '<p><label class="label" for="fantasy-ai-format">赛制</label><select class="select" id="fantasy-ai-format" name="format"' + (disabled ? ' disabled' : '') + '><option value="">请选择赛制</option>';
			if (state) state.formats.forEach(function (entry) {
				buf += '<option value="' + escape(entry.id) + '"' + (entry.id === selection.format ? ' selected' : '') + '>' + escape(entry.name) + '</option>';
			});
			buf += '</select></p>';
			if (selection.format && state && !format) buf += '<p class="message-error">上次选择的赛制已不可用，请重新选择。</p>';
			if (state && state.enabled && format && !trainers.length) buf += '<p class="message-error">这个赛制目前没有可挑战的 AI 训练家，请选择其他赛制。</p>';
			buf += '<p><label class="label" for="fantasy-ai-trainer">训练家</label><select class="select" id="fantasy-ai-trainer" name="trainer"' + (disabled || !format || !trainers.length ? ' disabled' : '') + '><option value="">' + (format ? '请选择训练家' : '请先选择赛制') + '</option>';
			trainers.forEach(function (entry) {
				buf += '<option value="' + escape(entry.id) + '"' + (entry.id === selection.trainerId ? ' selected' : '') + '>' + escape(entry.name) + '</option>';
			});
			buf += '</select></p>';
			if (selection.trainerId && state && state.enabled && !trainer) buf += '<p class="message-error">上次选择的训练家已停用、不存在或不支持所选赛制，请重新选择。</p>';
			if (trainer) {
				buf += '<div class="infobox fantasy-ai-trainer"><img width="80" height="80" src="' + escape(Dex.resolveAvatar(trainer.avatar || 'unknown')) + '" alt="训练家头像" />';
				buf += '<div><strong>' + escape(trainer.name) + '</strong><p>' + escape(trainer.description || '暂无简介。') + '</p><p>风格：' + escape({ balanced: '均衡', aggressive: '强攻', defensive: '稳健' }[trainer.style] || trainer.style) + '<br />赛制：' + BattleLog.escapeFormat(trainer.format) + '</p>';
				if (trainer.developmentOnly) buf += '<small>开发测试内容（非正式训练家）</small>';
				buf += '</div></div>';
			}
			buf += '<p><label class="label" for="fantasy-ai-difficulty">难度</label><select class="select" id="fantasy-ai-difficulty" name="difficulty" aria-describedby="fantasy-ai-info"' + (pending ? ' disabled' : '') + '><option value="normal"' + (selection.difficulty === 'normal' ? ' selected' : '') + '>普通</option><option value="hard"' + (selection.difficulty === 'hard' ? ' selected' : '') + '>高难</option></select></p>';
			buf += '<p id="fantasy-ai-info"><small>' + (selection.difficulty === 'hard' ? 'AI 开局获知你全队的初始配置和精确能力值，但不读取当前隐藏状态或尚未执行的行动。' : 'AI 根据公开的队伍预览和对战信息进行判断，不预先获知你的完整配置。') + '</small></p>';
			buf += '<p><label class="label" for="fantasy-ai-team">我的队伍</label><select class="select" id="fantasy-ai-team" name="team"' + (pending || !Storage.whenTeamsLoaded.isLoaded ? ' disabled' : '') + '><option value="">请选择队伍</option>';
			Storage.teams.forEach(function (entry) {
				buf += '<option value="' + escape(entry.fantasyAIId) + '"' + (entry.fantasyAIId === selection.teamId ? ' selected' : '') + '>' + escape(entry.name) + ' — ' + escape(entry.format || '未指定赛制') + '</option>';
			});
			buf += '</select></p>';
			if (team) buf += '<div class="teamselect fantasy-ai-team">' + TeamPopup.renderTeam(Storage.teams.indexOf(team)) + '</div>';
			if (!Storage.whenTeamsLoaded.isLoaded) buf += '<p>正在读取队伍…</p>';
			else if (!Storage.teams.length) buf += '<p class="message-error">你还没有队伍。请先进入队伍编辑器创建或导入六只宝可梦，再返回 AI 挑战选择。</p>';
			if (Storage.whenTeamsLoaded.isLoaded && selection.teamId && !team) buf += '<p class="message-error">上次选择的队伍已删除或无法可靠对应，请重新选择。</p>';
			buf += '<p><button class="button" name="editTeam">' + (team ? '修改所选队伍' : '打开队伍编辑器') + '</button></p>';
			if (!app.user.get('named')) buf += '<p>请先按客户端的正常规则选择用户名或登录。</p><p><button class="button" name="login">选择用户名 / 登录</button></p>';
			buf += '<p><button class="button" name="startChallenge"' + (disabled || !trainer || !team || !app.user.get('named') || state && state.activeBattles.length ? ' disabled' : '') + '><strong>开始挑战</strong></button></p>';
			buf += '<p><small>两档使用相同队伍、策略和计算预算。队伍由服务器按所选 FC 赛制与六对六规则校验。断线后默认保留十分钟，不会替你自动出招。</small></p></div>';
			this.$el.html(buf);
		}
	});
}).call(this);
