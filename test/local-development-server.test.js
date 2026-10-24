'use strict';
const assert = require('assert').strict;
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const {createLocalClientServer} = require('../build-tools/local-development-server');

describe('Managed localhost HTTP client', () => {
	let directory, server, port;
	before(async () => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-local-http-'));
		const root = path.join(directory, 'play.pokemonshowdown.com');
		fs.mkdirSync(path.join(root, 'js'), {recursive: true});
		fs.mkdirSync(path.join(directory, 'config'));
		fs.writeFileSync(path.join(root, 'testclient.html'), '<html>current build</html>');
		fs.writeFileSync(path.join(root, 'js/client.js'), 'current code');
		fs.writeFileSync(path.join(root, 'js/private.js.map'), 'not public');
		fs.writeFileSync(path.join(directory, 'config/testclient-key.js'), 'synthetic secret - never serve');
		// Use an ephemeral socket for tests; production entry always binds 127.0.0.1:8080.
		server = createLocalClientServer(directory, 'current-build');
		await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
		port = server.address().port;
	});
	after(async () => {
		await new Promise(resolve => server.close(resolve));
		fs.rmSync(directory, {recursive: true, force: true});
	});
	function request(url, headers = {}, method = 'GET') {
		return new Promise((resolve, reject) => {
			const req = http.request({host: '127.0.0.1', port, path: url, method, headers: {host: 'localhost:8080', ...headers}}, res => {
				let body = '';
				res.setEncoding('utf8'); res.on('data', data => { body += data; });
				res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body}));
			});
			req.on('error', reject); req.end();
		});
	}
	it('serves the current test page and local-only generated config without reading account credentials', async () => {
		for (const entry of ['/', '/index.html', '/testclient.html']) {
			const result = await request(entry);
			assert.equal(result.status, 200); assert.equal(result.body, '<html>current build</html>');
			assert.equal(result.headers['cache-control'], 'no-store');
		}
		const config = await request('/config/config.js');
		assert.match(config.body, /"localDevelopment":true/);
		assert.match(config.body, /"host":"127.0.0.1","port":8000/);
		const settings = JSON.parse(config.body.slice('var Config = '.length, -1));
		assert(Array.isArray(settings.whitelist), 'BattleLog link handling requires a whitelist array');
		assert(Array.isArray(settings.bannedHosts));
		assert.equal(typeof settings.customcolors, 'object', 'Topbar usernameColor requires the color map');
		assert(!config.body.includes('secret'));
		assert.equal((await request('/js/client.js?v=new')).body, 'current code');
		assert.equal(JSON.parse((await request('/__local/status')).body).buildId, 'current-build');
	});
	it('rejects foreign hosts, origins and cross-site requests', async () => {
		for (const headers of [{host: 'remote.invalid'}, {origin: 'https://remote.invalid'}, {'sec-fetch-site': 'cross-site'}]) {
			assert.equal((await request('/config/config.js', headers)).status, 403);
		}
	});
	it('does not serve keys, maps, source, parent paths, databases or login proxy endpoints', async () => {
		for (const file of ['/config/testclient-key.js', '/../config/testclient-key.js', '/%2e%2e/config/testclient-key.js',
			'/js/..%5c..%5cconfig/testclient-key.js', '/.git/config', '/src/client.ts', '/js/private.js.map',
			'/databases/fantasy-rogue.db', '/~~localhost/action.php']) {
			assert.equal((await request(file)).status, 404, file);
		}
		assert.equal((await request('/~~localhost/action.php', {}, 'POST')).status, 405);
	});
	it('enforces real-path containment for public asset symlinks or junctions', async () => {
		const outside = path.join(directory, 'config');
		fs.symlinkSync(outside, path.join(directory, 'play.pokemonshowdown.com/js/linked'), 'junction');
		assert.equal((await request('/js/linked/testclient-key.js')).status, 403);
	});
	it('returns invalid encoding errors and HEAD without a response body', async () => {
		assert.equal((await request('/%invalid')).status, 400);
		const head = await request('/testclient.html', {}, 'HEAD');
		assert.equal(head.status, 200); assert.equal(head.body, '');
	});
});
