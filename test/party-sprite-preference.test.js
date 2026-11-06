'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {createHash} = require('crypto');
const imageSize = require('image-size');
const webRoot = path.resolve(__dirname, '../play.pokemonshowdown.com');

describe('Shared 2D party sprite preference', () => {
	let context, preferences;
	before(() => {
		preferences = {};
		context = vm.createContext({Pokemon: function () {},
			Config: {routes: {client: 'client.example'}}, document: {location: {protocol: 'https:'}, getElementById: () => ({}), getElementsByTagName: () => []}});
		context.window = context; context.exports = context;
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js', 'js/battle-dex.js']) {
			vm.runInContext(fs.readFileSync(path.join(webRoot, file), 'utf8'), context);
		}
		context.Dex.prefs = key => preferences[key];
		context.Dex.iconSheetPrefix = './';
	});
	it('ships all documented move discs, form items and Kyurem art as intact local PNGs', () => {
		const root = path.join(webRoot, 'sprites/fantasy-rogue');
		const manifest = JSON.parse(fs.readFileSync(path.join(root, 'form-and-tm-icons.json'), 'utf8'));
		assert.equal(manifest.files.filter(entry => entry.file.startsWith('tm/')).length, 18);
		assert.equal(manifest.files.filter(entry => entry.file.startsWith('key-items/')).length, 15);
		for (const entry of manifest.files) {
			const filename = path.join(root, entry.file), bytes = fs.readFileSync(filename);
			assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256, entry.file);
			const size = imageSize(filename);
			assert.equal(size.type, 'png'); assert(size.width > 0 && size.height > 0);
		}
	});
	for (const species of ['Pikachu', 'Ferroseed', 'Gholdengo', 'Zygarde-10%']) {
		it(`changes ${species} from HOME to pixels and back without reloading`, () => {
			preferences.bwgfx = false;
			assert.match(context.Dex.getTeambuilderSprite({species}), /sprites\/home\//);
			preferences.bwgfx = true;
			assert.match(context.Dex.getTeambuilderSprite({species}), /sprites\/gen5\//);
			assert.match(context.Dex.getTeambuilderSprite({species, shiny: true}), /sprites\/gen5-shiny\//);
			preferences.bwgfx = false;
			assert.match(context.Dex.getTeambuilderSprite({species}), /sprites\/home\//);
		});
	}
	it('reuses Rockruff art for its Own Tempo form while preserving its identity and distinct visual forms', () => {
		const dusk = context.Dex.species.get('Rockruff-Dusk');
		assert.equal(dusk.id, 'rockruffdusk'); assert.equal(dusk.abilities[0], 'Own Tempo');
		for (const pixels of [false, true]) for (const shiny of [false, true]) {
			preferences.bwgfx = pixels;
			for (const front of [false, true]) for (const gen of [5, 9]) {
				assert.equal(context.Dex.getSpriteData('Rockruff-Dusk', front, {gen, shiny}).url,
					context.Dex.getSpriteData('Rockruff', front, {gen, shiny}).url);
			}
			assert.equal(context.Dex.getTeambuilderSprite({species: 'Rockruff-Dusk', shiny}),
				context.Dex.getTeambuilderSprite({species: 'Rockruff', shiny}));
			assert(context.Dex.getSpriteData('Basculin-White-Striped', true, {gen: 5, shiny}).url.includes('basculin-whitestriped'));
		}
	});
	it('keeps custom pixel forms and ZA placeholders when enabling 2D', () => {
		preferences.bwgfx = true;
		for (const species of ['Flygon-Mega-Fantasy', 'Steelix-Mega-X-Fantasy', 'Shadow-Lugia-Fantasy']) {
			const style = context.Dex.getTeambuilderSprite({species});
			const filename = /url\(\.\/(.*?)\)/.exec(style)?.[1];
			assert(filename, style); assert(fs.existsSync(path.join(webRoot, filename)), filename);
		}
		assert.match(context.Dex.getTeambuilderSprite({species: 'Absol-Mega-Z-Fantasy'}), /sprites\/gen5\/absol-megaz\.png/);
	});
	it('keeps Hall of Fame portraits in front pixels without changing battle preferences', () => {
		preferences.bwgfx = false; preferences.nopastgens = true;
		try {
			for (const species of ['Swampert', 'Primarina', 'Gholdengo']) {
				assert.match(context.Dex.getTeambuilderSprite({species}, 5, true), /sprites\/gen5\//);
				assert.match(context.Dex.getTeambuilderSprite({species, shiny: true}, 5, true), /sprites\/gen5-shiny\//);
				assert.match(context.Dex.getTeambuilderSprite({species}), /sprites\/home\//);
			}
			assert.match(context.Dex.getTeambuilderSprite({species: 'Flygon-Mega-Fantasy'}, 5, true), /sprites\/gen5\/flygon-mega-fantasy\.png/);
			assert.equal(preferences.bwgfx, false); assert.equal(preferences.nopastgens, true);
		} finally { preferences.nopastgens = false; }
	});
	it('uses the approved triple Kyurem rear sprite in battle while keeping front party art', () => {
		for (const shiny of [false, true]) {
			for (const pixels of [false, true]) {
				preferences.bwgfx = pixels;
				const frontFile = `sprites/fantasy-rogue/kyurem-original${shiny ? '-shiny' : ''}.png`;
				const portrait = context.Dex.getTeambuilderSprite({species: 'Kyurem-Original', shiny});
				assert(portrait.includes(frontFile));
				assert.match(portrait, /background-size:var\(--teambuilder-art-size,94px\) auto/);
				assert.match(portrait, /background-position:var\(--teambuilder-art-x,13px\) var\(--teambuilder-art-y,8px\)/);
				assert.match(portrait, /image-rendering:auto/);
				assert.match(portrait, /filter:blur\(\.2px\) drop-shadow/);
				for (const front of [false, true]) {
					const filename = `sprites/fantasy-rogue/kyurem-original${front ? '' : '-back'}${shiny ? '-shiny' : ''}.png`;
					const dimensions = imageSize(path.join(webRoot, filename));
					assert.equal(dimensions.width, front ? 64 : 128);
					assert.equal(dimensions.height, front ? 64 : 128);
					const sprite = context.Dex.getSpriteData('Kyurem-Original', front, {gen: 9, mod: 'gen9fantasy', shiny});
					assert.equal(sprite.url, './' + filename); assert(sprite.pixelated);
					assert.equal(sprite.isFrontSprite, front);
					assert.equal(sprite.w, 128); assert.equal(sprite.h, 128);
					assert.match(sprite.filter, /drop-shadow/);
				}
			}
		}
	});
	it('uses the approved atlas slot in party, teambuilder and battle callers', () => {
		const filename = 'sprites/pokemonicons-sheet.png';
		const dimensions = imageSize(path.join(webRoot, filename));
		assert.equal(dimensions.width, 480); assert(dimensions.height >= 4350);
		const css = fs.readFileSync(path.join(webRoot, 'style/battle.css'), 'utf8');
		assert(!/\.picon\[style\*="kyurem-original-icon\.png"\]/.test(css), 'custom icons must keep the normal 40 x 30 slot');
		const normal = context.Dex.getPokemonIcon('Kyurem-Original');
		assert(normal.includes(filename));
		assert(normal.includes(filename + '?v=20261104'));
		assert.match(normal, /scroll -0px -4320px/);
		assert(!normal.includes('background-size:'), 'atlas cells must not rescale the whole sheet');
		assert.match(normal, /--is-fantasy:\s*1/);
		assert.match(normal, /--glow-filter:\s*drop-shadow/);
		for (const input of [{species: 'Kyurem-Original'}, {speciesForme: 'Kyurem-Original'},
			{speciesForme: 'Kyurem', volatiles: {formechange: ['', 'Kyurem-Original']}}]) {
			assert.equal(context.Dex.getPokemonIcon(input), normal);
			assert.equal(context.Dex.getPokemonIcon(input, true), normal, 'sidebar CSS already mirrors the icon');
		}
		const fainted = context.Dex.getPokemonIcon({speciesForme: 'Kyurem-Original', fainted: true});
		assert(fainted.includes(filename)); assert.match(fainted, /opacity:\.3;filter:grayscale/);
		for (const species of ['Kyurem', 'Kyurem-Black', 'Kyurem-White', 'Ditto']) {
			assert.match(context.Dex.getPokemonIcon(species), /pokemonicons-sheet\.png/);
		}
		assert.match(context.Dex.getPokemonIcon({speciesForme: 'Ditto',
			volatiles: {formechange: ['', 'Kyurem-Original'], transform: ['Kyurem-Original']}}), /pokemonicons-sheet\.png/);
	});
	it('keeps the renamed and legacy triple Kyurem artwork identical', () => {
		for (const shiny of [false, true]) {
			const legacy = {species: 'Kyurem-Original', shiny}, renamed = {species: 'Kyurem-Original-Fantasy', shiny};
			assert.equal(context.Dex.getPokemonIcon(renamed), context.Dex.getPokemonIcon(legacy));
			assert.equal(context.Dex.getTeambuilderSprite(renamed), context.Dex.getTeambuilderSprite(legacy));
			for (const front of [false, true]) {
				const options = {gen: 9, mod: 'gen9fantasy', shiny};
				const expected = context.Dex.getSpriteData(legacy.species, front, options);
				const actual = context.Dex.getSpriteData(renamed.species, front, options);
				for (const key of ['url', 'w', 'h', 'cryurl', 'filter', 'pixelated']) assert.equal(actual[key], expected[key], key);
			}
		}
	});
	it('resolves custom rear art and icons using the configured resource prefix', () => {
		context.Dex.iconSheetPrefix = '';
		try {
			const base = context.Dex.resourcePrefix + 'sprites/fantasy-rogue/';
			assert.equal(context.Dex.getSpriteData('Kyurem-Original', false, {gen: 9, mod: 'gen9fantasy'}).url,
				base + 'kyurem-original-back.png');
			assert(context.Dex.getPokemonIcon('Kyurem-Original').includes(context.Dex.resourcePrefix + 'sprites/pokemonicons-sheet.png'));
		} finally {
			context.Dex.iconSheetPrefix = './';
		}
	});
	it('ships and routes champion battle avatars locally', () => {
		const manifest = JSON.parse(fs.readFileSync(path.join(webRoot, 'sprites/rogue-dialogue/champions-20261024.json')));
		for (const asset of manifest.images) {
			const bytes = fs.readFileSync(path.join(webRoot, 'sprites/rogue-dialogue', asset.file));
			assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
		}
		for (const id of ['leon', 'cynthia', 'diantha', 'ash']) {
			const url = context.Dex.resolveAvatar(id);
			assert.equal(url, './sprites/trainers/' + id + '.png');
			assert.equal(imageSize(path.join(webRoot, url)).type, 'png');
		}
	});
	it('redraws both open party screens on the real settings checkbox handler', () => {
		const rendered = [];
		context.Backbone = {View: {extend: value => value}};
		context.Popup = {extend: value => value}; context.jQuery = () => ({});
		context.Storage = {prefs: (key, value) => {preferences[key] = value;}};
		context.app = {rooms: {teambuilder: {update: () => rendered.push('team')}, fantasyrogue: {render: () => rendered.push('rogue')}}};
		context.Dex.loadSpriteData = type => rendered.push(type);
		vm.runInContext(fs.readFileSync(path.join(webRoot, 'js/client-topbar.js'), 'utf8'), context);
		context.OptionsPopup.setBwgfx({currentTarget: {checked: true}});
		assert.equal(preferences.bwgfx, true); assert.deepEqual(rendered, ['bw', 'team', 'rogue']);
	});
});
