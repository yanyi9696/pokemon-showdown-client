'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../play.pokemonshowdown.com/js/client-showdex-loader.js'), 'utf8');

function client(options = {}) {
	const scripts = [], links = [], listeners = new Map(), roomListeners = [], timers = new Map();
	let timerId = 0;
	const app = {
		rooms: options.rooms || {}, sideRoomList: [], focused: [],
		topbar: {updateTabbar() {}},
		on(name, fn) { assert.equal(name, 'room:added'); roomListeners.push(fn); },
		_addRoom(id, Type) {
			const room = new Type(); room.id = id;
			room.el = {dataset: {}};
			room.$el = {html(text) { room.markup = text; }};
			this.rooms[id] = room;
			room.initialize(); this.sideRoomList.push(room);
			return room;
		},
		focusRoomRight(id) { this.focused.push(id); },
	};
	if (options.direct) app.curRoom = {id: 'view-hellodex'};
	const window = {
		app, __SHOWDEX_INIT: options.existing,
		Gen9fantasyLearnsetsAsset: options.learnsets,
		Room: {extend(methods) { function Room() {} Object.assign(Room.prototype, methods); return Room; }},
		addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
		removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
	};
	if (options.dataReady) Object.defineProperty(window, 'Gen9fantasyLearnsets', {
		get() { throw new Error('Loading must not eagerly decode the entire table'); },
	});
	const context = {
		window, Promise,
		setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
		clearTimeout(id) { timers.delete(id); },
		document: {
			currentScript: {getAttribute: () => '/showdex/main.js?stablehash'},
			createElement(tag) {
				assert(['script', 'link'].includes(tag));
				return {tag, setAttribute() {}, remove() { this.removed = true; }};
			},
			head: {appendChild(node) { (node.tag === 'script' ? scripts : links).push(node); }},
		},
	};
	vm.runInNewContext(source, context);
	return {app, window, scripts, links, timers, context, loader: window.FantasyShowdex,
		emit(name) { for (const fn of [...listeners.get(name) || []]) fn(); },
		battle() { const room = {id: 'battle-test', type: 'battle'}; app.rooms[room.id] = room; roomListeners.forEach(fn => fn(room)); },
		listenerCount() { return [...listeners.values()].reduce((sum, set) => sum + set.size, 0); },
	};
}

describe('Showdex on-demand entry', () => {
	it('keeps a usable homepage tab without downloading the calculator', () => {
		const c = client();
		assert.equal(c.scripts.length, 0);
		assert.equal(c.app.sideRoomList.length, 1);
		assert.equal(c.app.rooms['view-hellodex'].title, 'Hellodex');
		assert.match(c.app.rooms['view-hellodex'].markup, /name="loadShowdex"/);
		assert.equal(c.app.focused.length, 0);
	});
	it('shares one request between simultaneous battle entry and manual clicks, waiting for initialization', async () => {
		const c = client(); c.battle();
		const first = c.loader.load(true), second = c.loader.load(true);
		assert.equal(first, second); assert.equal(c.scripts.length, 1);
		assert.equal(c.scripts[0].src, '/showdex/main.js?stablehash');
		c.scripts[0].onload();
		let finished = false; first.then(() => { finished = true; }); await Promise.resolve();
		assert.equal(finished, false, 'Downloading JS is not calculator readiness');
		c.emit('fantasyshowdexready'); assert.equal(await first, true);
		assert.equal(c.app.focused.length, 1);
		assert.equal(c.listenerCount(), 0); assert.equal(c.timers.size, 0);
	});
	it('does not steal focus when loading for a battle', async () => {
		const c = client(); c.battle(); const ready = c.loader.load(false);
		c.emit('fantasyshowdexready'); await ready;
		assert.equal(c.app.focused.length, 0);
		c.battle(); assert.equal(c.scripts.length, 1);
	});
	it('loads for a battle restored before the loader installs', () => {
		const c = client({rooms: {'battle-restored': {type: 'battle'}}});
		assert.equal(c.scripts.length, 1);
	});
	it('supports direct Hellodex links without leaving an empty server HTML room', () => {
		const c = client({direct: true, rooms: {'view-hellodex': {type: 'html'}}});
		assert.equal(c.scripts.length, 1);
		assert.equal(c.app.rooms['view-hellodex'].el.dataset.fantasyShowdexPlaceholder, 'true');
	});
	it('retries network failures with the same content version and no duplicate handlers', async () => {
		const c = client(); const failed = c.loader.load(true); c.scripts[0].onerror();
		assert.equal(await failed, false); assert.equal(c.scripts[0].removed, true);
		assert.equal(c.listenerCount(), 0);
		assert.match(c.app.rooms['view-hellodex'].markup, /重试加载/);
		const retried = c.loader.load(true);
		assert.equal(c.scripts.length, 2); assert.equal(c.scripts[1].src, c.scripts[0].src);
		c.emit('fantasyshowdexready'); assert.equal(await retried, true);
	});
	it('does not reinject a partially initialized calculator after an initialization error', async () => {
		const c = client(); const failed = c.loader.load(true);
		c.window.__SHOWDEX_INIT = 'standalone'; c.emit('fantasyshowdexerror');
		assert.equal(await failed, false); assert.equal(await c.loader.load(true), false);
		assert.equal(c.scripts.length, 1);
		assert.match(c.app.rooms['view-hellodex'].markup, /刷新页面/);
	});
	it('reports initialization timeout without retrying partial initialization or blocking battle entry', async () => {
		const c = client(); const failed = c.loader.load(false); c.scripts[0].onload();
		for (const fn of [...c.timers.values()]) fn();
		assert.equal(await failed, false); c.battle(); assert.equal(c.scripts.length, 1);
		assert.equal(c.timers.size, 0); assert.equal(c.listenerCount(), 0);
	});
	for (const learnsets of [undefined, 'data/gen9fantasy-learnsets.contenthash.js']) {
		it(`times out stalled ${learnsets ? 'learnset' : 'calculator'} downloads and permits a clean retry`, async () => {
			const c = client({learnsets});
			const first = c.loader.load(true);
			const lateLoad = c.scripts[0].onload;
			assert.equal(c.timers.size, 1, 'A stalled network request needs a timeout before onload');
			for (const fn of [...c.timers.values()]) fn();
			assert.equal(await first, false);
			assert.equal(c.listenerCount(), 0); assert.equal(c.timers.size, 0);
			assert.equal(c.scripts[0].removed, true);
			assert.match(c.app.rooms['view-hellodex'].markup, /重试加载/);
			const retry = c.loader.load(true);
			assert.notEqual(first, retry);
			const scriptCount = c.scripts.length;
			if (learnsets) c.window.Gen9fantasyLearnsets = {};
			lateLoad();
			assert.equal(c.scripts.length, scriptCount, 'Expired callbacks must not execute an old attempt');
			assert.equal(c.timers.size, 1, 'Expired callbacks must not add orphan timers');
			c.emit('fantasyshowdexready'); assert.equal(await retry, true);
			assert.equal(c.listenerCount(), 0); assert.equal(c.timers.size, 0);
		});
	}
	it('installs only once and leaves already running Showdex alone', () => {
		const c = client(); c.loader.install(c.app); vm.runInNewContext(source, c.context);
		assert.equal(c.app.sideRoomList.length, 1);
		const existing = client({existing: 'extension'});
		assert.equal(existing.scripts.length, 0); assert.equal(existing.app.sideRoomList.length, 0);
	});
	it('has no static main.js script request in either entry template', () => {
		for (const name of ['index', 'testclient']) {
			const html = fs.readFileSync(path.join(__dirname, `../play.pokemonshowdown.com/${name}.template.html`), 'utf8');
			assert(!/<script\s+src="[^\"]*showdex\/main\.js/.test(html));
			assert.match(html, /data-bundle-src="\/?showdex\/main\.js\?"/);
		}
	});
	it('downloads optional data only on demand and mounts the calculator after the exact table is available', async () => {
		const c = client({learnsets: 'data/gen9fantasy-learnsets.contenthash.js'});
		assert.equal(c.scripts.length, 0); assert.equal(c.links.length, 0);
		c.battle(); const pending = c.loader.load(true);
		assert.equal(c.scripts.length, 1); assert.equal(c.scripts[0].src, c.window.Gen9fantasyLearnsetsAsset);
		assert.equal(c.links[0].rel, 'preload'); assert.equal(c.links[0].as, 'script');
		assert.equal(c.links[0].href, '/showdex/main.js?stablehash');
		assert.equal(c.loader.load(true), pending);
		c.window.Gen9fantasyLearnsets = {pikachu: {learnset: {thunderbolt: ['9M']}}};
		c.scripts[0].onload();
		assert.equal(c.scripts.length, 2); assert.equal(c.scripts[1].src, c.links[0].href);
		c.scripts[1].onload(); c.emit('fantasyshowdexready');
		assert.equal(await pending, true); assert.equal(c.links[0].removed, true);
		assert.equal(c.listenerCount(), 0); assert.equal(c.timers.size, 0);
	});
	for (const event of ['onerror', 'onload']) {
		it(`does not start Showdex on a missing table (${event}), and retries its pinned URL`, async () => {
			const c = client({learnsets: 'data/gen9fantasy-learnsets.contenthash.js'});
			const pending = c.loader.load(true); c.scripts[0][event]();
			assert.equal(await pending, false); assert.equal(c.scripts.length, 1);
			assert.equal(c.scripts[0].removed, true); assert.equal(c.listenerCount(), 0);
			const retry = c.loader.load(true);
			assert.equal(c.scripts[1].src, c.scripts[0].src);
			c.window.Gen9fantasyLearnsets = {}; c.scripts[1].onload();
			c.emit('fantasyshowdexready'); assert.equal(await retry, true);
		});
	}
	it('reuses a downloaded table on calculator retry without fetching or parsing it again', async () => {
		const c = client({learnsets: 'data/gen9fantasy-learnsets.contenthash.js'});
		const pending = c.loader.load(true);
		Object.defineProperty(c.window, 'Gen9fantasyLearnsets', {get() { throw new Error('unexpected decode'); }});
		c.scripts[0].onload(); c.scripts[1].onerror();
		assert.equal(await pending, false);
		const retry = c.loader.load(true);
		assert.equal(c.scripts.length, 3); assert.equal(c.scripts[2].src, c.scripts[1].src);
		c.emit('fantasyshowdexready'); assert.equal(await retry, true);
	});
	it('preserves the old complete-data entry without an extra request or eager decoding', async () => {
		const c = client({learnsets: 'data/gen9fantasy-learnsets.contenthash.js', dataReady: true});
		const pending = c.loader.load(false);
		assert.equal(c.scripts.length, 1); assert.equal(c.links.length, 0);
		assert.equal(c.scripts[0].src, '/showdex/main.js?stablehash');
		c.emit('fantasyshowdexready'); assert.equal(await pending, true);
	});
});
