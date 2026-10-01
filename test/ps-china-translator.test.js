const assert = require('assert').strict;
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync(require.resolve('../play.pokemonshowdown.com/js/ps-china-translator.js'), 'utf8');
const heading = 'Your team was rejected for the following reasons:';
const chineseHeading = '您的队伍未通过校验，原因如下：';

function element(tagName, className = '', parent = null) {
	const node = {
		nodeType: 1, tagName, parentNode: parent, parentElement: parent, childNodes: [],
		classList: { contains: name => name === className },
		getAttribute: name => name === 'class' ? className : null,
		closest(selector) { return selector === `.${className}` ? node : parent?.closest(selector); },
		get textContent() { return node.childNodes.map(child => child.textContent ?? child.nodeValue).join(''); },
	};
	parent?.childNodes.push(node);
	return node;
}
function text(value, parent) {
	const node = { nodeType: 3, nodeValue: value, parentNode: parent, parentElement: parent };
	parent.childNodes.push(node);
	return node;
}
function client(message, language = 'zh', split = false) {
	const body = element('BODY');
	const popup = element('DIV', 'ps-popup', body);
	const paragraph = element('P', '', popup);
	for (const line of split ? message.split('\n') : [message]) text(line, paragraph);
	const button = element('BUTTON', '', popup);
	text('OK', element('STRONG', '', button));
	const label = text('\u00a0G-Mega\u00a0Evolution', element('LABEL', 'megaevo', body));
	let notify;
	vm.runInNewContext(source, {
		localStorage: { getItem: () => language },
		document: { body, addEventListener() {} },
		$: () => ({ ready: callback => callback() }),
		MutationObserver: class {
			constructor(callback) { notify = callback; }
			observe() {}
		},
	});
	return { body, popup, paragraph, label, notify };
}

describe('Chinese team validation popups', () => {
	it('translates the screenshot as a single multiline message and keeps the G-Mega label working', () => {
		const ui = client(`${heading}\n\n- Metagross-Mega-Fantasy can't learn Breaking Swipe.`);
		assert.equal(ui.paragraph.textContent, `${chineseHeading}\n\n- 巨金怪-超级进化-幻想无法学习“广域破坏”。`);
		assert.equal(ui.popup.childNodes[1].textContent, '确认');
		assert.equal(ui.label.nodeValue, '超巨进化');
	});
	for (const [reason, expected] of [
		["Metagross-Mega-Fantasy can't learn Breaking Swipe.", '巨金怪-超级进化-幻想无法学习“广域破坏”。'],
		["小铁块 (Metagross-Mega-Fantasy) can't learn Psychic.", '小铁块（巨金怪-超级进化-幻想）无法学习“精神强念”。'],
		["Pikachu can't have Intimidate.", '皮卡丘不能拥有特性“威吓”。'],
		["Pikachu can't have As One (Spectrier).", '皮卡丘不能拥有特性“人马一体 (灵幽马)”。'],
		['Calyrex-Shadow is tagged ND AG, which is banned.', '蕾冠王-黑马属于被禁止的分类“ND AG”。'],
		["Pikachu's item Leftovers is banned by Item Clause.", '皮卡丘的道具“吃剩的东西”被禁止使用（规则：道具条款）。'],
		["Pikachu has 756 total EVs, which is more than this format's limit of 510.", '皮卡丘的努力值总和为756，超过此赛制的上限510。'],
		["Pikachu has no moves (it must have at least one to be usable).", '皮卡丘没有招式，至少需要设置一个招式。'],
		['You are limited to one of each Pokémon by Species Clause.', '根据种族条款，队伍中每种宝可梦最多只能携带一只。'],
		['(You have more than one Pikachu)', '（您的队伍中“皮卡丘”的数量超过了1。）'],
		['You may only bring up to 6 Pokémon (your team has 7).', '队伍最多允许6只宝可梦，当前有7只。'],
		['Pikachu is not a Fantasy Pokémon.', '皮卡丘不是幻想宝可梦。'],
		['Metagross-Fantasy with Metagrossite is not legal.', '巨金怪-幻想携带“巨金怪进化石”的配置不合法。'],
		['Reason: Its Mega Evolution (Metagross-Mega-Fantasy) is banned in this tier.', '原因：其Mega进化形态（巨金怪-超级进化-幻想）在此分级中被禁止使用。'],
		['Reason: Its Mega Evolution (Urshifu-G-Mega-Fantasy) is banned in this tier.', '原因：其超巨进化形态（武道熊师-爆击流-超巨进化-幻想）在此分级中被禁止使用。'],
		['Your team has 120 points, exceeding the 100-point limit.', '队伍总积分为120，超过了100分的上限。'],
		['Breakdown: Metagross-Fantasy(OU) -> Metagross-Mega-Fantasy((Uber)) = 40, Pikachu-Fantasy(LC)=0 [+20 budget]',
			'积分明细：巨金怪-幻想(OU) → 巨金怪-超级进化-幻想((Uber)) = 40、皮卡丘-幻想(LC)=0 [积分上限+20]'],
		['Urshifu-G-Mega-Fantasy transforms in-battle with Ren Zhen Ou Da, please fix its moves.', '武道熊师-爆击流-超巨进化-幻想需要招式“认真殴打”才能在战斗中变为该形态，请修改配置。'],
	]) {
		it(`translates a separate reason node: ${reason}`, () => {
			const ui = client(`${heading}\n- ${reason}`, 'zh', true);
			assert.equal(ui.paragraph.childNodes[0].nodeValue, chineseHeading);
			assert.equal(ui.paragraph.childNodes[1].nodeValue, `- ${expected}`);
		});
	}
	it('handles long messages without dropping unknown reasons or changing their text', () => {
		const warning = "Pikachu has exactly 0 EVs - did you forget to EV it? (If this was intentional, add exactly 1 to one of your EVs, which won't change its stats but will tell us that it wasn't a mistake).";
		const unknown = 'Metagross-Mega-Fantasy violates a new server rule: keep this full detail.';
		const ui = client(`${heading}\n\n- ${warning}\n- ${unknown}`);
		assert(ui.paragraph.textContent.includes('皮卡丘的努力值总和为0，是否忘记分配？'));
		assert(ui.paragraph.textContent.endsWith(`\n- ${unknown}`));
	});
	it('translates dynamically added popups and is unchanged on a repeated observer pass', () => {
		const ui = client(heading);
		const popup = element('DIV', 'ps-popup', ui.body);
		const paragraph = element('P', '', popup);
		text("Your team was rejected for the following reason:\n- Pikachu can't learn Breaking Swipe.", paragraph);
		ui.notify([{ addedNodes: [popup] }]);
		const expected = `${chineseHeading}\n- 皮卡丘无法学习“广域破坏”。`;
		assert.equal(paragraph.textContent, expected);
		ui.notify([{ addedNodes: [popup] }]);
		assert.equal(paragraph.textContent, expected);
	});
	it('honors English mode', () => {
		const message = `${heading}\n- Metagross-Mega-Fantasy can't learn Breaking Swipe.`;
		assert.equal(client(message, 'en').paragraph.textContent, message);
	});
});
