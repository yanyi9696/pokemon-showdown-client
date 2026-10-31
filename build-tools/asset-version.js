'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const sites = new Set([
	'play.pokemonshowdown.com', 'replay.pokemonshowdown.com', 'teams.pokemonshowdown.com',
	'dex.pokemonshowdown.com', 'pokemonshowdown.com',
]);

/** Resolve the source URL before deployment domains are substituted. */
function assetVersion(url, templateDir, rootDir) {
	// This optional, private local configuration must never be read by a build.
	if (/(^|\/)testclient-key\.js$/.test(url)) return undefined;
	let filename;
	if (/^(?:https?:)?\/\//.test(url)) {
		const parsed = new URL(url.startsWith('//') ? 'https:' + url : url);
		if (!sites.has(parsed.host)) return undefined;
		filename = path.resolve(rootDir, parsed.host, '.' + parsed.pathname);
	} else {
		filename = path.resolve(rootDir, templateDir, url.replace(/^\//, ''));
	}
	if (!filename.startsWith(path.resolve(rootDir) + path.sep)) {
		throw new Error('Asset is outside the client workspace: ' + url);
	}
	// A missing public build asset is a release error, not a reason to publish a random URL.
	return crypto.createHash('md5').update(fs.readFileSync(filename)).digest('hex').slice(0, 8);
}

module.exports = { assetVersion };
