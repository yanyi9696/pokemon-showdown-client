'use strict';
const assert = require('assert').strict;
const fs = require('fs'), path = require('path'), vm = require('vm');

describe('Cooperative terminal boss presentation', () => {
	let ctx, battle;
	before(() => {
		const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
		ctx = vm.createContext({console, setTimeout, clearTimeout, Config: {routes: {client: 'client.example'}},
			document: {getElementsByTagName: () => [], getElementById: () => ({})}});
		ctx.window = ctx; ctx.exports = ctx; ctx.$ = {easing: {}};
		for (const file of ['js/battle-dex-data.js', 'data/pokedex.js', 'data/teambuilder-tables.js', 'data/gen9fantasy.js',
			'data/pokedex-mini.js', 'data/pokedex-mini-bw.js', 'js/battle-dex.js', 'js/battle-scene-stub.js',
			'js/battle-text-parser.js', 'js/battle.js', 'js/battle-animations.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
		}
		ctx.BattleLog = {escapeHTML: text => text};
		const translator = fs.readFileSync(path.join(root, 'js/ps-china-translator.js'), 'utf8');
		vm.runInContext(translator.slice(0, translator.indexOf('(function() {')), ctx);
	});
	afterEach(() => { battle?.destroy(); battle = null; });
	function start(kind = 'summit', tier = '[Gen 9] Fantasy Rogue Co-op', game = 'multi') {
		const log = [
			'|init|battle', '|gen|9', `|gametype|${game}`, `|tier|${tier}`,
			'|player|p1|Host', '|player|p2|Boss', '|player|p3|Guest', '|player|p4|Empty',
			`|-roguecoopboss|${kind}`, '|teamsize|p1|1', '|teamsize|p2|1', '|teamsize|p3|1', '|teamsize|p4|0',
			'|poke|p1|Pikachu, L100|', '|poke|p2|Mewtwo-Fantasy, L100|', '|poke|p3|Eevee, L100|',
			'|teampreview', '|start', '|switch|p1a: Pikachu|Pikachu, L100|200/200',
			'|switch|p2a: Mewtwo|Mewtwo-Fantasy, L100|700/700',
			'|switch|p3a: Eevee|Eevee, L100|200/200', '|turn|1',
		];
		battle = new ctx.Battle({debug: true, log: game === 'multi' ? log :
			log.filter(line => !/^\|(player|teamsize|poke|switch)\|p[34]/.test(line))});
		battle.seekTurn(Infinity); return battle.p2.active[0];
	}
	for (const bwgfx of [false, true]) it(`scales only the enemy battle sprite in ${bwgfx ? '2D' : '3D'} mode across forme changes`, () => {
		ctx.Dex.prefs = key => key === 'bwgfx' && bwgfx;
		const mon = start();
		for (const species of ['Mewtwo-Fantasy', 'Mewtwo-Mega-X-Fantasy', 'Mewtwo-Mega-Y-Fantasy', 'Arceus-Legend-Fantasy']) {
			battle.add(`|detailschange|p2a: Mewtwo|${species}, L100`);
			for (const front of [false, true]) {
				const sprite = ctx.Dex.getSpriteData(mon, front, {gen: 9, mod: 'gen9fantasy'});
				const plain = ctx.Dex.getSpriteData(mon.speciesForme, front, {gen: 9, mod: 'gen9fantasy'});
				assert.equal(sprite.w, plain.w * 1.5); assert.equal(sprite.h, plain.h * 1.5);
				assert.equal(sprite.url, plain.url);
				const preview = ctx.Dex.getSpriteData(mon, front, {gen: 9, mod: 'gen9fantasy', noScale: true});
				const reference = ctx.Dex.getSpriteData(mon.speciesForme, front, {gen: 9, mod: 'gen9fantasy', noScale: true});
				assert.equal(preview.w, reference.w); assert.equal(preview.h, reference.h);
			}
			assert(!mon.volatiles.dynamax); assert.equal(mon.hp, 700); assert.equal(mon.maxhp, 700);
		}
		for (const side of [battle.p1, battle.p3]) {
			const own = side.active[0];
			assert.equal(ctx.Dex.getSpriteData(own, false).w, ctx.Dex.getSpriteData(own.speciesForme, false).w);
		}
	});
	for (const [kind, tier, game] of [['summit', '[Gen 9] Custom Game', 'multi'],
		['summit', '[Gen 9] Fantasy Rogue', 'singles'], ['invalid', '[Gen 9] Fantasy Rogue Co-op', 'multi']]) {
		it(`ignores boss presentation outside its protocol scope: ${kind}/${tier}/${game}`, () => {
			start(kind, tier, game); assert.equal(battle.rogueCoopBoss, undefined);
		});
	}
	it('reconstructs the flag when seeking and clears it when the protocol is removed', () => {
		start('arceus'); assert.equal(battle.rogueCoopBoss, 'arceus');
		battle.seekTurn(0); battle.seekTurn(Infinity); assert.equal(battle.rogueCoopBoss, 'arceus');
		battle.stepQueue = battle.stepQueue.filter(line => !line.startsWith('|-roguecoopboss|'));
		battle.seekTurn(0); battle.seekTurn(Infinity); assert.equal(battle.rogueCoopBoss, undefined);
	});
	for (const kind of ['summit', 'arceus']) {
		it(`shows one upper enemy trainer and preserves both player trainers for ${kind}`, () => {
			start(kind);
			function bars() {
				let left = '', right = '';
				const scene = {battle, getSidebarHTML: (side, pos) => `${side.sideid}:${pos};`,
					$leftbar: {html: text => { left = text; }}, $rightbar: {html: text => { right = text; }}};
				ctx.BattleScene.prototype.updateLeftSidebar.call(scene);
				ctx.BattleScene.prototype.updateRightSidebar.call(scene);
				return [left, right];
			}
			for (const viewer of ['p1', 'p3']) {
				battle.setViewpoint(viewer);
				assert.deepEqual(bars(), ['p1:near2;p3:near;', 'p2:far;']);
			}
			battle.setViewpoint('p2');
			assert.deepEqual(bars(), ['p2:near;', 'p1:far2;p3:far;']);
			battle.setViewpoint('p1');
			battle.p4.totalPokemon = 1;
			assert.deepEqual(bars(), ['p1:near2;p3:near;', 'p2:far2;p4:far;']);
			battle.p4.totalPokemon = 0;
			delete battle.rogueCoopBoss;
			assert.deepEqual(bars(), ['p1:near2;p3:near;', 'p2:far2;p4:far;']);
		});
	}
	it('keeps phase and life indicators without HP multiplier annotations or extra teammate badges', () => {
		const mon = start(), html = [];
		const dom = {empty() {}, html(text) { html.push(text); }};
		ctx.BattleScene.prototype.teamPreview.call({battle, gen: 9, mod: 'gen9fantasy',
			$sprites: [dom, dom], $messagebar: {addClass() {}}, log: {addDiv() {}},
			updateRogueCoopPreview() {}, wait() {}, updateSidebars() {}});
		assert(html.join('').includes('对方的队伍 · 单战位'));
		assert(!html.join('').includes('HP ×2'));
		assert(!html.join('').includes('非极巨化'));
		function badge(pokemon) {
			const appended = [];
			const bar = {toggleClass() {}, find() { return {remove() {}, html() {}, append(text) { appended.push(text); }}; },
				append(text) { appended.push(text); }};
			ctx.PokemonSprite.prototype.updateStatbar.call({scene: {animating: true}, $statbar: bar}, pokemon, false, false);
			return appended.join('');
		}
		assert(badge(mon).includes('联机首领')); assert(!badge(mon).includes('HP ×2'));
		assert(!badge(mon).includes('非极巨化'));
		battle.add('|-roguebossphase|p2a: Mewtwo|summit|2|2');
		assert(badge(mon).includes('最终阶段')); assert(!badge(mon).includes('HP ×2'));
		battle.add('|-roguebossphase|p2a: Mewtwo|arceus|15|19');
		assert(badge(mon).includes('第 15 / 19 阶段')); assert(badge(mon).includes('×5'));
		assert(!badge(mon).includes('HP ×2'));
		assert(!badge(mon).includes('非极巨化'));
		assert(!badge(battle.p1.active[0]).includes('HP ×2'));
		assert(!badge(battle.p3.active[0]).includes('HP ×2'));
	});
	it('reserves the preview canvas without suppressing messages after start or replay reset', () => {
		start();
		const classes = new Set(), logs = [], dom = {html() {}, empty() {}};
		const scene = {battle, gen: 9, mod: 'gen9fantasy', $sprites: [dom, dom],
			$messagebar: {addClass(name) { classes.add(name); }, removeClass(name) { classes.delete(name); }},
			log: {addDiv(kind, html) { logs.push(html); }}, updateRogueCoopPreview() {}, wait() {}, updateSidebars() {}};
		for (const skipEmpty of [false, true]) {
			ctx.BattleScene.prototype.teamPreview.call(scene);
			assert(classes.has('rogue-coop-preview-hidden'));
			assert(logs.length >= 4, 'full team log remains available');
			ctx.BattleScene.prototype.resetSides.call({...scene, battle: {sides: []}, rebuildTooltips() {}}, skipEmpty);
			assert(!classes.has('rogue-coop-preview-hidden'));
		}
	});
	for (const localized of [true, false]) {
		it(`renders multi-species team names with translation ${localized ? 'available' : 'unavailable'}`, () => {
			start();
			battle.p2.pokemon[0].speciesForme = 'Tirtouga';
			battle.p3.pokemon[0].speciesForme = 'Tyrunt-Fantasy';
			battle.p2.pokemon.push(battle.p3.pokemon[0]);
			const translate = ctx.translateRogueName, logs = [], dom = {html() {}, empty() {}};
			if (!localized) ctx.translateRogueName = undefined;
			try {
				ctx.BattleScene.prototype.teamPreview.call({battle, gen: 9, mod: 'gen9fantasy',
					$sprites: [dom, dom], $messagebar: {addClass() {}}, log: {addDiv(kind, html) { logs.push(html); }},
					updateRogueCoopPreview() {}, wait() {}, updateSidebars() {}});
				assert(logs.some(html => html.includes(localized ? '原盖海龟 / 幻想宝宝暴龙' : 'Tirtouga / Tyrunt-Fantasy')));
			} finally { ctx.translateRogueName = translate; }
		});
	}
});
