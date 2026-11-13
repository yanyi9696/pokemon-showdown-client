const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

function sceneClient(perspective) {
	const source = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/src/battle-animations.ts'), 'utf8')
		.replace(/^import .*;\r?$/gm, '').replace(/^export /gm, '');
	const context = {Dex: {fxPrefix: '/fx/', resourcePrefix: '/',
		getSpriteData: mon => ({url: mon.speciesForme + '.gif', w: 96, h: 96}), getShinySparkles: () => 'sparkle'},
		BattleLog: {escapeHTML: value => String(value).replace(/</g, '&lt;')}, $: element => element,
		toID: value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
	};
	context.$.easing = {};
	context.window = {};
	vm.createContext(context); vm.runInContext(ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText, context);
	const Scene = vm.runInContext('BattleScene', context), scene = Object.create(Scene.prototype);
	const sides = ['p1', 'p2', 'p3', 'p4'].map(sideid => ({sideid, name: sideid + '<name>',
		pokemon: Array.from({length: sideid === 'p1' || sideid === 'p3' ? 6 : 1}, (_, i) => ({speciesForme: sideid + i, shiny: !i, level: 50}))}));
	sides[0].ally = sides[2]; sides[2].ally = sides[0];
	sides[0].foe = sides[1]; sides[2].foe = sides[3];
	const layers = ['', ''];
	const layer = index => ({empty() { layers[index] = ''; }, html(value) { layers[index] = value; }});
	Object.assign(scene, {battle: {gameType: 'multi', tier: '[Gen 9] Fantasy Rogue Co-op', sides,
		mySide: sides[perspective === 'p1' ? 0 : 2]}, $sprites: [layer(0), layer(1)], $messagebar: {addClass() {}},
		log: {addDiv() {}}, wait() {}, updateSidebars() {}, gen: 9, mod: 'gen9fantasy'});
	return {scene, context, layers};
}
describe('Co-op native battle scene', () => {
	it('limits the layout to Rogue Multi and keeps Rogue sparkles out of regular formats', () => {
		const c = sceneClient('p1');
		for (const tier of ['[Gen 9] Fantasy Rogue', '[Gen 9] Fantasy Rogue Co-op', '[Gen 9] Fantasy Rogue Doubles']) {
			c.scene.battle.tier = tier; c.context.testScene = c.scene;
			assert(vm.runInContext('isRogueBattle(testScene)', c.context));
		}
		c.scene.battle.tier = '[Gen 9] Doubles OU';
		assert.equal(vm.runInContext('isRogueBattle(testScene)', c.context), false);
	});
	for (const perspective of ['p1', 'p3']) {
		it(`renders only the viewer's full team and both enemies at native sizes for ${perspective}`, () => {
			const c = sceneClient(perspective); c.scene.teamPreview();
			const partner = perspective === 'p1' ? 'p3' : 'p1';
			assert.equal((c.layers[0].match(/width="96" height="96"/g) || []).length, 6);
			assert.equal((c.layers[1].match(/width="96" height="96"/g) || []).length, 2);
			assert(c.layers[0].includes(perspective + '0.gif'));
			assert(!c.layers.join('').includes(partner + '0.gif'));
			assert(c.layers[1].includes('p20.gif')); assert(c.layers[1].includes('p40.gif'));
			assert(c.layers[0].includes('top:200px;left:100px'));
			assert(c.layers[1].includes('top:62px;left:380px'));
		});
	}
	it('uses the same sprite size and coordinates as ordinary singles for large models', () => {
		const c = sceneClient('p1');
		c.context.Dex.getSpriteData = mon => ({url: mon.speciesForme + '.gif', w: 166, h: 142});
		c.scene.battle.sides[3].pokemon = [];
		c.scene.teamPreview(); const cooperative = c.layers.slice();
		c.scene.battle.gameType = 'singles'; c.scene.battle.tier = '[Gen 9] OU';
		c.scene.teamPreview();
		const images = html => html.match(/<img src="p\d\d.gif"[^>]+>/g);
		assert.deepEqual(images(cooperative[0]), images(c.layers[0]));
		assert.deepEqual(images(cooperative[1]), images(c.layers[1]));
		assert(cooperative[1].includes('width="166" height="142"'));
	});
});
