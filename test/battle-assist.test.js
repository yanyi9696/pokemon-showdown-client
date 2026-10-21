const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = vm.createContext({ console, setTimeout, clearTimeout,
	document: { getElementsByTagName: () => [], getElementById: () => ({}) } });
context.window = context;
context.exports = context;
context.BattleLog = {escapeHTML: value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')};
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
	it('uses stable IDs for marked native abilities, learnt move PP and ability choices', () => {
		const Value = vm.runInContext('ModifiableValue', context);
		const p = mon('Mew', {effectiveAbility: () => 'Cute Charm'});
		const value = new Value(battle, p, {ability: 'cutecharm', item: ''});
		assert(value.tryAbility('Cute Charm'));
		assert(value.tryAbility('Cute Charm+'));
		assert(!value.tryAbility('Huge Power'));
		assert.equal(tips.ppUsed(dex.moves.get('Recover'), {moveTrack: [['Recover', 3]]}), 3);
		assert(context.Dex.hasAbility({abilities: {0: 'Cute Charm+'}}, 'Cute Charm'));
	});
	it('shows next-use stacked power with its source and the correct Technician threshold', () => {
		const Value = vm.runInContext('ModifiableValue', context);
		const ownBattle = {...battle, sides: [], abilityActive: () => false, mySide: {sideConditions: {}}};
		const ownTips = Object.create(tips); ownTips.battle = ownBattle;
		const p = mon('Mew', {boosts: {}, isActive: () => true, side: {active: [], foe: {active: []}}, effectiveAbility: () => 'Technician'});
		for (const [native, expected] of [[40, 60], [80, 80], [160, 160]]) {
			const server = {speciesForme: 'Mew', item: '', baseAbility: 'Technician', stats: {atk: 10, def: 10, spa: 10, spd: 10, spe: 10},
				mechanicPowers: {furycutter: {power: native, source: '连斩·连续命中'}}};
			const power = ownTips.getMoveBasePower(dex.moves.get('furycutter'), 'Bug', new Value(ownBattle, p, server));
			assert.equal(power.value, expected); assert.match(String(power), /连斩·连续命中/);
		}
	});
	it('shows railgun power and accuracy from the authoritative blessing payload', () => {
		const Value = vm.runInContext('ModifiableValue', context);
		const ownBattle = {...battle, sides: [], abilityActive: () => false, mySide: {sideConditions: {}}};
		const ownTips = Object.create(tips); ownTips.battle = ownBattle;
		const info = {abilities: [], active: true, moves: {zapcannon: {name: '超电磁炮', damage: [], power: [{source: '某科学超电磁炮', factor: 2}], accuracyFactor: 2, accuracySource: '某科学超电磁炮'}}};
		const p = mon('Magnemite', {boosts: {}, isActive: () => true, side: {active: [], foe: {active: []}}, rogueAbilityInfo: info});
		const server = {speciesForme: 'Magnemite', item: '', baseAbility: '', rogueAbilityInfo: info, stats: {atk: 10, def: 10, spa: 10, spd: 10, spe: 10}};
		const power = ownTips.getMoveBasePower(dex.moves.get('zapcannon'), 'Electric', new Value(ownBattle, p, server));
		const accuracy = ownTips.getMoveAccuracy(dex.moves.get('zapcannon'), new Value(ownBattle, p, server));
		assert.equal(power.value, 240); assert.equal(accuracy.value, 100);
		assert.match(String(power), /某科学超电磁炮/); assert.match(String(accuracy), /某科学超电磁炮/);
	});
	it('shows rulebreaker bypassing type immunity, and preserves beneficial rain accuracy', () => {
		const source = mon('Mew', {rogueAbilityInfo: {rulebreaker: true}});
		assert.equal(factor('Earthquake', mon('Zapdos'), source), 2);
		assert.equal(factor('Tackle', mon('Gengar'), source), 1);
		const Value = vm.runInContext('ModifiableValue', context);
		const ownBattle = {...battle, sides: [], weather: 'sunnyday'};
		const ownTips = Object.create(tips); ownTips.battle = ownBattle;
		const p = mon('Mew', {boosts: {accuracy: -6}, isActive: () => true, side: {active: []}, rogueAbilityInfo: {rulebreaker: true}});
		const server = {speciesForme: 'Mew', item: '', baseAbility: ''};
		assert.equal(ownTips.getMoveAccuracy(dex.moves.get('thunder'), new Value(ownBattle, p, server)).value, 70);
		ownBattle.weather = 'raindance';
		assert.equal(ownTips.getMoveAccuracy(dex.moves.get('thunder'), new Value(ownBattle, p, server)).value, 0);
	});
	it('uses authoritative six-stat values without reapplying ability, training or boss modifiers', () => {
		const final = {atk: 371, def: 244, spa: 123, spd: 188, spe: 477};
		const p = mon('Mew', {isActive: () => true, rogueAbilityInfo: {abilities: ['hugepower'], active: true, stats: final}});
		assert.deepEqual(JSON.parse(JSON.stringify(tips.calculateModifiedStats(p, {stats: {atk: 100}, item: 'choiceband'}))), final);
	});
	it('labels ascent and boss-card damage separately and applies flat blessing power before Punk Rock', () => {
		const Value = vm.runInContext('ModifiableValue', context);
		const ownBattle = {...battle, sides: [], abilityActive: () => false, mySide: {sideConditions: {}}};
		const ownTips = Object.create(tips); ownTips.battle = ownBattle;
		const p = mon('Mew', {boosts: {}, isActive: () => true, side: {active: [], foe: {active: []}},
			effectiveAbility: () => 'Punk Rock', rogueAbilityInfo: {abilities: [], active: true, moves: {
				bugbuzz: {power: [{source: '林间大合唱', add: 10}], damage: ['【首领卡 · 同行之证】伤害 +55%']},
				slash: {power: [{source: '登龙', factor: 1.3}], damage: []},
			}}});
		const server = {speciesForme: 'Mew', item: '', baseAbility: 'Punk Rock', stats: {atk: 10, def: 10, spa: 10, spd: 10, spe: 10}};
		const buzz = ownTips.getMoveBasePower(dex.moves.get('bugbuzz'), 'Bug', new Value(ownBattle, p, server));
		assert.equal(buzz.value, 130); assert.match(String(buzz), /林间大合唱/); assert.match(String(buzz), /伤害 \+55%/);
		const slash = ownTips.getMoveBasePower(dex.moves.get('slash'), 'Normal', new Value(ownBattle, p, server));
		assert.equal(slash.value, 91); assert.match(String(slash), /登龙/);
	});
	it('shows boss card defenses on top of trained stats without applying permanent training twice', () => {
		const p = mon('Mew', {boosts: {}, isActive: () => true, side: {active: []},
			rogueAbilityInfo: {abilities: [], active: false, training: {atk: .08, def: .04}, mentor: {defense: 40, damage: 40, speed: 20}}});
		const server = {speciesForme: 'Mew', stats: {atk: 108, def: 104, spa: 108, spd: 104, spe: 100}, baseAbility: '', item: ''};
		const ownTips = Object.create(tips); ownTips.battle = {...battle, abilityActive: () => false, mySide: {sideConditions: {}}};
		const value = ownTips.calculateModifiedStats(p, server);
		assert.equal(value.atk, 108); assert.equal(value.def, 146); assert.equal(value.spd, 146); assert.equal(value.spe, 120);
	});
	it('retains Technician for a low-power move even when a blessing raises its displayed power above 60', () => {
		const Value = vm.runInContext('ModifiableValue', context);
		const ownBattle = {...battle, sides: [], abilityActive: () => false, mySide: {sideConditions: {}}};
		const ownTips = Object.create(tips); ownTips.battle = ownBattle;
		const p = mon('Mew', {boosts: {}, isActive: () => true, side: {active: [], foe: {active: []}},
			effectiveAbility: () => 'Technician', rogueAbilityInfo: {abilities: [], active: true, moves: {
				tackle: {power: [{source: '天下武功，唯快不破', factor: 2}], damage: []},
			}}});
		const server = {speciesForme: 'Mew', item: '', baseAbility: 'Technician', stats: {atk: 10, def: 10, spa: 10, spd: 10, spe: 10}};
		const power = ownTips.getMoveBasePower(dex.moves.get('tackle'), 'Normal', new Value(ownBattle, p, server));
		assert.equal(power.value, 120); assert.match(String(power), /Technician/);
	});
	it('includes extra ability stat modifiers, suppression and held-item stacking', () => {
		const raw = {atk: 18, def: 23, spa: 19, spd: 18, spe: 18};
		const p = mon('Jangmo-o', {boosts: {}, side: {active: []}, isActive: () => true,
			rogueAbilityInfo: {abilities: ['roguegreatmage'], active: true}});
		const server = {speciesForme: 'Jangmo-o', stats: raw, baseAbility: 'bulletproof', item: '', rogueAbilityInfo: p.rogueAbilityInfo};
		const ownTips = Object.create(tips);
		ownTips.battle = {...battle, abilityActive: () => false, mySide: {sideConditions: {}}};
		assert.equal(ownTips.calculateModifiedStats(p, server).spa, 38);
		assert.equal(ownTips.calculateModifiedStats(p, {...server, item: 'choicespecs'}).spa, 57);
		p.rogueAbilityInfo = {...p.rogueAbilityInfo, active: false};
		assert.equal(ownTips.calculateModifiedStats(p, server).spa, 19);
	});
	it('uses the same move-power tooltip for granted and native Sharpness', () => {
		const Value = vm.runInContext('ModifiableValue', context);
		const ownBattle = {...battle, sides: [], abilityActive: () => false, mySide: {sideConditions: {}}};
		const ownTips = Object.create(tips); ownTips.battle = ownBattle;
		const p = mon('Bulbasaur', {boosts: {}, isActive: () => true, side: {active: [], foe: {active: []}},
			effectiveAbility: () => 'Overgrow', rogueAbilityInfo: {abilities: ['sharpness'], active: true}});
		const server = {speciesForme: 'Bulbasaur', item: '', baseAbility: 'Overgrow',
			stats: {atk: 10, def: 10, spa: 10, spd: 10, spe: 10}, rogueAbilityInfo: p.rogueAbilityInfo};
		const move = dex.moves.get('Slash');
		const boosted = ownTips.getMoveBasePower(move, move.type, new Value(ownBattle, p, server));
		assert.equal(boosted.value, 105); assert.match(String(boosted), /Sharpness/);
		p.rogueAbilityInfo = {...p.rogueAbilityInfo, active: false};
		assert.equal(ownTips.getMoveBasePower(move, move.type, new Value(ownBattle, p, server)).value, 70);
	});
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
