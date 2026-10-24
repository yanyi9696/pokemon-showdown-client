'use strict';

// Credential-free HTTP entry for the Windows development launcher. This is not a login proxy.
const http = require('http');
const fs = require('fs');
const path = require('path');

const CLIENT_PORT = 8080;
const ORIGIN = `http://localhost:${CLIENT_PORT}`;
const mime = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
	'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
	'.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
	'.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

function createLocalClientServer(clientRoot, buildId) {
	const root = fs.realpathSync(path.join(clientRoot, 'play.pokemonshowdown.com'));
	// Generate only public local settings. Never read config/testclient-key.js or proxy credentials.
	const config = 'var Config = ' + JSON.stringify({
		version: '0', localDevelopment: true, storageorigin: ORIGIN,
		bannedHosts: [], whitelist: ['wikipedia.org'], customcolors: {},
		routes: { client: `localhost:${CLIENT_PORT}`, root: 'pokemonshowdown.com', dex: 'dex.pokemonshowdown.com',
			replays: 'replay.pokemonshowdown.com', teams: 'teams.pokemonshowdown.com', users: 'pokemonshowdown.com/users' },
		defaultserver: { id: 'localhost', host: '127.0.0.1', port: 8000, httpport: 8000 },
		sockjsprefix: '/showdown',
	}) + ';';
	return http.createServer(async (req, res) => {
		res.setHeader('Cache-Control', 'no-store');
		res.setHeader('X-Content-Type-Options', 'nosniff');
		// Reject remote Host/Origin requests, including DNS rebinding, even though we bind loopback only.
		if (req.headers.host !== `localhost:${CLIENT_PORT}` ||
			(req.headers.origin && req.headers.origin !== ORIGIN) || req.headers['sec-fetch-site'] === 'cross-site') {
			res.writeHead(403); res.end(); return;
		}
		if (!['GET', 'HEAD'].includes(req.method)) {
			res.writeHead(405); res.end(); return;
		}
		let pathname;
		try {
			pathname = decodeURIComponent(req.url.split('?')[0]);
		} catch {
			res.writeHead(400); res.end(); return;
		}
		const send = (type, body) => {
			res.setHeader('Content-Type', type);
			res.end(req.method === 'HEAD' ? undefined : body);
		};
		if (pathname === '/config/config.js') { send(mime['.js'], config); return; }
		if (pathname === '/__local/status') {
			send(mime['.json'], JSON.stringify({ buildId, clientRoot, battlePort: 8000, localGuest: true })); return;
		}
		if (pathname === '/js/clean-cookies.php') {
			res.writeHead(204); res.end(); return;
		}
		if (pathname === '/' || pathname === '/index.html') pathname = '/testclient.html';
		// Only built public resources are served. Config, source, maps, dotfiles and parent traversal are excluded.
		const publicFile = /^\/(?:testclient\.html|favicon(?:-notify)?\.ico|pokemonshowdown(?:beta(?:@2x)?)?\.png)$/;
		const publicFolder = /^\/(?:js|data|style|sprites|audio|fx|showdex|icons)\/.+$/;
		if (pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.')) ||
			(!publicFile.test(pathname) && !publicFolder.test(pathname)) ||
			(!mime[path.extname(pathname)] && !/^\/showdex\/(?:LICENSE|NOTICE)(?:\.txt)?$/.test(pathname))) {
			res.writeHead(404); res.end(); return;
		}
		const filename = path.resolve(root, '.' + pathname);
		try {
			const real = await fs.promises.realpath(filename);
			if (!real.startsWith(root + path.sep)) {
				res.writeHead(403); res.end(); return;
			}
			const data = await fs.promises.readFile(real);
			send(mime[path.extname(filename)] || 'text/plain', data);
		} catch {
			// Standard Showdown art is optional locally; custom assets always take precedence.
			if (/^\/(sprites|audio|fx)\//.test(pathname)) {
				res.writeHead(302, { Location: 'https://play.pokemonshowdown.com' + pathname });
			} else { res.writeHead(404); }
			res.end();
		}
	});
}

async function startLocalClientServer(clientRoot, buildId) {
	const server = createLocalClientServer(clientRoot, buildId);
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(CLIENT_PORT, '127.0.0.1', resolve);
	});
	return server;
}

module.exports = { createLocalClientServer, startLocalClientServer, CLIENT_PORT, ORIGIN };
