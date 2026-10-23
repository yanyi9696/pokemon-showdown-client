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
		assert.equal(manifest.files.filter(entry => entry.file.startsWith('key-items/')).length, 14);
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
	it('keeps custom pixel forms and ZA placeholders when enabling 2D', () => {
		preferences.bwgfx = true;
		for (const species of ['Flygon-Mega-Fantasy', 'Steelix-Mega-X-Fantasy', 'Shadow-Lugia-Fantasy']) {
			const style = context.Dex.getTeambuilderSprite({species});
			const filename = /url\(\.\/(.*?)\)/.exec(style)?.[1];
			assert(filename, style); assert(fs.existsSync(path.join(webRoot, filename)), filename);
		}
		assert.match(context.Dex.getTeambuilderSprite({species: 'Absol-Mega-Z-Fantasy'}), /sprites\/gen5\/absol-megaz\.png/);
	});
	it('loads verified triple Kyurem art locally for party and both battle positions', () => {
		for (const shiny of [false, true]) {
			const filename = `sprites/fantasy-rogue/kyurem-original${shiny ? '-shiny' : ''}.png`;
			assert.deepEqual(Object.values(imageSize(path.join(webRoot, filename))).slice(0, 2).sort(), [64, 64]);
			assert(context.Dex.getTeambuilderSprite({species: 'Kyurem-Original', shiny}).includes(filename));
			for (const front of [false, true]) {
				const sprite = context.Dex.getSpriteData('Kyurem-Original', front, {gen: 9, mod: 'gen9fantasy', shiny});
				assert.equal(sprite.url, './' + filename); assert(sprite.pixelated);
				assert(sprite.isFrontSprite, 'the documented back fallback is explicitly front artwork');
			}
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
