'use strict';

const assert = require('assert').strict;
const path = require('path');
const vm = require('vm');
const {execFileSync} = require('child_process');
const ts = require('typescript');

describe('Shipped Showdex optional ladder lookup', () => {
	let source;
	before(() => {
		const archive = path.resolve(__dirname, '../play.pokemonshowdown.com/showdex/source.tar.gz');
		source = ts.transpileModule(execFileSync('tar', ['-xOf', archive, 'src/redux/services/actionApi.ts'],
			{encoding: 'utf8'}), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
	});
	function query(embedded, fetch) {
		const env = name => name === 'showdown-client-base-url' ? 'https://example.test' : '/action.php';
		env.bool = () => embedded;
		const deps = {
			qs: {__esModule: true, default: {stringify: value => new URLSearchParams(value).toString()}},
			'@showdex/consts/core': {HttpMethod: {GET: 'GET'}},
			'@showdex/redux/factories': {createTagProvider: () => () => []},
			'@showdex/utils/core': {env, runtimeFetch: fetch, safeJsonParse: text => {
				try { return JSON.parse(text); } catch { return null; }
			}},
			'./showdownApi': {showdownApi: {injectEndpoints: ({endpoints}) => endpoints({query: value => value})}},
			'./tagTypes': {ShowdownReduxTagType: {Ladder: 'ladder'}},
		};
		const context = vm.createContext({exports: {}, require: name => {
			assert(name in deps, name); return deps[name];
		}});
		vm.runInContext(source, context);
		return context.exports.actionApi.userLadder.queryFn;
	}
	it('does not fetch a foreign ladder for embedded local guests or Rogue NPCs', async () => {
		const lookup = query(true, () => { throw new Error('Unexpected network request'); });
		for (const name of ['LocalTest', 'Rogue NPC', 'RegisteredPlayer']) {
			assert.equal((await lookup(name)).data.length, 0);
		}
	});
	it('retains successful ladder queries in the non-embedded extension', async () => {
		const lookup = query(false, async url => {
			assert.equal(url, 'https://example.test/action.php?act=ladderget&user=Test+User');
			return {ok: true, text: () => '][{"entryid":12,"formatid":"gen9ou","elo":1500}]'};
		});
		assert.equal((await lookup('Test User')).data[0].elo, 1500);
	});
	it('returns a structured network/HTTP/JSON error instead of throwing out of RTK Query', async () => {
		const failure = query(false, async () => { throw new TypeError('Failed to fetch'); });
		assert.equal((await failure('Test')).error.status, 'FETCH_ERROR');
		const http = query(false, async () => ({ok: false, status: 503, text: () => 'Unavailable'}));
		assert.equal((await http('Test')).error.status, 503);
		const invalid = query(false, async () => ({ok: true, text: () => '<html>not JSON</html>'}));
		assert.equal((await invalid('Test')).error.status, 'CUSTOM_ERROR');
	});
});
