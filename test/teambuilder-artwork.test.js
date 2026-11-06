'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const webRoot = path.resolve(__dirname, '../play.pokemonshowdown.com');

describe('Teambuilder artwork isolation', () => {
	let client, editor, preferences;
	before(() => {
		preferences = {};
		client = vm.createContext({
			Pokemon: function () {}, jQuery: function () {},
			Room: {extend: value => value}, Popup: {extend: value => value},
			Config: {routes: {client: 'client.example'}},
			document: {location: {protocol: 'https:'}, getElementById: () => ({}), getElementsByTagName: () => []},
			BattleLog: {escapeHTML: text => String(text || '')}, app: {send() {}},
		});
		client.window = client; client.exports = client;
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/pokedex-mini.js',
			'data/teambuilder-tables.js', 'data/gen9fantasy.js', 'js/battle-dex.js', 'js/client-teambuilder.js']) {
			vm.runInContext(fs.readFileSync(path.join(webRoot, file), 'utf8'), client, {filename: file});
		}
		client.Dex.prefs = key => preferences[key];
		editor = Object.create(client.TeambuilderRoom);
		editor.curTeam = {gen: 9, dex: client.Dex.mod('gen9fantasy')};
		editor.getStat = () => 100;
		editor.updateStatGraph = () => {};
	});

	function artwork(html) {
		const panel = html.match(/<div class="setchart(?: [^"]*)?"[^>]*>/);
		assert(panel, 'the editor panel remains present');
		assert(!panel[0].includes('filter:'), 'the editor and its controls must not receive the artwork filter');
		const layer = html.match(/<span class="setchart-sprite" aria-hidden="true" style="([^"]*)"><\/span>/);
		assert(layer, 'the artwork must be an empty transparent layer, separate from editor controls');
		return layer[1];
	}

	it('outlines Fantasy artwork, not the editor card, for HOME, custom, pixel and shiny art', () => {
		for (const species of ['Arceus-Legend-Fantasy', 'Primarina-Fantasy', 'Onix-Fantasy', 'Flygon-Mega-Fantasy',
			'Kyurem-Original', 'Kyurem-Original-Fantasy']) {
			for (const pixels of [false, true]) {
				preferences.bwgfx = pixels;
				for (const shiny of [false, true]) {
					const set = {species, shiny, evs: {}, moves: ['Tackle']};
					const style = artwork(editor.renderSet(set, 0));
					assert.equal(style, client.Dex.getTeambuilderSprite(set, 9));
					assert.match(style, species.startsWith('Kyurem-Original') ?
						/filter:blur\(\.2px\) drop-shadow\(3px 0 3px/ : /filter:drop-shadow\(3px 0 3px/);
				}
			}
		}
	});

	it('keeps ordinary Pokemon and empty slots plain, and retains the form picker control', () => {
		preferences.bwgfx = false;
		for (const species of ['', 'Arceus', 'Alcremie']) {
			const html = editor.renderSet({species, evs: {}, moves: []}, 0);
			assert(!artwork(html).includes('filter:'));
			assert.match(html, /name="pokemon"/);
			if (species === 'Alcremie') assert.match(html, /setcell-sprite changeform/);
		}
	});

	it('scopes compact artwork to triple Kyurem and retains its nickname field', () => {
		for (const species of ['Kyurem-Original', 'Kyurem-Original-Fantasy', 'Kyurem', 'Kyurem-Black', 'Kyurem-White', 'Arceus-Legend-Fantasy', '']) {
			for (const shiny of [false, true]) {
				const html = editor.renderSet({species, shiny, name: 'My nickname', evs: {}, moves: []}, 0);
				assert.equal(html.includes('class="setchart setchart-kyurem-original"'), ['Kyurem-Original', 'Kyurem-Original-Fantasy'].includes(species));
				if (species) assert.match(html, /name="nickname"[^>]*value="My nickname"/);
			}
		}
	});

	it('updates only the artwork when changing species or appearance, and clears a previous glow', () => {
		const styles = new Map();
		const classes = new Map();
		editor.$ = selector => ({
			attr: (key, value) => styles.set(selector, value), css() {},
			toggleClass: (name, enabled) => classes.set(selector + '.' + name, enabled),
		});
		editor.curSetLoc = 0;
		for (const species of ['Arceus-Legend-Fantasy', 'Primarina-Fantasy', 'Kyurem-Original', 'Kyurem-Original-Fantasy', 'Arceus', '']) {
			for (const pixels of [false, true]) {
				preferences.bwgfx = pixels;
				for (const shiny of [false, true]) {
					editor.curSet = {species, shiny};
					editor.updatePokemonSprite();
					assert(!styles.has('.setchart'), 'live updates must not put a filter back on the editor');
					assert.equal(styles.get('.setchart-sprite'), client.Dex.getTeambuilderSprite(editor.curSet, 9));
					assert.equal(styles.get('.pokemonicon-0'), client.Dex.getPokemonIcon(editor.curSet));
					assert.equal(classes.get('.setchart.setchart-kyurem-original'), ['Kyurem-Original', 'Kyurem-Original-Fantasy'].includes(species));
					assert.equal(classes.get('.teamwrapper.teamwrapper-kyurem-original'), ['Kyurem-Original', 'Kyurem-Original-Fantasy'].includes(species));
				}
			}
		}
		assert(!styles.get('.setchart-sprite').includes('filter:'));
	});

	it('tracks the selected Kyurem artwork when rebuilding the selected set', () => {
		const classes = new Map();
		editor.curSetList = [];
		editor.renderTeambar = () => '';
		editor.$ = selector => ({
			first() { return this; }, html() {},
			toggleClass: (name, enabled) => classes.set(selector + '.' + name, enabled),
		});
		for (const species of ['Kyurem-Original', 'Kyurem-Original-Fantasy', 'Kyurem', 'Kyurem-Original', '']) {
			editor.curSet = {species, evs: {}, moves: []};
			editor.updateSetTop();
			assert.equal(classes.get('.teamwrapper.teamwrapper-kyurem-original'), ['Kyurem-Original', 'Kyurem-Original-Fantasy'].includes(species));
		}
	});
	it('displays Chinese species, items, abilities and moves without changing stored sets, and accepts Chinese edits', () => {
		const source = fs.readFileSync(path.join(webRoot, 'js/ps-china-translator.js'), 'utf8');
		vm.runInContext(source.slice(0, source.indexOf('(function() {')), client);
		client.localStorage = {getItem: () => 'zh'};
		client.BattleAliases ||= {};
		const set = {species: 'Kyurem-Original', name: 'Keep my nickname', item: 'Shadow Bottle', ability: 'Hei An Qin Shi', moves: ['Dian Shan Xun Ji'], evs: {}};
		const before = structuredClone(set);
		const html = editor.renderSet(set, 0);
		for (const [name, value] of [['pokemon', '幻想酋雷姆-三合一'], ['ability', '黑暗侵蚀'], ['move1', '电闪迅击']]) {
			assert.match(html, new RegExp(`name="${name}"[^>]+value="${value}"`));
		}
		assert.deepEqual(set, before);
		editor.curSet = set; editor.curChartName = 'ability';
		let submitted;
		editor.chartSet = value => { submitted = value; };
		editor.chartChange({currentTarget: {name: 'ability', value: '天籁之音'}});
		assert.equal(submitted, 'Tian Lai Zhi Yin');
		editor.chartChange({currentTarget: {name: 'ability', value: '黑暗侵蚀'}});
		assert.equal(submitted, 'Hei An Qin Shi');
		set.ability = 'He An Qin Shi';
		editor.chartChange({currentTarget: {name: 'ability', value: '黑暗侵蚀'}});
		assert.equal(submitted, 'Hei An Qin Shi');
		set.ability = before.ability;
		for (const [field, chinese, canonical] of [['move1', '电闪迅击', 'Dian Shan Xun Ji'], ['pokemon', '幻想酋雷姆-三合一', 'Kyurem-Original-Fantasy']]) {
			editor.curChartName = field;
			editor.chartChange({currentTarget: {name: field, value: chinese}});
			assert.equal(submitted, canonical);
		}
		const values = new Map();
		editor.$ = selector => ({val(value) { if (value !== undefined) { values.set(selector, value); return this; } return values.get(selector); }, removeClass() { return this; }});
		editor.chartSet = client.TeambuilderRoom.chartSet;
		editor.save = () => {};
		editor.curChartName = 'ability';
		editor.chartChange({currentTarget: {name: 'ability', value: '天籁之音'}});
		assert.equal(set.ability, 'Tian Lai Zhi Yin');
		assert.equal(values.get('input[name=ability]'), '天籁之音');
		set.ability = before.ability;
		client.localStorage = {getItem: () => 'en'};
		assert.match(editor.renderSet(set, 0), /name="ability"[^>]+value="Hei An Qin Shi"/);
		assert.match(editor.renderSet(set, 0), /name="pokemon"[^>]+value="Kyurem-Original-Fantasy"/);
		delete client.translateRogueName;
	});
});
