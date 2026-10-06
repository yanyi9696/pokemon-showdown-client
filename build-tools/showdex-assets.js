'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// These files are a versioned standalone release, so deployment does not need a
// third checkout, a browser extension, or the Showdex build toolchain.
function verifyShowdexAssets(directory = path.resolve(__dirname, '../play.pokemonshowdown.com/showdex')) {
	try {
		const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'asset-manifest.json'), 'utf8'));
		if (manifest.schemaVersion !== 1 || !manifest.files) throw new Error('Invalid asset manifest');
		for (const name of ['main.js', 'source.tar.gz', 'LICENSE-Showdex', 'NOTICE.txt', 'main.js.LICENSE.txt']) {
			if (!manifest.files[name]) throw new Error(`Missing release file: ${name}`);
		}
		for (const [name, metadata] of Object.entries(manifest.files)) {
			if (path.isAbsolute(name) || name.split(/[\\/]/).some(part => part === '..' || !part)) {
				throw new Error(`Invalid asset path: ${name}`);
			}
			const contents = fs.readFileSync(path.join(directory, name));
			const hash = crypto.createHash('sha256').update(contents).digest('hex');
			if (contents.length !== metadata.bytes || hash !== metadata.sha256) {
				throw new Error(`Incomplete or mixed Showdex release: ${name}`);
			}
		}
		return manifest;
	} catch (error) {
		throw new Error(`Embedded calculator assets are missing or invalid: ${error.message}. ` +
			'Restore play.pokemonshowdown.com/showdex/ from the client repository, ' +
			'or rebuild it with npm run build:battle-assist. Do not deploy an incomplete client.');
	}
}

if (require.main === module) {
	const manifest = verifyShowdexAssets();
	console.log(`Embedded calculator: verified ${Object.keys(manifest.files).length} release files.`);
}

module.exports = { verifyShowdexAssets };
