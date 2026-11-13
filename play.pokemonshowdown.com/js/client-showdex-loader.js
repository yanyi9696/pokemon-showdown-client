/* global window, document */
(function () {
	'use strict';
	if (window.FantasyShowdex) return;
	var entry = document.currentScript;
	var bundle = entry && entry.getAttribute('data-bundle-src');
	var learnsets = window.Gen9fantasyLearnsetsAsset;
	var app;
	var state = 'idle';
	var pending;
	var manual = false;
	var roomid = 'view-hellodex';
	var loader = window.FantasyShowdex = {install: install, load: load};
	function render() {
		var room = app && app.rooms[roomid];
		if (!room || room.el.dataset.fantasyShowdexPlaceholder !== 'true') return;
		var message = '打开伤害计算器与队伍工具。';
		var button = '<button class="button" name="loadShowdex">打开 Showdex</button>';
		if (state === 'loading') {
			message = '正在加载 Showdex…';
			button = '';
		} else if (state === 'failed') {
			message = 'Showdex 下载失败，请检查连接后重试。对战可以继续。';
			button = '<button class="button" name="loadShowdex">重试加载</button>';
		} else if (state === 'initfailed') {
			message = 'Showdex 未能完成初始化。请刷新页面后重试；当前对战可以继续。';
			button = '';
		}
		room.$el.html('<div class="pad"><h2>Hellodex</h2><p role="status">' + message + '</p>' + button + '</div>');
	}
	function load(focus) {
		manual = manual || !!focus;
		if (state === 'ready') {
			if (focus) app.focusRoomRight(roomid);
			return Promise.resolve(true);
		}
		if (pending) return pending;
		if (!bundle || state === 'initfailed') return Promise.resolve(false);
		state = 'loading';
		render();
		pending = new Promise(function (resolve) {
			var script = document.createElement('script');
			var prerequisite;
			var preload;
			var timer;
			var settled = false;
			function finish(ok, networkFailure) {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				window.removeEventListener('fantasyshowdexready', ready);
				window.removeEventListener('fantasyshowdexerror', failed);
				script.onload = script.onerror = null;
				if (prerequisite) prerequisite.onload = prerequisite.onerror = null;
				if (preload) preload.remove();
				state = ok ? 'ready' : networkFailure ? 'failed' : 'initfailed';
				if (networkFailure) {
					script.remove();
					if (prerequisite) prerequisite.remove();
				}
				render();
				if (ok && manual && app.rooms[roomid]) app.focusRoomRight(roomid);
				resolve(ok);
			}
			function ready() { finish(true, false); }
			function failed() { finish(false, false); }
			window.addEventListener('fantasyshowdexready', ready);
			window.addEventListener('fantasyshowdexerror', failed);
			script.src = bundle;
			script.async = true;
			script.setAttribute('data-fantasy-showdex', '');
			script.onerror = function () { finish(false, !window.__SHOWDEX_INIT); };
			// A connection can stall without load/error. Keep the entry recoverable then too.
			timer = setTimeout(function () { finish(false, !window.__SHOWDEX_INIT); }, 30000);
			// The script load event precedes asynchronous settings/locale initialization.
			script.onload = function () {
				if (settled) return;
				clearTimeout(timer);
				timer = setTimeout(failed, 30000);
			};
			// The all-generations move picker needs raw learnsets before React mounts.
			// Old pages already provide this export in their complete data script.
			if (learnsets && !Object.prototype.hasOwnProperty.call(window, 'Gen9fantasyLearnsets')) {
				// Fetch the calculator concurrently, but execute only after its data exists.
				preload = document.createElement('link');
				preload.rel = 'preload';
				preload.as = 'script';
				preload.href = bundle;
				document.head.appendChild(preload);
				prerequisite = document.createElement('script');
				prerequisite.src = learnsets;
				prerequisite.async = true;
				prerequisite.onerror = function () { finish(false, true); };
				prerequisite.onload = function () {
					if (settled) return;
					prerequisite.onload = prerequisite.onerror = null;
					if (!Object.prototype.hasOwnProperty.call(window, 'Gen9fantasyLearnsets')) {
						finish(false, true);
						return;
					}
					document.head.appendChild(script);
				};
				document.head.appendChild(prerequisite);
			} else {
				document.head.appendChild(script);
			}
		});
		var request = pending;
		request.then(function () { if (pending === request) pending = null; });
		return request;
	}
	function install(client) {
		if (app || !client || !bundle || window.__SHOWDEX_INIT) return;
		app = client;
		var requested = app.curRoom && app.curRoom.id === roomid ||
			app.curSideRoom && app.curSideRoom.id === roomid;
		var Placeholder = window.Room.extend({
			type: 'html', title: 'Hellodex', isSideRoom: true, minWidth: 320, maxWidth: 1024,
			initialize: function () {
				this.el.dataset.fantasyShowdexPlaceholder = 'true';
			},
			focus: function () {
				if (this.el.dataset.fantasyShowdexPlaceholder === 'true') void load(true);
			},
			loadShowdex: function () { void load(true); },
		});
		app._addRoom(roomid, Placeholder, true, 'Hellodex');
		render();
		app.topbar.updateTabbar();
		app.on('room:added', function (room) {
			if (room.type === 'battle' && state === 'idle') void load(false);
		});
		// Handle direct battle links and rooms restored before this small script ran.
		if (requested) void load(true);
		else if (Object.keys(app.rooms).some(function (id) { return app.rooms[id].type === 'battle'; })) void load(false);
	}
	loader.install(window.app);
})();
