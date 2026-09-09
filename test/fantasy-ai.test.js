const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

function client() {
	const preferences = {};
	const sent = [];
	const joined = [];
	const timers = [];
	const context = {
		Room: { extend: value => value },
		Storage: {
			teams: [], whenTeamsLoaded: { isLoaded: true },
			prefs: (name, value) => value === undefined ? preferences[name] : (preferences[name] = value),
			getPackedTeam: team => team.team,
		},
		Config: { server: { id: 'local', host: 'localhost', port: 8000 } },
		app: {
			user: { get: prop => prop === 'named' ? true : 'tester' }, socket: { readyState: 1 },
			send: message => sent.push(message), sendTeam: (team, callback) => { sent.push(team.team); callback(); },
			joinRoom: roomid => joined.push(roomid),
		},
		setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout: () => {},
		BattleLog: {
			escapeHTML: text => String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'),
			escapeFormat: text => String(text).replace(/</g, '&lt;'),
		},
		Dex: { resolveAvatar: () => '/sprites/trainers/1.png' }, TeamPopup: { renderTeam: () => 'team icons' },
	};
	vm.runInNewContext(fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/client-fantasy-ai.js'), 'utf8'), context);
	const room = Object.create(context.FantasyAIRoom);
	room.scope = context.FantasyAI.scope();
	room.selection = context.FantasyAI.read(room.scope);
	room.$el = { html: html => { room.html = html; } };
	return { ...context, room, sent, joined, timers };
}
const team = (name = 'Team A') => ({ name, format: 'gen9fcou', folder: '', team: 'Mew||leftovers|synchronize|psychic' });
const formats = [
	{ id: 'gen9fcubersuu', name: 'FC UBUU' }, { id: 'gen9fcou', name: 'FC OU' }, { id: 'gen9fcuu', name: 'FC UU' },
];
const trainer = { id: 'test', name: 'Test trainer', description: 'Balanced', avatar: '1', style: 'balanced', format: 'gen9fcou' };

describe('Fantasy AI client', () => {
	it('filters trainers by format, clears incompatible selections, and submits the chosen format', () => {
		const c = client();
		const uu = { ...trainer, id: 'uu-trainer', format: 'gen9fcuu' };
		c.Storage.teams = [team()]; c.FantasyAI.syncTeams();
		c.room.selection.teamId = c.Storage.teams[0].fantasyAIId;
		c.room.receiveState({ protocolVersion: 2, formats, enabled: true, trainers: [trainer, uu], activeBattles: [] });
		assert.equal(c.room.availableTrainers().length, 0);
		c.room.changeFormat({ currentTarget: { value: 'gen9fcou' } });
		c.room.changeTrainer({ currentTarget: { value: trainer.id } });
		assert.equal(c.room.availableTrainers().length, 1);
		assert.equal(c.room.selectedTrainer().id, trainer.id);
		c.room.changeFormat({ currentTarget: { value: 'gen9fcuu' } });
		assert.equal(c.room.selection.trainerId, '');
		assert.equal(c.room.selectedTeam(), c.Storage.teams[0]);
		c.room.startChallenge();
		assert(!c.sent.some(message => message.startsWith('/fantasyai challenge')));
		c.room.changeTrainer({ currentTarget: { value: uu.id } });
		c.room.startChallenge();
		assert(c.sent[c.sent.length - 1].endsWith(', gen9fcuu'));
		assert.equal(c.room.selection.pending.format, 'gen9fcuu');
		assert.equal(c.FantasyAI.read(c.room.scope).format, 'gen9fcuu');
	});
	it('shows unavailable formats and empty trainer lists without silently selecting another trainer', () => {
		const c = client();
		c.room.receiveState({ protocolVersion: 2, formats, enabled: true, trainers: [trainer], activeBattles: [] });
		c.room.changeFormat({ currentTarget: { value: 'gen9fcuu' } });
		assert(c.room.html.includes('这个赛制目前没有可挑战'));
		c.room.changeFormat({ currentTarget: { value: 'gen9fcag' } });
		assert(c.room.html.includes('上次选择的赛制已不可用'));
		assert.equal(c.room.selectedTrainer(), undefined);
	});
	it('remembers the actual battle format from reconnect metadata', () => {
		const c = client();
		c.room.selection.pending = { requestId: 'request-1234', trainerId: trainer.id, format: 'gen9fcou', difficulty: 'normal', teamId: 'selected-team' };
		c.room.save();
		c.FantasyAI.rememberBattle('battle-test-1', { userid: 'tester', trainerId: trainer.id, format: 'gen9fcou', difficulty: 'normal' });
		c.room.restoreBattle('battle-test-1');
		assert.equal(c.room.selection.format, 'gen9fcou');
		assert.equal(c.room.selection.teamId, 'selected-team');
		assert(!c.sent.some(message => message.startsWith('/fantasyai challenge')));
	});
	it('routes home and existing battle buttons through the application', () => {
		const c = client();
		c.room.joinRoom(''); c.room.joinRoom('battle-test-1');
		assert.deepEqual(c.joined, ['', 'battle-test-1']);
	});
	it('defaults to normal and separates remembered choices by server and player', () => {
		const c = client();
		assert.equal(c.room.selection.difficulty, 'normal');
		c.room.selection.difficulty = 'hard'; c.room.save();
		assert.equal(c.FantasyAI.read(c.room.scope).difficulty, 'hard');
		c.Config.server.port = 9000;
		assert.equal(c.FantasyAI.read(c.FantasyAI.scope()).difficulty, 'normal');
		c.app.user.get = () => 'another';
		assert.equal(c.FantasyAI.read(c.FantasyAI.scope()).difficulty, 'normal');
	});
	it('keeps edited/reordered teams selected and restores only unique exact matches after reload', () => {
		const c = client();
		c.Storage.teams = [team(), team('Team B')]; c.FantasyAI.syncTeams();
		const chosen = c.Storage.teams[0]; c.room.selection.teamId = chosen.fantasyAIId;
		chosen.name = 'Edited'; chosen.team += ',roost'; c.Storage.teams.reverse(); c.FantasyAI.syncTeams();
		assert.equal(c.room.selectedTeam(), chosen);
		c.Storage.teams = c.Storage.teams.map(({ fantasyAIId, ...rest }) => rest); c.FantasyAI.syncTeams();
		assert.equal(c.room.selectedTeam().name, 'Edited');
		c.Storage.teams = [team('Team B')]; c.FantasyAI.syncTeams();
		assert.equal(c.room.selectedTeam(), undefined);
	});
	it('restores a returning player after login but preserves explicit guest edits', () => {
		const c = client();
		c.room.selection.format = 'gen9fcuu';
		c.room.selection.trainerId = 'saved-trainer';
		c.room.selection.teamId = 'saved-team';
		c.room.selection.difficulty = 'hard'; c.room.save();
		c.room.wasNamed = false;
		c.room.selection = { trainerId: 'guest-trainer', teamId: '', difficulty: 'normal' };
		c.room.identityChanged();
		assert.equal(c.room.selection.trainerId, 'saved-trainer');
		assert.equal(c.room.selection.format, 'gen9fcuu');
		assert.equal(c.room.selection.teamId, 'saved-team');
		assert.equal(c.room.selection.difficulty, 'hard');
		c.room.wasNamed = false;
		c.app.user.get = prop => prop === 'named' ? false : 'guest';
		c.room.scope = c.FantasyAI.scope();
		c.room.selection = { trainerId: '', teamId: '', difficulty: 'normal' };
		c.room.changeTeam({ currentTarget: { value: 'new-team' } });
		c.app.user.get = prop => prop === 'named' ? true : 'tester';
		c.room.identityChanged();
		assert.equal(c.room.selection.teamId, 'new-team');
		assert.equal(c.room.guestSelectionChanged, false);
	});
	it('invalidates ambiguous duplicate teams instead of restoring a stale list position', () => {
		const c = client();
		c.Storage.teams = [team()]; c.FantasyAI.syncTeams();
		c.room.selection.teamId = c.Storage.teams[0].fantasyAIId;
		c.Storage.teams = [team(), team()]; c.FantasyAI.syncTeams();
		assert.equal(c.room.selectedTeam(), undefined);
	});
	it('does not give a newly imported copy the identity of an edited live team', () => {
		const c = client();
		const chosen = team(); c.Storage.teams = [chosen]; c.FantasyAI.syncTeams();
		c.room.selection.teamId = chosen.fantasyAIId;
		chosen.team += ',roost';
		c.Storage.teams.unshift(team()); c.FantasyAI.syncTeams();
		assert.equal(c.room.selectedTeam(), chosen);
		assert.notEqual(c.Storage.teams[0].fantasyAIId, chosen.fantasyAIId);
	});
	it('submits the current team once, queries on timeout, and ignores unrelated results', () => {
		const c = client();
		c.Storage.teams = [team()]; c.FantasyAI.syncTeams();
		c.room.state = { protocolVersion: 2, formats, enabled: true, trainers: [trainer], activeBattles: [] };
		c.room.selection.format = trainer.format;
		c.room.selection.trainerId = trainer.id;
		c.room.selection.teamId = c.Storage.teams[0].fantasyAIId;
		c.room.startChallenge(); c.room.startChallenge();
		assert.equal(c.sent.filter(message => message.startsWith('/fantasyai challenge')).length, 1);
		c.timers[0]();
		assert(c.sent[c.sent.length - 1].startsWith('/cmd fantasyai '));
		c.room.receiveChallenge({ requestId: 'unrelated', status: 'success', roomid: 'battle-test-1' });
		assert.equal(c.joined.length, 0);
		const requestId = c.room.selection.pending.requestId;
		c.room.receiveChallenge({ requestId, status: 'success', roomid: 'battle-test-1' });
		assert.equal(c.joined[0], 'battle-test-1');
		assert.equal(c.room.selection.pending, null);
	});
	it('retains pending status after a connection failure and never reissues an uncertain request', () => {
		const c = client();
		c.room.selection.pending = { requestId: 'pending-1234' }; c.room.save();
		c.room.disconnected(); c.room.refresh();
		assert.equal(c.sent[0], '/cmd fantasyai pending-1234');
		c.room.receiveState({ protocolVersion: 2, formats, enabled: true, trainers: [], activeBattles: [], challenge: { requestId: 'pending-1234', status: 'unknown' } });
		assert.equal(c.room.selection.pending, null);
		assert.equal(c.sent.length, 1);
	});
	it('restores a rematch selection without submitting another challenge', () => {
		const c = client();
		c.room.selection.battles['battle-test-1'] = { format: 'gen9fcuu', trainerId: 'old-trainer', difficulty: 'hard', teamId: 'removed-team' };
		c.room.save(); c.room.restoreBattle('battle-test-1');
		assert.equal(c.room.selection.trainerId, 'old-trainer');
		assert.equal(c.room.selection.format, 'gen9fcuu');
		assert.equal(c.room.selection.teamId, 'removed-team');
		assert.equal(c.sent[0], '/cmd fantasyai');
		assert(!c.sent.some(message => message.startsWith('/fantasyai challenge')));
	});
	it('escapes trainer and error text while distinguishing closed, empty, failed and stale selections', () => {
		const c = client();
		c.room.receiveState({ protocolVersion: 2, formats, enabled: false, trainers: [], activeBattles: [] });
		assert(c.room.html.includes('AI 挑战尚未开放'));
		c.room.receiveState({ protocolVersion: 2, formats, enabled: true, trainers: [], activeBattles: [] });
		assert(c.room.html.includes('目前没有可挑战'));
		c.room.receiveState(null);
		assert(c.room.html.includes('未返回有效'));
		c.room.selection.trainerId = 'test'; c.room.selection.teamId = 'missing';
		c.room.receiveState({ protocolVersion: 2, formats, enabled: true, trainers: [{ ...trainer, name: '<img onerror=alert(1)>', description: '<script>bad()</script>' }], activeBattles: [] });
		assert(!c.room.html.includes('<script>bad'));
		assert(c.room.html.includes('&lt;script>bad'));
		assert(c.room.html.includes('队伍已删除或无法可靠对应'));
	});
	it('requires a server with explicit creation-result support and ignores malformed stored requests', () => {
		const c = client();
		c.room.receiveState({ enabled: true, trainers: [trainer], activeBattles: [] });
		assert.equal(c.room.state, null);
		assert(c.room.html.includes('服务器版本尚不支持'));
		c.room.selection.pending = { requestId: 'bad\n/command' }; c.room.save();
		assert.equal(c.FantasyAI.read(c.room.scope).pending, null);
	});
});
