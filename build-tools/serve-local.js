'use strict';

// Serve the built normal client with an explicit local deployment configuration.
// The existing login UI talks to the real login service through a same-origin proxy;
// no assertions are fabricated and no client login functions are replaced.
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../play.pokemonshowdown.com');
const port = 8080;
const battlePort = 8000;
const origin = `http://localhost:${port}`;
const mime = {
	'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
	'.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
	'.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

const server = http.createServer((req, res) => {
	if (req.headers.host !== `localhost:${port}`) {
		res.writeHead(403); res.end('Use ' + origin); return;
	}
	let pathname;
	try {
		pathname = decodeURIComponent(new URL(req.url, origin).pathname);
	} catch {
		res.writeHead(400); res.end(); return;
	}
	res.setHeader('Cache-Control', 'no-store');
	// The hosted site's cookie migration helper is unnecessary for this separate local origin.
	if (pathname === '/js/clean-cookies.php') {
		res.writeHead(204); res.end(); return;
	}
	if (pathname === '/~~localhost/action.php') {
		if (!['GET', 'POST'].includes(req.method) || (req.headers.origin && req.headers.origin !== origin)) {
			res.writeHead(403); res.end(); return;
		}
		const headers = { 'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded' };
		if (req.headers.cookie) headers.Cookie = req.headers.cookie;
		const upstream = https.request('https://play.pokemonshowdown.com' + req.url, {
			method: req.method, headers, timeout: 15000,
		}, response => {
			res.statusCode = response.statusCode;
			res.setHeader('Content-Type', response.headers['content-type'] || 'text/plain');
			if (response.headers['set-cookie']) {
				res.setHeader('Set-Cookie', response.headers['set-cookie'].map(cookie => cookie.replace(/;\s*domain=[^;]+/gi, '')));
			}
			response.pipe(res);
		});
		upstream.on('timeout', () => upstream.destroy());
		upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('Login service unavailable.'); });
		let length = 0;
		req.on('data', chunk => {
			length += chunk.length;
			if (length > 64000) { upstream.destroy(); req.destroy(); }
		});
		req.pipe(upstream);
		return;
	}
	if (!['GET', 'HEAD'].includes(req.method)) {
		res.writeHead(405); res.end(); return;
	}
	if (pathname.endsWith('.php')) {
		res.writeHead(404); res.end(); return;
	}
	if (pathname === '/config/config.js') {
		const base = fs.readFileSync(path.resolve(root, '../config/config.js'), 'utf8');
		res.setHeader('Content-Type', mime['.js']);
		res.end(base + '\n' + [
			`Config.routes.client = 'localhost:${port}';`,
			`Config.storageorigin = '${origin}';`,
			`Config.defaultserver = {id: 'localhost', host: 'localhost', port: ${battlePort}, httpport: ${battlePort}};`,
		].join('\n'));
		return;
	}
	if (pathname === '/' || !path.extname(pathname)) pathname = '/index.html';
	const filename = path.resolve(root, '.' + pathname);
	if (!filename.startsWith(root + path.sep) || pathname.split('/').some(part => part.startsWith('.'))) {
		res.writeHead(403); res.end(); return;
	}
	fs.readFile(filename, (error, contents) => {
		if (error) {
			if (/^\/(sprites|audio|fx)\//.test(pathname)) {
				res.writeHead(302, { Location: 'https://play.pokemonshowdown.com' + pathname });
			} else {
				res.writeHead(404);
			}
			res.end(); return;
		}
		res.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
		if (pathname === '/index.html') {
			contents = contents.toString().replace(/(src|href)="\/\/play\.pokemonshowdown\.com\//g, '$1="/');
			contents = contents.replace('[failed to retrieve news]', '暂时无法读取新闻。');
		}
		res.end(req.method === 'HEAD' ? undefined : contents);
	});
});
server.listen(port, '127.0.0.1', () => console.log(`Normal local client: ${origin}/`));
