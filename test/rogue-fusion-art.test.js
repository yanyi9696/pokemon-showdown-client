'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

describe('Potara local sprite protocol', () => {
	let ctx, battle;
	const sprite = '25.6-0123456789ab';
	before(() => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {routes: {client: 'client.example'}},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx; ctx.$ = {easing: {}};
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
			'data/pokedex-mini.js', 'data/pokedex-mini-bw.js', 'js/battle-dex.js', 'js/battle-scene-stub.js',
			'js/battle-text-parser.js', 'js/battle.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		ctx.BattleLog = {escapeHTML: text => String(text)}; ctx.Dex.iconSheetPrefix = './';
	});
	afterEach(() => { battle?.destroy(); battle = null; });
	function start(tier = '[Gen 9] Fantasy Rogue', gameType = 'singles') {
		battle = new ctx.Battle({debug: true, log: ['|init|battle', '|gen|9', `|gametype|${gameType}`, `|tier|${tier}`,
			'|player|p1|Player', '|player|p2|Enemy', '|clearpoke', `|poke|p1|Pikachu, L50||[fusion] ${sprite}`,
			`|poke|p2|Charizard, L50||[fusion] ${sprite}`, '|teampreview']});
		battle.seekTurn(Infinity);
	}
	it('renders both preview sprites and both battle directions from the same local asset', () => {
		start();
		for (const mon of [battle.p1.pokemon[0], battle.p2.pokemon[0]]) for (const front of [true, false]) {
			const data = ctx.Dex.getSpriteData(mon, front, {gen: 9});
			assert.equal(data.url, `./sprites/fantasy-rogue/fusions/${sprite}.png`);
			assert.equal(data.w, 96); assert.equal(data.h, 96); assert(data.fallbackURL && !data.fallbackURL.includes('/fusions/'));
		}
		battle.add('|start'); battle.add('|switch|p1a: Pikachu|Pikachu, L50|100/100');
		assert.equal(battle.p1.active[0].rogueFusionSprite, sprite);
		battle.seekTurn(0); battle.seekTurn(Infinity);
		assert.equal(battle.p1.active[0].rogueFusionSprite, sprite);
	});
	it('updates and clears visible appearance on Illusion/Transform messages', () => {
		start(); battle.add('|start'); battle.add('|switch|p1a: Pikachu|Pikachu, L50|100/100');
		battle.add('|-roguefusion|p1a: Pikachu|');
		assert(!ctx.Dex.getSpriteData(battle.p1.active[0], true).url.includes('/fusions/'));
		battle.add(`|-roguefusion|p1a: Pikachu|${sprite}`);
		assert(ctx.Dex.getSpriteData(battle.p1.active[0], true).url.includes(sprite));
		battle.add('|-roguefusion|p1a: Pikachu|https://attacker.invalid/a.png');
		assert.equal(battle.p1.active[0].rogueFusionSprite, sprite);
	});
	it('keeps ordinary formats untouched and rejects path/HTML payloads', () => {
		start('[Gen 9] FC AG'); assert(!battle.p1.pokemon[0].rogueFusionSprite);
		for (const id of ['../../x', 'https://example.org/a', '25.6-0123456789ab"', null, {}, '25.6.png']) assert.equal(ctx.Dex.getFusionSpriteURL(id), '');
	});
	it('uses the saved appearance in party portraits without layering the original under transparent art', () => {
		const css = ctx.Dex.getTeambuilderSprite({species: 'Pikachu', rogueFusionSprite: sprite});
		assert(css.includes(sprite)); assert.equal((css.match(/url\(/g) || []).length, 1);
		assert(!ctx.Dex.getTeambuilderSprite({species: 'Pikachu'}).includes('/fusions/'));
	});
	it('falls back once on a failed local image and never retries a broken fallback in a loop', () => {
		const events = {}, attrs = {};
		const el = {0: {complete: false}, off(name) { delete events[name]; return this; },
			one(name, fn) { events[name] = fn; return this; }, attr(name, value) { attrs[name] = value; return this; },
			css() { return this; }};
		ctx.$ = () => el; ctx.$.easing = {};
		vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../play.pokemonshowdown.com/js/battle-animations.js'), 'utf8'), ctx);
		new ctx.Sprite({url: 'missing.png', w: 96, h: 96, fallbackURL: 'original.png'}, {x: 0, y: 0, z: 0}, {pos: x => x});
		assert.equal(typeof events['error.roguefusion'], 'function');
		events['error.roguefusion']();
		assert.equal(attrs.src, 'original.png'); assert(!events['error.roguefusion']);
	});
});
