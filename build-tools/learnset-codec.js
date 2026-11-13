'use strict';

// Only compact the generated, flat move -> generation-string tables. Raw server
// learnsets (arrays, event data, etc.) must retain their original representation.
function isCompactLearnsetTable(value) {
	return !!value && typeof value === 'object' && !Array.isArray(value) &&
		Object.values(value).every(moves => !!moves && typeof moves === 'object' && !Array.isArray(moves) &&
			Object.values(moves).every(gens => typeof gens === 'string'));
}

function createLearnsetEncoder() {
	const strings = [], indices = new Map();
	function intern(value) {
		if (!indices.has(value)) {
			indices.set(value, strings.length);
			strings.push(value);
		}
		return indices.get(value);
	}
	return {
		strings,
		encode(table) {
			if (!isCompactLearnsetTable(table)) throw new Error('Expected a flat generated learnset table');
			return Object.entries(table).map(([id, moves]) => [id,
				Object.entries(moves).flatMap(([move, gens]) => [intern(move), intern(gens)]),
			]);
		},
	};
}

// Emitted inside the data file's private closure. Each read produces independent
// mutable species maps; only immutable strings are shared between generations.
const learnsetDecoder = `function readLearnsets(text) {
	if (typeof learnsetStrings === 'string') learnsetStrings = JSON.parse(learnsetStrings);
	var rows = JSON.parse(text), table = {};
	function set(target, key, value) {
		if (key === '__proto__') {
			Object.defineProperty(target, key, {value: value, writable: true, enumerable: true, configurable: true});
		} else {
			target[key] = value;
		}
	}
	for (var i = 0; i < rows.length; i++) {
		var row = rows[i], moves = {}, pairs = row[1];
		for (var j = 0; j < pairs.length; j += 2) set(moves, learnsetStrings[pairs[j]], learnsetStrings[pairs[j + 1]]);
		set(table, row[0], moves);
	}
	return table;
}`;

module.exports = { isCompactLearnsetTable, createLearnsetEncoder, learnsetDecoder };
