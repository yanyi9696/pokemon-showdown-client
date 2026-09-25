const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const format = 'gen9fcrumax9pick6';
const species = ['Pikachu', 'Charizard', 'Blastoise', 'Venusaur', 'Gengar', 'Dragonite', 'Snorlax', 'Lapras', 'Eevee'];
const sets = () => species.map(name => ({ species: name, moves: ['Tackle'] }));

function loadClient() {
	const jquery = element => element && element.css ? element : { css() {}, remove() {} };
	jquery.extend = (...args) => args[0] === true ? Object.assign(args[1], JSON.parse(JSON.stringify(args[2]))) : Object.assign(...args);
	jquery.trim = text => text.trim();
	const context = vm.createContext({
		console, jQuery: jquery, $: jquery, navigator: {},
		Room: { extend: value => value }, Popup: { extend: (value, statics) => Object.assign(value, statics) },
		Config: { routes: { client: 'play.pokemonshowdown.com' } },
		location: { host: 'localhost' },
		document: { body: {}, getElementById: () => ({}), getElementsByTagName: () => [] },
		localStorage: { getItem: () => null, setItem() {} },
		BattleLog: { escapeHTML: text => String(text) },
		app: { rooms: {}, user: { trigger() {} }, addPopupMessage() {} },
	});
	context.window = context;
	context.exports = context;
	for (const file of [
		'data/pokedex.js', 'data/typechart.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
		'js/battle-dex-data.js', 'js/battle-dex.js', 'js/storage.js', 'js/client-teambuilder.js', 'js/client-mainmenu.js',
	]) {
		vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../play.pokemonshowdown.com', file), 'utf8'), context, { filename: file });
	}
	context.Storage.teams = [];
	return context;
}

describe('FC RU Max 9 Pick 6 teams', () => {
	let client;
	let storage;
	let editor;
	beforeEach(() => {
		client = loadClient();
		storage = client.Storage;
		editor = Object.create(client.TeambuilderRoom);
		editor.updateTeamInterface = () => {};
		editor.update(); // Initialize the teambuilder's reference to Storage.teams.
		editor.update = () => {};
		editor.save = () => {};
		editor.$ = () => ({ select() {} });
		editor.curFolder = format;
		editor.curTeam = editor.createTeam();
		editor.curTeam.dex = client.Dex.mod(format);
		editor.curSetList = sets().slice(0, 6);
	});

	it('creates nine-slot teams, while normal teams and boxes retain their capacities', () => {
		assert.equal(editor.curTeam.capacity, 9);
		assert.equal(editor.createTeam(null, true).capacity, 24);
		editor.curFolder = 'gen9fcou';
		assert.equal(editor.createTeam().capacity, 6);
	});
	it('upgrades older teams when duplicated and preserves boxes', () => {
		const old = { ...editor.curTeam, capacity: 6, team: storage.packTeam(sets()) };
		const copy = editor.createTeam(old);
		assert.equal(copy.capacity, 9);
		assert.equal(storage.unpackTeam(copy.team).length, 9);
		assert.equal(editor.createTeam({ ...old, capacity: 24 }).capacity, 24);
	});
	it('changes capacity with the format without discarding existing Pokemon', () => {
		editor.curSetList = sets();
		editor.changeFormat('gen9fcou');
		assert.equal(editor.curTeam.capacity, 6);
		assert.equal(editor.curSetList.length, 9);
		editor.changeFormat(format);
		assert.equal(editor.curTeam.capacity, 9);
		editor.curTeam.capacity = 24;
		editor.changeFormat('gen9fcou');
		editor.changeFormat(format);
		assert.equal(editor.curTeam.capacity, 24);
	});
	it('reloads all nine members from packed saves and keeps them as a battle team', () => {
		const team = { ...editor.curTeam, team: storage.packTeam(sets()) };
		const saved = storage.packAllTeams([team]);
		assert(!saved.includes('-box]'));
		const restored = storage.unpackAllTeams(saved)[0];
		assert.equal(restored.capacity, 9);
		assert.deepEqual(Array.from(storage.unpackTeam(restored.team), set => set.species), species);
		assert.equal((storage.getTeamIcons(restored).match(/class="picon"/g) || []).length, 9);
	});
	it('migrates old JSON saves, including boxes in the same format', () => {
		const teams = storage.unpackAllTeams(JSON.stringify([
			{ name: 'Old team', format, team: sets() },
			{ name: 'Old box', format: format + '-box', team: sets() },
		]));
		assert.equal(teams[0].capacity, 9);
		assert.equal(teams[1].capacity, 24);
	});
	it('round-trips text backups with all nine members and preserves box metadata', () => {
		storage.teams = [
			{ ...editor.curTeam, team: storage.packTeam(sets()) },
			{ ...editor.curTeam, name: 'Box', capacity: 24, team: storage.packTeam(sets()) },
		];
		const backup = storage.exportAllTeams();
		storage.importTeam(backup, true);
		assert.equal(storage.teams[0].capacity, 9);
		assert.equal(storage.unpackTeam(storage.teams[0].team).length, 9);
		assert.equal(storage.teams[1].capacity, 24);
	});
	it('loads nine-slot teams from desktop team filenames', () => {
		client.fs = { readFile: (filename, callback) => callback(null, storage.exportTeam(sets(), 9)) };
		storage.nwTeamsLeft = 1;
		storage.nwFinishedLoadingTeams = () => {};
		storage.nwLoadTeamFile('[' + format + '] Nine.txt');
		assert.equal(storage.teams[0].capacity, 9);
		assert.equal(storage.unpackTeam(storage.teams[0].team).length, 9);
	});
	it('recognizes nine-slot teams when a team file is dropped into the editor', () => {
		client.FileReader = class {
			readAsText() { this.onload({ target: { result: storage.exportTeam(sets(), 9) } }); }
		};
		editor.finishDrop = () => {};
		editor.defaultDropTeam({ originalEvent: { dataTransfer: { files: [{ name: '[' + format + '] Nine.txt' }] } } });
		assert.equal(storage.teams[0].capacity, 9);
		assert.equal(storage.unpackTeam(storage.teams[0].team).length, 9);
	});
	it('allows adding the seventh, eighth and ninth members, but not a tenth', () => {
		for (let i = 6; i < 9; i++) {
			editor.addPokemon();
			assert.equal(editor.curSetList.length, i + 1);
			editor.curSet.species = species[i];
		}
		editor.addPokemon();
		assert.equal(editor.curSetList.length, 9);
	});
	it('keeps paste available past six and stops at nine', () => {
		editor.curSetList = sets().slice(0, 5);
		editor.clipboard = [{ species: 'Eevee', moves: ['Tackle'] }];
		let hidden = false;
		const button = { css: () => { hidden = true; } };
		for (let i = 6; i <= 9; i++) {
			editor.pastePokemon(null, button);
			assert.equal(editor.curSetList.length, i);
			assert.equal(hidden, i === 9);
		}
		editor.pastePokemon(null, button);
		assert.equal(editor.curSetList.length, 9);
	});
	it('restores a deleted ninth member into its empty slot without exceeding capacity', () => {
		editor.curSetList = sets();
		editor.deletedSet = editor.curSetList.pop();
		editor.deletedSetLoc = 8;
		editor.curSetList.push({ species: '' });
		editor.undeleteSet();
		assert.equal(editor.curSetList.length, 9);
		assert.equal(editor.curSetList[8].species, 'Eevee');
		editor.deletedSet = { species: 'Mew' };
		editor.undeleteSet();
		assert.equal(editor.curSetList.length, 9);
	});
	it('accepts a nine-member import and rejects ten without replacing the saved team', () => {
		let closed = 0;
		let message = '';
		editor.back = () => { closed++; };
		client.app.addPopupMessage = text => { message = text; };
		let input = storage.exportTeam(sets(), 9);
		editor.$ = () => ({ val: () => input });
		editor.saveImport();
		assert.equal(editor.curSetList.length, 9);
		assert.equal(closed, 1);
		const saved = editor.curSetList;
		input = storage.exportTeam([...sets(), { species: 'Mew', moves: ['Tackle'] }], 9);
		editor.saveImport();
		assert.equal(editor.curSetList, saved);
		assert.equal(storage.activeSetList, saved);
		assert.equal(closed, 1);
		assert(message.includes('maximum of 9'));
	});
	it('applies the same limit to URL imports', () => {
		const saved = editor.curSetList;
		editor.back = () => { throw new Error('An oversized import must stay open'); };
		editor.$ = () => ({ val: () => 'https://pokepast.es/test', attr() {} });
		client.$.ajax = options => options.success({
			notes: '', title: '', paste: storage.exportTeam([...sets(), { species: 'Mew', moves: ['Tackle'] }], 9),
		});
		editor.saveImport();
		assert.equal(editor.curSetList, saved);
	});
	it('automatically selects the nine-member battle team and renders every icon', () => {
		storage.teams = [
			{ ...editor.curTeam, name: 'Box', capacity: 24, team: storage.packTeam(sets()) },
			{ ...editor.curTeam, name: 'Nine', team: storage.packTeam(sets()) },
		];
		client.BattleFormats = { [format]: { id: format, isTeambuilderFormat: true } };
		const menu = Object.create(client.MainMenuRoom);
		menu.curTeamIndex = -1;
		const html = menu.renderTeams(format);
		assert(html.includes('name="team" value="1"'));
		assert(html.includes('teamselect-extended'));
		assert.equal((html.match(/class="picon"/g) || []).length, 9);
	});
});
