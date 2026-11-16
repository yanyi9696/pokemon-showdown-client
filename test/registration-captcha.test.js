'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');

const web = '../play.pokemonshowdown.com/';
const legacySource = fs.readFileSync(require.resolve(web + 'js/client-topbar.js'), 'utf8');
const panelSource = fs.readFileSync(require.resolve(web + 'src/panel-popups.tsx'), 'utf8');
const registerPanel = ts.transpileModule(panelSource.slice(panelSource.indexOf('class RegisterPanel '),
	panelSource.indexOf('class PopupPanel ')), {compilerOptions: {target: ts.ScriptTarget.ES2020,
	jsx: ts.JsxEmit.React, jsxFactory: 'preact.h'}}).outputText;

function registration(modern, captcha) {
	const fields = {name: 'FCTest皮卡丘', password: 'test-only-皮卡丘-pass', cpassword: 'test-only-皮卡丘-pass', captcha};
	const requests = [], sent = [], popups = [];
	let respond;
	const user = {name: fields.name, challstr: 'test-only-challenge', registered: false};
	if (modern) {
		const context = {
			PSRoomPanel: class {
				state = {};
				setState(value) { Object.assign(this.state, value); }
				close() { this.closed = true; }
			},
			PS: {user, alert: text => popups.push(text)},
			PSLoginServer: {query: (act, data) => {
				requests.push({act, ...data});
				return new Promise(resolve => { respond = resolve; });
			}},
			console: {log() {}, error() {}},
		};
		user.handleAssertion = (name, assertion) => sent.push([name, assertion]);
		vm.runInNewContext(registerPanel + ';this.RegisterPanel = RegisterPanel;', context);
		const popup = new context.RegisterPanel();
		popup.base = {querySelector: selector => ({value: fields[selector.match(/name=(\w+)/)[1]]})};
		return {fields, user, requests, sent, popups, popup,
			submit: () => popup.handleRegisterUser({preventDefault() {}}),
			respond: async data => { respond(data); await Promise.resolve(); },
		};
	}
	const context = {
		Backbone: {View: {extend: value => value}}, Popup: {extend: value => value},
		jQuery: {post: (url, data, callback) => { requests.push({...data, url}); respond = callback; }},
		Storage: {safeJSON: callback => callback}, Dex: {resourcePrefix: '/'},
		BattleLog: {escapeHTML: value => String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')},
		app: {user, send: text => sent.push(text), addPopup: (type, data) => popups.push({type, data}),
			addPopupMessage: text => popups.push(text)},
	};
	user.get = key => user[key]; user.set = (key, value) => { user[key] = value; };
	user.getActionPHP = () => '/~~test-server/action.php';
	vm.runInNewContext(legacySource, context);
	const popup = Object.create(context.RegisterPopup);
	return {fields, user, requests, sent, popups, popup,
		submit: () => popup.submit(fields), respond: async data => { respond(data); },
	};
}

describe('Localized registration answer', () => {
	for (const modern of [false, true]) describe(modern ? 'Modern panel' : 'Legacy popup', () => {
		for (const answer of ['皮卡丘', ' 皮卡丘 ', '\u3000皮卡丘\u3000']) {
			it(`submits the Chinese answer to the existing verifier: ${JSON.stringify(answer)}`, () => {
				const c = registration(modern, answer); c.submit();
				assert.equal(c.requests.length, 1);
				const request = c.requests[0];
				assert.equal(request.act, 'register'); assert.equal(request.captcha, 'pikachu');
				assert.equal(request.username, c.fields.name); assert.equal(request.password, c.fields.password);
				assert.equal(request.cpassword, c.fields.cpassword); assert.equal(request.challstr, c.user.challstr);
				assert.equal(c.fields.captcha, answer); assert.equal(c.user.registered, false); assert.equal(c.sent.length, 0);
				if (!modern) assert.equal(request.url, '/~~test-server/action.php');
			});
		}
		for (const answer of ['pikachu', 'PIKACHU', '伊布', '皮卡丘玩家', '不是皮卡丘']) {
			it(`preserves English and nonmatching answers for server validation: ${answer}`, () => {
				const c = registration(modern, answer); c.submit();
				assert.equal(c.requests[0].captcha, answer);
				assert.equal(c.user.registered, false); assert.equal(c.sent.length, 0);
			});
		}
		it('does not supply an answer for an empty field', () => {
			const c = registration(modern, ''); c.submit();
			if (modern) assert.equal(c.requests.length, 0);
			else assert.equal(c.requests[0].captcha, '');
			assert.equal(c.user.registered, false);
		});
		it('keeps the entered Chinese answer and the existing failure path when registration is rejected', async () => {
			const c = registration(modern, '皮卡丘'); c.submit();
			await c.respond({actionerror: 'Test-only registration rejection'});
			assert.equal(c.user.registered, false); assert.equal(c.sent.length, 0);
			assert.equal(c.fields.captcha, '皮卡丘');
			if (modern) assert.equal(c.popup.state.errorMsg, 'Test-only registration rejection');
			else {
				assert.equal(c.popups[0].data.captcha, '皮卡丘');
				assert.equal(c.popups[0].data.error, 'Test-only registration rejection');
				let html;
				c.popup.$el = {html: value => { html = value; }};
				c.popup.initialize(c.popups[0].data);
				assert(html.includes('name="name" value="' + c.fields.name + '"'));
				assert(html.includes('name="captcha" value="皮卡丘"'));
			}
		});
		it('uses the normal success path only after the mocked login service accepts registration', async () => {
			const c = registration(modern, '皮卡丘'); c.submit();
			await c.respond({curuser: {loggedin: true, username: c.fields.name}, assertion: 'test-only-assertion'});
			assert(c.user.registered);
			assert.equal(c.sent.length, 1);
			if (modern) {
				assert.deepEqual(c.sent[0], [c.fields.name, 'test-only-assertion']); assert.equal(c.popup.closed, true);
			} else assert.equal(c.sent[0], '/trn ' + c.fields.name + ',1,test-only-assertion');
		});
	});
});
