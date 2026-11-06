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
	let html = '', writes = 0;
	const entries = [];
	const layer = {empty() { html = ''; }, html(value) { html = value; writes++; }, find() { return {each(callback) {
		for (const entry of entries) callback(0, entry);
	}}; }};
	Object.assign(scene, {battle: {gameType: 'multi', tier: '[Gen 9] Fantasy Rogue Co-op', sides,
		mySide: sides[perspective === 'p1' ? 0 : 2]}, $sprites: [layer, {empty() {}}],
		log: {addDiv() {}}, wait() {}, updateSidebars() {}, gen: 9, mod: 'gen9fantasy'});
	return {scene, context, get html() { return html; }, get writes() { return writes; }, entries};
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
		it(`renders both complete allied parties and both enemies for ${perspective}`, () => {
			const c = sceneClient(perspective); c.scene.teamPreview();
			assert.equal((c.html.match(/class="rogue-coop-preview-mon"/g) || []).length, 14);
			assert(c.html.indexOf('队友的队伍') < c.html.indexOf('我的队伍'));
			const partner = perspective === 'p1' ? 'p3' : 'p1';
			assert(c.html.includes('队友的队伍 · ' + partner + '&lt;name>'));
			assert(c.html.includes('我的队伍 · ' + perspective + '&lt;name>'));
			assert(c.html.includes('top:146px')); assert(c.html.includes('top:248px'));
		});
	}
	it('updates and removes ordered highlights without rebuilding sprites or replaying sparkles', () => {
		const c = sceneClient('p1'); c.scene.teamPreview(); const original = c.html, writes = c.writes;
		const entry = {selected: false, text: '', attr: name => name === 'data-side' ? 'p3' : '4',
			toggleClass(name, state) { this.selected = state; }, find() { return {text: text => { entry.text = text; }}; }};
		c.entries.push(entry); c.scene.battle.rogueCoopPreview = {selections: {p3: [1, 4]}};
		c.scene.updateRogueCoopPreview(); assert(entry.selected); assert.equal(entry.text, '2');
		c.scene.battle.rogueCoopPreview.selections.p3 = []; c.scene.updateRogueCoopPreview();
		assert(!entry.selected); assert.equal(entry.text, ''); assert.equal(c.writes, writes); assert.equal(c.html, original);
	});
});
