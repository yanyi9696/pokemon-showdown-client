const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

describe('Rogue mobile navigation', () => {
	for (const width of [320, 375, 390, 430, 540]) {
		for (const id of ['fantasyrogue', 'fantasyrogueparty', 'battle-gen9fantasyrogue-1', 'battle-gen9fantasyroguecoop-1']) {
			it(`keeps both direct tabs and room state at ${width}px in ${id}`, () => {
				let html;
				const rooms = {fantasyrogue: {draft: 'choice'}, fantasyrogueparty: {draft: 'moves'}};
				const context = {Backbone: {View: {extend: x => x}}, Popup: {extend: x => x}, window: {},
					jQuery: () => ({width: () => width}), Dex: {resourcePrefix: ''}, app: {root: '/', rooms, curRoom: {id}}};
				vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-topbar.js'), 'utf8'), context);
				const topbar = Object.create(context.Topbar);
				topbar.$ = () => ({hide() {}, addClass() {}}); topbar.$tabbar = {html: text => { html = text; }};
				topbar.updateTabbar();
				assert(html.includes('href="/fantasyrogue"')); assert(html.includes('href="/fantasyrogueparty"'));
				assert(html.includes('幻想杯肉鸽')); assert(html.includes('队伍及背包'));
				assert.equal(rooms.fantasyrogue.draft, 'choice'); assert.equal(rooms.fantasyrogueparty.draft, 'moves');
			});
		}
	}
});
