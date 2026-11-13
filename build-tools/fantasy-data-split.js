'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

// Keep the complete legacy entry for old HTML, downloaded replays and other
// consumers. Only new entry pages use core + the version-matched optional table.
function splitFantasyData(mod, source, learnsetsSource) {
	if (!/^gen\d+fantasy$/.test(mod)) throw new Error('Invalid Fantasy mod');
	const offset = source.indexOf(learnsetsSource);
	if (!learnsetsSource || offset < 0 || source.indexOf(learnsetsSource, offset + 1) >= 0) {
		throw new Error('Expected exactly one complete Fantasy learnset export');
	}
	const exportName = mod.charAt(0).toUpperCase() + mod.slice(1) + 'LearnsetsAsset';
	const filename = `${mod}-learnsets.${hash(learnsetsSource).slice(0, 20)}.js`;
	const core = source.slice(0, offset) +
		`exports.${exportName} = typeof document !== 'undefined' && document.currentScript && document.currentScript.src\n` +
		`\t? new URL(${JSON.stringify(filename)}, document.currentScript.src).href\n` +
		`\t: ${JSON.stringify('data/' + filename)};\n` +
		source.slice(offset + learnsetsSource.length);
	return { core, filename, learnsets: learnsetsSource };
}

function writeFantasyDataSplit(directory, mod, source, learnsetsSource) {
	const split = splitFantasyData(mod, source, learnsetsSource);
	const files = { [`${mod}.js`]: source, [`${mod}-core.js`]: split.core, [split.filename]: split.learnsets };
	for (const [name, contents] of Object.entries(files)) {
		fs.writeFileSync(path.join(directory, name), contents);
	}
	// Do not remove previous content-addressed tables: an already open page can
	// request its old version when the user first opens Showdex after an update.
	fs.writeFileSync(path.join(directory, `${mod}-split.json`), JSON.stringify({
		version: 1, files: Object.fromEntries(Object.entries(files).map(([name, contents]) => [name, hash(contents)])),
	}, null, 2) + '\n');
	return split;
}

function verifyFantasyDataSplit(directory, mod = 'gen9fantasy') {
	const fail = () => {
		throw new Error('Incomplete or stale Fantasy data split. Run node build indexes with the correct server source.');
	};
	let manifest;
	try { manifest = JSON.parse(fs.readFileSync(path.join(directory, `${mod}-split.json`), 'utf8')); } catch { fail(); }
	const files = manifest?.files;
	if (manifest?.version !== 1 || !files || Object.keys(files).length !== 3 ||
		!files[`${mod}.js`] || !files[`${mod}-core.js`]) fail();
	for (const [name, expected] of Object.entries(files)) {
		if (name !== `${mod}.js` && name !== `${mod}-core.js` &&
			!new RegExp(`^${mod}-learnsets\\.[a-f0-9]{20}\\.js$`).test(name)) fail();
		let data;
		try { data = fs.readFileSync(path.join(directory, name)); } catch { fail(); }
		if (hash(data) !== expected) fail();
	}
	return manifest;
}

module.exports = { splitFantasyData, writeFantasyDataSplit, verifyFantasyDataSplit };
