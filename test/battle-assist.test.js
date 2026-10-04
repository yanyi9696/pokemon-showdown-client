const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({ console, setTimeout, clearTimeout,
	document: { getElementsByTagName: () => [], getElementById: () => ({}) } });
context.window = context;
context.exports = context;
for (const file of ['data/pokedex.js', 'data/typechart.js', 'data/moves.js', 'data/abilities.js',
	'data/items.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
	'js/battle-dex-data.js', 'js/battle-dex.js', 'js/battle-tooltips.js']) {
	vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../play.pokemonshowdown.com', file), 'utf8'), context);
}
const dex = context.Dex.mod('gen9fcag');
const battle = { dex, gen: 9, tier: '[Gen 9] FC AG', rules: {}, weather: '', hasPseudoWeather: () => false };
const tips = Object.create(context.BattleTooltips.prototype);
tips.battle = battle;
function mon(species, options = {}) {
	return {
		name: species, speciesForme: species, level: 100, volatiles: {}, item: '',
		getSpecies: () => dex.species.get(species), getTypeList: () => dex.species.get(species).types,
		effectiveAbility: () => '', isGrounded: () => !dex.species.get(species).types.includes('Flying'), ...options,
	};
}
function factor(move, target, source = mon('Mew')) {
	const m = dex.moves.get(move);
	return tips.getMoveEffectiveness(source, m, m.type, m.category, target);
}
describe('Battle effectiveness and four speed benchmarks', () => {
	it('shows Zapdos at 184 / 236 / 299 / 328', () => {
		const p = mon('Zapdos');
		const [min, max] = tips.getSpeedRange(p);
		const { ev0, ev252 } = tips.getSpeedBenchmarks(p);
		assert.deepEqual([min, ev0, ev252, max], [184, 236, 299, 328]);
	});
	it('uses level 50 and live Fantasy base stats', () => {
		const p = mon('Zapdos', { level: 50 });
		assert.equal(tips.getSpeedBenchmarks(p).ev0, 120);
		assert.equal(tips.getSpeedBenchmarks(p).ev252, 152);
		const custom = mon('Metagross-Mega-Fantasy');
		assert.equal(tips.getSpeedBenchmarks(custom).ev0, custom.getSpecies().baseStats.spe * 2 + 36);
	});
	it('distinguishes neutral, resistance, weakness and immunity', () => {
		assert.equal(factor('Earthquake', mon('Zapdos')), 0);
		assert.equal(factor('Rock Slide', mon('Zapdos')), 2);
		assert.equal(factor('Grass Knot', mon('Skuntank')), 0.5);
		assert.equal(factor('Shadow Ball', mon('Audino-Mega-Fantasy')), 0);
		assert.equal(factor('Thunderbolt', mon('Mew')), 1);
		assert.equal(factor('Thunderbolt', mon('Gyarados')), 4);
		assert.equal(factor('Grass Knot', mon('Charizard')), 0.25);
		assert.equal(factor('Roost', mon('Zapdos')), null);
	});
	it('uses the current types after Tera', () => {
		assert.equal(factor('Earthquake', mon('Zapdos', { getTypeList: () => ['Electric'], isGrounded: () => true })), 2);
	});
	it('does not invent unknown abilities and bypasses revealed Levitate correctly', () => {
		assert.equal(factor('Earthquake', mon('Gengar')), 2);
		const revealed = mon('Gengar', { effectiveAbility: () => 'Levitate', isGrounded: () => false });
		assert.equal(factor('Earthquake', revealed), 0);
		assert.equal(factor('Earthquake', revealed, mon('Mew', { effectiveAbility: () => 'Mold Breaker' })), 2);
		assert.equal(factor('Thousand Arrows', revealed), 2);
	});
	it('applies known Fantasy rain weakness suppression', () => {
		battle.weather = 'raindance';
		assert.equal(factor('Thunderbolt', mon('Kyogre', { effectiveAbility: () => 'Yuan Hai Yang Liu' })), 1);
		battle.weather = '';
	});
	it('does not multiply fixed damage by super-effectiveness', () => {
		assert.equal(factor('Seismic Toss', mon('Snorlax')), 1);
	});
});
