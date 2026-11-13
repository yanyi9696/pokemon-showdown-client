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

/** Downloaded replays use JS loader calls rather than HTML src/href attributes. */
function versionReplayAssets(contents, rootDir, clientHost) {
	return contents.replace(/^(linkStyle|requireScript)\((['"])([^'"\r\n]+)\2\);$/gm, (call, loader, quote, value) => {
		const parts = /^([^?#]+)(\?[a-z0-9]*)?$/.exec(value);
		if (!parts) return call;
		const [, url, query] = parts;
		// The legacy replay template intentionally uses the Fantasy host for custom data.
		// Hash its local build input without changing that existing runtime destination.
		const sourceUrl = url.replace(/^(https?:\/\/|\/\/)play\.psfantasy\.xyz(?=\/)/,
			(_, protocol) => protocol + 'play.pokemonshowdown.com');
		const hash = query ? assetVersion(sourceUrl, 'play.pokemonshowdown.com', rootDir) : undefined;
		const target = url.replace(/^(https?:\/\/|\/\/)play\.pokemonshowdown\.com(?=\/)/,
			(_, protocol) => protocol + clientHost);
		return `${loader}(${quote}${target}${hash ? '?' + hash : query || ''}${quote});`;
	});
}

module.exports = { assetVersion, versionReplayAssets };
