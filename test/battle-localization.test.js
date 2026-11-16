'use strict';

const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('Battle roster and ability localization', () => {
	let ctx, battle, language;
	before(() => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {whitelist: [], routes: {client: 'client.example'}},
			localStorage: {getItem: () => language},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx; ctx.$ = {easing: {}};
		for (const file of ['data/pokedex.js', 'data/abilities.js', 'data/items.js', 'data/teambuilder-tables.js',
			'data/gen9fantasy.js', 'js/battle-dex-data.js', 'js/battle-dex.js', 'js/battle-scene-stub.js',
			'js/battle-text-parser.js', 'js/battle.js', 'js/battle-log.js', 'js/battle-tooltips.js', 'js/battle-animations.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		}
		const source = fs.readFileSync(path.join(root, 'js/ps-china-translator.js'), 'utf8');
		vm.runInContext(source.slice(0, source.indexOf('(function() {')), ctx);
	});
	beforeEach(() => { language = 'zh'; });
	afterEach(() => { battle?.destroy(); battle = null; });
	function abilityText(options = {}) {
		const dex = ctx.Dex.mod(options.format || 'gen9fcag');
		const pokemon = {ability: options.ability || '', baseAbility: options.base || '',
			volatiles: options.volatiles || {}, getSpecies: () => dex.species.get(options.species || 'Pikachu'),
			getSpeciesForme: () => options.species || 'Pikachu'};
		const tips = Object.create(ctx.BattleTooltips.prototype);
		tips.battle = {dex, tier: options.tier || '[Gen 9] FC AG', ngasActive: () => false};
		const before = JSON.stringify(pokemon);
		const html = tips.getPokemonAbilityText(pokemon, options.server, options.active !== false, options.hidePossible);
		assert.equal(JSON.stringify(pokemon), before, 'translation must not change canonical battle data');
		return html;
	}
	for (const format of ['gen9ou', 'gen9fcag', 'gen9fantasyrogue', 'gen9fantasyroguecoop']) {
		it(`translates a revealed opponent ability and its original ability in ${format}`, () => {
			const html = abilityText({format, ability: 'Pressure', base: 'Speed Boost'});
			assert.equal(html, `<small>特性：</small> 压迫感${format === 'gen9ou' ? '' : '+'} (原特性： 加速)`);
		});
	}
	it('translates each unknown ability candidate without falsely revealing the actual ability', () => {
		assert.equal(abilityText(), '<small>可能的特性：</small> 静电, 避雷针');
		assert.equal(abilityText({hidePossible: true}), '');
		assert.equal(abilityText({tier: '[Gen 9] Almost Any Ability'}), '');
	});
	it('uses the original ability on the switch tooltip and canonical server IDs', () => {
		assert.equal(abilityText({ability: 'Pressure', base: 'Speed Boost', active: false}), '<small>特性：</small> 加速');
		assert.equal(abilityText({server: {baseAbility: 'chaojiyushui'}}), '<small>特性：</small> 超级雨水');
	});
	it('translates inferred Mega abilities while preserving suppression rules', () => {
		assert.equal(abilityText({species: 'Charizard-Mega-X'}), '<small>特性：</small> 硬爪');
		assert.equal(abilityText({species: 'Charizard-Mega-X', volatiles: {gastroacid: []}, hidePossible: true}), '');
	});
	it('keeps English mode and works without the translation script', () => {
		language = 'en';
		assert.equal(abilityText({ability: 'Pressure', base: 'Speed Boost'}), '<small>Ability:</small> Pressure+ (Base ability: Speed Boost)');
		const translate = ctx.translateRogueName;
		try {
			language = 'zh'; ctx.translateRogueName = undefined;
			assert.equal(abilityText({ability: 'Pressure'}), '<small>Ability:</small> Pressure+');
		} finally { ctx.translateRogueName = translate; }
	});
	it('escapes translated tooltip text and tolerates blocked language storage', () => {
		const translate = ctx.translateRogueName, getItem = ctx.localStorage.getItem;
		try {
			ctx.localStorage.getItem = () => { throw new Error('Storage blocked'); };
			assert.equal(abilityText({ability: 'Pressure'}), '<small>特性：</small> 压迫感+');
			ctx.translateRogueName = value => value === 'Pressure+' ? '<img src=x>' : translate(value);
			assert.equal(abilityText({ability: 'Pressure'}), '<small>特性：</small> &lt;img src=x&gt;');
		} finally { ctx.translateRogueName = translate; ctx.localStorage.getItem = getItem; }
	});
	function preview(game, tier) {
		const sides = game === 'multi' ? ['p1', 'p2', 'p3', 'p4'] : ['p1', 'p2'];
		const log = ['|gen|9', `|gametype|${game}`, `|tier|${tier}`];
		for (const side of sides) log.push(`|player|${side}|FC Psychic 玩家<${side}>`,
			`|poke|${side}|Pikachu|`, `|poke|${side}|Zorua-Hisui-Fantasy|`, `|poke|${side}|Onix-Fantasy|`);
		log.push('|teampreview');
		battle = new ctx.Battle({debug: true, log}); battle.seekTurn(Infinity);
		const before = battle.sides.map(side => [side.name, ...side.pokemon.map(mon => mon.speciesForme)]);
		const rows = [], dom = {empty() {}, html() {}};
		ctx.BattleScene.prototype.teamPreview.call({battle, gen: 9, mod: 'gen9fantasy',
			$sprites: [dom, dom], $messagebar: {addClass() {}}, log: {addDiv: (className, html) => rows.push(html)},
			wait() {}, updateSidebars() {}});
		assert.deepEqual(battle.sides.map(side => [side.name, ...side.pokemon.map(mon => mon.speciesForme)]), before);
		return rows;
	}
	for (const [game, tier] of [['singles', '[Gen 9] OU'], ['doubles', '[Gen 9] FC Doubles OU'],
		['singles', '[Gen 9] Fantasy Rogue'], ['multi', '[Gen 9] Fantasy Rogue Co-op']]) {
		it(`localizes all preview rosters but preserves player names in ${tier}`, () => {
			const rows = preview(game, tier);
			assert.equal(rows.length, game === 'multi' ? 4 : 2);
			rows.forEach((html, i) => {
				assert(html.includes(`<span class="username">FC Psychic 玩家&lt;p${i + 1}&gt;</span>的队伍：`));
				assert(html.includes('皮卡丘 / ')); assert(html.includes('索罗亚')); assert(html.includes('水晶大岩蛇'));
				assert(!/Pikachu|Zorua|Onix|'s team:/.test(html));
			});
		});
	}
	it('keeps both ordinary and cooperative preview rosters in English mode', () => {
		language = 'en';
		for (const [game, tier] of [['singles', '[Gen 9] OU'], ['multi', '[Gen 9] Fantasy Rogue Co-op']]) {
			const rows = preview(game, tier);
			for (const html of rows) assert(html.includes("</span>'s team:</strong> <em style=\"color:#445566;display:block;\">Pikachu / Zorua-Hisui-Fantasy / Onix-Fantasy</em>"));
			battle.destroy(); battle = null;
		}
	});
});
