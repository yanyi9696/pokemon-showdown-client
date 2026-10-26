'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const imageSize = require('image-size');
const {createLocalClientServer} = require('../build-tools/local-development-server');
const root = path.resolve(__dirname, '../play.pokemonshowdown.com');

describe('Unknown type icons and Fantasy ability descriptions', () => {
	let context;
	before(() => {
		context = vm.createContext({
			Config: {routes: {client: 'client.example'}},
			document: {location: {protocol: 'https:'}, getElementById: () => ({}), getElementsByTagName: () => []},
		});
		context.window = context; context.exports = context;
		for (const file of ['js/battle-dex-data.js', 'data/typechart.js', 'data/pokedex.js', 'data/teambuilder-tables.js',
			'data/gen9fantasy.js', 'js/battle-dex.js']) {
			vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
		}
	});
	it('serves the real 32x14 badge locally instead of redirecting a question-mark filename', async () => {
		context.Dex.iconSheetPrefix = './';
		const icon = context.Dex.getTypeIcon('???', true);
		assert.match(icon, /sprites\/types\/Unknown\.png/);
		assert.match(icon, /alt="\?\?\?"/);
		assert.match(icon, /class="pixelated b"/);
		const filename = path.join(root, 'sprites/types/Unknown.png');
		const dimensions = imageSize(filename);
		assert.equal(dimensions.width, 32); assert.equal(dimensions.height, 14);
		const server = createLocalClientServer(path.dirname(root), 'icon-test');
		await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
		try {
			const result = await new Promise((resolve, reject) => {
				const req = http.get({host: '127.0.0.1', port: server.address().port, path: '/sprites/types/Unknown.png',
					headers: {host: 'localhost:8080'}}, res => {
					const chunks = [];
					res.on('data', data => chunks.push(data));
					res.on('end', () => resolve({status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers}));
				});
				req.on('error', reject);
			});
			assert.equal(result.status, 200); assert.equal(result.headers['content-type'], 'image/png');
			assert.deepEqual(result.body, fs.readFileSync(filename));
		} finally { await new Promise(resolve => server.close(resolve)); }
	});
	it('preserves standard type paths and resolves custom species through the shared icon helper', () => {
		context.Dex.iconSheetPrefix = 'https://assets.example/';
		assert.equal(context.Dex.getTypeIconURL('???'), 'https://assets.example/sprites/types/Unknown.png');
		assert.equal(context.Dex.getTypeIconURL('Fire'), 'https://client.example/sprites/types/Fire.png');
		for (const species of ['Mew-Fantasy', 'Silvally-Fantasy']) {
			const types = context.Dex.mod('gen9fantasy').species.get(species).types;
			assert(types.includes('???'));
			assert(types.map(type => context.Dex.getTypeIcon(type)).join('').includes('Unknown.png'));
		}
	});
	it('includes both existing Zhen She immunities in the generated teambuilder description', () => {
		const ability = context.Dex.mod('gen9fantasy').abilities.get('Zhen She');
		assert(ability.shortDesc.includes('会被胆量和精神力无视'));
	});
});
