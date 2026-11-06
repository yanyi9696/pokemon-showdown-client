'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../play.pokemonshowdown.com');

function load(context, files) {
	for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
}

describe('Fantasy battle media', () => {
	let context, preferences;
	before(() => {
		preferences = {};
		context = vm.createContext({Pokemon: function () {}, Config: {routes: {client: 'client.example'}},
			document: {location: {protocol: 'https:'}, getElementById: () => ({}), getElementsByTagName: () => []}});
		context.window = context; context.exports = context;
		load(context, ['js/battle-dex-data.js', 'data/pokedex.js', 'data/pokedex-mini.js', 'data/pokedex-mini-bw.js',
			'data/teambuilder-tables.js', 'data/gen9fantasy.js', 'js/battle-dex.js']);
		context.Dex.prefs = key => preferences[key];
	});

	it('uses real standard cry paths in Fantasy formats without changing other mods', () => {
		for (const pixels of [false, true]) {
			preferences.bwgfx = pixels;
			for (const name of ['Popplio', 'Litten', 'Bulbasaur']) {
				const ordinary = context.Dex.getSpriteData(name, true, {gen: 9});
				const fantasyFormat = context.Dex.getSpriteData(name, true, {gen: 9, mod: 'gen9fantasy'});
				assert.equal(fantasyFormat.cryurl, `audio/cries/${name.toLowerCase()}.mp3`);
				assert.equal(fantasyFormat.cryurl, ordinary.cryurl);
				assert.equal(fantasyFormat.filter, '');
			}
		}
		assert.equal(context.Dex.getSpriteData('Pikachu', true, {mod: 'custommod'}).cryurl,
			'sprites/custommod/audio/pikachu.mp3');
	});

	it('maps Fantasy and custom forms to official cries without requesting nonexistent custom audio', () => {
		for (const [species, cry] of [
			['Primarina-Fantasy', 'primarina'], ['Swampert-Mega-Fantasy', 'swampert-mega'],
			['Onix-Fantasy', 'onix'], ['Kyurem-Original', 'kyurem'],
		]) {
			assert.equal(context.Dex.getSpriteData(species, true, {gen: 9, mod: 'gen9fantasy'}).cryurl,
				`audio/cries/${cry}.mp3`, species);
		}
	});

	it('keeps normal art plain and Fantasy art outlined across battle, party and Hall of Fame preferences', () => {
		for (const pixels of [false, true]) {
			preferences.bwgfx = pixels;
			for (const shiny of [false, true]) {
				for (const front of [false, true]) {
					assert.match(context.Dex.getSpriteData('Primarina-Fantasy', front,
						{gen: 9, mod: 'gen9fantasy', shiny}).filter, /drop-shadow/);
					assert.equal(context.Dex.getSpriteData('Primarina', front, {gen: 9, shiny}).filter, '');
				}
				for (const forcePixels of [false, true]) {
					assert.match(context.Dex.getTeambuilderSprite({species: 'Primarina-Fantasy', shiny}, 0, forcePixels),
						/filter:.*drop-shadow.*--pokemon-art-shadow/);
					assert(!context.Dex.getTeambuilderSprite({species: 'Primarina', shiny}, 0, forcePixels).includes('filter:'));
				}
			}
		}
		assert.equal(context.Dex.getSpriteData('substitute', true, {mod: 'gen9fantasy'}).filter, '');
	});

	it('retains the Fantasy outline when Rogue auras end and removes it when reverting a transformation', () => {
		function element() {
			return {style: {}, css(key, value) {
				if (typeof key === 'string') this.style[key] = value;
				else Object.assign(this.style, key);
				return this;
			}, attr() { return this; }};
		}
		context.$ = element;
		context.$.easing = {};
		load(context, ['js/battle-animations.js']);
		const normal = context.Dex.getSpriteData('Onix', true, {gen: 9});
		const fantasy = context.Dex.getSpriteData('Onix-Fantasy', true, {gen: 9, mod: 'gen9fantasy'});
		const scene = {animating: true, pos: x => x};
		const sprite = new context.PokemonSprite(fantasy, {x: 0, y: 0, z: 0}, scene, true);
		assert.equal(sprite.$el.style.filter, fantasy.filter);
		sprite.addEffect('roguebloodrobe');
		assert(sprite.$el.style.filter.includes(fantasy.filter));
		assert.match(sprite.$el.style.filter, /19,44,94/);
		sprite.removeEffect('roguebloodrobe');
		assert.equal(sprite.$el.style.filter, fantasy.filter);
		sprite.oldsp = normal;
		sprite.removeTransform();
		assert.equal(sprite.$el.style.filter, '');
	});
	it('applies the larger contour to real animated 3D front and back sprites', () => {
		preferences.bwgfx = false;
		for (const front of [true, false]) {
			const sprite = context.Dex.getSpriteData('Primarina-Fantasy', front, {gen: 9, mod: 'gen9fantasy'});
			assert.match(sprite.url, front ? /\/ani\/primarina\.gif$/ : /\/ani-back\/primarina\.gif$/);
			assert.equal(sprite.pixelated, false);
			assert.match(sprite.filter, /drop-shadow\(3px 0 3px/);
		}
	});
	it('outlines only Fantasy images in the pre-battle team preview on either side', () => {
		context.$ = () => ({});
		context.$.easing = {};
		context.BattleLog = {escapeHTML: text => String(text)};
		load(context, ['js/battle-animations.js']);
		for (const pixels of [false, true]) {
			preferences.bwgfx = pixels;
			const rendered = [];
			const scene = Object.create(context.BattleScene.prototype);
			scene.gen = 9; scene.mod = 'gen9fantasy';
			scene.battle = {gameType: 'singles', viewpointSwitched: false,
				sides: [0, 1].map(() => ({name: 'Test', pokemon:
					['Arceus-Legend-Fantasy', 'Arceus'].map(speciesForme => Object.assign(new context.Pokemon(), {
						speciesForme, level: 100, volatiles: {}, getSpeciesForme() { return this.speciesForme; },
					})),
				}))};
			scene.$sprites = [0, 1].map(index => ({empty() {}, html: value => { rendered[index] = value; }}));
			scene.log = {addDiv() {}}; scene.wait = () => {}; scene.updateSidebars = () => {};
			scene.teamPreview();
			for (const html of rendered) {
				const images = html.match(/<img[^>]+>/g);
				assert.equal(images.length, 2);
				assert.match(images[0], /filter:drop-shadow\(3px 0 3px/);
				assert(!images[1].includes('filter:'));
				assert(!/<div[^>]*filter:/.test(html));
			}
		}
	});
	it('shows the smaller golden preview burst only in Rogue battles, keeping its center and timing', () => {
		preferences.bwgfx = false;
		context.$ = () => ({});
		context.$.easing = {};
		context.BattleLog = {escapeHTML: text => String(text)};
		load(context, ['js/battle-animations.js']);
		for (const tier of ['[Gen 9] Fantasy Rogue', '[Gen 9] Fantasy', '[Gen 9] OU']) {
			const rendered = [];
			const scene = Object.create(context.BattleScene.prototype);
			scene.gen = 9; scene.mod = 'gen9fantasy';
			scene.battle = {tier, gameType: 'singles', viewpointSwitched: false,
				sides: [0, 1].map(() => ({name: 'Test', pokemon:
					[true, false].map(shiny => Object.assign(new context.Pokemon(), {
						speciesForme: 'Pikachu', level: 100, shiny, volatiles: {},
						getSpeciesForme() { return this.speciesForme; },
					})),
				}))};
			scene.$sprites = [0, 1].map(index => ({empty() {}, html: value => { rendered[index] = value; }}));
			scene.log = {addDiv() {}}; scene.wait = () => {}; scene.updateSidebars = () => {};
			scene.teamPreview();
			for (const [side, html] of rendered.entries()) {
				if (tier !== '[Gen 9] Fantasy Rogue') {
					assert(!html.includes('rogue-preview-shiny'), tier);
					assert(!html.includes('shine.png'), tier);
					continue;
				}
				assert.equal((html.match(/class="rogue-preview-shiny"/g) || []).length, 1, tier);
				assert.equal((html.match(/shine\.png/g) || []).length, 8, tier);
				assert.equal((html.match(/--star-filter:/g) || []).length, 8, tier);
				assert(html.includes('brightness(0) invert(1) brightness(.67) sepia(1) saturate(2.5)'));
				const sizes = [...html.matchAll(/--star-from-scale:([\d.]+)/g)].map(match => +match[1]);
				assert(Math.abs(sizes[0] - 0.32 * (side ? 1 : 1.5) * 0.85) < 0.0001);
				for (const point of ['from', 'to']) {
					const ys = [...html.matchAll(new RegExp('--star-' + point + '-y:([-\\d.]+)px', 'g'))].map(match => +match[1]);
					assert.equal(ys.length, 8);
					assert(Math.abs(ys.reduce((sum, y) => sum + y, 0) / 8 - (side ? 6 : 9)) < 0.001,
						'the whole preview burst stays centered slightly lower, including its endpoint');
				}
				assert(/src="[^"]*-shiny\/pikachu\./.test(html), 'the preview uses real shiny art: ' + html.slice(0, 500));
			}
		}
	});
	it('keeps crate stars full size while allowing smaller battle stars without moving the circle', () => {
		const crate = context.Dex.getShinySparkles(), battle = context.Dex.getShinySparkles(1, 0.85);
		assert(crate.includes('--star-from-scale:0.32;'));
		assert(battle.includes('--star-from-scale:0.272;'));
		for (const point of ['from-x', 'from-y', 'to-x', 'to-y', 'delay', 'duration']) {
			const pattern = new RegExp('--star-' + point + ':([^;"]+)', 'g');
			assert.deepEqual([...crate.matchAll(pattern)].map(m => m[1]), [...battle.matchAll(pattern)].map(m => m[1]));
		}
	});
	it('limits the smaller gold entrance to Rogue and preserves the standard shiny animation elsewhere', () => {
		context.$ = () => ({}); context.$.easing = {};
		load(context, ['js/battle-animations.js']);
		const chain = {css() { return this; }, delay() { return this; }, animate() { return this; }};
		for (const tier of ['[Gen 9] Fantasy Rogue', '[Gen 9] Fantasy', '[Gen 9] OU'])
		for (const shiny of [false, true]) for (const front of [false, true]) for (const speed of [1, 3]) {
			const rogue = tier === '[Gen 9] Fantasy Rogue';
			const effects = [];
			const sprite = Object.create(context.PokemonSprite.prototype);
			sprite.isFrontSprite = front;
			sprite.sp = context.Dex.getSpriteData('Charizard', front, {gen: 9, shiny});
			sprite.$el = sprite.$statbar = chain;
			sprite.scene = {animating: true, gen: 9, acceleration: speed, timeOffset: 0,
				battle: {tier},
				$sprites: [0, 1].map(() => ({find: () => ({remove() {}}), append() {}})),
				pos: value => value, showEffect: (name, start, end, transition, after, css) => effects.push({name, start, end, css}), backgroundEffect() {}, waitFor() {}, updateSidebar() {},
			};
			sprite.x = sprite.y = sprite.z = 0;
			sprite.behind = sprite.leftof = value => value;
			sprite.recalculatePos = sprite.resetStatbar = sprite.dogarsCheck = sprite.animReset = () => {};
			sprite.delay = () => sprite; sprite.anim = () => sprite;
			const pokemon = {hasVolatile: () => false};
			sprite.animSummon(pokemon, 0);
			const burst = effects.filter(effect => effect.name === 'shine'), first = burst.length;
			assert.equal(first, shiny ? rogue ? 8 : speed < 2 ? 6 : 0 : 0, tier);
			if (shiny && rogue) for (const point of ['start', 'end']) {
				assert(Math.abs(burst.reduce((sum, effect) => sum + effect[point].y, 0) / 8 - 19) < 0.001,
					'both native entrance centers move down together without tilting the trajectory');
			}
			for (const {start, end, css} of burst) {
				if (!rogue) { assert(!css, 'standard stars retain their original color'); continue; }
				assert.equal(css.filter, context.Dex.getShinySparkleFilter(), 'both entrance sides get the same gold outline');
				assert(start.scale <= 0.32 * 0.85, 'battle stars are smaller');
				assert(Math.hypot(end.x, end.y - 19) > Math.hypot(start.x, start.y - 19), 'stars spread outwards');
				assert(end.time - start.time >= 300, 'the flash remains visible even at high speed');
			}
			assert(!effects.find(effect => effect.name === 'pokeball').css, 'ordinary entrance effects keep their original color');
			sprite.animSummon(pokemon, 0);
			assert.equal(effects.filter(effect => effect.name === 'shine').length, first * 2);
			sprite.animSummon(pokemon, 0, true);
			assert.equal(effects.filter(effect => effect.name === 'shine').length, first * 2);
			sprite.animDragIn(pokemon, 0);
			assert.equal(effects.filter(effect => effect.name === 'shine').length, first * 2 + (shiny ? rogue ? 8 : 6 : 0));
		}
	});
});

describe('Audio playback failures', () => {
	let context, sound, failures, timers, plays;
	beforeEach(() => {
		failures = []; timers = new Set(); plays = [];
		sound = {currentTime: 0, pause() {}, play() {
			return new Promise((resolve, reject) => plays.push({resolve, reject}));
		}};
		context = vm.createContext({console: {warn: (...args) => failures.push(args)},
			setTimeout: callback => { timers.add(callback); return callback; }, clearTimeout: id => timers.delete(id),
			Config: {routes: {client: 'client.example'}}, HTMLAudioElement: function () {},
			document: {createElement: () => sound}});
		context.window = context;
		load(context, ['js/battle-sound.js']);
	});
	it('uses the local HTTP audio endpoint for both BGM and cries', () => {
		context.Config.routes.client = 'localhost:8080';
		context.document.location = {protocol: 'http:', host: 'localhost:8080', hostname: 'localhost'};
		const bgm = context.BattleSound.loadBgm('audio/bw-trainer.mp3', 1000, 20000);
		bgm.play();
		assert.equal(sound.src, 'http://localhost:8080/audio/bw-trainer.mp3');
		assert.equal(plays.length, 1);
		context.BattleSound.playEffect('audio/cries/popplio.mp3');
		assert.equal(sound.src, 'http://localhost:8080/audio/cries/popplio.mp3');
		assert.equal(plays.length, 2);
	});
	it('retains HTTPS for production, external resources and file clients', () => {
		for (const location of [
			{protocol: 'https:', host: 'client.example', hostname: 'client.example'},
			{protocol: 'http:', host: 'client.example', hostname: 'client.example'},
			{protocol: 'http:', host: 'localhost:8080', hostname: 'localhost'},
			{protocol: 'file:', host: '', hostname: ''},
		]) {
			context.document.location = location;
			assert.equal(context.BattleSound.getSoundURL('audio/bw-trainer.mp3'),
				'https://client.example/audio/bw-trainer.mp3');
		}
	});
	it('reports the actual local resource when playback fails', async () => {
		context.Config.routes.client = 'localhost:8080';
		context.document.location = {protocol: 'http:', host: 'localhost:8080', hostname: 'localhost'};
		context.BattleSound.playEffect('audio/cries/popplio.mp3');
		plays[0].reject(new Error('playback blocked'));
		await Promise.resolve();
		assert.match(failures[0][0], /http:\/\/localhost:8080\/audio\/cries\/popplio\.mp3/);
	});
	it('reports the failed cry resource and catches its rejected playback promise', async () => {
		context.BattleSound.playEffect('audio/cries/popplio.mp3');
		plays[0].reject(new Error('unsupported source'));
		await Promise.resolve();
		assert.equal(failures.length, 1);
		assert.match(failures[0][0], /https:\/\/client\.example\/audio\/cries\/popplio\.mp3/);
		assert.match(failures[0][1].message, /unsupported source/);
	});
	it('clears a failed BGM loop and allows a later resume', async () => {
		const bgm = context.BattleSound.loadBgm('audio/bw-trainer.mp3', 1000, 20000);
		bgm.play();
		assert.equal(timers.size, 1);
		plays[0].reject(new Error('unsupported source'));
		await Promise.resolve();
		assert.equal(bgm.isActuallyPlaying, false);
		assert.equal(timers.size, 0);
		bgm.resume(); plays[1].resolve();
		await Promise.resolve();
		assert.equal(bgm.isActuallyPlaying, true);
		context.BattleSound.setMute(true);
		assert.equal(timers.size, 0);
	});
	it('does not let a stale play rejection stop a newly resumed BGM', async () => {
		const bgm = context.BattleSound.loadBgm('audio/bw-trainer.mp3', 1000, 20000);
		bgm.play(); bgm.pause(); bgm.resume();
		plays[1].resolve(); plays[0].reject(new Error('interrupted'));
		await Promise.resolve();
		assert.equal(bgm.isActuallyPlaying, true);
		assert.equal(timers.size, 1);
		assert.equal(failures.length, 0);
	});
});
