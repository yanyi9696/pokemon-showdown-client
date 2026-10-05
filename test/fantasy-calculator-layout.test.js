'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

function setup(width) {
	function extend(properties) {
		function Class() {}
		Class.prototype = properties;
		Class.extend = extend;
		return Class;
	}
	const context = {
		Config: {}, navigator: { userAgent: 'Layout test' }, document: {},
		Backbone: { Model: { extend }, Router: { extend }, View: { extend } },
		jQuery: () => ({ on() {}, width: () => width }),
	};
	context.window = context;
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client.js'), 'utf8'), context);
	const app = Object.create(context.App.prototype);
	const room = id => ({
		id, visible: false,
		blurs: 0,
		show(position, boundary) { this.visible = true; this.position = position; this.boundary = boundary; },
		hide() { this.visible = false; this.blurs++; },
	});
	const battle = room('battle-gen9fcag-1');
	battle.$el = { hide() { battle.visible = false; } };
	const calculator = room('view-calcdex-battlegen9fcag1');
	calculator.fantasyCalcdex = { battleId: battle.id, visible: true };
	app.rooms = { [battle.id]: battle, [calculator.id]: calculator };
	app.curRoom = battle;
	app.sideRoom = calculator;
	app.topbar = { updateTabbar() {} };
	return { app, battle, calculator, resize: value => { width = value; app.updateLayout(); } };
}

describe('Embedded Fantasy calculator responsive layout', () => {
	it('keeps a battlefield, readable battle log and calculator beside each other on desktop', () => {
		for (const width of [1152, 1171, 1280, 1536, 1920, 2560]) {
			const { app, battle, calculator } = setup(width);
			app.singlePanelMode = true; // Existing one-panel preferences cannot cover the battle log.
			app.updateLayout();
			assert(battle.visible && calculator.visible);
			assert.equal(battle.position, 'left');
			assert.equal(calculator.position, 'right');
			assert.equal(calculator.boundary, battle.boundary);
			assert(battle.boundary >= 830, `Missing log space at ${width}px`);
			assert(width - battle.boundary - 1 >= 320);
			assert(width - battle.boundary - 1 <= 650);
		}
	});
	it('shows a full-width calculator on phones and compact screens', () => {
		for (const width of [360, 390, 430, 768, 1151]) {
			const { app, battle, calculator } = setup(width);
			app.updateLayout();
			assert(!battle.visible && calculator.visible);
			assert.equal(calculator.position, 'full');
			assert.equal(app.curRoom, battle, 'Keep the active battle when the calculator overlays it');
			assert.equal(battle.blurs, 0, 'Covering the battle must not pause its live data');
		}
	});
	it('adapts an existing battle when resizing between desktop and phone', () => {
		const { app, battle, calculator, resize } = setup(1536);
		app.updateLayout();
		resize(390);
		assert(!battle.visible && calculator.visible);
		assert.equal(calculator.position, 'full');
		resize(1536);
		assert(battle.visible && calculator.visible);
		assert.equal(calculator.position, 'right');
	});
	it('keeps a collapsed calculator closed across layout updates and restores the battle controls', () => {
		const { app, battle, calculator, resize } = setup(390);
		app.updateLayout();
		calculator.fantasyCalcdex.visible = false;
		app.updateLayout();
		assert(battle.visible && !calculator.visible);
		assert.equal(battle.position, 'full');
		resize(1536);
		assert(battle.visible && !calculator.visible);
	});
	it('reopens the same calculator when selecting its tab', () => {
		const { app, battle, calculator } = setup(390);
		calculator.fantasyCalcdex.visible = false;
		app.curRoom = calculator;
		app.updateLayout();
		assert.equal(app.curRoom, battle);
		assert.equal(calculator.fantasyCalcdex.visible, true);
		assert(calculator.visible);
	});
	it('does not change chat rooms, extension calculators or another battle', () => {
		const { app, calculator } = setup(1536);
		app.curRoom = { id: 'battle-another' };
		assert.equal(app.updateFantasyCalcdexLayout(), false);
		app.curRoom = app.rooms['battle-gen9fcag-1'];
		delete calculator.fantasyCalcdex;
		assert.equal(app.updateFantasyCalcdexLayout(), false);
	});
});
