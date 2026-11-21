'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { serializeLazyTable } = require('./lazy-data');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

// Battle tooltips and sprites synchronously need generation/mod overrides. They
// must remain available before opening a battle, even with the editor unloaded.
function splitTeambuilderData(table) {
	const core = {};
	const editor = {};
	for (const [key, value] of Object.entries(table)) {
		if (!value || Array.isArray(value) || typeof value !== 'object' || key === 'learnsets') {
			editor[key] = value;
			continue;
		}
		if (key.startsWith('override')) { core[key] = value; continue; }
		const overrides = {};
		const rest = {};
		for (const [field, data] of Object.entries(value)) {
			if (field.startsWith('override') || field === 'removeType') overrides[field] = data;
			else rest[field] = data;
		}
		// Keep even empty mod entries: format detection checks their presence.
		core[key] = overrides;
		editor[key] = rest;
	}
	// Keep the original full export/API for replays and existing entry pages.
	// The deferred payload contains only missing fields, not a second copy of battle overrides.
	const full = serializeLazyTable('BattleTeambuilderTableEditor', editor, { compactLearnsets: true }) +
		`(function () {
	var core = exports.BattleTeambuilderTable, editor = exports.BattleTeambuilderTableEditor;
	if (!core) throw new Error('Teambuilder battle core is missing');
	function merge(target, source) {
		Object.keys(source).forEach(function (key) {
			var descriptor = Object.getOwnPropertyDescriptor(source, key), existing = target[key];
			function store(value) {
				Object.defineProperty(target, key, {value: value, writable: true, enumerable: true, configurable: true});
				return value;
			}
			function read() {
				var value = source[key];
				if (existing && value && typeof existing === 'object' && typeof value === 'object' &&
					!Array.isArray(existing) && !Array.isArray(value)) {
					merge(existing, value); value = existing;
				}
				return store(value);
			}
			if (descriptor.get) {
				Object.defineProperty(target, key, {get: read, set: store, enumerable: true, configurable: true});
			} else {
				read();
			}
		});
	}
	merge(core, editor);
	delete exports.BattleTeambuilderTableEditor;
	exports.BattleTeambuilderTableLoaded = true;
})();\n`;
	const filename = `teambuilder-tables.${hash(full).slice(0, 20)}.js`;
	const source = serializeLazyTable('BattleTeambuilderTable', core) +
		'exports.BattleTeambuilderTableLoaded = false;\n' +
		`exports.BattleTeambuilderTableAsset = typeof document !== 'undefined' && document.currentScript && document.currentScript.src\n` +
		`\t? new URL(${JSON.stringify(filename)}, document.currentScript.src).href : ${JSON.stringify('data/' + filename)};\n`;
	return { core: source, full, filename };
}

function writeTeambuilderDataSplit(directory, table) {
	const split = splitTeambuilderData(table);
	const files = { 'teambuilder-core.js': split.core, [split.filename]: split.full };
	for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(directory, name), text);
	// Never delete old hashed data: an already open page may need it later.
	fs.writeFileSync(path.join(directory, 'teambuilder-split.json'), JSON.stringify({
		version: 1, files: Object.fromEntries(Object.entries(files).map(([name, text]) => [name, hash(text)])),
	}, null, 2) + '\n');
}

function verifyTeambuilderDataSplit(directory) {
	const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'teambuilder-split.json'), 'utf8'));
	if (manifest.version !== 1 || Object.keys(manifest.files).length !== 2 || !manifest.files['teambuilder-core.js']) {
		throw new Error('Invalid teambuilder split. Run node build indexes.');
	}
	for (const [name, digest] of Object.entries(manifest.files)) {
		if (name !== 'teambuilder-core.js' && !/^teambuilder-tables\.[a-f0-9]{20}\.js$/.test(name)) {
			throw new Error('Invalid data path');
		}
		if (hash(fs.readFileSync(path.join(directory, name))) !== digest) throw new Error('Stale teambuilder split');
	}
	return manifest;
}
module.exports = { splitTeambuilderData, writeTeambuilderDataSplit, verifyTeambuilderDataSplit };
