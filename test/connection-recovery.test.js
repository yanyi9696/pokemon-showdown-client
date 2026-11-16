'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const {EventEmitter} = require('events');
const source = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client.js'), 'utf8');

function client(local = false) {
	let now = 0, timerID = 0, notices = '', recovered = 0;
	const timers = new Map(), sockets = [], requests = [], popups = [], events = {};
	const userData = {name: 'ReturnTester', userid: 'returntester', named: true, registered: true, settings: {}};
	const element = {length: 1, text(value) { notices = value; return this; }, html() { return this; },
		appendTo() { return this; }, remove() { notices = ''; }};
	const $ = () => element;
	$.trim = text => text.trim(); $.post = (...args) => { requests.push(args); };
	$.cookie = () => { throw new Error('No real account cookies in recovery tests'); };
	class Socket {
		static OPEN = 1;
		readyState = 0;
		messages = [];
		constructor() { sockets.push(this); }
		open() { this.readyState = 1; this.onopen?.call(this); }
		message(data) { this.onmessage?.call(this, {data}); }
		send(data) { if (this.readyState !== 1) throw new Error('Closed socket'); this.messages.push(data); }
		close() { this.readyState = 3; this.onclose?.call(this); }
	}
	const context = {
		$, SockJS: Socket, WebSocket: Socket, Backbone: {Model: {extend: spec => spec}, Router: {extend: spec => spec}},
		Config: {routes: {client: 'official.invalid'}, server: {id: 'test', host: 'game.invalid', port: 443}, sockjsprefix: '/showdown'},
		location: {host: 'game.invalid'}, document: {hidden: false, addEventListener: (event, callback) => { events[event] = callback; }},
		navigator: {onLine: true}, window: {addEventListener: (event, callback) => { events[event] = callback; }},
		Date: class extends Date { static now() { return now; } },
		setTimeout(callback, delay) { timers.set(++timerID, {callback, at: now + delay}); return timerID; },
		clearTimeout(id) { timers.delete(id); },
		Storage: {isLocalGuest: () => local, prefs: key => key === 'localTestName' ? 'ReturnTester' : undefined,
			safeJSON: callback => raw => callback(JSON.parse(raw))},
		Dex: {prefs() {}}, _: {clone: value => ({...value})},
		BattleTextParser: {parseNameParts: value => ({name: value.trim(), status: '', away: false})},
		BattleLog: {sanitizeHTML: value => value}, ReconnectPopup: 'reconnect', LoginPopup: 'login',
		toID: value => String(value).toLowerCase().replace(/[^a-z0-9]/g, ''),
		toUserid: value => String(value).toLowerCase().replace(/[^a-z0-9]/g, ''), toRoomid: value => value,
	};
	vm.runInNewContext(source.slice(source.indexOf('var User = this.User ='), source.indexOf('this.Room = Backbone.View.extend')), context);
	const app = Object.assign(new EventEmitter(), context.App), user = Object.assign(new EventEmitter(), context.User);
	app.trigger = app.emit; user.trigger = user.emit;
	user.loaded = true; user.replaceList = {}; user.normalizeList = {};
	user.get = key => userData[key];
	user.set = (key, value) => { Object.assign(userData, typeof key === 'object' ? key : {[key]: value}); };
	user.getActionPHP = () => '/test-only/action.php';
	app.user = user; app.popups = []; app.ignore = {}; app.sendQueue = [];
	app.topbar = {updateUserbar() {}}; app.addPopup = (...args) => popups.push(args);
	app.addPopupMessage = text => popups.push(text); app.saveIgnore = () => {};
	app.rooms = {'': {updateFormats() {}}, teambuilder: {type: 'teambuilder', draft: 'unfinished team'},
		fantasyrogue: {type: 'fantasyrogue', draft: 'starter configuration'},
		lobby: {type: 'chat'}, 'battle-test-1': {type: 'battle', request: {rqid: 1}, choice: 'move 1', updateControls() {}}};
	app.curRoom = app.rooms.fantasyrogue;
	context.app = context.window.app = app;
	app.on('init:socketclosed', app.connectionClosed); app.on('init:connectionerror', app.connectionError);
	app.on('init:socketrecovered', () => { recovered++; });
	app.connect(); sockets[0].open();
	return {app, user, userData, sockets, requests, popups, context, timers,
		get notices() { return notices; }, get recovered() { return recovered; },
		advance(ms) {
			const end = now + ms;
			for (;;) {
				const next = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
				if (!next) break;
				now = next[1].at; timers.delete(next[0]); next[1].callback();
			}
			now = end;
		},
		visible(value) { context.document.hidden = !value; events.visibilitychange(); },
		online(value) { context.navigator.onLine = value; if (value) events.online(); },
		pageshow() { events.pageshow({persisted: true}); },
		login() {
			const socket = sockets[sockets.length - 1]; socket.open();
			socket.message('|updateuser| Guest 2|0|1|{}'); socket.message('|challstr|0|test-challenge');
			if (!local) requests[requests.length - 1][2](JSON.stringify({username: 'ReturnTester', loggedin: true, assertion: 'test-only-assertion'}));
			socket.message('|updateuser| ReturnTester|1|1|{}');
		},
	};
}

describe('Foreground connection recovery', () => {
	it('retains a healthy socket when returning from background, including repeated lifecycle events', () => {
		const c = client(), socket = c.sockets[0];
		c.visible(false); c.advance(60000); c.visible(true); c.pageshow(); c.online(true);
		assert.equal(c.sockets.length, 1); assert.equal(socket.messages.filter(m => m === '|/cmd rooms').length, 1);
		socket.message('|queryresponse|rooms|{}'); c.advance(10000);
		assert.equal(c.sockets.length, 1); assert.equal(c.app.connectionRecovering, undefined);
		assert.equal(c.popups.length, 0);
	});
	it('waits in background, then reconnects automatically without reloading local rooms or editors', () => {
		const c = client(), rooms = c.app.rooms, focused = c.app.curRoom;
		c.visible(false); c.sockets[0].close(); c.advance(180000);
		assert.equal(c.sockets.length, 1); assert.equal(c.popups.length, 0);
		c.visible(true); c.advance(0); assert.equal(c.sockets.length, 2);
		c.login(); assert.equal(c.recovered, 1); assert.equal(c.app.connectionRecovering, false);
		assert.equal(c.app.rooms, rooms); assert.equal(c.app.curRoom, focused);
		assert.equal(rooms.teambuilder.draft, 'unfinished team'); assert.equal(rooms.fantasyrogue.draft, 'starter configuration');
		assert.deepEqual(c.sockets[1].messages.filter(m => m.startsWith('|/join ')), ['|/join lobby', '|/join battle-test-1']);
		assert.equal(c.notices, '');
	});
	it('discards stale choices and purchases, waits for signed identity, and refreshes only once', () => {
		const c = client(); c.app.sendQueue = ['battle-test-1|/choose move 1|1', '|/cmd fantasyrogueaction spend'];
		c.sockets[0].close(); c.app.send('/cmd fantasyrogueaction buy'); c.app.send('/choose move 2', 'battle-test-1');
		c.advance(1000); const socket = c.sockets[1]; socket.open();
		socket.message('|updateuser| Guest 2|0|1|{}');
		assert.equal(c.userData.userid, 'returntester'); assert.equal(c.user.loaded, false);
		socket.message('|challstr|0|test-challenge');
		c.requests[0][2](JSON.stringify({username: 'ReturnTester', loggedin: true, assertion: 'test-only-assertion'}));
		assert.equal(c.recovered, 0); assert(!socket.messages.some(m => m.includes('/join')));
		socket.message('|updateuser| ReturnTester|1|1|{}'); socket.message('|updateuser| ReturnTester|1|1|{}');
		assert.equal(c.recovered, 1); assert(!socket.messages.some(m => /choose|spend|buy/.test(m)));
		assert.equal(c.app.rooms['battle-test-1'].request, null);
		assert.equal(c.app.rooms['battle-test-1'].needsReconnect, true);
	});
	it('does not let a stale socket or previous upkeep response affect the new connection', () => {
		const c = client(); c.sockets[0].message('|challstr|0|old-challenge');
		const old = c.sockets[0], message = old.onmessage, close = old.onclose;
		old.close(); c.advance(1000); c.sockets[1].open();
		message.call(old, {data: '|updateuser| WrongAccount|1|1|{}'}); close.call(old);
		c.requests[0][2](JSON.stringify({username: 'WrongAccount', loggedin: true, assertion: 'stale-test-assertion'}));
		assert.equal(c.userData.userid, 'returntester');
		assert(!c.sockets[1].messages.some(m => m.includes('WrongAccount')));
		assert.equal(c.app.socket, c.sockets[1]); assert.equal(c.app.reconnectTimer, null);
	});
	it('replaces a socket that stayed falsely open after sleep only after its read-only probe times out', () => {
		const c = client(); c.visible(false); c.advance(30000); c.visible(true);
		c.advance(7999); assert.equal(c.sockets.length, 1);
		c.advance(1001); assert.equal(c.sockets.length, 2); assert.equal(c.sockets[0].readyState, 3);
	});
	it('pauses retries offline and resumes when the network returns', () => {
		const c = client(); c.online(false); c.sockets[0].close(); c.advance(60000);
		assert.equal(c.sockets.length, 1); assert(c.notices.includes('网络已断开'));
		c.online(true); c.advance(0); assert.equal(c.sockets.length, 2);
	});
	it('backs off failed attempts and stops background polling', () => {
		const c = client(); c.sockets[0].close(); c.advance(1000);
		// Exhaust each attempt's existing alternate-prefix fallback.
		c.sockets[c.sockets.length - 1].close(); c.sockets[c.sockets.length - 1].close();
		const count = c.sockets.length; c.advance(1999); assert.equal(c.sockets.length, count);
		c.advance(1); assert.equal(c.sockets.length, count + 1);
		c.visible(false); c.advance(90000); assert.equal(c.sockets.length, count + 1);
	});
	it('recovers a stalled connecting attempt after suspension', () => {
		const c = client(); c.sockets[0].close(); c.advance(1000); c.visible(false); c.advance(60000);
		c.visible(true); c.advance(2000); assert.equal(c.sockets.length, 3);
	});
	it('honors logout and explicit server disconnects instead of bypassing them', () => {
		for (const type of ['logout', 'disconnect']) {
			const c = client();
			if (type === 'logout') c.user.logout(); else c.sockets[0].message('|disconnect|Session ended');
			c.visible(false); c.visible(true); c.online(true); c.advance(60000);
			assert.equal(c.sockets.length, 1); assert.equal(c.app.reconnectStopped, true); assert(c.popups.length);
		}
	});
	it('falls back to a real guest identity when the saved login has expired', () => {
		const c = client(); c.sockets[0].close(); c.advance(1000); const socket = c.sockets[1]; socket.open();
		socket.message('|updateuser| Guest 2|0|1|{}'); socket.message('|challstr|0|expired-test-challenge');
		c.requests[0][2](JSON.stringify({username: ''}));
		assert.equal(c.userData.userid, 'guest2'); assert.equal(c.userData.registered, false);
		assert.equal(c.recovered, 1); assert(!socket.messages.some(m => m.includes('/trn ReturnTester')));
	});
	it('restores local test nicknames through the existing loopback login path', () => {
		const c = client(true); c.sockets[0].close(); c.advance(1000);
		const socket = c.sockets[1]; socket.open();
		socket.message('|updateuser| Guest 2|0|1|{}'); socket.message('|challstr|0|local-challenge');
		assert.equal(c.recovered, 0); assert.equal(c.userData.userid, 'returntester');
		assert(!socket.messages.some(m => m.includes('/join')));
		socket.message('|updateuser| ReturnTester|1|1|{}');
		assert.equal(c.requests.length, 0); assert.equal(c.recovered, 1);
		assert(c.sockets[1].messages.includes('|/trn ReturnTester'));
	});
	it('rearms the handshake watchdog after a brief background pause', () => {
		const c = client(); c.sockets[0].close(); c.advance(1000); c.sockets[1].open();
		c.visible(false); c.advance(1000); c.visible(true);
		c.sockets[1].message('|queryresponse|rooms|{}');
		c.advance(19000);
		assert.equal(c.sockets[1].readyState, 3); assert.equal(c.recovered, 0);
		c.advance(2000); assert.equal(c.sockets.length, 3);
	});
	it('does not reconnect on an empty explicit server disconnect message', () => {
		const c = client(); c.sockets[0].message('|disconnect|'); c.sockets[0].close();
		c.visible(false); c.visible(true); c.advance(60000);
		assert.equal(c.app.reconnectStopped, true); assert.equal(c.sockets.length, 1);
	});
	it('clears an obsolete guest identity when a recovery attempt itself disconnects', () => {
		const c = client(); c.sockets[0].close(); c.advance(1000); c.sockets[1].open();
		c.sockets[1].message('|updateuser| Guest 2|0|1|{}'); c.sockets[1].close();
		assert.equal(c.app.recoveryGuest, null);
		c.advance(2000); c.sockets[2].open(); c.sockets[2].message('|updateuser| Guest 3|0|1|{}');
		c.sockets[2].message('|challstr|0|guest-challenge'); c.requests[0][2](JSON.stringify({username: ''}));
		assert.equal(c.userData.userid, 'guest3'); assert.equal(c.recovered, 1);
	});
	it('replaces a send-failed socket without replaying the failed operation', () => {
		const c = client(); c.sockets[0].send = () => { throw new Error('Network unavailable'); };
		assert.equal(c.app.send('/cmd fantasyrogueaction purchase'), false);
		c.advance(1000); c.login();
		assert(!c.sockets[1].messages.some(m => m.includes('purchase')));
	});
	it('refreshes battle history after reconnection while ignoring ordinary duplicate initialization', () => {
		const battleSource = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-battle.js'), 'utf8');
		const start = battleSource.indexOf('\t\tinit: function (data)');
		const context = {app: {roomTitleChanged() {}}};
		vm.runInNewContext('this.init = ({' + battleSource.slice(start, battleSource.indexOf('\t\tadd: function', start)) + '}).init;', context);
		const seeks = [], room = {battle: {stepQueue: ['|turn|1'], seekTurn: (...args) => seeks.push(args)},
			updateLayout() {}, updateControls() {}};
		context.init.call(room, '|init|battle\n|turn|2'); assert.equal(room.battle.stepQueue[0], '|turn|1');
		room.needsReconnect = true; context.init.call(room, '|init|battle\n|turn|2');
		assert.equal(room.battle.stepQueue[0], '|turn|2'); assert.equal(room.needsReconnect, false);
		assert.deepEqual(seeks, [[Infinity, true]]);
	});
});
