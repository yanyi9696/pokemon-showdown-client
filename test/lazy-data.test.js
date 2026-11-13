'use strict';

const assert = require('assert').strict;
const vm = require('vm');
const { serializeLazyTable, serializeLazyValue } = require('../build-tools/lazy-data');

function load(script) {
	const context = vm.createContext({exports: {}});
	vm.runInContext('var parses = 0; var originalParse = JSON.parse; JSON.parse = function (text) { parses++; return originalParse(text); };', context);
	vm.runInContext(script, context);
	return context;
}
const large = () => ({pikachu: {learnset: {thunderbolt: ['9L1'], notes: 'x'.repeat(66000)}}});

describe('Deferred client data decoding', () => {
	it('retains all keys without decoding unused large generations', () => {
		const data = {tiers: ['OU'], learnsets: large(), gen8: large()}, context = load(serializeLazyTable('Table', data));
		assert.equal(context.parses, 1);
		assert.deepEqual(Object.keys(context.exports.Table), Object.keys(data));
		assert.equal(context.parses, 1);
		const first = context.exports.Table.learnsets;
		assert.equal(context.parses, 2);
		assert.equal(context.exports.Table.learnsets, first);
		assert.equal(context.parses, 2);
		assert.equal(JSON.stringify(context.exports.Table), JSON.stringify(data));
		assert.equal(context.parses, 3);
	});
	it('preserves mutations, property replacement and deletion without reparsing', () => {
		const context = load(serializeLazyTable('Table', {learnsets: large(), gen8: large()}));
		context.exports.Table.gen8 = {override: true};
		assert.equal(context.parses, 0);
		context.exports.Table.learnsets.pikachu.learnset.thunderbolt.push('8M');
		assert.equal(context.parses, 1);
		assert.equal(context.exports.Table.learnsets.pikachu.learnset.thunderbolt[1], '8M');
		delete context.exports.Table.learnsets;
		assert.equal('learnsets' in context.exports.Table, false);
		assert.equal(context.parses, 1);
	});
	it('decodes a complete optional export once and keeps a writable normal property', () => {
		const data = large(), context = load(serializeLazyValue('Learnsets', data));
		assert.deepEqual(Object.keys(context.exports), ['Learnsets']);
		assert.equal(context.parses, 0);
		assert.equal(JSON.stringify(context.exports.Learnsets), JSON.stringify(data));
		assert.equal(context.parses, 1);
		const descriptor = Object.getOwnPropertyDescriptor(context.exports, 'Learnsets');
		assert(descriptor.writable && descriptor.enumerable && descriptor.configurable);
		context.exports.Learnsets = {replacement: true};
		assert.equal(context.exports.Learnsets.replacement, true);
		assert.equal(context.parses, 1);
	});
	it('round trips unusual keys, quotes, slashes, Unicode and nested values', () => {
		const data = JSON.parse('{"__proto__":{"safe":true},"constructor":"value","text":"quote\\\" slash\\\\\\n","array":[null,false,0]}');
		data.text += '\u2028\u2029中文';
		for (const serialize of [serializeLazyTable, serializeLazyValue]) {
			const context = load(serialize('Table', data));
			assert.equal(JSON.stringify(context.exports.Table), JSON.stringify(data));
			assert(Object.prototype.hasOwnProperty.call(context.exports.Table, '__proto__'));
			assert.equal(Object.getPrototypeOf(context.exports.Table).safe, undefined);
		}
	});
	it('rejects code in an export name', () => {
		for (const serialize of [serializeLazyTable, serializeLazyValue]) {
			assert.throws(() => serialize('Table;evil()', {}), /Invalid data export/);
		}
	});
});

describe('Compact generated learnsets', () => {
	const compact = data => load(serializeLazyTable('Table', data, {compactLearnsets: true}));
	const root = {pikachu: {thunderbolt: '6789a', protect: '23456789a'}, eevee: {protect: '23456789a'}};
	it('does not decode any learnsets when reading a generation metadata table', () => {
		const context = compact({learnsets: root, gen8: {overrideSpeciesData: {pikachu: {num: 25}}, learnsets: root}});
		assert.equal(context.parses, 0);
		const table = context.exports.Table, gen8 = table.gen8;
		assert.equal(context.parses, 1);
		assert.equal(gen8.overrideSpeciesData.pikachu.num, 25);
		assert.equal(typeof Object.getOwnPropertyDescriptor(gen8, 'learnsets').get, 'function');
		assert.deepEqual(Object.keys(gen8), ['overrideSpeciesData', 'learnsets']);
		assert.equal(context.parses, 1);
		assert.equal(table.learnsets.pikachu.thunderbolt, '6789a');
		assert.equal(context.parses, 3, 'one shared string dictionary plus one root table');
		assert.equal(gen8.learnsets.eevee.protect, '23456789a');
		assert.equal(context.parses, 4, 'reuse the dictionary for the second table');
		assert.equal(table.gen8, gen8); assert.equal(context.parses, 4);
	});
	it('keeps mutations, replacement and deletion isolated across species and generations', () => {
		const context = compact({learnsets: root, gen8: {learnsets: root}, gen7: {learnsets: root}});
		const table = context.exports.Table;
		table.learnsets.pikachu.protect = 'modified';
		assert.equal(table.learnsets.eevee.protect, '23456789a');
		assert.equal(table.gen8.learnsets.pikachu.protect, '23456789a');
		delete table.gen8.learnsets.pikachu;
		assert(table.learnsets.pikachu);
		const parses = context.parses;
		table.gen7 = {replacement: true};
		assert.equal(context.parses, parses);
		table.learnsets = {replacement: {value: 'yes'}};
		assert.equal(context.parses, parses);
		assert.equal(table.learnsets.replacement.value, 'yes');
		delete table.gen8;
		assert.equal('gen8' in table, false);
	});
	it('round trips keys and order including empty records, quotes, Unicode and prototype-like names', () => {
		const data = JSON.parse('{"learnsets":{"__proto__":{"__proto__":"x","constructor":"y"},"constructor":{"quote":"a\\\"b"},"empty":{}},"gen8":{"learnsets":{},"constructor":"plain"}}');
		data.learnsets.constructor.quote += '\u2028\u2029中文';
		const context = compact(data);
		assert.equal(JSON.stringify(context.exports.Table), JSON.stringify(data));
		const moves = context.exports.Table.learnsets.__proto__;
		assert.equal(Object.getPrototypeOf(moves).__proto__, null);
		assert(Object.prototype.hasOwnProperty.call(moves, '__proto__'));
		assert(Object.prototype.hasOwnProperty.call(context.exports.Table.learnsets, '__proto__'));
	});
	it('leaves raw server learnsets, non-string fields and unrelated values intact', () => {
		const data = {learnsets: {pikachu: {learnset: {thunderbolt: ['9M']}, eventData: [{level: 5}]}},
			gen8: {learnsets: {pikachu: {move: false}}}, text: null, flags: [true, false]};
		assert.equal(JSON.stringify(compact(data).exports.Table), JSON.stringify(data));
	});
	it('supports the string at dictionary index zero and encodes deterministically', () => {
		const data = {learnsets: {first: {move: 'move'}, second: {other: 'move'}}};
		const source = serializeLazyTable('Table', data, {compactLearnsets: true});
		assert.equal(source, serializeLazyTable('Table', data, {compactLearnsets: true}));
		assert.equal(JSON.stringify(load(source).exports.Table), JSON.stringify(data));
	});
});
