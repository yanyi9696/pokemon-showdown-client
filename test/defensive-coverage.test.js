const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadClient() {
	const jquery = () => ({ css() {}, remove() {}, width: () => 1024 });
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
		vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../play.pokemonshowdown.com', file), 'utf8'), context, { filename: file });
	}
	return context;
}

describe('Teambuilder defensive coverage', () => {
	const client = loadClient();
	function room(sets, format = 'gen9ou') {
		const editor = Object.create(client.TeambuilderRoom);
		const dex = client.Dex.mod(format);
		editor.curTeam = { name: 'Coverage test', format, gen: dex.gen, dex, capacity: 6 };
		editor.curSetList = sets;
		return editor;
	}
	function coverage(sets, format) {
		return Object.fromEntries(room(sets, format).getDefensiveCoverage().map(row => [row.type, row]));
	}
	function expectCount(rows, type, resists, weaknesses) {
		assert.equal(rows[type].resists, resists, `${type} resistances`);
		assert.equal(rows[type].weaknesses, weaknesses, `${type} weaknesses`);
	}

	it('matches the screenshot for Aegislash, including immunities as resistances', () => {
		const rows = coverage([{ species: 'Aegislash', ability: 'Stance Change' }]);
		assert.equal(Object.keys(rows).length, 18);
		for (const type of ['Dark', 'Fire', 'Ghost', 'Ground']) expectCount(rows, type, 0, 1);
		for (const type of ['Electric', 'Water']) expectCount(rows, type, 0, 0);
		for (const type of ['Bug', 'Dragon', 'Fairy', 'Fighting', 'Flying', 'Grass', 'Ice', 'Normal', 'Poison', 'Psychic', 'Rock', 'Steel']) {
			expectCount(rows, type, 1, 0);
		}
	});
	it('counts Pokemon, rather than damage multipliers, and combines both types', () => {
		const rows = coverage([{ species: 'Charizard' }, { species: 'Gyarados' }]);
		expectCount(rows, 'Rock', 0, 2);
		expectCount(rows, 'Ground', 2, 0);
		expectCount(rows, 'Grass', 1, 0);
		expectCount(rows, 'Water', 1, 1);
	});
	it('uses the selected ability and the default ability when unspecified', () => {
		expectCount(coverage([{ species: 'Bronzong' }]), 'Ground', 1, 0);
		const heatproof = coverage([{ species: 'Bronzong', ability: 'Heatproof' }]);
		expectCount(heatproof, 'Ground', 0, 1);
		expectCount(heatproof, 'Fire', 0, 0);
	});
	it('uses the combined matchup for Wonder Guard', () => {
		const rows = coverage([{ species: 'Shedinja', ability: 'Wonder Guard' }]);
		expectCount(rows, 'Fire', 0, 1);
		expectCount(rows, 'Ghost', 0, 1);
		expectCount(rows, 'Water', 1, 0);
	});
	it('accounts for persistent ability reductions and vulnerabilities', () => {
		expectCount(coverage([{ species: 'Snorlax', ability: 'Thick Fat' }]), 'Ice', 1, 0);
		expectCount(coverage([{ species: 'Parasect', ability: 'Dry Skin' }]), 'Water', 1, 0);
		expectCount(coverage([{ species: 'Heliolisk', ability: 'Dry Skin' }]), 'Fire', 0, 1);
		expectCount(coverage([{ species: 'Garganacl', ability: 'Purifying Salt' }]), 'Ghost', 1, 0);
	});
	it('removes only the Flying weakness under Delta Stream', () => {
		const editor = room([]);
		assert.equal(editor.getDefensiveEffectiveness(['Dragon', 'Flying'], 'deltastream', 'Ice'), 2);
		assert.equal(editor.getDefensiveEffectiveness(['Water'], 'deltastream', 'Electric'), 2);
	});
	it('respects older generations and type charts', () => {
		const gen1 = coverage([{ species: 'Magnemite', ability: 'Levitate' }], 'gen1ou');
		assert.equal(Object.keys(gen1).length, 15);
		expectCount(gen1, 'Ground', 0, 1);
		expectCount(gen1, 'Fire', 0, 0);
		const gen5 = coverage([{ species: 'Aegislash', ability: 'Stance Change' }], 'gen5ou');
		assert.equal(Object.keys(gen5).length, 17);
		assert(!gen5.Fairy);
		expectCount(coverage([{ species: 'Skarmory' }], 'gen5ou'), 'Dark', 1, 0);
		expectCount(coverage([{ species: 'Skarmory' }]), 'Dark', 0, 0);
	});
	it('does not treat pre-Gen 5 Lightning Rod or Storm Drain as immunities', () => {
		expectCount(coverage([{ species: 'Seaking', ability: 'Lightning Rod' }], 'gen4ou'), 'Electric', 0, 1);
		expectCount(coverage([{ species: 'Seaking', ability: 'Lightning Rod' }], 'gen5ou'), 'Electric', 1, 0);
		expectCount(coverage([{ species: 'Gastrodon', ability: 'Storm Drain' }], 'gen4ou'), 'Water', 0, 0);
		expectCount(coverage([{ species: 'Gastrodon', ability: 'Storm Drain' }], 'gen5ou'), 'Water', 1, 0);
	});
	it('ignores abilities in Lets Go', () => {
		expectCount(coverage([{ species: 'Gengar', ability: 'Levitate' }], 'gen7letsgoou'), 'Ground', 0, 1);
	});
	it('uses Fantasy formes and treats the typeless component as neutral', () => {
		const rows = coverage([{ species: 'Silvally-Fire-Fantasy', ability: 'No Ability' }], 'gen9fcag');
		expectCount(rows, 'Water', 0, 1);
		expectCount(rows, 'Grass', 1, 0);
		const typeless = coverage([{ species: 'Type: Null-Fantasy', ability: 'No Ability' }], 'gen9fcag');
		assert(Object.values(typeless).every(row => row.resists === 0 && row.weaknesses === 0));
	});
	it('applies Fantasy Mi Shi without reversing immunities', () => {
		const rows = coverage([{ species: 'Charizard', ability: 'Mi Shi' }], 'gen9fcag');
		expectCount(rows, 'Rock', 1, 0);
		expectCount(rows, 'Bug', 0, 1);
		expectCount(rows, 'Ground', 1, 0);
	});
	it('applies Fantasy weakness removal and Heatproof changes only in Fantasy', () => {
		expectCount(coverage([{ species: 'Pinsir', ability: 'Fengchao' }], 'gen9fcag'), 'Fire', 0, 0);
		expectCount(coverage([{ species: 'Pinsir', ability: 'Fengchao' }]), 'Fire', 0, 1);
		expectCount(coverage([{ species: 'Bronzong', ability: 'Heatproof' }], 'gen9fcag'), 'Fire', 1, 0);
		expectCount(coverage([{ species: 'Bronzong', ability: 'Heatproof' }]), 'Fire', 0, 0);
		const editor = room([], 'gen9fcag');
		assert.equal(editor.getDefensiveEffectiveness(['Steel', 'Grass'], 'weichongnitai', 'Fire'), 2);
		assert.equal(editor.getDefensiveEffectiveness(['Steel', 'Grass'], 'weichongnitai', 'Fighting'), 1);
	});
	for (const [ability, type] of [
		['Water Compaction', 'Water'], ['Shi Chong', 'Bug'], ['Tun Du', 'Poison'],
		['Gang Tie Ju He Wu', 'Steel'], ['Shi Shan', 'Grass'], ['Shi Shan', 'Ground'],
	]) {
		it(`includes Fantasy ${ability}'s ${type} immunity`, () => {
			expectCount(coverage([{ species: 'Mew', ability }], 'gen9fcag'), type, 1, 0);
		});
	}
	it('does not assume temporary weather, items, or Terastallization', () => {
		const rows = coverage([{ species: 'Charizard', ability: 'Blaze', item: 'Air Balloon', teraType: 'Water' }]);
		expectCount(rows, 'Rock', 0, 1);
		expectCount(rows, 'Ground', 1, 0);
		expectCount(coverage([{ species: 'Mew', ability: 'Yuan Hai Yang Liu' }], 'gen9fcag'), 'Dark', 0, 1);
	});
	it('skips blank and unrecognized species without changing counts', () => {
		const rows = coverage([{ species: '' }, { species: 'Missing Species' }, { species: 'Aegislash' }]);
		expectCount(rows, 'Fire', 0, 1);
		expectCount(rows, 'Normal', 1, 0);
	});
	it('sorts uncovered weaknesses first, then neutral types, then resistances', () => {
		const rows = room([{ species: 'Aegislash' }]).getDefensiveCoverage();
		assert.deepEqual(Array.from(rows.slice(0, 4), row => row.type), ['Dark', 'Fire', 'Ghost', 'Ground']);
		assert.deepEqual(Array.from(rows.slice(4, 6), row => row.type), ['Electric', 'Water']);
		assert(rows.slice(6).every(row => row.resists === 1));
	});
	it('updates after editing, deleting, and importing team members', () => {
		const editor = room([{ species: 'Charizard' }]);
		editor.curSetList.push({ species: 'Blastoise' });
		assert.equal(editor.getDefensiveCoverage().find(row => row.type === 'Water').resists, 1);
		editor.curSetList.splice(0, 1);
		assert.equal(editor.getDefensiveCoverage().find(row => row.type === 'Rock').weaknesses, 0);
		editor.curSetList = client.Storage.importTeam('Bronzong\nAbility: Heatproof\n- Psychic');
		editor.save = () => {};
		editor.update = () => {};
		editor.changeFormat('gen9fcag');
		assert.equal(editor.getDefensiveCoverage().find(row => row.type === 'Fire').resists, 1);
	});
	it('renders a collapsible table below the team and hides it for empty teams and boxes', () => {
		const editor = room([{ species: 'Aegislash' }]);
		editor.renderSet = () => '<li>Team member</li>';
		editor.$el = { html: html => { editor.html = html; } };
		editor.$ = () => ({ focus: () => ({ select() {} }) });
		editor.updateTeamView();
		assert(editor.html.includes('<details class="team-defensive-coverage" open>'));
		assert.equal((editor.html.match(/scope="row"/g) || []).length, 18);
		assert(editor.html.indexOf('team-defensive-coverage') > editor.html.indexOf('Team member'));
		editor.curTeam.capacity = 24;
		assert.equal(editor.renderDefensiveCoverage(), '');
		assert.equal(room([]).renderDefensiveCoverage(), '');
	});
});
