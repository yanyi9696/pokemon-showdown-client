'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const media = /\.(?:png|gif|webp|jpg|jpeg|svg|woff2?|ttf|eot|mp3|ogg|wav)$/i;
const publicPath = /^(?:js|data|style|sprites|fx|audio|sounds|showdex)\//;
const fingerprint = /\.[a-f0-9]{20}\.[a-z0-9]+$/;
const publicExtension = /\.(?:js|css|json|png|gif|webp|jpg|jpeg|svg|woff2?|ttf|eot|mp3|ogg|wav)$/i;

/** Only public, allowlisted build inputs. Never reads config, PHP or credentials. */
function immutableAssets(directory) {
	directory = fs.realpathSync(directory);
	const files = new Map();
	function publish(relative) {
		relative = relative.replace(/\\/g, '/');
		if (!publicPath.test(relative) || relative.split('/').includes('..') || !publicExtension.test(relative)) {
			throw new Error('Not a public asset: ' + relative);
		}
		if (files.has(relative)) return files.get(relative).url;
		const filename = path.join(directory, relative);
		if (!fs.realpathSync(filename).startsWith(directory + path.sep)) {
			throw new Error('Asset outside public directory: ' + relative);
		}
		if (fs.lstatSync(filename).isSymbolicLink()) throw new Error('Symbolic asset input: ' + relative);
		let contents = fs.readFileSync(filename);
		if (relative.endsWith('.css')) {
			contents = Buffer.from(contents.toString().replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g, (all, quote, url) => {
				if (/^(?:data:|https?:|\/\/|#)/.test(url)) return all;
				const [local] = url.split(/[?#]/);
				const dependency = local.startsWith('/') ? local.slice(1) :
					path.posix.normalize(path.posix.join(path.posix.dirname(relative), local));
				if (!publicPath.test(dependency) || !fs.existsSync(path.join(directory, dependency))) return all;
				const hashed = publish(dependency);
				const fragment = url.includes('#') ? url.slice(url.indexOf('#')) : '';
				return `url(${quote}${path.posix.relative(path.posix.dirname(relative), hashed)}${fragment}${quote})`;
			}));
		}
		const sha256 = digest(contents);
		const ext = path.posix.extname(relative);
		const target = fingerprint.test(relative) ? relative : relative.slice(0, -ext.length) + '.' + sha256.slice(0, 20) + ext;
		if (fingerprint.test(relative) && !relative.endsWith('.' + sha256.slice(0, 20) + ext)) {
			throw new Error('Invalid content-addressed input');
		}
		const output = path.join(directory, target);
		if (fs.existsSync(output) && digest(fs.readFileSync(output)) !== sha256) {
			throw new Error('Refusing to replace immutable asset');
		}
		if (!fs.existsSync(output)) fs.writeFileSync(output, contents);
		files.set(relative, { url: target, sha256, bytes: contents.length });
		return target;
	}
	function entry(html, host) {
		return html.replace(/((?:\s|-)src|\shref)="([^"]+)"/g, (all, attr, value) => {
			const parsed = new URL(value, 'https://' + host + '/');
			if (parsed.host !== host || !/^\?[a-f0-9]+$/.test(parsed.search)) return all;
			const relative = parsed.pathname.slice(1);
			if (!publicPath.test(relative) || !/\.(?:js|css)$/.test(relative)) return all;
			const target = publish(relative);
			const prefix = /^(?:https?:)?\/\//.test(value) ? value.slice(0, value.indexOf(parsed.pathname)) + '/' : value.startsWith('/') ? '/' : '';
			return `${attr}="${prefix}${target}${parsed.hash}"`;
		});
	}
	function mediaMap() {
		const urls = {};
		for (const folder of ['sprites', 'fx', 'audio', 'sounds']) {
			const start = path.join(directory, folder);
			if (!fs.existsSync(start)) continue;
			const walk = dir => {
				for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
					if (file.isSymbolicLink()) continue;
					const absolute = path.join(dir, file.name);
					if (file.isDirectory()) walk(absolute);
					else if (media.test(file.name) && !fingerprint.test(file.name)) {
						const relative = path.relative(directory, absolute).replace(/\\/g, '/');
						urls[relative] = publish(relative);
					}
				}
			};
			walk(start);
		}
		const script = `window.FantasyAssetURLs=${JSON.stringify(urls)};\n` +
			`window.FantasyAssetURL=function(url){try{var u=new URL(url,document.baseURI);` +
			`if(u.origin!==location.origin)return url;var target=window.FantasyAssetURLs[u.pathname.slice(1)];` +
			`return target?new URL('/'+target,location.origin).href+u.hash:url;}catch(e){return url;}};\n`;
		fs.writeFileSync(path.join(directory, 'data/asset-urls.js'), script);
	}
	function finish() {
		const manifest = { version: 1, files: Object.fromEntries(files) };
		fs.writeFileSync(path.join(directory, 'data/immutable-assets.json'), JSON.stringify(manifest, null, 2) + '\n');
	}
	return { publish, entry, mediaMap, finish };
}
module.exports = { immutableAssets };
