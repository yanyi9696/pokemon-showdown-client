'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const webRoot = path.resolve(__dirname, '../play.pokemonshowdown.com');

describe('Rogue emblems are not teambuilder held items', () => {
	let client;
	before(() => {
		client = vm.createContext({
			Pokemon: function () {}, Config: {routes: {client: 'client.example'}},
			document: {location: {protocol: 'https:'}, getElementById: () => ({}), getElementsByTagName: () => []},
		});
		client.window = client; client.exports = client;
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/items.js', 'data/aliases.js',
			'data/teambuilder-tables.js', 'data/gen9fantasy.js', 'data/search-index.js',
			'js/battle-dex.js', 'js/battle-dex-search.js']) {
			vm.runInContext(fs.readFileSync(path.join(webRoot, file), 'utf8'), client, {filename: file});
		}
	});

	for (const format of ['gen9fantasy', 'gen9fcuber', 'gen9ou']) {
		it(`excludes emblems from both the default list and typed searches in ${format}`, () => {
			const search = new client.DexSearch('item', format, 'Kyurem-Original');
			for (const query of ['', 'rogue', 'rogueemblemfire', 'rogue emble', 'fire', 'rogueuniversal', 'rogueuniversalmegastone']) {
				search.find(query);
				assert(!search.results.some(row => row[0] === 'item' && /^rogue(?:emblem|universal)/.test(row[1])), query);
			}
			search.find('leftovers');
			assert(search.results.some(row => row[0] === 'item' && row[1] === 'leftovers'));
		});
	}

	it('retains Fantasy held items and all emblem data for the independent Rogue slot', () => {
		const search = new client.DexSearch('item', 'gen9fantasy', 'Kyurem-Original');
		search.find('fantasylifeorb');
		assert(search.results.some(row => row[0] === 'item' && row[1] === 'fantasylifeorb'));
		const dex = client.Dex.mod('gen9fantasy');
		for (const type of ['bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire', 'flying',
			'ghost', 'grass', 'ground', 'ice', 'normal', 'poison', 'psychic', 'rock', 'steel', 'water']) {
			assert(dex.items.get(`rogueemblem${type}`).exists, type);
		}
	});
	it('uses normal item icon slots for universal items and retains their independent Rogue data', () => {
		assert(client.Dex.mod('gen9fantasy').items.get('rogueuniversalmegastone').exists);
		assert.equal(client.Dex.getItemIcon('rogueuniversalmegastone'), client.Dex.getItemIcon('intriguingstone'));
		assert.notEqual(client.Dex.getItemIcon('rogueuniversalmegastone'), client.Dex.getItemIcon('eviolite'));
		assert.match(client.Dex.getItemIcon('rogueuniversalmegastone'), /scroll -0px -1152px/);
		assert.equal(client.Dex.getItemIcon('rogueuniversalwishingstar'), client.Dex.getItemIcon('gmegawishingstar'));
		assert.notEqual(client.Dex.getItemIcon('rogueuniversalwishingstar'), client.Dex.getItemIcon('unknownitem'));
		assert.equal(client.Dex.getItemIcon('rogueuniversalpsychicz'), client.Dex.getItemIcon('psychiumz'));
		assert.equal(client.Dex.getItemIcon('rogueuniversalmegastone'),
			client.Dex.getItemIcon(client.Dex.mod('gen9fantasy').items.get('rogueuniversalmegastone')));
	});
});
