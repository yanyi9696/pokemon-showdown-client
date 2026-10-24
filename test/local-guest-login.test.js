'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
const template = fs.readFileSync(path.join(root, 'testclient.template.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'js/client.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');

function client(url = 'file:///F:/client/testclient.html?~~localhost:8000&localguest=1', prefs = {}, localDevelopment = false) {
	const sent = [], requests = [], popups = [], loadedScripts = [];
	const context = {
		Config: {localDevelopment, routes: {client: 'play.pokemonshowdown.com'}, defaultserver: {host: 'localhost', port: 8000}},
		location: new URL(url),
		document: {write: script => loadedScripts.push(script)},
		alert: text => { throw new Error(text); },
		Backbone: {Model: {extend: spec => spec}},
		toUserid: name => name.toLowerCase().replace(/[^a-z0-9]/g, ''),
		BattleLog: {escapeHTML: value => String(value)},
		BattleTextParser: {parseNameParts: text => ({name: text.slice(1), status: '', away: false})},
		_: {clone: value => Object.assign({}, value)},
		ProxyPopup: 'manual-verification',
		Storage: {
			prefs(key, value) {
				if (arguments.length > 1) prefs[key] = value;
				return prefs[key];
			},
			safeJSON: callback => data => callback(JSON.parse(data)),
			whenTeamsLoaded: {load() {}}, whenPrefsLoaded: {load() {}},
			whenAppLoaded: callback => callback(context.app),
		},
		$: {
			get: (...args) => requests.push(args), post: (...args) => requests.push(args),
			cookie() { throw new Error('No account cookies may be read or written in local mode'); },
		},
		app: {
			send: text => sent.push(text), addPopup: (...args) => popups.push(args),
			addPopupMessage: text => popups.push(text), trigger() {},
			topbar: {updateUserbar() {}}, socket: {close() {}},
			ignore: {}, rooms: {},
		},
	};
	context.window = context;
	// Execute the actual entrance and key-loading conditions, without loading a key file.
	for (const match of template.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
		if (match[1].includes('Config.testclient = true') || match[1].includes('document.write(')) {
			vm.runInNewContext(match[1], context);
		}
	}
	vm.runInNewContext(storageSource.slice(storageSource.indexOf('Storage.isLocalGuest ='),
		storageSource.indexOf('/*********************************************************', storageSource.indexOf('Storage.initTestClient ='))), context);
	vm.runInNewContext(source.slice(source.indexOf('var User = this.User ='), source.indexOf('this.App = Backbone.Router.extend')), context);
	const receiveStart = source.indexOf('\t\treceive: function (data)');
	vm.runInNewContext('app.receive = ({' + source.slice(receiveStart, source.indexOf('\t\tsaveIgnore: function', receiveStart)) + '}).receive;', context);
	const user = Object.create(context.User);
	user.data = {userid: 'guest1', registered: false, name: 'Guest 1'};
	user.get = key => user.data[key];
	user.set = (key, value) => { if (typeof key === 'object') Object.assign(user.data, key); else user.data[key] = value; };
	user.trigger = () => {};
	user.replaceList = {}; user.normalizeList = {};
	context.app.user = user;
	return {context, user, sent, requests, popups, prefs, loadedScripts};
}

describe('Credential-free local test nickname login', () => {
	it('persists accepted nicknames using the real preferences store across independent page contexts', () => {
		const values = new Map();
		const localStorage = {getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value)};
		function page() {
			const result = client('http://localhost:8080/testclient.html#fantasyrogue', {}, true);
			result.context.localStorage = localStorage;
			vm.runInNewContext(storageSource.slice(storageSource.indexOf('Storage.prefs ='),
				storageSource.indexOf('Storage.makeLoadTracker =')), result.context);
			result.context.Storage.initTestClient();
			return result;
		}
		const first = page();
		first.context.app.receive('|updateuser| OriginalTestName|1|1|{}');
		assert.equal(JSON.parse(values.get('showdown_prefs')).localTestName, 'OriginalTestName');
		const next = page();
		next.context.app.receive('|updateuser| Guest 2|0|1|{}');
		next.context.app.receive('|challstr|0|synthetic-challenge');
		assert.deepEqual(next.sent, ['/trn OriginalTestName']);
		assert.deepEqual([next.requests, next.popups], [[], []]);
	});
	it('uses the managed HTTP entry without query parameters or a key, across page reloads', () => {
		const prefs = {};
		for (const url of ['http://localhost:8080/testclient.html#fantasyrogue', 'http://localhost:8080/testclient.html']) {
			const {context, user, requests, popups, loadedScripts, sent} = client(url, prefs, true);
			Object.defineProperty(context, 'POKEMON_SHOWDOWN_TESTCLIENT_KEY', {get() { throw new Error('SID access'); }});
			context.Storage.initTestClient();
			user.setPersistentName('OriginalTestName');
			user.setPersistentName(null);
			user.receiveChallstr('local-challenge');
			assert.deepEqual(sent, ['/trn OriginalTestName']);
			assert.deepEqual([requests, popups, loadedScripts], [[], [], []]);
		}
	});
	it('cannot redirect the managed HTTP profile to another battle server with query parameters', () => {
		const {context, user, requests, sent} = client('http://localhost:8080/testclient.html?~~remote.invalid:8000', {}, true);
		assert.equal(context.Config.server.host, '127.0.0.1');
		user.rename('OrdinaryNewTester');
		assert.deepEqual(sent, ['/trn OrdinaryNewTester']);
		assert.deepEqual(requests, []);
	});
	it('does not enable the HTTP local profile at another origin or port even with its flag set', () => {
		for (const origin of ['https://play.psfantasy.xyz', 'http://localhost:9000', 'http://localhost.example.invalid:8080']) {
			const {context, loadedScripts} = client(origin + '/testclient.html', {}, true);
			assert.equal(context.Storage.isLocalGuest(), false);
			assert.equal(loadedScripts.length, 1);
		}
	});
	it('does not load a test key, read a SID or install the manual proxy in the launcher entry', () => {
		const {context, loadedScripts, requests, popups, user} = client();
		Object.defineProperty(context, 'POKEMON_SHOWDOWN_TESTCLIENT_KEY', {get() { throw new Error('SID access'); }});
		const post = context.$.post, get = context.$.get;
		context.Storage.initTestClient();
		user.receiveChallstr('synthetic-local-challenge');
		assert.equal(user.loaded, true);
		assert.equal(context.$.post, post);
		assert.equal(context.$.get, get);
		assert.deepEqual([loadedScripts, requests, popups], [[], [], []]);
	});
	it('sends the original nickname through the native unregistered rename path', () => {
		const {user, sent, requests, popups} = client();
		user.rename('ExistingTestPlayer');
		assert.deepEqual(sent, ['/trn ExistingTestPlayer']);
		assert.deepEqual([requests, popups], [[], []]);
		assert.equal(user.get('registered'), false);
	});
	it('remembers only accepted names and restores them after refresh and repeated reconnects', () => {
		const prefs = {};
		const first = client(undefined, prefs);
		first.user.rename('RejectedNewName');
		assert.equal(prefs.localTestName, undefined);
		first.user.setPersistentName('OriginalTestName');
		const refreshed = client(undefined, prefs);
		refreshed.user.setPersistentName(null); // Server's initial Guest update precedes its challenge.
		refreshed.user.receiveChallstr('first-local-challenge');
		refreshed.user.setPersistentName(null);
		refreshed.user.receiveChallstr('second-local-challenge');
		assert.deepEqual(refreshed.sent, ['/trn OriginalTestName', '/trn OriginalTestName']);
		assert.deepEqual(refreshed.requests, []);
		assert.equal(prefs.localTestName, 'OriginalTestName');
	});
	it('logs out locally and does not silently log back in on the next connection', () => {
		const prefs = {localTestName: 'OriginalTestName'};
		const {user, sent, requests} = client(undefined, prefs);
		user.logout();
		assert.deepEqual(sent, ['/logout']);
		assert.deepEqual(requests, []);
		const next = client(undefined, prefs);
		next.user.receiveChallstr('another-local-challenge');
		assert.deepEqual(next.sent, []);
	});
	it('persists server-accepted nickname changes without posting to the official login server', () => {
		const {context, user, prefs, requests} = client();
		context.app.receive('|updateuser| OriginalTestName|1|1|{}');
		assert.equal(user.get('userid'), 'originaltestname');
		assert.equal(prefs.localTestName, 'OriginalTestName');
		// A change in capitalization used to issue a changeusername login-server request.
		context.app.receive('|updateuser| originaltestname|1|1|{}');
		assert.equal(prefs.localTestName, 'originaltestname');
		assert.deepEqual(requests, []);
	});
	it('still sanitizes invalid nickname delimiters and rejects empty names', () => {
		const {user, sent, popups} = client();
		user.rename('Test|,;Name');
		user.rename('|,;');
		assert.deepEqual(sent, ['/trn TestName']);
		assert.equal(popups.length, 1);
	});
	it('keeps normal authenticated login for remote, hosted and non-opted-in test clients', () => {
		for (const url of [
			'file:///F:/client/testclient.html?~~localhost:8000',
			'file:///F:/client/testclient.html?~~play.psfantasy.xyz:8000&localguest=1',
			'file:///F:/client/testclient.html?~~localhost.example.invalid:8000&localguest=1',
			'file:///F:/client/testclient.html?~~localhost:9000&localguest=1',
			'http://localhost:8080/testclient.html?~~localhost:8000&localguest=1',
			'https://play.psfantasy.xyz/testclient.html?~~localhost:8000&localguest=1',
			'file://network-share/client/testclient.html?~~localhost:8000&localguest=1',
		]) {
			const {context, user, requests, loadedScripts, sent} = client(url);
			assert.equal(context.Storage.isLocalGuest(), false, url);
			assert.equal(loadedScripts.length, 1, url);
			user.rename('RegisteredPlayer');
			assert.equal(requests[0][1].act, 'getassertion', url);
			user.receiveChallstr('synthetic-challenge');
			assert.equal(requests[1][1].act, 'upkeep', url);
			assert.deepEqual(sent, []);
		}
	});
	it('rechecks the effective server and does not grant local login to a changed remote target', () => {
		const {context, user, requests, sent} = client();
		context.Config.server.host = 'remote.example.invalid';
		user.rename('TestName');
		assert.equal(context.Storage.isLocalGuest(), false);
		assert.equal(requests[0][1].act, 'getassertion');
		assert.deepEqual(sent, []);
	});
	it('supports the explicit IPv4 loopback entrance as well', () => {
		const {context, user, sent, loadedScripts} = client('file:///F:/client/testclient.html?~~127.0.0.1:8000&localguest=1');
		assert.equal(context.Storage.isLocalGuest(), true);
		user.rename('TestName');
		assert.deepEqual(sent, ['/trn TestName']);
		assert.deepEqual(loadedScripts, []);
	});
});
