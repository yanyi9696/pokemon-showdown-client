'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const context = vm.createContext({console, setTimeout, clearTimeout,
	document: {getElementsByTagName: () => [], getElementById: () => ({})}});
context.window = context; context.exports = context;
context.BattleLog = {escapeHTML: String};
for (const file of ['data/pokedex.js', 'data/typechart.js', 'data/moves.js', 'data/abilities.js', 'data/items.js',
	'data/teambuilder-tables.js', 'data/gen9fantasy.js', 'js/battle-dex-data.js', 'js/battle-dex.js', 'js/battle-tooltips.js']) {
	vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../play.pokemonshowdown.com', file), 'utf8'), context);
}
const Value = vm.runInContext('ModifiableValue', context);
function setup(ability, weather = '', format = 'gen9fcag', overrides = {}) {
	const dex = context.Dex.mod(format);
	const battle = {dex, weather, gen: 9, tier: format, rules: {}, sides: [], abilityActive: () => false,
		hasPseudoWeather: () => false, mySide: {sideConditions: {}}};
	const pokemon = {name: 'Mew', speciesForme: 'Mew', level: 100, volatiles: {}, boosts: {}, item: '',
		side: {active: [], foe: {active: []}}, isActive: () => true, isGrounded: () => true,
		getSpecies: () => dex.species.get('mew'), getTypeList: () => ['Psychic'],
		getSpeciesForme: () => 'Mew', effectiveAbility: () => ability, ...overrides};
	const server = {speciesForme: 'Mew', item: '', baseAbility: ability, stats: {atk: 100, def: 100, spa: 100, spd: 100, spe: 100}};
	const tips = Object.create(context.BattleTooltips.prototype); tips.battle = battle;
	return {dex, battle, pokemon, server, tips, value: () => new Value(battle, pokemon, server)};
}
function power(env, move) {
	const data = env.dex.moves.get(move);
	const [type] = env.tips.getMoveType(data, env.value());
	return env.tips.getMoveBasePower(data, type, env.value());
}
describe('Personal weather and custom move presentation', () => {
	for (const format of ['gen9fcag', 'gen9fantasyrogue', 'gen9fantasyroguecoop']) {
		for (const weather of ['', 'sunnyday', 'raindance', 'sandstorm', 'snowscape']) {
			for (const [ability, type, boosted, weakened] of [
				['Chao Ji Yu Shui', 'Water', 'watergun', 'ember'], ['Mega Sol', 'Fire', 'ember', 'watergun'],
			]) {
				it(`${format}: ${ability} displays move type and power in ${weather || 'clear'}`, () => {
					const env = setup(ability, weather, format);
					assert.equal(env.tips.getMoveType(env.dex.moves.get('weatherball'), env.value())[0], type);
					assert.equal(power(env, 'weatherball').value, 150);
					assert.equal(power(env, boosted).value, 60);
					assert.equal(power(env, weakened).value, 20);
					assert.match(String(power(env, boosted)), /超级雨水|超级日光/);
				});
			}
		}
	}
	for (const move of ['thunder', 'hurricane', 'bleakwindstorm', 'wildboltstorm', 'sandsearstorm']) {
		it(`shows ${move} as unable to miss for personal rain even at -6 accuracy`, () => {
			const env = setup('Chao Ji Yu Shui', 'sunnyday'); env.pokemon.boosts.accuracy = -6;
			assert.equal(env.tips.getMoveAccuracy(env.dex.moves.get(move), env.value()).value, 0);
		});
	}
	for (const move of ['thunder', 'hurricane']) {
		it(`shows ${move} at 50% for personal sun even in actual rain`, () => {
			const env = setup('Mega Sol', 'raindance');
			assert.equal(env.tips.getMoveAccuracy(env.dex.moves.get(move), env.value()).value, 50);
		});
	}
	it('does not show Blizzard as sure-hit under personal rain/sun and actual snow', () => {
		for (const ability of ['Chao Ji Yu Shui', 'Mega Sol']) {
			const env = setup(ability, 'snowscape');
			assert.equal(env.tips.getMoveAccuracy(env.dex.moves.get('blizzard'), env.value()).value, 70);
		}
	});
	it('does not double count Hydro Steam or let real weather override the ability', () => {
		assert.equal(power(setup('Mega Sol', 'raindance'), 'hydrosteam').value, 120);
		assert.equal(power(setup('Chao Ji Yu Shui', 'sunnyday'), 'hydrosteam').value, 120);
	});
	it('respects suppression and supports active Rogue extra abilities', () => {
		const suppressed = setup('Chao Ji Yu Shui', '', 'gen9fcag', {volatiles: {gastroacid: []}});
		assert.equal(power(suppressed, 'weatherball').value, 50);
		const gas = setup('Chao Ji Yu Shui', '', 'gen9fcag', {effectiveAbility: () => ''});
		assert.equal(power(gas, 'watergun').value, 40);
		const extra = setup('No Ability', '', 'gen9fantasyrogue', {rogueAbilityInfo: {active: true, abilities: ['chaojiyushui']}});
		assert.equal(power(extra, 'weatherball').value, 150);
	});
	it('keeps Utility Umbrella normal Weather Ball at 50 and personal Weather Ball at 150', () => {
		const normal = setup('No Ability', 'sunnyday'); normal.server.item = 'utilityumbrella';
		assert.equal(power(normal, 'weatherball').value, 50);
		const personal = setup('Chao Ji Yu Shui', 'sunnyday'); personal.server.item = 'utilityumbrella';
		assert.equal(power(personal, 'weatherball').value, 150);
	});
	it('uses the actual 1.5 sand multiplier for Zhi Sha Re She', () => {
		assert.equal(power(setup('No Ability', 'sandstorm'), 'zhishareshe').value, 120);
	});
	it('shows all-type Fantasy Sand Force and Kuang Sha Zhi Li, preserving standard Sand Force', () => {
		assert.equal(power(setup('Sand Force', 'sandstorm'), 'watergun').value, 52);
		assert.equal(power(setup('Kuang Sha Zhi Li', 'sandstorm'), 'watergun').value, 52);
		assert.equal(power(setup('Sand Force', 'sandstorm', 'gen9ou'), 'watergun').value, 40);
	});
	it('shows both hail and snow bonuses for both custom snow abilities', () => {
		for (const weather of ['hail', 'snowscape']) for (const ability of ['Xue Zhi Li', 'Bao Xue Zhi Li']) {
			assert.equal(power(setup(ability, weather), 'watergun').value, 52);
		}
	});
	it('uses Fantasy Transistor in Rogue and preserves the official multiplier', () => {
		assert.equal(power(setup('Transistor', '', 'gen9fantasyrogue'), 'thunderbolt').value, 135);
		assert.equal(power(setup('Transistor', '', 'gen9ou'), 'thunderbolt').value, 117);
	});
	it('shows Tian Lai Zhi Yin and only active absorbed-type bonuses', () => {
		assert.equal(power(setup('Tian Lai Zhi Yin'), 'hypervoice').value, 135);
		for (const [ability, status, move, base] of [['Tun Du', 'tundu', 'sludgebomb', 90], ['Shi Ying Li', 'shiyingli', 'shadowball', 80]]) {
			const env = setup(ability);
			assert.equal(power(env, move).value, base);
			env.pokemon.volatiles[status] = [];
			assert.equal(power(env, move).value, base * 1.5);
			env.pokemon.volatiles.gastroacid = [];
			assert.equal(power(env, move).value, base);
		}
	});
	it('shows Overdrive Psychic for both Fantasy G-Mega formes, preserving low-key Ice', () => {
		for (const [species, type] of [['Toxtricity-G-Mega-Fantasy', 'Psychic'],
			['Toxtricity-Low-Key-G-Mega-Fantasy', 'Psychic'], ['Toxtricity-Low-Key-Fantasy', 'Ice']]) {
			const env = setup('No Ability', '', 'gen9fcag', {getSpeciesForme: () => species});
			assert.equal(env.tips.getMoveType(env.dex.moves.get('overdrive'), env.value())[0], type);
		}
	});
});
