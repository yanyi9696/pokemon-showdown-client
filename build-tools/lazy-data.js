'use strict';

const { isCompactLearnsetTable, createLearnsetEncoder, learnsetDecoder } = require('./learnset-codec');

// Keep the existing synchronous data API. Decode large tables on first access
// instead of allocating every generation's learnsets during login.
const LAZY_BYTES = 64 * 1024;
const literal = value => JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
// JSON already quotes every object key. Single-quoted JS strings avoid adding
// a backslash to every JSON quote and keep transferred bytes close to the old file.
const jsonLiteral = text => "'" + text.replace(/['\\]/g, '\\$&')
	.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + "'";
function lazyProperty(customReader = false) {
	return `function lazy(target, key, text${customReader ? ', read' : ''}) {
	function store(value) {
		Object.defineProperty(target, key, {value: value, writable: true, enumerable: true, configurable: true});
		text = '';
		return value;
	}
	Object.defineProperty(target, key, {
		enumerable: true, configurable: true,
		get: function () { return store(${customReader ? 'read ? read(text) : JSON.parse(text)' : 'JSON.parse(text)'}); },
		set: store
	});
}`;
}

function exportTarget(name) {
	if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error('Invalid data export name');
	return `exports.${name}`;
}

function serializeLazyTable(name, data, options = {}) {
	const encoder = options.compactLearnsets ? createLearnsetEncoder() : null;
	const lines = [`(function (target) {\n${lazyProperty(!!encoder)}`];
	for (const [key, value] of Object.entries(data)) {
		const json = JSON.stringify(value);
		if (json === undefined) continue;
		if (encoder && key === 'learnsets' && isCompactLearnsetTable(value)) {
			lines.push(`lazy(target, ${literal(key)}, ${jsonLiteral(JSON.stringify(encoder.encode(value)))}, readLearnsets);`);
		} else if (encoder && !Array.isArray(value) && isCompactLearnsetTable(value?.learnsets)) {
			// Mod lookup needs species/items overrides before it needs learnsets. Keep
			// the nested move table lazy too, preserving its original property order.
			const metadata = { ...value, learnsets: null };
			lines.push(`lazy(target, ${literal(key)}, ${jsonLiteral(JSON.stringify(metadata))}, function (text) {\n` +
				`\tvar table = JSON.parse(text);\n` +
				`\tlazy(table, 'learnsets', ${jsonLiteral(JSON.stringify(encoder.encode(value.learnsets)))}, readLearnsets);\n` +
				`\treturn table;\n});`);
		} else if (Buffer.byteLength(json) >= LAZY_BYTES) {
			lines.push(`lazy(target, ${literal(key)}, ${jsonLiteral(json)});`);
		} else {
			// Define even small properties explicitly: JSON keys such as __proto__
			// must remain own data properties rather than changing the prototype.
			lines.push(`Object.defineProperty(target, ${literal(key)}, {value: JSON.parse(${jsonLiteral(json)}), writable: true, enumerable: true, configurable: true});`);
		}
	}
	if (encoder) {
		lines.splice(1, 0, `var learnsetStrings = ${jsonLiteral(JSON.stringify(encoder.strings))};\n${learnsetDecoder}`);
	}
	lines.push(`})(${exportTarget(name)} = {});\n`);
	return lines.join('\n');
}

function serializeLazyValue(name, data) {
	exportTarget(name);
	return `(function () {\n${lazyProperty()}\nlazy(exports, ${literal(name)}, ${jsonLiteral(JSON.stringify(data))});\n})();\n`;
}

module.exports = { serializeLazyTable, serializeLazyValue };
