const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadClient() {
	const jquery = () => ({ css() {}, remove() {} });
	jquery.extend = Object.assign;
	jquery.trim = text => text.trim();
	const context = vm.createContext({
		console, jQuery: jquery, $: jquery,
		Room: { extend: value => value }, Popup: { extend: value => value },
		Config: { routes: { client: 'play.pokemonshowdown.com' } },
		location: { host: 'localhost' },
		document: { body: {}, getElementById: () => ({}), getElementsByTagName: () => [] },
		localStorage: { getItem: () => null },
		BattleLog: { escapeHTML: text => String(text) },
	});
	context.window = context;
	context.exports = context;
	for (const file of [
		'data/pokedex.js', 'data/typechart.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
		'js/battle-dex-data.js', 'js/battle-dex.js', 'js/storage.js', 'js/client-teambuilder.js',
	]) {
		vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../play.pokemonshowdown.com', file), 'utf8'), context, { filename: file, displayErrors: false });
	}
	return context;
}

describe('Default Tera types in the teambuilder', () => {
	const client = loadClient();
	const dex = client.Dex.mod('gen9fcag');
	const cases = [
		['Pikachu', 'Electric'],
		['Charizard', 'Fire'],
		['Mewtwo-Fantasy', 'Psychic'],
		['Silvally-Fire-Fantasy', 'Fire'],
		['Silvally-Water-Fantasy', 'Water'],
		['Silvally-Fantasy', 'Normal'],
		['Type: Null-Fantasy', 'Normal'],
	];

	function room(set) {
		const result = Object.create(client.TeambuilderRoom);
		result.curTeam = { gen: 9, format: 'gen9fcag', dex };
		result.curSet = set;
		result.$chart = { html: html => { result.html = html; } };
		return result;
	}

	for (const [species, expectedType] of cases) {
		it(`keeps ${species}'s ${expectedType} default through save, reload, and export`, () => {
			const set = { species, moves: ['Splash'] };
			const editor = room(set);
			editor.updateDetailsForm();
			assert(editor.html.includes(`<option value="${expectedType}" selected="selected">`));
			const packed = client.Storage.packTeam([set]);
			const restored = client.Storage.unpackTeam(packed);
			assert(!restored[0].teraType, 'Saving must preserve an unspecified default');
			editor.curSet = restored[0];
			editor.updateDetailsForm();
			assert(editor.html.includes(`<option value="${expectedType}" selected="selected">`));
			assert(client.Teams.export(restored, 9, false, dex).includes(`Tera Type: ${expectedType}`));
			const imported = client.Storage.importTeam(client.Storage.exportTeam(restored, 9));
			editor.curSet = imported[0];
			editor.updateDetailsForm();
			assert(editor.html.includes(`<option value="${expectedType}" selected="selected">`));
		});
	}

	for (const teraType of ['Normal', 'Water']) {
		it(`retains an explicitly selected ${teraType} Tera type`, () => {
			const set = { species: 'Silvally-Fire-Fantasy', moves: ['Splash'], teraType };
			const restored = client.Storage.unpackTeam(client.Storage.packTeam([set]));
			assert.equal(restored[0].teraType, teraType);
			const editor = room(restored[0]);
			editor.updateDetailsForm();
			assert(editor.html.includes(`<option value="${teraType}" selected="selected">`));
			assert(client.Teams.export(restored, 9, false, dex).includes(`Tera Type: ${teraType}`));
		});
	}

	it('restores the secondary type when saving the default in the details form', () => {
		const set = { species: 'Silvally-Fire-Fantasy', moves: ['Splash'], teraType: 'Water' };
		const editor = room(set);
		editor.$chart.find = selector => ({ val: () => selector === 'select[name=teratype]' ? 'Fire' : '' });
		editor.$ = () => ({ html: html => { editor.details = html; } });
		editor.save = () => {};
		editor.updatePokemonSprite = () => {};
		editor.detailsChange({ preventDefault() {}, stopPropagation() {} });
		assert.equal(set.teraType, undefined);
		assert(editor.details.includes('<label>Tera Type</label>Fire'));
		const restored = client.Storage.unpackTeam(client.Storage.packTeam([set]));
		editor.curSet = restored[0];
		editor.updateDetailsForm();
		assert(editor.html.includes('<option value="Fire" selected="selected">'));
	});

	it('uses the current species default when a sample set omits its Tera type', () => {
		const editor = room({ species: 'Silvally-Fire-Fantasy', moves: ['Splash'], teraType: 'Water' });
		editor.userSets = { gen9fcag: { 'Silvally-Fire-Fantasy': { Sample: { moves: ['Splash'] } } } };
		editor.$ = () => ({ text: () => 'Sample', hasClass: name => name === 'box', val: value => { editor.sample = value; } });
		editor.importSmogonSet(0, {});
		assert(editor.sample.includes('Tera Type: Fire'));
	});

	it('keeps forced Tera types in the details form and export', () => {
		const set = { species: 'Ogerpon-Wellspring', moves: ['Splash'], teraType: 'Fire' };
		const editor = room(set);
		editor.updateDetailsForm();
		assert(editor.html.includes('title="Tera Type">Tera Type:</label><div>Water'));
		assert(!editor.html.includes('name="teratype"'));
		assert(client.Teams.export([set], 9, false, dex).includes('Tera Type: Water'));
	});
});
