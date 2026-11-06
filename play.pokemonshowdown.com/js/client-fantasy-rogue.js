(function () {
	'use strict';
	var escape = BattleLog.escapeHTML;
	var globals = this;
	function regionalPreviewHTML(preview) {
		if (!preview) return '';
		var names = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
		var moves = function (ids) { return (ids || []).map(function (id) {
			return escape(localName(Dex.moves.get(id).name, 'move'));
		}).join('、') || '无'; };
		return '<div class="rogue-event-preview"><strong>' + escape(localName(preview.before)) + ' → ' + escape(localName(preview.after)) + '</strong>' +
			'<div class="rogue-event-form-sprite" style="' + Dex.getTeambuilderSprite({species: preview.after}) + '"></div>' +
			'<p>属性：' + preview.types.map(function (type) { return escape(localName(type)); }).join(' / ') +
			' · 特性：' + escape(localName(preview.ability)) + '</p><p>' +
			Object.keys(names).map(function (stat) { return names[stat] + ' ' + Number(preview.stats[stat]); }).join(' / ') + '</p>' +
			'<p>变化后 HP：' + Number(preview.hp) + ' / ' + Number(preview.maxhp) + '，不会复活濒死伙伴。</p><p>移除不合法招式：' +
			moves(preview.removed) + '</p><p>新增当前等级招式：' + moves(preview.added) + '</p><p>转换后携带招式：' +
			moves(preview.equipped) + '</p></div>';
	}
	var companionPortraits = {guzma: 'guzma-expressions', iris: 'iris-champion'};
	var dialogueSheets = ['mela', 'atticus', 'ortega', 'eri', 'kieran', 'penny', 'carmine', 'n', 'lillie', 'korrina', 'nemona', 'blue', 'gladion', 'bede', 'silver', 'brock', 'maxie', 'marnie', 'kahili', 'liko', 'jenny', 'sabrina', 'flannery', 'roxie', 'viola', 'nessa', 'larry', 'lorelei', 'lance', 'lacey', 'steven',
		'giovanni', 'archer', 'archie', 'cyrus', 'ghetsis', 'piers', 'charm', 'clover', 'coin', 'giacomo', 'rocket', 'magma', 'aqua', 'galactic', 'plasma', 'flare', 'skull', 'yell', 'teamstar',
		'jasmine', 'winona', 'gardenia', 'candice', 'clair', 'clay', 'nanu', 'valerie', 'leon', 'cynthia', 'diantha', 'ash', 'lusamine', 'ingo', 'emmet', 'palmer', 'riley'];
	var dialogueCompanions = ['bea', 'acerola', 'iono', 'rika', 'guzma', 'lysandre', 'iris', 'poppy', 'lana', 'olivia', 'grusha', 'canari', 'sada', 'turo'];
	var singlePortraits = {mewtwo: 'sprites/rogue-dialogue/mewtwo-official.png', hexmaniac: Dex.resolveAvatar('hexmaniac-gen6'),
		cheerleader: Dex.resolveAvatar('backersf'), snowboarder: Dex.resolveAvatar('skier')};
	var portraitVersions = {
		aqua: '20261101-fangame', archie: '20261101-fangame',
		ingo: '20261030-reference-v2', emmet: '20261030-reference-v2', palmer: '20261030-reference-v2', riley: '20261030-reference-v2',
		lusamine: '20261026-expressions',
		leon: '20261024', cynthia: '20261024', diantha: '20261024', ash: '20261024-cutout',
		jasmine: '20261023', winona: '20261023', gardenia: '20261023', candice: '20261023',
		clair: '20261023', clay: '20261023', nanu: '20261023', valerie: '20261023',
		giacomo: '20261020-reference-v2', mela: '20261020-reference-v2', atticus: '20261020-reference-v2', ortega: '20261020-reference-v2', eri: '20261020-reference-v2',
		kieran: '20261020-new', penny: '20261020-new', carmine: '20261020-new',
		lacey: '20261019b', kahili: '20261019-blue', viola: '20261019-curls',
		marnie: '20261020-rivals-v2', lana: '20261020-rivals-v2', lillie: '20261020-rivals-v2',
		korrina: '20261020-rivals-v2', nemona: '20261020-rivals-v2', blue: '20261020-rivals-v2',
		gladion: '20261020-rivals-v2', bede: '20261020-rivals-v2', n: '20261020-rivals-v2', silver: '20261020-rivals-v2',
	};
	// Align the generated cells without repainting pixels or shifting the dialogue container.
	var portraitPositions = {
		lillie: [2.20, 100], korrina: [4.12, 97.75], blue: [12.46, 100],
		gladion: [4.17, 100], n: [-0.96, 94.87], silver: [3.72, 100],
	};
	function updateUniversalFields(panel, mon, data, locked) {
		if (!data) {
			panel.universalDraft = null;
			panel.$('button[name=applyUniversal]').prop('disabled', true);
			return;
		}
		var bonus = {hp: data.hp}, used = 0, valid = true, finals = {}, self = panel;
		['atk', 'def', 'spa', 'spd', 'spe'].forEach(function (stat) {
			var value = Number(self.$('input[name=universal-' + stat + ']').val());
			bonus[stat] = value; used += value;
			if (!Number.isInteger(value) || value < 0 || value > data.cap) valid = false;
			finals[stat] = data.baseStats[stat] + value;
			self.$('.rogue-universal-final-' + stat).text(finals[stat]);
		});
		var highest = Math.max.apply(Math, Object.keys(finals).map(function (stat) { return finals[stat]; }));
		var choices = Object.keys(finals).filter(function (stat) { return finals[stat] === highest; });
		var aura = panel.$('select[name=universalAura]').val();
		if (data.kind === 'z') {
			Object.keys(finals).forEach(function (stat) { self.$('select[name=universalAura] option[value=' + stat + ']').prop('disabled', choices.indexOf(stat) < 0); });
			if (choices.length === 1) { aura = choices[0]; panel.$('select[name=universalAura]').val(aura); }
			if (choices.indexOf(aura) < 0) valid = false;
		}
		panel.universalDraft = {key: mon.id + ':' + data.id, bonus: bonus, aura: aura};
		panel.$('.rogue-universal-remaining').text('剩余可分配：' + (data.points - used) + ' 点');
		panel.$('button[name=applyUniversal]').prop('disabled', !valid || used !== data.points || !data.eligible || locked);
	}
	function universalConfigHTML(mon, locked, selection, draft) {
		var options = mon.universalOptions || [];
		if (!options.length) return '';
		var data = options.find(function (item) { return item.id === selection; }) || options[0];
		var key = mon.id + ':' + data.id;
		var bonus = draft && draft.key === key ? draft.bonus :
			data.configuration ? data.configuration.bonus : {};
		var aura = draft && draft.key === key ? draft.aura : data.configuration && data.configuration.aura;
		var used = 0, valid = true, finals = {}, html = '<details class="rogue-universal-config" open><summary>万用进化道具 · 种族点分配</summary><label>配置道具 <select name="universalItem">';
		options.forEach(function (item) { html += '<option value="' + escape(item.id) + '"' + (item.id === data.id ? ' selected' : '') + '>' + escape(item.name) + '</option>'; });
		html += '</select></label><p>仅存活伙伴可使用；需解锁对应系统，超级石和霸主 Z 需要最终形态，霸主 Z 还需匹配当前属性。</p><p>非 HP 共 ' + data.points + ' 点，每项 0～' + data.cap + '；HP 种族值固定 +' + data.hp + '。模型与主特性保持，发动时重新触发特性；占正常名额及携带位。</p>' +
			'<table class="rogue-stats rogue-universal-allocation"><thead><tr><th>能力</th><th>原种族值</th><th>新增点数</th><th>发动后</th></tr></thead><tbody>';
		['atk', 'def', 'spa', 'spd', 'spe'].forEach(function (stat) {
			var value = bonus[stat] || 0; used += value; finals[stat] = data.baseStats[stat] + value;
			if (!Number.isInteger(value) || value < 0 || value > data.cap) valid = false;
			html += '<tr><th>' + statNames[stat] + '</th><td>' + data.baseStats[stat] + '</td><td><input type="number" class="textbox" name="universal-' + stat + '" aria-label="万用道具新增' + statNames[stat] + '种族值" min="0" max="' + data.cap + '" step="1" value="' + value + '"' + (locked ? ' disabled' : '') + ' /></td><td class="rogue-universal-final-' + stat + '">' + finals[stat] + '</td></tr>';
		});
		html += '</tbody></table>';
		if (data.kind === 'z') {
			var highest = Math.max.apply(Math, Object.keys(finals).map(function (stat) { return finals[stat]; }));
			var choices = Object.keys(finals).filter(function (stat) { return finals[stat] === highest; });
			if (choices.length === 1) aura = choices[0];
			html += '<label>最高项气场 <select name="universalAura"><option value="">并列时请选择</option>';
			Object.keys(finals).forEach(function (stat) { html += '<option value="' + stat + '"' + (stat === aura ? ' selected' : '') + (choices.indexOf(stat) < 0 ? ' disabled' : '') + '>' + statNames[stat] + '</option>'; });
			html += '</select></label>';
			valid = valid && choices.indexOf(aura) >= 0;
		}
		return html + '<p class="rogue-universal-remaining" aria-live="polite">剩余可分配：' + (data.points - used) + ' 点</p>' + button('applyUniversal', '', '确认分配并携带', locked || !data.eligible || !valid || used !== data.points) + '</details>';
	}
	function fantasyConversionText(species, option) {
		var text = '消耗 100 幻想碎片，将【' + localName(species) + '】转换为【' + localName(option.species) + '】。';
		(option.replacements || []).forEach(function (pair) { text += ' 专属招式【' + localName(dex().moves.get(pair.from).name, 'move') + '】替换为【' + localName(dex().moves.get(pair.to).name, 'move') + '】，保留已消耗 PP。'; });
		if ((option.removed || []).length) text += ' 已掌握但新形态不能保留的招式将移除：' + option.removed.map(function (id) { return '【' + localName(dex().moves.get(id).name, 'move') + '】'; }).join('、') + '。';
		if ((option.lostMoves || []).length) text += ' 该分支不再可学的原形态招式：' + option.lostMoves.map(function (id) { return '【' + localName(dex().moves.get(id).name, 'move') + '】'; }).join('、') + '。';
		return text;
	}
	function portraitFile(id) {
		var version = portraitVersions[id] ? '?v=' + portraitVersions[id] : '';
		if (dialogueCompanions.indexOf(id) >= 0) return 'sprites/rogue-companions/' + (companionPortraits[id] || id) + '.png' + version;
		if (dialogueSheets.indexOf(id) >= 0) return 'sprites/rogue-dialogue/' + id + '.png' + version;
		return '';
	}
	function portraitStyle(id) {
		var position = portraitPositions[id];
		return 'background-image:url(' + portraitFile(id) + ');' + (position ?
			'--rogue-portrait-normal-x:' + position[0] + '%;--rogue-portrait-approval-x:' + position[1] + '%;' : '');
	}
	function recommendedLabel(run, id) {
		var names = (run.companions || []).concat(run.socialCompanions || []).filter(function (c) { return c.recommended === id; }).map(function (c) { return c.name; });
		return names.length ? '（' + names.join('、') + '推荐）' : '';
	}
	function beginnerGuideHTML(sections) {
		return (sections || []).map(function (section) {
			return (section.chapter ? '<h2 class="rogue-guide-chapter">' + escape(section.chapter) + '</h2>' : '') + '<section><h3>' + escape(section.title) + '</h3><p>' + guideText(section.text) + '</p></section>';
		}).join('');
	}
	function guideText(text) {
		return String(text || '').split(/(\*\*[^*]+\*\*)/g).map(function (part) {
			return /^\*\*[^*]+\*\*$/.test(part) ? '<strong>' + blessingText(part.slice(2, -2)) + '</strong>' : blessingText(part);
		}).join('');
	}
	function croppedMewtwo(className) {
		return '<span role="img" aria-label="超梦上半身立绘" class="rogue-mewtwo-bust ' + className +
			'" style="background-image:url(' + singlePortraits.mewtwo + ')"></span>';
	}
	function resourceMeter(name, value, maximum, detail, unit) {
		value = Math.max(0, Number(value) || 0); maximum = Math.max(1, maximum);
		unit = escape(unit || '');
		return '<div class="rogue-resource"><strong>' + escape(name) + '</strong><progress value="' + Math.min(value, maximum) +
			'" max="' + maximum + '" aria-label="' + escape(name) + '"></progress><b>' + Number(value.toFixed(2)) + unit + ' / ' + maximum + unit +
			'</b>' + (detail ? '<small>' + escape(detail) + '</small>' : '') + '</div>';
	}
	function memberResources(run, mon) {
		var owned = run.blessings && run.blessings.owned || [], html = '';
		if (owned.some(function (b) { return b.family === 'insight'; })) {
			var insight = mon.insight || {points: 0, gain: 1};
			html += resourceMeter('生死领悟', insight.points, 100, '下次倒下获得 ' + insight.gain + ' 点');
		}
		if (owned.some(function (b) { return b.family === 'spiral' && b.target === mon.id; })) {
			html += resourceMeter('螺旋力', mon.spiral, 1000, '物攻 +' + Number(((mon.spiral || 0) / 10).toFixed(2)) + '% · 250 点解锁每场首次致命伤保留 1 HP');
		}
		if (mon.bond !== undefined) {
			var bondGain = owned.some(function (b) { return b.family === 'bond'; }) ? 10 : 3;
			html += resourceMeter('亲密度', mon.set.happiness || 0, 255, '满亲密度后开始积累友好度');
			html += resourceMeter('友好度', mon.bond, 100, (mon.bond || 0) >= 100 ? '战斗经验 +20%；每次致命攻击 25% 概率保命；回合末 20% 概率解除异常；对手命中率 −10 个百分点；要害概率翻倍，伤害浮动取最高值' :
				'满亲密度后存活同行每层至少 +' + bondGain + ' · 距目标还需至多 ' + Math.ceil((100 - (mon.bond || 0)) / bondGain) + ' 层');
		}
		if (mon.robeInfo) html += '<p class="rogue-robe-info"><strong>' + escape(mon.robeInfo.name) + ' · 双防耐久 ×' +
			mon.robeInfo.durability.toFixed(2) + '</strong>（随当前 HP 实时变化，上限 ×6）</p>';
		if (owned.some(function (b) { return b.family === 'weighttraining'; })) {
			var evs = Object.keys(mon.set.evs || {}).reduce(function (sum, stat) { return sum + mon.set.evs[stat]; }, 0);
			var remainingEffort = Math.max(0, 510 - evs), trainingClaimed = run.blessings.weightTraining && run.blessings.weightTraining.claimed;
			html += resourceMeter('负重训练 · 努力值', evs, 510, trainingClaimed ? '幻之力量镜已领取（每局一次）' : '还差 ' + remainingEffort + ' 点，获得幻之力量镜（每局一次）');
			var powerStat = {powerweight: 'hp', powerbracer: 'atk', powerbelt: 'def', powerlens: 'spa', powerband: 'spd', poweranklet: 'spe'}[idOf(mon.set.item)];
			if (powerStat) {
				var expectedEffort = Math.max(0, Math.min(8, remainingEffort, 252 - (mon.set.evs && mon.set.evs[powerStat] || 0)));
				html += '<p class="rogue-caption"><strong>力量道具训练中：对战速度减半。</strong>击倒结算时基础额外增加 ' + statNames[powerStat] + ' 努力值 8 点；当前上限下最多增加 ' + expectedEffort + ' 点（同行加成另算）。' +
					(expectedEffort ? '挑战首领前可更换携带道具。' : '当前项目或总努力值已满，可更换携带道具。') + '</p>';
			} else if (remainingEffort) html += '<p class="rogue-caption">装备力量道具后，击倒结算时基础额外获得对应努力值 8 点，受单项 252、总和 510 上限限制。</p>';
		}
		if (mon.campTraining) html += '<p><strong>训练营：</strong>' + Object.keys(mon.campTraining).map(function (stat) { return statNames[stat] + ' +' + mon.campTraining[stat] / 100 + '%'; }).join('、') + '</p>';
		var evolution = mon.evolutionProgress || {}, species = idOf(mon.set.species);
		var trainingMove = {primeape: 'ragefist', stantler: 'psyshieldbash', qwilfishhisui: 'barbbarrage'}[species];
		if (trainingMove) html += resourceMeter(localName(dex().moves.get(trainingMove).name, 'move') + '修行', (evolution.moves || {})[trainingMove], 20, '真实使用次数；招式风格不限');
		if (species === 'farfetchdgalar') html += resourceMeter('单场要害纪录', evolution.criticals, 3, '同一场战斗内的最高纪录');
		if (species === 'basculinwhitestriped') html += resourceMeter('反伤修行', evolution.recoil, 294, '倒下后重新累计');
		if (['pawmo', 'bramblin', 'rellor'].indexOf(species) >= 0) html += resourceMeter('随队同行', evolution.followed, 15, '前进到新楼层时累计');
		return html ? '<div class="rogue-resource-panel">' + html + '</div>' : '';
	}
	function equippedSoundCount(run) {
		return run.team.filter(function (m) { return !m.egg; }).reduce(function (n, m) {
			return n + m.set.moves.filter(function (id) { var move = dex().moves.get(id); return move.flags && move.flags.sound; }).length;
		}, 0);
	}

	// Update existing nodes in place: replacing the whole room briefly collapses its
	// scroll range, drops focus and restarts every CSS animation on each response.
	function stableHTML(room, html) {
		var root = room.$el && room.$el[0];
		var pageKey = room.id === 'fantasyrogue' ? leftPageKey(room) : null;
		var pageChanged = pageKey && pageKey !== room.lastLeftPage;
		if (pageKey) room.lastLeftPage = pageKey;
		function resetPageScroll() {
			room.$el.scrollTop(0);
			// In-game screens scroll inside the fixed abandon footer, not on the room itself.
			var content = root && root.querySelector && root.querySelector('.rogue-game-content');
			if (content) content.scrollTop = 0;
		}
		if (!root || !root.ownerDocument) {
			room.$el.html(html); if (pageChanged) resetPageScroll(); return;
		}
		bindReferenceHelp(root);
		var doc = root.ownerDocument, template = doc.createElement('template');
		template.innerHTML = html;
		var scroll = root.scrollTop, left = root.scrollLeft;
		root.setAttribute('aria-busy', room.pending ? 'true' : 'false');
		function key(node) {
			if (node.nodeType !== 1) return '';
			return node.getAttribute('data-rogue-key') || node.id ||
				(node.getAttribute('name') ? node.tagName + ':' + node.getAttribute('name') + ':' + (node.getAttribute('value') || '') :
					node.tagName + ':' + (node.getAttribute('class') || '').split(' ')[0]);
		}
		function compatible(a, b) { return a.nodeType === b.nodeType && a.nodeName === b.nodeName && key(a) === key(b); }
		function patch(parent, next) {
			var cursor = parent.firstChild;
			Array.prototype.slice.call(next.childNodes).forEach(function (fresh) {
				var old = cursor;
				if (!old || !compatible(old, fresh)) {
					old = null;
					for (var candidate = cursor && cursor.nextSibling; candidate; candidate = candidate.nextSibling) {
						if (compatible(candidate, fresh)) { old = candidate; break; }
					}
					if (old) parent.insertBefore(old, cursor);
					else { old = fresh.cloneNode(true); parent.insertBefore(old, cursor); }
				}
				if (old.nodeType === 3) {
					if (old.nodeValue !== fresh.nodeValue) old.nodeValue = fresh.nodeValue;
				} else if (old.nodeType === 1) {
					var focused = doc.activeElement === old, opened = old.tagName === 'DETAILS' && old.open;
					Array.prototype.slice.call(old.attributes).forEach(function (attr) {
						if (!fresh.hasAttribute(attr.name) && !(attr.name === 'open' && opened)) old.removeAttribute(attr.name);
					});
					Array.prototype.slice.call(fresh.attributes).forEach(function (attr) {
						if (attr.name === 'data-stat-view' && old.hasAttribute(attr.name)) return;
						if (old.getAttribute(attr.name) !== attr.value) old.setAttribute(attr.name, attr.value);
					});
					patch(old, fresh);
					if (old.tagName === 'INPUT') {
						old.checked = fresh.checked;
						if (!focused) old.value = fresh.value;
					}
					if (old.tagName === 'SELECT' && !focused) old.value = fresh.value;
					if (old.tagName === 'TEXTAREA' && !focused) old.value = fresh.value;
				}
				cursor = old.nextSibling;
			});
			while (cursor) { var remove = cursor; cursor = cursor.nextSibling; parent.removeChild(remove); }
		}
		// Keep enough scroll range even when the next screen contains less copy.
		var first = template.content.firstElementChild;
		if (first && scroll > 0 && !pageChanged && room.preserveScrollRange !== false) {
			first.style.minHeight = (scroll + root.clientHeight) + 'px';
		}
		patch(root, template.content);
		root.scrollTop = pageChanged ? 0 : scroll; root.scrollLeft = left;
		if (pageChanged) resetPageScroll();
	}
	function leftPageKey(room) {
		var state = room.state || {}, run = state.run || {}, story = state.story || run.story || {};
		var blessings = run.blessings || {}, round = blessings.round || {}, reward = (blessings.pending || [])[0] || {};
		var event = run.event || {}, dialogue = event.dialogue || {};
		return JSON.stringify([room.screen, room.codexPage, room.codexFilter, room.codexReplay && room.codexReplay.id,
			run.id, run.floor, run.phase, run.encounter, event.key, event.stage, event.page, event.step,
			dialogue.key, dialogue.index, event.options && event.options.map(function (option) { return option.id; }),
			story.stage, story.index, story.key, round.id, round.remaining, reward.id, blessings.stage && blessings.stage.kind,
			room.starterIndex, room.starterStage]);
	}
	var referenceCache, moveCategoryHelp = {}, referenceItems = [], blessingSupplyHelp = [];
	var referenceGroups = {move: 'moves', ability: 'abilities', item: 'items', species: 'species'};
	function categoryReference(name) {
		var id = Object.keys(moveCategoryHelp).find(function (key) { return moveCategoryHelp[key].aliases.indexOf(name) >= 0; });
		return id ? {kind: 'category', id: id} : null;
	}
	function blessingReferences() {
		var tables = [globals.BattleMovedex, globals.Gen9fantasyMovedex, globals.BattleAbilities, globals.Gen9fantasyAbilities,
			globals.BattleItems, globals.Gen9fantasyItems, globals.BattlePokedex, globals.Gen9fantasydex, referenceItems, blessingSupplyHelp];
		if (referenceCache && tables.every(function (table, i) { return table === referenceCache.tables[i]; })) return referenceCache;
		var names = Object.create(null);
		function register(name, kind, id) {
			name = String(name || '').replace(/[+🔄]+$/u, '');
			if (name) names[name] = {kind: kind, id: id};
		}
		tables.slice(0, 8).forEach(function (table, i) {
			Object.keys(table || {}).forEach(function (id) {
				var kind = ['move', 'ability', 'item', 'species'][Math.floor(i / 2)], entry = dex()[referenceGroups[kind]].get(id);
				if (!entry || entry.exists === false) return;
				[entry.name, localName(entry.name, kind)].forEach(function (name) {
					register(name, kind, id);
				});
			});
		});
		referenceItems.concat(blessingSupplyHelp).forEach(function (item) {
			register(item.name, 'item', item.id); register(localName(item.name, 'item'), 'item', item.id);
		});
		names['大法师'] = {kind: 'ability', id: 'roguegreatmage'};
		names['无极汰那・无极形态'] = {kind: 'species', id: 'eternatuseternamax'};
		return referenceCache = {tables: tables, names: names};
	}
	function referenceData(kind, id) {
		if (kind === 'category') {
			var category = moveCategoryHelp[id];
			var moves = category ? category.moves.map(function (move) { return localName(dex().moves.get(move).name || move, 'move'); }) : [];
			moves.sort(function (a, b) { return a.localeCompare(b, 'zh-CN'); });
			return {kind: kind, id: id, name: category ? category.name : id, moves: moves, text: moves.join(' · ') || '暂无招式'};
		}
		var entry = dex()[referenceGroups[kind]].get(id);
		if (kind === 'species') {
			var types = (entry.types || []).map(function (type) { return localName(type); });
			var stats = Object.keys(entry.baseStats || {}).map(function (stat) { return {name: statNames[stat], value: entry.baseStats[stat]}; });
			var abilities = Object.keys(entry.abilities || {}).map(function (slot) {
				var ability = dex().abilities.get(entry.abilities[slot]), info = referenceData('ability', ability.id || idOf(entry.abilities[slot]));
				return {name: info.name + (slot === 'H' ? '（隐藏特性）' : ''), text: info.text};
			});
			return {kind: kind, id: id, name: localName(entry.name || id, 'species'), types: entry.types || [], stats: stats, abilities: abilities,
				text: '属性：' + types.join('／') + '。种族值：' + stats.map(function (stat) { return stat.name + ' ' + stat.value; }).join(' · ') +
					'。特性：' + abilities.map(function (ability) { return ability.name + '：' + ability.text; }).join('；')};
		}
		if (kind === 'item') {
			var item = referenceItems.concat(blessingSupplyHelp).find(function (value) { return value.id === id; });
			if (item && (item.description || item.kind !== 'held')) return {kind: kind, id: id, item: item,
				name: localName(item.name, 'item'), text: localName(item.description || itemDescription(item))};
		}
		var description = localName(entry.desc || ''), summary = localName(entry.shortDesc || '');
		// Updated upstream long descriptions may not have a translation yet; retain the Chinese summary.
		if (!/[\u3400-\u9fff]/.test(description) && /[\u3400-\u9fff]/.test(summary)) description = summary;
		return {kind: kind, id: id, name: localName(entry.name || id, kind),
			text: id === 'roguegreatmage' ? '特攻变为原来的 2 倍。' : description || summary || '暂无介绍'};
	}
	function blessingText(text) {
		var refs = blessingReferences();
		function linkTerm(name) {
			var ref = categoryReference(name) || refs.names[name.replace(/[+🔄]+$/u, '')];
			if (!ref) return escape(name);
			if (ref.kind !== 'category') name = localName(name, ref.kind);
			var info = referenceData(ref.kind, ref.id);
			return '<span class="rogue-reference" role="button" tabindex="0" data-reference-kind="' + ref.kind +
				'" data-reference-id="' + escape(ref.id) + '" aria-label="查看' + escape(name) + '介绍" title="' +
				escape(info.text) + '">' + escape(name) + '</span>';
		}
		var aliases = Object.keys(moveCategoryHelp).reduce(function (all, id) { return all.concat(moveCategoryHelp[id].aliases); }, [])
			.sort(function (a, b) { return b.length - a.length; });
		var normalized = String(text || '').replace(/【经验糖果 ([XSML／/]+)】/g, function (all, grades) {
			return grades.split(/[／/]/).map(function (grade) { return '【经验糖果 ' + grade + '】'; }).join('／');
		}).split(/(【[^】]+】)/g).map(function (part) {
			return !aliases.length || part.charAt(0) === '【' ? part : part.replace(new RegExp(aliases.join('|'), 'g'), function (name) { return '【' + name + '】'; });
		}).join('');
		return normalized.split(/(【[^】]+】)/g).map(function (part) {
			if (!/^【[^】]+】$/.test(part)) return escape(part).replace(/\n/g, '<br />');
			var full = part.slice(1, -1);
			var names = categoryReference(full) || refs.names[full] ? linkTerm(full) : full.split(/([／/、])/).map(function (name) {
				return /^[／/、]$/.test(name) ? escape(name) : linkTerm(refs.names[name] ? name : localName(name));
			}).join('');
			return '<strong class="rogue-term">【' + names + '】</strong>';
		}).join('');
	}
	function bindReferenceHelp(root) {
		if (!root || root.rogueReferenceBound) return;
		root.rogueReferenceBound = true;
		root.addEventListener('click', function (event) {
			var toggle = event.target.closest && event.target.closest('[data-stat-mode]');
			if (toggle) {
				var stats = toggle.closest('.rogue-clear-stats');
				stats.dataset.statView = toggle.dataset.statMode;
				return;
			}
			var tile = event.target.closest && event.target.closest('[data-clear-member]');
			if (!tile) return;
			var card = tile.closest('.rogue-clear-card');
			if (!card) return;
			var member = Array.from(card.querySelectorAll('.rogue-clear-details')).find(function (entry) { return entry.dataset.member === tile.dataset.clearMember; });
			if (!member) return;
			card.querySelector('.rogue-clear-archive').open = true; member.open = true;
			member.scrollIntoView({block: 'nearest'});
			member.querySelector('summary').focus({preventScroll: true});
		});
		var tooltip;
		function hide(event) {
			if (tooltip && event && event.relatedTarget && tooltip.contains(event.relatedTarget)) return;
			if (tooltip) tooltip.remove(); tooltip = null;
		}
		function reference(event) { return event.target.closest && event.target.closest('.rogue-reference'); }
		function show(event) {
			var term = reference(event); if (!term) return;
			hide(); tooltip = root.ownerDocument.createElement('div'); tooltip.className = 'rogue-reference-tooltip';
			if (term.dataset.referenceKind === 'category') {
				tooltip.className += ' rogue-category-tooltip';
				tooltip.addEventListener('mouseleave', hide);
			}
			tooltip.setAttribute('role', 'tooltip'); tooltip.textContent = term.title;
			root.ownerDocument.body.appendChild(tooltip);
			var rect = term.getBoundingClientRect(), win = root.ownerDocument.defaultView;
			tooltip.style.left = Math.max(8, Math.min(rect.left, win.innerWidth - tooltip.offsetWidth - 8)) + 'px';
			tooltip.style.top = Math.max(8, Math.min(rect.bottom + 6, win.innerHeight - tooltip.offsetHeight - 8)) + 'px';
		}
		function open(event) {
			var term = reference(event); if (!term) return;
			if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault(); event.stopImmediatePropagation(); hide();
			app.addPopup(globals.RogueReferencePopup, referenceData(term.dataset.referenceKind, term.dataset.referenceId));
		}
		root.addEventListener('click', open, true); root.addEventListener('keydown', open, true);
		root.addEventListener('mouseover', show); root.addEventListener('focusin', show);
		root.addEventListener('mouseout', hide); root.addEventListener('focusout', hide); root.addEventListener('scroll', hide);
	}
	var adjustmentNameCache;
	function adjustedRogueName(value) {
		var tables = [globals.Gen9fantasyMovedex, globals.Gen9fantasyAbilities];
		if (!tables[0] || !tables[1] || !globals.translateRogueName) return value;
		if (!adjustmentNameCache || adjustmentNameCache.tables[0] !== tables[0] || adjustmentNameCache.tables[1] !== tables[1]) {
			var names = {};
			tables.forEach(function (table, index) { Object.keys(table).forEach(function (id) {
				var entry = dex()[index ? 'abilities' : 'moves'].get(id), plain = entry.name.replace(/[+🔄]+$/u, '');
				var chinese = globals.translateRogueName(plain, index ? 'ability' : 'move');
				names[plain] = entry.name; names[chinese] = chinese + entry.name.slice(plain.length);
			}); });
			adjustmentNameCache = {tables: tables, names: names};
		}
		return adjustmentNameCache.names[String(value).replace(/[+🔄]+$/u, '')] || value;
	}
	function localName(name, kind) {
		if (/^egg$/i.test(name)) return '宝可梦蛋';
		// Rogue consumables are not all in the battle item Dex. Keep sizes out of form-name translation.
		var candy = String(name || '').match(/^(?:expcandy|exp\.?\s*candy[\s-]*|经验糖果[\s-]*)(xs|xl|s|m|l)(?=$|[（(\s])/i);
		if (candy) return '经验糖果 ' + candy[1].toUpperCase() + String(name).slice(candy[0].length);
		name = adjustedRogueName(name);
		var statuses = {par: '麻痹', brn: '烧伤', psn: '中毒', tox: '剧毒', slp: '睡眠', frz: '冰冻', fst: '冻伤', frostbite: '冻伤'};
		if (statuses[name]) return statuses[name];
		if (/薄荷$/.test(name)) return localName(name.slice(0, -2)).split(/[（(]/)[0].trim() + '薄荷';
		if (/^招式学习机：/.test(name)) return '招式学习机：' + localName(name.slice(6), 'move');
		if (name === 'Rogue Great Mage') return '大法师';
		if (name === 'Rogue Item Module') return '道具增幅';
		if (/^[a-z0-9]+$/.test(name) && typeof Dex !== 'undefined') {
			var data = dex(), groups = kind ? [({move: 'moves', ability: 'abilities', item: 'items', pokemon: 'species'})[kind] || kind] : ['items', 'abilities', 'species', 'moves'];
			for (var i = 0; i < groups.length; i++) {
				var entry = data[groups[i]] && data[groups[i]].get(name);
				if (entry && entry.exists) { name = entry.name; if (groups[i] === 'moves') kind = 'move'; break; }
			}
		}
		if (globals.translateRogueName) return globals.translateRogueName(name, kind);
		var moveNames = {Disable: '定身法', Refresh: '焕然一新', Psychic: '精神强念', Metronome: '挥指'};
		if (kind === 'move' && moveNames[name]) return moveNames[name];
		return globals.translations && globals.translations[name] || name;
	}
	function rogueItemName(id) {
		var item = referenceItems.concat(blessingSupplyHelp).find(function (entry) { return entry.id === id; });
		return localName(item && item.name || dex().items.get(id).name || id, 'item');
	}
	function auctionBoardHTML(auction) {
		if (!auction) return '';
		var wallets = auction.wallets || [];
		return '<section class="rogue-auction-board"><h4>本场拍品</h4><p>' + dialogueText(auction.catalog) +
			'</p><div class="rogue-auction-budgets">' + auction.npcs.map(function (npc) {
				return '<div><strong>' + escape(npc.name) + '</strong><span>剩余预算 <b>' + Number(npc.budget) + '</b> 金币</span></div>';
			}).join('') + wallets.map(function (wallet) {
				return '<div><strong>' + escape(wallet.name) + ' 钱包</strong><span>可用 <b>' + Number(wallet.budget) + '</b> 金币</span></div>';
			}).join('') + '</div>' + (wallets.length ?
				'<p>双方共同确认报价及付款人；仅得标玩家付款并获得拍品，队友的钱包不扣费。</p>' : '') + '</section>';
	}
	var statNames = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
	var typeNames = {Normal: '一般', Fire: '火', Water: '水', Grass: '草', Electric: '电', Ice: '冰', Fighting: '格斗', Poison: '毒', Ground: '地面', Flying: '飞行', Psychic: '超能力', Bug: '虫', Rock: '岩石', Ghost: '幽灵', Dragon: '龙', Dark: '恶', Steel: '钢', Fairy: '妖精'};
	function lakeQuestHTML(quest) {
		if (!quest || !quest.rounds || !quest.rounds.length) return '';
		return '<section class="rogue-lake-quest"><h4>三圣菇的求索 · 属性目标</h4><p>进入下一节点时检查当时队伍；此前暂时凑齐不算完成。双属性及属性转有效。</p><ul>' + quest.rounds.map(function (round) {
			var matched = round.matched || [], done = round.result;
			return '<li><strong>第 ' + Number(round.floor) + ' 层祝福 → 第 ' + Number(round.checkAt) + ' 层入场检查</strong>' +
				'<div class="rogue-lake-types">' + round.types.map(function (type) {
					var covered = matched.indexOf(type) >= 0;
					return '<span' + (covered ? ' class="is-covered"' : '') + '>' + (covered ? '✓ ' : '○ ') + escape(typeNames[type] || type) + '</span>';
				}).join('') + '</div><div>' + (done === 'reverted' ? '已永久回退' : done === 'kept' ? '未达标 · 保留本阶段加级' :
					'当前覆盖 ' + matched.length + ' / 3 · 等待入场检查') + '：固定首领 ' + Number(round.boss) + ' 级 · 普通遭遇 ' + Number(round.normal) + ' 级</div></li>';
		}).join('') + '</ul><p class="rogue-caption">每阶段独立结算，后续未达标不会恢复已回退的加级。</p></section>';
	}
	function typeFilter(name, selected) {
		return '<label class="rogue-type-filter">按属性筛选 <select name="' + name + '"><option value="">全部属性</option>' +
			Object.keys(typeNames).map(function (type) { return '<option value="' + type + '"' + (type === selected ? ' selected' : '') + '>' + typeNames[type] + '</option>'; }).join('') + '</select></label>';
	}
	function priorityText(priority) { return ' · 先制度' + (priority > 0 ? '+' : '') + (priority || 0); }
	function starterTraits(starter) {
		var base = {hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20};
		return Object.assign({natures: [], genders: [], abilities: [], moves: [], ivs: {min: base, max: base}}, starter.traits || {});
	}
	function natureLabel(nature) {
		var label = localName(nature.name);
		if (/[（(]/.test(label)) return label;
		return label + (nature.plus && nature.minus ? '（+' + statNames[nature.plus] + '，−' + statNames[nature.minus] + '）' : '（无修正）');
	}
	var kindNames = {wild: '野生战斗', battle: '战斗', elite: '精英', ecology: '生态区域', encounter: '遭遇', trainer: '训练家', rest: '休整',
		story: '秘闻', boss: '首领', gym: '道馆', challenge: '挑战', event: '事件', reward: '奖励', shop: '商店', trade: '交易', adventure: '奇遇', fog: '未知区域'};
	var routeNames = {wild: '战斗', trainer: '遭遇', shop: '交易'};
	function floorNodeHeading(node) {
		if (!node) return '';
		var parts = node.name.split(/\s+·\s+/);
		if (node.kind === 'story' && /^(故事|秘闻)$/.test(parts[0])) parts.shift();
		return ' · <strong class="rogue-heading-region" data-kind="' + escape(node.kind) + '">' +
			escape(routeNames[node.kind] || kindNames[node.kind] || node.kind) + '</strong> · ' + escape(parts.shift()) +
			(parts.length ? ' · <span class="rogue-floor-subtitle">' + escape(parts.join(' · ')) + '</span>' : '');
	}
	function routeTone(kind) {
		if (kind === 'story') return 'story';
		if (kind === 'challenge') return 'gold';
		if (kind === 'rest') return 'green';
		if (kind === 'adventure' || kind === 'fog') return 'rose';
		if (['event', 'reward', 'shop', 'trade'].indexOf(kind) >= 0) return 'blue';
		return 'red';
	}
	function cardSelectionMarker() {
		return '<span class="rogue-route-marker" aria-hidden="true"><svg width="18" height="25" viewBox="0 0 18 25">' +
			'<path d="M9 0 18 10 9 25 0 10Z" fill="currentColor"/><path d="M9 4 14 10 9 19 4 10Z" fill="white"/></svg></span>';
	}
	function routeEmblem(kind) {
		var icons = {wild: 'compass', battle: 'bolt', elite: 'shield', encounter: 'bolt', trainer: 'flag',
			story: 'book', boss: 'trophy', challenge: 'trophy', gym: 'university', event: 'question', reward: 'gift', shop: 'shopping-bag', trade: 'shopping-bag', rest: 'medkit', adventure: 'magic'};
		return cardSelectionMarker() +
			'<span class="rogue-route-emblem" aria-hidden="true"><i class="fa fa-' + (icons[kind] || 'compass') + '"></i></span>';
	}
	function blessingIcon(option) {
		var icons = {coin: 'adjust', dice: 'cube', friend: 'paw', catcher: 'bullseye', battletask: 'flag', eventtask: 'map-signs',
			supercombo: 'bolt', lowhp: 'heartbeat', pivot: 'exchange', swapstats: 'exchange', kid: 'child', slacker: 'moon-o',
			passdrops: 'level-down', bond: 'heart', pandorasilver: 'random', detect: 'eye', reservation: 'magic', money: 'money',
			starquest: 'star', weakness: 'shield', weaknessarmor: 'shield', unity: 'users', coverage: 'crosshairs', typexp: 'graduation-cap', overtime: 'hourglass-half', singer: 'microphone',
			dancer: 'music', ordinary: 'users', smallfinal: 'arrow-up', prayer: 'hand-peace-o', topclearmind: 'bolt',
			hazards: 'warning', toxic: 'flask', stackstatus: 'asterisk', starters: 'paw', bugchoir: 'music', pandoragold: 'random',
			survive: 'heart', seeds: 'leaf', secondchoice: 'exchange', bigmoney: 'money', learnall: 'book', style: 'trophy',
			medic: 'medkit', insight: 'sun-o', inheritmoves: 'share-alt', entrance: 'star', meltan: 'cubes', swords: 'gavel',
			execute: 'crosshairs', hpgrowth: 'heartbeat', regis: 'university', sound: 'volume-up', multihit: 'forward',
			hoopa: 'magic', typelink: 'link', typeevolution: 'diamond', psychic: 'superpowers',
			dragonking: 'trophy', companionpoppy: 'flask', companionguzma: 'bug', railgun: 'bolt', rulebreaker: 'gavel',
			wine: 'glass', cephalosporin: 'medkit', shopraid: 'shopping-bag', renewable: 'recycle',
			mousefamily: 'bolt', eeveefamily: 'paw', duck: 'question-circle', ascent: 'arrow-up', restinball: 'bed',
			lifepower: 'tint', rocketcatch: 'crosshairs', arsenal: 'exchange', capturebonus: 'money', speedpower: 'fast-forward',
			fantasysix: 'cubes', hero: 'shield', powerchoice: 'hand-rock-o', reservemega: 'diamond', reservegmega: 'expand',
			reservetera: 'diamond', reservez: 'bolt', companionbea: 'hand-rock-o', companionacerola: 'moon-o', companionlana: 'anchor', companionai: 'desktop'};
		if ((option.family || option.id).indexOf('fate') === 0) return 'diamond';
		return icons[option.family || option.id] || 'star';
	}
	var routeParticles = '';
	function routeVortex() {
		if (routeParticles) return routeParticles;
		// Four static particle fields scale outwards. Only their transform and opacity
		// animate; there is no per-frame JavaScript, canvas drawing, or rotating path.
		routeParticles = '<span class="rogue-vortex" aria-hidden="true">';
		for (var layer = 0; layer < 4; layer++) {
			routeParticles += '<svg class="rogue-particle-field" width="100%" height="100%" focusable="false" style="--particle-delay: -' + layer * 1.5 + 's">';
			for (var i = 0; i < 32; i++) {
				var edge = (i + layer * .27) / 8;
				var x = edge < 1 ? -1 + edge * 2 : edge < 2 ? 1 : edge < 3 ? 5 - edge * 2 : -1;
				var y = edge < 1 ? -1 : edge < 2 ? edge * 2 - 3 : edge < 3 ? 1 : 7 - edge * 2;
				var radius = .72 + ((i * 13 + layer * 7) % 17) / 60;
				var size = 3.6 + ((i * 7 + layer * 3) % 9) * .3;
				routeParticles += '<rect x="' + (50 + x * radius * 48).toFixed(2) + '%" y="' +
					(50 + y * radius * 48).toFixed(2) + '%" width="' + size + '" height="' + size + '" />';
			}
			routeParticles += '</svg>';
		}
		return (routeParticles += '</span>');
	}
	var itemKinds = {ability: '特性调整', ball: '精灵球', heal: '恢复道具', revive: '复活道具', cure: '状态恢复', ether: 'PP 恢复', candy: '经验糖果', rarecandy: '特殊成长道具', evolution: '进化道具', held: '携带道具', emblem: '属性转 · 独立栏位', treasure: '贵重物品', effort: '基础点数', tonic: '祝福道具', crown: '个体值训练'};
	var economyIcons = ['tinymushroom', 'balmmushroom', 'prettyfeather', 'stardust', 'starpiece', 'cometshard', 'pearl', 'bigpearl', 'pearlstring',
		'antidote', 'burnheal', 'iceheal', 'awakening', 'paralyzeheal', 'healthfeather', 'musclefeather', 'resistfeather', 'geniusfeather', 'cleverfeather', 'swiftfeather', 'leaderscrest', 'peatblock'];
	function dex() { return Dex.mod ? Dex.mod('gen9fantasy') : Dex; }
	function idOf(name) { return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
	function fa(name) { return '<i class="fa fa-' + name + '" aria-hidden="true"></i> '; }
	function itemIcon(item) {
		if (item.kind === 'terashard') return fa('diamond');
		if (item.kind === 'mint') return fa('leaf');
		if (item.kind === 'forme') return '<img class="rogue-loot-icon pixelated" src="sprites/fantasy-rogue/key-items/' + escape(item.icon) + '.png" alt="" /> ';
		if (item.kind === 'machine') {
			var type = dex().moves.get(item.move || item.id.replace(/^tm/, '')).type;
			return '<img class="rogue-loot-icon pixelated" src="sprites/fantasy-rogue/tm/' + (typeNames[type] ? type.toLowerCase() : 'normal') + '.png" alt="' + escape(typeNames[type] || '一般') + '属性招式学习机" /> ';
		}
		var id = item.icon || item.id;
		if (id === 'bottlecap' || id === 'goldbottlecap') return '<img class="rogue-loot-icon pixelated" src="sprites/fantasy-rogue/crowns/' + id + '.png" alt="' + escape(item.name) + '" /> ';
		if (/^expcandy(xs|s|m|l|xl)$/.test(id) || id === 'rarecandy') {
			return '<img class="rogue-loot-icon rogue-candy-icon pixelated" src="sprites/fantasy-rogue/candy/' + id + '.png" alt="' + escape(item.name || '') + '" /> ';
		}
		var special = {
			maxrevive: '<path d="m16 2 4 9 10 5-10 4-4 10-5-10-9-4 9-5Z" fill="#edb83c"/><path d="m16 8 3 8-3 8-3-8Z" fill="#fff4aa"/>',
			abilitycapsule: '<g transform="rotate(-35 16 16)"><rect x="5" y="9" width="22" height="14" rx="7" fill="#63b1ec"/><path d="M16 9h4a7 7 0 0 1 0 14h-4Z" fill="#f1b4cf"/><path d="M9 12h4" stroke="white" stroke-width="2"/></g>',
			abilitypatch: '<path d="m7 3 19 4-1 21-21-4Z" fill="#e7ecfb"/><path d="m9 7 13 2-1 14-13-2Z" fill="#eec24e"/><path d="m12 10 7 1-1 8-7-1Z" fill="#fff5c5"/>',
		};
		if (special[id]) return '<svg class="rogue-loot-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="#506781" stroke-width="1.2">' + special[id] + '</svg> ';
		if (economyIcons.indexOf(id) >= 0) return '<img class="rogue-loot-icon" src="sprites/fantasy-rogue/' + id + '.png" alt="" /> ';
		var frame = id === 'linkingcord' ? 'cord' :
			['potion', 'superpotion', 'hyperpotion', 'revive', 'fullheal', 'elixir', 'ether', 'blackaugurite',
				'bigmushroom', 'nugget', 'bignugget', 'hpup', 'protein', 'iron', 'calcium', 'zinc', 'carbos'].indexOf(id) >= 0 ? id : '';
		if (frame) return '<span class="rogue-item rogue-item-' + frame + '" aria-hidden="true"></span> ';
		var sprite = typeof item.spritenum === 'number' ? item : dex().items.get(id);
		return sprite.spritenum > 0 && typeof Dex.getItemIcon === 'function' ? '<span class="itemicon" aria-hidden="true" style="' +
			Dex.getItemIcon(sprite) + '"></span> ' : fa({ball: 'circle', emblem: 'diamond', evolution: 'diamond', tonic: 'flask', treasure: 'diamond', crown: 'certificate', held: 'cube'}[item.kind] || 'medkit');
	}
	function button(name, value, label, disabled, icon) {
		return '<button class="button rogue-control" name="' + name + '" value="' + escape(value || '') + '"' +
			(disabled ? ' disabled' : '') + '>' + (icon || '') + escape(label) + '</button> ';
	}
	function memberChoice(name, value, mon, disabled, caption) {
		return '<button class="button rogue-member-choice" name="' + name + '" value="' + escape(value) + '"' +
			(disabled ? ' disabled' : '') + '><span class="rogue-member-art" aria-hidden="true" style="' +
			(typeof Dex.getTeambuilderSprite === 'function' ? Dex.getTeambuilderSprite(mon.set) : '') + '"></span>' +
			'<strong>' + escape(localName(mon.set.species)) + '</strong><span>Lv.' + mon.set.level + ' · HP ' + mon.hp + '/' + mon.maxhp +
			'</span><small>' + statusBadges(mon) + '</small>' + (caption ? '<small>' + escape(caption) + '</small>' : '') + '</button>';
	}
	function statusBadges(mon) {
		var ids = mon.hp ? Object.keys(mon.statuses || {}).concat(mon.status || []).filter(function (id, index, values) {
			return id && values.indexOf(id) === index;
		}) : ['fnt'];
		if (!ids.length) return '状态正常';
		return ids.map(function (id) {
			var key = id === 'frostbite' ? 'fst' : id;
			var names = {par: '麻痹', brn: '灼伤', psn: '中毒', tox: '剧毒', slp: '睡眠', frz: '冰冻', fst: '冻伤', fnt: '已倒下'};
			return '<span class="rogue-status-badge status-' + (names[key] ? key : 'unknown') + '">' +
				'<span class="rogue-status-spark" aria-hidden="true">' + ({par: 'ϟ', brn: '♨', psn: '·', tox: '·', slp: 'z', frz: '❄', fst: '❄'}[key] || '') + '</span>' +
				escape(names[key] || localName(id)) + '</span>';
		}).join(' ');
	}
	function extraAbilityIds(mon) {
		return (mon.extraAbilities || []).map(idOf).filter(function (id, index, ids) {
			return id && id !== idOf(mon.set.ability) && ids.indexOf(id) === index;
		});
	}
	function typeIcons(types) {
		return (types || []).map(function (type) {
			return Dex.getTypeIcon ? Dex.getTypeIcon(type) : escape(localName(type));
		}).join(' ');
	}
	function memberMove(id, mon) {
		var move = dex().moves.get(id);
		if (idOf(id).indexOf('hiddenpower') !== 0 || !mon) return move;
		var ivs = mon.set.ivs || {}, bits = 0;
		['hp', 'atk', 'def', 'spe', 'spa', 'spd'].forEach(function (stat, i) {
			bits += ((ivs[stat] === undefined ? 31 : ivs[stat]) % 2) * Math.pow(2, i);
		});
		var types = ['Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark'];
		return Object.assign({}, move, {type: mon.set.hpType || (move.type !== 'Normal' ? move.type : types[Math.floor(bits * 15 / 63)])});
	}
	function moveRow(id, pp, mon) {
		var move = memberMove(id, mon);
		var maximum = move.pp;
		return '<div class="rogue-move-row"><strong class="rogue-move-name">' + escape(localName(move.name, 'move')) + '</strong>' +
			'<span class="rogue-move-icons">' + typeIcons([move.type || 'Normal']) + ' ' +
			(Dex.getCategoryIcon ? Dex.getCategoryIcon(move.category) : escape(localName(move.category || ''))) + '</span>' +
			'<span><small>威力</small>' + (move.basePower || '—') + '</span>' +
			'<span><small>命中率</small>' + (move.accuracy === true ? '—' : (move.accuracy || '—') + '%') + '</span>' +
			'<span><small>PP</small>' + (pp ? pp.pp + '/' + pp.maxpp : maximum || '—') + '</span>' +
			'<span class="rogue-move-desc">' + escape(localName(move.shortDesc || move.desc || '暂无招式简介')) + '</span></div>';
	}
	function itemDescription(item) {
		if (item.description) return item.description;
		if (item.kind === 'emblem') return '放入独立的属性转栏，不占携带道具位，可随时在战斗外取下。单属性新增属性，双属性可选择替换第一或第二属性，并开放对应五个招式；取下后撤销临时招式权限。';
		if (item.kind === 'treasure') return '仅商店兑换 · 每个 ' + item.sellPrice + ' 金币';
		if (item.kind === 'effort') return statNames[item.stat] + '基础点数 +' + item.amount + '（单项上限 252，总计 510）';
		if (item.kind === 'held' && dex().items) {
			var data = dex().items.get(item.id);
			return localName(data.shortDesc || data.desc || '');
		}
		if (item.kind === 'ball') return '战斗中投掷，占用一次行动';
		if (item.kind === 'heal') return '恢复 ' + item.amount + ' HP，不复活倒下成员';
		if (item.kind === 'revive') return '复活并恢复 ' + Math.round(item.amount * 100) + '% HP';
		if (item.kind === 'cure') return '解除存活伙伴的异常状态';
		if (item.kind === 'ether') return (item.singleMove ? '自选一个招式恢复 ' : '当前各招式恢复 ') + (item.amount >= 999 ? '全部' : item.amount) + ' PP';
		if (item.kind === 'candy') return '增加 ' + item.amount + ' 经验';
		return '在队伍面板选择符合条件的进化';
	}
	function editable(run) {
		return ['choose', 'ready', 'rest', 'reward', 'event'].indexOf(run.phase) >= 0 &&
			!(run.comeback && run.comeback.key) &&
			!(run.preview && run.preview.stage === 'result') &&
			!run.pendingCapture && !(run.pendingMoves || []).length;
	}
	function evolutionEditable(run) {
		return !!run && (editable(run) && !run.healingLocked || run.growthPaused && !(run.pendingMoves || []).length);
	}
	function canCure(item, mon) {
		return Object.keys(mon.statuses || {}).concat(mon.status || []).some(function (status) {
			return status && (!item.cureStatuses || item.cureStatuses.indexOf(status) >= 0);
		});
	}
	function loot(reward, items, inline) {
		if (!reward) return '';
		var tag = inline ? 'span' : 'div';
		var html = '<' + tag + ' class="rogue-loot">';
		if (reward.money) html += '<span' + (reward.money < 0 ? ' class="rogue-cost"' : '') + '>' + fa('money') +
			'金币 <strong>' + (reward.money > 0 ? '+' : '−') + Math.abs(reward.money) + '</strong></span>';
		Object.keys(reward.items || {}).forEach(function (id) {
			var item = items.filter(function (entry) { return entry.id === id; })[0] || {id: id, name: id};
			html += '<span>' + itemIcon(item) + escape(localName(item.name)) + ' <strong>×' + reward.items[id] + '</strong></span>';
		});
		if (reward.points) html += '<span class="rogue-growth-reward">' + fa('star') + '成长点 <strong>+' + reward.points + '</strong></span>';
		if (reward.effect) html += '<span class="rogue-growth-reward">' + fa('line-chart') + dialogueText(reward.effect) + '</span>';
		return html + '</' + tag + '>';
	}
	function wildLootSummary(entries, items) {
		var total = {};
		(entries || []).forEach(function (entry) {
			Object.keys(entry).forEach(function (id) { total[id] = (total[id] || 0) + entry[id]; });
		});
		return loot({items: total}, items, true);
	}
	function noticeText(text) {
		// Settlement text contains species/move names as separate phrases.
		var translated = text.replace(/^(.+?) (获得|升到|进化为|学会了)/, function (all, name, verb) {
			return localName(name) + ' ' + verb;
		}).replace(/(进化为|学会了) (.+?)([！。])$/, function (all, verb, name, end) {
			return verb + ' ' + localName(name, verb === '学会了' ? 'move' : '') + end;
		});
		return eventText(translated);
	}
	function eventText(text) {
		return (text || '').replace(/[A-Za-z][A-Za-z0-9'’.:%♀♂ -]*/g, function (phrase) {
			var name = phrase.trim();
			return localName(name) + phrase.slice(name.length);
		});
	}
	function dialogueText(text, spoken) {
		var copy = eventText(text || '').replace(/[⌈「]/g, '『').replace(/[⌋」]/g, '』');
		if (spoken && copy && copy.indexOf('『') < 0) copy = '『' + copy + '』';
		if (copy.indexOf('『') < 0) return escape(copy).replace(/\*\*([^*]+)\*\*|【[^】]+】|\d+(?:\.\d+)?\s*(?:金币|级|%|％)/g,
			function (word, emphasis) { return '<strong>' + (emphasis || word) + '</strong>'; });
		// Both speech and narration are escaped before any presentation markup is added.
		return escape(copy).split(/(『[^』]*』)/g).map(function (part) {
			if (part.charAt(0) === '『') return '<strong class="rogue-spoken-line">' + part.replace(/\*\*/g, '') + '</strong>';
			return part ? '<span class="rogue-narration">' + part.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') + '</span>' : '';
		}).join('');
	}
	function charmIcon() {
		return '<img class="rogue-charm-icon" src="sprites/fantasy-rogue/key-items/tempting-charm.webp" alt="替身护符" /> ';
	}
	function charmDescription(text) {
		return String(text || '').split(/\n\s*\n/).map(function (paragraph) {
			return '<p>' + dialogueText(paragraph) + '</p>';
		}).join('');
	}
	function difficultyBadge(tier, label) {
		return '<span class="rogue-difficulty-badge">' + (tier === 'easy' ? charmIcon() : '') + escape(label || '历史 0 档') + '</span>';
	}
	function clearRadar(final, baseline) {
		var axes = ['hp', 'atk', 'def', 'spe', 'spd', 'spa'];
		var scale = Math.max(100, Math.ceil(Math.max.apply(null, axes.map(function (stat) { return Math.max(final[stat] || 0, baseline && baseline[stat] || 0); })) / 100) * 100);
		function point(i, fraction) {
			var angle = (i * 60 - 90) * Math.PI / 180;
			return [170 + Math.cos(angle) * 84 * fraction, 132 + Math.sin(angle) * 84 * fraction].map(function (value) { return value.toFixed(1); });
		}
		function polygon(values) { return axes.map(function (stat, i) { return point(i, (values[stat] || 0) / scale).join(','); }).join(' '); }
		var html = '<svg class="rogue-clear-radar" viewBox="0 0 340 270" role="img" aria-label="' + escape(axes.map(function (stat) { return statNames[stat] + ' ' + final[stat]; }).join('，')) + '">';
		[.25, .5, .75, 1].forEach(function (r) { html += '<polygon class="rogue-radar-grid" points="' + axes.map(function (stat, i) { return point(i, r).join(','); }).join(' ') + '" />'; });
		axes.forEach(function (stat, i) { var end = point(i, 1); html += '<path class="rogue-radar-grid" d="M170 132L' + end.join(' ') + '" />'; });
		if (baseline) html += '<polygon class="rogue-radar-baseline" points="' + polygon(baseline) + '" />';
		html += '<polygon class="rogue-radar-final" points="' + polygon(final) + '" />';
		axes.forEach(function (stat, i) {
			var p = point(i, (final[stat] || 0) / scale), label = point(i, 1.28), anchor = i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end';
			html += '<circle class="rogue-radar-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="3" /><text x="' + label[0] + '" y="' + (Number(label[1]) - 5) + '" text-anchor="' + anchor + '">' + statNames[stat] +
				'<tspan x="' + label[0] + '" dy="18" class="rogue-radar-number">' + final[stat] + '</tspan></text>';
		});
		return html + '</svg><p class="rogue-radar-legend">实色：常驻最终值' + (baseline ? ' · 虚线：增幅前' : '') + ' · 满刻度 ' + scale + '</p>';
	}
	function clearConfetti() {
		var html = '<span class="rogue-clear-confetti" aria-hidden="true">';
		for (var i = 0; i < 32; i++) html += '<i style="--x:' + ((i * 37) % 100) + '%;--delay:' + (i % 8) * .12 + 's;--sway:' + ((i % 2 ? 1 : -1) * (20 + i % 5 * 10)) + 'px;--confetti-color:' + ['#f7d981', '#b7e4d3', '#bdcdf7', '#f2b4c8'][i % 4] + '"></i>';
		return html + '</span>';
	}
	function clearCardHTML(card, celebrate) {
		var snap = card.snapshot;
		function signed(n) { return (n > 0 ? '+' : '') + n; }
		function abilityDescription(id) {
			var ability = dex().abilities.get(id);
			return id === 'roguegreatmage' ? '特攻变为原来的 2 倍。' : localName(ability.shortDesc || ability.desc || '暂无特性说明');
		}
		function memberHTML(mon, expanded) {
			if (mon.egg) return '<details class="rogue-clear-details" data-member="' + escape(mon.id) + '"><summary class="rogue-clear-member-heading">宝可梦蛋</summary><p class="rogue-clear-member-body">通关时尚未孵化，保留旅途记录，不参与通关卡对战。</p></details>';
			var detail = snap.memberDetails && snap.memberDetails[mon.id];
			var html = '<details class="rogue-clear-details" data-member="' + escape(mon.id) + '"' + (expanded === true ? ' open' : '') + '><summary class="rogue-clear-member-heading"><span class="rogue-clear-sprite" style="' + Dex.getTeambuilderSprite(mon.set) + '"></span><span><strong>' + escape(localName(mon.set.species)) + (mon.set.shiny ? ' ★ 异色' : '') +
				'</strong><small>Lv.' + mon.set.level + ' · ' + (mon.stars || 1) + ' 星</small></span><span class="rogue-clear-member-open">伙伴详情</span></summary><div class="rogue-clear-member-body"><p>性格：' + escape(localName(mon.set.nature || '')) +
				(mon.mintNature ? '（薄荷效果：' + escape(localName(mon.mintNature)) + '）' : '') +
				' · 性别：' + ({M: '雄性', F: '雌性'}[mon.set.gender] || '无性别') + ' · 亲密度：' + (mon.set.happiness || 0) + '</p>';
			html += '<div class="rogue-clear-types"><span>属性 ' + typeIcons(detail ? detail.types : dex().species.get(mon.set.species).types) +
				'</span><span>太晶 ' + typeIcons([mon.set.teraType || dex().species.get(mon.set.species).types[0]]) +
				'</span><strong>属性转：' + escape(mon.emblem ? localName(dex().items.get(mon.emblem).name) : '无') + '</strong></div>';
			var final = detail ? detail.final : mon.stats;
			var canChart = final && Object.keys(statNames).every(function (stat) { return Number.isFinite(final[stat]) && final[stat] > 0; });
			html += '<div class="rogue-clear-profile"><section class="rogue-clear-stats" data-stat-view="' + (canChart ? 'radar' : 'numbers') + '"><header><h5>常驻最终值</h5><div class="rogue-stat-switch" role="group" aria-label="能力展示方式">' +
				(canChart ? '<button type="button" data-stat-mode="radar">雷达图</button>' : '') + '<button type="button" data-stat-mode="numbers">纯数字</button></div></header>';
			if (canChart) html += '<div class="rogue-radar-view">' + clearRadar(final, detail && detail.baseline) + '</div>';
			html += '<div class="rogue-clear-stat-tiles">';
			Object.keys(statNames).forEach(function (stat) {
				html += '<article><span>' + statNames[stat] + '</span><strong>' + (detail ? detail.final[stat] : mon.stats ? mon.stats[stat] : '—') +
					'</strong><small>个体 ' + (mon.set.ivs ? mon.set.ivs[stat] : 31) + ' · 努力 ' + (mon.set.evs ? mon.set.evs[stat] : 0) +
					'</small><small>增幅前 ' + (detail ? detail.baseline[stat] : '—') + '</small><em title="增加值（增幅比例）">' +
					(detail ? signed(detail.delta[stat]) + '（' + signed(detail.percent[stat]) + '%）' : '旧卡未记录增幅') + '</em></article>';
			});
			html += '</div><p class="rogue-caption">' + (detail ?
				'常驻面板保留通关时数值。增幅前按相同形态、等级、个体值、努力值与性格计算；条件性战斗效果另列。切换纯数字可查看个体、努力和增幅。' :
				'旧卡未记录增幅前数值；最终值仍使用当时存档，不按新规则补算。') + '</p>';
			if (detail && detail.sources.length) html += '<details><summary>增幅来源与叠层</summary><ul class="rogue-clear-sources">' +
				detail.sources.map(function (source) { return '<li><b>' + escape(source.name) + '</b>：' + dialogueText(source.text) + '</li>'; }).join('') + '</ul></details>';
			html += '</section><section class="rogue-clear-loadout"><dl class="rogue-clear-effects"><dt>主特性：【' + escape(localName(dex().abilities.get(mon.set.ability).name, 'ability')) + '】</dt><dd>' +
				escape(abilityDescription(mon.set.ability)) + '</dd>';
			var extras = detail ? detail.extraAbilities : (mon.extraAbilities || []).map(function (id) { return {id: id, source: '存档记录'}; });
			extras.forEach(function (extra) {
				html += '<dt>额外特性：【' + escape(localName(dex().abilities.get(extra.id).name, 'ability')) + '】 <small>' + escape(extra.source) +
					'</small></dt><dd>' + escape(abilityDescription(extra.id)) + '</dd>';
			});
			if (!extras.length) html += '<dt>额外特性</dt><dd>无' + (!detail ? '（旧卡仅显示已有记录）' : '') + '</dd>';
			var held = mon.set.item && dex().items.get(mon.set.item);
			html += '<dt>携带道具：' + escape(held ? localName(held.name) : '无道具') + '</dt>' +
				(held ? '<dd>' + escape(localName(held.shortDesc || held.desc || '')) + '</dd>' : '') + '</dl>';
			html += '<p>通关时 HP <b>' + mon.hp + '/' + mon.maxhp + '</b> · ' + escape(mon.hp ? Object.keys(mon.statuses || {}).map(function (id) { return localName(id); }).join(' / ') || localName(mon.status || '状态正常') : '已倒下') + '</p><div class="rogue-clear-moves"><b>出战招式</b><ul>' +
				(mon.pp || []).map(function (slot) {
					var move = memberMove(slot.id, mon);
					return '<li class="rogue-equipped-move" data-type="' + escape(move.type) + '"><header><strong>' + blessingText('【' + localName(move.name, 'move') + '】') + '</strong><span>' + typeIcons([move.type]) + '</span></header>' +
						'<div class="rogue-clear-move-meta">' + (Dex.getCategoryIcon ? Dex.getCategoryIcon(move.category) : escape(localName(move.category))) + ' 威力 ' + (move.basePower || '—') +
						' · 命中 ' + (move.accuracy === true ? '必中' : move.accuracy + '%') + ' · PP ' + slot.pp + '/' + slot.maxpp + '</div><p>' + escape(referenceData('move', slot.id).text) + '</p></li>';
				}).join('') + '</ul></div>';
			var learned = (mon.moveMemory || []).filter(function (slot) { return !mon.pp.some(function (active) { return active.id === slot.id; }); });
			if (learned.length) html += '<details><summary>其他已学招式（' + learned.length + '）</summary><p>' + learned.map(function (slot) {
				return '【' + escape(localName(dex().moves.get(slot.id).name, 'move')) + '】 ' + slot.pp + '/' + slot.maxpp + ' PP';
			}).join(' / ') + '</p></details>';
			return html + '</section></div></div></details>';
		}
		if (card.history) {
			var member = function (mon) { return '<details class="rogue-history-member"><summary><span class="picon" style="' + Dex.getPokemonIcon(mon.set.species) + '"></span><span class="sr-only">' + escape(localName(mon.set.species)) + '</span></summary>' + memberHTML(mon, true).replace(/通关时/g, '记录时') + '</details>'; };
			return '<article class="rogue-history-entry"><header><b>第 ' + card.floor + ' 层</b> · ' + ({complete: '通关', defeated: '旅途结束', abandoned: '主动结束'}[card.outcome] || '') + (card.cooperative ? ' · 联机双人（队友：' + escape(card.cooperative.partnerName) + '）' : '') + ' ' + difficultyBadge(snap.difficulty, snap.difficultyLabel) + (snap.nuzlocke ? ' <span class="rogue-difficulty-badge">Nuzlocke</span>' : '') + '<time>' + escape(new Date(card.endedAt).toLocaleString()) + '</time></header><div class="rogue-history-roster">' + snap.team.map(member).join('') + '</div>' +
				(snap.box.length ? '<details><summary>其他曾出战的伙伴（' + snap.box.length + '）</summary><div class="rogue-history-roster">' + snap.box.map(member).join('') + '</div></details>' : '') +
				'<div class="rogue-history-blessings">' + (snap.blessings.map(function (entry) {
					var quality = {silver: '白银', gold: '黄金', prismatic: '棱彩'}[entry.tier];
					return '<details' + (quality ? ' class="rogue-blessing-' + entry.tier + '"' : '') + '><summary>' +
						(quality ? '<span class="rogue-history-quality">' + quality + '</span>' : '') + escape(entry.name) + '</summary><p>第 ' + entry.floor +
						' 层获得</p><p>' + blessingText(entry.text) + '</p></details>';
				}).join('') || '<span>本局未获得祝福</span>') + '</div></article>';
		}
		var html = '<article class="rogue-clear-card"><header><span class="rogue-caption">第 200 层 · 通关纪念</span> ' + difficultyBadge(snap.difficulty, snap.difficultyLabel) + (snap.nuzlocke ? ' <span class="rogue-difficulty-badge">Nuzlocke</span>' : '') + '<h3>' + escape(card.name) +
			'的旅途</h3><p>' + escape(new Date(card.completedAt).toLocaleDateString()) + ' · 旅途珍藏</p></header><div class="rogue-clear-hall">' + (celebrate ? clearConfetti() : '') +
			'<div class="rogue-clear-hall-title"><span>HALL OF FAME</span><strong>殿堂留影</strong></div>';
		function blessingRibbon(entry) {
			var owned = snap.blessingEffects && (snap.blessingEffects.owned || []).find(function (b) { return b.id === entry.id; });
			var tier = entry.tier || owned && owned.tier;
			var info = Object.assign({}, owned, entry);
			return '<li class="rogue-clear-ribbon ' + (['silver', 'gold', 'prismatic'].indexOf(tier) >= 0 ? 'rogue-blessing-' + tier : '') + '">' + fa(blessingIcon(info)) + '<strong>' + escape(entry.name || entry.id) + '</strong></li>';
		}
		var split = Math.ceil(snap.blessings.length / 2);
		html += '<div class="rogue-clear-scene"><ul class="rogue-clear-ribbons" aria-label="通关祝福">' + snap.blessings.slice(0, split).map(blessingRibbon).join('') + '</ul><div class="rogue-clear-team">';
		snap.team.forEach(function (mon) {
			html += '<button type="button" class="rogue-clear-mon" data-clear-member="' + escape(mon.id) + '" aria-label="查看' + escape(localName(mon.set.species)) + '的伙伴档案"><span class="rogue-clear-sprite" style="' + Dex.getTeambuilderSprite(mon.set, 5, true) + '"></span>' +
				'<strong>' + escape(localName(mon.set.species)) + '</strong><span>Lv.' + mon.set.level + ' · ' + (mon.stars || 1) + ' 星</span></button>';
		});
		html += '</div><ul class="rogue-clear-ribbons" aria-label="通关祝福">' + snap.blessings.slice(split).map(blessingRibbon).join('') + '</ul></div><footer><div><strong>与你并肩，抵达塔顶</strong><span>' + escape(card.name) + ' · ' + escape(snap.difficultyLabel || '0 档 · 基础') + '</span></div>';
		if (snap.spirit) {
			var spiritSpecies = snap.spiritSpecies || {mewtwo: 'Calyrex', zygardeorder: 'Arceus', hoopagift: 'Mew', mew: 'Xerneas', malamar: 'Giratina', hoopamischief: 'Hoopa'}[snap.spirit] || snap.spirit;
			html += '<div class="rogue-clear-spirit"><span style="' + Dex.getTeambuilderSprite({species: spiritSpecies}, 5, true) + '"></span><div><small>本局塔灵</small><b>' + escape(snap.spiritName || localName(spiritSpecies)) + '</b></div></div>';
		}
		html += '</footer></div><details class="rogue-clear-archive"><summary>查看伙伴档案与旅途印记</summary>';
		html += '<p>完整保留通关时的养成、祝福、永久增幅与塔灵效果。' + (snap.difficultyRulesVersion && snap.difficultyRulesVersion < 4 ? '卡片能力系数：' + Math.round(snap.difficultyScale * 100) + '%（替代爬塔系数）。' : '') + '</p>' + snap.team.map(memberHTML).join('');
		if (snap.box && snap.box.length) html += '<details><summary>寄存伙伴（' + snap.box.length + '）</summary>' + snap.box.map(memberHTML).join('') + '</details>';
		if (snap.spirit === 'hoopamischief' && snap.hazards) html += '<p>最终战斗场地：己方 ' +
			escape(localName(dex().moves.get(snap.hazards[0]).name, 'move')) + ' · 对方 ' + escape(localName(dex().moves.get(snap.hazards[1]).name, 'move')) +
			'。约战时按双方卡片的敌我方向合并，遵守层数上限。</p>';
		html += '<p>局外六维加成：' + Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + snap.boosts[stat] + (snap.boostRuleVersion === 2 ? '%' : ''); }).join(' / ') + '</p>' +
			'<p>' + [['太晶化', snap.teraUnlocked], ['超级进化', snap.megaUnlocked], ['超极巨化', snap.gmegaUnlocked], ['Z 招式', snap.zUnlocked]].map(function (system) {
				return system[0] + '：' + (system[1] ? '已解锁' : '未解锁');
			}).join(' · ') + '</p><p>' + escape(snap.spiritText || '本局未开启塔灵。') + '</p>' +
			'<p>开局卡：' + escape(snap.cardName || '无（旧版冒险）') + '</p><p>' + escape(snap.cardText || '') + '</p>' +
			'<h4>通关祝福</h4>' + (snap.blessings.length ? snap.blessings.map(function (entry) {
				var owned = snap.blessingEffects && snap.blessingEffects.owned.find(function (b) { return b.id === entry.id; });
				var target = owned && owned.target && snap.team.concat(snap.box || []).find(function (mon) { return mon.id === owned.target; });
				var tier = entry.tier || owned && owned.tier;
				return '<details class="rogue-clear-blessing ' + (['silver', 'gold', 'prismatic'].indexOf(tier) >= 0 ? 'rogue-blessing-' + tier : '') + '"><summary><b>' + escape(entry.name || entry.id) + '</b>' + (entry.floor ? ' · 第 ' + entry.floor + ' 层' : '') +
					'</summary><p>' + blessingText(entry.text) + '</p>' + (target ? '<p>指定伙伴：【' + escape(localName(target.set.species)) + '】</p>' : '') +
					(owned && owned.progress !== undefined ? '<p>累计进度：' + owned.progress + (owned.completed ? ' · 已完成' : '') + '</p>' : '') + '</details>';
			}).join('') : '<p>未选择祝福</p>');
		var effects = snap.blessingEffects || {};
		if (snap.rival) html += '<p>劲敌旅程：【' + escape(snap.rival.name) + '】 · 完成 ' + snap.rival.completed +
			'/8 段奇遇' + (snap.trainerBonds && snap.trainerBonds[snap.rival.id] ? ' · 好感度 ' + snap.trainerBonds[snap.rival.id].score : '') + (snap.rival.permanent ? ' · 永久同行' : '') + '</p>';
		if (effects.psychic !== undefined) html += '<p>灵能积蓄：' + effects.psychic + '%</p>';
		if (effects.evolution) {
			var evo = effects.evolution;
			html += '<details><summary>属性进化累计效果</summary><p>属性：' + escape(localName(evo.type)) + ' · 当前方向：' +
				({resistance: '生存适应', moves: '招式进化', stats: '能力成长'}[evo.direction] || '') + ' · 招式威力 +' + Number((evo.power * 100).toFixed(2)) + '%</p>' +
				['defense', 'offense'].map(function (key) { return '<p>' + (key === 'defense' ? '受到各属性招式时的相性调整' : '攻击各属性目标时的相性调整') + '：' +
					(Object.keys(evo[key] || {}).map(function (type) { return escape(localName(type)) + ' ' + signed(evo[key][type]) + ' 档'; }).join(' / ') || '无') + '</p>'; }).join('') +
				'<p>招式追加效果：' + ((evo.extras || []).map(function (id) { return {accuracy: '非一击必杀招式必中', crit: '要害等级 +2', brn: '命中后 50% 烧伤', par: '命中后 50% 麻痹', frostbite: '命中后 50% 冻伤', atk: '命中后 50% 攻击 +1', spa: '命中后 50% 特攻 +1', spe: '命中后 50% 速度 +1'}[id] || escape(id); }).join(' / ') || '无') + '</p></details>';
		}
		html += '<p class="rogue-caption">约战前全队恢复 HP、PP 和异常状态；禁止背包道具与捕捉。仅相同塔灵互战。版本：' + escape(card.contentVersion) + '</p>';
		return html + '</details></article>';
	}
	this.FantasyRogueRoom = this.Room.extend({
		type: 'fantasyrogue', title: '幻想杯肉鸽', minWidth: 320, bestWidth: 960,
		events: {'change input[name=starter]': 'changeStarter', 'change input[name=coopStarter]': 'changeCoopStarter',
			'change input[name=coopBattleMon]': 'changeCoopBattleMon', 'change input[name=useSpirit]': 'changeSpirit',
			'change input[name=collapse]': 'changeCollapse',
			'change input[name=nuzlocke]': 'changeNuzlocke',
			'change select[name=coopDifficulty]': 'changeCoopDifficulty', 'input input[name=coopSearch]': 'changeCoopSearch',
			'change select[name=universalItem]': 'changeUniversalItem',
			'input .rogue-universal-allocation input': 'updateUniversalAllocation',
			'change select[name=universalAura]': 'updateUniversalAllocation',
			'change select[name=difficulty]': 'changeDifficulty', 'change select[name=starterType]': 'filterStarterType', 'change select[name=codexType]': 'filterCodexType',
			'input .rogue-compound-allocation input': 'updateCompoundAllocation',
			'change select[name=testSpirit]': 'changeSpirit', 'change select[name=selectedSpirit]': 'changeSpirit', 'change select[name=hpTarget]': 'changeHPTarget',
			'change select[name=target]': 'changeItemTarget', 'keydown .rogue-start-deck': 'cardKey',
			'keydown .rogue-ski': 'skiKey', 'input input[name=codexSearch]': 'codexSearchInput', 'change select[name=codexSearchMode]': 'codexSearchModeChanged', 'keydown input[name=codexSearch]': 'codexSearchKey', 'input .rogue-event-allocation input': 'updateEventEVTotal'},
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue');
			this.state = null;
			this.screen = 'home';
			this.coopState = null; this.coopMessage = ''; this.coopSearchText = ''; this.coopDifficulty = 0; this.coopBusy = false;
			this.coopTradeAnimation = null; this.coopTradeTimer = null;
			this.coopStarterSelection = [];
			this.coopStarterBuilds = {};
			this.coopBattleSelection = [];
			this.coopPartnerBattleSelection = [];
			this.coopAreaSelection = null;
			this.coopRefreshPending = false; this.coopSelectionError = '';
			this.codices = {};
			this.codexFilter = 'all'; this.codexPage = 0; this.codexQuery = '';
			this.pending = null;
			this.error = '';
			this.selectedStarters = [];
			this.selectedCollapse = [];
			this.starterBuilds = {};
			this.starterType = ''; this.codexType = '';
			this.starterLayout = 'flat';
			this.selectedRoute = null;
			this.selectedBlessing = null;
			this.openPartyOnLayout = true;
			this.listenTo(app, 'response:fantasyrogue', this.receiveState);
			this.listenTo(app, 'response:fantasyroguecoop', this.receiveCoop);
			this.listenTo(app, 'response:fantasyroguecoopnotice', this.receiveCoopNotice);
			this.listenTo(app, 'response:fantasyrogueaction', this.receiveAction);
			this.listenTo(app, 'response:fantasyroguecrate', this.receiveCrates);
			this.listenTo(app, 'response:fantasyroguedailyreplay', this.receiveDailyReplay);
			this.listenTo(app, 'response:fantasyrogueski', this.receiveSki);
			this.listenTo(app, 'response:fantasyroguecodex', this.receiveCodex);
			this.listenTo(app, 'init:socketopened', this.refresh);
			this.listenTo(app, 'init:socketclosed', this.disconnected);
			// Sent after the server confirms a login, even if the user ID did not change.
			this.listenTo(app, 'init:choosename', this.refresh);
			this.listenTo(app, 'login:state', this.refresh);
			this.listenTo(app.user, 'change:userid', this.identityChanged);
			this.render();
		},
		join: function () { this.refresh(); },
		rejoin: function () { this.refresh(); },
		show: function () {
			var entering = !this.visible;
			this.visible = true;
			Room.prototype.show.apply(this, arguments);
			this.revealPendingMove();
			this.revealRetryHealing();
			this.maybeShowUnlock();
			if (entering) this.refresh();
		},
		hide: function () { this.visible = false; Room.prototype.hide.apply(this, arguments); },
		preparePanel: function () {
			this.rogueReadingWide = ['guide', 'blessings', 'events', 'stories'].indexOf(this.screen) >= 0 && this.readingWide === true;
			if (!this.openPartyOnLayout) return;
			this.openPartyOnLayout = false;
			var panel = app.rooms.fantasyrogueparty || app._addRoom('fantasyrogueparty', null, true);
			panel.render();
			app.updateSideRoom(panel.id);
		},
		openParty: function () {
			this.readingWide = false;
			this.openPartyOnLayout = true;
			this.preparePanel();
			// preparePanel selects the side room before focusRoom checks it. Apply
			// the layout first so a recreated room is actually shown and gets a tab.
			app.updateLayout();
			app.focusRoom('fantasyrogueparty');
		},
		$: function (selector) {
			// One controller owns both rooms: never duplicate adventure state or inputs.
			var roots = this.$el;
			if (app.rooms.fantasyrogueparty) roots = roots.add(app.rooms.fantasyrogueparty.$el);
			return roots.find(selector);
		},
		leave: function () {
			clearTimeout(this.crateQueryTimer); this.crateQueryTimer = null;
			if (this.cratePopup) this.cratePopup.close();
			if (this.dailyReplayPopup) this.dailyReplayPopup.close();
			this.screen = 'home'; this.revealPendingMove();
			this.revealRetryHealing();
			clearTimeout(this.timer); clearTimeout(this.skiTimer); this.skiPending = null; this.skiQueue = []; this.stopListening();
			clearInterval(this.activityClock); this.activityClock = null;
			if (app.rooms.fantasyrogueparty) app.removeRoom('fantasyrogueparty');
		},
		joinRoom: function (id) { app.joinRoom(id); },
		identityChanged: function () {
			clearTimeout(this.crateQueryTimer); this.crateQueryTimer = null; this.crateLoadError = '';
			if (this.cratePopup) this.cratePopup.close();
			if (this.dailyReplayPopup) this.dailyReplayPopup.close();
			this.crateData = null; this.crateIntent = null;
			clearTimeout(this.skiTimer); this.skiPending = null; this.skiQueue = [];
			clearInterval(this.activityClock); this.activityClock = null;
			this.screen = 'home'; this.codices = {}; this.codexReplay = null; this.codexQuery = ''; this.codexPage = 0;
			this.coopState = null; this.coopMessage = ''; this.coopBusy = false;
			this.coopRefreshPending = false; this.coopSelectionError = '';
			this.coopEvolutionIntent = null;
			this.coopStarterSelection = [];
			this.coopStarterBuilds = {};
			this.coopBattleSelection = [];
			this.coopPartnerBattleSelection = [];
			this.evolutionPreview = null;
			this.revealedMove = null;
			this.starterBuilds = {};
			this.useSpirit = false; this.testSpirit = ''; this.selectedSpirit = ''; this.hpTarget = null; this.spiritPopupRun = null;
			this.selectedStarters = []; this.selectedCollapse = []; this.selectedRoute = null; this.selectedBlessing = null;
			this.selectedMember = null; this.itemTarget = null; this.state = null; this.pending = null; this.error = ''; this.refresh();
		},
		disconnected: function () {
			this.coopBusy = false;
			this.coopRefreshPending = false; this.coopSelectionError = '';
			this.coopEvolutionIntent = null;
			clearTimeout(this.crateQueryTimer); this.crateQueryTimer = null;
			this.crateLoadError = '连接已断开，重新连接后会自动读取开箱资料。';
			clearTimeout(this.skiTimer); this.skiPending = null; this.skiQueue = [];
			this.evolutionPreview = null;
			clearTimeout(this.timer);
			this.pending = null;
			this.selectedRoute = null;
			this.selectedBlessing = null;
			this.error = '连接已断开。重新连接后将读取服务器存档。';
			if (this.cratePopup) this.cratePopup.render();
			this.render();
		},
		refresh: function () {
			if (app.user.loaded && app.user.get('loginState') !== 'pending' && app.socket && app.socket.readyState === 1) app.send('/cmd fantasyrogue');
			if (this.screen === 'coop') this.sendCoop('refresh');
			if (this.cratePopup) this.loadCrates();
			if (['guide', 'blessings', 'events', 'stories'].indexOf(this.screen) >= 0) this.loadCodex(this.screen);
			this.render();
		},
		retryLogin: function () { app.user.retryLogin(); },
		enterGame: function () {
			if (!this.state || !this.state.account) {
				var userid = app.user.get('userid');
				app.addPopup(globals.RogueNoticePopup, {text: !userid || /^guest[0-9]*$/.test(userid) || this.state && !this.state.account ?
					'请先登录账号，再开始冒险。本地测试请先点击右上角“输入用户名”设置固定昵称。' :
					'正在读取冒险存档，请稍后重试；若连接中断，请重新连接服务器。'});
				this.refresh(); return;
			}
			if (this.state.account.needsOnboarding) { this.maybeShowOnboarding(); return; }
			this.screen = 'game'; this.openPartyOnLayout = true;
			this.render(); app.updateLayout();
			this.maybeShowSpirit(); this.maybeShowUnlock(); this.startFishingClock(); this.startSkiClock(); this.startActivityClock(); this.maybeShowEvolution();
		},
		startMenu: function () { this.screen = 'home'; this.codexReplay = null; this.render(); app.updateLayout(); this.scrollCodexTop(); },
		openCoop: function () {
			if (!this.state || this.state.coopEnabled !== true) return;
			this.screen = 'coop'; this.coopMessage = ''; this.sendCoop('refresh'); this.render(); app.updateLayout();
		},
		coopRefresh: function () { this.sendCoop('refresh'); },
		prepareCoopBattle: function () {
			var session = this.coopState && this.coopState.session;
			if (!session || this.coopBusy || session.status !== 'active' || session.canControl === false ||
				!session.adventure || session.adventure.phase !== 'battle-selection') return;
			this.sendCoop('preparebattle', {visit: session.adventure.battleSelectionKey});
		},
		changeCoopDifficulty: function (event) { this.coopDifficulty = Number(event.currentTarget.value) || 0; },
		changeCoopSearch: function (event) { this.coopSearchText = event.currentTarget.value; },
		changeCoopStarter: function (event) {
			var id = event.currentTarget.value, selected = this.coopStarterSelection.slice(), index = selected.indexOf(id);
			if (event.currentTarget.checked && index < 0) {
				selected.push(id);
				var starter = (this.coopState && this.coopState.starters || []).find(function (entry) { return entry.id === id; });
				if (starter) {
					var traits = starterTraits(starter);
					this.coopStarterBuilds[id] = {nature: 'random', gender: 'random', ability: 'random', ivs: Object.assign({}, traits.ivs.max), shiny: false};
				}
			}
			if (!event.currentTarget.checked && index >= 0) { selected.splice(index, 1); delete this.coopStarterBuilds[id]; }
			this.coopStarterSelection = selected; this.render();
		},
		changeCoopBattleMon: function (event) {
			var id = event.currentTarget.value, owner = event.currentTarget.getAttribute('data-owner');
			var userid = this.coopState && this.coopState.userid;
			var session = this.coopState && this.coopState.session, adventure = session && session.adventure;
			if (this.coopBusy || !adventure || session.status !== 'active' || adventure.phase !== 'battle-selection' ||
				session.canControl === false || owner && owner !== userid &&
				(session.delegatedTo !== userid || owner !== session.partnerUserId)) { this.render(); return; }
			var partner = owner && userid && owner !== userid;
			var selected = (partner ? this.coopPartnerBattleSelection : this.coopBattleSelection).slice(), index = selected.indexOf(id);
			if (event.currentTarget.checked && index < 0) {
				if (selected.length >= 3) {
					event.currentTarget.checked = false; this.coopMessage = '每位玩家每场最多选择 3 只宝可梦。'; this.render(); return;
				}
				selected.push(id);
			}
			if (!event.currentTarget.checked && index >= 0) selected.splice(index, 1);
			if (partner) this.coopPartnerBattleSelection = selected;
			else this.coopBattleSelection = selected;
			this.coopSelectionError = '';
			if (adventure.battleSelectionKey) this.sendCoop('previewbattle', {
				owner: owner || userid, members: selected.slice(), visit: adventure.battleSelectionKey,
			});
			else this.render();
		},
		sendCoop: function (action, details) {
			if (!this.state || this.state.coopEnabled !== true) return;
			if (!app.socket || app.socket.readyState !== 1) { this.coopMessage = '连接已断开，请重新连接后重试。'; this.render(); return; }
			if (this.coopBusy) return;
			this.coopBusy = true; this.coopMessage = ''; this.render();
			app.send('/fantasyrogue coop ' + JSON.stringify(Object.assign({action: action}, details || {})));
		},
		searchCoop: function () {
			this.coopSearchText = this.$('input[name=coopSearch]').val() || '';
			this.sendCoop('search', {target: this.coopSearchText.trim()});
		},
		inviteCoopPlayer: function (userid) {
			this.sendCoop('invite', {target: userid, difficulty: Number(this.$('select[name=coopDifficulty]').val()) || this.coopDifficulty || 0});
		},
		inviteCoopByName: function () {
			var target = (this.$('input[name=coopTarget]').val() || '').trim();
			if (!target) { this.coopMessage = '请输入玩家名称。'; this.render(); return; }
			this.sendCoop('invite', {target: target, difficulty: Number(this.$('select[name=coopDifficulty]').val()) || this.coopDifficulty || 0});
		},
		acceptCoopInvite: function (id) { this.sendCoop('accept', {id: id}); },
		declineCoopInvite: function (id) { this.sendCoop('decline', {id: id}); },
		cancelCoopInvite: function (id) { this.sendCoop('cancel', {id: id}); },
		leaveCoop: function (id) { this.sendCoop('leave', {id: id}); },
		resumeCoop: function (id) { this.sendCoop('resume', {id: id}); },
		recoverCoopRoute: function (value) {
			var recovery = this.coopState && this.coopState.session && this.coopState.session.storyRecovery;
			if (recovery) this.sendCoop('recoverroute', {id: recovery.key, accept: value !== 'cancel'});
		},
		proposeCoopExit: function (kind) { this.sendCoop('proposeexit', {value: kind}); },
		respondCoopExit: function (value) {
			var proposal = this.coopState && this.coopState.session && this.coopState.session.exitProposal;
			if (proposal) this.sendCoop('respondexit', {id: proposal.id, value: value});
		},
		chooseCoopArea: function (id) { this.sendCoop('selectarea', {value: id}); },
		cancelCoopArea: function () { this.sendCoop('cancelarea'); },
		delegateCoopControl: function (value) { this.sendCoop('delegate', {value: value}); },
		chooseCoopAffection: function (value) {
			var scene = this.coopState && this.coopState.session && this.coopState.session.adventure &&
				this.coopState.session.adventure.coopAffection;
			if (scene) this.sendCoop('affection', {visit: scene.visit, value: value});
		},
		chooseCoopEvent: function (selection) {
			var parts = String(selection || '').split('|');
			var command = parts.length > 1 ? {owner: parts.shift(), value: parts.join('|')} : {value: selection};
			var session = this.coopState && this.coopState.session, event = session && session.adventure && session.adventure.coopEvent;
			if (!session || this.coopBusy || session.canControl === false ||
				session.delegatedTo && session.delegatedTo !== this.coopState.userid) return;
			if (event) {
				command.visit = event.branchResolved && command.owner && command.owner !== this.coopState.userid ? event.partnerKey : event.key;
			}
			this.sendCoop('eventchoice', command);
		},
		chooseCoopChallenge: function (value) {
			var session = this.coopState && this.coopState.session, challenge = session && session.adventure && session.adventure.coopChallenge;
			if (!challenge || this.coopBusy || session.canControl === false) return;
			this.sendCoop('challenge', {visit: challenge.key, value: value});
		},
		chooseCoopStar: function (value) {
			var session = this.coopState && this.coopState.session, challenge = session && session.adventure && session.adventure.coopChallenge;
			if (!challenge || this.coopBusy || session.canControl === false) return;
			var parts = value.split('|');
			this.sendCoop('challenge', {visit: challenge.key, value: 'target', owner: parts[0], member: parts[1]});
		},
		chooseCoopInvite: function (value) {
			var session = this.coopState && this.coopState.session, adventure = session && session.adventure, parts = value.split('|');
			if (!adventure || this.coopBusy || session.canControl === false) return;
			var invite = parts[0] === this.coopState.userid ? adventure.companionInvitation : adventure.partnerCompanionInvitation;
			if (invite) this.sendCoop('companioninvite', {visit: invite.key, owner: parts[0], value: parts[1]});
		},
		cancelCoopEvent: function () {
			var session = this.coopState && this.coopState.session, event = session && session.adventure && session.adventure.coopEvent;
			if (!session || this.coopBusy || session.canControl === false ||
				session.delegatedTo && session.delegatedTo !== this.coopState.userid) return;
			this.sendCoop('cancelevent', event ? {visit: event.key} : undefined);
		},
		coopMoveTraining: function (owner) {
			var state = this.coopState, session = state && state.session;
			if (!session || session.status !== 'active' || session.canControl === false ||
				(session.delegatedTo && session.delegatedTo !== state.userid) || !session.adventure ||
				['area-selection', 'battle-selection', 'route-interaction', 'settlement'].indexOf(session.adventure.phase) < 0) return null;
			var training = owner === state.userid ? session.adventure.moveTraining :
				session.delegatedTo === state.userid && owner === session.partnerUserId ? session.adventure.partnerMoveTraining : null;
			return training && !training.locked ? training : null;
		},
		learnCoopCoverage: function (selection) { this.openCoopMovePopup(selection, true); },
		editCoopMove: function (selection) { this.openCoopMovePopup(selection, false); },
		openCoopMovePopup: function (selection, coverage) {
			var parts = selection.split('|'), training = this.coopMoveTraining(parts[0]);
			if (this.coopBusy || !training || !(training.members || []).some(function (entry) { return entry.member === parts[1]; })) return;
			app.addPopup(globals.RogueCoopMovePopup, {room: this, owner: parts[0], member: parts[1],
				coverage: coverage, slot: Number(parts[2])});
		},
		coopInventory: function (owner) {
			if (!this.coopMoveTraining(owner)) return null;
			var session = this.coopState.session;
			return owner === this.coopState.userid ? session.adventure.inventory : session.adventure.partnerInventory;
		},
		useCoopSupply: function (selection) {
			var parts = selection.split('|'), inventory = this.coopInventory(parts[0]);
			if (this.coopBusy || !inventory || inventory.suppliesLocked) return;
			app.addPopup(globals.RogueCoopItemPopup, {room: this, owner: parts[0], member: parts[1], value: parts[2], action: 'use'});
		},
		equipCoopItem: function (selection) {
			var parts = selection.split('|'), inventory = this.coopInventory(parts[0]);
			if (this.coopBusy || !inventory || inventory.locked) return;
			app.addPopup(globals.RogueCoopItemPopup, {room: this, owner: parts[0], member: parts[1], action: parts[2]});
		},
		evolveCoopMember: function (selection) {
			var parts = selection.split('|'), inventory = this.coopInventory(parts[0]);
			if (this.coopBusy || !inventory || inventory.suppliesLocked) return;
			app.addPopup(globals.RogueCoopEvolutionPopup, {room: this, owner: parts[0], member: parts[1], target: parts[2]});
		},
		configureCoopUniversal: function (selection) {
			var parts = selection.split('|'), inventory = this.coopInventory(parts[0]);
			if (this.coopBusy || !inventory || inventory.locked || inventory.suppliesLocked) return;
			var mon = inventory.members.find(function (entry) { return entry.member === parts[1]; });
			if (!mon || !(mon.universalOptions || []).some(function (option) { return option.id === parts[2]; })) return;
			app.addPopup(globals.RogueCoopUniversalPopup, {room: this, owner: parts[0], member: parts[1], value: parts[2]});
		},
		fantasizeCoopMember: function (selection) {
			var parts = selection.split('|'), inventory = this.coopInventory(parts[0]);
			if (this.coopBusy || !inventory || inventory.locked || inventory.suppliesLocked) return;
			var mon = inventory.members.find(function (entry) { return entry.member === parts[1]; });
			if (!mon || !mon.fantasyReady || !(mon.fantasyOptions || []).length) return;
			app.addPopup(globals.RogueCoopFantasyPopup, {room: this, owner: parts[0], member: parts[1]});
		},
		changeCoopForm: function (selection) {
			var parts = selection.split('|'), inventory = this.coopInventory(parts[0]);
			if (this.coopBusy || !inventory || inventory.locked || inventory.suppliesLocked) return;
			var mon = inventory.members.find(function (entry) { return entry.member === parts[1]; });
			if (!mon || !(mon.formOptions || []).some(function (option) { return option.id === parts[2] && option.ready; })) return;
			app.addPopup(globals.RogueCoopFormPopup, {room: this, owner: parts[0], member: parts[1], value: parts[2]});
		},
		chooseCoopBlessing: function (slot) { this.sendCoop('blessingchoice', {slot: Number(slot)}); },
		refreshCoopBlessing: function (slot) { this.sendCoop('blessingchoice', {mode: 'refresh', slot: Number(slot)}); },
		rerollCoopBlessingQuality: function () { this.sendCoop('blessingchoice', {mode: 'quality'}); },
		cancelCoopBlessing: function () { this.sendCoop('blessingchoice', {value: 'cancel'}); },
		chooseCoopBlessingReward: function (selection) {
			var parts = String(selection || '').split('|'), owner;
			if (parts.length >= 3) owner = parts.shift();
			var member = parts.shift(), value = parts.join('|');
			var adventure = this.coopState.session.adventure;
			var team = owner && owner !== this.coopState.userid ? adventure.partnerTeam : adventure.team;
			var replaced = (team || []).find(function (mon) { return mon.id === value; });
			if (replaced) {
				app.addPopup(globals.RogueCardConfirmPopup, {room: this, coop: true, action: 'blessingreward',
					details: {member: member, value: value, owner: owner, confirmed: true},
					text: this.releaseDescription(replaced, true) + '放生后接纳新伙伴。'}); return;
			}
			this.sendCoop('blessingreward', Object.assign(member === 'stage' ? {value: value} : {member: member, value: value},
				owner ? {owner: owner} : {}));
		},
		allocateCoopBlessing: function (selection) {
			var parts = String(selection || '').split('|'), owner = parts.length > 1 ? parts.shift() : undefined;
			var evs = {};
			['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(function (stat) {
				var name = 'coopBlessing' + (owner || '') + stat;
				evs[stat] = Number(this.$('input[name=' + name + ']').val());
			}, this);
			var total = Object.keys(evs).reduce(function (sum, stat) { return sum + evs[stat]; }, 0);
			var pending = this.coopState && this.coopState.session && this.coopState.session.adventure &&
				this.coopState.session.adventure.coopBlessing;
			var reward = pending && (owner && owner !== this.coopState.userid ? pending.partnerPending : pending.ownPending) || [];
			reward = reward[0];
			if (!reward || !reward.compound || total !== reward.compound.points ||
				Object.keys(evs).some(function (stat) { return !Number.isSafeInteger(evs[stat]) || evs[stat] < 0; })) {
				this.coopMessage = reward && reward.compound ? '请恰好分配 ' + reward.compound.points + ' 点。' : '祝福分配状态已变化，请刷新。';
				this.render(); return;
			}
			this.sendCoop('blessingreward', Object.assign({member: parts[0], value: 'allocate', evs: evs}, owner ? {owner: owner} : {}));
		},
		allocateCoopEventEffort: function (owner) {
			var evs = {};
			['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(function (stat) {
				var field = owner ? 'coopEventEffort' + owner + stat : 'coopEventEffort' + stat;
				evs[stat] = Number(this.$('input[name=' + field + ']').val());
			}, this);
			this.sendCoop('eventchoice', Object.assign({value: 'allocate', evs: evs}, owner ? {owner: owner} : {}));
		},
		coopLearnMove: function (selection) {
			var parts = String(selection || '').split('|');
			if (parts.length < 2) return;
			var owner = parts.length > 2 ? parts.shift() : undefined;
			this.sendCoop('learn', Object.assign({member: parts[0], value: parts[1]}, owner ? {owner: owner} : {},
				parts[2] ? {move: parts[2]} : {}));
		},
		continueCoopBattle: function () { this.sendCoop('continuebattle'); },
		retryCoopBattle: function () { this.sendCoop('retrybattle'); },
		recoverCoopBattle: function () { this.sendCoop('recoverbattle'); },
		healCoopRest: function (owner) { this.sendCoop('heal', owner ? {owner: owner} : {}); },
		useCoopRecoveryItem: function (selection) {
			var parts = String(selection || '').split('|');
			if (parts.length !== 4 || !parts[0] || !parts[1] || !parts[2]) return;
			var command = {id: 'medicine-' + Date.now() + '-' + Math.random().toString(36).slice(2),
				owner: parts[0], value: parts[1], member: parts[2]};
			if (parts[3] !== '') command.slot = Number(parts[3]);
			this.sendCoop('useitem', command);
		},
		emergencyCoop: function (owner) {
			this.sendCoop('emergency', {owner: owner,
				id: 'emergency-' + Date.now() + '-' + Math.random().toString(36).slice(2)});
		},
		finishCoopRoute: function () { this.sendCoop('finishroute'); },
		coopCamp: function (owner) {
			var state = this.coopState, session = state && state.session, adventure = session && session.adventure;
			if (!adventure || adventure.phase !== 'route-interaction' || session.canControl === false ||
				(session.delegatedTo && session.delegatedTo !== state.userid)) return null;
			return owner === state.userid ? adventure.trainingCamp :
				session.delegatedTo === state.userid && owner === session.partnerUserId ? adventure.partnerTrainingCamp : null;
		},
		openCoopCamp: function (owner) {
			var quote = this.coopCamp(owner), session = this.coopState && this.coopState.session;
			if (this.coopBusy || !quote || quote.locked || !quote.offers.some(function (offer) { return offer.remaining; })) return;
			app.addPopup(globals.RogueTrainingCampPopup, {room: this, camp: quote,
				coop: {userid: this.coopState.userid, session: session.id, adventure: session.adventure.id, owner: owner, visit: quote.visit}});
		},
		coopRecycling: function (owner) {
			var state = this.coopState, session = state && state.session, adventure = session && session.adventure;
			if (!adventure || session.status !== 'active' || adventure.phase !== 'route-interaction' ||
				session.canControl === false || session.delegatedTo && session.delegatedTo !== state.userid) return null;
			return owner === state.userid ? adventure.recycling :
				session.delegatedTo === state.userid && owner === session.partnerUserId ? adventure.partnerRecycling : null;
		},
		openCoopRecycling: function (selection) {
			var parts = String(selection || '').split('|'), quote = this.coopRecycling(parts[0]);
			if (this.coopBusy || !quote || quote.locked || !quote.items.some(function (item) {
				return item.count > 0 && (parts[1] === 'all' || item.id === parts[1]);
			})) return;
			app.addPopup(globals.RogueCoopRecyclePopup, {room: this, owner: parts[0], value: parts[1], quote: quote});
		},
		buyCoopRest: function (selection) {
			var parts = String(selection || '').split('|');
			var owner = parts.length > 1 ? parts.shift() : undefined;
			var itemId = parts.join('|');
			var requestId = 'rest-' + Date.now() + '-' + Math.random().toString(36).slice(2);
			this.sendCoop('buy', Object.assign({id: requestId, value: itemId}, owner ? {owner: owner} : {}));
		},
		proposeCoopTrade: function (owner) {
			var member = this.$('select[name=coopTradeOwn][data-owner="' + owner + '"]').val();
			var partnerMember = this.$('select[name=coopTradePartner][data-owner="' + owner + '"]').val();
			if (!member || !partnerMember) { this.coopMessage = '请选择交换双方各自的一只宝可梦。'; this.render(); return; }
			this.sendCoop('proposetrade', {owner: owner, member: member, partnerMember: partnerMember});
		},
		respondCoopTrade: function (selection) {
			var proposal = this.coopState && this.coopState.session && this.coopState.session.adventure &&
				this.coopState.session.adventure.tradeProposal;
			if (!proposal) return;
			var parts = String(selection || '').split('|'), owner = parts.length > 1 ? parts.shift() : this.coopState.userid;
			var accept = parts.join('|');
			this.sendCoop('respondtrade', {id: proposal.id, owner: owner, accept: accept === 'accept'});
		},
		cancelCoopTrade: function (owner) {
			var proposal = this.coopState && this.coopState.session && this.coopState.session.adventure &&
				this.coopState.session.adventure.tradeProposal;
			if (proposal) this.sendCoop('canceltrade', {id: proposal.id, owner: owner || this.coopState.userid});
		},
		respondCoopCapture: function (value) {
			var proposal = this.coopState && this.coopState.session && this.coopState.session.adventure &&
				this.coopState.session.adventure.captureProposal;
			if (!proposal) return;
			var command = {id: proposal.id, value: value};
			if (value === 'give') command.ball = this.$('select[name=coopCaptureBall]').val();
			this.sendCoop('respondcapture', command);
		},
		proposeCoopSafariCapture: function (owner) {
			var session = this.coopState && this.coopState.session, event = session && session.adventure && session.adventure.coopEvent;
			if (!event || !event.safari || this.coopBusy || session.canControl === false ||
				session.delegatedTo && session.delegatedTo !== this.coopState.userid) return;
			this.sendCoop('proposecapture', {ball: 'safariball', captureTarget: event.safari.key,
				owner: owner || this.coopState.userid});
		},
		cancelCoopCapture: function () {
			var proposal = this.coopState && this.coopState.session && this.coopState.session.adventure &&
				this.coopState.session.adventure.captureProposal;
			if (proposal) this.sendCoop('cancelcapture', {id: proposal.id});
		},
		saveCoopStarters: function () {
			var session = this.coopState && this.coopState.session;
			if (!session || session.status !== 'lobby' || this.coopBusy) return;
			if (!this.coopStarterSelection.length) { this.coopMessage = '请先选择至少一只初始宝可梦。'; this.render(); return; }
			var page = this, sessionID = session.id, userid = this.coopState.userid;
			var adapter = {
				state: this.coopState,
				starterBuilds: this.coopStarterBuilds,
				selectedStarters: this.coopStarterSelection.slice(),
				pending: this.coopBusy,
				startAdventure: function () {
					var current = page.coopState && page.coopState.session;
					if (!current || current.id !== sessionID || current.status !== 'lobby' ||
						page.coopState.userid !== userid || app.user.get('userid') !== userid || page.coopBusy) return;
					page.coopStarterBuilds = this.starterBuilds;
					page.sendCoop('selectstarters', {
						starters: this.selectedStarters.slice(), starterBuilds: this.starterBuilds
					});
				},
			};
			app.addPopup(globals.RogueStarterPopup, {room: adapter, starters: adapter.selectedStarters.slice()});
		},
		saveCoopBattleSelection: function (owner) {
			var userid = this.coopState && this.coopState.userid;
			var session = this.coopState && this.coopState.session, adventure = session && session.adventure;
			if (this.coopBusy || !adventure || session.status !== 'active' || adventure.phase !== 'battle-selection' ||
				session.canControl === false || owner && owner !== userid &&
				(session.delegatedTo !== userid || owner !== session.partnerUserId)) return;
			var selection = owner && owner !== userid ? this.coopPartnerBattleSelection : this.coopBattleSelection;
			if (!selection.length || selection.length > 3) {
				this.coopMessage = '每位玩家须选择 1～3 只健康宝可梦。'; this.render(); return;
			}
			this.coopSelectionError = '';
			this.sendCoop('selectbattle', Object.assign({members: selection.slice(), visit: adventure.battleSelectionKey},
				owner ? {owner: owner} : {}));
		},
		cancelCoopBattleSelection: function (owner) {
			var state = this.coopState, session = state && state.session, adventure = session && session.adventure;
			if (this.coopBusy || !adventure?.battleSelectionKey || session.status !== 'active' ||
				adventure.phase !== 'battle-selection' || session.canControl === false ||
				owner !== state.userid && (session.delegatedTo !== state.userid || owner !== session.partnerUserId)) return;
			var selected = owner === state.userid ? this.coopBattleSelection : this.coopPartnerBattleSelection;
			this.coopSelectionError = '';
			this.sendCoop('previewbattle', {owner: owner, members: selected.slice(), visit: adventure.battleSelectionKey});
		},
		receiveCoop: function (data) {
			if (!this.state || this.state.coopEnabled !== true) return;
			if (!data || data.userid !== app.user.get('userid')) return;
			var previousSession = this.coopState && this.coopState.session;
			var previousEvent = previousSession && previousSession.adventure && previousSession.adventure.coopEvent;
			this.coopBusy = false;
			this.coopMessage = data.ok ? (data.action === 'refresh' ? this.coopSelectionError : '') : data.message || '联机操作失败。';
			if (!data.ok && (data.action === 'previewbattle' || data.action === 'selectbattle')) {
				this.coopSelectionError = this.coopMessage; this.coopRefreshPending = true;
			}
			if (data.state) {
				this.coopState = data.state;
				if (data.state.session) {
					this.coopDifficulty = data.state.session.difficulty;
					var incomingSession = data.state.session;
					// A partner's saved selection must not erase this player's unfinished configuration.
					var keepStarterDraft = previousSession && previousSession.id === incomingSession.id &&
						previousSession.status === 'lobby' && incomingSession.status === 'lobby' &&
						!(data.ok && data.action === 'selectstarters') &&
						JSON.stringify(previousSession.starterSelection || []) === JSON.stringify(incomingSession.starterSelection || []) &&
						JSON.stringify(previousSession.starterBuildSelection || {}) === JSON.stringify(incomingSession.starterBuildSelection || {});
					if (!keepStarterDraft) {
						this.coopStarterSelection = (incomingSession.starterSelection || []).slice();
						this.coopStarterBuilds = Object.assign({}, incomingSession.starterBuildSelection || {});
					}
					var incomingAdventure = incomingSession.adventure;
					this.coopBattleSelection = (incomingAdventure?.battlePreview || incomingAdventure?.battleSelection || []).slice();
					this.coopPartnerBattleSelection = (incomingAdventure?.partnerBattlePreview || incomingAdventure?.partnerBattleSelection || []).slice();
					this.coopAreaSelection = data.state.session.adventure?.areaSelection || null;
				}
				else {
					this.coopStarterSelection = []; this.coopStarterBuilds = {};
					this.coopBattleSelection = []; this.coopPartnerBattleSelection = []; this.coopSelectionError = '';
					if (data.state.maxDifficulty !== undefined && this.coopDifficulty > data.state.maxDifficulty) this.coopDifficulty = data.state.maxDifficulty;
				}
			}
			if (this.screen === 'coop') { this.render(); this.startActivityClock(); this.startFishingClock(); this.maybeShowAdmission(); }
			var joinedSession = this.coopState && this.coopState.session;
			var nativeRoom = joinedSession && app.rooms[joinedSession.roomid];
			if (nativeRoom && nativeRoom.updateRogueCoopPreview) nativeRoom.updateRogueCoopPreview();
			if (data.ok && this.screen === 'coop' && joinedSession?.status === 'active' &&
				joinedSession.adventure?.phase === 'battle' && joinedSession.roomid &&
				previousSession?.id === joinedSession.id && previousSession.roomid !== joinedSession.roomid &&
				!app.rooms[joinedSession.roomid]) app.joinRoom(joinedSession.roomid);
			if (data.ok && data.action === 'eventchoice' && this.screen === 'coop') {
				var currentEvent = this.coopState && this.coopState.session && this.coopState.session.adventure && this.coopState.session.adventure.coopEvent;
				if (currentEvent && previousEvent && currentEvent.key === previousEvent.key) {
					['exchange', 'partnerExchange'].forEach(function (field) {
						if (currentEvent[field] && !previousEvent[field]) app.addPopup(globals.RogueExchangeAnimationPopup, {exchange: currentEvent[field]});
					});
				}
			}
			if (data.action === 'evolve' && this.coopEvolutionIntent) {
				var intent = this.coopEvolutionIntent; this.coopEvolutionIntent = null;
				var session = this.coopState && this.coopState.session, adventure = session && session.adventure;
				var team = adventure && (intent.owner === data.userid ? adventure.team : adventure.partnerTeam);
				var mon = (team || []).find(function (entry) { return entry.id === intent.member; });
				if (data.ok && this.screen === 'coop' && session && adventure && session.id === intent.session && adventure.id === intent.adventure &&
					mon && idOf(mon.species) === intent.target) {
					app.addPopup(globals.RogueEvolutionAnimationPopup, {room: this, member: intent.member,
						before: intent.before, after: {species: mon.species, shiny: mon.shiny, gender: mon.gender}, coop: intent});
				}
			}
			if (this.coopRefreshPending && (this.screen === 'coop' || nativeRoom)) {
				this.coopRefreshPending = false; this.sendCoop('refresh');
			}
			var nativeAdventure = joinedSession && joinedSession.adventure;
			if (data.ok && this.screen === 'coop' && !this.coopBusy && joinedSession?.status === 'active' &&
				nativeAdventure?.nativePreviewEnabled && nativeAdventure.phase === 'battle-selection' &&
				nativeAdventure.canRetryTogether && !nativeAdventure.pendingMove && !nativeAdventure.partnerPendingMove &&
				joinedSession.canControl !== false && this.coopNativePreparedKey !== nativeAdventure.battleSelectionKey) {
				this.coopNativePreparedKey = nativeAdventure.battleSelectionKey;
				this.prepareCoopBattle();
			}
		},
		receiveCoopNotice: function (data) {
			if (!this.state || this.state.coopEnabled !== true) return;
			if (!data) return;
			if (data.exitRequest) {
				this.screen = 'coop';
				if (this.notifyOnce) this.notifyOnce('联机退出请求', data.exitRequest === 'retreat' ?
					'队友希望共同撤退到场外，请在联机页面确认。' : '队友希望结束本局，请在联机页面确认。', 'coopexit');
			} else if (data.exitChanged && this.closeNotification) this.closeNotification('coopexit');
			this.coopNotice = data.completed ? '联机通关已记入双方个人履历；下一档仍需满足原有故事条件。' :
				data.routeRecovered ? '已回到同层普通区域选择，队伍和资源保留，未推进个人秘闻。' :
				data.abandoned ? '共同冒险已结束，永久解锁与各自单人存档保留；本次记录已存入历史。' :
				data.exitChanged ? '共同退出请求已更新，请查看联机页面。' :
				data.resumed ? '已回到共同冒险；若原战斗房间中断，请双方确认恢复。' :
				data.delegation ? '联机操作权设置已更新。' : data.declined ? '对方暂不接受这次邀请。' : data.cancelled ? '对方撤回了联机邀请。' :
				data.paused ? '队友离开了联机冒险，进度已暂停。' : data.captureResolved ? '共同捕捉已完成，宝可梦已保存给捕捉者。' :
				data.captureProposal ? '共同捕捉协商已更新。' : '';
			if (data.tradeCompleted) {
				this.coopTradeAnimation = data.tradeCompleted;
				if (this.coopTradeTimer) clearTimeout(this.coopTradeTimer);
				var page = this, tradeID = data.tradeCompleted.id;
				this.coopTradeTimer = setTimeout(function () {
					if (page.coopTradeAnimation && page.coopTradeAnimation.id === tradeID) {
						page.coopTradeAnimation = null;
						if (page.screen === 'coop') page.render();
					}
				}, 2600);
			}
			var activeBattle = this.coopState?.session?.roomid && app.rooms[this.coopState.session.roomid];
			if (this.screen === 'coop' || activeBattle) {
				if (this.coopBusy) this.coopRefreshPending = true;
				else this.sendCoop('refresh');
			}
		},
		renderCoopStoryRecovery: function (session) {
			var recovery = session.storyRecovery;
			if (!recovery) return '';
			var votes = recovery.selections || {}, ownID = this.coopState.userid;
			var allowed = !session.delegatedTo || session.delegatedTo === ownID;
			return '<section class="rogue-coop-battle-select"><h4>旧版区域恢复</h4><p role="status">' +
				escape(recovery.message) + '</p><p>双方确认后回到当前层的普通区域选择；保留队伍、伤势、背包与金币，不发放秘闻节点奖励。</p>' +
				(recovery.available ? '<p>' + (votes[ownID] ? '你已确认' : '你尚未确认') + '；' +
					(votes[session.partnerUserId] ? '队友已确认。' : '等待队友确认。') + '</p>' +
					button('recoverCoopRoute', 'accept', '共同返回同层普通区域', this.coopBusy || !allowed || votes[ownID]) : '') +
				(votes[ownID] ? button('recoverCoopRoute', 'cancel', '撤回恢复确认', this.coopBusy || !allowed) : '') + '</section>';
		},
		renderCoopExit: function (session) {
			if (!session.adventure || ['active', 'paused'].indexOf(session.status) < 0) return '';
			var proposal = session.exitProposal, ownID = this.coopState.userid;
			var allowed = !session.delegatedTo || session.delegatedTo === ownID;
			var html = '<div class="rogue-coop-exit"><h4>共同退出</h4>';
			if (proposal) {
				html += '<p role="status">' + (proposal.proposer === ownID ? '你' : '队友') + '提出：' +
					(proposal.kind === 'retreat' ? '撤退到场外。伤害、PP 和道具消耗保留，本层尚未完成。' :
						'结束本局。保留永久解锁和历史记录；本次联机进度结束，需要重新开局。') + '</p>';
				if (proposal.confirmed) html += '<p>双方已确认，正在保存结果；若连接中断，可重试完成退出。</p>' +
					button('respondCoopExit', 'accept', '完成已确认的退出', this.coopBusy || !allowed);
				else html += button('respondCoopExit', 'accept', '同意共同退出', this.coopBusy || !allowed || proposal.proposer === ownID) +
					button('respondCoopExit', 'cancel', proposal.proposer === ownID ? '撤回请求' : '暂不退出', this.coopBusy || !allowed);
			} else {
				var battle = ['battle', 'battle-starting'].indexOf(session.adventure.phase) >= 0;
				if (session.status === 'active' && battle && (!session.battleRecovery || session.battleRecovery.available)) {
					html += button('proposeCoopExit', 'retreat', '共同撤退到场外', this.coopBusy || !allowed);
				}
				html += '<p>结束本局需要双方同意；移交全部操作权后由接收方决定。永久解锁与个人单人存档保留。</p>' +
					button('proposeCoopExit', 'abandon', '共同结束本局', this.coopBusy || !allowed);
			}
			return html + '</div>';
		},
		releaseCoopMember: function (selection) {
			var parts = selection.split('|'), owner = parts[0], id = parts[1];
			var adventure = this.coopState.session.adventure, own = owner === this.coopState.userid;
			var pending = own ? adventure.pendingCapture : adventure.partnerPendingCapture;
			var team = own ? adventure.team : adventure.partnerTeam;
			var mon = (team || []).find(function (entry) { return entry.id === id; });
			var details = {owner: owner, member: id, confirmed: true};
			if (pending) { details.id = pending.id; if (id === 'decline' || id === 'join') details.value = id; }
			if (!pending && !mon) return;
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, coop: true, action: pending ? 'replace' : 'release',
				details: details, text: mon ? this.releaseDescription(mon, !!pending) + (pending ? '放生后接纳新伙伴。' : '') :
					id === 'join' ? '将新伙伴加入空余的队伍位置？' : '不接纳这位新伙伴？捕捉解锁保留，不返还糖果。'});
		},
		renderCoopRelease: function (session) {
			var adventure = session.adventure;
			if (!adventure || ['battle', 'battle-starting', 'complete'].indexOf(adventure.phase) >= 0) return '';
			var ownID = this.coopState.userid, owners = [{id: ownID, name: '我的队伍', team: adventure.team, pending: adventure.pendingCapture}];
			if (session.delegatedTo === ownID) owners.push({id: session.partnerUserId, name: '队友队伍', team: adventure.partnerTeam, pending: adventure.partnerPendingCapture});
			return owners.map(function (owner) {
				var html = '<section class="rogue-coop-release"><h4>' + owner.name + (owner.pending ? ' · 接纳新伙伴' : ' · 放生') + '</h4>';
				if (owner.pending) html += '<p>待接纳：' + escape(localName(owner.pending.set.species)) + '。队伍已满时，必须先确认放生一位旧伙伴。</p>';
				html += '<div class="rogue-actions">' + (owner.team || []).map(function (mon) {
					var quote = owner.pending ? mon.replacementRelease : mon.release;
					return button('releaseCoopMember', owner.id + '|' + mon.id, '放生 ' + localName(mon.species) +
						(owner.pending ? '并接纳' : ''), this.coopBusy || session.canControl === false || !quote || !!quote.reason);
				}, this).join('');
				if (owner.pending) html += ((owner.team || []).length < 6 ? button('releaseCoopMember', owner.id + '|join', '加入队伍', this.coopBusy || session.canControl === false) : '') +
					button('releaseCoopMember', owner.id + '|decline', '不接纳新伙伴', this.coopBusy || session.canControl === false);
				return html + '</div></section>';
			}, this).join('');
		},
		maybeShowAdmission: function () {
			var run = this.state && this.state.run, pending = run && run.pendingCapture;
			if (this.screen === 'coop') {
				var adventure = this.coopState && this.coopState.session && this.coopState.session.adventure;
				if (!adventure || ['battle', 'battle-starting'].indexOf(adventure.phase) >= 0) return;
				pending = adventure.pendingCapture;
			}
			if (!pending || this.admissionNoticeID === pending.id) return;
			this.admissionNoticeID = pending.id;
			app.addPopup(globals.RogueNoticePopup, {text: '队伍已满。新伙伴已暂存，捕捉解锁也已保存。请在接纳新伙伴区域选择并确认放生一位旧伙伴，然后继续旅程。'});
		},
		renderCoopRecovery: function (session) {
			var adventure = session.adventure;
			if (!adventure) return '';
			var ownID = this.coopState.userid, canControl = !session.delegatedTo || session.delegatedTo === ownID;
			var owners = [{id: ownID, name: '我的队伍', recovery: adventure.recovery}];
			if (adventure.partnerRecovery) owners.push({id: session.partnerUserId, name: '队友的队伍', recovery: adventure.partnerRecovery});
			return owners.map(function (owner) {
				var recovery = owner.recovery;
				if (!recovery) return '';
				var html = '<section class="rogue-coop-recovery"><h4>' + owner.name + ' · 场外恢复</h4>';
				if (recovery.locked) return html + '<p>本层要求连续战斗，途中不能使用恢复道具或急救。</p></section>';
				if (recovery.pendingLearning) return html + '<p>请先处理待学招式，再进行场外恢复。</p></section>';
				html += '<p class="rogue-caption">选择目标后使用 1 件道具，只消耗该玩家的背包；急救只从该玩家的钱包扣费。</p>';
				if (!canControl) html += '<p>操作权已移交，当前由队友代为选择。</p>';
				var items = recovery.items || [];
				html += items.map(function (item) {
					return '<details><summary>' + escape(item.name) + ' ×' + item.count + '</summary><div class="rogue-actions">' +
						item.targets.map(function (target) {
							var label = localName(target.species);
							if (target.move) label += ' · ' + localName(target.move, 'move');
							if (target.restoredHP > 0) label += ' · HP +' + target.restoredHP;
							return button('useCoopRecoveryItem', [owner.id, item.id, target.member,
								target.slot === undefined ? '' : target.slot].join('|'), label, this.coopBusy || !canControl);
						}, this).join('') + '</div></details>';
				}, this).join('');
				if (!items.length) html += '<p>背包中没有当前可使用的恢复道具。</p>';
				if (recovery.emergency) {
					html += '<p>全队已倒下且没有复活道具。急救恢复全队 HP、PP 和异常状态。余额：' + recovery.money + ' 金币。</p>' +
						button('emergencyCoop', owner.id, '支付 ' + recovery.cost + ' 金币急救', this.coopBusy || !canControl || recovery.money < recovery.cost);
					if (recovery.money < recovery.cost) html += '<p>金币不足，急救暂不可用。</p>';
				} else if (recovery.allFainted) html += '<p>请先用复活道具恢复一位伙伴，再确认出战。</p>';
				return html + '</section>';
			}, this).join('');
		},
		renderCoopMoveTraining: function (session) {
			var adventure = session.adventure;
			if (!adventure) return '';
			var owners = [{id: this.coopState.userid, name: '我的队伍', training: adventure.moveTraining}];
			if (session.delegatedTo === this.coopState.userid) owners.push({id: session.partnerUserId,
				name: '队友的队伍', training: adventure.partnerMoveTraining});
			return owners.map(function (owner) {
				var training = owner.training;
				if (!training) return '';
				var html = '<details class="rogue-coop-moves"><summary>' + owner.name + ' · 招式与补盲研习（' +
					escape(training.remaining) + ' 次）</summary>';
				if (training.locked) return html + '<p>' + escape(training.locked) + '</p></details>';
				var locked = this.coopBusy || !this.coopMoveTraining(owner.id);
				html += '<p>补盲研习可留待后来入队的伙伴。学会后，在下方点击招式位置装备；换招保留已消耗的 PP。</p>';
				(training.members || []).forEach(function (entry) {
					var prefix = owner.id + '|' + entry.member, moves = entry.moves || [];
					html += '<h5>' + escape(localName(entry.species)) + '</h5><div class="rogue-actions">';
					if (training.remaining) html += button('learnCoopCoverage', prefix, '补盲研习',
						locked || !(entry.coverage || []).length);
					for (var slot = 0; slot < Math.min(training.maxMoves || 4, moves.length + 1); slot++) {
						html += button('editCoopMove', prefix + '|' + slot, (slot + 1) + '. ' +
							(moves[slot] ? localName(moves[slot], 'move') : '空招式位'), locked || !(entry.memory || []).length);
					}
					html += '</div>';
				});
				return html + '</details>';
			}, this).join('');
		},
		renderCoopInventory: function (session) {
			var adventure = session.adventure;
			if (!adventure) return '';
			var owners = [{id: this.coopState.userid, name: '我的背包', inventory: adventure.inventory}];
			if (session.delegatedTo === this.coopState.userid) owners.push({id: session.partnerUserId,
				name: '队友的背包', inventory: adventure.partnerInventory});
			return owners.map(function (owner) {
				var inventory = owner.inventory;
				if (!inventory) return '';
				var readyEvolutions = (inventory.members || []).filter(function (mon) {
					return (mon.evolutions || []).some(function (option) { return option.ready; });
				}).length;
				var html = '<details class="rogue-coop-inventory"><summary>' + owner.name + ' · 成长补给与装备' +
					(readyEvolutions ? ' · ' + readyEvolutions + ' 位伙伴可进化' : '') + '</summary>';
				if (inventory.locked) return html + '<p>' + escape(inventory.locked) + '</p></details>';
				var locked = this.coopBusy || !this.coopInventory(owner.id), members = inventory.members || [];
				html += '<p>只使用该玩家的物品。糖果可批量使用；学习机学会的招式可在“招式与补盲研习”中装备。</p>';
				html += '<p>幻想碎片：' + (inventory.fantasyShards || 0) + ' · 每次幻想化消耗 100 片，由该玩家自行选择伙伴和分支。</p>';
				if (inventory.suppliesLocked) html += '<p>' + escape(inventory.suppliesLocked) + '</p>';
				(inventory.supplies || []).forEach(function (item) {
					html += '<h5>' + escape(eventText(item.name)) + ' ×' + item.count + '</h5><div class="rogue-actions">';
					(item.targets || []).forEach(function (target) {
						var mon = members.find(function (entry) { return entry.member === target.member; });
						if (mon) html += button('useCoopSupply', [owner.id, mon.member, item.id].join('|'),
							localName(mon.species), locked || !!inventory.suppliesLocked);
					});
					if (!(item.targets || []).length && !inventory.suppliesLocked) html += '<span>队内暂无可用目标。</span>';
					html += '</div>';
				});
				members.forEach(function (mon) {
					html += '<h5>' + escape(localName(mon.species)) + '</h5><div class="rogue-actions">' +
						button('equipCoopItem', [owner.id, mon.member, 'equip'].join('|'), '携带道具：' +
							(mon.item ? localName(dex().items.get(mon.item).name || mon.item) : '无'), locked) +
						button('equipCoopItem', [owner.id, mon.member, 'equipemblem'].join('|'),
							mon.emblem ? '调整属性转' : '装备属性转', locked) + '</div>';
					(mon.universalOptions || []).forEach(function (option) {
						html += button('configureCoopUniversal', [owner.id, mon.member, option.id].join('|'),
							option.name + ' · 分配种族点', locked || !!inventory.suppliesLocked || !option.eligible);
					});
					if ((mon.fantasyOptions || []).length) html += button('fantasizeCoopMember',
						[owner.id, mon.member].join('|'), '幻想化 · 100 幻想碎片', locked || !mon.fantasyReady || !!inventory.suppliesLocked);
					(mon.formOptions || []).forEach(function (option) {
						html += '<div>' + button('changeCoopForm', [owner.id, mon.member, option.id].join('|'),
							option.id === 'separate' ? '解除合体' : '变为 ' + localName(option.species),
							locked || !!inventory.suppliesLocked || !option.ready) +
							'<small>' + escape(option.reason || eventText(option.itemName)) + '</small></div>';
					});
					(mon.evolutions || []).forEach(function (option) {
						html += '<div>' + button('evolveCoopMember', [owner.id, mon.member, idOf(option.species)].join('|'),
							'进化为 ' + localName(option.species), locked || !!inventory.suppliesLocked || !option.ready) +
							'<small>' + (option.requirements || []).map(function (requirement) {
								return (requirement.met ? '✓ ' : '○ ') + escape(eventText(requirement.text));
							}).join(' · ') + '</small></div>';
					});
				});
				return html + '</details>';
			}, this).join('');
		},
		renderCoopRecycling: function (session) {
			var own = this.coopState.userid, adventure = session.adventure;
			var panels = [{owner: own, title: '我的背包', quote: adventure.recycling}];
			if (session.delegatedTo === own && adventure.partnerRecycling) {
				panels.push({owner: session.partnerUserId, title: '队友的背包', quote: adventure.partnerRecycling});
			}
			return panels.filter(function (entry) { return !!entry.quote; }).map(function (entry) {
				var quote = entry.quote, items = quote.items || [];
				var locked = this.coopBusy || session.canControl === false || !!quote.locked;
				var total = items.reduce(function (sum, item) { return sum + item.price * item.count; }, 0);
				return '<div class="rogue-exchange"><h5>' + escape(entry.title) + ' · ' +
					(quote.fullPrice ? '物品原价回收' : quote.mushroomPremium ? '蘑菇加价回收' : '战利品兑换') +
					'</h5>' + (quote.mushroomPremium ? '<p>蘑菇按普通兑换价的 125% 回收；其他战利品按普通兑换价。</p>' : '') +
					'<p>钱包余额：' + quote.money + ' 金币</p>' +
					(quote.locked ? '<p>' + escape(quote.locked) + '</p>' : '') + (items.length ?
						'<div class="rogue-coop-routes">' + items.map(function (item) {
							return '<article class="rogue-coop-route"><strong>' + escape(localName(item.name)) + ' ×' + item.count +
								'</strong><small>每件 ' + item.price + ' 金币</small>' +
								button('openCoopRecycling', entry.owner + '|' + item.id, '选择兑换数量', locked) + '</article>';
						}).join('') + '</div>' + button('openCoopRecycling', entry.owner + '|all', '全部兑换 · ' + total + ' 金币', locked) :
						'<p>当前背包没有可回收物品。</p>') + '</div>';
			}, this).join('');
		},
		renderCoopPendingMoves: function (session) {
			var adventure = session.adventure, pending = adventure.pendingMove ?
				[{owner: this.coopState.userid, value: adventure.pendingMove}] : [];
			if (session.delegatedTo === this.coopState.userid && adventure.partnerPendingMove) {
				pending.push({owner: session.partnerUserId, value: adventure.partnerPendingMove});
			}
			return pending.map(function (entry) {
				var move = entry.value, prefix = entry.owner + '|' + move.member + '|', suffix = '|' + move.move;
				return '<div class="rogue-coop-pending-move"><strong>' + (entry.owner === this.coopState.userid ? '我的伙伴 · ' : '队友的伙伴 · ') +
					escape(localName(move.species)) + ' 想学习 ' + escape(localName(move.moveName, 'move')) +
					'</strong><p>请选择替换的招式，或保留当前招式。</p>' + move.moves.map(function (slot, index) {
						return button('coopLearnMove', prefix + index + suffix, '替换 ' + localName(slot.name, 'move'),
							this.coopBusy || session.canControl === false);
					}, this).join('') + button('coopLearnMove', prefix + 'skip' + suffix, '暂不学习',
						this.coopBusy || session.canControl === false) + '</div>';
			}, this).join('');
		},
		renderCoopCapture: function (capture, canControl) {
			var capturePanel = '';
			if (capture) {
				var captureAsOwner = capture.isOwner || capture.canControlBoth;
				var captureAsRecipient = capture.isRecipient || capture.canControlBoth;
				capturePanel = '<div class="rogue-coop-trade-request"><strong>共同捕捉协商</strong><p>' +
					escape(capture.ownerName) + ' 想用 ' + escape(capture.ballName) + ' 捕捉 ' + escape(localName(capture.targetName)) + '。</p>';
				if (capture.state === 'contested' && captureAsOwner) {
					var handoffBalls = capture.handoffBalls || [];
					capturePanel += '<p>队友也想捕捉。你可以让出，由队友使用' + (capture.context === 'safari' ? '共同狩猎球' : '自己的精灵球') + '立即投球；或保留捕捉权，将请求交还队友。</p>' +
						(handoffBalls.length ? '<label>队友使用的精灵球 <select name="coopCaptureBall">' + handoffBalls.map(function (ball) {
							return '<option value="' + escape(ball.id) + '">' + escape(ball.name) + ' ×' + ball.count + '</option>';
						}).join('') + '</select></label>' : '<p>队友没有可用的精灵球，暂时不能让出捕捉权。</p>') +
						button('respondCoopCapture', 'give', '让给队友并由其捕捉', (this.coopBusy || canControl === false) || !handoffBalls.length) +
						button('respondCoopCapture', 'keep', '我保留捕捉权', (this.coopBusy || canControl === false));
				} else if (capture.state === 'contested') {
					capturePanel += '<p>你已提出也想捕捉，等待 ' + escape(capture.ownerName) + ' 决定让出或保留。</p>';
				} else if (captureAsRecipient) {
					capturePanel += '<p>同意后由 ' + escape(capture.ownerName) + ' 使用' + (capture.context === 'safari' ? '共同狩猎球' : '自己的精灵球') + '捕捉；也可以提出自己想捕捉。</p>' +
						button('respondCoopCapture', 'accept', '同意队友捕捉', (this.coopBusy || canControl === false)) +
						button('respondCoopCapture', 'contest', '我也想捕捉', (this.coopBusy || canControl === false));
				} else {
					capturePanel += '<p>等待 ' + escape(capture.recipientName) + ' 同意或提出自己也想捕捉。</p>';
				}
				capturePanel += button('cancelCoopCapture', '', '撤回捕捉请求', (this.coopBusy || canControl === false)) + '</div>';
			}
			return capturePanel;
		},
		renderCoopAdventure: function (session) {
			var adventure = session.adventure;
			if (!adventure) return '<p role="status">共同冒险资料正在准备。</p>';
			if (adventure.companionInvitation || adventure.partnerCompanionInvitation) {
				var inviteBusy = this.coopBusy || session.canControl === false;
				return '<section class="rogue-coop-battle-select"><h4>处理各自的同行邀请</h4>' +
					(adventure.companionInvitation ? '<h4>我方</h4>' + this.renderCompanionInvitation(adventure.companionInvitation, inviteBusy, this.coopState.userid) : '<p>你的同行邀请已处理。</p>') +
					(adventure.partnerCompanionInvitation ? '<h4>队友</h4>' + this.renderCompanionInvitation(adventure.partnerCompanionInvitation,
						inviteBusy || session.delegatedTo !== this.coopState.userid, session.partnerUserId) : '<p>队友的同行邀请已处理。</p>') + '</section>';
			}
			if (adventure.coopAffection) return this.renderCoopAffection(session);
			var canControl = session.canControl !== false;
			var partnerName = session.role === 'host' ? session.guestName : session.hostName;
			if (['area-selection', 'battle-selection', 'route-interaction', 'blessing-selection', 'blessing-reward'].indexOf(adventure.phase) >= 0 &&
				(adventure.pendingMove || adventure.partnerPendingMove)) {
				return '<section class="rogue-coop-battle-select"><h4>共同冒险 · 待学习招式</h4>' +
					this.renderCoopPendingMoves(session) + '<p role="status">' +
					(adventure.partnerPendingMove && session.delegatedTo !== this.coopState.userid ? '队友正在处理升级招式。' : '') +
					'双方处理完毕后继续当前区域。</p></section>';
			}
			var lastReward = adventure.lastReward;
			var lastRewardHTML = lastReward ? '<p class="infobox" role="status">第 ' + lastReward.floor + ' 层 · ' + escape(lastReward.name) +
				' 奖励：' + (lastReward.money ? '金币 ' + lastReward.money + ' · ' : '') + Object.keys(lastReward.items || {}).map(function (id) {
					return escape(rogueItemName(id)) + ' ×' + lastReward.items[id];
				}).join('、') + (lastReward.effect ? '<br />' + escape(lastReward.effect) : '') + '</p>' : '';
			if (adventure.phase === 'blessing-selection' || adventure.phase === 'blessing-reward') {
				var blessing = adventure.coopBlessing || {}, round = blessing.round;
				var delegated = session.delegatedTo === (this.coopState && this.coopState.userid);
				var choiceLabel = function (choice) {
					if (choice === null || choice === undefined) return '尚未选择';
					var parts = String(choice).split(':');
					if (parts[0] === 'choose') return '共同选择第 ' + (Number(parts[1]) + 1) + ' 项';
					if (parts[0] === 'refresh') return '共同刷新第 ' + (Number(parts[1]) + 1) + ' 项';
					if (choice === 'quality') return '共同更换整批品阶';
				return String(choice);
				};
				var html = '<section class="rogue-coop-battle-select"><h4>共同祝福 · 第 ' + adventure.floor + ' 层</h4>' +
					'<p>双方看到同一组选项；必须选择同一项后才会生效。祝福效果、后续目标和资源分别记录在各自队伍。</p>';
				if (round) {
					html += '<p>品质：' + escape(({silver: '白银', gold: '黄金', prismatic: '棱彩', mixed: '银 · 金 · 彩'})[round.tier] || round.tier) + ' · 本轮还可共同选择 ' + round.remaining + ' 项。你的选择：' +
						choiceLabel(blessing.ownChoice) + '；队友选择：' + choiceLabel(blessing.partnerChoice) + '</p>';
					if (adventure.phase === 'blessing-selection' && !blessing.qualityLocked) html += button('rerollCoopBlessingQuality', '',
						blessing.qualityRerolled ? '本局更换品阶机会已用' : '共同更换整批品阶', this.coopBusy || !canControl || blessing.qualityRerolled ||
							round.options.some(function (option) { return option.chosen; }));
					if (adventure.phase === 'blessing-selection') html += '<div class="rogue-coop-routes">' + (round.options || []).map(function (option, index) {
						return '<article class="rogue-coop-route"><strong>' + escape(option.name || option.id) + '</strong><small>' +
							escape(option.text || '') + '</small>' + button('chooseCoopBlessing', String(index),
							'共同选择此项', this.coopBusy || !canControl || option.chosen) +
							(option.refreshes ? button('refreshCoopBlessing', String(index), '共同刷新 · 剩余 ' + option.refreshes + ' 次',
								this.coopBusy || !canControl || option.chosen || !round.remaining) : '') + '</article>';
					}, this).join('') + '</div>' +
						(blessing.ownChoice !== null && blessing.ownChoice !== undefined ? button('cancelCoopBlessing', '', '撤回我的选择', this.coopBusy || !canControl) : '');
				}
				if (adventure.phase === 'blessing-reward') {
					var renderMemberRewards = function (owner, label, pending, stage, team) {
						var prefix = delegated && owner !== this.coopState.userid ? owner + '|' : '';
						var reward = (pending || [])[0], result = '<h5>' + escape(label) + '的个人祝福步骤</h5>';
						if (reward) {
							result += '<p><strong>' + escape(reward.title || '祝福奖励') + '</strong></p>';
							if (reward.pokemon) result += reward.pokemon.egg ?
								'<p>宝可梦蛋 · 距孵化 ' + reward.pokemon.remainingFloors + ' 层。孵化前占用队伍位置，不能出战或使用道具。</p>' :
								'<p>获得伙伴：' + escape(localName(reward.pokemon.set.species)) +
								' Lv.' + reward.pokemon.set.level + ' · ' + '★'.repeat(reward.pokemon.stars || 1) + '</p>';
							if (reward.kind === 'compound' && reward.compound && reward.compound.stage === 'allocate') {
								var used = 0;
								result += '<p>将 ' + reward.compound.points + ' 点分配给所选伙伴。</p><table class="rogue-stats"><tbody>';
								['hp', 'atk', 'def', 'spa', 'spd', 'spe'].forEach(function (stat) {
									var value = 0; used += value;
									result += '<tr><th>' + statNames[stat] + '</th><td>' + ((reward.compound.baseStats || {})[stat] || 0) +
										'</td><td><input class="textbox" type="number" min="0" max="' + reward.compound.points + '" step="1" name="coopBlessing' +
										(owner === this.coopState.userid ? '' : owner) + stat + '" value="' + value + '"' + (!canControl || this.coopBusy ? ' disabled' : '') + ' /></td></tr>';
								}, this);
								result += '</tbody></table><p class="rogue-caption">当前填写合计：' + used + ' / ' + reward.compound.points + '</p>' +
									button('allocateCoopBlessing', prefix + reward.id, '确认分配并使用', this.coopBusy || !canControl);
							} else if (reward.kind === 'gift' && reward.pokemon) {
								if ((team || []).length < 6) result += button('chooseCoopBlessingReward', prefix + reward.id + '|join', '加入队伍', this.coopBusy || !canControl);
								else result += '<p>队伍已满，选择一只伙伴离队后加入：</p>' + (team || []).map(function (mon) {
									return button('chooseCoopBlessingReward', prefix + reward.id + '|' + mon.id, '放生并接纳 · ' + localName(mon.species), this.coopBusy || !canControl || !!(mon.replacementRelease && mon.replacementRelease.reason));
								}, this).join('');
								result += button('chooseCoopBlessingReward', prefix + reward.id + '|release', reward.pokemon.egg ? '放弃这颗蛋' : '放生新伙伴', this.coopBusy || !canControl);
							} else {
								result += '<p>请选择一项：</p><div class="rogue-coop-routes">' + (reward.options || []).map(function (option) {
									var id = option.id || option, name = option.name || localName(id);
									return button('chooseCoopBlessingReward', prefix + reward.id + '|' + id, name, this.coopBusy || !canControl);
								}, this).join('') + '</div>';
							}
							return result;
						}
						if (stage) return result + '<p>' + (stage.kind === 'direction' ? '选择属性强化方向' : '选择本次强化') + '</p><div class="rogue-coop-routes">' +
							(stage.options || []).map(function (option) {
								return button('chooseCoopBlessingReward', prefix + 'stage|' + option.id, option.name || option.id, this.coopBusy || !canControl);
							}, this).join('') + '</div>';
						return result + '<p>已完成；等待另一位玩家处理个人步骤。</p>';
					}.bind(this);
					html += renderMemberRewards(this.coopState.userid, '你', blessing.ownPending, blessing.ownStage, adventure.team || []);
					if (delegated) html += renderMemberRewards(session.partnerUserId, partnerName, blessing.partnerPending,
						blessing.partnerStage, adventure.partnerTeam || []);
				}
				if (adventure.phase === 'blessing-selection' && !round) html += '<p role="status">正在准备双方共同选项…</p>';
				return html + '</section>';
			}
			if (session.battleRecovery) {
				var recovery = session.battleRecovery, votes = recovery.selections || {};
				var ownConfirmed = !!votes[this.coopState.userid];
				return '<section class="rogue-coop-battle-select"><h4>共同冒险 · 第 ' + adventure.floor + ' 层</h4><p role="status">' +
					escape(recovery.message) + '</p>' + (recovery.available ? '<p>已保存到第 ' + recovery.turn +
					' 回合；双方队伍、敌方状态、道具消耗和捕获结果会一并恢复。</p>' +
					(recovery.final ? '<p>本场战斗已结束，读取结果后双方再共同确认继续前进。</p>' :
						'<p>' + (ownConfirmed ? '你已确认恢复' : '你尚未确认恢复') + '；' +
						(votes[session.partnerUserId] ? '队友已确认。' : '等待队友确认。') + '</p>') +
					button('recoverCoopBattle', '', recovery.final ? '读取已保存的结算' : session.delegatedTo ? '恢复双方的共同战斗' :
						'确认恢复原战斗', this.coopBusy || !canControl || !recovery.final && ownConfirmed) : '') + '</section>';
			}
			if (adventure.phase === 'battle-starting') return '<section class="rogue-coop-battle-select"><h4>共同冒险 · 第 ' + adventure.floor + ' 层</h4>' +
				'<p role="status">双方队伍已锁定，正在建立共同双打房间…</p></section>';
			if (adventure.phase === 'battle') {
				var capturePanel = this.renderCoopCapture(adventure.captureProposal, canControl);
				return '<section class="rogue-coop-battle-select"><h4>共同战斗 · 第 ' + adventure.floor + ' 层</h4>' +
					'<p>双方已进入同一场原生 Multi 战斗。' + (session.roomid ? '房间：' + escape(session.roomid) : '房间正在同步…') + '</p>' +
					(session.roomid ? button('joinRoom', session.roomid, '返回共同战斗', false, fa('play')) : '') + capturePanel + '</section>';
			}
			if (adventure.phase === 'settlement') {
				var result = adventure.battleResult || {}, hostReward = result.reward || {money: 0, items: {}};
				var guestReward = result.partnerReward || hostReward;
				var ownReward = session.role === 'host' ? hostReward : guestReward;
				var partnerReward = session.role === 'host' ? guestReward : hostReward;
				var html = '<section class="rogue-coop-battle-select"><h4>共同战斗结果 · 第 ' + adventure.floor + ' 层</h4>' +
					'<p role="status">' + (result.retreated ? '已共同撤退' : result.won ? '本场获胜' : '本场未获胜') +
					(adventure.coopChallenge && !result.won ? '；HP、PP 与道具消耗保留，本次挑战未获得成长或奖励。' :
						result.memoryRestored ? '；双方已恢复各自战前的队伍与背包，仅保留本场捕捉和实际经验。' :
						'；双方各自的 HP、状态、PP 与成长已保存。') +
					(session.roomid ? '战斗房间：' + escape(session.roomid) : '') + '</p>';
				var rewardText = function (loot) {
					var parts = [];
					if (loot.money) parts.push('金币 ' + loot.money);
					Object.keys(loot.items || {}).forEach(function (id) {
						parts.push(escape(rogueItemName(id)) + ' ×' + loot.items[id]);
					});
					if (loot.effect) parts.push(escape(loot.effect));
					return parts.length ? parts.join(' · ') : '无额外战利品';
				};
				if (ownReward.effect || partnerReward.effect || ownReward.money || partnerReward.money || Object.keys(ownReward.items || {}).length ||
					Object.keys(partnerReward.items || {}).length) html += '<div class="infobox"><p>你的战利品：' +
					rewardText(ownReward) + '</p><p>队友的战利品：' + rewardText(partnerReward) + '</p></div>';
				if (adventure.notices && adventure.notices.length) html += '<ul class="infobox">' + adventure.notices.map(function (notice) {
					return '<li>' + escape(notice) + '</li>';
				}).join('') + '</ul>';
				var pendingMovesHTML = this.renderCoopPendingMoves(session);
				if (pendingMovesHTML) {
					html += pendingMovesHTML;
				} else if (result.won || result.eventResolved) {
					html += '<p>' + (adventure.continueSelection ? '你已确认继续' : '你尚未确认继续') + '；' +
						(adventure.partnerContinueSelection ? '队友已确认。' : '等待队友确认。') + '</p>' +
						button('continueCoopBattle', '', adventure.continueSelection ? '已确认继续' : result.eventResolved ?
							(adventure.coopChallenge ? '返回共同挑战' : '返回共同事件') :
							canControl && session.delegatedTo ? '确认双方继续前进' : '确认继续前进',
							this.coopBusy || !canControl || adventure.continueSelection);
				} else {
					html += '<p>' + (adventure.canRetryBattle ? '双方确认后可重新选择出战伙伴，再挑战当前遭遇。' :
						'你的队伍没有可出战伙伴，请使用下方场外恢复。') + '</p>' +
						'<p>' + (adventure.retrySelection ? '你已确认再战' : '你尚未确认再战') + '；' +
						(adventure.partnerRetrySelection ? '队友已确认。' : '等待队友确认。') + '</p>' +
						button('retryCoopBattle', '', adventure.retrySelection ? '已确认再战' : canControl && session.delegatedTo ? '确认双方重新挑战' : '确认重新挑战',
							this.coopBusy || !canControl || adventure.retrySelection || !(session.delegatedTo === this.coopState.userid ? adventure.canRetryTogether : adventure.canRetryBattle));
				}
				if (result.eventResolved) html += '<p class="rogue-caption">' + (adventure.coopChallenge ?
					'双方确认后返回共同挑战，继续领奖、重试或离开。' : '双方确认后回到共同事件，继续处理奖励或后续分支，完成后再共同前进。') + '</p>';
				else if (result.won) html += '<p class="rogue-caption">路线奖励会在节点最后一场结束后分别发给双方；双方确认后进入下一场或下一层。</p>';
				return html + '</section>';
			}
			if (adventure.phase === 'area-selection') {
				var choices = adventure.routeChoices || [], ownRoute = adventure.areaSelection, partnerRoute = adventure.partnerAreaSelection;
				return '<section class="rogue-coop-battle-select rogue-coop-route-select"><h4>共同冒险 · 第 ' + adventure.floor + ' 层 · 区域选择</h4>' + lastRewardHTML +
					'<p>' + (session.delegatedTo === (this.coopState && this.coopState.userid) ? '你已接管路线选择，确认后会同时记录双方。' :
						session.delegatedTo ? '路线选择权已移交；你仍可查看队友的选择。' :
						'双方需要选中同一条路线才会继续；队友预选以半透明标识显示，你可以改选另一条路线。') + '</p><div class="rogue-coop-routes">' +
					choices.map(function (route) {
						var mine = ownRoute === route.id, partner = partnerRoute === route.id;
						var kindNames = {wild: '野外遭遇', elite: '精英挑战', trainer: '训练家', boss: '首领', rest: '休整中心', reward: '旅途补给', trade: '交易路线', event: '随机事件', challenge: '可选挑战'};
						return '<article class="rogue-coop-route' + (mine ? ' is-own-selection' : '') + (partner ? ' is-partner-selection' : '') + '"><strong>' +
							escape(route.name) + '</strong><small>' + (route.biome ? escape(route.biome) + ' · ' : '') + escape(kindNames[route.kind] || route.kind) +
							(partner ? ' · 队友已预选' : '') + (mine ? ' · 我已预选' : '') + (!route.available ? ' · 该路线的联机交互尚未接入' : '') + '</small>' +
						button('chooseCoopArea', route.id, mine ? '已预选此路线' : partner ? '选择队友路线' : '预选此路线', this.coopBusy || !canControl || !route.available) + '</article>';
					}, this).join('') + '</div>' + (ownRoute && canControl ? '<p>' + button('cancelCoopArea', '', '撤回我的预选', this.coopBusy) + '</p>' : '') +
					'<p class="rogue-caption">双方选中同一路线后才会进入；补给资源双方各得一份，交易与治疗分别使用自己的金币。</p></section>';
			}
			if (adventure.phase === 'route-interaction') {
				if (adventure.coopChallenge) return this.renderCoopChallenge(session);
				if (adventure.selectedRoute && adventure.coopEvent && (adventure.coopEvent.sideRoute || adventure.selectedRoute.kind === 'event' ||
					adventure.selectedRoute.kind === 'trade' && ['mushroomcollector', 'auction'].includes(adventure.coopEvent.id))) {
					var event = adventure.coopEvent;
					var collector = event.id === 'mushroomcollector', auction = event.id === 'auction';
					var sharedOnly = ['stones', 'feathers', 'pokeflute', 'dittoshow', 'blackjack', 'grassegg', 'hatchhouse', 'fossillab', 'snacks', 'identityquiz', 'relicpuzzle', 'duskbreeder', 'kubfumaster', 'repelwave', 'bandits', 'dice', 'fishing', 'honeymoon', 'honeymoonreturn', 'greninjareturn', 'lostescort', 'safaripark'].includes(event.id);
					var delegated = session.delegatedTo === (this.coopState && this.coopState.userid);
					var eventOptions = event.branchResolved ? (event.options || []).concat(event.picker && event.picker.options || []) : event.branchOptions || [];
					var eventOptionLabel = function (option) {
						if (event.id === 'identityquiz' && /^answer:\d+$/.test(option.id)) return localName(option.name);
						if (option.service === 'fossil') return option.seat + 'P · ' + (option.items || []).map(function (item) {
							return localName(item, 'item') + ' ×1';
						}).join(' ＋ ') + ' → 复活 ' + localName(option.pokemon);
						if (option.service === 'snack' && option.pokemon) return option.seat + 'P · 给【' +
							localName(option.pokemon) + '】点心 · ' + option.price + ' 金币';
						if (option.pokemon && option.seat) return '展示 ' + option.seat + 'P 的 ' + localName(option.pokemon);
						return /^(move|fantasymove|perform):/.test(option.id) ? localName(option.name, 'move') :
							/^(member|swap):/.test(option.id) ? localName(option.name) : option.name;
					};
					var renderEventOptions = function (options, owner) {
						return options.filter(function (option) { return option.id !== 'allocate' &&
							!(event.fishing && option.id === 'fishtap'); }).map(function (option) {
							var selection = delegated && event.branchResolved ? owner + '|' + option.id : option.id;
							var label = eventOptionLabel(option);
							return '<div class="rogue-coop-event-option">' + button('chooseCoopEvent', selection, label,
								this.coopBusy || !canControl || option.disabled || event.id === 'safaripark' && !!adventure.captureProposal) +
								(option.text ? '<p class="rogue-caption">' + dialogueText(option.text) + '</p>' : '') + '</div>';
						}, this).join('');
					}.bind(this);
					var ownID = this.coopState && this.coopState.userid;
					var eventOptionHTML = regionalPreviewHTML(event.preview) + this.renderCoopRhythm(event.activity, 'own',
						event.sharedRhythm ? '共同节拍 · 任一方点击，每拍只计一次' : '你的节拍') + renderEventOptions(eventOptions, ownID);
					if (event.safari) {
						eventOptionHTML = '<p>共同狩猎球剩余 ' + event.safari.balls + ' 颗。成功捕获后结束本次狩猎，伙伴归最终投球者。</p>' +
							this.renderCoopCapture(adventure.captureProposal, canControl) +
							button('proposeCoopSafariCapture', ownID, '我想捕捉 ' + localName(event.safari.name),
								this.coopBusy || !canControl || !!adventure.captureProposal) +
							(delegated ? button('proposeCoopSafariCapture', session.partnerUserId, '交由队友捕捉',
								this.coopBusy || !!adventure.captureProposal) : '') + eventOptionHTML;
					}
					if (event.fishing && event.stage === 'choice') eventOptionHTML =
						'<p>共同钓鱼 · 共用浮标与收获，任一方可收线。</p>' +
						this.renderFishing(event, this.coopBusy || !canControl || (event.branchOptions || [])
							.some(function (option) { return option.id === 'fishtap' && option.disabled; }), true) + eventOptionHTML;
					if (delegated && event.branchResolved && !collector && !auction && !sharedOnly) eventOptionHTML += '<h5>队友的个人步骤</h5>' + regionalPreviewHTML(event.partnerPreview) +
						this.renderCoopRhythm(event.partnerActivity, 'partner', '队友的节拍 · 由你代为操作') + renderEventOptions(
						(event.partnerOptions || []).concat(event.partnerPicker && event.partnerPicker.options || []), session.partnerUserId);
					var eventText = (event.paragraphs || []).map(function (paragraph) {
						return '<p>' + dialogueText(paragraph) + '</p>';
					}).join('');
					eventText += auctionBoardHTML(event.auction);
					if (event.silhouette) eventText += '<div class="rogue-quiz-silhouette" aria-label="宝可梦剪影" style="' +
						escape(Dex.getTeambuilderSprite({species: event.silhouette})) + '"></div>';
					if (event.stage === 'choice' && event.teams) {
						eventText += '<div class="rogue-event-teams">' + event.teams.map(function (team, index) {
							return '<div><strong>' + (index ? '右边的队伍' : '左边的队伍') + '</strong>' + team.map(function (mon) {
								return '<p><span class="picon" style="' + Dex.getPokemonIcon(mon.species) + '"></span>' +
									escape(localName(mon.species)) + ' · Lv.' + Number(mon.level) + '</p>';
							}).join('') + '</div>';
						}).join('') + '</div>';
					}
					if (event.stage === 'watch' && event.replay) eventText +=
						'<p>双方观看同一场对战；共同确认后，按实际胜负继续事件。</p>' +
						button('watchCoopEvent', '', '观看对战', this.coopBusy, fa('play'));
					var choiceName = function (id) {
						var option = (event.branchOptions || []).find(function (entry) { return entry.id === id; });
						return option ? eventOptionLabel(option) : id || '尚未选择';
					};
					var eventVote = collector && event.branchResolved ? '<p>共同对话已完成；双方使用各自背包回收，所得金币分别入账。</p>' :
						auction && event.branchResolved ? '<p>本场拍卖已结束，拍品和费用已按实际得标人分别结算。</p>' :
						sharedOnly && event.branchResolved ? '<p>本次事件已完成，可共同继续旅程。</p>' :
						event.branchResolved ? '<p>' + (delegated ? '当前由你代为确认双方的共同分支与个人目标。' : '双方已确认共同分支；目标步骤分别由两人完成。') :
						'<p>你的选择：' + escape(choiceName(event.ownChoice)) + '；队友选择：' +
							escape(choiceName(event.partnerChoice)) + '。双方需选择相同分支才能继续本次事件。</p>';
					var statNames = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
					var renderEffort = function (allocation, owner) {
						if (!allocation) return '';
						var suffix = delegated ? owner : '';
					return '<div class="rogue-coop-event-effort"><strong>' + escape(localName(allocation.species)) +
						' · 努力值总量 ' + allocation.total + '</strong><div>' + Object.keys(statNames).map(function (stat) {
							return '<label>' + statNames[stat] + ' <input type="number" name="coopEventEffort' + suffix + stat + '" min="' +
								allocation.minimum[stat] + '" max="252" value="' + allocation.current[stat] + '"' +
								(!canControl ? ' disabled' : '') + '></label>';
						}).join('') + '</div>' + button('allocateCoopEventEffort', delegated ? owner : '',
						'确认努力值分配', this.coopBusy || !canControl) + '</div>';
					}.bind(this);
					var effortForm = renderEffort(event.evAllocation, ownID);
					if (delegated) effortForm += renderEffort(event.partnerEvAllocation, session.partnerUserId);
					var eventReady = event.branchResolved && event.ownComplete && event.partnerComplete;
					var scrollPartners = event.scrollPartners ? '<div class="rogue-coop-scroll-partners">' +
						event.scrollPartners.map(function (entry) {
							var scrollName = {dark: '恶之卷轴', water: '水之卷轴', electric: '电之卷轴', poison: '酒之卷轴',
								rock: '岩之卷轴', psychic: '超之卷轴', assist: '协助队友'}[entry.choice];
							return '<p><strong>' + (entry.owner === ownID ? '我方' : '队友') + ' · ' + escape(entry.name) + '</strong>：' +
								(entry.species ? escape(localName(entry.species)) : '尚未选择伙伴') + ' · ' +
								(scrollName || '尚未确认卷轴或协助') + '</p>';
						}).join('') + '</div>' : '';
					return '<section class="rogue-coop-battle-select"><h4>' + escape(event.title || adventure.selectedRoute.name) +
						' · 第 ' + adventure.floor + ' 层</h4>' + lastRewardHTML + eventText + eventVote + scrollPartners +
						(event.picker ? '<p>' + escape(event.picker.label) + ' · 选择一项</p>' : '') +
						(effortForm + (eventOptionHTML ? '<div class="rogue-coop-event-options">' + eventOptionHTML + '</div>' : '')) +
						(!event.branchResolved && event.ownChoice ? button('cancelCoopEvent', '', '撤回我的分支选择', this.coopBusy) : '') +
						(collector && eventReady ? this.renderCoopRecycling(session) : '') +
						(event.sideRoute ? '<p>共同完成后返回本层路线；领取时双方各得一颗大师球，不消耗本层。</p>' :
						'<p>个人步骤：' + (event.ownComplete ? '你已完成' : '你尚未完成') + '；队友' +
							(event.partnerComplete ? '已完成。' : '尚未完成。') + '</p>' +
						'<p>' + (adventure.routeExitSelection ? '你已确认离开事件' : '你尚未确认离开') + '；' +
							(adventure.partnerRouteExitSelection ? '队友已确认。' : '等待队友确认。') + '</p>' +
						button('finishCoopRoute', '', adventure.routeExitSelection ? '已确认离开' : '共同完成并继续',
							this.coopBusy || !canControl || adventure.routeExitSelection || !eventReady)) + '</section>';
				}
				if (adventure.selectedRoute && adventure.selectedRoute.kind === 'rest') {
					var care = adventure.centerCare || {}, ownNotices = adventure.notices || [];
					var partnerCare = adventure.partnerCenterCare || {};
					var trade = adventure.tradeProposal, tradeAnimation = this.coopTradeAnimation;
					var tradePrice = Number.isSafeInteger(adventure.tradePrice) ? adventure.tradePrice : 2500;
					var restTeam = (adventure.team || []).map(function (mon) {
						return escape(localName(mon.species)) + ' Lv.' + mon.level + ' HP ' + mon.hp + '/' + mon.maxhp;
					}).join('、') || '队伍为空';
					var renderRestShop = function (items, owner, balance) { return (items || []).map(function (item) {
						var stock = item.remaining === null ? '不限量' : '剩余 ' + item.remaining;
						var selection = owner && owner !== this.coopState.userid ? owner + '|' + item.id : item.id;
						return '<article class="rogue-coop-route"><strong>' + escape(item.name) + '</strong><small>' +
							escape(item.description || item.kind) + ' · ' + item.price + ' 金币 · ' + stock + '</small>' +
						button('buyCoopRest', selection, '购买 1 件 · ' + (owner && owner !== this.coopState.userid ? partnerName : '我的钱包'),
							this.coopBusy || !canControl || balance < item.price) + '</article>';
					}, this).join(''); }.bind(this);
					var restShop = renderRestShop(adventure.shopItems, this.coopState.userid, adventure.money);
					if (session.delegatedTo === this.coopState.userid) {
						restShop += '<h5>' + escape(partnerName) + '的商店选项</h5>' +
							renderRestShop(adventure.partnerShopItems, session.partnerUserId, adventure.partnerMoney);
					}
					var tradePanel;
					if (trade) {
						var give = trade.isProposer ? trade.offeredPokemon : trade.requestedPokemon;
						var receive = trade.isProposer ? trade.requestedPokemon : trade.offeredPokemon;
						var tradeActions = '';
						if (trade.canControlBoth) {
							tradeActions = button('cancelCoopTrade', trade.fromUser, '撤回发起方的交换请求', this.coopBusy) +
								button('respondCoopTrade', trade.toUser + '|accept', '按接收方身份同意交换', this.coopBusy) +
								button('respondCoopTrade', trade.toUser + '|decline', '按接收方身份拒绝', this.coopBusy);
						} else if (trade.isProposer) {
							tradeActions = button('cancelCoopTrade', this.coopState.userid, '撤回交换请求', this.coopBusy);
						} else {
							tradeActions = button('respondCoopTrade', this.coopState.userid + '|accept', '同意并交换', this.coopBusy) +
								button('respondCoopTrade', this.coopState.userid + '|decline', '拒绝', this.coopBusy);
						}
						tradePanel = '<div class="rogue-coop-trade-request"><strong>' + escape(trade.fromName) + ' 提议交换</strong><p>' +
							escape(trade.fromName) + ' 的 ' + escape(localName(trade.offeredPokemon)) + ' ⇄ ' + escape(trade.toName) + ' 的 ' +
							escape(localName(trade.requestedPokemon)) + '</p><small>你将送出 ' + escape(localName(give)) + '，收到 ' +
							escape(localName(receive)) + '。费用 ' + trade.fee + ' 金币由发起者支付；通讯进化会在交换后按进化条件处理。</small><div>' +
							tradeActions + '</div></div>';
					} else {
						var tradeForm = function (owner, ownerName, recipientName, ownerTeam, recipientTeam, balance) {
							var offered = (ownerTeam || []).map(function (mon) {
								return '<option value="' + escape(mon.id) + '">' + escape(localName(mon.species)) + ' · Lv.' + mon.level + '</option>';
							}).join('');
							var requested = (recipientTeam || []).map(function (mon) {
								return '<option value="' + escape(mon.id) + '">' + escape(localName(mon.species)) + ' · Lv.' + mon.level + '</option>';
							}).join('');
							return '<div class="rogue-coop-trade-request"><strong>以“' + escape(ownerName) + '”为发起方</strong><p>' +
								'发起方支付 ' + tradePrice + ' 金币；对方确认后交换两支队伍中的伙伴。符合条件的通讯进化会随交换触发。</p>' +
								'<label>' + escape(ownerName) + '交出的伙伴 <select name="coopTradeOwn" data-owner="' + escape(owner) + '"><option value="">选择宝可梦</option>' + offered + '</select></label>' +
								'<label>' + escape(recipientName) + '交出的伙伴 <select name="coopTradePartner" data-owner="' + escape(owner) + '"><option value="">选择宝可梦</option>' + requested + '</select></label>' +
								button('proposeCoopTrade', owner, '发起交换请求', this.coopBusy || balance < tradePrice || !offered || !requested) +
								(balance < tradePrice ? '<small>' + escape(ownerName) + '的余额不足以支付交换费用。</small>' : '') + '</div>';
						}.bind(this);
						var ownID = this.coopState.userid, tradePartnerID = session.partnerUserId;
						var ownForm = tradeForm(ownID, '你', partnerName, adventure.team, adventure.partnerTeam, adventure.money);
						var partnerForm = session.delegatedTo === ownID ? tradeForm(tradePartnerID, partnerName, '你', adventure.partnerTeam,
							adventure.team, adventure.partnerMoney || 0) : '';
						tradePanel = '<div class="rogue-coop-trade-panel"><p>队伍交换使用发起者自己的金币并需要接收方确认。</p>' + ownForm + partnerForm + '</div>';
					}
					var tradeAnimationHTML = tradeAnimation ? '<div class="rogue-coop-trade-animation" role="status"><span>' +
						escape(localName(tradeAnimation.offeredPokemon)) + '</span><b aria-hidden="true">⇄</b><span>' +
						escape(localName(tradeAnimation.requestedPokemon)) + '</span><small>交换完成 · ' + tradeAnimation.fee + ' 金币</small></div>' : '';
					return '<section class="rogue-coop-battle-select"><h4>宝可梦中心 · 第 ' + adventure.floor + ' 层</h4>' + lastRewardHTML +
						'<p>你的独立钱包：' + adventure.money + ' 金币。' + (session.delegatedTo === this.coopState.userid ?
							'你可以代为管理双方钱包与队伍。' : session.delegatedTo ? '操作权已移交给队友。' : '双方各自支付治疗费用。') + '</p>' +
						'<p>' + restTeam + '</p>' + (ownNotices.length ? '<p class="infobox" role="status">' + ownNotices.map(function (notice) {
							return escape(notice);
						}).join('、') + '</p>' : '') +
						(care.needed ? '<p>全队恢复费用：' + care.cost + ' 金币' + (care.fainted ? '（复活 ' + care.fainted + ' 只）' : '') + '</p>' +
							button('healCoopRest', '', '支付费用并恢复我的队伍', this.coopBusy || !canControl || adventure.money < care.cost) :
							'<p role="status">你的队伍目前无需治疗。</p>') +
						(session.delegatedTo === this.coopState.userid && partnerCare.needed ? '<p>队友队伍恢复费用：' + partnerCare.cost + ' 金币</p>' +
							button('healCoopRest', session.partnerUserId, '代队友支付并恢复其队伍', this.coopBusy || adventure.partnerMoney < partnerCare.cost) : '') +
						'<h5>休整商店 · 使用自己的金币购买，道具只进入自己的背包</h5>' +
						(restShop ? '<div class="rogue-coop-routes">' + restShop + '</div>' : '<p>当前没有可购买的商品。</p>') +
						this.renderCoopRecycling(session) +
						'<h5>队伍交换</h5>' + tradeAnimationHTML + tradePanel +
						'<p>' + (adventure.routeExitSelection ? '你已确认离开休整中心' : '你尚未确认离开') + '；' +
							(adventure.partnerRouteExitSelection ? '队友已确认。' : '等待队友确认。') + '</p>' +
						button('finishCoopRoute', '', adventure.routeExitSelection ? '已确认离开' : session.delegatedTo === this.coopState.userid ? '共同离开休整中心' : '确认离开并继续',
							this.coopBusy || !canControl || adventure.routeExitSelection || !!trade) + '</section>';
				}
				if (adventure.selectedRoute && adventure.selectedRoute.kind === 'reward') {
					return '<section class="rogue-coop-battle-select"><h4>' + escape(adventure.selectedRoute.name) + ' · 第 ' + adventure.floor + ' 层</h4>' + lastRewardHTML +
						'<p>补给已分别放入双方背包和钱包。你的当前余额：' + adventure.money + ' 金币。</p><p>' +
						(adventure.routeExitSelection ? '你已确认继续前进' : '你尚未确认继续前进') + '；' +
						(adventure.partnerRouteExitSelection ? '队友已确认。' : '等待队友确认。') + '</p>' +
						button('finishCoopRoute', '', adventure.routeExitSelection ? '已确认继续' : '确认继续前进',
							this.coopBusy || !canControl || adventure.routeExitSelection) + '</section>';
				}
				if (adventure.selectedRoute && adventure.selectedRoute.kind === 'trade') {
					if (adventure.trainingCamp) {
						var renderCamp = function (camp, owner, title) {
							var finished = !camp.offers.some(function (offer) { return offer.remaining; });
							return '<div class="infobox"><h5>' + escape(title) + '</h5><p>余额：' + Number(camp.money) + ' 金币</p>' +
								camp.offers.map(function (offer) { return '<p>' + escape(offer.name) + ' · 每位伙伴每项 +' +
									offer.amount / 100 + '% · ' + offer.price + ' 金币</p>'; }).join('') +
								(camp.locked ? '<p>' + escape(camp.locked) + '</p>' : '') + button('openCoopCamp', owner,
									finished ? '本营地已完成训练' : '安排本次训练', this.coopBusy || !canControl || finished || !!camp.locked) + '</div>';
						}.bind(this);
						var camps = renderCamp(adventure.trainingCamp, this.coopState.userid, '我的训练');
						if (adventure.partnerTrainingCamp) camps += renderCamp(adventure.partnerTrainingCamp, session.partnerUserId, partnerName + '的训练');
						return '<section class="rogue-coop-battle-select"><h4>训练营 · 第 ' + adventure.floor + ' 层</h4>' +
							'<p>双方各用自己的金币，各有一次集训机会；可选择多位伙伴和多个项目。单项个人营地增幅最高 60%，不能训练蛋或融合伙伴。</p>' +
							camps + this.renderCoopRecycling(session) + '<p>' + (adventure.routeExitSelection ? '你已确认离开' : '你尚未确认离开') + '；' +
							(adventure.partnerRouteExitSelection ? '队友已确认。' : '等待队友确认。') + '</p>' +
							button('finishCoopRoute', '', '确认离开并继续', this.coopBusy || !canControl || adventure.routeExitSelection) + '</section>';
					}
					var renderRouteShop = function (items, owner, balance) { return (items || []).map(function (item) {
						var stock = item.remaining === null ? '不限量' : '剩余 ' + item.remaining;
						var selection = owner && owner !== this.coopState.userid ? owner + '|' + item.id : item.id;
						return '<article class="rogue-coop-route"><strong>' + escape(item.name) + '</strong><small>' +
							escape(item.description || item.kind) + ' · ' + item.price + ' 金币 · ' + stock + '</small>' +
							button('buyCoopRest', selection, '购买 1 件', this.coopBusy || !canControl || balance < item.price) + '</article>';
					}, this).join(''); }.bind(this);
					var routeShop = renderRouteShop(adventure.shopItems, this.coopState.userid, adventure.money);
					var buyback = adventure.recycling && adventure.recycling.fullPrice;
					if (session.delegatedTo === this.coopState.userid) routeShop += '<h5>' + escape(partnerName) + '的商店选项</h5>' +
						renderRouteShop(adventure.partnerShopItems, session.partnerUserId, adventure.partnerMoney);
					return '<section class="rogue-coop-battle-select"><h4>' + escape(adventure.selectedRoute.name) + ' · 第 ' + adventure.floor + ' 层</h4>' + lastRewardHTML +
						(buyback ? '<p>按基础回收价兑换背包物品，所得金币归物品持有者。已携带装备、大师球和太晶碎片不在回收范围。</p>' :
							'<p>使用你的独立钱包购买，队友购买不会扣你的金币；该摊位库存由双方共用。当前余额：' + adventure.money + ' 金币。</p>' +
							(routeShop ? '<div class="rogue-coop-routes">' + routeShop + '</div>' : '<p>摊位商品已售完。</p>')) +
						this.renderCoopRecycling(session) +
						'<p>' + (adventure.routeExitSelection ? '你已确认离开交易路线' : '你尚未确认离开') + '；' +
						(adventure.partnerRouteExitSelection ? '队友已确认。' : '等待队友确认。') + '</p>' +
						button('finishCoopRoute', '', adventure.routeExitSelection ? '已确认离开' : '确认离开并继续',
							this.coopBusy || !canControl || adventure.routeExitSelection) + '</section>';
				}
				return '<section class="rogue-coop-battle-select"><h4>共同冒险 · 第 ' + adventure.floor + ' 层</h4>' +
					'<p>该区域的联机交互尚未接入。</p></section>';
			}
			if (adventure.nativePreviewEnabled) return '<section class="rogue-coop-battle-select"><h4>战前准备 · 第 ' + adventure.floor + ' 层</h4>' +
				(adventure.escort ? '<p><strong>护送者：' + escape(adventure.escort.name) + '</strong>。本场由护送者操作拉鲁拉丝，原队伍留在场外；另一人照常选队。获胜时拉鲁拉丝须存活才有谢礼，倒下则护送失败。</p>' : '') +
				(adventure.scrollTrial ? '<p>本次卷轴试炼双方各派已选定的一只伙伴。请在对战画面确认；上方同步显示队友选择，双方确认后开战。</p>' :
					'<p>在对战画面中按出场顺序选择最多 3 只伙伴；上方会同步显示队友的队伍与选择。双方确认后开战。</p>') +
				button('prepareCoopBattle', '', '进入共同战前准备', this.coopBusy || !canControl || !adventure.canRetryTogether) +
				(!adventure.canRetryTogether ? '<p>双方各需要至少一只健康伙伴，请先在队伍中治疗。</p>' : '') + '</section>';
			var selected = this.coopBattleSelection, partnerSelection = this.coopPartnerBattleSelection || [];
			var delegated = session.delegatedTo === (this.coopState && this.coopState.userid);
			var bag = adventure.bag || {};
			var bagSummary = Object.keys(bag).filter(function (id) { return bag[id] > 0; }).map(function (id) {
				return escape(rogueItemName(id)) + ' ×' + bag[id];
			}).join('、') || '暂无道具';
			var renderBattleGroup = function (members, selection, owner, label) {
				var confirmed = owner === this.coopState.userid ? adventure.battleSelection : adventure.partnerBattleSelection;
				var ready = !!confirmed?.length && JSON.stringify(confirmed) === JSON.stringify(selection);
				return '<div class="rogue-coop-own-party"><strong>' + escape(label) + '</strong>' +
					(members || []).map(function (mon) {
						var checked = selection.indexOf(mon.id) >= 0;
						var disabled = this.coopBusy || !canControl || !!mon.egg || mon.hp <= 0 || !checked && selection.length >= 3;
						return '<label class="rogue-coop-battle-mon' + (checked ? ' is-selected' : '') + '"><input type="checkbox" name="coopBattleMon" data-owner="' +
							escape(owner) + '" value="' + escape(mon.id) + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' /><span class="picon" style="' +
							Dex.getPokemonIcon(mon.species) + '"></span><strong>' + escape(localName(mon.species)) + '</strong><small>' +
							(mon.egg ? '距孵化 ' + mon.remainingFloors + ' 层 · 暂不能出战' : 'Lv.' + mon.level +
							' · HP ' + mon.hp + '/' + mon.maxhp + (mon.shiny ? ' · 闪光' : '')) + '</small></label>';
					}, this).join('') + '</div><p class="rogue-coop-pick-status" role="status">已预选 ' + selection.length + ' / 3 · ' +
					(ready ? '已确认出战' : '尚未确认') + '</p>' +
					button('saveCoopBattleSelection', owner, ready ? '已确认' + escape(label) : '确认' + escape(label) + '的出战选择',
						this.coopBusy || !canControl || !selection.length || ready) +
					(ready && adventure.battleSelectionKey ? button('cancelCoopBattleSelection', owner, '撤回确认', this.coopBusy || !canControl) : '');
			}.bind(this);
			var ownUser = this.coopState && this.coopState.userid;
			var battlePickers = renderBattleGroup(adventure.team, selected, ownUser, '我的队伍');
			if (delegated) battlePickers += renderBattleGroup(adventure.partnerTeam, partnerSelection, session.partnerUserId, '队友队伍');
			var html = '<section class="rogue-coop-battle-select"><h4>共同冒险 · 第 ' + adventure.floor + ' 层</h4>' + lastRewardHTML +
				(adventure.selectedRoute ? '<p>共同路线：' + escape(adventure.selectedRoute.name) + '</p>' : '') +
				'<p>每位玩家从自己的队伍选择 1～3 只；两队在原生 Multi 中各自操作。你的独立钱包：' + adventure.money + ' 金币；背包：' + bagSummary +
				(delegated ? '；当前由你代为选择双方队伍。' : session.delegatedTo ? '；操作权已移交，当前为只读。' : '') + '</p>' +
				'<div class="rogue-coop-partner-preview"><strong>' +
				(adventure.battleSelectionKey ? '队友实时预选' : '队友出战选择') + ' · ' + partnerSelection.length + ' / 3 · ' +
				(adventure.partnerBattleSelection?.length ? '已确认' : '尚未确认') + '</strong><div>' +
				(adventure.partnerTeam || []).map(function (mon) {
					return '<span class="rogue-coop-party-icon' + (partnerSelection.indexOf(mon.id) >= 0 ? ' is-selected' : '') + '" title="' +
						escape(localName(mon.species)) + (partnerSelection.indexOf(mon.id) >= 0 ? ' · 已选' : '') + '" style="' +
						Dex.getPokemonIcon(mon.species) + '"></span>';
				}).join('') + '</div></div>' + battlePickers +
				(adventure.battleSelection?.length && adventure.partnerBattleSelection?.length ?
					'<p class="infobox" role="status">双方出战选择已保存，正在准备共同战斗。</p>' :
					'<p class="rogue-caption">' + (adventure.battleSelectionKey ?
						'勾选、取消会实时同步给队友；双方确认后才开战。修改阵容会撤销本人的确认。' : '确认后同步出战阵容。') +
						'每方最多 3 只。</p>') + '</section>';
			return html;
		},
		renderCoop: function () {
			if (!this.state || this.state.coopEnabled !== true) {
				return '<section class="rogue-coop"><p>联机游玩暂未开放，请先体验单人冒险。</p>' +
					button('startMenu', '', '返回开始页') + '</section>';
			}
			var state = this.coopState, userid = app.user.get('userid'), maxDifficulty = state && Number.isInteger(state.maxDifficulty) ? state.maxDifficulty : 0;
			var html = '<section class="rogue-coop"><header><span class="rogue-caption">两位玩家 · 共同推进同一段旅途</span><h2>联机游玩</h2>' +
				button('startMenu', '', '返回开始页', false, fa('arrow-left')) + button('coopRefresh', '', '刷新在线列表', this.coopBusy, fa('refresh')) + '</header>';
			if (this.coopMessage) html += '<p class="message-error" role="alert">' + escape(this.coopMessage) + '</p>';
			if (this.coopNotice) { html += '<p class="infobox" role="status">' + escape(this.coopNotice) + '</p>'; this.coopNotice = ''; }
			if (!state) return html + '<p role="status">正在读取在线玩家与联机邀请…</p></section>';
			html += '<p class="rogue-caption">只显示在线、已登录且符合所选档位的玩家。共同推进区域和战斗，战利品双方各得一份；队伍、金币与捕获独立保存。联机不进入秘闻主线。</p>';
			if (state.session) {
				var session = state.session;
				var partnerName = session.role === 'host' ? session.guestName : session.hostName;
				var ownID = state.userid;
				html += '<article class="rogue-coop-session"><h3>已与 ' + escape(session.role === 'host' ? session.guestName : session.hostName) + ' 建立大厅</h3>' +
					'<p>第 ' + session.difficulty + ' 档 · ' + (session.status === 'lobby' ? '等待共同开局' : session.status === 'paused' ? '进度已暂停' : '联机进行中') + '</p>' +
					(session.partnerOnline === false ? '<p role="status">队友目前离线。共同进度保留，等待队友重新连接；不会自动替其出招或购买恢复。</p>' : '') +
					(['active', 'paused'].indexOf(session.status) >= 0 ? '<div class="rogue-coop-delegation"><strong>' + (session.delegatedTo ?
						'全部操作权：' + (session.delegatedTo === ownID ? '你' : escape(session.delegatedToName || '队友')) : '全部操作权：双方自主') + '</strong><p>' +
						(session.delegatedTo ? '接收方可以代为提交双方的肉鸽选择与战斗指令；任何一方都可以撤销移交。' :
						'可以将后续肉鸽选择与战斗指令交给队友；任何一方都能随时撤销移交。') + '</p>' +
						button('delegateCoopControl', session.delegatedTo ? 'revoke' : 'partner', session.delegatedTo ? '撤销操作权移交' : '将全部操作权交给队友', this.coopBusy) + '</div>' : '') +
					(session.status === 'lobby' ? '<div class="rogue-coop-starter"><h4>选择你的初始队伍</h4><p>按你账号现有栏位与解锁记录选择；队友也会看到你的选择。</p>' +
					(this.coopState.starters && this.coopState.starters.length ? '<div class="rogue-coop-starter-list">' + this.coopState.starters.map(function (starter) {
						var selected = this.coopStarterSelection.indexOf(starter.id) >= 0;
						var used = this.coopStarterSelection.reduce(function (sum, id) {
							var chosen = this.coopState.starters.find(function (entry) { return entry.id === id; }); return sum + (chosen ? chosen.slotCost : 0);
						}.bind(this), 0);
						var disabled = this.coopBusy || !starter.available || !selected && used + starter.slotCost > state.starterSlots;
						return '<label class="rogue-coop-starter-option' + (!starter.available ? ' is-locked' : '') + '"><input type="checkbox" name="coopStarter" value="' + escape(starter.id) + '"' +
							(selected ? ' checked' : '') + (disabled ? ' disabled' : '') + ' /><span class="picon" style="' + Dex.getPokemonIcon(starter.species) + '"></span><strong>' +
							escape(localName(starter.species)) + '</strong><small>' + (starter.available ? '占 ' + starter.slotCost + ' 格' : '尚未解锁') + '</small></label>';
					}, this).join('') + '</div>' : '<p>正在读取初始队伍选项…</p>') +
					'<p>已用 ' + this.coopStarterSelection.reduce(function (sum, id) {
						var chosen = (this.coopState.starters || []).find(function (entry) { return entry.id === id; }); return sum + (chosen ? chosen.slotCost : 0);
					}.bind(this), 0) + ' / ' + (state.starterSlots || 0) + ' 格；队友“' + escape(partnerName) + '”已选择 ' +
					(session.partnerStarterSelection || []).map(function (id) {
						var starter = (this.coopState.starters || []).find(function (entry) { return entry.id === id; }); return starter ? localName(starter.species) : id;
					}, this).map(escape).join('、') + '</p>' + button('saveCoopStarters', '', '配置并保存初始队伍', this.coopBusy || !this.coopStarterSelection.length) +
					'<p class="rogue-caption">双方初始宝可梦与配置分别保存；不会改动各自原有单人存档。</p></div>' : '') +
					this.renderCoopStoryRecovery(session) +
					(session.status === 'active' && (!session.storyRecovery || session.storyRecovery.pending) ?
						this.renderCoopAdventure(session) + this.renderCoopBonds(session) +
						(session.adventure && session.adventure.coopAffection ? '' : this.renderCoopRelease(session) +
							this.renderCoopRecovery(session) + this.renderCoopMoveTraining(session) + this.renderCoopInventory(session)) : '') +
					(session.status === 'paused' ? '<p>共同进度已保留。双方上线后可继续；中断的对战会从已保存的状态恢复。</p>' +
						button('resumeCoop', session.id, '继续共同冒险', this.coopBusy || session.partnerOnline === false) : '') +
					this.renderCoopExit(session) +
					button('leaveCoop', session.id, session.status === 'lobby' ? '退出大厅' : '暂停并离开', this.coopBusy || !!session.exitProposal) + '</article>';
			}
			var invitations = state.invitations || [];
			if (invitations.length) html += '<section class="rogue-coop-invites"><h3>待处理邀请</h3>' + invitations.map(function (invite) {
				var incoming = invite.toUser === userid;
				return '<article><strong>' + escape(incoming ? invite.fromName : invite.toName) + '</strong><span> · 第 ' + invite.difficulty + ' 档 · 五分钟内有效</span><div>' +
					(incoming ? button('acceptCoopInvite', invite.id, '接受邀请', this.coopBusy) + button('declineCoopInvite', invite.id, '拒绝') : button('cancelCoopInvite', invite.id, '撤回邀请')) +
					'</div></article>';
			}, this).join('') + '</section>';
			if (!state.session) {
				html += '<section class="rogue-coop-find"><h3>寻找队友</h3><label>本局档位：<select name="coopDifficulty"' + (this.coopBusy ? ' disabled' : '') + '>' +
					[0, 1, 2, 3, 4, 5].map(function (tier) { return '<option value="' + tier + '"' + (tier === this.coopDifficulty ? ' selected' : '') + (tier > maxDifficulty ? ' disabled' : '') + '>第 ' + tier + ' 档' + (tier > maxDifficulty ? '（尚未解锁）' : '') + '</option>'; }, this).join('') + '</select></label>' +
					'<div class="rogue-coop-search"><label>按名称筛选：<input name="coopSearch" maxlength="24" value="' + escape(this.coopSearchText) + '" placeholder="输入在线玩家名称" /></label>' +
					button('searchCoop', '', '搜索在线玩家', this.coopBusy, fa('search')) + '</div>' +
					'<div class="rogue-coop-manual"><label>直接输入玩家名称：<input name="coopTarget" maxlength="24" placeholder="玩家名称" /></label>' +
					button('inviteCoopByName', '', '发送联机申请', this.coopBusy, fa('users')) + '</div>';
				var players = state.players || [];
				html += players.length ? '<ul>' + players.map(function (player) { return '<li><span><strong>' + escape(player.name) + '</strong><small>最高已解锁第 ' + player.maxDifficulty + ' 档</small></span>' +
					button('inviteCoopPlayer', player.userid, '邀请 · 第 ' + this.coopDifficulty + ' 档', this.coopBusy || this.coopDifficulty > player.maxDifficulty) + '</li>'; }, this).join('') + '</ul>' : '<p class="rogue-caption">当前没有匹配的在线玩家；可按名称搜索，或直接输入玩家名称。</p>';
				html += '</section>';
			}
			return html + '</section>';
		},
		toggleReading: function () { this.readingWide = !this.readingWide; this.render(); app.updateLayout(); },
		maybeShowOnboarding: function () {
			var account = this.state && this.state.account, userid = app.user.get('userid');
			var key = userid + ':' + (this.state && this.state.beginnerGuideVersion || 'initial');
			if (!account || !account.needsOnboarding || this.onboardingPopupUser === key) return;
			this.onboardingPopupUser = key;
			app.addPopup(globals.RogueOnboardingPopup, {room: this, userid: userid});
		},
		scrollCodexTop: function () {},
		openCodex: function (section) {
			if (['guide', 'blessings', 'events', 'stories'].indexOf(section) < 0) return;
			this.screen = section; this.codexFilter = section === 'guide' ? 'beginner' : 'all';
			this.codexCollection = 'regions';
			this.codexQuery = ''; this.codexPage = 0; this.codexReplay = null;
			this.readingWide = false;
			this.loadCodex(section); this.render(); app.updateLayout(); this.scrollCodexTop();
		},
		loadCodex: function (section) {
			if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyroguecodex ' + section);
		},
		receiveCodex: function (data) {
			if (!data || data.userid !== app.user.get('userid') || ['guide', 'blessings', 'events', 'stories'].indexOf(data.section) < 0) return;
			if (this.state && this.state.contentVersion && data.contentVersion && this.state.contentVersion !== data.contentVersion) return;
			var old = this.codices[data.section];
			if (old && old.contentVersion === data.contentVersion && old.revision > data.revision) return;
			this.codices[data.section] = data;
			if (data.moveCategoryHelp) moveCategoryHelp = data.moveCategoryHelp;
			if (data.blessingSupplyHelp) blessingSupplyHelp = data.blessingSupplyHelp;
			if (this.screen === data.section) this.render();
		},
		filterCodex: function (filter) { this.codexFilter = filter; this.codexPage = 0; this.render(); },
		filterCodexType: function (event) { this.codexType = event.currentTarget.value; this.codexPage = 0; this.render(); },
		filterStarterType: function (event) { this.starterType = event.currentTarget.value; this.render(); },
		selectCodexCollection: function (collection) {
			if (['regions', 'companions'].indexOf(collection) < 0) return;
			this.codexCollection = collection; this.codexFilter = 'all'; this.codexPage = 0;
			this.codexReplay = null; this.render();
		},
		codexSearchInput: function (event) { this.codexQuery = event.currentTarget.value.trim(); if (!this.codexQuery) { this.codexPage = 0; this.render(); } },
		codexSearchModeChanged: function (event) { this.codexSearchMode = event.currentTarget.value; this.searchCodex(); },
		jumpBlessing: function (family) {
			family = ['topclearmind', 'godrobe', 'puregodrobe'].indexOf(family) >= 0 ? family : 'topclearmind';
			this.codexFilter = 'all'; this.codexQuery = '';
			var entries = (this.codices.blessings || {}).entries || [];
			var index = entries.findIndex(function (entry) { return entry.family === family; });
			if (index < 0) return; this.codexPage = Math.floor(index / 12); this.render();
			var target = this.$('[data-codex-family=' + family + ']')[0]; if (target) target.scrollIntoView({block: 'center'});
		},
		searchCodex: function () { this.codexQuery = this.$el.find('input[name=codexSearch]').val().trim(); this.codexPage = 0; this.render(); },
		codexSearchKey: function (event) { if (event.key === 'Enter') { event.preventDefault(); this.searchCodex(); } },
		pageCodex: function (page) { this.codexPage = Math.max(0, Number(page) || 0); this.render(); this.scrollCodexTop(); },
		readEvent: function (id) {
			var entry = ((this.codices[this.screen] || {}).entries || []).find(function (event) { return event.id === id; });
			if (!entry || !entry.unlocked || !entry.replay) return;
			this.codexReplay = entry.replay; this.codexReplayHistory = [entry.replay.start];
			this.render(); this.scrollCodexTop();
		},
		replayEventNext: function (key) {
			var replay = this.codexReplay, history = this.codexReplayHistory;
			if (!replay || !history || !replay.pages[history[history.length - 1]].options.some(function (option) { return option.next === key; })) return;
			history.push(key); this.render(); this.scrollCodexTop();
		},
		replayEventBack: function () {
			if (this.codexReplayHistory && this.codexReplayHistory.length > 1) this.codexReplayHistory.pop();
			this.render();
		},
		replayEventRestart: function () { if (this.codexReplay) this.codexReplayHistory = [this.codexReplay.start]; this.render(); },
		closeEventReplay: function () { this.codexReplay = null; this.render(); },
		maybeShowSpirit: function () {
			var run = this.state && this.state.run;
			if (this.screen === 'game' && run && run.phase === 'intro' && run.spirit &&
				(!run.story || run.story.stage === 'spiritEffect') && this.spiritPopupRun !== run.id) {
				this.spiritPopupRun = run.id; this.showSpirit();
			}
			if (this.screen === 'game' && run && this.state.story && this.state.story.stage === 'charmeffect' &&
				this.charmPopupRun !== run.id) {
				this.charmPopupRun = run.id; this.showCharm();
			}
		},
		maybeShowUnlock: function () {
			var account = this.state && this.state.account;
			if (!account || account.needsOnboarding || this.pending || this.screen !== 'game' || app.curRoom && app.curRoom !== this) return;
			var notice = (account.unlockNotices || [])[0], userid = app.user.get('userid');
			if (!notice || this.unlockPopupKey === userid + ':' + notice.id) return;
			this.unlockPopupKey = userid + ':' + notice.id;
			app.addPopup(globals.RogueUnlockPopup, {room: this, notice: notice});
		},
		receiveState: function (state, storyOnly) {
			if (!state || state.userid !== app.user.get('userid')) return;
			if (state.protocolVersion !== 1 && state.protocolVersion !== 2) { this.error = '请刷新客户端以更新肉鸽页面。'; this.render(); return; }
			if (this.state && this.state.account && state.account && state.account.revision < this.state.account.revision) return;
			var codexChanged = this.state && this.state.contentVersion !== state.contentVersion;
			if (codexChanged) { this.codices = {}; this.codexReplay = null; }
			var previous = this.state && this.state.run;
			var incoming = state.run;
			if (previous && !incoming) this.screen = 'home';
			if (previous && incoming && previous.id === incoming.id && previous.phase !== 'complete' && incoming.phase === 'complete') this.celebrationRun = incoming.id;
			if (!incoming || !(incoming.pendingMoves || []).length) this.revealedMove = null;
			if (incoming && (!previous || previous.id !== incoming.id)) this.openPartyOnLayout = true;
			if (!previous || !incoming || previous.id !== incoming.id || previous.floor !== incoming.floor ||
				previous.phase !== incoming.phase || this.state.account.revision !== state.account.revision) {
				this.selectedRoute = null;
				this.selectedBlessing = null;
			}
			this.trackAffectionGains(previous, incoming);
			this.state = state;
			if (state.coopEnabled !== true) {
				this.coopState = null; this.coopBusy = false; this.coopRefreshPending = false;
				if (this.screen === 'coop') this.screen = 'home';
			}
			this.syncCrates();
			if (state.moveCategoryHelp) moveCategoryHelp = state.moveCategoryHelp;
			referenceItems = state.items || [];
			if (state.blessingSupplyHelp) blessingSupplyHelp = state.blessingSupplyHelp;
			if (codexChanged && ['guide', 'blessings', 'events', 'stories'].indexOf(this.screen) >= 0) this.loadCodex(this.screen);
			if (state.account && state.account.needsOnboarding && this.screen === 'game') this.screen = 'home';
			if (this.$el[0] && this.$el[0].setAttribute) this.$el[0].setAttribute('aria-busy', this.pending ? 'true' : 'false');
			this.normalizeStarters();
			this.render(storyOnly === true);
			// Finish the last native battle animation before entering the saved ending.
			if (state.story && (state.story.stage === 'ending' || state.story.ending) && previous && previous.roomid &&
				incoming && incoming.id === previous.id) {
				var finalBattle = app.rooms[previous.roomid];
				if (finalBattle && finalBattle.fantasyRogue && finalBattle.fantasyRogue.userid === state.userid) {
					finalBattle.fantasyRogueEnding = true;
					finalBattle.updateControls();
				}
			}
			if (app.curRoom === this && !storyOnly) app.updateLayout();
			this.maybeShowSpirit();
			this.maybeShowUnlock();
			this.maybeShowAdmission();
			if (incoming && incoming.phase === 'defeated' && incoming.failure && this.failurePopupKey !== incoming.failure.key) {
				this.failurePopupKey = incoming.failure.key;
				app.addPopup(globals.RogueFailurePopup, {room: this, failure: incoming.failure, runid: incoming.id});
			}
			this.startFishingClock(); this.startSkiClock(); this.startActivityClock(); this.maybeShowEvolution();
			if (this.visible || app.curRoom === this) this.maybeShowOnboarding();
		},
		receiveAction: function (result) {
			if (result.userid !== app.user.get('userid') || !this.pending || result.id !== this.pending.id) return;
			var action = this.pending.action;
			var evolution = this.evolutionPreview;
			this.evolutionPreview = null;
			clearTimeout(this.timer);
			this.pending = null;
			this.error = result.ok ? '' : result.message;
			if (action === 'opencrate' || action === 'exchangecrate' || action === 'crateprediction') {
				this.crateIntent = null;
				if (this.cratePopup) this.cratePopup.error = this.error;
			}
			this.openingEvolutionAnimation = !!(result.ok && action === 'evolve' && evolution);
			if (!result.ok && action === 'unlockack') this.unlockPopupKey = null;
			if (result.ok && ['ackfailure', 'abandon', 'newstory'].indexOf(action) >= 0) this.screen = 'home';
			if (result.state) this.receiveState(result.state, action === 'storynext' || action === 'storyskip');
			else this.refresh();
			if (action === 'opencrate' || action === 'exchangecrate' || action === 'crateprediction') this.loadCrates();
			if (result.ok && ['battle', 'retryheal'].indexOf(action) >= 0 && result.state && result.state.run && result.state.run.roomid) app.joinRoom(result.state.run.roomid);
			if (result.ok && action === 'event' && result.state && result.state.run && result.state.run.event && result.state.run.event.exchange) {
				var exchange = result.state.run.event.exchange;
				if (this.exchangeKey !== result.state.run.event.key) {
					this.exchangeKey = result.state.run.event.key;
					app.addPopup(globals.RogueExchangeAnimationPopup, {exchange: exchange});
				}
			}
			if (result.ok && action === 'evolve' && evolution && result.state && result.state.run &&
				result.state.run.id === evolution.runid) {
				var evolved = result.state.run.team.find(function (mon) { return mon.id === evolution.member; });
				if (evolved && evolved.set.species !== evolution.before.species) {
					app.addPopup(globals.RogueEvolutionAnimationPopup, {
						room: this, member: evolved.id, before: evolution.before, after: evolved.set
					});
				}
			}
			this.openingEvolutionAnimation = false;
			this.revealPendingMove(); this.maybeShowEvolution();
		},
		submit: function (action, details) {
			if (this.pending || this.skiPending || !this.state || !this.state.account) return;
			if (!app.socket || app.socket.readyState !== 1) { this.disconnected(); return; }
			var command = Object.assign({
				id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
				revision: this.state.account.revision, action: action
			}, details || {});
			this.pending = command;
			this.evolutionPreview = null;
			if (action === 'evolve' && this.state.run) {
				var mon = this.state.run.team.find(function (member) { return member.id === command.member; });
				if (mon) this.evolutionPreview = {runid: this.state.run.id, member: mon.id, before: Object.assign({}, mon.set)};
			}
			this.error = '';
			this.sendPending();
		},
		sendPending: function () {
			if (!this.pending) return;
			var story = this.pending.action === 'storynext' || this.pending.action === 'storyskip';
			app.send('/fantasyrogue ' + (story ? 'story ' : 'action ') + JSON.stringify(this.pending));
			clearTimeout(this.timer);
			var self = this;
			this.timer = setTimeout(function () {
				self.error = '尚未收到操作结果，可刷新存档或重发同一请求。';
				if (self.cratePopup) self.cratePopup.render();
				self.refresh();
			}, 10000);
			// Pending requests only lock controls; avoid replacing the current screen.
			var root = this.$el && this.$el[0];
			if (root && root.setAttribute && root.querySelectorAll) {
				root.setAttribute('aria-busy', 'true');
				Array.prototype.forEach.call(root.querySelectorAll('button, input, select'), function (control) { control.disabled = true; });
			} else this.render(story);
		},
		act: function (value) {
			var separator = value.indexOf(':');
			var parts = separator < 0 ? [value] : [value.slice(0, separator), value.slice(separator + 1)];
			var run = this.state.run;
			if (parts[0] === 'sell' && run && run.node && run.node.trade && run.node.trade.kind === 'buyback') {
				var sold = this.state.items.filter(function (item) { return (parts[1] === 'all' || item.id === parts[1]) && run.bag[item.id] > 0 && item.recyclePrice; });
				var total = sold.reduce(function (sum, item) { return sum + run.bag[item.id] * item.recyclePrice; }, 0);
				app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'sell', details: {value: parts[1]}, title: '确认原价回收',
					text: '出售' + (parts[1] === 'all' ? '背包中的全部可回收物品（包括恢复道具、精灵球和装备）' : '这类物品的全部库存') + '，获得 ' + total + ' 金币？已装备的物品不在此次回收中。'}); return;
			}
			this.submit(parts[0], {value: parts[1]});
		},
		companionAction: function (value) {
			var parts = value.split('|');
			this.submit('companion', {member: parts[0], value: parts[1]});
		},
		socialCompanionAction: function (value) {
			var parts = value.split('|');
			this.submit('socialcompanion', {member: parts[0], value: parts[1]});
		},
		companionInviteAction: function (value) {
			var invite = this.state.run && this.state.run.companionInvitation;
			if (invite) this.submit('companioninvite', {member: invite.key, value: value});
		},
		affectionAction: function (value) { var p = value.split('|'); this.submit('affection', {member: p[0], value: p[1]}); },
		renderCoopAffection: function (session) {
			var scene = session.adventure && session.adventure.coopAffection;
			if (!scene) return '';
			var busy = this.coopBusy || session.canControl === false;
			var label = function (choice) {
				var option = scene.options.find(function (entry) { return entry.id === choice; });
				return option ? option.name : '尚未选择';
			};
			return '<article class="rogue-affection-scene"><h3>' + escape(scene.title) + '</h3>' +
				'<div class="rogue-affection-portrait" style="' + portraitStyle(scene.id) + '"></div><h4>' +
				escape(scene.name) + ' · 好感度 ' + Number(scene.stage) + '</h4><p>' + escape(scene.ownerName) +
				'的同行心意。双方共同选择回应；好感度与赠礼保存在该玩家本局中。</p>' +
				(scene.narration ? '<p class="rogue-dialogue-copy">' + dialogueText(scene.narration) + '</p>' : '') +
				'<p>' + dialogueText(scene.text, true) + '</p><div>' + scene.options.map(function (option) {
					return button('chooseCoopAffection', option.id, '', busy, dialogueText(option.name, true));
				}).join('') + '</div><p role="status">你的选择：' + escape(label(scene.ownChoice)) +
				'；队友选择：' + escape(label(scene.partnerChoice)) + '</p>' +
				button('chooseCoopAffection', 'cancel', '取消我的预选', busy || !scene.ownChoice) + '</article>';
		},
		renderCoopBonds: function (session) {
			var adventure = session.adventure;
			if (!adventure) return '';
			var own = this.renderTrainerBonds({trainerBonds: adventure.trainerBonds || []}, true);
			var partner = this.renderTrainerBonds({trainerBonds: adventure.partnerTrainerBonds || []}, true);
			var roster = function (list) { return (list || []).map(function (person) { return escape(person.name); }).join('、'); };
			if (adventure.travellingRoster && adventure.travellingRoster.length) own = '<p>正在同行：' + roster(adventure.travellingRoster) + '</p>' + own;
			if (adventure.partnerTravellingRoster && adventure.partnerTravellingRoster.length) partner = '<p>正在同行：' + roster(adventure.partnerTravellingRoster) + '</p>' + partner;
			return own || partner ? '<section class="rogue-coop-battle-select">' + (own ? '<h4>我的同行</h4>' + own : '') +
				(partner ? '<h4>队友的同行</h4>' + partner : '') + '</section>' : '';
		},
		renderTrainerBonds: function (run, busy) {
			if (!(run.trainerBonds || []).length) return '';
			return '<details class="rogue-bonds"><summary><b>同行心意 · 好感度</b></summary><p>随队前进、专属奇遇与偏好选择增进好感。50／100 点每局各赠礼一次，新旅途重新积累；同行条件仍由原有奇遇与祝福决定。</p>' + run.trainerBonds.map(function (b) {
				return '<article><strong>' + escape(b.name) + '</strong>' + resourceMeter('好感度', b.score, 100, b.active ? '正在同行' : '本局相识') +
					(b.relationship ? '<span class="rogue-bond-relationship">' + ({couple: '恋人', bestfriend: '挚友', oldfriend: '忘年交'}[b.relationship] || '') + '</span>' : '') +
					'</article>';
			}).join('') + '</details>';
		},
		renderCompanionInvitation: function (invite, busy, owner) {
			var action = function (value, label) {
				return button(owner ? 'chooseCoopInvite' : 'companionInviteAction', owner ? owner + '|' + value : value, label, busy);
			};
			return '<section class="rogue-companion-invitation" role="dialog" aria-label="同行邀请"><h3>' +
				escape(invite.name) + '希望与你同行</h3><p>所有同行共用两个名额。告别保留已获得的永久奖励，暂停该人物的在队增益。</p>' +
				(invite.roster.length >= 2 ? invite.roster.map(function (c) {
					return action(c.id, '向' + c.name + '告别，接受邀请');
				}).join('') : action('accept', '接受同行')) + action('decline', '这次暂不同行') + '</section>';
		},
		renderCompanions: function (run, busy) {
			var companions = run.companions || [], selected = run.selectedCompanions || companions.map(function (c) { return c.id; });
			var locked = busy || !!run.companionInvitation || run.phase === 'battle' || run.preview && run.preview.stage === 'result';
			var html = '';
			var self = this;
			if (run.blessings && run.blessings.owned.some(function (b) { return b.family === 'companionai'; }) &&
				!selected.some(function (id) { return id === 'sada' || id === 'turo'; })) {
				html += '<div class="rogue-companion-choice"><strong>选择同行训练家</strong><div class="rogue-companions">' +
					[['sada', '奥琳 AI'], ['turo', '弗图 AI']].map(function (entry) {
						return '<button class="button rogue-companion-pick" name="companionAction" value="' + entry[0] + '|chooseai"' + (locked ? ' disabled' : '') +
							'><span class="rogue-companion-portrait" style="background-image:url(sprites/rogue-companions/' + entry[0] + '.png)"></span><b>' + entry[1] + '</b></button>';
					}).join('') + '</div></div>';
			}
			if (run.blessings && run.blessings.owned.some(function (b) { return b.family === 'companionstreamer'; }) &&
				!selected.some(function (id) { return id === 'iono' || id === 'canari'; })) {
				html += '<div class="rogue-companion-choice"><strong>选择同行训练家</strong><div class="rogue-companions">' +
					[['iono', '奇树'], ['canari', '卡娜莉']].map(function (entry) {
						return '<button class="button rogue-companion-pick" name="companionAction" value="' + entry[0] + '|choosestreamer"' + (locked ? ' disabled' : '') +
							'><span class="rogue-companion-portrait" style="background-image:url(sprites/rogue-companions/' + entry[0] + '.png)"></span><b>' + entry[1] + '</b></button>';
					}).join('') + '</div></div>';
			}
			if (run.blessings && run.blessings.owned.some(function (b) { return b.family === 'companionwinter'; }) && !selected.some(function (id) { return id === 'grusha' || id === 'rika'; })) {
				html += '<div class="rogue-companion-choice"><strong>选择同行训练家</strong><p>缺少对应属性伙伴时，额外特性将在之后赋予。</p><div class="rogue-companions">' + [['grusha', '古鲁夏'], ['rika', '辛俐']].map(function (entry) { return '<button class="button rogue-companion-pick" name="companionAction" value="' + entry[0] + '|choosewinter"' + (locked ? ' disabled' : '') + '><span class="rogue-companion-portrait" style="background-image:url(sprites/rogue-companions/' + entry[0] + '.png)"></span><b>' + entry[1] + '</b></button>'; }).join('') + '</div></div>';
			}
			if (run.blessings && run.blessings.owned.some(function (b) { return b.family === 'companionband'; }) && !selected.some(function (id) { return id === 'marnie' || id === 'roxie'; })) {
				html += '<div class="rogue-companion-choice"><strong>选择同行训练家</strong><p>缺少对应属性伙伴时，额外特性将在之后赋予。</p><div class="rogue-companions">' + [['marnie', '玛俐'], ['roxie', '霍米加']].filter(function (entry) { return !run.rival || run.rival.id !== entry[0]; }).map(function (entry) {
					return '<button class="button rogue-companion-pick" name="companionAction" value="' + entry[0] + '|chooseband"' + (locked ? ' disabled' : '') + '><span class="rogue-companion-portrait" style="' + portraitStyle(entry[0]) + '"></span><b>' + entry[1] + '</b></button>';
				}).join('') + '</div></div>';
			}
			(run.rivalCompanions || (run.rivalCompanion ? [run.rivalCompanion] : [])).forEach(function (rival) {
				if ((run.socialCompanions || []).some(function (c) { return c.id === rival.id; })) return;
				var art = portraitFile(rival.id);
				html += '<article class="rogue-companion rogue-rival-companion"><span class="rogue-portrait-anchor">' + (art ? '<span class="rogue-companion-portrait" style="' + portraitStyle(rival.id) + '"></span>' : '<img class="rogue-rival-native" src="' + escape(Dex.resolveAvatar(rival.id)) + '" alt="" />') + self.affectionGainBadge(rival.id) + '</span><div class="rogue-companion-copy"><strong>' + escape(rival.name) + ' · 劲敌</strong><small>' + escape(rival.text) + ' · 好感度 ' + rival.affection + '</small><p>' + dialogueText(rival.message, true) + '</p></div></article>';
			});
			(run.socialCompanions || []).forEach(function (c) {
				var art = portraitFile(c.id);
				html += '<article class="rogue-companion"><span class="rogue-portrait-anchor">' + (art ? '<span class="rogue-companion-portrait" style="' + portraitStyle(c.id) +
					'"></span>' : '<img class="rogue-rival-native" src="' + escape(Dex.resolveAvatar(c.id)) + '" alt="' + escape(c.name) + '" />') +
					self.affectionGainBadge(c.id) + '</span><div class="rogue-companion-copy"><strong>' + escape(c.name) + ' · 常驻同行</strong><small>偏好' +
					escape(c.region) + '相关、' + ({battle: '战斗', reward: '奖励', pokemon: '宝可梦'}[c.preference] || '') +
					'选项；喜欢' + escape((c.areas || []).map(function (id) { return kindNames[id] || id; }).join('、')) + '区域</small>' + button('socialCompanionAction', c.id + '|chat', '闲聊', locked) +
					(c.canConsult ? button('socialCompanionAction', c.id + '|advice', '听听建议', locked) : '') +
					(c.message ? '<p>' + dialogueText(c.message, true) + '</p>' : '') +
					'' +
					(c.giftOptions || []).map(function (gift) {
						return button('socialCompanionAction', c.id + '|gift:' + gift.id, '领取【' + gift.name + '】', locked);
					}).join('') + '</div></article>';
			});
			if (!companions.length) return html;
			return html + '<section class="rogue-companions" aria-label="同行训练家">' + companions.map(function (c) {
				var chat = c.smile && c.smileUntil, seconds = chat ? Math.max(0, (c.smileUntil - Date.now()) / 1000) : 0;
				var portrait = portraitStyle(c.id);
				var out = '<article class="rogue-companion"><span class="rogue-portrait-anchor"><button class="rogue-companion-portrait' + (c.smile ? ' smiling' : '') + (chat ? ' chatting' : '') +
					'" name="companionAction" value="' + c.id + '|chat" title="与' + escape(c.name) + '闲聊" aria-label="与' + escape(c.name) + '闲聊" style="' +
					portrait + 'animation-duration:' + seconds + 's"' + (locked ? ' disabled' : '') + '></button>' + self.affectionGainBadge(c.id) + '</span><div class="rogue-companion-copy"><strong>' + escape(c.name) + '</strong>';
				if (c.canConsult) out += button('companionAction', c.id + '|advice', '你想听听我的建议吗？', locked);
				if (c.message) out += '<p class="rogue-companion-speech">' + dialogueText(c.message, true) + '</p>';
				(c.giftOptions || []).forEach(function (gift) { out += button('companionAction', c.id + '|gift:' + gift.id, '领取【' + gift.name + '】', locked); });
				if (c.zMove) {
					out += '<p class="rogue-caption">额外 Z【' + escape(c.zMove.name) + '】 · 威力 <b>185</b> · ' + escape(localName(c.zMove.type)) + '系' + (c.zMove.category === 'Physical' ? '群攻物理' : '声音特殊') + '。命中后五项能力各 +1；本局一次，逃跑返还。</p>';
					if (c.zGrant) {
						var assigned = (run.team || []).find(function (p) { return p.id === c.zGrant.member; });
						out += '<p>已指定：' + escape(assigned ? localName(assigned.species || assigned.set && assigned.set.species) : '暂不在队伍中的伙伴') + ' · <b>' + (c.zGrant.spent ? '本局已使用' : '本局尚可使用一次') + '</b></p>';
					} else {
						(c.zCandidates || []).forEach(function (p) { out += button('companionAction', c.id + '|z:' + p.id, '为【' + localName(p.species) + '】解锁额外 Z', locked); });
						if (!(c.zCandidates || []).length) out += '<p class="rogue-caption">等待一名对应属性且已装备【' + escape(localName(Dex.moves.get(c.zMove.base).name, 'move')) + '】的伙伴。</p>';
					}
				}
				(c.typeOptions || []).forEach(function (type) {
					out += button('companionAction', c.id + '|type:' + type.id, localName(type.id) + ' · ' + (type.member ? localName(type.member) : '暂无伙伴'), locked || c.type === type.id);
				});
				if (c.member) out += '<p class="rogue-caption">指导伙伴：【' + escape(localName(c.member.species)) + '】' +
					(c.ability ? ' · 额外特性【' + escape(localName(Dex.abilities.get(c.ability).name, 'ability')) + '】' : '') + '</p>';
				(c.abilityOptions || []).forEach(function (id) {
					out += button('companionAction', c.id + '|ability:' + id, (c.ability === id ? '已选【' : '改为【') + localName(Dex.abilities.get(id).name, 'ability') + '】', locked || c.ability === id);
				});
				return out + '</div></article>';
			}).join('') + '</section>';
		},
		normalizeStarters: function () {
			var state = this.state;
			if (!state || !state.account || (state.run && state.run.phase !== 'complete')) {
				this.selectedStarters = []; this.starterBuilds = {}; return;
			}
			var available = (state.starters || []).filter(function (starter) { return starter.available; }), used = 0;
			this.selectedStarters = this.selectedStarters.filter(function (id) {
				var starter = available.find(function (s) { return s.id === id; });
				if (!starter || used + (starter.slotCost || 1) > state.account.slots) return false;
				used += starter.slotCost || 1; return true;
			});
			var self = this;
			Object.keys(this.starterBuilds).forEach(function (id) {
				if (self.selectedStarters.indexOf(id) < 0) delete self.starterBuilds[id];
			});
		},
		starterSlotsUsed: function () {
			var starters = this.state.starters || [];
			return this.selectedStarters.reduce(function (sum, id) {
				var starter = starters.find(function (s) { return s.id === id; });
				return sum + (starter && starter.slotCost || 1);
			}, 0);
		},
		changeStarter: function (event) {
			if (!this.state || !this.state.account || this.pending) return;
			this.normalizeStarters();
			var input = event.currentTarget;
			var index = this.selectedStarters.indexOf(input.value);
			var available = this.state.starters.some(function (starter) { return starter.id === input.value && starter.available; });
			var candidate = this.state.starters.find(function (s) { return s.id === input.value; });
			var added = input.checked && available && index < 0 && this.starterSlotsUsed() + (candidate.slotCost || 1) <= this.state.account.slots;
			if (added) {
				this.selectedStarters.push(input.value);
				var starter = this.state.starters.find(function (entry) { return entry.id === input.value; });
				this.starterBuilds[input.value] = {nature: 'random', gender: 'random', ability: 'random',
					ivs: Object.assign({}, starterTraits(starter).ivs.max)};
			}
			if (!input.checked && index >= 0) this.selectedStarters.splice(index, 1);
			var chosen = this.selectedStarters, used = this.starterSlotsUsed(), remaining = this.state.account.slots - used, starters = this.state.starters;
			this.$('input[name=starter]').each(function () {
				this.checked = chosen.indexOf(this.value) >= 0;
				var starter = starters.find(function (s) { return s.id === this.value; }, this);
				this.disabled = !this.checked && (starter && starter.slotCost || 1) > remaining;
				this.parentElement.classList.toggle('is-disabled', this.disabled);
			});
			this.$('.rogue-starter-count').text('已选 ' + chosen.length + ' 只 · 已用 ' + used + ' / ' + this.state.account.slots + ' 个初始名额');
			this.$('button[name=confirmStarters]').prop('disabled', !chosen.length || !this.state.configured);
			this.render();
		},
		confirmStarters: function () {
			this.normalizeStarters();
			if (this.pending || !this.state || !this.state.configured || !this.selectedStarters.length) return;
			app.addPopup(globals.RogueStarterPopup, {room: this, starters: this.selectedStarters.slice()});
		},
		chooseRoute: function (id) {
			var run = this.state && this.state.run;
			if (this.pending || !run || run.phase !== 'choose' || run.pendingCapture || (run.pendingMoves || []).length ||
				!app.socket || app.socket.readyState !== 1 || !(run.choices || []).some(function (node) { return node.id === id; })) return;
			if (this.selectedRoute === id) { this.submit('select', {value: id}); return; }
			this.selectedRoute = id;
			this.$('.rogue-route').each(function () {
				var selected = this.value === id;
				this.classList.toggle('is-selected', selected);
				this.setAttribute('aria-pressed', String(selected));
				this.querySelector('.rogue-route-hint').textContent = selected ? '已选中 · 再点一次进入' : '点击选中';
			});
		},
		startAdventure: function () {
			this.normalizeStarters();
			if (!this.selectedStarters.length) return;
			var count = (Number(this.state.account.preferredDifficulty) || 0) * 2;
			if (this.state.collapseEntries && count && (this.selectedCollapse || []).length !== count) {
				this.error = '请先选择 ' + count + ' 条不同的幻想崩坏词条。'; this.render(); return;
			}
			var details = {starters: this.selectedStarters.slice(), starterBuilds: this.starterBuilds, useSpirit: !!this.useSpirit};
			if (this.state.collapseEntries) details.collapse = count ? this.selectedCollapse.slice() : [];
			if (this.useSpirit && this.state.localSpirits && this.testSpirit) details.testSpirit = this.testSpirit;
			else if (this.useSpirit && this.selectedSpirit) details.selectedSpirit = this.selectedSpirit;
			this.submit('start', details);
		},
		storyReply: function (choice) { if (this.state.story) this.submit('mainlinechoice', {value: this.state.story.key, member: choice}); },
		storyNext: function () { if (this.state.story) this.submit('storynext', {value: this.state.story.key}); },
		acknowledgeFailure: function (key) {
			var run = this.state && this.state.run;
			if (run && run.phase === 'defeated' && run.failure && run.failure.key === key) this.submit('ackfailure', {value: key});
		},
		storySkip: function () { if (this.state.story) this.submit('storyskip', {value: this.state.story.key}); },
		chooseCharm: function (value) { this.submit('charm', {value: value}); },
		changeDifficulty: function (event) {
			this.selectedCollapse = [];
			this.useSpirit = false; this.testSpirit = ''; this.selectedSpirit = '';
			this.submit('setdifficulty', {value: event.currentTarget.value});
		},
		changeNuzlocke: function (event) {
			this.submit('setnuzlocke', {value: event.currentTarget.checked ? 'on' : 'off'});
		},
		releaseDescription: function (mon, replacement) {
			var quote = replacement ? mon.replacementRelease : mon.release;
			return '确认放生' + localName(mon.species || mon.set.species) + '？本局无法找回，永久解锁仍保留。' +
				(quote && quote.experience ? '返还经验糖果，共 ' + quote.experience + ' 经验：' +
					Object.keys(quote.items).map(function (id) { return localName(id, 'item') + ' ×' + quote.items[id]; }).join('、') + '。' :
					'未达到最小经验糖果门槛，不返还糖果。') + '携带道具与属性转会放回背包。';
		},
		releaseMember: function (id) {
			var mon = this.state.run.team.find(function (entry) { return entry.id === id; });
			if (!mon || !mon.release || mon.release.reason) return;
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'release', details: {member: id, confirmed: true},
				text: this.releaseDescription(mon)});
		},
		changeCollapse: function (event) {
			if (this.pending || this.state.run && this.state.run.phase !== 'complete') return;
			var id = event.currentTarget.value, selected = this.selectedCollapse || [];
			this.selectedCollapse = selected.indexOf(id) >= 0 ? selected.filter(function (value) { return value !== id; }) : selected.concat(id);
			this.render();
		},
		toggleCollapseDetail: function (id) {
			var expanded = this.collapseDetails || (this.collapseDetails = Object.create(null));
			expanded[id] = !expanded[id];
			this.render();
		},
		renderCollapse: function (run, busy) {
			var entries = this.state.collapseEntries || [], ongoing = run && run.phase !== 'complete';
			var tier = ongoing ? run.difficulty : this.state.account.preferredDifficulty;
			if (!entries.length || !Number(tier)) return '';
			if (ongoing && (run.difficultyRulesVersion || 1) < 2) return '<p class="rogue-caption">本局保留原难度规则；下次冒险可自选幻想崩坏词条。</p>';
			var chosen = ongoing ? run.collapse || [] : this.selectedCollapse || [], count = Number(tier) * 2;
			var expanded = this.collapseDetails || {};
			return '<section class="rogue-collapse-panel"><h4>' + fa('shield') + '<strong>幻想崩坏</strong><small>' + chosen.length + ' / ' + count + ' 点' +
				(ongoing ? ' · 本局锁定' : '') + '</small></h4><p>每条 1 点，各选一次。所选战斗与资源规则整局生效，开局后不能更换。</p>' +
				'<div class="rogue-collapse-list">' + entries.filter(function (e) { return !ongoing || chosen.indexOf(e.id) >= 0; }).map(function (e) {
					var checked = chosen.indexOf(e.id) >= 0;
					return '<article class="rogue-collapse-entry' + (checked ? ' is-selected' : '') + '"><label>' +
						(ongoing ? '' : '<input type="checkbox" name="collapse" value="' + e.id + '"' + (checked ? ' checked' : '') +
						(busy || !checked && chosen.length >= count ? ' disabled' : '') + ' />') + '<strong>' + escape(e.name) + '</strong></label>' +
						'<p>' + blessingText(e.text) + '</p><button class="rogue-collapse-toggle" name="toggleCollapseDetail" value="' + escape(e.id) +
						'" aria-expanded="' + !!expanded[e.id] + '" aria-controls="rogue-collapse-detail-' + escape(e.id) + '">' +
						(expanded[e.id] ? '▾' : '▸') + ' 详细说明</button><div class="rogue-collapse-detail" id="rogue-collapse-detail-' + escape(e.id) + '"' +
						(expanded[e.id] ? '' : ' hidden') + '><p>' + blessingText(e.detail) + '</p></div></article>';
				}).join('') + '</div></section>';
		},
		setStarterLayout: function (layout) {
			this.starterLayout = layout === 'generations' ? 'generations' : 'flat';
			this.render();
		},
		storyBattle: function () {
			var story = this.state.story;
			if (story && story.stage === 'bossintro' && story.battleReady) this.submit('battle', {value: story.key});
		},
		storyChapter: function (story) {
			return story.stage === 'mainline' ? '记忆' : story.stage === 'restguide' ? '休整' : story.stage === 'leaguebriefing' ? '接下来的挑战' : story.stage === 'bossintro' ? '战前' : story.stage === 'gymgift' ? '途中' :
				story.stage === 'interlude' ? '旅途对话' : story.stage === 'ending' ? '终章' : story.stage === 'godinvite' ? '通关之后' : '序章';
		},
		storyHint: function (story) {
			return (story.options ? '请选择你的回应' : story.battleReady ? '请选择下方操作' : '轻点继续 ▷') + ' · ' + (story.index + 1) + '/' + story.total;
		},
		storyActions: function (story, busy) {
			if (story.options) return '<div class="rogue-mainline-options">' + story.options.map(function (option) {
				return button('storyReply', option.id, '', busy, dialogueText(String(option.label).replace(/【([^】]+)】/g, function (_, name) { return '【' + localName(name) + '】'; })));
			}).join('') + '</div>';
			if (story.stage === 'mainline' && !story.canSkip) return '<span class="rogue-caption">轻点文字，继续这段旅程</span>';
			if (story.stage === 'restguide') return button(story.index === story.total - 1 ? 'storyNext' : 'storySkip', '',
				story.index === story.total - 1 ? '领取补给，继续准备' : '跳过对话并领取补给', busy);
			if (story.battleReady) return button('storyBattle', '', '开始吧', busy) +
				' ' + button('storyNext', '', '再让我准备一下', busy);
			return story.canSkip ? button('storySkip', '', story.stage === 'bossintro' || story.stage === 'gymgift' ? '跳过对话' : '跳过剧情', busy) :
				'<span class="rogue-caption">首次冒险 · 轻点文字继续，下次可跳过剧情</span>';
		},
		cycleCard: function (direction) {
			if (this.pending || !this.state.story || this.state.story.stage !== 'cards') return;
			var count = this.state.story.cards.length;
			this.startCardIndex = ((this.startCardIndex || 0) + Number(direction) + count) % count;
			this.render();
			this.$('.rogue-start-deck').trigger('focus');
		},
		cardKey: function (event) {
			if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
				event.preventDefault(); this.cycleCard(event.key === 'ArrowLeft' ? '-1' : '1');
			}
		},
		pickStartCard: function (id) { this.submit('startcard', {value: id}); },
		updateStory: function (story, busy) {
			// Keep the scene, dialogue button and scroll position alive while saving
			// and turning pages. Replacing the room made every click jump vertically.
			var section = this.$el[0] && this.$el[0].querySelector('.rogue-story');
			if (!section || !story || story.stage === 'cards' || this.error || this.storyHadError) return false;
			var signature = this.storySignature(story);
			if (section.dataset.story !== signature) return false;
			var spirit = this.state.run && this.state.run.spirit;
			section.setAttribute('aria-label', story.title);
			section.querySelector('.rogue-story-scene').className = 'rogue-story-scene scene-' + story.scene;
			section.querySelector('.rogue-story-chapter').textContent = this.storyChapter(story) + ' / ' + story.title;
			var art = section.querySelector('.rogue-story-art');
			var artKey = this.storyArtKey(story);
			if (art && art.dataset.roster !== artKey) {
				art.innerHTML = this.storyArt(story);
				art.dataset.roster = artKey;
			}
			var actor = art && art.querySelector('.rogue-dialogue-actor');
			if (actor) actor.classList.toggle('is-approval', story.expression === 'approval');
			if (actor && story.affection !== undefined) {
				actor.title = '当前好感度：' + story.affection;
				var popup = this.affectionPopup(story);
				if (popup && actor.insertAdjacentHTML) actor.insertAdjacentHTML('beforeend', popup);
			}
			var dialogue = section.querySelector('.rogue-story-dialogue');
			dialogue.disabled = busy || !!story.battleReady || !!story.options;
			dialogue.setAttribute('aria-busy', String(busy));
			dialogue.querySelector('strong').textContent = story.speaker || (story.scene === 'spirit' && spirit ? spirit.name : story.title);
			dialogue.querySelector('span').innerHTML = dialogueText(story.text);
			dialogue.querySelector('small').textContent = this.storyHint(story);
			var actions = section.querySelector('.rogue-story-actions');
			if (actions) actions.innerHTML = this.storyActions(story, busy);
			var skip = section.querySelector('button[name=storySkip]');
			if (skip) skip.disabled = busy;
			return true;
		},
		storySignature: function (story) {
			return [this.state.userid, this.state.run && this.state.run.id || '', story.stage, !!story.canSkip,
				story.encounter || '', story.performance || '', story.stage === 'interlude' ? '' : story.avatar || '', story.pokemon || ''].join(':');
		},
		storyArtKey: function (story) { return JSON.stringify([story.roster || null, story.portrait || '', story.side || 'right']); },
		trackAffectionGains: function (previous, incoming) {
			if (!previous || !incoming || previous.id !== incoming.id) { this.affectionGains = {}; return; }
			var self = this;
			this.affectionGains = this.affectionGains || {};
			(incoming.trainerBonds || []).forEach(function (bond) {
				var old = (previous.trainerBonds || []).find(function (entry) { return entry.id === bond.id; });
				if (!bond.lastGain || old && old.lastGain && old.lastGain.receipt === bond.lastGain.receipt) return;
				var amount = bond.score - (old ? old.score : 0);
				if (amount > 0) self.affectionGains[bond.id] = {amount: amount, until: Date.now() + 4000};
			});
		},
		affectionGainBadge: function (id) {
			var gain = this.affectionGains && this.affectionGains[id];
			return gain && gain.until > Date.now() ? '<span class="rogue-affection-gain" role="status">好感度 +' + Number(gain.amount) + '</span>' : '';
		},
		affectionPopup: function (story) {
			return this.affectionGainBadge(story.portrait);
		},
		storyArt: function (story) {
			if (story.roster) {
				var roster = story.roster;
				return '<div class="rogue-story-roster"><div class="rogue-roster-leader">' +
					(roster.avatar ? '<img alt="' + escape(roster.name) + '" src="' + escape(Dex.resolveAvatar(roster.avatar)) + '" />' : '') +
					'<strong>' + escape(localName(roster.name)) + '</strong></div><div class="rogue-roster-members">' +
					roster.pokemon.map(function (name, index) { return '<div class="rogue-roster-member"><div aria-hidden="true" style="' +
						Dex.getTeambuilderSprite({species: name}) + '"></div><span>' + escape(localName(name)) + (roster.levels ? ' · Lv.' + roster.levels[index] : '') + (index < (roster.escorts || 0) ? ' · 跟班' : '') + '</span></div>'; }).join('') + '</div></div>';
			}
			if (story.portrait) {
				var id = story.portrait, file = portraitFile(id);
				var affinity = this.affectionPopup(story);
				var actor = '<div role="img" aria-label="' + escape(story.speaker || story.title) + '" class="rogue-dialogue-actor side-' +
					(story.side === 'left' ? 'left' : 'right') + (story.expression === 'approval' ? ' is-approval' : '') +
					'"' + (story.affection !== undefined ? ' title="当前好感度：' + Number(story.affection) + '"' : '');
				if (id === 'mewtwo') return actor + '>' + affinity + croppedMewtwo('rogue-dialogue-single') + '</div>';
				if (singlePortraits[id]) return actor + '>' + affinity + '<img class="rogue-dialogue-single" alt="" src="' + singlePortraits[id] + '" /></div>';
				if (file) return actor + ' style="' + portraitStyle(id) + '">' + affinity + '</div>';
				return actor + '>' + affinity + (story.pokemon ? '<div class="rogue-story-pokemon" aria-hidden="true" style="' +
					Dex.getTeambuilderSprite({species: story.pokemon}) + '"></div>' :
					'<img class="rogue-story-trainer" alt="" src="' + escape(Dex.resolveAvatar(story.avatar || id)) + '" />') + '</div>';
			}
			var spirit = this.state.run && this.state.run.spirit;
			if (story.pokemon) return '<div class="rogue-story-pokemon" aria-hidden="true" style="' + Dex.getTeambuilderSprite({species: story.pokemon}) + '"></div>';
			if (story.avatar) return '<img class="rogue-story-trainer" alt="" src="' + escape(Dex.resolveAvatar(story.avatar)) + '" />';
			return story.scene === 'spirit' && spirit ? '<div class="rogue-story-spirit" style="' + Dex.getTeambuilderSprite({species: spirit.species}) + '"></div>' : '';
		},
		renderStory: function (story, busy) {
			if (story.stage === 'charm') {
				return '<section class="rogue-charm-offer"><span class="rogue-caption">黑袍老人</span><h3>' + escape(story.title) + '</h3><p>' +
					dialogueText(story.text) + '</p>' + (story.charmProgressNotice ?
						'<aside class="rogue-charm-notice"><strong>简易档 · 跨局收益说明</strong>' +
						charmDescription(story.charmProgressNotice) + '</aside>' : '') + '<div class="rogue-charm-actions">' +
					button('chooseCharm', 'accept', '接过护符（难度降低，推荐新手选择）', busy || story.canAccept === false) +
					button('chooseCharm', 'decline', '谢谢，我想自己试试', busy || story.canDecline === false) + '</div>' +
					(story.canAccept === false || story.canDecline === false ? '<p class="rogue-caption">本次已开启塔灵，只能前往已解锁塔灵的档位。</p>' : '') + '</section>';
			}
			if (story.stage === 'charmeffect') {
				return '<section class="rogue-charm-received"><p>护符已收入背包。查看庇佑效果后，就可以继续前行。</p>' +
					button('showCharm', '', '查看护符庇佑', busy, charmIcon()) + '</section>';
			}
			if (story.stage === 'cards') {
				var index = this.startCardIndex || 0, card = story.cards[index];
				var html = '<section class="rogue-card-choice"><span class="rogue-caption">黑袍人的赠礼</span><h3>你喜欢什么属性的宝可梦？</h3>' +
					'<p>左右切换卡片，点击亮边的卡片收入背包。</p><div class="rogue-start-deck" tabindex="0" aria-label="用左右方向键挑选开局卡片">';
				for (var i = 3; i > 0; i--) html += '<div class="rogue-card-back" style="--stack:' + i + '" aria-hidden="true">◇</div>';
				html += '<button name="pickStartCard" value="' + card.id + '" class="rogue-start-card"' + (busy ? ' disabled' : '') + '>' +
					'<span class="rogue-card-symbol">' + (card.type ? typeIcons([card.type]) : '✧') + '</span><strong>' + escape(card.name) +
					'</strong><span>' + escape(card.text) + '</span><small>已选中 · 轻点收下</small></button></div><div class="rogue-card-navigation">' +
					button('cycleCard', '-1', '← 上一张', busy) + '<span>' + (index + 1) + ' / 19</span>' + button('cycleCard', '1', '下一张 →', busy) + '</div></section>';
				return html;
			}
			var spirit = this.state.run && this.state.run.spirit;
			var art = '<div class="rogue-story-art" data-roster="' + escape(this.storyArtKey(story)) + '">' + this.storyArt(story) + '</div>';
			return '<section class="rogue-story" data-story="' + escape(this.storySignature(story)) + '" aria-label="' + escape(story.title) + '"><div class="rogue-story-scene scene-' + story.scene + '">' +
				'<span class="rogue-story-chapter">' + this.storyChapter(story) + ' / ' + escape(story.title) + '</span>' +
				'<div class="rogue-story-window"></div><div class="rogue-story-letter">求救信</div><div class="rogue-story-figure"></div>' +
				'<div class="rogue-story-portal"></div>' + art + '</div><button name="storyNext" class="rogue-story-dialogue"' + (busy || story.battleReady || story.options ? ' disabled' : '') + '>' +
				'<strong>' + escape(story.speaker || (story.scene === 'spirit' && spirit ? spirit.name : story.title)) + '</strong>' +
				'<span>' + dialogueText(story.text) + '</span><small>' + this.storyHint(story) +
				'</small></button><div class="rogue-story-actions">' + this.storyActions(story, busy) + '</div></section>';
		},
		changeSpirit: function (event) {
			this.useSpirit = this.$('input[name=useSpirit]').prop('checked');
			this.testSpirit = this.$('select[name=testSpirit]').val() || '';
			this.selectedSpirit = this.$('select[name=selectedSpirit]').val() || '';
			if (event && event.target.name === 'selectedSpirit') this.testSpirit = '';
			if (event && event.target.name === 'testSpirit') this.selectedSpirit = '';
			this.render();
		},
		showSpirit: function () {
			if (this.state && this.state.run && this.state.run.spirit) app.addPopup(globals.RogueSpiritPopup, {room: this});
		},
		showCharm: function () {
			if (this.state && this.state.run && this.state.run.charm) app.addPopup(globals.RogueCharmPopup, {room: this});
		},
		trimParty: function (id) { this.submit('trimparty', {member: id}); },
		changeHPTarget: function () { this.hpTarget = this.$('select[name=hpTarget]').val(); this.render(); },
		buyWithHP: function (id) {
			var buyer = this.state.run.team.find(function (mon) { return mon.id === this.hpTarget; }, this) || this.state.run.team[0];
			this.submit('buyhp', {value: id, member: buyer.id});
		},
		treasureQuantity: function (value) {
			var parts = value.split(':'), item = this.state.items.find(function (i) { return i.id === parts[1]; });
			if (item) app.addPopup(globals.RogueTreasurePopup, {room: this, item: item, mode: parts[0], member: this.selectedPokemon()});
		},
		buyItems: function (id) {
			var item = this.state.items.find(function (entry) { return entry.id === id; });
			if (item) app.addPopup(globals.RogueBuyPopup, {room: this, item: item});
		},
		jumpShopGroup: function (value) {
			if (!/^[0-9]+$/.test(value)) return;
			var target = this.$('[data-shop-category="' + value + '"]')[0];
			// Let the browser find the actual scroll container, including the side-room layout.
			if (target) target.scrollIntoView({block: 'start', behavior: 'smooth'});
		},
		boxMember: function (id) {
			var target = this.$('select[name=boxTarget]').val() || '';
			this.submit('box', {member: id, value: target});
		},
		mergeMember: function (id) { app.addPopup(globals.RogueMergePopup, {room: this, member: id}); },
		useItem: function (id) {
			var mon = this.selectedPokemon();
			if (!mon) return;
			var item = this.state.items.find(function (entry) { return entry.id === id; });
			if (item && item.kind === 'candy') {
				app.addPopup(globals.RogueCandyPopup, {room: this, member: mon, item: item});
				return;
			}
			if (item && item.kind === 'crown') {
				app.addPopup(globals.RogueCrownPopup, {room: this, member: mon, item: item}); return;
			}
			if (item && item.kind === 'tonic') {
				app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'use', details: {value: id, member: mon.id},
					title: '为' + localName(mon.set.species) + '使用' + item.name, text: item.description});
				return;
			}
			if (item && item.singleMove) {
				app.addPopup(globals.RogueEtherPopup, {room: this, member: mon, item: item});
				return;
			}
			this.submit('use', {value: id, member: mon.id});
		},
		changeItemTarget: function (event) { this.selectMember(event.currentTarget.value); },
		chooseDragonKing: function (ability) {
			var king = this.state.run.blessings && this.state.run.blessings.dragonKing;
			if (king && (!king.options || king.options.indexOf(ability) >= 0)) this.submit('dragonking', {member: king.member, value: ability});
		},
		renderDragonKing: function (run, busy) {
			var king = run.blessings && run.blessings.dragonKing;
			if (!king) return '';
			var locked = busy || !(editable(run) || run.phase === 'blessing');
			var options = king.options || ['longzhihuxi', 'drizzle'];
			return '<div class="rogue-keepsake rogue-dragon-king"><strong>' + fa('trophy') + '龙王 · ' + escape(localName(king.species)) +
				'</strong><p>六项常驻能力合计 ' + king.total + ' · ' + (king.ability ? '额外特性：' + (king.ability === 'drizzle' ? '降雨' : '龙之呼吸') : options.length ? '请选择额外特性' : '已具备两种特性，无需重复赋予') +
				'</p>' + options.map(function (id) { return button('chooseDragonKing', id, id === 'drizzle' ? '降雨' : '龙之呼吸', locked || king.ability === id); }).join(' ') +
				'<p class="rogue-caption">其余龙系伙伴战斗经验 +30%。额外特性可在战斗外随时更换。战斗中倒下会由剩余最强龙系临时继任；战后恢复队伍龙王。</p></div>';
		},
		learnMove: function (slot) {
			var move = this.state.run.pendingMoves[0];
			if (move) this.submit('learn', {value: slot, member: move.member});
		},
		replaceMember: function (id) {
			var run = this.state.run, pending = run.pendingCapture;
			if (!pending) return;
			var mon = run.team.find(function (entry) { return entry.id === id; });
			if (mon && (!mon.replacementRelease || mon.replacementRelease.reason)) return;
			if (id === 'join') { this.submit('replace', {value: id, member: pending.id}); return; }
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'replace',
				details: {member: pending.id, value: id, confirmed: true}, title: '确认新伙伴的去向',
				text: mon ? this.releaseDescription(mon, true) + '放生后接纳' + localName(pending.set.species) + '。' :
					'不接纳' + localName(pending.set.species) + '？捕捉解锁保留，不返还糖果。'});
		},
		evolveMember: function (value) {
			var parts = value.split('|');
			if (!this.pending && evolutionEditable(this.state.run)) {
				app.addPopup(globals.RogueEvolutionPopup, {room: this, member: parts[0], target: parts[1]});
			}
		},
		showEvolutionChoices: function (member) {
			if (!this.pending && evolutionEditable(this.state.run)) {
				app.addPopup(globals.RogueEvolutionPopup, {room: this, member: member});
			}
		},
		askAbandon: function () { this.abandonPrompt = true; this.render(); },
		cancelAbandon: function () { this.abandonPrompt = false; this.render(); },
		abandon: function () { this.abandonPrompt = false; this.submit('abandon'); },
		selectedPokemon: function () {
			var team = this.state.run.team;
			return team.filter(function (mon) { return mon.id === this.selectedMember; }, this)[0] || team[0];
		},
		selectMember: function (id) { this.selectedMember = id; this.itemTarget = id; this.error = ''; this.render(); },
		showExtraAbilities: function (id) {
			var mon = this.state && this.state.run && this.state.run.team.find(function (entry) { return entry.id === id; });
			if (mon && extraAbilityIds(mon).length) app.addPopup(globals.RogueExtraAbilitiesPopup, {member: mon});
		},
		editSection: function (value) {
			var parts = value.split(':');
			this.editPanel = parts[0];
			if (parts[0] === 'moves') this.moveSlot = Number(parts[1] || 0);
			this.render();
		},
		openHeldItems: function () {
			this.editSection('items');
			this.$('.rogue-editor-options')[0].scrollIntoView({block: 'nearest'});
		},
		openEmblems: function () {
			this.editSection('emblems');
			this.$('.rogue-editor-options')[0].scrollIntoView({block: 'nearest'});
		},
		healMember: function (id) { this.submit('partyheal', {member: id}); },
		moveMember: function (direction) {
			var team = this.state.run.team;
			var mon = this.selectedPokemon();
			var index = team.indexOf(mon), next = index + Number(direction);
			if (next < 0 || next >= team.length) return;
			var order = team.map(function (member) { return member.id; });
			order[index] = order[next]; order[next] = mon.id;
			this.submit('order', {order: order});
		},
		moveSlotUp: function (slot) {
			var mon = this.selectedPokemon();
			var order = mon.set.moves.map(idOf);
			var index = Number(slot);
			if (index <= 0 || index >= order.length) return;
			var previous = order[index - 1]; order[index - 1] = order[index]; order[index] = previous;
			this.moveSlot = index - 1;
			this.submit('moves', {member: mon.id, order: order});
		},
		chooseMove: function (id) {
			this.submit('setmove', {member: this.selectedPokemon().id, slot: this.moveSlot || 0, value: id});
		},
		chooseAbility: function (id) { this.submit('ability', {member: this.selectedPokemon().id, value: id}); },
		useFormItem: function (id) { this.submit('forme', {member: this.selectedPokemon().id, value: id}); },
		equipItem: function (id) { this.submit('equip', {member: this.selectedPokemon().id, value: id}); },
		equipEmblem: function (value) {
			var parts = value.split('|'), command = {member: this.selectedPokemon().id, value: parts[0]};
			if (parts.length > 1) command.slot = Number(parts[1]);
			this.submit('equipemblem', command);
		},
		applyEVs: function () {
			var evs = {}, self = this;
			Object.keys(statNames).forEach(function (stat) { evs[stat] = Number(self.$('input[name=ev-' + stat + ']').val()); });
			this.submit('evs', {member: this.selectedPokemon().id, evs: evs});
		},
		changeUniversalItem: function () {
			this.universalItem = this.$('select[name=universalItem]').val();
			this.universalDraft = null;
			this.render();
		},
		updateUniversalAllocation: function () {
			var mon = this.selectedPokemon(), id = this.$('select[name=universalItem]').val();
			var data = (mon.universalOptions || []).find(function (item) { return item.id === id; });
			updateUniversalFields(this, mon, data, !!this.pending || !editable(this.state.run) ||
				!!mon.nuzlockeDead || !!this.state.run.healingLocked);
		},
		applyUniversal: function () {
			this.updateUniversalAllocation();
			var mon = this.selectedPokemon(), draft = this.universalDraft;
			if (!draft || this.$('button[name=applyUniversal]').prop('disabled')) return;
			this.submit('configureuniversal', {member: mon.id, value: this.$('select[name=universalItem]').val(), evs: draft.bonus, aura: draft.aura || undefined});
		},
		renderUniversalConfig: function (mon, locked) {
			return universalConfigHTML(mon, locked, this.universalItem, this.universalDraft);
		},
		blessingOption: function (slot) {
			var run = this.state && this.state.run;
			if (this.pending || !run || run.phase !== 'blessing' || !app.socket || app.socket.readyState !== 1) return null;
			var state = run.blessings;
			if (!state || !state.round || state.stage || (state.pending || []).length || !Number.isInteger(Number(slot))) return null;
			var option = state.round.options[Number(slot)];
			return option && !option.chosen ? option : null;
		},
		chooseBlessing: function (slot) {
			if (!this.blessingOption(slot)) return;
			slot = Number(slot);
			if (this.selectedBlessing === slot) { this.submit('blessing', {slot: slot}); return; }
			this.selectedBlessing = slot;
			this.$('.rogue-blessing-card').each(function () {
				var selected = Number(this.value) === slot;
				this.classList.toggle('is-selected', selected);
				this.setAttribute('aria-pressed', String(selected));
				if (!this.classList.contains('is-chosen')) {
					this.querySelector('.rogue-route-hint').textContent = selected ? '已选中 · 再点一次领取' : '点击选中';
				}
			});
		},
		refreshBlessing: function (slot) {
			var option = this.blessingOption(slot);
			if (!option || !option.refreshes) return;
			this.selectedBlessing = null;
			this.submit('blessingrefresh', {slot: Number(slot)});
		},
		changeBlessingQuality: function () {
			this.selectedBlessing = null;
			this.submit('blessingquality');
		},
		chooseBlessingUpgrade: function (value) { this.submit('blessing', {value: value}); },
		chooseLongBlessingReward: function () { this.chooseBlessingReward(this.$('select[name=blessingRewardItem]').val()); },
		challengeShop: function () {
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'shopchallenge', title: '发起零元购挑战',
				text: '发起战斗后将无法返回本店。挑战结算后，商店区域关闭并进入下一层，未领取的首领战前增幅与未购买的商品将无法再处理。请先领完增幅、买好需要的商品，再挑战守卫。获胜可随机获得店内三种商品，各 1 件。',
				confirmText: '已准备好，挑战守卫', cancelText: '返回商店'});
		},
		chooseBlessingReward: function (value) {
			var run = this.state.run, pending = run.blessings.pending[0];
			if (!pending) return;
			if (pending.kind === 'gift' && value === 'join' && run.team.length >= run.partyLimit) {
				this.giftReplace = pending.id; this.render();
				app.addPopup(globals.RogueNoticePopup, {text: '队伍已满。必须先选择并确认放生一位旧伙伴，才能接纳新伙伴。'}); return;
            }
            if (value === 'back' && pending.kind === 'gift') { this.giftReplace = null; this.render(); return; }
            var replaced = run.team.filter(function (mon) { return mon.id === value; })[0];
			if (pending.kind === 'gift' && (value === 'release' || replaced)) {
				var departing = replaced || pending.pokemon;
				var bound = run.blessings.owned.filter(function (entry) { return entry.target === departing.id; });
				app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'blessingreward', title: '确认伙伴去向',
					details: {member: pending.id, value: value, confirmed: true}, text: (replaced ? this.releaseDescription(replaced, true) +
					'随后接纳新伙伴。' : '不接纳' + localName(departing.set.species) + '？不返还糖果。') +
					(bound.length ? '这只伙伴绑定了“' + bound.map(function (entry) { return entry.name; }).join('、') + '”，放走后无法找回。' : '')});
				return;
			}
			this.submit('blessingreward', {member: pending.id, value: value});
		},
		updateCompoundAllocation: function () {
			var reward = this.state.run.blessings.pending[0], total = 0, valid = true, bonus = {};
			this.$('.rogue-compound-allocation input').each(function () {
				var stat = this.name.slice(9), n = Number(this.value); bonus[stat] = n;
				valid = valid && Number.isSafeInteger(n) && n >= 0; total += n;
				$(this).closest('tr').find('.rogue-compound-final-stat').text((reward.compound.baseStats[stat] || 0) + n);
			});
			this.compoundDraft = {key: reward.id + reward.compound.member + reward.compound.final, bonus: bonus};
			this.$('.rogue-compound-remaining').text('剩余可分配：' + (reward.compound.points - total) + ' 点');
			this.$('button[name=applyCompound]').prop('disabled', !valid || total !== reward.compound.points || !!this.pending);
		},
		applyCompound: function () {
			this.updateCompoundAllocation();
			var reward = this.state.run.blessings.pending[0], bonus = this.compoundDraft.bonus;
			if (!Object.keys(statNames).every(function (stat) { return Number.isSafeInteger(bonus[stat]) && bonus[stat] >= 0; })) return;
			if (Object.keys(bonus).reduce(function (sum, stat) { return sum + bonus[stat]; }, 0) !== reward.compound.points) return;
			this.submit('blessingreward', {member: reward.id, value: 'allocate', evs: bonus});
		},
		renderCompound: function (run, reward, busy) {
			var data = reward.compound, html = '<p>选择伙伴与最终进化方向后，分配新增种族值。主特性改为【化学之力】，额外特性保留。</p>';
			if (data.stage !== 'allocate') {
				html += '<p>' + (data.stage === 'member' ? '选择一位符合条件的伙伴：' : '选择最终形态，之后只能沿这个方向进化：') + '</p><div class="rogue-member-choices">';
				(reward.options || []).forEach(function (option) {
					var member = run.team.find(function (mon) { return mon.id === option.id; });
					html += member ? memberChoice('chooseBlessingReward', option.id, member, busy, '选择这位伙伴') :
						button('chooseBlessingReward', option.id, localName(option.name), busy);
				});
				html += '</div>';
			} else {
				var key = reward.id + data.member + data.final;
				var bonus = this.compoundDraft && this.compoundDraft.key === key ? this.compoundDraft.bonus : {};
				var used = Object.keys(bonus).reduce(function (sum, stat) { return sum + bonus[stat]; }, 0);
				html += '<h4>最终形态：【' + escape(localName(data.final)) + '】 · 新增 ' + data.points + ' 点</h4><p class="rogue-caption">当前形态也会立即获得所分配的新增点数。分配确认后不可重置。</p>' +
					'<table class="rogue-stats rogue-compound-allocation"><thead><tr><th>能力</th><th>最终形态原值</th><th>新增点数</th><th>分配后种族值</th></tr></thead><tbody>';
				Object.keys(statNames).forEach(function (stat) {
					html += '<tr><th>' + statNames[stat] + '</th><td>' + data.baseStats[stat] + '</td><td><input class="textbox" type="number" min="0" max="' + data.points + '" step="1" name="compound-' + stat + '" aria-label="新增' + statNames[stat] + '种族值" value="' + (bonus[stat] || 0) + '"' + (busy ? ' disabled' : '') + ' /></td><td><b class="rogue-compound-final-stat">' + (data.baseStats[stat] + (bonus[stat] || 0)) + '</b></td></tr>';
				});
				html += '</tbody></table><p class="rogue-compound-remaining" aria-live="polite">剩余可分配：' + (data.points - used) + ' 点</p>' + button('applyCompound', '', '确认分配并使用化合物', busy || used !== data.points);
			}
			if (data.stage !== 'member') html += button('chooseBlessingReward', 'back', '重新选择伙伴', busy);
			html += button('chooseBlessingReward', 'store', '暂时收存，稍后使用', busy);
			return html;
		},
		blessingMemberAction: function (value) {
			var parts = value.split(':');
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: parts[0], details: {member: parts.slice(1).join(':')},
				text: parts[0] === 'fantasize' ? '消耗 100 幻想碎片，将该伙伴转换为对应幻想形态？' :
					parts[0] === 'meltanevolve' ? '消耗 400 个美录坦糖果，进化为美录梅塔？' : '为这位圣剑士领取永久额外特性“锋锐”？'});
		},
		fantasizeMember: function (value) {
			var parts = value.split('|'), mon = this.state.run.team.find(function (member) { return member.id === parts[0]; });
			var option = mon && (mon.fantasyOptions || []).find(function (entry) { return entry.species === parts[1]; });
			if (!option) return;
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'fantasize', title: '确认幻想分支与招式变化',
				details: {member: mon.id, value: option.species, confirmed: true}, text: fantasyConversionText(mon.set.species, option)});
		},
		renderBlessingChoice: function (run, busy) {
			var state = run.blessings;
			if (!state) return '<p>正在读取祝福…</p>';
			var tierNames = {silver: '白银', gold: '黄金', prismatic: '棱彩', mixed: '银 · 金 · 彩'};
			var reward = state.pending[0];
			var html = '<h3>' + (state.beforeAdventure ? '启程祝福 · 第一层开战前' : reward && !state.round ? '旅途奖励' : '塔中的祝福') + '</h3>';
			if (reward) {
				html += '<h4>' + escape(reward.title) + '</h4>';
				if (reward.text) html += '<p class="rogue-reward-dialogue">' + blessingText(reward.text) + '</p>';
				if (reward.kind === 'compound') {
					html += this.renderCompound(run, reward, busy);
				} else if (reward.pokemon) {
					var mon = reward.pokemon;
					if (mon.egg) html += '<p>宝可梦蛋 · 再前进 <b>' + mon.remainingFloors + '</b> 层孵化。孵化前占用队伍位置，不能出战或使用道具。</p>';
					else html += '<div class="rogue-blessing-gift"><span class="picon" style="' + Dex.getPokemonIcon(mon.set.species) + '"></span><strong>' +
					escape(localName(mon.set.species)) + '</strong> · Lv.' + mon.set.level + ' · ' + '★'.repeat(mon.stars || 1) + (mon.set.shiny ? ' · 闪光' : '') +
						'<p>' + escape(localName(mon.set.nature)) + ' · ' + escape(localName(mon.set.ability)) + ' · ' + escape({M: '雄性', F: '雌性'}[mon.set.gender] || '无性别') + '</p><p>个体值：' +
						Object.keys(statNames).map(function (key) { return statNames[key] + ' ' + mon.set.ivs[key]; }).join(' / ') + '</p><p>能力值：' +
						Object.keys(statNames).map(function (key) { return statNames[key] + ' ' + ((mon.stats || {})[key] || (key === 'hp' ? mon.maxhp : '—')); }).join(' / ') + '</p><p>' +
						mon.set.moves.map(function (move) { return escape(localName(dex().moves.get(move).name, 'move')); }).join(' / ') + '</p></div>' +
						'<p class="rogue-caption">捕捉解锁已记录。选择新伙伴的去向：</p>';
                    html += '<div class="rogue-partner-actions">';
                    if (this.giftReplace === reward.id && run.team.length >= run.partyLimit) {
                        html += '<p>队伍已满。要让哪一只伙伴离队？</p>';
						html += '<div class="rogue-member-choices">' + run.team.map(function (member) {
							return memberChoice('chooseBlessingReward', member.id, member, busy || !!(member.replacementRelease && member.replacementRelease.reason), '放生并接纳');
						}).join('') + '</div>';
                        html += button('chooseBlessingReward', 'back', '返回', busy);
                    } else html += button('chooseBlessingReward', 'join', '加入队伍', busy) + button('chooseBlessingReward', 'release', '放生', busy);
                    html += '</div>';
				} else {
					html += '<p>请选择一项：</p><div class="' + (['target', 'solo'].indexOf(reward.kind) >= 0 ? 'rogue-member-choices' : 'rogue-blessing-rewards') + '">';
					if (reward.options && reward.options.length > 16) {
						html += '<select name="blessingRewardItem" aria-label="选择奖励道具">' + reward.options.map(function (option) {
							return '<option value="' + escape(option.id) + '">' + escape(localName(option.name)) + '</option>';
						}).join('') + '</select> ' + button('chooseLongBlessingReward', '', '确认领取', busy);
					} else (reward.options || []).forEach(function (option) {
						var member = ['target', 'solo'].indexOf(reward.kind) >= 0 && run.team.find(function (entry) { return entry.id === option.id; });
						html += member ? memberChoice('chooseBlessingReward', option.id, member, busy, '选择这位伙伴') :
							button('chooseBlessingReward', option.id, localName(option.name), busy);
					});
					html += '</div>';
				}
			} else if (state.stage) {
				html += '<p>' + (state.stage.kind === 'direction' ? '选择此后的属性进化方向，随后立即选择一次强化' : '选择本次属性强化') + '</p>';
				if (state.evolutionCosts && state.evolutionCosts.includes(run.floor)) {
					var evolutionCost = (state.deferredLevels || []).find(function (cost) { return cost.floor === run.floor; });
					html += '<p class="rogue-caption">本轮按一份棱彩祝福记录对手加级' + (evolutionCost ? '，从第 ' + evolutionCost.startsAt + ' 层生效' : '') + '，不会因选择方向或强化重复加级。</p>';
				}
				if (state.evolutionBeforeBattle) html += '<p class="rogue-caption">已抵达第 ' + run.floor + ' 层，强化后再挑战本层首领。</p>';
				else if (run.floor === 200) html += '<p class="rogue-caption">完成最后一次强化后保存通关卡。</p>';
				html += '<div class="rogue-evolution-choices' + (state.stage.kind === 'upgrade' ? ' is-upgrade' : '') + '">';
				var directions = {resistance: {icon: 'shield', text: '逐步改善队伍中该属性伙伴的抗性，减轻受到的属性克制。'},
					moves: {icon: 'bolt', text: '提升本属性招式威力、扩大打击面，或解锁招式专属效果。'},
					stats: {icon: 'line-chart', text: '每次从四项能力中选一项，让队伍中该属性伙伴的对应能力提升 15%。'}};
				state.stage.options.forEach(function (option) {
					var info = directions[option.id];
					html += '<button type="button" name="chooseBlessingUpgrade" value="' + escape(option.id) + '" class="rogue-evolution-choice"' +
						(busy ? ' disabled' : '') + '><strong>' + fa(info ? info.icon : 'star') + escape(option.name) + '</strong>' +
						(info ? '<span>' + info.text + '</span>' : '') + '</button>';
				});
				html += '</div>';
			} else if (state.round) {
				var round = state.round;
				var selectedSlot = this.selectedBlessing;
				if (!state.qualityLocked) html += '<div class="rogue-quality-action">' +
					button('changeBlessingQuality', '', state.qualityRerolled ? '本局更换机会已使用' : '更换整批品阶 · 本局 1 次',
						busy || state.qualityRerolled || round.options.some(function (o) { return o.chosen; }), fa('random')) + '</div>';
				html += '<div class="rogue-blessing-intro"><span class="rogue-blessing-tier-badge rogue-blessing-' + round.tier + '">' +
					tierNames[round.tier] + (round.tier === 'mixed' ? '' : '阶') + '</span><span>还可选择 <strong>' + round.remaining + '</strong> 项</span>' +
					'<span class="rogue-caption">点击卡片选中，再点一次领取</span></div>' +
					'<div class="rogue-blessing-options">';
				round.options.forEach(function (option, index) {
					var selected = selectedSlot === index && !option.chosen;
					var tier = option.tier || (round.tier === 'mixed' ? ['silver', 'gold', 'prismatic'][index] : round.tier);
					var stage = Math.max(0, Math.min(3, Math.floor(run.floor / 50)));
					var step = tier === 'silver' ? 0 : tier === 'gold' ? 5 : 10;
					var cost = option.levelCost || {normal: stage * step, boss: (stage + 1) * step};
					var startsAt = cost.startsAt || (run.floor === 1 ? 11 : run.floor + 11);
					html += '<article class="rogue-blessing-option rogue-blessing-' + tier + '"><button type="button" name="chooseBlessing" value="' + index +
						'" class="rogue-route rogue-blessing-card' + (option.chosen ? ' is-chosen' : '') + (selected ? ' is-selected' : '') +
						'" aria-pressed="' + selected + '"' + (busy || option.chosen ? ' disabled' : '') + '>' + cardSelectionMarker() +
						'<span class="rogue-blessing-quality">' + tierNames[tier] + '阶</span>' +
						'<span class="rogue-blessing-art" aria-hidden="true"><span class="rogue-blessing-emblem">' + fa(blessingIcon(option)) + '</span></span>' +
						'<strong class="rogue-blessing-title">' + escape(option.name) + '</strong>' +
						(option.type ? '<span class="rogue-blessing-type">' + escape(localName(option.type)) + '</span>' : '') +
						'<span class="rogue-blessing-description">' + blessingText(option.text) + '</span>' +
						(option.family === 'sound' || option.id === 'sound' ? '<span class="rogue-blessing-description"><b>当前队伍已有 ' + equippedSoundCount(run) + ' 个声音招式，选用后声音伤害 +' + equippedSoundCount(run) * 5 + '%。</b></span>' : '') +
						'<span class="rogue-blessing-cost">' + (cost.boss ? '第 ' + startsAt + ' 层起：固定首领 +' + cost.boss + ' 级 · 普通遭遇 +' + cost.normal + ' 级' : '对手不额外加级') + '</span>' +
						'<span class="rogue-route-hint">' + (option.chosen ? '已获得' : selected ? '已选中 · 再点一次领取' : '点击选中') + '</span></button>' +
						'<div class="rogue-blessing-refresh">' + button('refreshBlessing', String(index), '刷新 ' + option.refreshes + ' 次',
							busy || option.chosen || !option.refreshes, fa('refresh')) + '</div></article>';
				});
				html += '</div><p class="rogue-caption rogue-blessing-note">悬停或点击【】中带下划线的招式、特性、道具和宝可梦名称，可查看详细介绍；招式类别可查看所含招式。<br />每张卡片独立刷新，品质保持不变。<br />' +
					'固定首领包括固定幻想精英、馆主、天王、冠军及最终首领；普通遭遇包括野生宝可梦、随机野生精英和事件 NPC。' +
					'祝福效果立即生效，新增加级延后 10 层：开局从第 11 层，50／100／150 层领取的从第 61／111／161 层生效。此前已生效的加级保持不变。' +
					'加级按每次领取累加，允许超过 100 级；命运赠送的祝福不重复加级，捕捉后移除祝福造成的等级。</p>';
				if (run.floor === 1) html += '<p class="rogue-caption rogue-blessing-note">本层通过祝福获得的伙伴均为 5 级。</p>';
			}
			return html;
		},
		renderBlessings: function (run, busy) {
			var state = run.blessings;
			if (!state) return '';
			var html = '<section class="rogue-owned-blessings"><h3>' + fa('star') + '本局祝福</h3><div class="rogue-resource-panel">' + resourceMeter('幻想碎片', state.shards, 100, '每次幻想化需 100 片，可继续积攒');
			if (run.futureSight) {
				var forecasts = run.futureSight.bosses || (run.futureSight.roster ? [run.futureSight] : []);
				html += '<details class="rogue-future-sight"><summary>未来视 · 后续首领阵容（' + forecasts.length + '）</summary>' +
					(forecasts.length ? forecasts.map(function (boss) {
						return '<details><summary>第 ' + boss.floor + ' 层 · ' + BattleLog.escapeHTML(boss.roster.name) + '</summary>' +
							this.storyArt({roster: boss.roster}) + '</details>';
					}, this).join('') : '<p>本局已没有后续首领区域。</p>') + '</details>';
			}
			if (state.candy || run.team.some(function (mon) { return idOf(mon.set.species) === 'meltan'; })) html += resourceMeter('美录坦糖果', state.candy, 400);
			if (state.owned.some(function (b) { return b.family === 'swords'; })) html += resourceMeter('圣剑使用', state.swordUses, ((state.swordRewards || []).length + 1) * 15, '达到目标可领取锋锐');
			if (state.owned.some(function (b) { return b.family === 'psychic'; })) html += resourceMeter('灵能', state.psychic, 100, '', '%');
			if (state.dogBoosts !== undefined) html += '<p><strong>汪汪队立大功：</strong>当前犬科伙伴登场随机提升 ' + state.dogBoosts + ' 项不同能力各 1 级。</p>';
			if (state.shopping) html += resourceMeter('消费升级', state.shopping.progress, state.shopping.threshold, '累计消费 ' + state.shopping.total + ' 金币 · 达标返还全队经验');
			if (state.sniperTraining) html += resourceMeter('老练狙神 · ' + localName(state.sniperTraining.name), state.sniperTraining.progress,
				state.sniperTraining.required, state.sniperTraining.progress >= state.sniperTraining.required ? '训练完成：射击类招式无视 20% 防御与特防' : '以射击类招式击中要害并击倒对手');
			if (state.lateBloom) html += '<p><strong>大器晚成：</strong>队内 ' + state.lateBloom.count + ' 个不同谱系 · ' +
				Object.keys(state.lateBloom.stats).map(function (stat) { return statNames[stat] + ' +' + Math.round(state.lateBloom.stats[stat] * 100) + '%'; }).join('、') + '</p>';
			if (state.owned.some(function (b) { return b.family === 'sound'; })) {
				var sounds = equippedSoundCount(run);
				html += '<p class="rogue-build-payoff"><strong>全队开麦：</strong>已装备声音招式 ' + sounds + ' 个，当前声音伤害 <b>+' + sounds * 5 + '%</b>。</p>';
			}
			if (state.owned.some(function (b) { return b.family === 'insight'; })) html += '<p><strong>濒死悟道 · 即时收益已生效：</strong>领取时获得活力块 ×10；濒死伙伴仍正常取得应得战斗经验。下方领悟是另行积累的保命资源。</p>';
			if ((state.mushroomPayoffs || []).length) html += '<details class="rogue-build-payoff"><summary>合成大蘑菇 · 背包投喂收益预览</summary><p>将现有小蘑菇、大蘑菇、芳香蘑菇依次全部投给同一伙伴，预计本局额外获得：</p>' + state.mushroomPayoffs.map(function (p) {
				return '<p><strong>' + escape(localName(p.species)) + '</strong> · 双攻 +' + Number((p.offense / 100).toFixed(2)) + '%、双防 +' + Number((p.defense / 100).toFixed(2)) + '%</p>';
			}).join('') + '<p class="rogue-caption">每行分别假设全部投给这一位；蘑菇也可以在商店卖出，实际分配由你决定。</p></details>';
			if ((state.cats || []).length) html += '<details class="rogue-cat-abilities"><summary>尼古喵喵 · 战外调整额外特性</summary>' + state.cats.map(function (cat) {
				return '<div><strong>' + escape(localName(cat.species)) + '</strong>' + cat.groups.map(function (group, index) {
					return '<p>第 ' + (index + 1) + ' 组：' + group.map(function (ability) {
						return button('chooseCatAbility', encodeURIComponent(cat.member) + '|' + index + ':' + ability.id,
							(cat.selected[index] === ability.id ? '✓ ' : '') + localName(ability.name), busy || !editable(run) || cat.selected[index] === ability.id);
					}).join('') + '</p>';
				}).join('') + '</div>';
			}).join('') + '</details>';
			state.owned.forEach(function (entry) {
				if (entry.progress !== undefined) html += resourceMeter(entry.name, entry.progress,
					entry.family === 'starquest' ? entry.progress < 10 ? 10 : entry.progress < 90 ? 90 : 180 : 15,
					entry.completed ? '已完成' : entry.family === 'starquest' ? '累计击倒数' : '累计区域数');
			});
			html += '</div><p class="rogue-caption">祝福已生效加级：固定首领 +' + (state.bossLevels === undefined ? state.levels : state.bossLevels) +
				' 级 · 普通遭遇 +' + state.levels + ' 级。祝福和任务进度会随存档保存。</p>';
			html += lakeQuestHTML(state.lakeQuest);
			if (state.deferredLevels && state.deferredLevels.length) html += '<div class="rogue-blessing-grace" role="status"><strong>祝福准备期 · 待生效加级</strong>' + state.deferredLevels.map(function (cost) {
				return '<p>第 <b>' + cost.startsAt + '</b> 层起：固定首领再提高 <b>' + cost.boss + '</b> 级 · 普通遭遇再提高 <b>' + cost.normal + '</b> 级</p>';
			}).join('') + '</div>';
			if (!state.owned.length) html += '<p>第一层开战前，以及通关第 50、100、150 层后各选择一轮祝福，共四轮；基拉祈每轮可选两项。</p>';
			state.owned.forEach(function (entry) {
				html += '<details data-rogue-key="blessing-' + escape(entry.id) + '" class="rogue-owned-blessing rogue-blessing-' + entry.tier + '"><summary>' + escape(entry.name) +
					(entry.progress !== undefined ? ' · ' + entry.progress + (entry.family === 'starquest' ? ' 次击倒' : ' / 15 区域') : '') +
					(entry.completed ? ' · 已完成' : '') + '</summary><p>' + blessingText(entry.text) + '</p>' +
					(entry.targetName ? '<p>指定伙伴：' + escape(localName(entry.targetName)) + '</p>' : '');
				if (entry.family === 'compound' && !entry.completed) html += '<p>尚未使用 · 已收存在祝福中</p>' +
					button('act', 'usecompound:' + entry.id, '使用五号化合物', busy || !editable(run));
				if (entry.family === 'insight') html += '<ul class="rogue-blessing-progress">' + run.team.map(function (member) {
					var insight = member.insight || {points: 0, gain: 1};
					return '<li><span class="picon" style="' + Dex.getPokemonIcon(member.set.species) + '"></span><strong>' +
						escape(localName(member.set.species)) + '</strong> · 生死领悟 ' + insight.points + ' / 100 · 每次 +' + insight.gain + '</li>';
				}).join('') + '</ul>';
				html += '</details>';
			});
			if (state.evolution) {
				html += '<p><strong>属性进化：</strong>' + escape(localName(state.evolution.type)) + ' · 招式威力 +' + Math.round(state.evolution.power * 100) + '%</p>';
				var evo = state.evolution, extraNames = {accuracy: '非一击必杀招式必中', crit: '要害等级 +2', brn: '50% 烧伤', par: '50% 麻痹', frostbite: '50% 冻伤', atk: '50% 攻击 +1', spa: '50% 特攻 +1', spe: '50% 速度 +1'};
				html += '<ul class="rogue-caption">';
				Object.keys(evo.stats || {}).forEach(function (key) { html += '<li>' + statNames[key] + ' +' + Math.round(evo.stats[key] * 100) + '%</li>'; });
				Object.keys(evo.offense || {}).forEach(function (type) { html += '<li>对' + escape(localName(type)) + '属性打击面强化 ' + evo.offense[type] + ' 档</li>'; });
				Object.keys(evo.defense || {}).forEach(function (type) { html += '<li>对' + escape(localName(type)) + '属性抗性强化 ' + (-evo.defense[type]) + ' 档</li>'; });
				(evo.extras || []).forEach(function (id) { html += '<li>' + escape(extraNames[id] || id) + '</li>'; });
				html += '</ul>';
			}
			if (run.comeback && run.comeback.active) html += '<p class="infobox"><strong>再启程 · 剩余 ' + run.comeback.remaining + ' 层</strong><br />战斗经验 ×2；无战斗经验的楼层额外获得一级所需经验的 25%。' + (run.comeback.floorBuff ? '<br />本层伤害、双防 +25%。' : '') + '</p>';
			var locked = busy || !editable(run) || run.healingLocked;
			if (state.owned.some(function (b) { return b.family === 'potara'; })) {
				var fused = run.team.find(function (m) { return m.fusion; });
				if (fused) html += '<p><strong>融合伙伴：</strong>' + escape(localName(fused.fusion.first.set.species)) + ' × ' + escape(localName(fused.fusion.second.set.species)) + ' ' + button('unfuseMember', fused.id, '解除融合', locked) + '</p>';
				else html += button('openFusion', '', '选择两位伙伴融合', locked || run.floor < (state.fusionReadyFloor || 0) || run.team.filter(function (m) { return !m.egg; }).length < 2) + (run.floor < state.fusionReadyFloor ? '<p>再前进 ' + (state.fusionReadyFloor - run.floor) + ' 层可融合。</p>' : '');
			}

			if (state.owned.some(function (b) { return b.family === 'killlagirl'; })) {
				var legendsReady = ['yveltal', 'reshiram'].every(function (id) { return run.team.some(function (mon) { return idOf(mon.set.species) === id; }); });
				['godrobe', 'puregodrobe'].forEach(function (family) {
					var robe = state.owned.find(function (b) { return b.family === family; });
					if (robe) html += button('inheritRobe', family, (family === 'godrobe' ? '伊裴尔塔尔继承神衣鲜血' : '莱希拉姆继承神衣纯洁') +
						(robe.target ? ' · 已继承' : ''), locked || !legendsReady || !!robe.target);
				});
				if (!legendsReady) html += '<p class="rogue-caption">两位传说伙伴同时入队后，可分别继承两件神衣。</p>';
			}
			(state.soundLearning || []).forEach(function (entry) {
				var mon = run.team.find(function (p) { return p.id === entry.member; });
				if (mon) html += button('learnSoundMove', mon.id, localName(mon.set.species) + ' · 领取声音招式', locked || !entry.moves.length);
			});
			if (run.coverage && run.coverage.remaining) {
				html += '<p><strong>补盲研习：' + run.coverage.remaining + ' 次</strong> · 任选合法的非本系攻击招式，可留待之后使用。</p>';
				(run.coverage.members || []).forEach(function (entry) {
					var mon = run.team.find(function (p) { return p.id === entry.member; });
					if (mon) html += button('learnCoverageMove', mon.id, localName(mon.set.species) + ' · 补盲研习', locked || !entry.moves.length);
				});
			}
			(state.learning || []).forEach(function (entry) {
				var mon = run.team.find(function (p) { return p.id === entry.member; });
				if (mon) html += button('learnBlessingMove', mon.id, localName(mon.set.species) + ' · 学习一个招式', locked || !entry.moves.length);
			});
			if (state.owned.some(function (b) { return b.family === 'fantasysix'; }) && run.team.length === 6 &&
				run.team.every(function (mon) { return /Fantasy/.test(mon.set.species); })) {
				html += '<p>每片幻想碎片可兑换 150 金币：' + ['1', '10', 'all'].map(function (count) {
					return button('exchangeShards', count, count === 'all' ? '兑换全部' : '兑换 ' + count + ' 片',
						locked || state.shards < (count === 'all' ? 1 : Number(count)));
				}).join(' ') + '</p>';
			}
			run.team.forEach(function (mon) {
				if (mon.fantasyOptions && state.shards >= 100) mon.fantasyOptions.forEach(function (option) {
					html += button('fantasizeMember', mon.id + '|' + option.species,
						localName(mon.set.species) + ' · ' + (option.signature ? localName(dex().moves.get(option.signature).name, 'move') + '分支' : '幻想化为 ' + localName(option.species)), locked || !mon.hp || !!mon.nuzlockeDead);
				});
				else if (mon.fantasyForm && state.shards >= 100) html += button('blessingMemberAction', 'fantasize:' + mon.id, localName(mon.set.species) + ' · 幻想化', locked);
				if (idOf(mon.set.species) === 'meltan' && state.candy >= 400) html += button('blessingMemberAction', 'meltanevolve:' + mon.id, '美录坦 · 糖果进化', locked);
				var species = idOf(mon.set.species);
				if (['cobalion', 'terrakion', 'virizion'].indexOf(species) >= 0 && state.swordRewards.indexOf(species) < 0 &&
					state.swordUses >= (state.swordRewards.length + 1) * 15) html += button('blessingMemberAction', 'swordreward:' + mon.id,
					localName(mon.set.species) + (mon.canReceiveSharpness === false ? ' · 已拥有锋锐' : ' · 领取锋锐'), locked || mon.canReceiveSharpness === false);
			});

			return html + '</section>';
		},
		openFusion: function () { app.addPopup(globals.RogueFusionPopup, {room: this}); },
		unfuseMember: function (id) { app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'unfusion', details: {member: id}, text: '解除融合，恢复两位伙伴；第一位保留融合期间获得的经验。队伍已满时，需要安置第二位；已有箱子且有空位时会自动暂存。再次融合需要通关 10 层。'}); },
		changeTera: function (value) {
			var separator = value.lastIndexOf(':'), parts = [value.slice(0, separator), value.slice(separator + 1)];
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'settera', title: '更改太晶属性',
				text: '消耗 50 片' + localName(parts[1]) + '太晶碎片，为这位伙伴更改太晶属性？',
				details: {member: parts[0], value: parts[1]}});
		},
		learnSoundMove: function (id) { app.addPopup(globals.RogueBlessingLearnPopup, {room: this, member: id, kind: 'sound'}); },
		learnCoverageMove: function (id) { app.addPopup(globals.RogueBlessingLearnPopup, {room: this, member: id, kind: 'coverage'}); },
		openTrainingCamp: function () { app.addPopup(globals.RogueTrainingCampPopup, {room: this}); },
		comebackChoice: function (value) { var c = this.state.run && this.state.run.comeback; if (c && c.key) this.submit('comeback', {member: c.key, value: value}); },
		learnBlessingMove: function (id) { app.addPopup(globals.RogueBlessingLearnPopup, {room: this, member: id}); },
		exchangeShards: function (value) { this.submit('exchangeshards', {value: value}); },
		inheritRobe: function (value) { this.submit('inheritrobe', {value: value}); },
		chooseEvent: function (choice) {
			var event = this.state && this.state.run && this.state.run.event;
			if (!event) return;
			var details = {member: event.key, value: choice};
			if (choice === 'allocate' && event.evAllocation) {
				details.evs = {};
				var self = this;
				Object.keys(statNames).forEach(function (stat) { details.evs[stat] = Number(self.$('input[name=event-ev-' + stat + ']').val()); });
			}
			this.submit('event', details);
		},
		chooseEventMove: function () { this.chooseEvent(this.$('select[name=eventMove]').val()); },
		updateEventEVTotal: function () {
			var event = this.state && this.state.run && this.state.run.event;
			if (!event || !event.evAllocation) return;
			var self = this, used = Object.keys(statNames).reduce(function (sum, stat) {
				return sum + Number(self.$('input[name=event-ev-' + stat + ']').val());
			}, 0);
			this.$('.rogue-event-ev-remaining').text('尚待分配：' + (event.evAllocation.total - used) + ' 点');
		},
		watchEvent: function () {
			var event = this.state && this.state.run && this.state.run.event;
			if (event && event.stage === 'watch' && event.replay) app.addPopup(globals.RogueEventReplayPopup, {room: this, event: event});
		},
		watchCoopEvent: function () {
			var session = this.coopState && this.coopState.session;
			var event = session && session.adventure && session.adventure.coopEvent;
			if (event && event.stage === 'watch' && event.replay) app.addPopup(globals.RogueEventReplayPopup,
				{room: this, event: event, cooperative: true});
		},
		chooseMentorCard: function (value) { this.submit('mentorcard', {value: value}); },
		showRewardPartner: function (member) { this.submit('rewardchoice', {value: 'show', member: member}); },
		chooseReward: function (value) {
			var scene = this.state && this.state.run && this.state.run.rewardScene;
			if (!scene) return;
			if (value === 'back') { this.rewardTraining = null; this.render(); return; }
			var option = (scene.choices || []).find(function (entry) { return entry.id === value; });
			if (option && option.targets) { this.rewardTraining = {key: scene.key, kind: value}; this.render(); return; }
			this.submit('rewardchoice', {value: value});
		},
		trainRewardPartner: function (member) {
			var scene = this.state && this.state.run && this.state.run.rewardScene;
			if (!scene || !this.rewardTraining || this.rewardTraining.key !== scene.key) return;
			this.submit('rewardchoice', {value: this.rewardTraining.kind, member: member});
			this.rewardTraining = null;
		},
		renderRewardScene: function (run, busy) {
			var scene = run.rewardScene, self = this;
			var html = '<article class="rogue-reward-scene"><header>' + (scene.avatar ? '<img class="rogue-reward-npc" alt="" src="' +
				escape(Dex.resolveAvatar(scene.avatar)) + '" />' : fa('gift')) + '<div><h3>' + escape(scene.name) +
				'</h3><span class="rogue-caption">' + escape(scene.quality) + '</span></div></header><div class="rogue-event-text">' +
				scene.paragraphs.map(function (line) { return '<p>' + dialogueText(line) + '</p>'; }).join('') + '</div>';
			if (scene.claimed) return html + loot(run.node.reward, this.state.items) +
				button('act', 'continue', '收好补给，继续前进', busy, fa('gift')) + '</article>';
			var targetOption = this.rewardTraining && this.rewardTraining.key === scene.key && scene.choices.find(function (entry) {
				return entry.id === self.rewardTraining.kind;
			});
			if (targetOption && targetOption.targets) {
				html += '<h4>选择参加训练的伙伴</h4><div class="rogue-member-choices">' + targetOption.targets.map(function (target) {
					var mon = run.team.find(function (entry) { return entry.id === target.member; });
					return mon ? memberChoice('trainRewardPartner', mon.id, mon, busy, targetOption.name + ' +' + (target.amount / 100) + '%') : '';
				}).join('') + '</div><p class="rogue-caption">提升比例在本局持续保留，升级、进化、超进化后仍然有效。</p>' +
					button('chooseReward', 'back', '重新挑选奖励', busy);
			} else {
				if (scene.type && !scene.demonstrated) {
					if (scene.demonstrations.length) html += '<p><strong>展示符合偏好的伙伴，可以提高谢礼品质：</strong></p><div class="rogue-member-choices">' +
						scene.demonstrations.map(function (demo) { var mon = run.team.find(function (entry) { return entry.id === demo.member; });
							return mon ? memberChoice('showRewardPartner', mon.id, mon, busy, demo.move ? '展示【' + localName(demo.move, 'move') + '】' : '请它来帮忙') : '';
						}).join('') + '</div>';
					else html += '<p class="rogue-caption">队伍里暂时没有符合偏好的伙伴，仍然可以收下下面的一份谢礼。</p>';
				}
				html += '<h4>挑选一份奖励</h4><div class="rogue-reward-options">' + scene.choices.map(function (option) {
					return '<button class="button rogue-event-option" name="chooseReward" value="' + escape(option.id) + '"' +
						(busy || option.disabled ? ' disabled' : '') + '><strong>' + escape(eventText(option.name) + recommendedLabel(run, option.id)) + '</strong><small>' + escape(eventText(option.text)) + '</small></button>';
				}).join('') + '</div><p class="rogue-caption">' + escape(scene.baseText) + '</p>';
			}
			return html + '</article>';
		},
		renderRunTraining: function (run) {
			var growth = run.growth;
			if (!growth || !(growth.offense || growth.defense || growth.experience || (growth.personal || []).length || (growth.mushrooms || []).length)) return '';
			var summary = [];
			if (growth.offense) summary.push('全队双攻 +' + (growth.offense / 100) + '%');
			if (growth.defense) summary.push('全队双防 +' + (growth.defense / 100) + '%');
			if (growth.experience) summary.push('战斗经验 +' + (growth.experience / 100) + '%');
			if ((growth.personal || []).length) summary.push(growth.personal.length + ' 位伙伴完成个人训练');
			if ((growth.mushrooms || []).length) summary.push(growth.mushrooms.length + ' 位伙伴获得蘑菇增幅');
			return '<details class="rogue-run-training" data-rogue-key="run-training"><summary>' + fa('line-chart') +
				'本局训练 · ' + summary.join(' · ') + '</summary><p>全队训练也对新加入的伙伴有效；经验糖果不受经验加成影响。个人训练与全队训练相加，升级、进化、超进化后仍然保留。</p>' +
				(growth.personal || []).map(function (entry) { return '<p><strong>【' + escape(localName(entry.species)) + '】</strong>个人训练：双攻 +' +
					((entry.offense || 0) / 100) + '%、双防 +' + ((entry.defense || 0) / 100) + '%</p>'; }).join('') +
				(growth.mushrooms || []).map(function (entry) { return '<p><strong>【' + escape(localName(entry.species)) + '】</strong>合成大蘑菇：双攻 +' + Number((entry.offense / 100).toFixed(2)) + '%、双防 +' + Number((entry.defense / 100).toFixed(2)) + '%（独立叠加，收益逐渐降低，无硬性上限）</p>'; }).join('') +
				'<p class="rogue-caption">常规训练上限：全队双攻、双防各 +120%，个人双攻、双防各 +60%，战斗经验 +40%。【合成大蘑菇】的祝福增幅另计；所有增幅随通关卡保留。</p></details>';
		},
        maybeShowEvolution: function () {
            var run = this.state && this.state.run;
            clearTimeout(this.evolutionPopupTimer);
            if (this.screen !== 'game' || this.pending || this.openingEvolutionAnimation || !evolutionEditable(run) ||
                app.curRoom && app.curRoom !== this && !(run.growthPaused && app.curRoom.id === run.roomid)) return;
            var mon = run.team.find(function (m) { return m.hp > 0 && m.evolutionNotice &&
                (m.evolutionDetails || []).some(function (e) { return e.ready && (!run.growthPaused || !e.item); }); });
            if (!mon) return;
            if (app.popups && app.popups.length) {
                var self = this;
                this.evolutionPopupTimer = setTimeout(function () { self.maybeShowEvolution(); }, 200);
                return;
            }
            app.addPopup(globals.RogueEvolutionNoticePopup, {room: this, member: mon.id, species: mon.set.species});
        },
        renderFishing: function (event, busy, cooperative) {
            return '<div class="rogue-fishing" data-rogue-key="fish-' + escape(event.key) + '"><div class="rogue-fishing-scene">' +
                '<svg viewBox="0 0 320 180" role="img" aria-label="湖岸上的像素钓鱼场景" shape-rendering="crispEdges">' +
                '<path fill="#b9e5ec" d="M0 0h320v180H0z"/><path fill="#75b37b" d="M0 0h90v25h25v35h24v30h30v90H0z"/>' +
                '<path fill="#d5cb97" d="M70 0h12v25h25v35h24v30h30v90h-14V97h-26V68H96V33H70z"/>' +
                '<path fill="#6eb9d4" d="M170 0h150v180H170V90h-30V60h-24V35h54z"/>' +
                '<g class="rogue-water-ripples" fill="#c1e9ee"><path d="M190 28h28v3h-28zM258 56h35v3h-35zM170 139h24v3h-24zM270 153h32v3h-32zM225 98h20v3h-20z"/></g>' +
                '<path fill="#3d7553" d="M12 18h25v26H12zM37 9h15v28H37zM15 139h25v32H15z"/>' +
                '<g><path fill="#513d47" d="M78 78h25v8H78zM84 106h8v27h-8zM99 108h8v27h-8z"/><path fill="#eec197" d="M82 83h19v19H82zM100 98h18v6h-18z"/>' +
                '<path fill="#d77559" d="M77 76h30v9H77zM85 70h15v7H85zM81 101h22v16H81z"/><path fill="#f1d488" d="M116 100l31-42 3 2-31 43z"/>' +
                '<path fill="none" stroke="#eaf5ef" d="M149 59Q183 51 215 113"/></g><g class="rogue-fishing-float"><path fill="#f6f5e7" d="M210 111h10v7h-10z"/><path fill="#d8645b" d="M212 107h6v5h-6z"/></g></svg>' +
                '</div><div class="rogue-fishing-controls"><div class="rogue-fishing-meter" aria-label="收线时机"><div class="rogue-fishing-zone"></div><div class="rogue-fishing-cursor"></div></div>' +
                '<div><p>滑块进入亮色区间时</p>' + button(cooperative ? 'chooseCoopEvent' : 'fishingTap', cooperative ? 'fishtap' : '', '收线', busy) + '</div></div></div>' +
                '<div class="rogue-fishing-progress"><i></i></div><p class="rogue-fishing-feedback" aria-live="polite">成功 ' + event.fishing.hits + ' / 6 次 · ' + escape(event.fishing.feedback || '盯紧浮标，准备收线。') + '</p>' +
                '';
        },
        fishingTap: function () { var run = this.state.run; if (run && run.event && run.event.fishing) this.submit('event', {member: run.event.key, value: 'fishtap'}); },
        coopFishingEvent: function () {
            var session = this.coopState && this.coopState.session, adventure = session && session.adventure;
            var event = adventure && adventure.coopEvent;
            return this.screen === 'coop' && session && session.status === 'active' && adventure.phase === 'route-interaction' &&
                event && event.id === 'fishing' && event.stage === 'choice' && event.fishing ? event : null;
        },
        startFishingClock: function () {
            if (typeof requestAnimationFrame !== 'function') return;
            if (this.fishingFrame) cancelAnimationFrame(this.fishingFrame);
            this.fishingFrame = null;
            var cooperative = this.screen === 'coop', run = this.state && this.state.run;
            var event = cooperative ? this.coopFishingEvent() : run && run.event, self = this;
            if (!cooperative && this.screen !== 'game' || !event || !event.fishing || event.stage !== 'choice') return;
            var fish = event.fishing, offset = fish.now - Date.now(), root = this.$el[0];
            if (!root) return;
            function tick() {
                if ((cooperative ? self.coopFishingEvent() !== event : self.screen !== 'game') || !root.querySelector('.rogue-fishing')) return;
                var now = Date.now() + offset, period = 2400 / (1 + fish.hits * 0.08);
                var phase = (fish.travel + Math.max(0, now - fish.anchor) * 2 / period) % 2;
                var cursor = phase <= 1 ? phase : 2 - phase;
                var progress = Math.max(0, Math.min(1, (now - fish.started) / 14000 - fish.hits * 0.04 + fish.misses * 0.035));
                root.querySelector('.rogue-fishing-cursor').style.top = cursor * 100 + '%';
                var zone = root.querySelector('.rogue-fishing-zone'); zone.style.top = (fish.center - fish.width / 2) * 100 + '%'; zone.style.height = fish.width * 100 + '%';
                root.querySelector('.rogue-fishing-progress i').style.transform = 'scaleX(' + progress + ')';
                if (progress >= 1 && cooperative) {
                    var session = self.coopState.session;
                    var pull = root.querySelector('button[name="chooseCoopEvent"][value="fishtap"]');
                    if (pull) pull.disabled = true;
                    var finish = root.querySelector('button[name="chooseCoopEvent"][value="fishfinish"]');
                    if (finish) finish.disabled = !!self.coopBusy || !!(session.delegatedTo && session.delegatedTo !== self.coopState.userid);
                    var feedback = root.querySelector('.rogue-fishing-feedback');
                    if (feedback) feedback.textContent = '鱼线已收完，请双方确认查看收获。';
                    return;
                }
                if (progress >= 1 && !self.pending) { self.submit('event', {member: event.key, value: 'fishfinish'}); return; }
                self.fishingFrame = requestAnimationFrame(tick);
            }
            tick();
        },

		renderSki: function (event, busy) {
			return '<section class="rogue-ski" tabindex="0" aria-label="雪山速滑，左右方向键换道"><canvas width="540" height="300" aria-label="从人物后方观察雪道，躲避树木和岩石"></canvas><div class="rogue-ski-hud"><b class="rogue-ski-time">0.0 / 15 秒</b><span>左右换道 · 撞上障碍即结束</span></div><div class="rogue-ski-controls">' + button('skiMove', 'skileft', '← 向左', busy) + button('skiMove', 'skiright', '向右 →', busy) + '</div><p class="rogue-caption">使用 ← → 或 A / D 换道，也可点按下方按钮。</p><p class="rogue-ski-connection" role="status"></p></section>';
		},
		skiKey: function (event) {
			var key = event.key.toLowerCase();
			if (['arrowleft', 'arrowright', 'a', 'd'].indexOf(key) < 0 || event.ctrlKey || event.altKey || event.metaKey) return;
			event.preventDefault(); event.stopPropagation();
			if (event.repeat && Date.now() - (this.lastSkiKey || 0) < 140) return;
			this.lastSkiKey = Date.now(); this.skiMove(key === 'arrowleft' || key === 'a' ? 'skileft' : 'skiright');
		},
		skiMove: function (choice) {
			var event = this.state && this.state.run && this.state.run.event;
			if (!event || !event.ski || event.stage !== 'choice' || this.pending) return;
			this.skiQueue = this.skiQueue || [];
			if (choice === 'skitick' && (this.skiPending || this.skiQueue.length)) return;
			this.skiQueue.push({value: choice, skiAt: Math.max(0, Date.now() + (this.skiClockOffset || 0) - event.ski.started)});
			this.flushSki();
		},
		flushSki: function () {
			if (this.skiPending || !this.skiQueue || !this.skiQueue.length) return;
			var event = this.state.run.event;
			var input = this.skiQueue.shift();
			this.skiPending = {id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
				revision: this.state.account.revision, action: 'event', member: event.key, value: input.value, skiAt: input.skiAt};
			this.skiSentAt = Date.now();
			this.sendSki();
		},
		sendSki: function () {
			if (!this.skiPending || !app.socket || app.socket.readyState !== 1) return;
			app.send('/fantasyrogue ski ' + JSON.stringify(this.skiPending));
			clearTimeout(this.skiTimer);
			var self = this;
			this.skiTimer = setTimeout(function () { self.sendSki(); }, 1500);
		},
		receiveSki: function (result) {
			if (result.userid !== app.user.get('userid') || !this.skiPending || result.id !== this.skiPending.id) return;
			clearTimeout(this.skiTimer); this.skiPending = null;
			if (!result.ok || !result.event || result.event.stage !== 'choice' || !result.event.ski ||
				!this.state.run || this.state.run.event.key !== result.event.key) {
				this.skiQueue = []; if (!result.ok) this.error = result.message; this.refresh(); return;
			}
			this.state.account.revision = result.revision;
			this.skiLatency = Date.now() - this.skiSentAt;
			Object.assign(this.state.run.event.ski, result.event.ski);
			this.flushSki();
		},
		skiDisplayLane: function (lane) {
			var inputs = (this.skiPending ? [this.skiPending] : []).concat(this.skiQueue || []);
			inputs.forEach(function (input) { if (input.value !== 'skitick') lane = Math.max(0, Math.min(2, lane + (input.value === 'skileft' ? -1 : 1))); });
			return lane;
		},
		startSkiClock: function () {
			if (this.skiFrame) cancelAnimationFrame(this.skiFrame);
			var self = this, run = this.state && this.state.run, event = run && run.event;
			if (typeof requestAnimationFrame !== 'function' || this.screen !== 'game' || !event || !event.ski || event.stage !== 'choice') return;
			var canvas = this.$('.rogue-ski canvas')[0]; if (!canvas || !canvas.getContext) return;
			var ctx = canvas.getContext('2d'); if (!ctx) return;
			var ski = event.ski, offset = ski.now - Date.now();
			this.skiClockOffset = offset;
			// The Start button is replaced by this canvas; otherwise keyboard focus falls back to the page.
			var section = this.$('.rogue-ski')[0];
			if (section && section.focus && (!app.curRoom || app.curRoom === this)) section.focus({preventScroll: true});
			function tick() {
				if (self.screen !== 'game' || !canvas.isConnected) return;
				var elapsed = Math.min(ski.duration || 15000, Date.now() + offset - ski.started), time = elapsed / 1000;
				ctx.fillStyle = '#c9e2ef'; ctx.fillRect(0, 0, 540, 300);
				ctx.fillStyle = '#f8fcff'; ctx.beginPath(); ctx.moveTo(55, 300); ctx.lineTo(210, 35); ctx.lineTo(330, 35); ctx.lineTo(485, 300); ctx.fill();
				ctx.strokeStyle = '#b9d1df'; ctx.lineWidth = 2;
				[250, 290].forEach(function (x, i) { ctx.beginPath(); ctx.moveTo(x, 35); ctx.lineTo(198 + i * 144, 300); ctx.stroke(); });
				ctx.fillStyle = '#dceaf3'; ctx.beginPath(); ctx.moveTo(0, 70); ctx.lineTo(65, 5); ctx.lineTo(130, 70); ctx.lineTo(180, 20); ctx.lineTo(210, 60); ctx.lineTo(55, 300); ctx.lineTo(0, 300); ctx.fill();
				ctx.beginPath(); ctx.moveTo(330, 60); ctx.lineTo(400, 5); ctx.lineTo(470, 60); ctx.lineTo(510, 10); ctx.lineTo(540, 55); ctx.lineTo(540, 300); ctx.lineTo(485, 300); ctx.fill();
				ski.obstacles.forEach(function (o) {
					var depth = 1 - (o.at - elapsed) / 3000; if (depth < 0 || depth > 1.15) return;
					var y = 35 + depth * 215, x = 270 + (o.lane - 1) * (30 + depth * 115), scale = 0.3 + depth * 0.85;
					ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
					if (o.kind === 'tree') { ctx.fillStyle = '#795a48'; ctx.fillRect(-4, -10, 8, 22); ctx.fillStyle = '#43716a'; ctx.beginPath(); ctx.moveTo(0,-48); ctx.lineTo(-23,0); ctx.lineTo(23,0); ctx.fill(); ctx.fillStyle = '#f2f8fa'; ctx.beginPath();ctx.moveTo(0,-48);ctx.lineTo(-13,-22);ctx.lineTo(13,-22);ctx.fill(); }
					else { ctx.fillStyle = '#748a9a'; ctx.beginPath();ctx.moveTo(-24,5);ctx.lineTo(-16,-20);ctx.lineTo(8,-27);ctx.lineTo(26,3);ctx.closePath();ctx.fill();ctx.fillStyle='#e8f1f6';ctx.fillRect(-13,-23,22,6); }
					ctx.restore();
				});
				var x = 270 + (self.skiDisplayLane(ski.lane) - 1) * 145;
				ctx.strokeStyle = '#27465e'; ctx.lineWidth = 5; ctx.beginPath();ctx.moveTo(x-13,240);ctx.lineTo(x-21,278);ctx.moveTo(x+13,240);ctx.lineTo(x+21,278);ctx.stroke();
				ctx.fillStyle = '#315b86';ctx.fillRect(x-13,218,26,30);ctx.fillStyle='#c34f50';ctx.fillRect(x-16,204,32,18);ctx.fillStyle='#e7d1ac';ctx.fillRect(x-10,218,20,5);
				ctx.fillStyle = '#e9f4fbe0'; for (var i=0;i<11;i++) {ctx.beginPath();ctx.arc(i*55,306+Math.sin(time*2+i)*7,22,0,Math.PI*2);ctx.fill();}
				self.$('.rogue-ski-time').text(time.toFixed(1) + ' / 15 秒');
				var waiting = self.skiPending && Date.now() - self.skiSentAt > 500;
				self.$('.rogue-ski-connection').text(waiting || self.skiLatency > 500 ? '网络响应较慢，请尽量提前换道。' : '');
				if (!self.pending && (!self.lastSkiPoll || Date.now() - self.lastSkiPoll > 700)) { self.lastSkiPoll = Date.now(); self.skiMove('skitick'); }
				self.skiFrame = requestAnimationFrame(tick);
			}
			tick();
		},
		chooseCatAbility: function (value) {
			var parts = value.split('|'); this.submit('catability', {member: decodeURIComponent(parts[0]), value: parts[1]});
		},
		renderCoopRhythm: function (activity, scope, title) {
			if (!activity || activity.kind !== 'rhythm') return '';
			return '<div class="rogue-coop-rhythm-' + scope + '"><strong>' + escape(title) + '</strong>' +
				'<div class="rogue-activity-track" aria-label="节拍轨道，中央绿色区域为命中区">' +
				'<span class="rogue-activity-zone"></span><b class="rogue-activity-beat"></b></div>' +
				'<p class="rogue-activity-time" role="timer"></p><p>当前得分：' + Number(activity.score || 0) + '</p></div>';
		},
		coopActivityClocks: function () {
			var session = this.coopState && this.coopState.session, adventure = session && session.adventure;
			var event = adventure && adventure.coopEvent;
			if (this.screen !== 'coop' || !session || session.status !== 'active' || !adventure ||
				adventure.phase !== 'route-interaction' || !event) return [];
			var clocks = [];
			if (event.stage === 'choice' && event.activity) clocks.push({scope: 'own', activity: event.activity,
				owner: this.coopState.userid, shared: !!event.sharedRhythm});
			if (session.delegatedTo === this.coopState.userid && event.partnerActivity) clocks.push({scope: 'partner',
				activity: event.partnerActivity, owner: session.partnerUserId, shared: false});
			return clocks;
		},
		startActivityClock: function () {
			var self = this, event = this.state && this.state.run && this.state.run.event;
			if (this.screen === 'coop') {
				var clocks = this.coopActivityClocks();
				clearInterval(this.activityClock); this.activityClock = null;
				if (!clocks.length) return;
				var offsets = {};
				clocks.forEach(function (clock) { offsets[clock.scope] = (clock.activity.now || Date.now()) - Date.now(); });
				this.activityClock = setInterval(function () {
					var current = self.coopActivityClocks();
					if (!current.length) { clearInterval(self.activityClock); self.activityClock = null; return; }
					current.forEach(function (clock) {
						var a = clock.activity, elapsed = Math.max(0, Date.now() + (offsets[clock.scope] || 0) - a.startedAt);
						var selector = '.rogue-coop-rhythm-' + clock.scope;
						self.$(selector + ' .rogue-activity-beat').css('left', Math.min(100, elapsed % a.period / a.period * 100) + '%');
						self.$(selector + ' .rogue-activity-time').text(elapsed >= a.duration ?
							(clock.shared ? '节奏结束，请双方确认查看成果。' : '节奏结束，正在结算。') :
							Math.max(0, (a.duration - elapsed) / 1000).toFixed(1) + ' 秒');
						if (elapsed >= a.duration && !clock.shared && !self.coopBusy) self.chooseCoopEvent(clock.owner + '|finish');
					});
				}, 80);
				return;
			}
			if (!event || !event.activity || event.stage !== 'choice') { clearInterval(this.activityClock); this.activityClock = null; return; }
			this.activityOffset = (event.activity.now || Date.now()) - Date.now();
			if (this.activityClock) return;
			this.activityClock = setInterval(function () {
				var current = self.state && self.state.run && self.state.run.event;
				if (!current || !current.activity || current.stage !== 'choice') { clearInterval(self.activityClock); self.activityClock = null; return; }
				var a = current.activity, elapsed = Math.max(0, Date.now() + self.activityOffset - a.startedAt);
				self.$('.rogue-activity-beat').css('left', Math.min(100, elapsed % a.period / a.period * 100) + '%');
				self.$('.rogue-activity-time').text(Math.max(0, (a.duration - elapsed) / 1000).toFixed(1) + ' 秒');
				if (elapsed >= a.duration && !self.pending && !(self.state.run.pendingMoves || []).length && self.screen === 'game') self.submit('event', {member: current.key, value: 'finish'});
			}, 80);
		},
        renderEvent: function (run, busy) {
			var event = run.event;
			if (!event) return '';
			var recommendations = function (id) { var names = (run.companions || []).concat(run.socialCompanions || []).filter(function (c) { return c.recommended === id; }).map(function (c) { return c.name; }); return names.length ? '（' + names.join('、') + '推荐）' : ''; };
			var html = '<article class="rogue-event"><h3>' + escape(event.title) + '</h3><div class="rogue-event-intro' + (event.rivalPortrait ? ' has-portrait' : '') + '"><div class="rogue-event-text">' +
				(event.paragraphs || []).map(function (line) { return '<p>' + dialogueText(line) + '</p>'; }).join('') + '</div>';
			if (event.rivalPortrait) {
				var rivalArt = portraitFile(event.rivalPortrait), affection = event.affection === undefined ? '' : ' title="当前好感度：' + Number(event.affection) + '"';
				html += '<span class="rogue-portrait-anchor">' + (rivalArt ? '<span class="rogue-companion-portrait rogue-event-rival' + (event.rivalApproval ? ' smiling' : '') + '"' + affection + ' style="' + portraitStyle(event.rivalPortrait) + '"></span>' : '<img class="rogue-rival-native"' + affection + ' src="' + escape(Dex.resolveAvatar(event.rivalPortrait)) + '" alt="劲敌" />') + this.affectionGainBadge(event.rivalPortrait) + '</span>';
			}
			html += '</div>';
			if (event.silhouette) html += '<div class="rogue-quiz-silhouette" aria-label="宝可梦剪影" style="' + Dex.getTeambuilderSprite({species: event.silhouette}) + '"></div>';
			if (event.activity && event.stage === 'choice') html += '<div class="rogue-activity-track" aria-label="节拍轨道，中央绿色区域为命中区"><span class="rogue-activity-zone"></span><b class="rogue-activity-beat"></b></div><p class="rogue-activity-time">12.0 秒</p>';
			if (event.ski && event.stage === 'choice') return html + this.renderSki(event, busy) + '</article>';
			if (event.fishing && event.stage === 'choice') return html + this.renderFishing(event, busy) + '</article>';
			html += auctionBoardHTML(event.auction);
			html += regionalPreviewHTML(event.preview);
			if (event.evAllocation) {
				var allocation = event.evAllocation;
				html += '<div class="rogue-event-allocation"><p>请恰好分配 <strong>' + allocation.total + '</strong> 点，每项最多 252。</p>' +
					'<p class="rogue-event-ev-remaining" aria-live="polite">尚待分配：' +
					(allocation.total - Object.keys(statNames).reduce(function (sum, stat) { return sum + allocation.current[stat]; }, 0)) + ' 点</p>' +
					Object.keys(statNames).map(function (stat) { return '<label>' + statNames[stat] + '<input type="number" name="event-ev-' + stat +
						'" min="' + allocation.minimum[stat] + '" max="252" step="1" value="' + allocation.current[stat] + '"' + (busy ? ' disabled' : '') + ' /></label>'; }).join('') + '</div>';
			}
			if (event.picker) html += '<div class="rogue-event-picker"><label>' + escape(event.picker.label) +
				'<select name="eventMove"' + (busy ? ' disabled' : '') + '>' + event.picker.options.map(function (entry) {
					return '<option value="' + escape(entry.id) + '"' + (entry.disabled ? ' disabled' : '') + '>' + escape(localName(entry.name, 'move')) + ' · ' + escape(eventText(entry.text)) + '</option>';
				}).join('') + '</select></label>' + button('chooseEventMove', '', '确认学习', busy || !event.picker.options.some(function (entry) { return !entry.disabled; })) + '</div>';
			if (event.stage === 'choice' && event.teams) {
				html += '<div class="rogue-event-teams">' + event.teams.map(function (team, index) {
					return '<div><strong>' + (index ? '右边的队伍' : '左边的队伍') + '</strong>' + team.map(function (mon) {
						return '<p><span class="picon" style="' + Dex.getPokemonIcon(mon.species) + '"></span>' + escape(localName(mon.species)) + ' · Lv.' + Number(mon.level) + '</p>';
					}).join('') + '</div>';
				}).join('') + '</div>';
			}
			if (event.stage === 'watch') {
				html += '<p class="rogue-caption">两队由 AI 进行真实对战，观看结束后按实际胜负结算。旁观不消耗队伍状态或增益次数。</p>' +
					button('watchEvent', '', '观看对战', busy, fa('play'));
			} else if (event.stage === 'result') {
				var allFainted = !run.team.some(function (mon) { return mon.hp > 0; });
				html += button('act', 'continue', '整理完毕，继续前进', busy || allFainted);
				if (allFainted) html += '<p>请先在右侧背包中复活至少一名伙伴，再继续前进。</p>';
				if (run.canEmergency) html += button('act', 'emergency', '花费 ' + run.emergencyCost + ' 金币急救全队', busy || run.money < run.emergencyCost);
			} else if (event.stage === 'choice' || event.stage === 'fragments') {
				html += '<div class="rogue-event-options' + (event.options.some(function (option) { return /^(member|swap|show):/.test(option.id); }) ? ' rogue-member-choices' : '') + '">' + event.options.map(function (option) {
					var parts = option.id.split(':'), member = /^(member|swap|show)$/.test(parts[0]) && run.team.find(function (entry) {
						return entry.id === decodeURIComponent(parts[1]);
					});
					if (member) return memberChoice('chooseEvent', option.id, member, busy || option.disabled,
						(parts[0] === 'swap' ? eventText(option.name) : eventText(option.text)) + recommendations(option.id));
					return '<button class="button rogue-event-option" name="chooseEvent" value="' + escape(option.id) + '"' +
						(busy || option.disabled ? ' disabled' : '') + '><span class="rogue-event-option-name">' + (/[『「⌈]/.test(option.name) ? dialogueText(eventText(option.name)) : escape(eventText(option.name))) + escape(recommendations(option.id)) + '</span><small>' + escape(eventText(option.text)) + '</small></button>';
				}).join('') + '</div>';
			}
			return html + '</article>';
		},
		renderPendingMove: function (run, busy) {
			var html = '';
			if ((run.pendingMoves || []).length) {
				var pending = run.pendingMoves[0];
				var learner = run.team.filter(function (mon) { return mon.id === pending.member; })[0];
				if (learner) {
					html += '<section class="rogue-pending-move" role="region" aria-label="学习到了新的招式需要确认"><h3>学习招式 · ' + escape(localName(learner.set.species)) + '</h3><p><strong>学习到了新的招式，请先确认是否装备。</strong></p>' +
						'<div class="rogue-new-move">' + moveRow(pending.move, null, learner) + '</div><p>选择替换位置。替换下来的招式会保留在可更换列表中。</p>';
					learner.set.moves.forEach(function (move, i) {
						html += '<div class="rogue-choice-row">' + moveRow(move, learner.pp[i], learner) +
							button('learnMove', String(i), '替换此招式', busy) + '</div>';
					});
					html += '<p>' + button('learnMove', 'skip', '暂不装备，保留在可更换列表', busy) + '</p></section>';
				}
			}
			return html;
		},
		renderCoopChallenge: function (session) {
			var c = session.adventure.coopChallenge, moves = this.renderCoopPendingMoves(session);
			var busy = this.coopBusy || session.canControl === false || !!moves;
			var html = this.renderChallenge({challenge: c}, busy, true) + moves;
			var label = function (value) {
				var option = (c.choices || []).find(function (choice) { return choice.id === value; });
				var prize = (c.prizes || []).find(function (entry) { return 'prize:' + entry.id === value; });
				return option ? option.label : prize ? prize.name : '尚未选择';
			};
			html += '<p>共同选择 · 我方：' + escape(label(c.ownChoice)) + '；队友：' + escape(label(c.partnerChoice)) + '</p>';
			if (c.ownChoice) html += button('chooseCoopChallenge', 'cancel', '撤回我的选择', busy);
			if (c.selected === 'star') {
				var targets = function (list, owner, selected, title, disabled) {
					return '<h4>' + title + '</h4>' + (list || []).map(function (mon) {
						return button('chooseCoopStar', owner + '|' + mon.member,
							(selected === mon.member ? '已选 · ' : '') + localName(mon.species) + ' · ' + mon.from + ' → ' + mon.to + ' 星', disabled);
					}).join('');
				};
				html += '<p>双方各选自己的一位伙伴；两人选好后一起领取。若条件变化，可以共同改选其他奖励。</p>' +
					targets(c.ownTargets, this.coopState.userid, c.ownTarget, '我方摘星伙伴', busy) +
					targets(c.partnerTargets, session.partnerUserId, c.partnerTarget, '队友摘星伙伴', busy || session.delegatedTo !== this.coopState.userid) +
					button('chooseCoopChallenge', 'back', '重新选择奖励', busy);
			}
			return '<section class="rogue-coop-battle-select">' + html + '<p class="rogue-caption">路线与奖品共同决定，双方各领一份；特训与摘星作用于各自队伍。重试不会重抽对手或奖励。</p></section>';
		},
		renderChallenge: function (run, busy, cooperative) {
			var c = run.challenge, items = this.state.items || [];
			var action = function (id, label, disabled, icon) {
				return button(cooperative ? 'chooseCoopChallenge' : 'act', cooperative ? id : 'challenge:' + id, label, disabled, icon);
			};
			var html = '<article class="rogue-optional-challenge"><header><span class="rogue-challenge-tag">' + fa('trophy') + '挑战区域 · 高难厚赏</span><h3>' + escape(c.name) + '</h3></header>';
			html += '<div class="rogue-challenge-conversation"><div class="rogue-challenge-portraits">' + (c.portraits || []).map(function (id) {
				return '<span role="img" aria-label="训练家立绘" class="rogue-companion-portrait' + (c.outcome === 'won' ? ' smiling' : '') + '" style="' + portraitStyle(id) + '"></span>';
			}).join('') + '</div><div class="rogue-challenge-dialogue"><strong class="rogue-caption">' + escape(c.speaker) + '</strong>' +
				c.paragraphs.map(function (line) { return '<p class="rogue-dialogue-copy">' + dialogueText(line) + '</p>'; }).join('') + '</div></div>';
			if (c.companions && c.companions.length) html += '<p class="rogue-challenge-hint">' + fa('users') + '<strong>胜利后可同行：</strong>' + c.companions.map(function (p) { return escape(p.name); }).join('、') + '。领取挑战奖励后邀请，' + (cooperative ? '分别使用双方各自的同行名额' : '共用两位同行名额') + '；满员时可替换或婉拒。</p>';
			if (['offer', 'battle', 'paused'].indexOf(c.stage) >= 0) {
				html += '<p class="rogue-challenge-hint">' + fa('lightbulb-o') + escape(c.hint) + '</p><div class="rogue-challenge-roster">' + c.team.map(function (mon) {
					return '<details><summary><span class="picon" style="' + Dex.getPokemonIcon(mon.species) + '"></span><b>' + escape(localName(mon.species)) + '</b> · Lv.' + mon.level + '</summary><p>' +
						blessingText('特性：【' + localName(mon.ability, 'ability') + '】 · 携带：【' + localName(mon.item, 'item') + '】') + '</p><p>' +
						mon.moves.map(function (move) { return blessingText('【' + localName(dex().moves.get(move).name, 'move') + '】'); }).join(' / ') + '</p></details>';
				}).join('') + '</div><p><strong>获胜后选择一份厚礼。</strong>全队采用本层精英等级，不开放捕捉。战斗中逃跑只退出战斗；可调整后重试，也可零收益逃离本层。HP、PP 和道具消耗保留。</p>';
			}
			if (['offer', 'battle', 'paused', 'won'].indexOf(c.stage) >= 0) {
				if (c.growthText) html += '<p class="rogue-challenge-hint"><strong>' + escape(c.growthText) + '</strong></p>';
				html += '<div class="rogue-challenge-prizes">' + (c.prizes || []).map(function (p) {
					return '<section><h4>' + escape(p.name) + '</h4>' + loot(p, items) + (p.training || []).map(function (entry) {
						return '<p>' + escape(localName(entry.species)) + '：最多获得 ' + entry.experience + ' 经验，止于 Lv.' + entry.level + '</p>';
					}).join('') + (p.star ? '<p>' + escape(localName(p.star.species)) + '：' + p.star.from + ' 星 → <strong>' + p.star.to + ' 星</strong></p>' : '') + (c.stage === 'won' && !c.selected ? action(cooperative ? 'prize:' + p.id : p.id, '选择这份奖励', busy || p.disabled) : '') + '</section>';
				}).join('') + '</div>';
			}
			if (c.stage === 'offer') html += action('accept', c.serious ? '拿出真本事 · 认真切磋' : '接受挑战，准备队伍', busy) + action('skip', '这次先不挑战', busy);
			if (c.stage === 'paused') html += '<div class="rogue-challenge-return"><p><strong>你已退出战斗，尚未离开本层。</strong>对手与奖励保持不变，重试时对手重新以完整状态迎战。</p>' + action('retry', '重新挑战', busy, fa('repeat')) + action('leave', '逃离这一层（无奖励）', busy, fa('sign-out')) + '</div>';
			if (c.stage === 'closed' || c.stage === 'claimed') html += action('leave', '继续前进', busy);
			return html + '</article>';
		},
		renderFloor: function (run, busy) {
			if (run.retryHealing) return '<section class="rogue-retry-summary"><h3>再战 · 治疗确认</h3>' +
				'<p>已保存本场战斗的实际消耗。确认药品清单后，将重新挑战本场对手。</p>' +
				button('revealRetryHealing', '', '查看治疗清单', busy, fa('medkit')) + '</section>';
			var html = '<section class="rogue-floor" aria-label="本层操作">';
			if (run.preview && run.preview.stage === 'result') {
				var name = run.preview.trainer === 'sada' ? '奥琳 AI' : '弗图 AI';
				return html + '<h3>' + name + ' · 预演' + (run.preview.won ? '获胜' : '结束') + '</h3><p>' +
					dialogueText(run.preview.won ? '『可以完美复现这次预演。你要接受这个结果吗？』接受后保留预演中的消耗，并结算胜利与成长。' : '『这次预演没有成功。已经排除预演中的损耗，请由你亲自挑战。』') + '</p>' +
					(run.preview.won ? button('act', 'previewresult:accept', '完美复现预演 · 接受结果', busy) : '') +
					button('act', 'previewresult:personal', '由我亲自挑战', busy) + '</section>';
			}
			if (run.recovery) {
				html += '<p class="rogue-recovery"><strong>' + (run.recovery === 'retreat' ? '已逃跑' : '本场战败') +
					'</strong> · ' + (run.emergencyRecovery && run.emergencyRecovery.paid ? '已急救全队；消耗的道具不会返还。' : '伤害、PP、异常状态和道具消耗已保留。') + (run.phase === 'failed' ? '本层需重新连续挑战。' :
					'下一次仍挑战第 ' + (run.encounter + 1) + ' 场，对手恢复本场初始状态。') + '</p>';
			}
			if (run.emergencyRecovery) html += '<p class="rogue-recovery"><strong>' + (run.emergencyRecovery.paid ?
				'已自动支付 ' + run.emergencyRecovery.cost + ' 金币，急救并恢复全队。' :
				'急救需要 ' + run.emergencyRecovery.cost + ' 金币；余额不足，尚未扣款或复活。') + '</strong></p>';
			if (run.node && run.node.noHealing) html += '<p class="rogue-caption">连续挑战期间限制场外治疗；逃跑后可使用道具整理队伍，再挑战当前场次。</p>';
			(run.notices || []).filter(function (notice) { return /命运：/.test(notice); }).forEach(function (notice) {
				html += '<div class="rogue-receipt" role="status">' + fa('diamond') + escape(noticeText(notice)) + '</div>';
			});
			if (run.lastReward && (run.lastReward.money || run.lastReward.points || Object.keys(run.lastReward.items || {}).length)) {
				html += '<div class="rogue-receipt"><strong>' + fa('check-circle') +
					(run.lastReward.floor === run.floor - 1 ? '上一层' : run.lastReward.floor < run.floor ? '此前' : '') +
					(run.lastReward.money < 0 ? '已结算' : '已到账') + ' · 第 ' + run.lastReward.floor + ' 层' +
					(run.lastReward.encounter ? ' · 第 ' + run.lastReward.encounter + ' 场' : '') + '</strong>' +
					loot(run.lastReward, this.state.items) + '</div>';
			}
			if (run.pendingCapture) {
				html += '<h3>队伍已满 · ' + (run.returningPartner ? '迎接修行伙伴' : '安置新伙伴') + '</h3><p>' +
					(run.returningPartner ? '修行归来的 ' : run.phase === 'intro' ? '塔灵赠送了 ' : '捕获了 ') + escape(localName(run.pendingCapture.set.species)) +
					' Lv.' + run.pendingCapture.set.level + (run.returningPartner ? '。请选择安置方式，再继续旅程。' : run.phase === 'intro' ? '。等级固定为 40。' : '。捕捉解锁已保存。') + '</p><p>';
				html += '必须先确认放生一位旧伙伴，才能接纳新伙伴。</p><div class="rogue-member-choices">' + run.team.map(function (mon) {
					return memberChoice('replaceMember', mon.id, mon, busy || !!(mon.replacementRelease && mon.replacementRelease.reason), '放生并接纳');
				}).join('') + '</div>';
				html += '<div class="rogue-partner-actions">' + (run.team.length < run.partyLimit ? button('replaceMember', 'join', '加入队伍', busy) : '') +
					button('replaceMember', 'release', run.returningPartner ? '告别这位伙伴' : '不接纳新伙伴', busy) + '</div>';
			}
			busy = busy || !!run.pendingCapture || !!(run.pendingMoves || []).length;
			if (run.phase === 'intro') {
				html += '<h3>本局塔灵 · ' + escape(run.spirit.name) + '</h3><p>' + escape(run.spirit.text) + '</p>';
				if (run.team.length > run.partyLimit) {
					html += '<p>请留下 ' + run.partyLimit + ' 位初始伙伴：</p>';
					html += '<div class="rogue-member-choices">' + run.team.map(function (mon) { return memberChoice('trimParty', mon.id, mon, busy, '移出初始队伍'); }).join('') + '</div>';
				}
				html += '<p>' + button('act', 'spiritack', '接受塔灵，开始旅程', busy || run.team.length > run.partyLimit) + '</p>';
			} else if (run.phase === 'blessing') {
				html += this.renderBlessingChoice(run, busy);
			} else if (run.phase === 'event') {
				html += run.challenge ? this.renderChallenge(run, busy) : this.renderEvent(run, busy);
			} else if (run.phase === 'choose') {
				html += '<h3>选择本层路线</h3><span class="rogue-caption">点击卡片选中，再点一次进入</span><div class="rogue-routes">';
				(run.choices || []).forEach(function (node) {
					var selected = this.selectedRoute === node.id;
					html += '<button type="button" name="chooseRoute" value="' + escape(node.id) + '" class="rogue-route rogue-route-' + routeTone(node.kind) +
						(selected ? ' is-selected' : '') + '" aria-pressed="' + selected + '"' + (busy ? ' disabled' : '') + '>' + routeVortex() + routeEmblem(node.kind) +
						'<strong class="rogue-route-type">' + escape(routeNames[node.kind] || kindNames[node.kind] || node.kind) + '</strong><span class="rogue-route-subtitle">' + escape((node.kind === 'trainer' && !node.challenge ? '与人对战' : node.name) + recommendedLabel(run, node.id)) + '</span><small>' +
						(node.biome ? 'Lv.' + (node.biome.level + (run.blessings ? run.blessings.levels : 0)) +
							(run.blessings && run.blessings.levels ? '（含祝福 +' + run.blessings.levels + '）' : '') + ' · ' + (node.biome.tier * 20) + '～' +
							(node.biome.tier * 20 + 20) + ' 档宝可梦池' : '') +
						'</small><span class="rogue-caption">' + (node.challenge ? '可选高难挑战 · 先看阵容与奖励' : node.fogged ? '路线与收益被迷雾遮蔽' : node.wildLoot ? '本层战利品 · 每场结束入包' : node.kind === 'trade' ? '选购专门商品 · 可以直接离开' : node.kind === 'story' ? '与老人交谈，留下这段记忆' : node.kind === 'event' ? '进入后揭晓事件，选择会影响收益与风险' : '整层完成奖励') + '</span>' +
						('<span class="rogue-route-description">' + (node.challenge ? '精英等级的战术队伍 · 胜利厚赏；可零收益逃离本层。' : node.kind === 'story' ? '故事进度跨局保存，交谈结束后领取老人的补给。' : node.kind === 'trade' ? '商品数量有限，库存不会随刷新改变。' : node.kind === 'trainer' ? '前方的遭遇尚不明朗。' : node.kind === 'elite' ? '挑战精英，可能获得战利品与经验糖果。' : node.kind === 'wild' ? '野生对战，可能获得战利品。' : node.id === 'masterballreward' ? '收下大师球 ×1；领取后仍可选择本层其他路线。' : node.kind === 'reward' ? '获得回复与复活物资，也可能带回其他旅途补给。' : '') + '</span>') +
						'<span class="rogue-route-hint">' + (selected ? '已选中 · 再点一次进入' : '点击选中') + '</span></button>';
				}, this);
				html += '</div>';
				if (!(run.choices || []).length) html += '<p>本层内容等待配置，存档已保留。</p>';
			} else if (run.phase === 'ready') {
				if (run.challenge) html += this.renderChallenge(run, busy);
				if (run.node && run.node.wildPack) html += '<p class="rogue-area-notice"><strong>连续野生对战 · ' + run.node.wildPack + ' 只</strong> · 捕捉或击倒后继续迎战下一只。</p>';
				if (run.node && run.node.environment) html += '<p class="rogue-area-notice">区域环境：<strong>' + escape(run.node.environment.name) + '</strong> · 开战后持续 5 回合。</p>';
				if (run.event) html += this.renderEvent(run, busy) + '<p class="rogue-caption">可先调整队伍。' + (run.event.memoryBattle ?
					'幻境结束后恢复原队伍与背包的战前状态，保留捕捉与实际经验。' : run.event.id === 'exclusiveclue' ? '袭击结束后可继续寻找线索，战败保留损耗。' : '战败后事件结束，保留损耗，不发胜利奖励。') +
				'逃跑保留损耗，本场叠层恢复至开战前，可整理队伍后再挑战本场。' + '</p>';
				if (run.node && run.node.rocket && !run.node.rocket.cleared) html += '<p><strong>火箭队袭击！</strong>击败后开放商店，并获得 <b>' + run.node.rocket.reward + ' 金币</b>。</p>';
				if (run.node && run.node.bonusEncounter) html += '<p><strong>额外遭遇</strong> · 发现了区域名单之外的宝可梦！</p>';
				var allFainted = !run.team.some(function (mon) { return mon.hp > 0; });
				html += '<h3>本层战斗 · ' + (run.encounter + 1) + ' / ' + run.encounters + '</h3>' +
					button('act', 'battle', (run.recovery ? '继续第 ' : '进入第 ') + (run.encounter + 1) + ' / ' + run.encounters + ' 场战斗', busy || allFainted);
				if (allFainted) html += '<p>全队濒死，请先在背包中使用复活道具。</p>';
				if (run.canEmergency) {
					html += '<p>已无复活道具，可送往宝可梦中心急救：复活全队并恢复全部 HP、PP 和异常状态。</p>' +
						button('act', 'emergency', '花费 ' + run.emergencyCost + ' 金币急救全队', busy || run.money < run.emergencyCost, fa('medkit'));
					if (run.money < run.emergencyCost) html += '<p class="rogue-caption">金币不足，还需 ' + (run.emergencyCost - run.money) + ' 金币。</p>';
				}
			} else if (run.phase === 'battle') {
				if (run.challenge) html += '<p class="rogue-challenge-hint"><strong>挑战区域</strong> · 逃跑只退出本场战斗，随后可选择重试或逃离本层；本次撤退无奖励，消耗保留。</p>';
				html += '<h3>' + (run.retreating ? '正在保存逃跑后的状态…' : '战斗进行中') + '</h3>' +
					button('joinRoom', run.roomid, '返回当前战斗', !run.roomid) + button('act', 'retreat', '逃跑（撤退到战斗外）', busy || run.retreating) +
					(!(run.preview && run.preview.stage === 'running') ? button('act', 'rematch', '再战（为全队恢复后重新挑战本场战斗）', busy || run.retreating) : '');
			} else if (run.phase === 'failed') {
				html += '<h3>连续挑战失败</h3><p>本层不允许途中治疗。重新挑战会恢复入层时的队伍和资源，已保存的捕捉解锁保留。</p>' +
					button('act', 'retry', '免费重试整层', busy);
			} else if (run.phase === 'rest' && run.node && run.node.kind === 'trade') {
				html += '<h3>' + escape(run.node.name) + '</h3><p>欢迎来到' + escape(run.node.name) + '！</p>' +
					button('act', 'continue', '交易完成，进入下一层', busy);
			} else if (run.phase === 'rest') {
				if (run.mentorOffer) {
                    html += '<section class="rogue-mentor-cards"><h3>老人递来的首领卡片</h3><p>选择一张，陪你迎战第 ' + run.mentorOffer.floor + ' 层首领。战胜后消散，重试时保留。</p><div class="rogue-routes">';
                    run.mentorOffer.cards.forEach(function (card) {
                        var axes = [['offense', '双攻'], ['defense', '双防'], ['speed', '速度']];
                        var primary = card.id === 'attack' ? 'offense' : card.id === 'guard' ? 'defense' : card.id === 'speed' ? 'speed' : '';
                        html += '<button class="rogue-route rogue-route-blue rogue-mentor-card" data-card="' + escape(card.id) + '" name="chooseMentorCard" value="' + escape(card.id) + '" aria-label="' + escape(card.name + '，' + card.text) + '"' + (busy ? ' disabled' : '') + '><span class="rogue-route-emblem">' + fa(card.id === 'attack' ? 'bolt' : card.id === 'guard' ? 'shield' : card.id === 'speed' ? 'forward' : 'star') + '</span><strong>' + escape(card.name) + '</strong><span class="rogue-mentor-focus">' + ({attack: '强攻', guard: '坚守', speed: '先手', balanced: '均衡'}[card.id] || '') + '</span><span class="rogue-mentor-stats">' + axes.map(function (axis) {
                            return '<span' + (axis[0] === primary ? ' class="is-primary"' : '') + '><span>' + axis[1] + '</span><b>' + (card[axis[0]] ? '+' + card[axis[0]] + '%' : '—') + '</b></span>';
                        }).join('') + '</span><span class="rogue-route-hint">收下卡片</span></button>';
                    }); html += '</div></section>';
                }
                if (run.mentorCard) html += '<p class="rogue-mentor-selected">' + fa('ticket') + escape(run.mentorCard.name) + ' · ' + escape(run.mentorCard.text) + '</p>';
                var care = run.centerCare || {cost: 0, needed: false};
				html += '<h3>宝可梦中心</h3><p>' + (run.spirit && run.spirit.id === 'yveltal' ? '塔灵交易：存活伙伴只恢复 PP 和异常状态，不恢复 HP、不复活。' :
					'复活倒下的伙伴，并恢复全队 HP、全部已学招式 PP 和异常状态。') + '</p>' +
					'<p class="rogue-caption">本次治疗：' + care.cost + ' 金币' + (care.fainted ? '（含 ' + care.fainted + ' 只伙伴的复活费用）' : '（无需复活附加费）') +
					'</p><div class="rogue-center-actions">' +
					button('act', 'heal', care.needed ? '全队治疗 · ' + care.cost + ' 金币' : '全队状态良好', busy || !care.needed || run.money < care.cost, fa('heart')) +
					button('act', 'continue', '补给完成，进入下一层', busy || !!run.mentorOffer) + '</div>';
			} else if (run.phase === 'reward') {
				html += run.rewardScene ? this.renderRewardScene(run, busy) : '<h3>领取本层奖励</h3>' + button('act', 'continue', '领取本层奖励并继续', busy, fa('gift'));
			} else if (run.phase === 'postgame') {
				html += '<h3>神之挑战</h3><p>是否向阿尔宙斯发起挑战？</p>' +
					'<p>全队已恢复，通关卡已保存。' + (run.difficulty === 'easy' ? '护符庇佑的简易档不获得局外成长点数' : '挑战胜利额外获得 <strong>' + (run.nuzlocke ? 40 : 20) + ' 点局外成长点数</strong>' + (typeof run.difficulty === 'number' && run.difficulty > 0 && !run.difficultyTest ? '与 <strong>' + (run.difficulty * 2) + ' 点崩坏适性</strong>' : '')) + '；失败或放弃挑战仍正常进入结局。</p>' +
					'<p class="rogue-caption">挑战中的成长与消耗不会改写通关卡。</p><div class="rogue-center-actions">' +
					button('act', 'godchallenge:accept', '我准备好了，挑战阿尔宙斯', busy, fa('star')) +
					button('act', 'godchallenge:decline', '这次就到这里，迎接结局', busy) + '</div>';
			} else if (run.phase === 'complete') {
				html += '<h3>已完成 200 层冒险！</h3>';
			}
            return html + '</section>';
		},
		renderStats: function (mon, locked) {
			var evs = mon.set.evs || {}, total = 0;
			Object.keys(statNames).forEach(function (stat) { total += evs[stat] || 0; });
			var html = '<h4>能力与努力值</h4><p class="rogue-caption">击败对手获得努力值 · 已分配 ' + total + ' / 510 · 单项上限 252</p>' +
				'<table class="rogue-stats"><colgroup><col class="rogue-stat-label-col" /><col class="rogue-stat-base-col" /><col /><col /><col /></colgroup>' +
				'<thead><tr><th>能力</th><th>种族值</th><th>努力值</th><th>个体值</th><th>最终能力</th></tr></thead><tbody>';
			Object.keys(statNames).forEach(function (stat) {
				var base = (mon.baseStats || {})[stat] || 0;
				html += '<tr><th>' + statNames[stat] + '</th><td><span class="rogue-stat-number">' + base + '</span>' +
					'<span class="rogue-stat-track"><span class="rogue-stat-bar" style="width:' + Math.min(100, base / 255 * 100) + '%"></span></span></td><td>' +
					(mon.evRespec ? '<input type="number" class="textbox" aria-label="' + statNames[stat] + '努力值" name="ev-' + stat +
						'" min="0" max="252" step="1" value="' + (evs[stat] || 0) + '"' + (locked ? ' disabled' : '') + ' />' : evs[stat] || 0) +
					'</td><td>' + ((mon.set.ivs || {})[stat] === undefined ? '—' : mon.set.ivs[stat]) + '</td><td><strong>' +
					((mon.stats || {})[stat] || (stat === 'hp' ? mon.maxhp : '—')) + '</strong></td></tr>';
			});
			html += '</tbody></table>';
			if (mon.compound) html += '<p class="rogue-caption">【五号化合物】新增种族值已计入。' +
				(mon.compound.reorganized ? '重组后保留原分配，按新品种正常进化' : '锁定最终形态：【' + escape(localName(mon.compound.finalSpecies)) + '】') + '；主特性为【化学之力】。</p>';
			if (mon.evRespec) html += '<p>事件允许重新分配一次：请保留总计 ' + mon.evRespec.total + ' 点。</p>' +
				button('applyEVs', '', '保存本次努力值分配', locked);
			else html += '<p class="rogue-caption">' + fa('lock') + '努力值平时不可修改；特殊事件开放后，可在这里重新分配。</p>';
			return html;
		},
		renderEditor: function (run, busy) {
			var mon = this.selectedPokemon();
			if (!mon) return '';
			this.selectedMember = mon.id;
			var locked = busy || !editable(run) || !!mon.nuzlockeDead;
			var panel = this.editPanel || 'stats';
			var slot = Math.min(this.moveSlot || 0, Math.min((run.moveSlots || 4) - 1, mon.set.moves.length));
			this.moveSlot = slot;
			var species = dex().species ? dex().species.get(mon.set.species) : {};
			var html = '<section class="rogue-editor" aria-label="队伍编辑器"><h3>宝可梦队伍</h3><div class="rogue-team-tabs" role="tablist">';
			run.team.forEach(function (member) {
				html += '<button role="tab" aria-selected="' + (member.id === mon.id) + '" name="selectMember" value="' + escape(member.id) + '">' +
					'<span class="picon" style="' + Dex.getPokemonIcon(member.set.species) + '"></span><span>' + escape(localName(member.set.species)) +
					(run.blessings && run.blessings.dragonKing && run.blessings.dragonKing.member === member.id ? ' <em class="rogue-king-mark" title="队伍龙王">♛</em>' : '') +
					((member.evolutionDetails || []).some(function (evo) { return evo.ready; }) ? '<em class="rogue-evolution-mark" title="已满足进化条件">可进化 ↑</em>' : '') +
					'</span><small>' + (member.egg ? '距孵化 ' + member.remainingFloors + ' 层' : 'Lv.' + member.set.level + ' · ' + (member.nuzlockeDead ? '本局永久死亡' : member.hp ? 'HP ' + member.hp + '/' + member.maxhp : '已倒下')) + '</small></button>';
			});
			html += '</div><div class="rogue-member-toolbar"><span><strong>' + escape(localName(mon.set.species)) + '</strong>' +
				button('healMember', mon.id, '一键治疗', locked || run.healingLocked || mon.egg || mon.nuzlockeDead || mon.hp === mon.maxhp && !mon.status && !Object.keys(mon.statuses || {}).length, fa('medkit')) +
				button('releaseMember', mon.id, '放生', busy || !editable(run) || !mon.release || !!mon.release.reason) +
				((mon.evolutionDetails || []).some(function (evo) { return evo.ready; }) ?
					'<button class="button rogue-evolution-trigger" name="showEvolutionChoices" value="' + escape(mon.id) + '"' +
					(locked || run.healingLocked ? ' disabled' : '') + '>↑ 可进化</button>' : '') + '</span><span>' +
				button('moveMember', '-1', '前移', locked || run.team[0] === mon, fa('arrow-left')) +
				button('moveMember', '1', '后移', locked || run.team[run.team.length - 1] === mon, fa('arrow-right')) + '</span></div>';
			if (mon.egg) return html + '<div class="rogue-floor"><h4>宝可梦蛋</h4><p>蛋里偶尔传来轻轻的响声。再前进 <b>' + mon.remainingFloors + '</b> 层，就能与新伙伴相见。</p></div></section>';
			if (mon.nuzlockeDead) html += '<div class="rogue-nuzlocke-notice"><strong>本局永久死亡</strong><p>保留旅途记录；不能复活、出战、培养或融合，可在上方放生。</p></div>';
			html += '<div class="rogue-member-sheet"><div class="rogue-identity">' +
				'<div class="rogue-sprite-frame"><div class="rogue-sprite" role="img" aria-label="' + escape(localName(mon.set.species)) + '" style="' +
				(typeof Dex.getTeambuilderSprite === 'function' ? Dex.getTeambuilderSprite(mon.set) : '') + '"></div>' +
				'</div>' +
				'<div>' + typeIcons(mon.types || species.types) + '</div>' + (mon.stars > 1 || run.spirit && run.spirit.id === 'zygarde' ? '<b class="rogue-stars">' + '★'.repeat(mon.stars || 1) + '</b>' : '') +
				'<strong>HP ' + mon.hp + ' / ' + mon.maxhp + '</strong>' +
				'<meter min="0" max="' + mon.maxhp + '" value="' + mon.hp + '" aria-label="生命值"></meter>' +
				(!mon.hp || mon.status || Object.keys(mon.statuses || {}).length ? '<small>' + statusBadges(mon) + '</small>' : '') + '</div>';
			var exp = mon.experienceProgress;
			var ability = dex().abilities ? dex().abilities.get(mon.set.ability || '') : {name: mon.set.ability || ''};
			var item = this.state.items.filter(function (entry) { return entry.id === idOf(mon.set.item); })[0];
			var emblem = this.state.items.filter(function (entry) { return entry.id === mon.emblem; })[0];
			var nature = localName(mon.mintNature || mon.set.nature || '—');
			var natureParts = nature.split(/\s*(?=[（(])/);
			html += '<div class="rogue-member-details"><div class="rogue-details-line"><span>等级<br /><b>' + mon.set.level +
				'</b></span><span class="rogue-gender">性别<br /><b>' + escape({M: '雄性', F: '雌性'}[mon.set.gender] || '无性别') + '</b></span><span class="rogue-nature">性格<br /><b>' +
				escape(natureParts[0]) + (mon.mintNature ? '薄荷' : '') + '<span class="rogue-nature-effect" title="' +
				escape(mon.mintNature ? '原性格：' + localName(mon.set.nature) + '（进化条件不变）' : '') + '">' + escape(natureParts.slice(1).join('')) + '</span></b></span></div>' +
				'<p class="rogue-exp">' + (mon.fixedLevel ? '驻时伙伴 · 等级固定 ' + mon.fixedLevel : exp ? '经验：' + (exp.needed ? exp.current + ' / ' + exp.needed + '（下一级）' : '已达 100 级') : '经验：—') + '</p>' +
				'<div class="rogue-equipment-slots"><div><label>携带道具</label>' + button('editSection', 'items', item ? localName(item.name) : mon.set.item ? localName(mon.set.item) : '无道具', false, item ? itemIcon(item) : fa('cube')) +
				'</div><div><label>属性转</label>' + button('editSection', 'emblems', emblem ? localName(emblem.name) : '未赋予', false, emblem ? itemIcon(emblem) : fa('exchange')) + '</div></div>' +
				'<label>特性</label><div class="rogue-ability-line">' + button('editSection', 'abilities', localName(ability.name || '—'), false);
			var extras = extraAbilityIds(mon);
			if (extras.length) html += '<button class="button rogue-extra-abilities" name="showExtraAbilities" value="' + escape(mon.id) +
				'" title="查看全部额外特性及效果" aria-label="查看 ' + extras.length + ' 项额外特性及效果">' +
				(extras.length === 1 ? '＋' + escape(localName(dex().abilities.get(extras[0]).name)) : '＋…') + '</button>';
			html += '</div></div>';
			html += '<div class="rogue-equipped-moves"><label>招式 · 点击更换</label>';
			for (var i = 0; i < (run.moveSlots || 4); i++) {
				var move = mon.set.moves[i] && memberMove(mon.set.moves[i], mon);
				var pp = (mon.pp || [])[i];
				html += '<div' + (panel === 'moves' && slot === i ? ' class="selected"' : '') + '>' +
					('<button class="button rogue-equipped-move" name="editSection" value="moves:' + i + '"' + (move ? ' data-type="' + escape(move.type) + '"' : '') + (i > mon.set.moves.length ? ' disabled' : '') + '>' + (move ? '<strong>' + escape(localName(move.name, 'move')) + '</strong><small>' + escape(localName(move.type)) + ' · 威力 ' + (move.category === 'Status' ? '—' : move.basePower || '变化') + ' · 命中 ' + (move.accuracy === true ? '必中' : move.accuracy + '%') + ' · PP ' + (pp ? pp.pp + '/' + pp.maxpp : '—') + '</small>' : '空招式位') + '</button>') +
					(i > 0 && move ? button('moveSlotUp', String(i), '↑', locked) : '') + '</div>';
			}
			html += '</div><button class="rogue-stat-summary" name="editSection" value="stats"><strong>能力 / 努力值</strong>';
			Object.keys(statNames).forEach(function (stat) {
				html += '<span>' + statNames[stat] + '<b>' + ((mon.stats || {})[stat] || (stat === 'hp' ? mon.maxhp : '—')) +
					'</b><small>' + ((mon.set.evs || {})[stat] || 0) + '</small></span>';
			});
			html += '</button></div>' + memberResources(run, mon);
			var growth = [];
			if (mon.tonics && mon.tonics.wine) growth.push('酒：每次登场混乱 · 每场首个实际招式威力 ×2');
			if (mon.tonics && mon.tonics.cephalosporin) growth.push('头孢：免疫七种异常状态，不免疫混乱');
			if (mon.tonics && mon.tonics.wine && mon.tonics.cephalosporin) growth.push('组合效果：追加幽灵属性' + (mon.tonics.poison ? ' · 毒招威力 ×1.5' : ''));
			if (mon.bond !== undefined) growth.push('友好度 ' + mon.bond + ' / 100');
			if (mon.bonusHP) growth.push('永久 HP +' + mon.bonusHP);
			if (growth.length) html += '<p class="rogue-caption rogue-permanent-growth">' + escape(growth.join(' · ')) + '</p>';
			if (mon.formOptions && mon.formOptions.length) {
				html += '<div class="rogue-form-options"><h4>专属道具 · 形态变化</h4>';
				mon.formOptions.forEach(function (option) {
					var item = this.state.items.find(function (entry) { return entry.id === option.item; });
					var donor = option.donor && run.team.find(function (p) { return p.id === option.donor; });
					html += '<p>' + (item ? itemIcon(item) + '【' + escape(item.name) + '】' : '') +
						button('useFormItem', option.id, (option.id === 'separate' ? '解除合体 · ' : '变为 ') + localName(option.species) +
							(donor ? '（与' + localName(donor.set.species) + '融合）' : ''), locked || !mon.hp) + '</p>';
				}, this);
				html += '</div>';
			}
			if (!editable(run)) html += '<p class="rogue-caption">当前可查看队伍，完成战斗及待处理结算后可调整。</p>';
			html += '<div class="rogue-editor-options">';
			if (panel === 'moves') {
				html += '<h4>可更换招式 · 第 ' + (slot + 1) + ' 个位置</h4><p class="rogue-caption">已学与替换下来的招式都会保留；更换保留剩余 PP。</p>';
				html += '<div class="rogue-move-picker" data-rogue-key="moves:' + escape(mon.id) + '" tabindex="0" role="region" aria-label="可更换招式，列表内上下滚动">';
				var learnedMoves = mon.moveMemory || mon.pp || [];
				var equippedIds = mon.set.moves.map(idOf);
				var availableMoves = learnedMoves.concat((mon.blessingPP || []).filter(function (move) {
					return (mon.blessingMoves || []).indexOf(move.id) >= 0 && !learnedMoves.some(function (known) { return known.id === move.id; });
				}));
				// Keep equipped moves in slot order without changing the server's learned-move memory.
				equippedIds.map(function (id, index) {
					return availableMoves.find(function (move) { return move.id === id; }) || (mon.pp || [])[index];
				}).filter(Boolean).concat(availableMoves.filter(function (move) {
					return equippedIds.indexOf(move.id) < 0;
				})).forEach(function (move) {
					var equipped = equippedIds.indexOf(move.id);
					html += '<div class="rogue-choice-row' + (equipped >= 0 ? ' is-equipped' : '') + '" data-rogue-key="move:' + escape(move.id) + '">' +
						(equipped >= 0 ? '<span class="rogue-move-slot" title="已装备 · 第 ' + (equipped + 1) + ' 位">' + (equipped + 1) + '</span>' : '') + moveRow(move.id, move, mon) +
						button('chooseMove', move.id, equipped === slot ? '已装备' : equipped >= 0 ? '交换到此位置' : '装备此招式',
							locked || equipped === slot || (equipped >= 0 && slot === mon.set.moves.length)) + '</div>';
				});
				html += '</div>';
			} else if (panel === 'abilities') {
				html += '<h4>可更换特性</h4><p class="rogue-caption">事件解锁的新特性会加入此列表。</p>';
				(mon.abilityPool || [{id: idOf(mon.set.ability)}]).forEach(function (entry) {
					var data = dex().abilities ? dex().abilities.get(entry.id) : {name: entry.id};
					var hidden = entry.hidden || species.abilities && idOf(species.abilities.H) === entry.id;
					html += '<div class="rogue-option"><strong>' + escape(localName(data.name)) +
						(hidden ? ' <span class="rogue-badge">隐藏特性</span>' : '') + '</strong><p>' +
						escape(localName(data.shortDesc || data.desc || '')) + '</p>' +
						button('chooseAbility', entry.id, entry.id === idOf(mon.set.ability) ? '当前特性' : '更换为此特性',
							locked || entry.id === idOf(mon.set.ability)) + '</div>';
				});
			} else if (panel === 'emblems') {
				html += '<h4>属性转 · 独立栏位</h4><p class="rogue-caption">不占携带道具位；更换或取下后回到背包。取下会撤销它提供的临时招式权限。</p>' +
					button('equipEmblem', '', '取下属性转', locked || !mon.emblem);
				var baseTypes = mon.emblemBaseTypes || species.types || [];
				this.state.items.filter(function (entry) { return entry.kind === 'emblem' && (run.bag[entry.id] > 0 || mon.emblem === entry.id); }).forEach(function (entry) {
					html += '<div class="rogue-option"><strong>' + itemIcon(entry) + escape(localName(entry.name)) + (mon.emblem === entry.id ? ' · 已赋予' : ' ×' + run.bag[entry.id]) +
						'</strong><p>' + escape(itemDescription(entry)) + '</p>';
					if (baseTypes.length > 1) {
						[0, 1].forEach(function (slot) {
							var selected = mon.emblem === entry.id && (mon.emblemSlot === undefined ? 1 : mon.emblemSlot) === slot;
							html += button('equipEmblem', entry.id + '|' + slot, (selected ? '已替换' : '替换') + (slot ? '第二' : '第一') + '属性：' + localName(baseTypes[slot]), locked || selected);
						});
					} else html += button('equipEmblem', entry.id, '添加属性', locked || mon.emblem === entry.id);
					html += '</div>';
				});
			} else if (panel === 'items') {
				var evioliteLocked = idOf(mon.set.item) === 'eviolite' && run.blessings && run.blessings.owned.some(function (entry) { return entry.family === 'kid'; });
				html += '<h4>选择携带道具</h4><p class="rogue-caption">' + (evioliteLocked ?
					'【小鬼当家】：进化奇石已锁定，不能取下或更换；携带者不能进化为最终形态。' : '从背包取出，替换下来的道具回到背包。') + '</p>' +
					button('equipItem', '', '卸下当前道具', locked || evioliteLocked || !mon.set.item);
				this.state.items.filter(function (entry) { return entry.kind === 'held' && !entry.id.startsWith('rogueuniversal') && run.bag[entry.id] > 0; }).forEach(function (entry) {
					html += '<div class="rogue-option"><strong>' + itemIcon(entry) + escape(localName(entry.name)) + ' ×' + run.bag[entry.id] +
						'</strong><p>' + escape(itemDescription(entry)) + '</p>' + button('equipItem', entry.id, '携带', locked || evioliteLocked) + '</div>';
				});
			} else {
				html += this.renderStats(mon, locked) + '<div class="rogue-permanent-gains"><p class="rogue-boosts">局外能力加成：' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + run.boosts[stat] + (run.boostRuleVersion === 2 ? '%' : ''); }).join(' / ') + '</p>' +
					this.renderRunTraining(run) + '</div>';
			}
			html += '</div>' + this.renderUniversalConfig(mon, locked || !!run.healingLocked) + '<div class="rogue-evolution-details"><h4>进化条件' +
				(typeof mon.friendship === 'number' ? '<span class="rogue-caption">亲密度 ' + mon.friendship + ' / 255</span>' : '') + '</h4>';
			if (Array.isArray(mon.evolutionDetails)) {
				if (!mon.evolutionDetails.length) html += '<p>已无后续进化。</p>';
				mon.evolutionDetails.forEach(function (evo) {
					html += '<div class="rogue-evolution-branch"><strong>' + escape(localName(evo.species)) + '</strong><ul>';
					evo.requirements.forEach(function (condition) {
						html += '<li class="' + (condition.met ? 'met' : 'unmet') + '">' + (condition.met ? '✓ ' : '○ ') +
							escape(condition.text) + (condition.name ? ' ' + escape(localName(condition.name)) : '') + '</li>';
					});
					html += '</ul>' + button('evolveMember', mon.id + '|' + idOf(evo.species), '进化',
						locked || run.healingLocked || !evo.ready) + '</div>';
				});
			} else {
				html += '<p class="rogue-caption">进化条件等待服务器更新。</p>';
				(mon.evolutions || []).forEach(function (evo) {
					html += button('evolveMember', mon.id + '|' + idOf(evo.species), '进化为 ' + localName(evo.species),
						locked || run.healingLocked || !mon.hp || (evo.item && !run.bag[evo.item]));
				});
			}
			return html + '</div></section>';
		},
		renderBox: function (run, busy) {
			if (!run.box) return '';
			var locked = busy || !editable(run) || run.healingLocked;

			var owned = run.team.concat(run.box), canMerge = run.spirit && run.spirit.id === 'zygarde';
			var html = '<section class="rogue-box"><h3>' + fa('archive') + '宝可梦箱子 · ' + run.box.length + ' / 30</h3>' +
				'<p class="rogue-caption">调换不恢复 HP、PP 或状态。' + (canMerge ? '升星需选定一位保留成员及两位消耗成员，消耗成员的道具会返还。' : '') + '</p>' +
				'<label>取出时：<select name="boxTarget"><option value="">加入队伍空位</option>' + run.team.map(function (mon) {
					return '<option value="' + escape(mon.id) + '">交换 ' + escape(localName(mon.set.species)) + '</option>';
				}).join('') + '</select></label><div class="rogue-inventory">';
			owned.forEach(function (mon) {
				var inTeam = run.team.indexOf(mon) >= 0;
				var matches = owned.filter(function (other) { return idOf(mon.set.species) === idOf(other.set.species) && (mon.stars || 1) === (other.stars || 1); });
				html += '<div class="rogue-item-card"><strong><span class="picon" style="' + Dex.getPokemonIcon(mon.set.species) + '"></span>' +
					escape(localName(mon.set.species)) + ' ' + '★'.repeat(mon.stars || 1) + '</strong><p>' + (inTeam ? '队伍' : '箱子') +
					' · Lv.' + mon.set.level + ' · HP ' + mon.hp + '/' + mon.maxhp + '</p>' +
					'<div class="rogue-item-actions">' +
					button('boxMember', mon.id, inTeam ? '存入箱子' : '取出／交换', locked || inTeam && (run.team.length <= 1 || run.box.length >= 30)) +
					(canMerge ? button('mergeMember', mon.id, '保留此伙伴并升星', locked || matches.length < 3 || mon.stars >= 4 || mon.fusion) : '') + '</div></div>';
			});
			return html + '</div></section>';
		},
		renderBag: function (run, busy) {
			var usable = editable(run) && !busy && !run.healingLocked;
			var target = this.selectedPokemon();
			var itemTarget = target && target.id;
			var html = '<section class="rogue-bag"><h3>' + fa('suitcase') + '背包</h3>' +
				'<div class="rogue-wallet">' + fa('money') + '金币 <strong>' + run.money + '</strong></div>' +
				'<p><label>道具目标：<select name="target">' + run.team.map(function (mon) {
					return '<option value="' + escape(mon.id) + '"' + (mon.id === itemTarget ? ' selected' : '') + '>' +
						escape(localName(mon.set.species)) + ' · Lv.' + mon.set.level + ' · HP ' + mon.hp + '/' + mon.maxhp + '</option>';
				}).join('') + '</select></label></p><div class="rogue-inventory">';
			if (run.charm) html += '<div class="rogue-item-card rogue-charm"><div class="rogue-item-heading">' + charmIcon() +
				'<strong>' + escape(run.charm.name) + '</strong></div>' + charmDescription(run.charm.description) + '<small>本局护符 · 不占携带道具位</small>' +
				button('showCharm', '', '查看护符庇佑') + '</div>';
			var held = this.state.items.filter(function (item) { return item.kind !== 'treasure' && run.bag[item.id] > 0; });
			held.forEach(function (item) {
				html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
					'</strong><b>×' + run.bag[item.id] + '</b></div><small>' + escape(item.category || (item.kind === 'mint' ? '性格薄荷' : item.kind === 'machine' ? '招式学习机' : itemKinds[item.kind])) + '</small><p>' + escape(itemDescription(item)) + '</p>';
				if (['ball', 'evolution', 'held', 'emblem', 'terashard'].indexOf(item.kind) < 0) {
					var reason = !target ? '请选择目标' : target.egg ? '蛋尚未孵化' : '';
					if (target && !target.egg) {
						if (item.kind === 'heal') reason = !target.hp ? '需先复活' : target.hp >= target.maxhp ? 'HP 已满' : '';
						if (item.kind === 'revive') reason = target.hp ? '仅能复活濒死伙伴' : '';
						if (item.kind === 'cure') reason = !target.hp ? '需先复活' : !canCure(item, target) ? '无对应异常状态' : '';
						if (item.kind === 'ether') reason = !target.hp ? '需先复活' : !target.pp.some(function (slot) { return slot.pp < slot.maxpp; }) ? 'PP 已满' : '';
						if (item.kind === 'crown') reason = Object.keys(statNames).every(function (stat) { return target.set.ivs[stat] >= (run.difficulty === 'easy' ? ((run.difficultyRulesVersion || 1) >= 4 ? 15 : 10) : 31); }) ? '个体值已达本档上限' : '';
						if (item.kind === 'mint') reason = target.mintNature === item.nature ? '已生效' : '';
						if (item.kind === 'tonic') reason = target.tonics && target.tonics[item.id.replace(/^rogue/, '')] ? '已生效' : '';
						if (item.kind === 'ability') reason = target.abilityChanges && target.abilityChanges[item.id] ? '' : '没有可变更的特性';
						if (item.kind === 'machine') reason = (target.machineMoves || []).indexOf(item.move) < 0 ? '无法学习或已经掌握' : '';
						if (item.kind === 'candy' || item.kind === 'rarecandy') reason = !target.hp ? '需先复活' : target.fixedLevel || target.set.level >= (target.uncappedLevel ? 9999 : 100) ? '无法升级' : '';
						if (item.kind === 'effort') reason = target.set.evs[item.stat] >= 252 || Object.keys(statNames).reduce(function (sum, stat) {
							return sum + (target.set.evs[stat] || 0);
						}, 0) >= 510 ? '基础点数已达上限' : '';
					}
					html += button('useItem', item.id, reason || (item.kind === 'ability' ? '变更为' + localName(target.abilityChanges[item.id]) : '使用'), !usable || !!reason);
				}
				if (item.kind === 'terashard') html += button('changeTera', (itemTarget || '') + ':' + item.teraType, '更改太晶属性', busy || !editable(run) || !target || !!target.egg || run.bag[item.id] < 50 || target.set.teraType === item.teraType);
				if (item.kind === 'held') html += button('openHeldItems', '', '在队伍中装备', !run.team.length);
				if (item.kind === 'forme') html += '<small>选择对应伙伴后，在队伍的形态变化栏使用。</small>';
				if (item.kind === 'emblem') html += button('openEmblems', '', '赋予属性转', !run.team.length);
				html += '</div>';
			});
			if (!held.length) html += '<p class="rogue-caption">暂无物品</p>';
			html += '</div>';
			var treasures = this.state.items.filter(function (item) { return item.kind === 'treasure' && run.bag[item.id] > 0; });
			if (treasures.length) {
				html += '<div class="rogue-treasures"><h4>' + fa('diamond') + '贵重物品 <small>到商店兑换金币</small></h4><div class="rogue-inventory">';
				treasures.forEach(function (item) {
					html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(item.name) +
						'</strong><b>×' + run.bag[item.id] + '</b></div><p>每个 ' + item.sellPrice + ' 金币 · 合计 <b>' +
						(run.bag[item.id] * item.sellPrice) + '</b></p>' + (run.blessings && run.blessings.owned.some(function (b) { return b.family === 'mushroomsynthesis'; }) && /mushroom$/.test(item.id) ? button('treasureQuantity', 'feed:' + item.id, '投喂蘑菇伙伴', busy || !editable(run)) : '') + '</div>';
				});
				html += '</div></div>';
			}
			return html + '</section>';
		},
		renderShop: function (run, busy) {
			if (run.phase !== 'rest') return '';
			var sections = this.shopSections || (this.shopSections = {});
			this.$('.rogue-shop details[data-shop-group]').each(function () {
				sections[this.getAttribute('data-shop-group')] = this.open;
			});
			var usable = editable(run) && !busy && !run.healingLocked;
			var fullPrice = run.node && run.node.trade && run.node.trade.kind === 'buyback';
			var treasures = this.state.items.filter(function (item) { return (fullPrice || item.kind === 'treasure') && run.bag[item.id] > 0 && (item.recyclePrice || item.sellPrice); });
			var sellPrice = function (item) { return item.recyclePrice || Math.floor(item.sellPrice * (run.node && run.node.trade && run.node.trade.kind === 'mushroom' && /mushroom$/.test(item.id) ? 1.25 : 1)); };
			var total = treasures.reduce(function (sum, item) { return sum + run.bag[item.id] * sellPrice(item); }, 0);
			var html = '<section class="rogue-shop rogue-floor" aria-label="商店"><h3>' + fa('shopping-cart') +
				(run.node && run.node.kind === 'trade' ? escape(run.node.name) : '宝可梦中心商店') + '</h3><!--shop-categories--><span class="rogue-shop-balance">金币 <b>' + run.money + '</b></span>' +
				'<div class="rogue-exchange"><strong>' + fa('diamond') + (fullPrice ? '背包物品原价回收' : '战利品兑换') + '</strong> ' +
				(total ? '可兑换 <b>' + total + '</b> 金币 ' + button('act', 'sell:all', '全部兑换', !usable) : '<span class="rogue-caption">暂时没有可回收的物品</span>');
			if (treasures.length) {
				html += '<details data-shop-group="exchange"' + (fullPrice || sections.exchange ? ' open' : '') +
					'><summary>明细 · 按品类兑换</summary><div class="rogue-inventory">';
				treasures.forEach(function (item) {
						html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
						'</strong><b>×' + run.bag[item.id] + '</b></div><p>' + (fullPrice ? '基础回收价' : /mushroom$/.test(item.id) ? '蘑菇' : /pearl/.test(item.id) ? '珍珠' : '其他战利品') + ' · 单价 ' + sellPrice(item) + ' 金币</p>' +
						button('treasureQuantity', 'sell:' + item.id, '选择兑换数量', !usable) + button('act', 'sell:' + item.id, '兑换此类全部 +' + (run.bag[item.id] * sellPrice(item)), !usable) + '</div>';
				});
				html += '</div></details>';
			}
			html += '</div>';
			if (fullPrice) return html + '<p class="rogue-caption">按统一基础标价回收，战利品按自身价值。折扣、拍卖成交价和塔灵溢价不影响回收价；已装备道具请先卸下。</p></section>';
			if (run.node && run.node.kind === 'rest') {
				var fainted = run.team.filter(function (mon) { return !mon.hp; }).length;
				var revives = this.state.items.filter(function (item) { return item.kind === 'revive'; })
					.reduce(function (sum, item) { return sum + (run.bag[item.id] || 0); }, 0);
				html += '<div class="rogue-preparation-summary" aria-label="补给检查"><strong>出发前检查</strong>' +
					'<span>倒下伙伴 <b>' + fainted + ' / ' + run.team.length + '</b></span><span>复活道具 <b>' + revives + '</b> 个</span>' +
					(run.spirit && run.spirit.id === 'yveltal' ? '<span>本塔灵禁止复活与回复 HP</span>' :
						'<span>全队急救 <b>' + (run.emergencyCost || '—') + '</b> 金币' +
						(run.emergencyCost && run.money < run.emergencyCost ? '（余额不足）' : '') + '</span>') + '</div>';
			}
			var hpBuyer = run.team.find(function (mon) { return mon.id === this.hpTarget; }, this) || run.team[0];
			if (run.node && run.node.trade && run.node.trade.kind === 'growth') {
				var finished = !(run.growthOffers || []).some(function (offer) { return offer.remaining; });
				html += '<h4>一次集训，自选伙伴与项目</h4><p>选择训练员、参加的伙伴及攻击／防御／特攻／特防／速度项目。<strong>当场完成，伙伴不离队。</strong>项目与人数越多，总价越高；高档训练员每金币带来的提升更多。</p>';
				(run.growthOffers || []).forEach(function (offer) { html += '<p><strong>' + escape(offer.name) + '</strong> · 每位伙伴每项 +' + offer.amount / 100 + '% · ' + offer.price + ' 金币</p>'; });
				return html + button('openTrainingCamp', '', finished ? '本营地已完成训练' : '安排本次训练', !usable || finished) + '<p class="rogue-caption">每个营地只可确认一次。训练提升在本局持续，各项个人营地增幅最高 60%；不能训练蛋或融合中的伙伴。</p></section>';
			}
			if (run.blessings && run.blessings.owned.some(function (entry) { return entry.family === 'shopraid'; }) && !run.node.shopChallenge) {
				html += '<p class="rogue-shop-challenge">' + button('challengeShop', '', '零元购 · 挑战店主', !usable || !run.team.some(function (mon) { return mon.hp > 0; }), fa('flag')) +
					'<span class="rogue-caption"> 挑战后本店关闭并进入下一层。请先领取首领战前增幅、完成购物，未处理的内容无法补领或补购。</span></p>';
			}
			var hpRemaining = run.spirit && run.spirit.id === 'yveltal' ? 3 - (run.node.hpPurchases || 0) : 0;
			if (run.spirit && run.spirit.id === 'yveltal') html += '<p class="rogue-hp-shop">血量支付：本店剩余 <b>' + hpRemaining + ' / 3</b> 件 · <select name="hpTarget">' +
				run.team.map(function (mon) { return '<option value="' + escape(mon.id) + '"' + (mon === hpBuyer ? ' selected' : '') + '>' +
					escape(localName(mon.set.species)) + ' HP ' + mon.hp + '/' + mon.maxhp + '</option>'; }).join('') + '</select>（至少保留 1 HP）</p>';
			var stock = this.state.items.filter(function (item) {
				return item.kind !== 'treasure' && (item.kind !== 'candy' || typeof item.shopFloor === 'number') && item.shopFloor !== false && (item.shopFloor || 1) <= run.floor &&
					(!this.state.shopItems || this.state.shopItems.indexOf(item.id) >= 0);
			}, this);
			var groups = [{name: '性格薄荷', kinds: ['mint']}, {name: '招式学习机', kinds: ['machine']}, {name: '精灵球与补给', kinds: ['ball', 'heal', 'revive', 'cure', 'ether']},
				{name: '个体值与基础点数训练', kinds: ['effort', 'crown']}, {name: '对战影响道具', kinds: ['held'], category: '对战影响道具'}, {name: '进化与携带道具', kinds: ['evolution', 'held'], excludeCategory: '对战影响道具'}, {name: run.node && run.node.kind === 'trade' ? '经验糖果' :
					run.spirit && run.spirit.id === 'meowth' ? '塔灵特供 · 经验糖果' : '限量经验糖果', kinds: ['candy']}];
			html = html.replace('<!--shop-categories-->', '<nav class="rogue-shop-categories" aria-label="商品分类">' + groups.map(function (group, index) {
				return stock.some(function (item) { return group.kinds.indexOf(item.kind) >= 0 && (!group.category || item.category === group.category) && (!group.excludeCategory || item.category !== group.excludeCategory); }) ? button('jumpShopGroup', '' + index, group.name) : '';
			}).join('') + '</nav>');
			groups.forEach(function (group, index) {
				var entries = stock.filter(function (item) { return group.kinds.indexOf(item.kind) >= 0 && (!group.category || item.category === group.category) && (!group.excludeCategory || item.category !== group.excludeCategory); });
				if (!entries.length) return;
				html += '<section class="rogue-shop-group" data-shop-category="' + index + '" data-rogue-key="shop:' + index + '"><h4>' + group.name + ' · ' + entries.length +
					' 种</h4><div class="rogue-inventory">';
				entries.forEach(function (item) {
					var remaining = item.remaining;
					if (remaining === undefined && run.node && run.node.trade) {
						var offer = (run.node.trade.stock || []).find(function (entry) { return entry.id === item.id; });
						if (offer) remaining = offer.remaining;
					}
					html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
						'</strong></div><p>' + escape(itemDescription(item)) + '</p><p>' + fa('money') + '<b>' + item.price + '</b> 金币 · 持有 ' +
						(run.bag[item.id] || 0) + '</p><div class="rogue-item-actions">' +
						button('act', 'buy:' + item.id, remaining === 0 ? '本店已售罄' : '金币购买' +
							(remaining === undefined ? '' : ' · 剩余 ' + remaining), !usable || run.money < item.price || remaining === 0);
					if (remaining !== 0 && remaining !== 1) html += button('buyItems', item.id, '批量购买', !usable || run.money < item.price);
					if (run.spirit && run.spirit.id === 'yveltal') {
						var hpCost = Math.ceil(hpBuyer.maxhp * Math.min(.8, Math.max(.1, Math.ceil(item.price / 250) * .05)));
						html += button('buyWithHP', item.id, '支付 ' + hpCost + ' HP', !usable || hpRemaining <= 0 || hpBuyer.hp <= hpCost || remaining === 0);
					}
					html += '</div></div>';
				});
				html += '</div></section>';
			});
			var later = this.state.items.filter(function (item) { return typeof item.shopFloor === 'number' && item.shopFloor > run.floor; });
			if (later.length && (!run.node || run.node.kind !== 'trade')) {
				var next = Math.min.apply(null, later.map(function (item) { return item.shopFloor; }));
				html += '<p class="rogue-caption">第 ' + next + ' 层解锁：' + later.filter(function (item) { return item.shopFloor === next; })
					.map(function (item) { return escape(localName(item.name)); }).join('、') + '</p>';
			}
			return html + '</section>';
		},
		updateParty: function () {
			var panel = app.rooms && app.rooms.fantasyrogueparty;
			if (panel) panel.render();
		},
		renderSystems: function (run) {
			var systems = [
				['太晶化', run.teraUnlocked, 'diamond'], ['超进化', run.megaUnlocked, 'bolt'],
				['超巨进化', run.gmegaUnlocked, 'star'], ['Z 招式', run.zUnlocked, 'flash']
			];
			return '<section class="rogue-systems" aria-label="本局特殊系统"><div class="rogue-system-cards">' + systems.map(function (system) {
				return '<span class="rogue-system-card ' + (system[1] ? 'is-unlocked' : 'is-locked') + '">' +
					fa(system[1] ? system[2] : 'lock') + '<strong>' + system[0] + '</strong><small>' +
					(system[1] ? '已解锁' : '未解锁') + '</small></span>';
			}).join('') + '</div><p class="rogue-system-status">' +
				(run.teraUnlocked ? '太晶化每场战斗限用一次。' : '太晶化可通过预定祝福或第 100 层馆主赠礼解锁。') +
				'普通超级石与 Z 纯晶需先解锁对应系统，再携带使用。</p></section>';
		},
		renderParty: function () {
			var state = this.state;
			if (!state || !state.account) return '<p>请先在左侧打开幻想杯肉鸽，读取冒险存档。</p>';
			var run = state.run, busy = !!this.pending || !app.socket || app.socket.readyState !== 1;
			var html = '<h2>队伍及背包</h2>';
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';

			if (run) {
				html += this.renderBlessings(run, busy);
				if (run.eventBuff && run.eventBuff.battles > 0) html += '<div class="rogue-keepsake"><strong>' + fa('leaf') + '奇异活力 · 剩余 ' +
					Number(run.eventBuff.battles) + ' 场</strong><p>全队造成伤害 +20%，受到伤害 −10%；后来加入的伙伴同样生效。每次开战消耗一场，旁观不消耗。</p></div>';
				if (run.startCard) html += '<div class="rogue-keepsake rogue-preference"><strong>' + fa('clone') + escape(run.startCard.name) +
					'</strong><p>' + escape(run.startCard.text) + '</p></div>';
				html += this.renderCompanions(run, busy) + this.renderTrainerBonds(run, busy);
				html += this.renderSystems(run) +
					this.renderDragonKing(run, busy) + this.renderEditor(run, busy) + this.renderBox(run, busy) + this.renderBag(run, busy);
				if (run.notices && run.notices.length) html += '<details class="rogue-notices"><summary>本次战斗的经验与成长明细</summary><ul>' +
					run.notices.map(function (notice) { return '<li>' + dialogueText(noticeText(notice)) + '</li>'; }).join('') + '</ul></details>';
			} else html += '<p class="rogue-caption">开始冒险后，在这里调整队伍、使用道具。</p>';
			return html + this.renderGrowth(state.account, run, busy);
		},
		renderAbandon: function (run, busy) {
			if (!run || run.phase === 'complete' || run.phase === 'battle' || run.postgame) return '';
			return '<footer class="rogue-abandon" aria-label="结束本局冒险"><p class="rogue-abandon-note">' +
				(this.abandonPrompt ? '确认结束这次冒险？本局队伍和物品将被清除，永久成长及解锁会保留。' : '放弃将结束本次冒险，永久成长及解锁会保留。') +
				'</p><div class="rogue-abandon-actions">' + (this.abandonPrompt ? button('cancelAbandon', '', '继续冒险') +
				button('abandon', '', '确认放弃', busy) : button('askAbandon', '', '放弃本局', busy)) + '</div></footer>';
		},
		renderDifficulty: function (account, run, busy) {
			var tiers = this.state.difficulties || [], ongoing = run && run.phase !== 'complete';
			var choice = account.preferredDifficulty === undefined ? 'default' : account.preferredDifficulty;
			if (!tiers.some(function (entry) { return entry.id === choice && entry.unlocked; })) choice = 'default';
			var tier = tiers.find(function (entry) { return entry.id === choice; });
			var html = '<section class="rogue-difficulty-settings" aria-label="冒险档位"><div class="rogue-difficulty-heading">' +
				'<span class="rogue-difficulty-symbol" aria-hidden="true">' + fa(ongoing ? 'lock' : 'signal') + '</span><div>' +
				'<span class="rogue-caption">' + (ongoing ? '当前冒险' : '下次冒险') + '</span><h4>冒险档位</h4></div>';
			if (ongoing) return html + difficultyBadge(run.difficulty, run.difficultyLabel) + '</div>' +
				(run.nuzlocke ? '<div class="rogue-nuzlocke-notice"><strong>Nuzlocke · 局外成长点数 ×2</strong><p>每十层仅可捕捉首次遇见的可捕捉对手；倒下的伙伴在本局永久死亡。<br />本十层：' +
					(run.nuzlocke.captureUsed ? '捕捉对象已锁定，击倒或撤退后不再开放。' : '尚未遇见可捕捉的对手。') + '</p></div>' : '') +
				'<p class="rogue-caption">本局已锁定，结束或放弃本局后可重新选择。</p>' + this.renderCollapse(run, busy) + '</section>';
			html += '<div class="rogue-difficulty-choice"><label>档位：<select name="difficulty"' + (busy ? ' disabled' : '') + '><option value="default"' +
				(choice === 'default' ? ' selected' : '') + '>默认</option>' + tiers.filter(function (entry) { return entry.unlocked; }).map(function (entry) {
					return '<option value="' + entry.id + '"' + (entry.id === choice ? ' selected' : '') +
						'>' + escape(entry.name) + '</option>';
				}, this).join('') + '</select></label>' + (typeof choice === 'number' ? '<label class="rogue-nuzlocke-toggle"><input type="checkbox" name="nuzlocke"' +
					(account.preferredNuzlocke ? ' checked' : '') + (busy ? ' disabled' : '') + ' /> Nuzlocke <strong>成长点数 ×2</strong></label>' : '') + '</div></div>' +
				(typeof choice === 'number' ? '<details class="rogue-nuzlocke-rules"><summary>Nuzlocke 规则</summary><p>第 1—10、11—20……层各限捕捉首次遇见的可捕捉对手。同一只可连续投球；击倒或撤退后，本段机会失效。赠送伙伴与蛋不占机会。<strong>伙伴倒下即在本局永久死亡，不能复活或再次使用。</strong>首领、神之挑战及物种首次通关的成长点数翻倍；崩坏适性直接奖励不变。开局后不可切换。</p></details>' : '') + '<p>' + (tier ? guideText(tier.menuText || tier.text) :
				'选完属性卡后，听听黑袍老人的护符赠礼。接过护符获得庇佑，婉拒则以 0 档启程。') + '</p>' +
				'<p class="rogue-caption">' + (choice === 'default' ? '想跳过赠礼对话，可直接选择 0 档。' : '已选定档位，将跳过护符赠礼。') +
				' <strong>开局后锁定</strong>。通关任意档位 <strong>200 层</strong>，所有已解锁档位均可开启随机塔灵。' +
				(choice === 5 || choice === 'easy' ? '' : '完成本档全部故事并曾通关本档，即可解锁下一档。') + '</p>';
			if (tier && tier.rewards) html += '<details><summary>捕捉品质详情</summary><p>' + guideText(tier.rewards) + '</p></details>';
			return html + this.renderCollapse(run, busy) + '</section>';
		},
		renderEcho: function (account, run, busy) {
			var echo = account.echo;
			if (!echo || !echo.unlocked) return '';
			var u = echo.upgrades, locked = !!(run && run.phase !== 'complete');
			if (locked) return '<section class="rogue-echo-settings rogue-echo-locked"><h4>' + fa('lock') + '崩坏回响</h4><p>本局已锁定，结束或放弃本局后可继续点亮。</p></section>';
			function perk(key, name, description, level, cap, cost) {
				return '<article class="rogue-echo-perk' + (level ? ' is-lit' : '') + '"><div><strong>' + escape(name) + '</strong><small>' +
					escape(description) + '</small></div>' + (level >= cap ? '<span class="rogue-echo-lit">' + fa('check') + (cap > 1 ? '已满级' : '已点亮') + '</span>' :
					button('act', 'echo:' + key, (level ? '升级' : '点亮') + ' · ' + cost + ' 点', busy || locked || echo.points < cost)) + '</article>';
			}
			var html = '<section class="rogue-echo-settings" aria-label="崩坏回响"><div class="rogue-echo-heading"><div><span class="rogue-caption">直面崩坏，留下回响</span><h4>' + fa('sun-o') + '崩坏回响</h4></div><strong>崩坏适性 · ' + echo.points + ' 点</strong></div>' +
				'<p>通关 <strong>1—5 档</strong>，每次获得 <strong>2／4／6／8／10 点</strong>。点亮后永久保留，之后每次冒险生效。</p>' +
				(locked ? '<p class="rogue-caption">' + fa('lock') + '本局回响已固定；结束或放弃后可继续点亮。</p>' : '') +
				'<details class="rogue-echo-types"><summary>属性之力 · 已点亮 ' + u.types.length + ' / 18</summary><p class="rogue-caption">每个属性独立点亮，使对应属性招式威力 ×1.1。</p><div class="rogue-echo-grid">';
			Object.keys(echo.types).forEach(function (type) { html += perk('type/' + type, echo.types[type] + '属性', '招式威力 ×1.1', u.types.indexOf(type) >= 0 ? 1 : 0, 1, echo.cost); });
			html += '</div></details><div class="rogue-echo-grid">' + perk('guard', '承伤减免', '受到敌方招式的直接伤害 ×0.9', u.guard ? 1 : 0, 1, echo.cost) +
				perk('shiny', '闪光相遇', '闪光概率 ×' + (1 + u.shiny / 10).toFixed(1) + ' → 最高 ×1.5', u.shiny, 5, echo.cost) +
				perk('catch', '捕捉心得', '捕捉成功率 ×' + (1 + u.catch / 10).toFixed(1) + ' → 最高 ×1.5', u.catch, 5, echo.cost) + '</div>' +
				'<h5>启程即解锁</h5><p class="rogue-caption">每项 50 点。每局开始即开放对应系统，配套道具仍需在旅途中获得。</p><div class="rogue-echo-grid">';
			Object.keys(echo.systems).forEach(function (system) { html += perk('system/' + system, echo.systems[system], '每局开始即开放', u.systems.indexOf(system) >= 0 ? 1 : 0, 1, echo.systemCost); });
			html += '</div><div class="rogue-echo-exchange"><p>六项局外能力与初始栏位全部升满后，可用 <strong>' + echo.exchangeCost + ' 成长点</strong>兑换 <strong>1 点崩坏适性</strong>。</p>' +
				button('act', 'echo:exchange', '兑换 1 点崩坏适性', busy || locked || !echo.canExchange || account.points < echo.exchangeCost) + '</div></section>';
			return html;
		},
		renderGrowth: function (account, run, busy) {
			var ongoing = run && run.phase !== 'complete';
			var html = '<h3>' + fa('star') + '局外成长 · 余额 ' + account.points + ' 点</h3><p>新玩家首次建档获赠 20 点。常规档每战胜一次塔内首领获得 1 点；神之挑战胜利额外获得 20 点。每种宝可梦首次随队通关额外获得 5 点；地区形态分别记录，幻想与普通形态共用记录。<strong>Nuzlocke 的上述战斗及通关点数翻倍</strong>，建档赠点不变。护符庇佑的简易档不获得局外点数。购买后从下一次冒险生效。</p>';
			if (ongoing) {
				html += '<p class="infobox">' + fa('lock') + '当前冒险进行中，结束或放弃本局后开放加点和初始栏位购买。</p>';
			} else {
				html += '<div class="rogue-upgrades">';
				Object.keys(statNames).forEach(function (stat) {
					var cost = account.statCosts ? account.statCosts[stat] : account.boosts[stat] + 1;
					html += '<p>' + statNames[stat] + ' +' + account.boosts[stat] + '% / 10% ' +
						(account.boosts[stat] >= 10 ? '<strong>已达上限</strong>' :
							button('act', 'upgrade:' + stat, '花费 ' + cost + ' 点提升', busy || account.points < cost)) + '</p>';
				});
				var slotCost = account.slotCost === undefined ? account.slots * 20 : account.slotCost;
				html += '</div><p class="rogue-caption">六项能力独立提升，每次 +1%，最高 +10%；依次花费 1～10 点，每项共需 55 点。已开始的旧旅程保留原加成。</p><p>初始栏位 ' + account.slots + ' / 6 ' + (account.slots >= 6 ? '<strong>已扩展至上限</strong>' :
					button('act', 'upgrade:slot', '花费 ' + slotCost + ' 点扩展', busy || account.points < slotCost)) +
					'</p><p class="rogue-caption">每次扩展费用增加 20 点：20 / 40 / 60 / 80 / 100 点。</p>';
			}
			var cup = account.crates && account.crates.daily;
			html += '<button class="rogue-crate-entry" name="openCrates"' + (busy ? ' disabled' : '') + '>' +
				'<span class="rogue-crate-entry-icon" aria-hidden="true">' + fa('archive') + '</span><span><strong>宝可梦开箱</strong>' +
				'<small>抽取新的伙伴！</small></span>' + (cup && !cup.submitted ? '<span class="rogue-crate-splash">今日竞猜未参与！</span>' : '') +
				'<span class="rogue-crate-entry-arrow" aria-hidden="true">↗</span></button>';
			return html + this.renderDifficulty(account, run, busy) + this.renderEcho(account, run, busy);
		},
		openCrates: function () {
			if (!this.state || !this.state.account || this.cratePopup) return;
			app.addPopup(globals.RogueCratePopup, {room: this}); this.loadCrates();
		},
		loadCrates: function () {
			if (this.crateQueryTimer) return;
			if (!app.socket || app.socket.readyState !== 1) {
				this.crateLoadError = '连接尚未恢复，请连接成功后重新读取。';
			} else {
				this.crateLoadError = '';
				var self = this;
				this.crateQueryTimer = setTimeout(function () {
					self.crateQueryTimer = null;
					self.crateLoadError = '开箱资料读取超时，请重新读取。本次读取不会消耗点数。';
					if (self.cratePopup) self.cratePopup.render();
				}, 8000);
				app.send('/cmd fantasyroguecrate');
			}
			if (this.cratePopup) this.cratePopup.render();
		},
		receiveCrates: function (data) {
			if (!data) {
				if (!this.crateQueryTimer) return;
				clearTimeout(this.crateQueryTimer); this.crateQueryTimer = null;
				this.crateLoadError = '当前游戏服务尚未提供开箱资料。请更新并重启游戏服务后重新读取，无需清空存档或浏览器数据。';
				if (this.cratePopup) this.cratePopup.render();
				return;
			}
			if (data.userid !== app.user.get('userid')) return;
			if (data.enabled && this.state && this.state.account && data.revision < this.state.account.revision) return;
			if (data.enabled && this.crateData && data.revision < this.crateData.revision) return;
			clearTimeout(this.crateQueryTimer); this.crateQueryTimer = null; this.crateLoadError = '';
			this.crateData = data;
			if (data.enabled && this.state && this.state.account && data.revision > this.state.account.revision) app.send('/cmd fantasyrogue');
			this.syncCrates();
		},
		crateLedger: function () {
			var account = this.state && this.state.account, data = this.crateData;
			if (data && data.enabled && (!account || data.revision > account.revision)) return data.ledger;
			return account && account.crates || data && data.ledger;
		},
		receiveDailyReplay: function (data) {
			if (data && data.userid === app.user.get('userid') && this.dailyReplayPopup) this.dailyReplayPopup.receive(data);
		},
		syncCrates: function () {
			var ledger = this.crateLedger(), batch = ledger && ledger.lastBatch;
			// Recover a committed result even when its acknowledgement was lost in transit.
			if (this.crateIntent && ((batch && batch.id === this.crateIntent.id) ||
				(ledger && ledger.daily && ledger.daily.requestId === this.crateIntent.id))) {
				if (this.pending && this.pending.id === this.crateIntent.id) { clearTimeout(this.timer); this.pending = null; }
				this.crateIntent = null; this.error = '';
			}
			if (this.cratePopup) this.cratePopup.sync();
		},
		renderStartMenu: function () {
			var state = this.state, run = state && state.run;
			var hint = run && run.phase !== 'complete' ? '继续存档 · 第 ' + run.floor + ' 层' : '选择伙伴，开启一段新的旅途';
			return '<section class="rogue-start-menu" aria-label="幻想杯肉鸽开始界面">' +
				'<div class="rogue-start-heading"><span class="rogue-caption">一座塔，无数种可能</span><h2>你的幻想，从这里开始</h2>' +
				'<p>与宝可梦同行，发现每次旅途的不一样。</p></div>' +
				'<button class="rogue-start-primary" name="enterGame"' + (state && state.continueOnly && !run ? ' disabled' : '') + '>' +
				'<span class="rogue-start-symbol" aria-hidden="true">' + fa('compass') + '</span><span><strong>开始你的幻想杯肉鸽之旅</strong><small>' +
				escape(hint) + '</small></span><span class="rogue-start-arrow" aria-hidden="true">→</span></button>' +
				(state && state.coopEnabled === true ? '<button class="button rogue-coop-entry" name="openCoop">' + fa('users') + '<span class="rogue-coop-entry-copy"><strong>联机游玩</strong><small>邀请在线玩家，共同开启旅途</small></span></button>' : '') +
				'<div class="rogue-start-books">' + [
					['guide', 'book', '幻想杯图鉴', '认识幻想杯', '玩法入门 · 幻想宝可梦\n招式、特性与道具'],
					['blessings', 'diamond', '祝福图鉴', '收集旅途的力量', '白银 · 黄金 · 棱彩\n回顾已经获得的祝福'],
					['events', 'map-signs', '区域图鉴', '重温塔中的见闻', '每次选择，都是故事\n翻阅已经经历的事件'],
					['stories', 'bookmark', '故事回顾', '拾起梦中的记忆', '记住已经说过的话\n重读与老人的相遇'],
				].map(function (entry) {
					return '<button class="rogue-start-book book-' + entry[0] + '" name="openCodex" value="' + entry[0] + '">' +
						'<span class="rogue-book-emblem" aria-hidden="true">' + fa(entry[1]) + '</span><strong>' + entry[2] + '</strong>' +
						'<span>' + entry[3] + '</span><small>' + entry[4].replace('\n', '<br />') + '</small><b aria-hidden="true">翻开图鉴 ↗</b></button>';
				}).join('') + '</div><p class="rogue-start-note">旅途进度自动保存；进入后可随时返回开始页。</p></section>';
		},
		renderCodex: function () {
			var section = this.screen, data = this.codices[section], titles = {guide: '幻想杯图鉴', blessings: '祝福图鉴', events: '区域图鉴', stories: '故事回顾'};
			var html = '<section class="rogue-codex"><div class="rogue-codex-heading"><span class="rogue-caption">旅途手册 / ' + titles[section] +
				'</span><h2>' + titles[section] + '</h2><div class="rogue-reading-actions"><button class="button rogue-codex-back" name="startMenu">' + fa('arrow-left') + '返回开始页</button>' + button('toggleReading', '', this.readingWide ? '点击并排' : '点击展开', false, fa(this.readingWide ? 'columns' : 'expand')) + '</div></div>';
			if (!data) return html + '<p>正在翻开图鉴…</p></section>';
			if (data.codexSchema !== 5) html += '<p class="message-error" role="status">图鉴与当前客户端的版本不一致。请更新客户端并重启游戏服务，再刷新存档；仅刷新网页无法加载尚未运行的新内容。</p>';
			if (data.preview) html += '<p class="rogue-caption">本地测试：全部条目完整展示，不改变存档的实际解锁记录。</p>';
			if ((section === 'events' || section === 'stories') && this.codexReplay) {
				var replay = this.codexReplay, history = this.codexReplayHistory, page = replay.pages[history[history.length - 1]];
				var replayPortrait = page.portrait || replay.portrait;
				var replayArt = replayPortrait ? '<div class="rogue-reading-portrait">' +
					(portraitFile(replayPortrait) ? '<span class="rogue-companion-portrait" style="' + portraitStyle(replayPortrait) + '"></span>' :
					'<img alt="" src="' + escape(Dex.resolveAvatar(replayPortrait)) + '" />') + '</div>' : '';
				if (replay.portraits && replay.portraits.length) replayArt = '<div class="rogue-challenge-portraits">' + replay.portraits.map(function (id) {
					return '<span class="rogue-companion-portrait' + (page.smile ? ' smiling' : '') + '" style="' + portraitStyle(id) + '"></span>';
				}).join('') + '</div>';
				return html + button('closeEventReplay', '', '返回目录', false, fa('arrow-left')) +
					'<article class="rogue-event-reading"><span class="rogue-caption">文字回顾 · 可探索不同分支</span><h3>' + escape(replay.title) + '</h3>' +
					'<p class="rogue-reading-note">不消耗资源、不发放奖励，不影响当前冒险。奖励数量随实际冒险楼层变化。</p>' +
					replayArt +
					page.text.map(function (paragraph) { return '<p class="rogue-dialogue-copy">' + dialogueText(paragraph) + '</p>'; }).join('') +
					(page.battleSkipped ? '<p class="rogue-reading-skip">' + fa('forward') + '战斗画面已跳过，可继续查看结果。</p>' : '') +
					'<div class="rogue-reading-options">' + page.options.map(function (option) {
						return /[『「⌈]/.test(option.label) ? button('replayEventNext', option.next, '', false, dialogueText(option.label)) :
							button('replayEventNext', option.next, option.label);
					}).join('') + (!page.options.length ? '<p>这段见闻到这里告一段落。</p>' : '') + '</div><footer>' +
					button('replayEventBack', '', '返回上一段', history.length <= 1) + button('replayEventRestart', '', '从头回顾') + '</footer></article></section>';
			}
			var filters, entries, moveGroup = this.codexFilter.indexOf('moves:') === 0 ? this.codexFilter.slice(6) : '';
			var guideModule = moveGroup ? 'moves' : this.codexFilter.replace(/enhanced$/, '');
			if (section === 'guide') {
				filters = [['beginner', '新手攻略'], ['items', '道具'], ['moves', '招式'], ['abilities', '特性'], ['pokemon', '幻想宝可梦']];
				entries = ['items', 'exclusive'].indexOf(this.codexFilter) >= 0 ? (data.guide.modules.items || []).filter(function (entry) {
					return this.codexFilter === 'exclusive' ? entry.category === 'exclusive' : entry.category !== 'exclusive';
				}, this) : this.codexFilter === 'special' ? data.guide.itemNotes || [] : data.guide.modules[guideModule] || [];
				if (this.codexFilter === 'beginner') entries = (data.guide.beginner || []).map(function (entry, index) {
					return {id: 'beginner:' + index, name: entry.title, text: entry.text};
				});
				if (guideModule === 'moves' || guideModule === 'abilities') entries = entries.filter(function (entry) {
					if (moveGroup) return moveGroup === 'all' || (entry.groups || []).indexOf(moveGroup) >= 0;
					return (entry.origin || 'fantasy') === (/enhanced$/.test(this.codexFilter) ? 'enhanced' : 'fantasy');
				}, this);
				if (guideModule === 'moves' && this.codexType) entries = entries.filter(function (entry) { return entry.type === this.codexType; }, this);
				if (this.codexFilter === 'biomes') html += '<p class="rogue-caption">黑色剪影表示尚未在该生态捕捉；在其他生态捕捉不会点亮这里的图标。战斗与精英共用生态记录，出现过的生态在后续 5 层暂不刷新。</p>';
				else if (this.codexFilter !== 'beginner') html += '<p class="rogue-caption">以下为幻想形态与主要调整内容；形态、道具能否在爬塔中使用，还需满足相应获取和解锁条件。</p>';
			} else {
				var people = section === 'events' && this.codexCollection === 'companions';
				if (section === 'blessings') html += '<p class="rogue-blessing-grace"><strong>祝福立即生效，加级稍后开始。</strong>' +
					'第 1／50／100／150 层领取的黄金、棱彩祝福，分别从第 <b>11／61／111／161</b> 层追加对手等级。' +
					'此前已生效的加级仍然保留；白银祝福不增加对手等级。</p>';
				if (section === 'events') html += '<nav class="rogue-codex-collections" aria-label="区域图鉴分册">' +
					[['regions', 'map-signs', '区域事件', '事件 · 奖励 · 遭遇 · 交易 · 奇遇'], ['companions', 'users', '训练家图鉴', '同行 · 道馆 · 天王与冠军 · 反派 · 其他人物']].map(function (entry) {
						var selected = (people ? 'companions' : 'regions') === entry[0];
						return '<button class="button' + (selected ? ' is-active' : '') + '" name="selectCodexCollection" value="' + entry[0] +
							'" aria-pressed="' + selected + '">' + fa(entry[1]) + '<span><strong>' + entry[2] + '</strong><small>' + entry[3] + '</small></span></button>';
					}).join('') + '</nav>';
				filters = section === 'stories' ? [['all', '全部记忆'], ['unlocked', '已收集']] : section === 'blessings' ? [['all', '全部'], ['silver', '白银'], ['gold', '黄金'], ['prismatic', '棱彩'], ['unlocked', '已解锁']] :
					people ? [['all', '全部人物'], ['companion', '同行训练家'], ['rival', '劲敌'], ['gym', '道馆馆主'], ['elitefour', '天王'], ['champion', '冠军'], ['antagonist', '反派人物'], ['other', '其他人物']] :
					[['all', '全部区域'], ['ecology', '战斗、精英生态区域'], ['challenge', '挑战'], ['event', '事件'], ['reward', '奖励'], ['encounter', '遭遇'], ['trade', '交易'], ['adventure', '奇遇'], ['unlocked', '已经历']];
				entries = section === 'events' ? data.entries.filter(function (entry) { return (['companion', 'trainer'].indexOf(entry.category) >= 0) === people; }) : data.entries;
				var unlocked = entries.filter(function (entry) { return entry.unlocked; }).length;
				html += '<p class="rogue-codex-progress">' + (people ? '已遇见 ' : data.preview ? '可查看 ' : section === 'blessings' ? '已解锁 ' : '已经历 ') + '<b>' + unlocked + ' / ' + entries.length +
					'</b><span>' + (section === 'stories' ? data.preview ? '本地已开放全部秘闻及真正结局供预览，阅读不会改变进度或发放奖励。' : '只展示已完成的故事，后续内容会在旅途中逐渐揭晓。回顾不会改变进度或发放奖励。' : section === 'blessings' ? '按名称拼音首字母排列。+／++／+++ 分别对应第 50／100／150 层版本，获得过的祝福可查看全部版本。' : people ? '收录拥有立绘的人物；同一角色可按不同身份查看。遇见后解锁完整介绍，同行条目列出偏好与赠礼。' : '进入过的区域事件会收入图鉴，可以重读文字分支。') + '</span></p>';
				var filter = this.codexFilter;
				entries = entries.filter(function (entry) { return filter === 'all' || (filter === 'unlocked' ? entry.unlocked : (people ? (entry.roles || [entry.category]).indexOf(filter) >= 0 : (section === 'events' ? entry.category || 'event' : entry.tier) === filter)); });
			}
			var active = this.codexFilter, query = this.codexQuery.toLowerCase();
			var itemSection = section === 'guide' && ['items', 'exclusive', 'special'].indexOf(active) >= 0;
			html += '<nav class="rogue-codex-filters" aria-label="图鉴分类">' + filters.map(function (entry) {
				var selected = active === entry[0] || active === entry[0] + 'enhanced' || moveGroup && entry[0] === 'moves' || itemSection && entry[0] === 'items';
				return '<button class="button' + (selected ? ' is-active' : '') + '" aria-pressed="' + selected +
					'" name="filterCodex" value="' + entry[0] + '">' + entry[1] + '</button>';
			}).join('') + '</nav>';
			if (itemSection) html += '<nav class="rogue-codex-filters rogue-item-categories" aria-label="道具分类">' +
				[['items', '通用道具'], ['exclusive', '专属道具'], ['special', '特殊道具说明']].map(function (entry) {
					return '<button class="button' + (active === entry[0] ? ' is-active' : '') + '" name="filterCodex" value="' +
						entry[0] + '" aria-pressed="' + (active === entry[0]) + '">' + entry[1] + '</button>';
				}).join('') + '</nav>';
			if (section === 'guide' && ['moves', 'abilities'].indexOf(guideModule) >= 0) {
				html += '<nav class="rogue-codex-filters" aria-label="内容来源">' +
					[[guideModule, '幻想杯自制内容'], [guideModule + 'enhanced', guideModule === 'moves' ? '原版招式增强' : '原版特性增强']].concat(guideModule === 'moves' ? Object.keys(data.guide.moveCategories || {}).map(function (id) { return ['moves:' + id, data.guide.moveCategories[id]]; }) : []).map(function (entry) {
						return '<button class="button' + (active === entry[0] ? ' is-active' : '') + '" name="filterCodex" value="' +
							entry[0] + '" aria-pressed="' + (active === entry[0]) + '">' + entry[1] + '</button>';
					}).join('') + '</nav>';
				if (guideModule === 'moves') html += typeFilter('codexType', this.codexType);
			}
			html += '<div class="rogue-codex-search"><label><select name="codexSearchMode"><option value="name">按名称</option><option value="content"' + (this.codexSearchMode === 'content' ? ' selected' : '') + '>按内容</option></select>查找 <input type="search" name="codexSearch" value="' +
				escape(this.codexQuery) + '" placeholder="输入名称，按回车" /></label>' + button('searchCodex', '', '查找', false, fa('search')) + '</div>';
			var entryKind = section === 'guide' && guideModule === 'moves' ? 'move' : '';
			entries = entries.filter(function (entry) { return !query || (localName(entry.name, entryKind) + ' ' + entry.name + (this.codexSearchMode === 'content' ? ' ' + localName(entry.text || '') : '')).toLowerCase().indexOf(query) >= 0; }, this);
			if (section !== 'blessings' && section !== 'stories' && this.codexFilter !== 'beginner') {
				var collator = new Intl.Collator('zh-CN-u-co-pinyin', {sensitivity: 'base', ignorePunctuation: true, numeric: true});
				entries.sort(function (a, b) {
					if (moveGroup && (a.origin === 'original') !== (b.origin === 'original')) return a.origin === 'original' ? 1 : -1;
					var ar = /^rival:([^:]+):(\d+)$/.exec(a.id), br = /^rival:([^:]+):(\d+)$/.exec(b.id);
					if (ar && br) return collator.compare(a.name.split('·')[0], b.name.split('·')[0]) || Number(ar[2]) - Number(br[2]);
					return collator.compare(localName(a.name, entryKind), localName(b.name, entryKind)) || collator.compare(a.id, b.id);
				});
				html += '<p class="rogue-caption">按中文名称拼音首字母排列。</p>';
			}
			if (section === 'stories') html += '<p class="rogue-caption">按秘闻解锁顺序排列。</p>';
			if (section === 'events') entries.sort(function (a, b) { return Number(b.category === 'ecology') - Number(a.category === 'ecology'); });
			if (active === 'ecology') html += '<p class="rogue-caption">黑色剪影表示尚未在该生态捕捉；其他地方的捕捉不会点亮这里。出现过的生态在后续 5 层暂不刷新。</p>';
			var pageSize = section === 'events' && active === 'ecology' ? 4 : 12;
			var total = Math.max(1, Math.ceil(entries.length / pageSize)); this.codexPage = Math.min(this.codexPage, total - 1);
			var lastMoveOrigin = '';
			html += '<div class="rogue-codex-grid">' + entries.slice(this.codexPage * pageSize, (this.codexPage + 1) * pageSize).map(function (entry) {
				var tier = {silver: '白银', gold: '黄金', prismatic: '棱彩'}[entry.tier];
				var icon = section === 'guide' ? (active === 'pokemon' ? '<span class="picon" style="' + Dex.getPokemonIcon(entry.name) + '"></span>' :
					(['items', 'exclusive'].indexOf(active) >= 0 || active === 'special' && entry.icon) ? itemIcon(entry) : fa('trophy')) : fa(section === 'stories' ? 'book' : section === 'events' ? entry.category === 'challenge' ? 'trophy' : 'map-signs' : blessingIcon(entry));
				var body = '<p class="rogue-codex-effect">' + (section === 'blessings' ? blessingText(entry.text) : section === 'guide' && active === 'beginner' ? guideText(entry.text) : escape(eventText(localName(entry.text || '')))) + '</p>';
				if (entry.category === 'ecology') {
					var ecologyIcons = function (list) {
						return '<div class="rogue-biome-icons">' + list.map(function (mon) {
							var label = mon.caught ? localName(mon.species) : '尚未在此捕捉';
							return '<span class="rogue-biome-icon' + (mon.caught ? '' : ' is-unknown') + '" title="' + escape(label) + '" role="img" aria-label="' + escape(label) + '"><span class="picon" aria-hidden="true" style="' + Dex.getPokemonIcon(mon.species) + '"></span></span>';
						}).join('') + '</div>';
					};
					var regional = entry.pokemon || [], visitors = entry.visitors || [];
					body += '<p class="rogue-caption">生态池 · 已捕捉 ' + regional.filter(function (mon) { return mon.caught; }).length + ' / ' + regional.length + '</p>' + ecologyIcons(regional) +
						'<details class="rogue-biome-visitors"><summary>稀有乱入与高层精英</summary><p class="rogue-caption">各生态都可能稀有遇见其他家族；第 161 层起，精英还有机会出现传说中的宝可梦。相关祝福也会吸引特定传说。</p>' + ecologyIcons(visitors) + '</details>';
				}
				if (section === 'guide' && guideModule === 'moves') body = '<p class="rogue-caption">' + typeIcons([entry.type]) + ' · ' + escape(localName(entry.category)) +
					' · 威力 ' + (entry.power || '—') + ' · 命中 ' + (entry.accuracy === true ? '必中' : entry.accuracy + '%') + ' · PP ' + entry.pp + priorityText(entry.priority) + '</p>' + body;
				if (section === 'guide' && active === 'pokemon') body = '<p>' + typeIcons(entry.types) + '</p><p>特性：' +
					entry.abilities.map(function (name) { return escape(localName(name)); }).join(' / ') + '</p><p class="rogue-caption">' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' ' + entry.stats[stat]; }).join(' · ') + '</p>' +
					(entry.battleOnly ? '<p class="rogue-caption">战斗中触发的特殊形态' + (entry.requiredItem ? ' · ' + escape(localName(entry.requiredItem)) : '') + '</p>' : '');
				if (section === 'blessings' && ['prayer', 'killlagirl'].indexOf(entry.family) >= 0) {
					var links = entry.family === 'prayer' ? {'Top Clear Mind': 'topclearmind'} : {'神衣鲜血': 'godrobe', '神衣纯洁': 'puregodrobe'};
					body = body.replace(/<strong class="rogue-term">【([^】]+)】<\/strong>/g, function (match, name) {
						return links[name] ? '<button class="rogue-codex-link" name="jumpBlessing" value="' + links[name] + '"><b>【' + name + '】</b></button>' : match;
					});
				}
				if (entry.portrait) {
					var file = portraitFile(entry.portrait);
					body = (entry.portrait === 'mewtwo' ? croppedMewtwo('rogue-codex-single-portrait') : singlePortraits[entry.portrait] ? '<img class="rogue-codex-single-portrait" src="' + singlePortraits[entry.portrait] + '" alt="' + escape(entry.name) + '" />' : file ? '<span class="rogue-companion-portrait codex-portrait" style="' + portraitStyle(entry.portrait) + '"></span>' : '<img class="rogue-codex-native-portrait" src="' + escape(Dex.resolveAvatar(entry.portrait)) + '" alt="' + escape(entry.name) + '" />') + body;
				}
				var trainerEntry = section === 'events' && ['companion', 'trainer'].indexOf(entry.category) >= 0;
				var groupTitle = '', origin = entry.origin === 'original' ? '原版招式' : '幻想杯自制或调整过的招式';
				if (moveGroup && lastMoveOrigin !== origin) { groupTitle = '<h3 class="rogue-move-group">' + origin + '</h3>'; lastMoveOrigin = origin; }
				return groupTitle + '<article data-codex-family="' + escape(entry.family || '') + '" class="rogue-codex-entry tier-' + (entry.tier || 'plain') + (entry.category === 'challenge' ? ' rogue-challenge-entry' : section === 'stories' ? ' rogue-mystery-entry' : '') + (entry.unlocked === false ? ' is-locked' : '') + '">' +
					'<div class="rogue-codex-entry-top"><span>' + icon + '</span><small>' + (tier ? tier + '阶' : section === 'stories' ? '秘闻' : section === 'events' ? (['companion', 'trainer'].indexOf(entry.category) >= 0 ? '训练家' : kindNames[entry.category || 'event']) : '幻想杯') +
					'</small>' + (entry.unlocked === false ? '<span class="rogue-codex-lock">' + fa('lock') + (trainerEntry ? '尚未遇见' : '未解锁') + '</span>' : trainerEntry ? '<span class="rogue-codex-seen">' + fa('check') + '已遇见过</span>' : '') + '</div>' +
					'<div class="rogue-codex-title"><h3>' + escape(localName(entry.name, entryKind)) + '</h3>' +
					(section === 'blessings' ? (entry.floors && entry.floors.length ? ['仅第 ' + entry.floors.join('、') + ' 层出现'] : []).concat(entry.availability || []).filter(function (note, index, notes) {
						return notes.findIndex(function (other) { return other.replace(/\s+/g, '') === note.replace(/\s+/g, ''); }) === index;
					}).map(function (note) {
						return '<small class="rogue-blessing-restriction">' + escape(note) + '</small>';
					}).join('') : '') + '</div>' + body + ((section === 'events' || section === 'stories') && entry.unlocked && entry.replay ?
					button('readEvent', entry.id, '回顾这段见闻', false, fa('book')) : '') + '</article>';
			}).join('') + '</div>';
			if (!entries.length) html += '<p class="rogue-codex-empty">' +
				'这里还没有符合条件的记录。' + '</p>';
			return html + '<div class="rogue-codex-pagination">' + button('pageCodex', String(this.codexPage - 1), '上一页', this.codexPage === 0) +
				'<span>第 ' + (this.codexPage + 1) + ' / ' + total + ' 页 · ' + entries.length + ' 项</span>' +
				button('pageCodex', String(this.codexPage + 1), '下一页', this.codexPage + 1 >= total) + '</div></section>';
		},
		revealRetryHealing: function () {
			clearTimeout(this.retryPopupTimer); this.retryPopupTimer = null;
			var run = this.state && this.state.run, quote = run && run.retryHealing;
			var key = quote && JSON.stringify([app.user.get('userid'), run.id]);
			var waiting = this.screen !== 'game' || this.state && this.state.story || run &&
				((run.pendingMoves || []).length || run.companionInvitation || run.affectionScene);
			var popup = this.retryHealingPopup;
			if (popup && (!quote || popup.key !== key || waiting)) {
				var index = (app.popups || []).indexOf(popup);
				if (index >= 0) app.popups.splice(index, 1);
				popup.remove(); this.retryHealingPopup = null;
			}
			if (!quote || waiting) return;
			if (this.retryHealingPopup) { this.retryHealingPopup.render(); return; }
			if (app.curRoom && app.curRoom !== this) return;
			if ((app.popups || []).some(function (p) { return p.type === 'modal'; })) {
				var self = this;
				this.retryPopupTimer = setTimeout(function () { self.revealRetryHealing(); }, 200);
				return;
			}
			app.addPopup(globals.RogueRetryHealingPopup, {room: this, key: key});
		},
		revealPendingMove: function () {
			clearTimeout(this.movePopupTimer); this.movePopupTimer = null;
			var run = this.state && this.state.run, pending = run && (run.pendingMoves || [])[0];
			var key = pending && JSON.stringify([app.user.get('userid'), run.id, pending.member, pending.move]);
			var waiting = this.screen !== 'game' || this.state && this.state.story || run && (run.companionInvitation || run.affectionScene);
			waiting = waiting || this.openingEvolutionAnimation || this.pending && this.pending.action === 'evolve';
			var popup = this.pendingMovePopup;
			if (popup && (!key || popup.key !== key || waiting)) {
				var index = (app.popups || []).indexOf(popup);
				if (index >= 0) app.popups.splice(index, 1);
				popup.remove(); this.pendingMovePopup = null;
			}
			if (!pending || waiting) return;
			if (this.pendingMovePopup) { this.pendingMovePopup.render(); return; }
			// Let evolution and other modal scenes finish before showing the next decision.
			if ((app.popups || []).some(function (p) { return p.type === 'modal'; })) {
				var self = this;
				this.movePopupTimer = setTimeout(function () { self.revealPendingMove(); }, 200);
				return;
			}
			app.addPopup(globals.RogueLearnMovePopup, {room: this, key: key});
		},
		render: function (storyOnly) {
			var state = this.state;
			this.revealPendingMove();
			this.revealRetryHealing();
			if (!app.user.loaded || app.user.get('loginState') === 'error') {
				var connected = app.socket && app.socket.readyState === 1;
				stableHTML(this, '<div class="pad"><h2>幻想杯肉鸽</h2><p>' +
					(!connected ? '正在连接游戏服务器，连接完成后会自动读取存档。' : app.user.get('loginState') === 'error' ?
						escape(app.user.get('loginError')) : '正在确认登录身份，完成后会自动读取存档…') + '</p>' +
					(connected && app.user.get('loginState') === 'error' ? button('retryLogin', '', '重试登录') : '') + '</div>');
				if (app.rooms.fantasyrogueparty) app.rooms.fantasyrogueparty.$el.html('');
				return;
			}
			if (state && state.enabled === false) {
				stableHTML(this, '<div class="pad"><h2>当前账号未开放此功能</h2><p>' + escape(state.message || '请使用获准的内测账号登录。') + '</p>' + button('joinRoom', '', '返回首页') + '</div>');
				if (app.rooms.fantasyrogueparty) app.rooms.fantasyrogueparty.$el.html('');
				return;
			}
			var busy = !!this.pending || !app.socket || app.socket.readyState !== 1;
			if (this.screen === 'game' && storyOnly === true && state && this.updateStory(state.story, busy)) return;
			this.storyHadError = !!this.error;
			var html = '<div class="pad"><p>' + button('joinRoom', '', '返回首页') + button('refresh', '', '刷新存档') + button('openParty', '', '队伍及背包', false, fa('suitcase')) +
				button('joinRoom', 'fantasyroguegallery', '通关卡展示', false, fa('clone')) +
				button('joinRoom', 'fantasyroguehistory', '历史对局', false, fa('history')) +
				(this.screen !== 'home' ? button('startMenu', '', '开始页', false, fa('compass')) : '') + '</p>' +
				'<h2>幻想杯肉鸽</h2>' + (state && state.run && (state.run.spirit || state.run.charm) ? '<p class="rogue-spirit-badge">' +
				(state.run.spirit ? button('showSpirit', '', state.run.spirit.name, false, '<span class="picon" style="' + Dex.getPokemonIcon(state.run.spirit.species) + '"></span>') : '') +
				(state.run.charm ? button('showCharm', '', '护符庇佑', false, charmIcon()) : '') +
				'<span class="rogue-caption">点击查看本局效果</span></p>' : '<p>原生对战 · 捕捉伙伴 · 逐层成长</p>');
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (state && state.continueOnly) {
				html += '<p class="infobox" role="status">暂不开放新冒险。已有冒险、剧情和奖励可继续处理，进度正常保存。</p>';
			}
			if (this.pending && this.error) html += '<p class="rogue-save-status">正在保存操作… ' + button('sendPending', '', '查询／重发同一请求') + '</p>';
			this.updateParty();
			if (this.screen !== 'game') {
				if (!state) html += '<p class="rogue-caption">正在读取服务器存档…</p>';
				else if (!state.account && state.message) html += '<p class="infobox">' + escape(state.message) + '</p>';
				stableHTML(this, html + (this.screen === 'home' ? this.renderStartMenu() : this.screen === 'coop' ? this.renderCoop() : this.renderCodex()) + '</div>'); return;
			}
			if (!state) { stableHTML(this, html + '<p>正在读取服务器存档…</p></div>'); return; }
			if (state.message) html += '<p class="infobox">' + escape(state.message) + '</p>';
			if (!state.account) { stableHTML(this, html + '</div>'); return; }
			var account = state.account, run = state.run;
			if (run && run.phase === 'defeated' && run.failure) {
				stableHTML(this, html + '<section class="rogue-failure" role="alert"><h3>爬塔已无法推进</h3><p>本局止步于第 <b>' +
					Number(run.failure.floor) + '</b> 层。</p><p>' + escape(run.failure.reason) + '</p>' +
					button('acknowledgeFailure', run.failure.key, '确认，返回起始界面', busy) + '</section></div>'); return;
			}
			if (run && run.comeback && run.comeback.key) {
				var c = run.comeback;
				var elder = '<section class="rogue-floor rogue-comeback" role="dialog" aria-label="黑袍老人 · 再启程"><h3>黑袍老人 · 再启程</h3><div class="rogue-story-scene scene-stranger" style="height:220px;min-height:0"><div class="rogue-story-figure" style="top:65px;transform:scale(.65);transform-origin:top center" aria-label="黑袍老人"></div></div><p style="font-size:1.1em;line-height:1.9">' + escape(c.text) + '</p>';
				if (c.choosing) elder += button('comebackChoice', 'no', '否，我还想靠自己和伙伴继续走下去。', busy) + button('comebackChoice', 'yes', '是，我需要重新找到前进的力量。', busy) + '<p class="rogue-caption">回答“否”保留机会；回答“是”将偏爱卡片换为一次性援助：本层伤害、双防 +25%，10 层经验加成。两者均不免费复活。</p>';
				else elder += button('comebackChoice', c.answer ? 'continue' : 'next', c.answer ? '回到伙伴身边' : '继续对话', busy);
				stableHTML(this, html + elder + '</section></div>'); this.$el.scrollTop(0); return;
			}
			if (state.story) { stableHTML(this, html + this.renderStory(state.story, busy) + '</div>'); return; }
			if (run && run.affectionScene) {
				var scene = run.affectionScene;
				stableHTML(this, html + '<article class="rogue-affection-scene"><h3>' + escape(scene.title) + '</h3><div class="rogue-portrait-anchor rogue-affection-scene-art"><div class="rogue-affection-portrait" style="' + portraitStyle(scene.id) + '"></div>' + this.affectionGainBadge(scene.id) + '</div><h4>' + escape(scene.name) + ' · 好感度 ' + scene.stage + '</h4>' + (scene.narration ? '<p class="rogue-dialogue-copy">' + dialogueText(scene.narration) + '</p>' : '') + '<p>' + dialogueText(scene.text, true) + '</p>' + scene.options.map(function (o) { return button('affectionAction', scene.id + '|' + o.id, '', busy, dialogueText(o.name, true)); }).join('') + '</article></div>'); return;
			}
			if (run && run.companionInvitation) {
				stableHTML(this, html + this.renderCompanionInvitation(run.companionInvitation, busy) + '</div>'); return;
			}
			if (state.storyEnabled && run && run.phase === 'complete') {
				if (run.postgame === 'won') html += '<p class="infobox">神之挑战成功！' + (run.difficulty === 'easy' ? '护符庇佑的简易档不获得局外成长点数。' : '额外获得 ' + (run.nuzlocke ? 40 : 20) + ' 点局外成长点数' + (run.godEchoAwarded ? '与 ' + run.godEchoAwarded + ' 点崩坏适性' : '') + '。') + '</p>';
				html += '<h3>留在床头的卡片</h3><p>这次旅途已经留存。下一次醒来，会遇到什么呢？</p>';
				var card = state.pendingClear || (state.cards || []).find(function (entry) { return entry.runId === run.id; });
				if (card) {
					if (this.celebrationRun === run.id && this.celebratedRun !== run.id) {
						this.celebratedRun = run.id; this.celebrateUntil = Date.now() + 4500;
					}
					html += clearCardHTML(card, this.celebratedRun === run.id && Date.now() < this.celebrateUntil);
				}
				html += state.pendingClear ? this.renderPendingClear(state.pendingClear, state.cards, busy) :
					'<p>' + (card ? card.public ? '通关卡已公开，可在展示页管理。' : '通关卡已私下收藏，可在展示页主动公开。' :
						'这次旅途已结束；本次通关卡未保留在收藏中。') + '</p>' + button('act', 'newstory', '返回开始页', busy || state.continueOnly);
				stableHTML(this, html + button('joinRoom', 'fantasyroguegallery', '前往通关卡展示') + '</div>'); return;
			}
			var ongoing = run && run.phase !== 'complete';
			if (run && run.difficultyLabel && run.difficulty !== 'easy') html += '<p>' + difficultyBadge(run.difficulty, run.difficultyLabel) +
				'</p>' + (run.difficultyScales ? '<details><summary>当前层能力调整</summary><p>我方 ' +
				(run.difficultyScales.player * 100).toFixed(1) + '% · 对手 ' + (run.difficultyScales.opponent * 100).toFixed(1) + '%</p></details>' : '') +
				(run.difficultyRewards ? '<details><summary>本档捕捉品质</summary><p>' + escape(run.difficultyRewards) + '</p></details>' : '');
			if (run) html += '<h3 class="rogue-floor-heading">' + (run.phase === 'intro' ? '启程之前' : '第 ' + run.floor + ' / 200 层') + floorNodeHeading(run.node) +
				(run.time ? '<span class="rogue-time rogue-time-' + escape(run.time.id || '') + '" title="白天两层 → 黄昏一层 → 夜晚两层 → 黎明一层，循环交替">' + fa(run.time.name === '夜晚' ? 'moon-o' : 'sun-o') + escape(run.time.name) + '</span>' : '') +
				(run.floorEnvironment && (run.floorEnvironment.weather || run.floorEnvironment.terrain) ? '<span class="rogue-time rogue-environment" title="本层固定的天气／场地，也用于特殊进化判断">' + fa('cloud') + escape(run.floorEnvironment.name) + '</span>' : '') + '</h3>' +
				this.renderFloor(run, busy) + this.renderShop(run, busy);
			if (!ongoing) {
				if (state.continueOnly) { stableHTML(this, html + '</div>'); return; }
				html += '<h3>选择本次冒险的伙伴</h3><p class="rogue-caption">先选好队伍，再依次配置每一只宝可梦。</p>';
				var selectedDifficulty = account.preferredDifficulty;
				var selectedTier = (state.difficulties || []).find(function (tier) { return tier.id === selectedDifficulty; });
				var spiritAvailable = selectedTier ? selectedTier.spirit : (state.difficulties || []).some(function (tier) {
					return (tier.id === 0 || tier.id === 'easy') && tier.spirit;
				});
				if (spiritAvailable || state.localSpirits || !state.difficulties && account.spiritUnlocked) {
					html += '<label class="rogue-spirit-toggle' + (this.useSpirit ? ' is-enabled' : '') + '"><span class="rogue-spirit-heading"><input type="checkbox" name="useSpirit"' +
						(this.useSpirit ? ' checked' : '') + (busy ? ' disabled' : '') + ' /> ' + fa('star') + '<strong>开启塔灵</strong></span>' +
						'<span class="rogue-caption">默认随机抽取；使用某塔灵通关 200 层后，可在该档及更低档（含护符档）指定它。仅护符档通关的塔灵，请先将冒险档位设为护符庇佑；默认赠礼模式按 0 档筛选，接受或拒绝护符都可保留所选塔灵。' +
						(state.localSpirits ? ' 本地可测试全部塔灵。' : '') + '</span></label>';
					if (this.useSpirit) html += '<p><label>本次塔灵：<select name="selectedSpirit"' + (busy ? ' disabled' : '') +
						'><option value="">随机抽取</option>' +
						(state.selectableSpirits || []).map(function (spirit) { return '<option value="' + escape(spirit.id) + '"' + (this.selectedSpirit === spirit.id ? ' selected' : '') + '>' +
							escape(spirit.name) + '（' + (spirit.clearedTier === 'easy' ? '护符档' : spirit.clearedTier === undefined ? '已通关' : Number(spirit.clearedTier) + ' 档及以下') + '）</option>'; }, this).join('') + '</select></label></p>';
					if (this.useSpirit && state.localSpirits) html += '<p><label>测试塔灵：<select name="testSpirit"><option value="">随机抽取</option>' +
						(state.spirits || []).map(function (spirit) { return '<option value="' + escape(spirit.id) + '"' + (this.testSpirit === spirit.id ? ' selected' : '') + '>' +
							escape(spirit.name) + '</option>'; }, this).join('') + '</select></label></p>';
				} else html += '<p class="rogue-caption">通关任意档位的 200 层后，即可在所有已解锁档位开启随机塔灵。</p>';
				html += '<p><strong class="rogue-starter-count" aria-live="polite">已选 ' + this.selectedStarters.length +
					' 只 · 已用 ' + this.starterSlotsUsed() + ' / ' + account.slots + ' 个初始名额</strong></p>' +
					'<p class="rogue-caption">普通伙伴占 1 格，传说宝可梦与幻之宝可梦占 4 格，一级神占 6 格。仅限制初始选择，旅途中仍可组成正常队伍。</p>' +
					'<div class="rogue-starter-toolbar">' + typeFilter('starterType', this.starterType) +
					'<div class="rogue-layout-switch" role="group" aria-label="伙伴排列方式">' +
					'<button name="setStarterLayout" value="flat" aria-pressed="' + (this.starterLayout !== 'generations') + '">' + fa('th') + '展开</button>' +
					'<button name="setStarterLayout" value="generations" aria-pressed="' + (this.starterLayout === 'generations') + '">' + fa('list') + '按世代整理</button></div></div>' +
					'<div class="rogue-starter-generations">';
				var selectedStarters = this.selectedStarters;
				var remainingSlots = account.slots - this.starterSlotsUsed();
				var renderStarter = function (starter) {
					var checked = selectedStarters.indexOf(starter.id) >= 0;
					var disabled = busy || (!checked && (starter.slotCost || 1) > remainingSlots);
					html += '<label' + (disabled && !checked ? ' class="is-disabled"' : '') + '><input type="checkbox" name="starter" value="' +
						escape(starter.id) + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + ' />' +
						'<span class="picon" style="' + Dex.getPokemonIcon(starter.species) + '"></span>' + escape(localName(starter.species)) +
						'<small> · ' + (starter.slotCost || 1) + ' 格</small></label> ';
				};
				var generations = {}, starterType = this.starterType;
				var visibleStarters = state.starters.filter(function (starter) {
					return starter.available && (!starterType || (starter.types || dex().species.get(starter.species).types).indexOf(starterType) >= 0);
				});
				if (this.starterLayout !== 'generations') {
					html += '<div class="rogue-starters">'; visibleStarters.forEach(renderStarter); html += '</div>';
				} else {
					visibleStarters.forEach(function (starter) {
						var gen = starter.gen || dex().species.get(starter.species).gen || 9;
						(generations[gen] || (generations[gen] = [])).push(starter);
					});
					Object.keys(generations).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (gen) {
						html += '<details data-rogue-key="starter-gen-' + gen + '"><summary>第 ' + gen + ' 世代 · ' + generations[gen].length + ' 只</summary><div class="rogue-starters">';
						generations[gen].forEach(renderStarter); html += '</div></details>';
					});
				}
				if (!visibleStarters.length) html += '<p>还没有已解锁的该属性伙伴。</p>';
				html += '</div>';
				var counts = state.unlockRequirements || {ordinary: 1, special: 10};
				html += '<div class="rogue-unlock-guide"><strong>如何解锁更多伙伴</strong><ul>' +
					'<li>普通宝可梦：累计捕捉 <b>' + counts.ordinary + ' 次</b>。</li>' +
					'<li>一级神、二级神、幻兽、究极异兽、悖谬宝可梦：累计捕捉 <b>' + (counts.special || 10) + ' 次</b>。</li></ul>' +
					'<p class="rogue-caption">同一进化链合并计数，解锁对应最初形态；捕捉成功立即保存，同层同一只重复捕捉不重复计数。</p></div>';
				html += '<p>' + button('confirmStarters', '', '确认队伍，继续配置', busy || !state.configured || !this.selectedStarters.length) + '</p>';
			}
			var footer = this.renderAbandon(run, busy);
			if (footer) {
				html = html.replace('<div class="pad">', '<div class="rogue-game-layout"><div class="pad rogue-game-content">');
				stableHTML(this, html + '</div>' + footer + '</div>');
			} else stableHTML(this, html + '</div>');
			this.revealPendingMove();
		},
		renderPendingClear: function (pending, cards, busy) {
			if ((cards || []).length < 3) return '<div class="rogue-keepsake"><h4>保存本次通关卡</h4><p>收藏中已有空位，可直接收下本次记录。</p>' +
				button('resolveClear', '', '收藏至空位', busy) + button('resolveClear', 'discard', '放下本次新卡片', busy) + '</div>';
			return '<div class="rogue-keepsake"><h4>收藏已满 · 请保存本次通关卡</h4><p>最多收藏三张。请选择要替换的记录，或放下新卡片。旧卡不会自动删除。</p>' +
				(cards || []).map(function (card, i) { return button('resolveClear', card.id, '替换第 ' + (i + 1) + ' 张 · ' +
					new Date(card.completedAt).toLocaleDateString(), busy); }).join('') + button('resolveClear', 'discard', '放下本次新卡片', busy) + '</div>';
		},
		resolveClear: function (id) {
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'saveclear', details: {value: id},
				text: id === 'discard' ? '放下本次新通关卡？现有收藏不受影响。' : id ?
					'用本次通关卡替换所选旧卡？旧卡和展示记录将移除。' : '将本次通关卡保存到空位？'});
		}
	});
	this.FantasyRogueHistoryRoom = this.Room.extend({
		type: 'fantasyroguehistory', title: '历史对局', minWidth: 320, bestWidth: 1100,
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue rogue-history'); this.offset = 0; this.state = null;
			bindReferenceHelp(this.el || this.$el[0]);
			this.listenTo(app, 'response:fantasyroguehistory', this.receiveHistory);
			this.listenTo(app, 'init:socketopened init:choosename', this.refresh);
			this.listenTo(app.user, 'change:userid', this.identityChanged); this.render();
		},
		join: function () { this.refresh(); },
		show: function () { Room.prototype.show.apply(this, arguments); this.refresh(); },
		leave: function () { this.stopListening(); },
		identityChanged: function () { this.state = null; this.offset = 0; this.render(); this.refresh(); },
		refresh: function () { if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyroguehistory ' + this.offset); },
		joinRoom: function (id) { app.joinRoom(id); },
		page: function (offset) { this.offset = Math.max(0, Number(offset)); this.refresh(); this.$el.scrollTop(0); },
		receiveHistory: function (state) { if (!state || state.userid !== app.user.get('userid')) return; this.state = state; this.offset = state.offset || 0; this.render(); },
		render: function () {
			var state = this.state;
			var html = '<div class="pad"><h2>历史对局</h2><p>' + button('joinRoom', 'fantasyrogue', '返回旅途') + button('refresh', '', '刷新记录') + '</p><p>点击伙伴小图标或祝福名称查看详情。记录只对你自己可见；从本次版本起自动保存。</p>';
			if (!state) html += '<p>正在读取……</p>';
			else html += (state.error ? '<p>' + escape(state.error) + '</p>' : '<p>共 ' + state.total + ' 局</p>') + state.records.map(function (record) { return clearCardHTML(Object.assign({history: true}, record)); }).join('') + '<p>' + button('page', '' + (this.offset - 12), '上一页', !this.offset) + button('page', '' + (this.offset + 12), '下一页', this.offset + 12 >= state.total) + '</p>';
			this.$el.html(html + '</div>');
		},
	});

	this.FantasyRogueGalleryRoom = this.Room.extend({
		type: 'fantasyroguegallery', title: '通关卡展示', minWidth: 320, bestWidth: 1100,
		rogueReadingWide: false,
		toggleReading: function () { this.rogueReadingWide = !this.rogueReadingWide; this.render(); app.updateLayout(); },
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue rogue-gallery');
			this.offset = 0; this.state = null; this.error = ''; this.pending = null;
			this.listenTo(app, 'response:fantasyroguegallery', this.receiveGallery);
			this.listenTo(app, 'response:fantasyrogueaction', this.receiveMutation);
			this.listenTo(app, 'response:fantasyrogueduel', this.receiveDuel);
			this.listenTo(app, 'response:fantasyrogueduelnotice', this.refresh);
			this.listenTo(app, 'init:socketopened', this.refresh);
			this.listenTo(app, 'init:socketclosed', this.disconnected);
			this.listenTo(app, 'init:choosename', this.refresh);
			this.listenTo(app.user, 'change:userid', this.identityChanged);
			this.render();
		},
		join: function () { this.refresh(); },
		show: function () { Room.prototype.show.apply(this, arguments); this.refresh(); },
		leave: function () { clearTimeout(this.timeout); this.stopListening(); },
		identityChanged: function () { this.state = null; this.pending = null; this.offset = 0; this.refresh(); },
		disconnected: function () { this.pending = null; this.error = '连接已断开，请重新连接后刷新。'; this.render(); },
		refresh: function () { if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyroguegallery ' + this.offset); },
		joinRoom: function (id) { app.joinRoom(id); },
		receiveGallery: function (state) {
			if (!state || state.userid !== app.user.get('userid')) return;
			this.state = state; this.render();
		},
		submit: function (action, details) {
			if (this.pending || !this.state || !this.state.account || !app.socket || app.socket.readyState !== 1) return;
			var request = Object.assign({id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), action: action,
				revision: this.state.account.revision}, details || {});
			this.pending = request.id; this.error = '';
			app.send('/fantasyrogue action ' + JSON.stringify(request)); this.waitForReply();
		},
		waitForReply: function () {
			clearTimeout(this.timeout); var self = this;
			this.timeout = setTimeout(function () { self.pending = null; self.error = '暂未收到结果，请刷新后查看状态再操作。'; self.refresh(); self.render(); }, 10000);
			this.render();
		},
		receiveMutation: function (result) {
			if (result.userid !== app.user.get('userid') || result.id !== this.pending) return;
			clearTimeout(this.timeout); this.pending = null; this.error = result.ok ? '' : result.message;
			this.refresh();
			if (app.rooms.fantasyrogue) app.rooms.fantasyrogue.refresh();
		},
		sendDuel: function (details) {
			if (this.pending || !app.socket || app.socket.readyState !== 1) return;
			this.pending = 'duel'; this.error = '';
			app.send('/fantasyrogue duel ' + JSON.stringify(details)); this.waitForReply();
		},
		receiveDuel: function (result) {
			if (result.userid !== app.user.get('userid') || this.pending !== 'duel') return;
			clearTimeout(this.timeout); this.pending = null;
			this.error = result.ok ? '' : result.message;
			this.refresh();
			if (result.roomid) app.joinRoom(result.roomid);
		},
		publishCard: function (value) { var parts = value.split('|'); this.submit('publishcard', {member: parts[0], value: parts[1]}); },
		deleteCard: function (id) {
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'deletecard', details: {member: id}, text: '删除这张通关卡及其公开展示？这个操作无法撤回。'});
		},
		resolveClear: function (id) { globals.FantasyRogueRoom.prototype ? globals.FantasyRogueRoom.prototype.resolveClear.call(this, id) : globals.FantasyRogueRoom.resolveClear.call(this, id); },
		changePage: function (value) { this.offset = Math.max(0, this.offset + Number(value)); this.refresh(); },
		challengeCard: function (target) { this.sendDuel({action: 'challenge', card: this.$('select[name=duelCard]').val(), target: target}); },
		acceptDuel: function (id) { this.sendDuel({action: 'accept', id: id, card: this.$('select[name=duelCard]').val()}); },
		declineDuel: function (id) { this.sendDuel({action: 'decline', id: id}); },
		cancelDuel: function (id) { this.sendDuel({action: 'cancel', id: id}); },
		render: function () {
			var state = this.state, busy = !!this.pending;
			var selected = this.$('select[name=duelCard]').val();
			var html = '<div class="pad"><div class="rogue-reading-actions">' + button('joinRoom', 'fantasyrogue', '返回爬塔') + button('toggleReading', '', this.rogueReadingWide ? '点击并排' : '点击展开', false, fa(this.rogueReadingWide ? 'columns' : 'expand')) + button('refresh', '', '刷新展示') + '</div>' +
				'<h2>留在床头的卡片</h2><p>收藏旅途，展示伙伴。以通关时的成长和力量，再进行一场对战。</p>';
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (!state) { stableHTML(this, html + '<p>正在读取通关记录…</p></div>'); return; }
			if (state.account) {
				html += '<h3>我的收藏 · ' + state.own.length + ' / 3</h3><p class="rogue-caption">新卡默认私有，公开后所有玩家都能查看完整队伍。</p><div class="rogue-gallery-grid">';
				state.own.forEach(function (card) {
					html += '<div>' + clearCardHTML(card) + '<p>' + button('publishCard', card.id + '|' + (card.public ? 'private' : 'public'),
						card.public ? '停止公开' : '公开展示', busy) + button('deleteCard', card.id, '删除收藏', busy) + '</p></div>';
				});
				html += '</div>';
				if (!state.own.length) html += '<p>完成 200 层后，第一张通关卡将留在这里。</p>';
				if (state.pending) {
					html += clearCardHTML(state.pending);
					var proto = globals.FantasyRogueRoom.prototype || globals.FantasyRogueRoom;
					html += proto.renderPendingClear.call(this, state.pending, state.own, busy);
				}
				var choices = state.own.filter(function (card) { return card.public && card.rulesVersion === state.rulesVersion; });
				html += '<h3>通关队伍约战</h3><p>全队恢复 HP、PP 和异常状态后开战；禁止使用背包道具与捕捉。仅相同塔灵互战，无塔灵单独成组。</p>' +
					'<label>使用我的卡片：<select name="duelCard"><option value="">选择已公开的通关卡</option>' + choices.map(function (card) {
						return '<option value="' + card.id + '"' + (card.id === selected ? ' selected' : '') + '>' + escape(card.snapshot.spiritName || '无塔灵') +
							' · ' + new Date(card.completedAt).toLocaleString() + '</option>';
					}).join('') + '</select></label>';
				(state.invitations || []).forEach(function (invite) {
					var incoming = invite.to === state.userid;
					html += '<p class="rogue-keepsake">' + escape(incoming ? invite.fromName + ' 向你发来约战' : '等待 ' + invite.toName + ' 接受') + ' ' +
						(incoming ? button('acceptDuel', invite.id, '使用上方卡片接受', busy) + button('declineDuel', invite.id, '拒绝', busy) :
							button('cancelDuel', invite.id, '取消约战', busy)) + '</p>';
				});
			}
			html += '<h3>公开展示</h3><div class="rogue-gallery-grid">';
			state.cards.forEach(function (card) {
				var usable = card.rulesVersion === state.rulesVersion;
				html += '<div>' + clearCardHTML(card) + '<p>' + (usable ? button('challengeCard', card.id, card.online ? '邀请约战' : '当前离线',
					busy || !state.account || !card.online || card.owner === state.userid) : '<span class="rogue-caption">历史规则版本 · 仅供展示</span>') + '</p></div>';
			});
			html += '</div>' + (!state.cards.length ? '<p>还没有公开展示的通关卡。</p>' : '') + '<p>' +
				button('changePage', '-12', '上一页', busy || !state.offset) + button('changePage', '12', '下一页', busy || state.cards.length < 12) + '</p></div>';
			stableHTML(this, html);
		}
	});
	this.RogueEventReplayPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.owner = data.room; this.eventKey = data.event.key; this.userid = app.user.get('userid');
			this.cooperative = !!data.cooperative;
			this.$el.addClass('rogue-event-replay').html('<h3>斗蛐蛐！ · 观战</h3><div class="battle"></div><div class="battle-log"></div>' +
				'<p>' + button('togglePlayback', '', '暂停／继续') + button('playbackSpeed', '', '速度 ×1') + button('finishEvent', '', '观战结束，查看结果', true) + button('close', '', '暂时收起') + '</p>');
			this.battle = new Battle({$frame: this.$('.battle'), $logFrame: this.$('.battle-log'), log: data.event.replay, paused: true, isReplay: true, autoresize: true});
			this.battle.setViewpoint(data.event.support === 1 ? 'p2' : 'p1');
			var self = this;
			this.battle.subscribe(function () { self.$('button[name=finishEvent]').prop('disabled', !self.battle.ended || !self.battle.atQueueEnd); });
			var saved = this.owner.eventPlayback;
			if (saved && saved.key === this.eventKey) this.battle.seekTurn(saved.turn);
			this.playTimer = setTimeout(function () { self.battle.play(); }, 0);
		},
		playbackSpeed: function () {
			this.fast = !this.fast; this.battle.messageFadeTime = this.fast ? 40 : 300;
			this.battle.scene.acceleration = this.fast ? 3 : 1;
			this.$('button[name=playbackSpeed]').text(this.fast ? '速度 ×3' : '速度 ×1');
		},
		togglePlayback: function () { if (this.battle.paused) this.battle.play(); else this.battle.pause(); },
		finishEvent: function () {
			if (!this.battle.ended || !this.battle.atQueueEnd || app.user.get('userid') !== this.userid) return;
			var session = this.cooperative && this.owner.coopState && this.owner.coopState.session;
			var event = this.cooperative ? session && session.adventure && session.adventure.coopEvent :
				this.owner.state && this.owner.state.run && this.owner.state.run.event;
			if (event && event.key === this.eventKey && event.stage === 'watch') {
				if (!this.cooperative) this.owner.chooseEvent('watched');
				else if (!session.delegatedTo || session.delegatedTo === this.userid) this.owner.chooseCoopEvent('watched');
			}
			this.close();
		},
		remove: function () {
			clearTimeout(this.playTimer);
			if (this.battle) {
				this.owner.eventPlayback = {key: this.eventKey, turn: this.battle.ended && this.battle.atQueueEnd ? Infinity : this.battle.turn};
				this.battle.destroy(); this.battle = null;
			}
			return globals.Popup.prototype.remove.apply(this, arguments);
		}
	});
	this.RogueDailyReplayPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.owner = data.room; this.day = data.day; this.match = 0;
			this.onComplete = data.onComplete;
			this.userid = app.user.get('userid'); this.owner.dailyReplayPopup = this;
			this.$el.addClass('rogue-event-replay rogue-cup-replay'); this.loadMatch();
		},
		loadMatch: function () {
			if (this.closed) return;
			if (app.user.get('userid') !== this.userid) { this.close(); return; }
			clearTimeout(this.playTimer); clearTimeout(this.loadTimer);
			if (this.battle) { this.battle.destroy(); this.battle = null; }
			this.target = this.day + ':' + this.match;
			this.$el.html('<h3>每日对战竞猜 · ' + escape(this.day) + ' · 第 ' + (this.match + 1) + ' 场</h3><p>正在读取公开录像……</p><p>' + this.skipControls() + '</p>');
			app.send('/cmd fantasyroguedailyreplay ' + this.target);
			var self = this;
			this.loadTimer = setTimeout(function () { self.showError('录像暂未加载，请重试。'); }, 10000);
		},
		showError: function (message) {
			if (this.closed) return;
			this.$el.html('<h3>每日对战竞猜 · 录像</h3><p role="alert">' + escape(message) + '</p><p>' + button('loadMatch', '', '重新加载') + this.skipControls() + '</p>');
		},
		skipControls: function () {
			return button('skipMatch', '', this.match < 2 ? '跳过本场' : '跳过决赛，查看结果') +
				(this.match < 2 ? button('finishReplay', '', '跳过全部，查看结果') : '') + button('close', '', '暂时收起');
		},
		receive: function (data) {
			if (this.closed || data.target !== this.target || this.userid !== app.user.get('userid') || this.battle) return;
			clearTimeout(this.loadTimer);
			if (!data.enabled || !Array.isArray(data.log)) { this.showError(data.message || '录像暂不可用。'); return; }
			this.$el.html('<h3>每日对战竞猜 · ' + escape(this.day) + ' · ' + ['A 队 vs B 队', 'C 队 vs D 队', '决赛'][this.match] + '</h3>' +
				'<div class="battle"></div><div class="battle-log"></div><p>' + button('togglePlayback', '', '暂停／继续') +
				button('playbackSpeed', '', '速度 ×1') + button('nextMatch', '', this.match < 2 ? '观看下一场' : '查看竞猜结果', true) + this.skipControls() + '</p>');
			this.fast = false;
			this.battle = new Battle({$frame: this.$('.battle'), $logFrame: this.$('.battle-log'), log: data.log, paused: true, isReplay: true, autoresize: true});
			this.battle.setViewpoint('p1');
			var self = this;
			this.battle.subscribe(function () { if (self.battle) self.$('button[name=nextMatch]').prop('disabled', !self.battle.ended || !self.battle.atQueueEnd); });
			this.playTimer = setTimeout(function () { if (self.battle) self.battle.play(); }, 0);
		},
		togglePlayback: function () { if (this.battle) { if (this.battle.paused) this.battle.play(); else this.battle.pause(); } },
		playbackSpeed: function () {
			if (!this.battle) return;
			this.fast = !this.fast; this.battle.messageFadeTime = this.fast ? 40 : 300;
			this.battle.scene.acceleration = this.fast ? 3 : 1;
			this.$('button[name=playbackSpeed]').text(this.fast ? '速度 ×3' : '速度 ×1');
		},
		nextMatch: function () {
			if (!this.battle || !this.battle.ended || !this.battle.atQueueEnd) return;
			this.skipMatch();
		},
		skipMatch: function () {
			if (this.closed || this.userid !== app.user.get('userid')) return;
			if (this.match === 2) { this.finishReplay(); return; }
			this.match++; this.loadMatch();
		},
		finishReplay: function () {
			if (this.closed || this.userid !== app.user.get('userid')) return;
			var onComplete = this.onComplete;
			this.close();
			if (onComplete) onComplete();
		},
		remove: function () {
			this.closed = true;
			clearTimeout(this.loadTimer); clearTimeout(this.playTimer);
			if (this.battle) { this.battle.destroy(); this.battle = null; }
			if (this.owner.dailyReplayPopup === this) this.owner.dailyReplayPopup = null;
			return globals.Popup.prototype.remove.apply(this, arguments);
		}
	});
	this.RogueBuyPopup = this.Popup.extend({
		type: 'modal',
		events: {'input input[name=buyCount]': 'updatePreview'},
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			this.revision = data.room.state.account.revision;
			var run = data.room.state.run, item = data.item;
			var offer = run.node && run.node.trade && (run.node.trade.stock || []).find(function (entry) { return entry.id === item.id; });
			var remaining = item.remaining === undefined && offer ? offer.remaining : item.remaining;
			this.maximum = Math.max(0, Math.min(999, remaining === undefined ? 999 : remaining,
				item.price > 0 ? Math.floor(run.money / item.price) : 999));
			stableHTML(this, '<div class="rogue-candy-popup"><h3>购买 ' + escape(localName(item.name)) + '</h3><p>' + itemIcon(item) +
				'单价 ' + item.price + ' 金币 · 余额 ' + run.money + ' 金币' + (remaining === undefined ? '' : ' · 剩余 ' + remaining + ' 件') + '</p>' +
				'<label>购买数量 <input name="buyCount" type="number" min="1" max="' + this.maximum + '" step="1" value="1" inputmode="numeric" /></label>' +
				'<p class="rogue-candy-amounts">' + [1, 5, 10].map(function (n) { return button('chooseCount', '' + n, n + ' 件'); }).join(' ') +
				' ' + button('chooseCount', 'max', '最多 ' + this.maximum + ' 件') + '</p><p class="rogue-buy-preview" aria-live="polite"></p>' +
				button('confirmBuy', '', '确认购买') + ' ' + button('close', '', '取消') + '</div>');
			this.updatePreview();
		},
		count: function () {
			var n = Number(this.$('input[name=buyCount]').val());
			return Number.isSafeInteger(n) && n >= 1 && n <= this.maximum ? n : 0;
		},
		updatePreview: function () {
			var count = this.count(), cost = count * this.data.item.price;
			this.$('.rogue-buy-preview').text(count ? '合计 ' + cost + ' 金币 · 购买后剩余 ' + (this.data.room.state.run.money - cost) + ' 金币' :
				this.maximum ? '请输入 1～' + this.maximum + ' 的整数。' : '金币或库存不足。');
			this.$('button[name=confirmBuy]').prop('disabled', !count);
		},
		chooseCount: function (value) {
			this.$('input[name=buyCount]').val(value === 'max' ? this.maximum : Math.min(this.maximum, Number(value)));
			this.updatePreview();
		},
		confirmBuy: function () {
			var room = this.data.room, count = this.count();
			if (!count) return;
			if (app.user.get('userid') !== this.userid) { this.close(); return; }
			if (!room.state.account || room.state.account.revision !== this.revision) {
				this.close(); app.addPopup(globals.RogueNoticePopup, {text: '金币或商店库存已更新，请重新选择购买数量。'}); return;
			}
			room.submit('buy', {value: this.data.item.id, count: count}); this.close();
		}
	});

	this.RogueTreasurePopup = this.Popup.extend({
		type: 'modal',
		events: {'input input[name=treasureCount]': 'updatePreview', 'change select[name=mushroomTarget]': 'updatePreview'},
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid'); this.revision = data.room.state.account.revision;
			this.maximum = data.room.state.run.bag[data.item.id] || 0;
			var run = data.room.state.run;
			var names = ['paras','parasect','shroomish','breloom','foongus','amoonguss','morelull','shiinotic','brutebonnet'];
			this.members = run.team.filter(function (m) { return names.indexOf(toID(dex().species.get(m.set.species).baseSpecies.replace(/-Fantasy$/, ''))) >= 0; });
			stableHTML(this, '<div class="rogue-candy-popup"><h3>' + (data.mode === 'feed' ? '投喂蘑菇伙伴' : '回收物品') + '</h3><p>' + itemIcon(data.item) + escape(localName(data.item.name)) + ' · 持有 ' + this.maximum + '</p>' +
				(data.mode === 'feed' ? '<label>伙伴 <select name="mushroomTarget">' + this.members.map(function (m) { return '<option value="' + escape(m.id) + '"' + (data.member && data.member.id === m.id ? ' selected' : '') + '>' + escape(localName(m.set.species)) + '</option>'; }).join('') + '</select></label>' : '') +
				'<p><label>数量 <input name="treasureCount" type="number" min="1" max="' + this.maximum + '" value="1" /></label></p><p>' + button('amount', '1', '1 个') + button('amount', '10', '10 个') + button('amount', 'max', '全部') + '</p><p class="rogue-treasure-preview"></p>' + button('confirm', '', '确认') + button('close', '', '取消') + '</div>');
			this.updatePreview();
		},
		amount: function (value) { this.$('input[name=treasureCount]').val(value === 'max' ? this.maximum : Math.min(this.maximum, Number(value))); this.updatePreview(); },
		updatePreview: function () {
			var n = Number(this.$('input[name=treasureCount]').val()), valid = Number.isSafeInteger(n) && n > 0 && n <= this.maximum, text = '请输入有效数量。';
			if (valid && this.data.mode === 'sell') { var run = this.data.room.state.run, premium = run.node && run.node.trade && run.node.trade.kind === 'mushroom' && /mushroom$/.test(this.data.item.id); text = '将获得 ' + n * (this.data.item.recyclePrice || Math.floor(this.data.item.sellPrice * (premium ? 1.25 : 1))) + ' 金币。'; }
			if (valid && this.data.mode === 'feed') {
				var id = this.$('select[name=mushroomTarget]').val(), mon = this.members.find(function (m) { return m.id === id; }); valid = !!mon;
				if (mon) { var growth = mon.mushroomTraining || {}, total = (growth.offense || 0) + (growth.defense || 0), food = {tinymushroom:[30,1,'双攻'],bigmushroom:[150,1,'双防'],balmmushroom:[300,2,'双攻、双防']}[this.data.item.id];
					var after = 2000 * (Math.pow(Math.pow(1 + total/2000, 1.5) + 1.5*n*food[0]*food[1]/2000, 2/3)-1);
					text = '【合成大蘑菇】本局永久' + food[2] + ' +' + ((after-total)/food[1]/100).toFixed(2) + '%。仅此伙伴获得；增幅越高，后续投喂收益越低。';
				} else text = '队伍中没有可投喂的蘑菇伙伴。';
			}
			this.$('.rogue-treasure-preview').text(text); this.$('button[name=confirm]').prop('disabled', !valid);
		},
		confirm: function () {
			var room = this.data.room, n = Number(this.$('input[name=treasureCount]').val());
			if (app.user.get('userid') !== this.userid || !room.state.account || room.state.account.revision !== this.revision) { this.close(); return; }
			if (!Number.isSafeInteger(n) || n < 1 || n > this.maximum) return;
			room.submit(this.data.mode === 'feed' ? 'feedmushroom' : 'sell', {value:this.data.item.id, count:n, member:this.$('select[name=mushroomTarget]').val()}); this.close();
		}
	});
	this.RogueTrainingCampPopup = this.Popup.extend({
		type: 'modal',
		events: {'change input': 'updatePrice', 'change select': 'updatePrice'},
		initialize: function (data) {
			this.room = data.room; this.coop = data.coop;
			var run;
			if (this.coop) {
				run = {growthOffers: data.camp.offers, team: data.camp.members, money: data.camp.money};
				this.requestId = 'camp-' + Date.now() + '-' + Math.random().toString(36).slice(2);
			} else {
				run = this.room.state.run; this.runid = run.id; this.revision = this.room.state.account.revision;
			}
			this.money = run.money;
			this.offers = run.growthOffers || []; this.members = run.team.filter(function (m) { return !m.egg && !m.fusion; });
			var html = '<h3>训练营 · 安排一次集训</h3><p>当场完成，伙伴不离队。确认后，本营地不能追加训练。</p><label>训练员 <select name="campTier">' + this.offers.map(function (o) { return '<option value="' + o.id + '">' + escape(o.name) + ' · 每项 +' + o.amount / 100 + '% · 每位每项 ' + o.price + ' 金币</option>'; }).join('') + '</select></label>';
			html += '<fieldset><legend>参加的伙伴</legend>' + this.members.map(function (m) { return '<label style="display:block;margin:6px"><input type="checkbox" name="campMember" value="' + escape(m.id) + '" />' + escape(localName(m.set.species)) + ' · Lv.' + m.set.level + '</label>'; }).join('') + '</fieldset><fieldset><legend>训练项目</legend>';
			html += ['atk', 'def', 'spa', 'spd', 'spe'].map(function (stat) { return '<label style="display:inline-block;margin:6px"><input type="checkbox" name="campStat" value="' + stat + '" />' + statNames[stat] + '</label>'; }).join('') + '</fieldset><div class="camp-preview" aria-live="polite"></div>' + button('confirmTraining', '', '确认训练') + button('close', '', '暂不训练');
			stableHTML(this, html); this.updatePrice();
		},
		selection: function () { return {value: this.$('select[name=campTier]').val(), trainingMembers: this.$('input[name=campMember]:checked').map(function () { return this.value; }).get(), trainingStats: this.$('input[name=campStat]:checked').map(function () { return this.value; }).get()}; },
		updatePrice: function () {
			var selection = this.selection(), tier = this.offers.find(function (o) { return o.id === selection.value; });
			if (!tier) { this.$('button[name=confirmTraining]').prop('disabled', true); return; }
			var members = this.members.filter(function (m) { return selection.trainingMembers.indexOf(m.id) >= 0; }), stats = selection.trainingStats;
			var price = tier.price * members.length * stats.length, capped = members.some(function (m) { return stats.some(function (s) { return (m.campTraining && m.campTraining[s] || 0) >= 6000; }); });
			this.$('button[name=confirmTraining]').prop('disabled', !tier.remaining || !members.length || !stats.length || capped || price > this.money);
			this.$('.camp-preview').html('<p><strong>总价：' + price + ' 金币</strong> · 余额 ' + this.money + ' 金币</p>' + members.map(function (m) { return '<p>' + escape(localName(m.set.species)) + '：' + stats.map(function (s) { var before = m.campTraining && m.campTraining[s] || 0; return statNames[s] + ' +' + before / 100 + '% → +' + Math.min(6000, before + tier.amount) / 100 + '%'; }).join('、') + '</p>'; }).join('') + (capped ? '<p>有项目已达上限，请取消该项目或伙伴。</p>' : ''));
		},
		confirmTraining: function () {
			if (this.coop) {
				var state = this.room.coopState, session = state && state.session, quote = this.room.coopCamp(this.coop.owner);
				if (!this.room.coopBusy && state && state.userid === this.coop.userid && session && session.id === this.coop.session &&
					session.adventure && session.adventure.id === this.coop.adventure && quote && !quote.locked && quote.visit === this.coop.visit) {
					this.room.sendCoop('buygrowth', Object.assign(this.selection(), {id: this.requestId, owner: this.coop.owner, visit: this.coop.visit}));
				}
			} else if (this.room.state.run && this.room.state.run.id === this.runid && this.room.state.account.revision === this.revision) {
				this.room.submit('buygrowth', this.selection());
			}
			this.close();
		}
	});
	this.RogueFusionPopup = this.Popup.extend({
		type: 'modal',
		events: {'change select[name=fusionFirst]': 'updatePair', 'change select[name=fusionSecond]': 'updatePair', 'change input[name=fusionStat]': 'updateStats'},
		initialize: function (data) {
			this.room = data.room; this.runid = this.room.state.run.id; this.revision = this.room.state.account.revision;
			this.members = this.room.state.run.team.filter(function (m) { return !m.egg; });
			var options = this.members.map(function (m) { return '<option value="' + escape(m.id) + '">' + escape(localName(m.set.species)) + ' · Lv.' + m.set.level + '</option>'; }).join('');
			stableHTML(this, '<h3>波塔拉耳环</h3><p><strong>第一位</strong>提供第一属性和你选定的三项种族值；<strong>第二位</strong>提供其余三项种族值与第二属性（单属性时取第一属性）。等级取较高者，努力值和个体值沿用第一位。</p><p>第一位 <select name="fusionFirst">' + options + '</select></p><p>第二位 <select name="fusionSecond">' + options + '</select></p><div class="fusion-preview"></div><p>融合后占一个名额，可使用双方完整招式池；暂停进化、幻想化及战斗形态变化。解除时恢复原数据，第一位保留融合期间获得的经验；再次融合需通关 10 层。</p>' + button('confirmFusion', '', '确认融合') + button('close', '', '取消'));
			this.$('select[name=fusionSecond]').val(this.members[1] && this.members[1].id); this.updatePair();
		},
		updatePair: function () {
			var aId = this.$('select[name=fusionFirst]').val(), bId = this.$('select[name=fusionSecond]').val();
			var a = this.members.find(function (m) { return m.id === aId; }), b = this.members.find(function (m) { return m.id === bId; });
			this.$('button[name=confirmFusion]').prop('disabled', !a || !b || a === b || !a.hp || !b.hp);
			if (!a || !b || a === b) { this.$('.fusion-preview').html('<p>请选择两位不同的伙伴。</p>'); return; }
			var abilities = Array.from(new Set((a.fusionAbilities || []).concat(b.fusionAbilities || [])));
			this.$('.fusion-preview').html('<p>融合等级：<strong>' + Math.max(a.set.level, b.set.level) + '</strong></p><p>特性 <select name="fusionAbility">' + abilities.map(function (id) { return '<option value="' + escape(id) + '">' + escape(localName(dex().abilities.get(id).name)) + '</option>'; }).join('') + '</select></p><p>外观 <select name="fusionAppearance">' + [a, b].map(function (m) { return '<option value="' + escape(m.id) + '">' + escape(localName(m.set.species)) + '</option>'; }).join('') + '</select></p><fieldset class="fusion-stats"><legend>勾选由第一位提供的三项种族值</legend>' + ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(function (stat, index) { return '<label style="display:inline-block;margin:6px"><input type="checkbox" name="fusionStat" value="' + stat + '"' + (index < 3 ? ' checked' : '') + ' />' + statNames[stat] + '</label>'; }).join('') + '</fieldset><p class="fusion-stat-preview"></p>');
			this.updateStats();
		},
		updateStats: function () {
			var selected = this.$('input[name=fusionStat]:checked').map(function () { return this.value; }).get();
			var a = this.members.find(function (m) { return m.id === this.$('select[name=fusionFirst]').val(); }, this), b = this.members.find(function (m) { return m.id === this.$('select[name=fusionSecond]').val(); }, this);
			this.$('button[name=confirmFusion]').prop('disabled', selected.length !== 3 || !a || !b || a === b || !a.hp || !b.hp);
			if (!a || !b || a === b) return;
			this.$('.fusion-stat-preview').text('已选 ' + selected.length + ' / 3 项。融合种族值：' + ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(function (stat) { var source = selected.indexOf(stat) >= 0 ? a : b; return statNames[stat] + ' ' + dex().species.get(source.set.species).baseStats[stat] + '（' + localName(source.set.species) + '）'; }).join(' · '));
		},
		confirmFusion: function () {
			if (this.room.state.run && this.room.state.run.id === this.runid && this.room.state.account.revision === this.revision) this.room.submit('fusion', {member: this.$('select[name=fusionFirst]').val(), value: this.$('select[name=fusionSecond]').val(), fusionStats: this.$('input[name=fusionStat]:checked').map(function () { return this.value; }).get(), fusionAbility: this.$('select[name=fusionAbility]').val(), appearance: this.$('select[name=fusionAppearance]').val()});
			this.close();
		}
	});
	this.RogueCandyPopup = this.Popup.extend({
		type: 'modal',
		events: {'input input[name=candyCount]': 'updatePreview'},
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			this.revision = data.room.state.account.revision;
			var exp = data.member.experienceProgress, held = data.room.state.run.bag[data.item.id] || 0;
			this.maximum = exp && exp.levels && data.member.hp && !data.member.fixedLevel ?
				Math.max(0, Math.min(held, Math.ceil((exp.levels[exp.levels.length - 1] - exp.total) / data.item.amount))) : 0;
			if (!this.maximum) {
				stableHTML(this, '<p>当前伙伴不能使用经验糖果，请刷新存档后检查等级与状态。</p>' + button('close', '', '关闭'));
				return;
			}
			stableHTML(this, '<div class="rogue-candy-popup"><h3>为' + escape(localName(data.member.set.species)) + '使用经验糖果</h3>' +
				'<p>' + itemIcon(data.item) + escape(data.item.name) + ' · 持有 ' + held + ' 个</p>' +
				'<label>使用数量 <input name="candyCount" type="number" min="1" max="' + this.maximum + '" step="1" value="1" inputmode="numeric" /></label>' +
				'<p class="rogue-candy-amounts">' + [1, 5, 10].map(function (n) { return button('chooseCount', '' + n, '' + n + ' 个'); }).join(' ') +
				' ' + button('addTen', '', '数量 +10') + ' ' + button('chooseCount', 'max', '最多 ' + this.maximum + ' 个') + '</p>' +
				'<p class="rogue-candy-preview" aria-live="polite"></p><p class="rogue-caption">' + (data.member.uncappedLevel ? '独行伙伴已解除 100 级限制。' : '达到 100 级即停止使用，多余糖果保留。') + '</p>' +
				button('confirmCandy', '', '确认使用', false, fa('check')) + ' ' + button('close', '', '取消') + '</div>');
			this.updatePreview();
		},
		preview: function (count) {
			if (!Number.isSafeInteger(count) || count < 1 || count > this.maximum) return null;
			var exp = this.data.member.experienceProgress, levels = exp.levels;
			var total = Math.min(levels[levels.length - 1], exp.total + count * this.data.item.amount), level = 1;
			while (level < levels.length && total >= levels[level]) level++;
			return {count: count, level: level, gained: total - exp.total, next: level === levels.length ? 0 : levels[level] - total};
		},
		updatePreview: function () {
			var preview = this.preview(Number(this.$('input[name=candyCount]').val()));
			this.$('.rogue-candy-preview').text(preview ? 'Lv.' + this.data.member.set.level + ' → Lv.' + preview.level +
				' · 经验 +' + preview.gained + (!preview.next ? ' · 已达当前预览上限' : ' · 距下一级 ' + preview.next + ' 经验') :
				'请输入 1～' + this.maximum + ' 的整数。');
			this.$('button[name=confirmCandy]').prop('disabled', !preview);
		},
		chooseCount: function (value) {
			this.$('input[name=candyCount]').val(value === 'max' ? this.maximum : Math.min(this.maximum, Number(value)));
			this.updatePreview();
		},
		addTen: function () {
			var current = Number(this.$('input[name=candyCount]').val());
			this.chooseCount('' + ((Number.isSafeInteger(current) && current > 0 ? current : 1) + 10));
		},
		confirmCandy: function () {
			var preview = this.preview(Number(this.$('input[name=candyCount]').val())), room = this.data.room;
			if (!preview) return;
			if (app.user.get('userid') !== this.userid) { this.close(); return; }
			if (!room.state.account || room.state.account.revision !== this.revision) {
				this.close(); app.addPopup(globals.RogueNoticePopup, {text: '队伍或背包已更新，请重新选择糖果数量。'}); return;
			}
			room.submit('use', {value: this.data.item.id, member: this.data.member.id, count: preview.count});
			this.close();
		}
	});
	this.RogueCrownPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			var gold = data.item.id === 'goldbottlecap';
			var ceiling = data.room.state.run.difficulty === 'easy' ? ((data.room.state.run.difficultyRulesVersion || 1) >= 4 ? 15 : 10) : 31;
			stableHTML(this, '<div class="rogue-crown-popup"><h3>为' + escape(localName(data.member.set.species)) + '使用【' + escape(data.item.name) + '】</h3><p>' + escape(data.item.description) + '</p>' +
				(ceiling < 31 ? '<p>护符庇佑：本局个体值上限为 ' + ceiling + '。</p>' : '') +
				(gold ? button('trainIV', 'all', '将六项个体值提升至 ' + ceiling, Object.keys(statNames).every(function (stat) { return data.member.set.ivs[stat] >= ceiling; })) :
				Object.keys(statNames).map(function (stat, i) { return '<p>' + button('trainIV', '' + i, statNames[stat] + ' · ' + data.member.set.ivs[stat] + ' → ' + ceiling, data.member.set.ivs[stat] >= ceiling) + '</p>'; }).join('')) + button('close', '', '取消') + '</div>');
		},
		trainIV: function (slot) {
			if (app.user.get('userid') === this.userid) this.data.room.submit('use', {value: this.data.item.id, member: this.data.member.id, slot: slot === 'all' ? undefined : Number(slot)});
			this.close();
		}
	});
	this.RogueEtherPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			stableHTML(this, '<h3>选择恢复 PP 的招式</h3><p>使用 ' + escape(data.item.name) + '</p>' +
				data.member.pp.map(function (move, i) {
					return '<p>' + button('restorePP', '' + i, localName(dex().moves.get(move.id).name, 'move') + ' · ' + move.pp + '/' + move.maxpp + ' PP', move.pp >= move.maxpp) + '</p>';
				}).join('') + button('close', '', '取消'));
		},
		restorePP: function (slot) {
			if (app.user.get('userid') === this.userid) this.data.room.submit('use', {value: this.data.item.id, member: this.data.member.id, slot: Number(slot)});
			this.close();
		}
	});
	this.RogueNoticePopup = this.Popup.extend({
		initialize: function (data) {
			stableHTML(this, '<p role="alert">' + escape(data.text) + '</p>' + button('close', '', '知道了'));
		}
	});
	this.RogueUnlockPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			stableHTML(this, '<section class="rogue-unlock-notice"><div aria-hidden="true">' + fa('unlock-alt') + '</div><h3>' + escape(data.notice.title) + '</h3><p>' + escape(data.notice.text) + '</p>' + button('ackUnlock', '', '记住了，继续旅途') + '</section>');
		},
		ackUnlock: function () {
			var room = this.data.room;
			if (room.pending) return;
			if (app.user.get('userid') === this.userid) room.submit('unlockack', {value: this.data.notice.id});
			this.close();
		}
	});
	this.RogueFailurePopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			stableHTML(this, '<h3>爬塔已无法推进</h3><p>本局止步于第 <b>' + Number(data.failure.floor) + '</b> 层。</p><p>' +
				escape(data.failure.reason) + '</p>' + button('confirmFailure', '', '确认，返回起始界面'));
		},
		confirmFailure: function () {
			if (app.user.get('userid') === this.userid && this.data.room.state.run && this.data.room.state.run.id === this.data.runid) {
				this.data.room.acknowledgeFailure(this.data.failure.key);
				app.joinRoom('fantasyrogue');
			}
			this.close();
		}
	});
	this.RogueCardConfirmPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.data = data; this.userid = app.user.get('userid');
			stableHTML(this, '<h3>' + escape(data.title || '确认操作') + '</h3><p>' + escape(data.text) + '</p>' + button('confirmCard', '', data.confirmText || '确认') + button('close', '', data.cancelText || '取消'));
		},
		confirmCard: function () {
			if (app.user.get('userid') === this.userid) {
				if (this.data.coop) this.data.room.sendCoop(this.data.action, this.data.details);
				else this.data.room.submit(this.data.action, this.data.details);
			}
			this.close();
		}
	});
	this.FantasyRoguePartyRoom = this.Room.extend({
		type: 'fantasyrogueparty', title: '队伍及背包', isSideRoom: true, minWidth: 320, bestWidth: 960,
		events: {'change select[name=target]': 'changeItemTarget', 'change select[name=difficulty]': 'changeDifficulty', 'change input[name=collapse]': 'changeCollapse',
			'change input[name=nuzlocke]': 'changeNuzlocke',
			'change select[name=universalItem]': 'changeUniversalItem',
			'input .rogue-universal-allocation input': 'updateUniversalAllocation',
			'change select[name=universalAura]': 'updateUniversalAllocation'},
		changeUniversalItem: function () { var owner = app.rooms.fantasyrogue; if (owner) owner.changeUniversalItem(); },
		updateUniversalAllocation: function () { var owner = app.rooms.fantasyrogue; if (owner) owner.updateUniversalAllocation(); },
		changeNuzlocke: function (event) { var owner = app.rooms.fantasyrogue; if (owner) owner.changeNuzlocke(event); },
		changeCollapse: function (event) { var owner = app.rooms.fantasyrogue; if (owner) owner.changeCollapse(event); },
		changeDifficulty: function (event) {
			var owner = app.rooms.fantasyrogue;
			if (owner) owner.changeDifficulty(event);
		},
		changeItemTarget: function (event) {
			var owner = app.rooms.fantasyrogue;
			if (owner) owner.changeItemTarget(event);
		},
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue rogue-party-room');
			this.render();
		},
		dispatchClickButton: function (e) {
			var owner = app.rooms.fantasyrogue;
			if (owner) Room.prototype.dispatchClickButton.call(owner, e);
		},
		render: function () {
			var owner = app.rooms.fantasyrogue;
			var scroll = this.$el.scrollTop();
			stableHTML(this, '<div class="pad">' + (owner ? owner.renderParty() : '<p>请先打开幻想杯肉鸽。</p>') + '</div>');
			this.$el.scrollTop(scroll);
		}
	});
	this.RogueReferencePopup = this.Popup.extend({
		initialize: function (data) {
			this.$el.addClass('rogue-reference-popup');
			if (data.kind === 'category') {
				this.$el.addClass('rogue-category-popup');
				this.$el.html('<h3>' + escape(data.name) + '</h3><div class="rogue-category-moves">' +
					data.moves.map(function (name) { return '<span>' + escape(name) + '</span>'; }).join('') + '</div>' + button('close', '', '返回'));
				return;
			}
			var details = '<p>' + escape(data.text) + '</p>';
			if (data.kind === 'species') {
				details = '<div class="rogue-reference-species"><span class="picon" aria-hidden="true" style="' + Dex.getPokemonIcon(data.id) + '"></span>' + typeIcons(data.types) + '</div>' +
					'<h4>种族值</h4><div class="rogue-reference-stats">' + data.stats.map(function (stat) {
						return '<span>' + escape(stat.name) + '<b>' + stat.value + '</b></span>';
					}).join('') + '</div><h4>特性</h4><dl>' + data.abilities.map(function (ability) {
						return '<dt>' + escape(ability.name) + '</dt><dd>' + escape(ability.text) + '</dd>';
					}).join('') + '</dl>';
			}
			this.$el.html('<h3>' + escape(data.name) + ' <small>' +
				({move: '招式', ability: '特性', item: '道具', species: '宝可梦'}[data.kind] || '') + '</small></h3>' +
				(data.kind === 'move' ? moveRow(data.id) : '') + details + button('close', '', '返回'));
		}
	});
	this.RogueOnboardingPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.userid = data.userid;
			this.$el.addClass('rogue-onboarding');
			bindReferenceHelp(this.el || this.$el[0]);
			if (this.room.state.beginnerGuide) {
				this.$el.html('<h2>幻想杯肉鸽 · 新手攻略</h2><p>攻略会保留在开始页的「幻想杯图鉴 → 新手攻略」，随时可以回看。</p>' +
					'<div class="rogue-onboarding-body">' + beginnerGuideHTML(this.room.state.beginnerGuide) +
					'</div><p class="rogue-onboarding-actions">' + button('acknowledge', '', '读完了，开始旅途') + '</p>');
				return;
			}
			this.$el.html('<h2>出发前的新手须知</h2><div class="rogue-onboarding-body">' +
				'<h3>这趟旅途有什么特别？</h3><ul>' +
				'<li><b>祝福与塔灵：</b>祝福能改变队伍的成长与打法；塔灵会带来整局特殊规则。先完成一次无塔灵通关，就能开启塔灵玩法。</li>' +
				'<li><b>属性转：</b>部分祝福会给予属性转，能改变伙伴的属性与对应招式效果。它使用独立栏位，不占携带道具位，也可以取下。</li>' +
				'<li><b>藏宝袋与工具箱：</b>藏宝袋提供物资；工具箱让你从候选道具中挑选奖励。</li>' +
				'<li><b>额外特性：</b>部分祝福或事件能让伙伴同时拥有额外特性；在特性栏旁点击查看效果。</li></ul>' +
				'<h3>记得提前备好回复道具</h3><p>商店里请预留金币购买治疗、复活和 PP 回复道具。' +
				'<strong>战败后全队倒下，且背包没有复活道具时，会自动扣除一笔高额急救费，恢复全队。</strong>' +
				'费用随层数增加；金币不足时不会扣款，也不会复活，可能无法继续冒险。' +
				'已经结束的通关挑战、会恢复状态的幻境和限制治疗的连续挑战，按各自规则处理。</p>' +
				'<h3>战局不利时，可以逃跑再准备</h3><p>肉鸽战斗可点击<b>「逃跑（撤退到战斗外）」</b>退出本场战斗。挑战区域中，还可选择重试或<b>「逃离这一层」</b>；逃离不发奖励。' +
				'<strong>已经损失的 HP、PP、异常状态和道具消耗都会保留，逃跑不会自动治疗。</strong>' +
				'本场战斗中的叠层恢复至开战前，不能通过逃跑反复积累。' +
				'用道具恢复状态，调整队伍和装备后，可以重新挑战同一场战斗；对手会恢复初始状态。' +
				'事件剧情一旦推进，不能中途退出剧情，但仍能从事件战斗中逃跑。</p></div>' +
				'<p class="rogue-onboarding-actions">' + button('acknowledge', '', '我知道了') + '</p>');
		},
		acknowledge: function () {
			if (this.userid !== app.user.get('userid') || this.room.pending) return;
			this.room.onboardingPopupUser = null;
			this.room.submit('onboarding');
			this.close();
		}
	});
	this.RogueExtraAbilitiesPopup = this.Popup.extend({
		initialize: function (data) {
			this.$el.addClass('rogue-extra-abilities-popup');
			var html = '<h3>' + escape(localName(data.member.set.species)) + ' · 额外特性</h3><dl>';
			extraAbilityIds(data.member).forEach(function (id) {
				var ability = dex().abilities.get(id);
				var description = id === 'roguegreatmage' ? '特攻变为原来的 2 倍。' : localName(ability.shortDesc || ability.desc || '暂无特性说明');
				html += '<dt>【' + escape(localName(ability.name || id)) + '】</dt><dd>' + escape(description) + '</dd>';
			});
			stableHTML(this, html + '</dl>' + button('close', '', '返回队伍'));
		}
	});
	this.RogueCoopFormPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.owner = data.owner; this.member = data.member; this.value = data.value;
			var session = this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			this.sessionid = session.id; this.runid = session.adventure.id;
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === data.member; });
			var option = mon && (mon.formOptions || []).find(function (entry) { return entry.id === data.value; });
			this.species = mon && mon.species; this.signature = JSON.stringify(option);
			this.requestid = 'forme-' + Date.now() + '-' + Math.random().toString(36).slice(2);
			var html = '<h3>确认形态变化</h3>';
			if (option) {
				html += '<p>' + escape(localName(mon.species)) + ' → ' + escape(localName(option.species)) + '</p>' +
					'<p>使用该玩家的【' + escape(eventText(option.itemName)) + '】，' + (option.consumed ? '消耗 1 个' : '道具可以再次使用') +
					'；按原形态规则调整特性与招式，保留成长和已消耗 PP。</p>';
				if (option.donorSpecies) html += '<p>同属该玩家的【' + escape(localName(option.donorSpecies)) + '】将暂时并入合体，解除时归还。</p>';
				if (option.returningSpecies) html += '<p>【' + escape(localName(option.returningSpecies)) + '】将回到该玩家的队伍。</p>';
			}
			stableHTML(this, html + '<p class="rogue-coop-form-status" role="status"></p>' +
				button('confirmForm', '', '确认变化', !option || !option.ready) + button('close', '', '取消'));
		},
		confirmForm: function () {
			var session = this.room.coopState && this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === this.member; }, this);
			var option = mon && (mon.formOptions || []).find(function (entry) { return entry.id === this.value; }, this);
			if (this.room.coopBusy || !session || session.id !== this.sessionid || session.adventure.id !== this.runid ||
				!inventory || inventory.locked || inventory.suppliesLocked || !mon || mon.species !== this.species ||
				!option || !option.ready || JSON.stringify(option) !== this.signature) {
				this.$('.rogue-coop-form-status').text('形态条件、队伍位置或操作权限已变化，请关闭后重新选择。'); return;
			}
			this.room.sendCoop('forme', {owner: this.owner, member: this.member, value: this.value, id: this.requestid});
			this.close();
		}
	});
	this.RogueCoopFantasyPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.owner = data.owner; this.member = data.member;
			var session = this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			this.sessionid = session.id; this.runid = session.adventure.id;
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === data.member; });
			this.species = mon && mon.species; this.options = mon && mon.fantasyOptions || [];
			this.signature = JSON.stringify(this.options);
			this.requestid = 'fantasize-' + Date.now() + '-' + Math.random().toString(36).slice(2);
			this.target = this.options.length === 1 ? this.options[0].species : '';
			this.render();
		},
		currentMember: function () {
			var session = this.room.coopState && this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			if (this.room.coopBusy || !session || session.id !== this.sessionid || session.adventure.id !== this.runid ||
				!inventory || inventory.locked || inventory.suppliesLocked || inventory.fantasyShards < 100) return null;
			var mon = inventory.members.find(function (entry) { return entry.member === this.member; }, this);
			return mon && mon.fantasyReady && mon.species === this.species &&
				JSON.stringify(mon.fantasyOptions) === this.signature ? mon : null;
		},
		render: function () {
			var mon = this.currentMember(), html = '<h3>确认幻想分支与招式变化</h3>';
			if (!mon) {
				stableHTML(this, html + '<p role="status">碎片、伙伴或操作权限已变化，请关闭后重新选择。</p>' + button('close', '', '关闭'));
				return;
			}
			var option = this.options.find(function (entry) { return entry.species === this.target; }, this);
			if (!option) {
				html += '<p>为 ' + escape(localName(mon.species)) + ' 选择幻想形态，选择后将显示招式变更供你确认。</p>';
				this.options.forEach(function (entry) {
					html += button('chooseFantasyBranch', entry.species, localName(entry.species) +
						(entry.signature ? ' · ' + localName(dex().moves.get(entry.signature).name, 'move') : ''), false);
				});
			} else {
				html += '<p>' + escape(fantasyConversionText(mon.species, option)) + '</p><p>仅消耗该玩家的碎片。确认后无法退回原形态。</p>' +
					button('confirmFantasy', '', '确认变更并幻想化');
				if (this.options.length > 1) html += button('chooseFantasyBranch', '', '重新选择形态');
			}
			stableHTML(this, html + button('close', '', '取消'));
		},
		chooseFantasyBranch: function (value) {
			this.target = this.options.some(function (option) { return option.species === value; }) ? value : '';
			this.render();
		},
		confirmFantasy: function () {
			if (!this.currentMember() || !this.options.some(function (option) { return option.species === this.target; }, this)) {
				this.render(); return;
			}
			this.room.sendCoop('fantasize', {owner: this.owner, member: this.member, value: this.target,
				confirmed: true, id: this.requestid});
			this.close();
		}
	});
	this.RogueCoopUniversalPopup = this.Popup.extend({
		type: 'modal',
		events: {'input .rogue-universal-allocation input': 'updateUniversalAllocation',
			'change select[name=universalAura]': 'updateUniversalAllocation'},
		initialize: function (data) {
			this.room = data.room; this.owner = data.owner; this.member = data.member; this.value = data.value;
			var session = this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			this.sessionid = session.id; this.runid = session.adventure.id;
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === data.member; });
			var option = mon && (mon.universalOptions || []).find(function (entry) { return entry.id === data.value; });
			this.signature = JSON.stringify([mon && mon.species, mon && mon.item, option]);
			stableHTML(this, '<h3>' + escape(mon ? localName(mon.species) : '万用道具') + ' · 种族点分配</h3>' +
				'<p>仅调整该玩家的伙伴与物品，点数由你自行分配。确认后携带；战斗中仍需主动发动。</p>' +
				universalConfigHTML({id: this.member, universalOptions: option ? [option] : []},
					!inventory || !!inventory.locked || !!inventory.suppliesLocked, this.value, null) +
				'<p class="rogue-coop-universal-status" role="status"></p>' + button('close', '', '取消'));
		},
		currentOption: function () {
			var session = this.room.coopState && this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			if (this.room.coopBusy || !session || session.id !== this.sessionid || session.adventure.id !== this.runid ||
				!inventory || inventory.locked || inventory.suppliesLocked) return null;
			var mon = inventory.members.find(function (entry) { return entry.member === this.member; }, this);
			var option = mon && (mon.universalOptions || []).find(function (entry) { return entry.id === this.value; }, this);
			return option && JSON.stringify([mon.species, mon.item, option]) === this.signature ? option : null;
		},
		updateUniversalAllocation: function () {
			var option = this.currentOption();
			updateUniversalFields(this, {id: this.member}, option, !option);
			this.$('.rogue-coop-universal-status').text(option ? '' : '队伍、物品或操作权限已变化，请关闭后重新配置。');
		},
		applyUniversal: function () {
			this.updateUniversalAllocation();
			if (!this.universalDraft || this.$('button[name=applyUniversal]').prop('disabled')) return;
			this.room.sendCoop('configureuniversal', {owner: this.owner, member: this.member, value: this.value,
				evs: this.universalDraft.bonus, aura: this.universalDraft.aura || undefined});
			this.close();
		}
	});
	this.RogueCoopEvolutionPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.owner = data.owner; this.member = data.member; this.target = data.target;
			var session = this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			this.sessionid = session.id; this.runid = session.adventure.id;
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === data.member; });
			var option = mon && (mon.evolutions || []).find(function (entry) { return idOf(entry.species) === data.target; });
			this.species = mon && mon.species;
			this.requestid = 'evolve-' + Date.now() + '-' + Math.random().toString(36).slice(2);
			var html = '<h3>确认进化</h3>';
			if (option) {
				html += '<p><strong>' + escape(localName(mon.species)) + ' → ' + escape(localName(option.species)) + '</strong></p>' +
					'<p>进化后无法退回原形态。保留性格、资质和成长记录，不会补满 HP 或 PP；仅扣除该玩家的进化资源。</p><ul>';
				(option.requirements || []).forEach(function (condition) { html += '<li>' + escape(eventText(condition.text)) + '</li>'; });
				html += '</ul>';
			}
			stableHTML(this, html + button('confirmEvolution', '', '确认进化', !option || !option.ready || inventory.suppliesLocked) +
				button('close', '', '暂不进化'));
		},
		confirmEvolution: function () {
			var session = this.room.coopState && this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === this.member; }, this);
			if (!this.room.coopBusy && session && session.id === this.sessionid && session.adventure.id === this.runid &&
				mon && mon.species === this.species && !inventory.suppliesLocked && (mon.evolutions || []).some(function (option) {
					return option.ready && idOf(option.species) === this.target;
				}, this)) {
				this.room.coopEvolutionIntent = {session: this.sessionid, adventure: this.runid, owner: this.owner,
					member: this.member, target: this.target, before: {species: mon.species, shiny: mon.shiny, gender: mon.gender}};
				this.room.sendCoop('evolve', {owner: this.owner, member: this.member, value: this.target, id: this.requestid});
			}
			this.close();
		}
	});
	this.RogueCoopRecyclePopup = this.Popup.extend({
		type: 'modal',
		events: {'input input[name=recycleCount]': 'updatePrice'},
		initialize: function (data) {
			this.room = data.room; this.owner = data.owner; this.value = data.value; this.quote = data.quote;
			var state = this.room.coopState;
			this.userid = state.userid; this.session = state.session.id; this.adventure = state.session.adventure.id;
			this.requestId = 'recycle-' + Date.now() + '-' + Math.random().toString(36).slice(2);
			this.items = this.quote.items.filter(function (item) { return data.value === 'all' || item.id === data.value; });
			this.$el.addClass('fantasyrogue rogue-recycle-popup');
			this.$el.html('<form><h3>' + (this.quote.fullPrice ? '确认原价回收' : '确认战利品兑换') + '</h3>' +
				'<p>' + (this.owner === this.userid ? '从我的背包扣除，金币进入我的钱包。' : '从队友背包扣除，金币进入队友钱包。') + '</p><ul>' +
				this.items.map(function (item) { return '<li>' + escape(localName(item.name)) + ' ×' + item.count + ' · 每件 ' + item.price + ' 金币</li>'; }).join('') +
				'</ul>' + (this.value === 'all' ? '<p>确认兑换以上全部库存。已装备的物品不参与回收。</p>' :
					'<label>兑换数量 <input type="number" name="recycleCount" min="1" max="' + this.items[0].count + '" value="1" step="1" /></label>') +
				'<p class="rogue-recycle-preview"></p><p>' + button('confirm', '', '确认兑换') +
				button('close', '', '取消') + '</p></form>');
			this.updatePrice();
		},
		updatePrice: function () {
			var all = this.value === 'all', count = all ? 0 : Number(this.$('input[name=recycleCount]').val());
			var valid = this.items.length > 0 && (all || Number.isSafeInteger(count) && count > 0 && count <= this.items[0].count);
			var total = this.items.reduce(function (sum, item) { return sum + item.price * (all ? item.count : count); }, 0);
			this.$('.rogue-recycle-preview').text(valid ? '将获得 ' + total + ' 金币。' : '请输入有效的兑换数量。');
			this.$('button[name=confirm]').prop('disabled', !valid);
		},
		confirm: function () {
			var state = this.room.coopState, session = state && state.session, quote = this.room.coopRecycling(this.owner);
			if (!state || app.user.get('userid') !== this.userid || state.userid !== this.userid || !session ||
				session.id !== this.session || !session.adventure || session.adventure.id !== this.adventure ||
				!quote || quote.locked || quote.quote !== this.quote.quote) { this.close(); return; }
			if (this.room.coopBusy) return;
			var details = {id: this.requestId, owner: this.owner, value: this.value, quote: this.quote.quote, confirmed: true};
			if (this.value !== 'all') {
				var count = Number(this.$('input[name=recycleCount]').val());
				if (!Number.isSafeInteger(count) || count < 1 || count > this.items[0].count) return;
				details.count = count;
			}
			this.room.sendCoop('sell', details); this.close();
		},
	});
	this.RogueCoopItemPopup = this.Popup.extend({
		initialize: function (data) {
			this.room = data.room; this.owner = data.owner; this.member = data.member; this.action = data.action; this.value = data.value;
			var session = this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			this.sessionid = session.id; this.runid = session.adventure.id;
			this.requestid = 'supply-' + Date.now() + '-' + Math.random().toString(36).slice(2);
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === data.member; });
			var html = '<h3>' + (this.action === 'use' ? '使用成长补给' : '调整装备') + '</h3>';
			this.valid = !!mon;
			if (this.action === 'use') {
				var item = inventory && inventory.supplies.find(function (entry) { return entry.id === data.value; });
				var target = item && item.targets.find(function (entry) { return entry.member === data.member; });
				this.valid = !!target && !inventory.suppliesLocked;
				if (target) {
					html += '<p>' + escape(eventText(item.name)) + ' → ' + escape(localName(mon.species)) + '（持有 ' + item.count + '）</p>';
					if (item.kind === 'candy') html += '<label>使用数量 <input name="coopItemCount" type="number" min="1" max="' + item.count + '" value="1" /></label>';
					if (target.slots) {
						html += '<label>提升个体值 <select name="coopItemSlot">';
						target.slots.forEach(function (slot) { html += '<option value="' + slot + '">' + ['HP', '攻击', '防御', '特攻', '特防', '速度'][slot] + '</option>'; });
						html += '</select></label>';
					}
				}
			} else if (mon && (this.action === 'equip' || this.action === 'equipemblem')) {
				this.previous = this.action === 'equip' ? mon.item : mon.emblem;
				html += '<select name="coopEquipment"><option value=""' + (!this.previous ? ' selected' : '') + '>不装备</option>';
				(inventory.equipment || []).filter(function (item) { return mon.equipment.indexOf(item.id) >= 0 &&
					item.kind === (data.action === 'equip' ? 'held' : 'emblem'); }).forEach(function (item) {
					html += '<option value="' + escape(item.id) + '"' + (item.id === this.previous ? ' selected' : '') + '>' + escape(eventText(item.name)) + ' ×' + item.count + '</option>';
				}, this);
				if (this.previous && (mon.equipment.indexOf(this.previous) < 0 ||
					!(inventory.equipment || []).some(function (item) { return item.id === this.previous; }, this))) {
					html += '<option value="' + escape(this.previous) + '" selected>' + escape(localName(dex().items.get(this.previous).name || this.previous)) + '（当前装备）</option>';
				}
				html += '</select>';
				if (this.action === 'equipemblem') html += '<label>替换属性 <select name="coopItemSlot"><option value="0"' + (mon.emblemSlot === 0 ? ' selected' : '') + '>第一属性</option><option value="1"' + (mon.emblemSlot !== 0 ? ' selected' : '') + '>第二属性</option></select></label>';
			} else { this.valid = false; }
			stableHTML(this, html + '<p>' + button('confirmItem', '', '确认', !this.valid) + button('close', '', '取消') + '</p>');
		},
		confirmItem: function () {
			var session = this.room.coopState && this.room.coopState.session, inventory = this.room.coopInventory(this.owner);
			var mon = inventory && inventory.members.find(function (entry) { return entry.member === this.member; }, this);
			if (this.valid && session && session.id === this.sessionid && session.adventure.id === this.runid && mon) {
				if (this.action === 'use' && !inventory.suppliesLocked) {
					var item = inventory.supplies.find(function (entry) { return entry.id === this.value; }, this);
					if (item && item.targets.some(function (entry) { return entry.member === this.member; }, this)) {
						var target = item.targets.find(function (entry) { return entry.member === this.member; }, this);
						this.room.sendCoop('use', {owner: this.owner, member: this.member, value: this.value, id: this.requestid,
							count: item.kind === 'candy' ? Number(this.$('input[name=coopItemCount]').val()) : 1,
							slot: target.slots ? Number(this.$('select[name=coopItemSlot]').val()) : undefined});
					}
				} else if ((this.action === 'equip' || this.action === 'equipemblem') &&
					(this.action === 'equip' ? mon.item : mon.emblem) === this.previous) {
					this.room.sendCoop(this.action, {owner: this.owner, member: this.member,
						value: this.$('select[name=coopEquipment]').val(),
						slot: this.action === 'equipemblem' ? Number(this.$('select[name=coopItemSlot]').val()) : undefined});
				}
			}
			this.close();
		}
	});
	this.RogueCoopMovePopup = this.Popup.extend({
		initialize: function (data) {
			this.room = data.room; this.owner = data.owner; this.member = data.member;
			this.coverage = data.coverage; this.slot = data.slot;
			var session = this.room.coopState.session, training = this.room.coopMoveTraining(this.owner);
			this.sessionid = session.id; this.runid = session.adventure.id;
			var entry = training && training.members.find(function (mon) { return mon.member === data.member; });
			this.moves = entry ? entry.moves.join('|') : '';
			var options = entry ? (this.coverage ? entry.coverage : entry.memory) : [];
			var html = '<h3>' + (this.coverage ? '补盲研习' : '装备已学招式') + '</h3><p>' +
				(this.coverage ? '消耗该玩家 1 次研习，学会一个合法的非本系攻击招式。' :
				'选择第 ' + (this.slot + 1) + ' 个位置的招式；已装备的招式会交换位置，PP 不会恢复。') + '</p><select name="coopLearnMove">';
			(options || []).forEach(function (id) {
				var move = dex().moves.get(id);
				html += '<option value="' + escape(id) + '">' + escape(localName(move.name || id, 'move') + ' · ' +
					localName(move.type) + ' · ' + localName(move.category)) + '</option>';
			});
			stableHTML(this, html + '</select><p>' + button('confirmMove', '', this.coverage ? '确认学习' : '确认装备',
				!(options || []).length) + button('close', '', '取消') + '</p>');
		},
		confirmMove: function () {
			var session = this.room.coopState && this.room.coopState.session, training = this.room.coopMoveTraining(this.owner);
			var entry = training && training.members.find(function (mon) { return mon.member === this.member; }, this);
			var move = this.$('select[name=coopLearnMove]').val();
			if (session && session.id === this.sessionid && session.adventure.id === this.runid && entry &&
				(this.coverage ? training.remaining && entry.coverage.indexOf(move) >= 0 :
					entry.moves.join('|') === this.moves && entry.memory.indexOf(move) >= 0)) {
				this.room.sendCoop(this.coverage ? 'coverage' : 'setmove', {owner: this.owner, member: this.member,
					value: move, slot: this.coverage ? undefined : this.slot});
			}
			this.close();
		}
	});
	this.RogueBlessingLearnPopup = this.Popup.extend({
		initialize: function (data) {
			this.room = data.room; this.member = data.member; this.kind = data.kind;
			this.runid = this.room.state.run.id;
			var run = this.room.state.run;
			var entry = (this.kind === 'coverage' ? run.coverage.members : this.kind === 'sound' ? run.blessings.soundLearning : run.blessings.learning || []).find(function (e) { return e.member === data.member; });
			var html = '<h3>' + (this.kind === 'coverage' ? '补盲研习' : this.kind === 'sound' ? '全队开麦 · 声音招式' : '选择一个新招式') + '</h3><p>' + (this.kind === 'coverage' ? '消耗一份研习，自选合法的非本系攻击招式。' : '本祝福每只伙伴可领取一次，后来入队者也可领取。') + '</p><select name="learnMove">';
			(entry && entry.moves || []).forEach(function (id) { var move = dex().moves.get(id);
				html += '<option value="' + escape(id) + '">' + escape(localName(move.name, 'move') + ' · ' + localName(move.type) + ' · ' + localName(move.category)) + '</option>';
			});
			stableHTML(this, html + '</select><p>' + button('confirmLearn', '', '确认学习') + button('close', '', '稍后再学') + '</p>');
		},
		confirmLearn: function () {
			if (this.room.state.run && this.room.state.run.id === this.runid) this.room.submit(this.kind === 'coverage' ? 'coverage' : 'learnbonus', {member: this.member, slot: this.kind === 'sound' ? 1 : 0, value: this.$('select[name=learnMove]').val()});
			this.close();
		}
	});

    this.RogueEvolutionNoticePopup = this.Popup.extend({
        type: 'modal',
        initialize: function (data) {
            this.room = data.room; this.member = data.member;
            this.userid = app.user.get('userid'); this.runid = this.room.state.run.id; this.species = data.species;
            stableHTML(this, '<h3>伙伴的变化</h3><p>' + escape(localName(data.species)) + '的样子不太一样，似乎可以进化了。</p><div class="rogue-partner-actions">' + button('evolveNow', '', '立即进化') + button('later', '', '稍后再说') + '</div>');
        },
        current: function () {
            var run = this.room.state && this.room.state.run, self = this;
            return app.user.get('userid') === this.userid && run && run.id === this.runid &&
                !this.room.pending && evolutionEditable(run) && run.team.some(function (mon) {
                    return mon.id === self.member && mon.set.species === self.species && mon.hp > 0 && mon.evolutionNotice &&
                        (mon.evolutionDetails || []).some(function (evo) { return evo.ready && (!run.growthPaused || !evo.item); });
                });
        },
        evolveNow: function () { var current = this.current(); this.close(); if (current) this.room.evolveMember(this.member); },
        later: function () { if (this.current()) this.room.submit('evolutionnotice', {member: this.member}); this.close(); },
        remove: function () {
            var room = this.room;
            clearTimeout(room.evolutionPopupTimer);
            room.evolutionPopupTimer = setTimeout(function () { room.maybeShowEvolution(); }, 200);
            return globals.Popup.prototype.remove.apply(this, arguments);
        }
    });

	this.RogueLearnMovePopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.key = data.key;
			this.room.pendingMovePopup = this;
			this.$el.addClass('fantasyrogue rogue-learn-move-popup');
			this.render();
		},
		render: function () {
			var room = this.room;
			stableHTML(this, (room.error ? '<p class="error">' + escape(room.error) + '</p>' : '') +
				room.renderPendingMove(room.state.run, !!room.pending || !app.socket || app.socket.readyState !== 1));
		},
		learnMove: function (slot) {
			var run = this.room.state && this.room.state.run, pending = run && (run.pendingMoves || [])[0];
			if (!pending || this.key !== JSON.stringify([app.user.get('userid'), run.id, pending.member, pending.move])) return;
			this.room.learnMove(slot);
			// Keep the dialog until the server acknowledges; errors and retries remain actionable.
			this.render();
		},
		remove: function () {
			if (this.room.pendingMovePopup === this) this.room.pendingMovePopup = null;
			var room = this.room;
			clearTimeout(room.movePopupTimer);
			room.movePopupTimer = setTimeout(function () { room.revealPendingMove(); room.maybeShowEvolution(); }, 200);
			return globals.Popup.prototype.remove.apply(this, arguments);
		},
	});
	this.RogueCratePopup = this.Popup.extend({
		type: 'modal',
		// The first child is a heading, not a wrapper for the scrollable page.
		preserveScrollRange: false,
		events: {
			'change select[name=crateTarget]': 'changeTarget',
			'change select[name=cupResultDay]': 'changeCupResult',
			'pointerdown .rogue-crate-tape': 'startTear',
			'pointermove .rogue-crate-tape': 'moveTear',
			'pointerup .rogue-crate-tape': 'endTear',
			'pointercancel .rogue-crate-tape': 'cancelTear',
		},
		initialize: function (data) {
			this.room = data.room; this.room.cratePopup = this;
			this.revealedDays = {};
			var predicting = this.room.crateIntent && this.room.crateIntent.action === 'crateprediction';
			this.stage = this.room.crateIntent && !predicting ? 'waiting' : 'ready'; this.tab = predicting ? 'daily' : 'draw';
			var ledger = this.room.state.account.crates;
			this.batch = ledger && ledger.lastBatch; this.lastID = this.batch && this.batch.id;
			if (this.batch && !this.room.crateIntent) this.stage = 'results';
			this.$el.addClass('fantasyrogue rogue-crate-popup'); this.sync();
		},
		sync: function () {
			var ledger = this.room.crateLedger();
			if (this.target === undefined && ledger) this.target = ledger.target || 'none';
			var batch = ledger && ledger.lastBatch;
			if (batch && batch.id !== this.lastID) {
				this.lastID = batch.id; this.batch = batch; this.tab = 'draw';
				this.stage = this.stage === 'waiting' ? 'sealed' : 'results';
				if (globals.matchMedia && globals.matchMedia('(prefers-reduced-motion: reduce)').matches) this.stage = 'results';
			} else if (this.stage === 'waiting' && !this.room.crateIntent && !this.room.pending) this.stage = 'ready';
			var daily = this.room.crateData && this.room.crateData.daily;
			if (daily && this.cupDay !== daily.day) {
				this.cupDay = daily.day; this.picks = [];
				clearTimeout(this.dayTimer);
				var self = this;
				this.dayTimer = setTimeout(function () { self.room.loadCrates(); }, Math.max(1000, daily.refreshAt - Date.now() + 100));
			}
			this.render();
		},
		busy: function () {
			var data = this.room.crateData, account = this.room.state && this.room.state.account;
			return !!this.room.pending || !!this.room.crateIntent || !!this.room.crateLoadError || !app.socket || app.socket.readyState !== 1 ||
				!!(data && account && data.revision > account.revision) ||
				this.stage === 'sealed' || this.stage === 'reveal';
		},
		locked: function () {
			var state = this.room.state, run = state && state.run;
			return !state || state.continueOnly || !!(run && run.phase !== 'complete');
		},
		render: function () {
			var data = this.room.crateData, account = this.room.state && this.room.state.account;
			var html = '<header class="rogue-crate-heading"><div class="rogue-crate-brand"><span class="rogue-crate-emblem" aria-hidden="true">' + fa('archive') + '</span><div><small>局外成长 · 初始伙伴收藏</small><h2>宝可梦开箱</h2></div></div>' +
				button('close', '', '返回成长', false, fa('arrow-left')) + '</header>';
			if (!data || !data.enabled || !account) {
				var loadError = this.room.crateLoadError || data && data.message;
				stableHTML(this, html + '<div class="rogue-crate-loading' + (loadError ? ' failed' : '') + '"><span aria-hidden="true">' + fa(loadError ? 'exclamation-circle' : 'archive') + '</span><h3>' + (loadError ? '暂时无法打开箱子' : '正在准备伙伴收藏') + '</h3><p role="status">' + escape(loadError || '正在读取开箱资料……') + '</p>' + button('refreshCrates', '', '重新读取', !!this.room.crateQueryTimer, fa('refresh')) + '</div>'); return;
			}
			var ledger = this.room.crateLedger(), busy = this.busy(), locked = this.locked();
			var shinyPity = data.rules.shinyTargetPity;
			var points = data.revision > account.revision ? data.growthPoints : account.points, self = this;
			html += '<div class="rogue-crate-wallet"><span>成长点 <b>' + points + '</b></span><span>定向开箱点 <b>' + ledger.points + '</b></span>' +
				'<span>免费开箱 <b>' + (ledger.freeDraws || 0) + '</b></span><span>累计开箱 <b>' + ledger.total + '</b></span></div>';
			if (locked) html += '<p class="rogue-crate-notice">' + fa('lock') + ' 结束本局后开放开箱与兑换。每日竞猜和已公布的录像仍可查看。</p>';
			if (this.error || this.room.error) html += '<p class="error" role="alert">' + escape(this.error || this.room.error) + '</p>';
			if (this.room.crateLoadError) html += '<p class="rogue-crate-notice" role="alert">' + escape(this.room.crateLoadError) + ' ' + button('refreshCrates', '', '重新读取') + '</p>';
			html += '<nav class="rogue-crate-tabs" aria-label="开箱内容">';
			[['draw', '伙伴开箱', 'archive'], ['weekly', '每周定向兑换', 'calendar'], ['daily', '每日对战竞猜', 'trophy'], ['results', '竞猜结果', 'play-circle']].forEach(function (tab) {
				html += '<button class="button' + (self.tab === tab[0] ? ' selected' : '') + '" name="crateTab" value="' + tab[0] + '"' +
					(busy ? ' disabled' : '') + '>' + fa(tab[2]) + ' ' + tab[1] + '</button>';
			});
			html += '</nav>';
			if (this.room.crateIntent && this.room.crateIntent.action === 'crateprediction') {
				html += '<p role="status">正在确认本次预测……</p>' + (this.room.error ? button('retryCrate', '', '重新确认本次预测', !app.socket || app.socket.readyState !== 1) : '');
			}
			if (this.tab === 'weekly') {
				html += '<h3>本周伙伴 · 每只 ' + data.rules.exchangeCost + ' 定向开箱点</h3><p class="rogue-caption">下次更新：' +
					escape(new Date(data.weekly.refreshAt).toLocaleString('zh-CN')) + '。兑换不影响开箱保底。</p><div class="rogue-crate-weekly">';
				data.weekly.featured.forEach(function (id) {
					var mon = data.weekly.catalog.find(function (entry) { return entry.id === id; });
					if (!mon) return;
					html += '<article>' + self.sprite(mon) + '<strong>' + escape(localName(mon.species)) + '</strong><small>' +
						(mon.owned ? '已解锁 · 可补充性格与特性' : '兑换后永久解锁') + '</small>' +
						button('exchangeCrate', data.weekly.key + ':' + id, '兑换 · 100 点', busy || locked || ledger.points < 100) + '</article>';
				});
				html += '</div><p>每周轮换两位伙伴，全部轮换一遍前不会重复。<br><small>彩色：已拥有　灰色：已轮换　剪影：尚未轮换　金色底光：本周可兑换</small></p><div class="rogue-crate-catalog">';
				data.weekly.catalog.forEach(function (mon) {
					var current = data.weekly.featured.indexOf(mon.id) >= 0;
					html += '<span class="rogue-crate-catalog-entry ' + (mon.owned ? 'owned' : mon.seen ? 'seen' : 'unseen') + (current ? ' current' : '') +
						'" title="' + escape(localName(mon.species)) + '"><span class="picon" style="' + Dex.getPokemonIcon(mon.species) + '"></span><small>' + escape(localName(mon.species)) + '</small></span>';
				});
				html += '</div>';
			} else if (this.tab === 'daily' || this.tab === 'results') {
				html += this.dailyPanel(data.daily, busy, !!this.room.state.continueOnly);
			} else {
				html += '<label class="rogue-crate-target">本次定向 <select name="crateTarget"' + (busy ? ' disabled' : '') + '>';
				var option = function (value, label) { return '<option value="' + escape(value) + '"' + (value === self.target ? ' selected' : '') + '>' + escape(label) + '</option>'; };
				html += option('none', '不限定') + (shinyPity ? option('shiny', '闪光定向（' + shinyPity + '抽保底）') : '') + '<optgroup label="世代定向">';
				data.generations.forEach(function (gen) { html += option('gen:' + gen, '第 ' + gen + ' 世代'); });
				html += '</optgroup><optgroup label="属性定向">';
				data.types.forEach(function (type) { html += option('type:' + type, localName(type) + '属性'); });
				html += '</optgroup></select></label><div class="rogue-crate-pity">' + (shinyPity && this.target === 'shiny' ?
					'<span>闪光保底还需 <b>' + Math.max(1, shinyPity - (ledger.shinyTargetMisses || 0)) + '</b> 抽</span>' :
					'<span>下次定向 <b>' + (10 - ledger.total % 10) + '</b> 抽</span><span>定向传说还需 <b>' + Math.max(1, 180 - ledger.targetedMisses) + '</b> 抽</span>') +
					'<span>传说保底还需 <b>' + Math.max(1, 90 - ledger.legendaryMisses) + '</b> 抽</span></div>';
				if (this.stage === 'sealed' || this.stage === 'reveal') {
					var legend = this.batch.results.some(function (entry) { return entry.legendary; });
					var shiny = this.batch.results.some(function (entry) { return entry.shiny; });
					var rainbow = this.batch.results.some(function (entry) { return entry.legendary && entry.shiny; });
					html += '<div class="rogue-crate-stage ' + this.stage + (legend ? ' legendary' : '') + (shiny ? ' shiny' : '') + (rainbow ? ' rainbow' : '') + '">' +
						'<div class="rogue-crate-horizon" aria-hidden="true"></div><div class="rogue-crate-light" aria-hidden="true"></div>' +
						'<div class="rogue-crate-beam" aria-hidden="true"></div><div class="rogue-crate-flash" aria-hidden="true"></div>' +
						'<div class="rogue-crate-particles" aria-hidden="true">✦<i>✧</i><b>✦</b><em>✧</em><span>✦</span><small>✧</small></div>' +
						'<div class="rogue-pixel-crate"><div class="rogue-crate-seam" aria-hidden="true"></div><div class="rogue-crate-lid"></div><span class="rogue-crate-mark">✦</span>' +
						'<button class="rogue-crate-tape" name="tearCrate" aria-label="撕开胶带"' + (this.stage === 'reveal' ? ' disabled' : '') + '><span>撕开胶带 →</span></button></div>' +
						'<p role="status">' + (this.stage === 'sealed' ? '拖动胶带，揭晓箱中的光芒' : '新的伙伴，正在向你走来……') + '</p>' +
						(this.stage === 'sealed' ? '<small class="rogue-crate-gesture-hint">也可直接点击胶带开启</small>' : '') + '</div>' + button('skipCrate', '', '跳过动画，查看结果');
				} else if (this.stage === 'waiting') {
					html += '<div class="rogue-crate-waiting" role="status">正在确认本次开箱……</div>';
					if (this.room.error) html += button('retryCrate', '', '重新确认本次开箱', !app.socket || app.socket.readyState !== 1);
				} else {
					if (this.stage === 'results' && this.batch) html += this.results();
					else html += '<div class="rogue-crate-idle"><div class="rogue-pixel-crate"><div class="rogue-crate-lid"></div><span class="rogue-crate-mark">✦</span></div><p>下一位伙伴，会是谁呢？</p></div>';
					var free = ledger.freeDraws || 0, singleCost = Math.max(0, 1 - free) * 10, tenCost = Math.max(0, 10 - free) * 10;
					html += '<div class="rogue-crate-draw-actions">' + button('drawCrates', '1', '单次开箱 · ' + (singleCost ? singleCost + ' 点' : '免费'), busy || locked || points < singleCost, fa('archive')) +
						button('drawCrates', '10', '十连开箱 · ' + (tenCost ? tenCost + ' 点' : '免费'), busy || locked || points < tenCost, fa('cubes')) + '</div>';
					if (free) html += '<p class="rogue-caption">优先使用免费次数；十连不足的部分每次消耗 10 成长点。</p>';
				}
			}
			html += '<details class="rogue-crate-rules"><summary>开箱规则与概率</summary><ul>' +
				'<li>仅产出初始形态，基础个体值均为 15，性格与特性随机，永久解锁初始资格。重复开箱使该伙伴的六项个体值各提高 1，单项最高 31，保留已有的更高资质。</li>' +
				'<li>抽取前六项个体值均已达到 31 时，重复开箱返还 2 成长点。每周兑换补充性格、特性与闪光收藏，不触发重复开箱增幅或返还。</li>' +
				'<li>传说基础概率 ' + (data.rules.legendaryPerMillion / 10000) + '%，包含一级神、二级神、悖论、究极异兽与幻兽。闪光概率 ' + (data.shinyPerMillion / 10000) + '%，采用爬塔基础概率并计入崩坏回响，不受本局塔灵等临时效果影响。</li>' +
				'<li>每累计 10 抽保证当前世代／属性定向。连续 90 抽内必得传说；连续 180 抽内必得当前世代／属性定向传说。提前获得任意传说重置 90 抽计数，符合当前世代／属性定向时再重置其 180 抽计数。</li>' +
				'<li>' + (shinyPity ? '世代、属性与闪光定向' : '世代与属性') + '只可选一项。切换不清空计数；未选世代／属性定向时，其定向传说进度保留，重新选择后生效。物种保底不提高资质。</li>' +
				(shinyPity ? '<li>选择闪光定向后，连续 ' + shinyPity + ' 抽内必得闪光；仅在该定向下累计，提前出闪光则重置。切换定向保留进度，自然闪光概率和 90 抽传说保底均不变；不额外触发世代／属性的 10 抽或 180 抽保底。</li>' : '') +
				'<li>每抽获得 1 定向开箱点，100 点兑换本周传说。每周一北京时间 00:00 更新。开箱不会减少初始队伍的栏位消耗。</li>' +
				'<li>每日竞猜于北京时间 00:00 更新。三场全部猜对，获得 1 次免费开箱；次日自动结算，未上线的奖励会在下次进入时补发。免费次数永久保留，享有相同的保底与重复开箱规则。</li></ul></details>';
			stableHTML(this, html);
		},
		sprite: function (mon) {
			var sprite = Dex.getSpriteData(mon.species, true, {gen: 5, shiny: !!mon.shiny, gender: mon.gender, noScale: true});
			return '<div class="rogue-crate-portrait' + (mon.shiny ? ' is-shiny' : '') + '"><img src="' + escape(sprite.url) + '" alt="' + escape(localName(mon.species)) + '" />' +
				(mon.shiny ? '<span class="rogue-crate-stars" aria-label="闪光">' + Dex.getShinySparkles() + '</span>' : '') + '</div>';
		},
		results: function () {
			var self = this;
			return '<h3 class="rogue-crate-result-title">伙伴已录入初始名册</h3><div class="rogue-crate-results' + (this.batch.results.length === 1 ? ' single' : '') + (this.skipAnimation ? ' skip-animation' : '') + '">' +
				this.batch.results.map(function (mon, index) {
					var ivs = mon.ivs || [15, 15, 15, 15, 15, 15];
					var ivText = ivs.every(function (iv) { return iv === ivs[0]; }) ? '六项个体值 ' + ivs[0] : '个体值 ' + ivs.join(' / ');
					var guarantees = [];
					if (mon.guarantee) guarantees.push({target: '定向保底', legendary: '传说保底', targetedLegendary: '定向传说保底'}[mon.guarantee]);
					if (mon.shinyGuaranteed) guarantees.push('闪光保底');
					return '<article class="rogue-crate-result' + (mon.legendary ? ' legendary' : '') + (mon.shiny ? ' shiny' : '') + '" style="--reveal-delay:' + (self.skipAnimation ? 0 : index * 80) + 'ms">' +
						'<small class="rogue-crate-result-badge">' + (mon.legendary ? '传说伙伴' : '初始伙伴') + (mon.shiny ? ' · 闪光' : '') + '</small>' + self.sprite(mon) +
						'<strong>' + escape(localName(mon.species)) + '</strong><span class="rogue-crate-unlock">' + (mon.newUnlock ? '新伙伴 · 永久解锁' : mon.refund ? '资质已满 · 返还 ' + mon.refund + ' 成长点' : mon.ivImproved ? '重复伙伴 · 个体值提升' : '已拥有 · 收藏已补充') +
						'</span><small>' + escape(localName(mon.nature)) + ' · ' + escape(localName(mon.ability)) + '</small><small>' + escape(ivText) + '</small>' +
						(guarantees.length ? '<small class="rogue-crate-guarantee">' + guarantees.join(' · ') + '</small>' : '') + '</article>';
				}).join('') + '</div>';
		},
		dailyPanel: function (daily, busy, readOnly) {
			if (!daily) return '<p>正在读取赛事……</p>' + button('refreshCrates', '', '刷新赛事', busy);
			if (this.tab === 'results') {
				var results = daily.results || [], result = results.find(function (entry) { return entry.day === this.resultDay; }, this) || results[0];
				if (!result) return '<div class="rogue-cup-empty">' + fa('moon-o') + '<h3>下一天，揭晓答案</h3><p>今天先选出你看好的队伍，明天在这里观看三场对局。</p></div>';
				var html = '<label class="rogue-crate-target">赛事日期 <select name="cupResultDay">' + results.map(function (entry) {
					return '<option value="' + escape(entry.day) + '"' + (entry.day === result.day ? ' selected' : '') + '>' + escape(entry.day) + '</option>';
				}).join('') + '</select></label>';
				if (!this.revealedDays[result.day]) {
					return html + '<div class="rogue-cup-empty">' + fa('play-circle') + '<h3>先看对局，再揭晓答案</h3>' +
						'<p>依次观看 A 队与 B 队、C 队与 D 队的对战，以及最终决赛。可随时跳过。</p>' +
						button('watchDailyCup', result.day, '开始观看三场对局', busy, fa('play')) + '</div>';
				}
				var prediction = result.prediction;
				html += '<div class="rogue-cup-outcome"><strong>' + (prediction ? prediction.reward ? '三场全中！免费开箱 +1' : '本轮未全中，下次再来！' : '本轮未参与竞猜') + '</strong><span>' +
					(prediction && prediction.reward ? '奖励已存入免费次数，无需再次领取。' : '可依次回看半决赛与决赛。') + '</span></div><div class="rogue-cup-results">';
				['A 队 vs B 队', 'C 队 vs D 队', '决赛'].forEach(function (label, i) {
					html += '<article><small>' + label + '</small><strong>' + 'ABCD'[result.winners[i]] + ' 队获胜</strong><span>' +
						(prediction ? '你的预测：' + 'ABCD'[prediction.picks[i]] + ' 队 · ' + (prediction.picks[i] === result.winners[i] ? '正确' : '未中') : '未预测') + '</span></article>';
				});
				html += '</div>' + button('watchDailyCup', result.day, '观看三场对局', busy, fa('play-circle')) + this.cupTeams(result.teams);
				return html;
			}
			if (!daily.teams.length) return '<p>新一轮赛事正在筹备，请稍后查看。</p>';
			var submitted = daily.prediction, picks = submitted ? submitted.picks : this.picks || [];
			var out = '<div class="rogue-cup-intro"><h3>' + escape(daily.day) + ' · 今日四强</h3><p>每队 3 位伙伴，均为 Lv.50。预测两场胜者，再选出冠军；<b>三场全中，免费开箱一次。</b></p><small>全服同一阵容与赛果。提交后不可更改，次日公布录像与结果。</small></div>' + this.cupTeams(daily.teams);
			out += '<div class="rogue-cup-picks">';
			[[0, 1], [2, 3], picks.length >= 2 && picks[0] !== undefined && picks[1] !== undefined ? [picks[0], picks[1]] : []].forEach(function (choices, index) {
				out += '<section><strong>' + ['第一场 · A vs B', '第二场 · C vs D', '决赛冠军'][index] + '</strong><div>';
				choices.forEach(function (team) {
					out += '<button class="button' + (picks[index] === team ? ' selected' : '') + '" name="pickCup" value="' + index + ':' + team + '"' +
						(busy || submitted || readOnly ? ' disabled' : '') + '> ' + 'ABCD'[team] + ' 队' + (picks[index] === team ? ' ✓' : '') + '</button>';
				});
				if (!choices.length) out += '<small>先选出两场胜者</small>';
				out += '</div></section>';
			});
			out += '</div>' + (submitted ? '<p class="rogue-cup-submitted">' + fa('check-circle') + ' 今日预测已提交 · 明日揭晓</p>' : button('submitCup', '', '确认预测', busy || readOnly || picks[2] === undefined, fa('check')));
			return out;
		},
		cupTeams: function (teams) {
			var self = this;
			return '<div class="rogue-cup-teams">' + teams.map(function (team, index) {
				return '<article><h4>' + 'ABCD'[index] + ' 队 <small>Lv.50</small></h4><div>' + team.map(function (species) {
					return '<span>' + self.sprite({species: species}) + '<strong>' + escape(localName(species)) + '</strong></span>';
				}).join('') + '</div></article>';
			}).join('') + '</div>';
		},
		pickCup: function (value) {
			var daily = this.room.crateData && this.room.crateData.daily;
			if (this.busy() || !daily || daily.prediction || this.room.state.continueOnly) return;
			var pair = value.split(':').map(Number), round = pair[0], team = pair[1];
			if (pair.length !== 2 || !Number.isInteger(round) || !Number.isInteger(team)) return;
			var picks = this.picks || (this.picks = []);
			if (round === 0 && team !== 0 && team !== 1 || round === 1 && team !== 2 && team !== 3 ||
				round === 2 && (team !== picks[0] && team !== picks[1]) || round < 0 || round > 2) return;
			picks[round] = team;
			if (picks[2] !== picks[0] && picks[2] !== picks[1]) picks[2] = undefined;
			this.render();
		},
		submitCup: function () {
			var daily = this.room.crateData && this.room.crateData.daily, picks = this.picks || [];
			if (!daily || daily.prediction || picks[0] === undefined || picks[1] === undefined || picks[2] === undefined) return;
			this.requestCrate('crateprediction', {value: daily.day + ':' + picks.map(function (pick) { return 'ABCD'[pick]; }).join(':')});
		},
		changeCupResult: function (e) {
			this.resultDay = e.currentTarget.value; this.$el.scrollTop(0); this.render(); this.openUnseenCup();
		},
		openUnseenCup: function () {
			var daily = this.room.crateData && this.room.crateData.daily, results = daily && daily.results || [];
			var result = results.find(function (entry) { return entry.day === this.resultDay; }, this) || results[0];
			if (result && !this.revealedDays[result.day]) this.watchDailyCup(result.day);
		},
		watchDailyCup: function (day) {
			var daily = this.room.crateData && this.room.crateData.daily;
			if (!daily || !(daily.results || []).some(function (entry) { return entry.day === day; }) || this.room.dailyReplayPopup) return;
			var self = this, userid = app.user.get('userid');
			app.addPopup(globals.RogueDailyReplayPopup, {room: this.room, day: day, sourcePopup: this, onComplete: function () {
				if (self.room.cratePopup !== self || app.user.get('userid') !== userid) return;
				self.revealedDays[day] = true; self.resultDay = day; self.tab = 'results';
				self.$el.scrollTop(0); self.render();
			}});
		},
		changeTarget: function (e) {
			if (this.busy()) return;
			this.target = e.currentTarget.value; this.render();
		},
		crateTab: function (tab) {
			if (this.busy()) return;
			this.tab = tab; this.$el.scrollTop(0); this.render();
			if (tab === 'results') this.openUnseenCup();
		},
		refreshCrates: function () { this.room.loadCrates(); },
		requestCrate: function (action, details) {
			if (this.busy() || !this.room.crateData || !this.room.crateData.enabled ||
				(action === 'crateprediction' ? this.room.state.continueOnly : this.locked())) return;
			this.error = ''; this.skipAnimation = false;
			if (action !== 'crateprediction') this.stage = 'waiting';
			this.room.submit(action, details);
			if (this.room.pending) this.room.crateIntent = Object.assign({}, this.room.pending);
			else this.stage = 'ready';
			this.render();
		},
		drawCrates: function (count) { this.requestCrate('opencrate', {count: Number(count), value: this.target || 'none'}); },
		exchangeCrate: function (value) { this.requestCrate('exchangecrate', {value: value}); },
		retryCrate: function () {
			if (!this.room.crateIntent || !app.socket || app.socket.readyState !== 1) return;
			if (this.room.pending && this.room.pending.id !== this.room.crateIntent.id) return;
			this.room.pending = Object.assign({}, this.room.crateIntent); this.room.error = ''; this.error = '';
			this.room.sendPending(); this.render();
		},
		startTear: function (e) {
			var event = e.originalEvent || e;
			if (this.stage !== 'sealed' || event.isPrimary === false || event.button > 0) return;
			this.tearX = event.clientX; this.tearY = event.clientY; this.tearDistance = 0;
			this.tearStage = e.currentTarget.closest('.rogue-crate-stage');
			if (e.currentTarget.setPointerCapture && event.pointerId !== undefined) e.currentTarget.setPointerCapture(event.pointerId);
		},
		moveTear: function (e) {
			var event = e.originalEvent || e;
			if (this.stage !== 'sealed' || this.tearX === undefined || event.isPrimary === false) return;
			this.tearDistance = Math.max(Math.abs(event.clientX - this.tearX), Math.abs(event.clientY - this.tearY));
			if (this.tearStage) this.tearStage.style.setProperty('--tear-progress', Math.min(1, this.tearDistance / 96));
			if (this.tearDistance >= 96) this.tearCrate(true);
		},
		endTear: function () {
			// A short, unfinished drag should not become a click and open the box.
			if (this.tearDistance > 8) this.ignoreTearClickUntil = Date.now() + 400;
			if (this.tearStage) this.tearStage.style.removeProperty('--tear-progress');
			this.tearX = undefined; this.tearY = undefined; this.tearStage = null; this.tearDistance = 0;
		},
		cancelTear: function () { this.endTear(); },
		tearCrate: function (fromDrag) {
			if (this.stage !== 'sealed' || (fromDrag !== true && Date.now() < this.ignoreTearClickUntil)) return;
			this.endTear(); this.stage = 'reveal'; this.render();
			var self = this; this.animationTimer = setTimeout(function () { self.stage = 'results'; self.render(); }, 2250);
		},
		skipCrate: function () {
			if (!this.batch) return;
			clearTimeout(this.animationTimer); this.endTear(); this.skipAnimation = true; this.stage = 'results'; this.render();
		},
		remove: function () {
			clearTimeout(this.animationTimer); clearTimeout(this.dayTimer); this.endTear();
			if (this.room.cratePopup === this) this.room.cratePopup = null;
			return globals.Popup.prototype.remove.apply(this, arguments);
		},
	});
	this.RogueRetryHealingPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.key = data.key;
			this.room.retryHealingPopup = this;
			this.$el.addClass('fantasyrogue rogue-retry-popup'); this.render();
		},
		current: function () {
			var run = this.room.state && this.room.state.run;
			return run && this.key === JSON.stringify([app.user.get('userid'), run.id]) && run.retryHealing;
		},
		render: function () {
			var data = this.current();
			if (!data) return;
			if (this.quoteKey !== data.key) { this.quoteKey = data.key; this.member = data.member || ''; }
			var busy = !!this.room.pending || !app.socket || app.socket.readyState !== 1;
			var healing = data.purpose === 'heal';
			var choosing = !healing && data.insufficientHP && data.items.length > 0;
			var selected = choosing && data.members.find(function (mon) { return mon.id === this.member; }, this);
			var quote = selected || data;
			var html = '<h2>' + fa('medkit') + (healing ? ' 一键治疗' : ' 再战') + ' · 治疗确认</h2><p>' + (healing ? '使用背包中的药品治疗这位伙伴。' : '使用背包中的药品恢复伙伴，再重新挑战本场对手。') + '确认前不会消耗道具。</p>';
			if (healing && data.insufficientHP) html += '<p class="rogue-retry-warning">药品不足以完全恢复，将使用现有药品治疗可恢复的部分。</p>';
			if (this.room.error) html += '<p class="error" role="alert">' + escape(this.room.error) + '</p>';
			if (choosing) {
				html += '<p class="rogue-retry-warning" role="status">药品不足以将全队恢复至满血，请选择优先治疗的伙伴。可用药品用尽后，将直接再战。</p><div class="rogue-retry-team">';
				data.members.forEach(function (mon) {
					html += '<button class="button' + (selected && selected.id === mon.id ? ' selected' : '') + '" name="choosePatient" value="' + escape(mon.id) + '"' +
						(busy || mon.disabled ? ' disabled' : '') + '><span class="picon" style="' + Dex.getPokemonIcon(mon.species) + '"></span><strong>' +
						escape(localName(mon.species)) + '</strong><small>' + (mon.dead ? '本局已永久死亡' : 'HP ' + Number(mon.hp) + '/' + Number(mon.maxhp) +
						(mon.statuses.length ? ' · ' + mon.statuses.map(function (status) { return escape(localName(status)); }).join('、') : mon.disabled ? ' · 无需治疗' : '')) + '</small></button>';
				});
				html += '</div>';
			}
			if (!choosing || selected) {
				html += '<h3>' + (selected ? escape(localName(selected.species)) + ' · ' : '') + '本次将消耗</h3><ul class="rogue-retry-items">' +
					(quote.items.length ? quote.items.map(function (item) { return '<li>' + escape(item.name) + ' <b>×' + Number(item.count) + '</b></li>'; }).join('') :
					'<li>无可用药品，不消耗道具。</li>') + '</ul>';
			}
			if (quote.missingCures.length) html += '<p class="rogue-retry-warning" role="alert">缺少对应治疗药物：' +
				quote.missingCures.map(function (mon) { return escape(localName(mon.species)) + '（' + mon.statuses.map(function (status) { return escape(localName(status)); }).join('、') + '）'; }).join('；') +
				'。这些异常将保留，其余可治疗部分仍会正常恢复。</p>';
			html += '<p class="rogue-caption">不恢复 PP。Nuzlocke 中永久死亡的伙伴不能治疗或复活。</p><div class="rogue-retry-actions">' +
				button('confirmHealing', '', healing ? '确认治疗' : choosing ? '确认治疗所选伙伴' : quote.items.length ? '确认消耗并再战' : '不消耗道具，继续再战',
					busy || healing && !quote.items.length || choosing && (!selected || !selected.items.length), fa('medkit')) + button('cancelHealing', '', healing ? '取消治疗' : '取消再战，留在战斗外', busy) + '</div>';
			stableHTML(this, html);
		},
		choosePatient: function (id) {
			var data = this.current();
			if (!data || this.room.pending || !data.members.some(function (mon) { return mon.id === id && !mon.disabled; })) return;
			this.member = id; this.render();
		},
		confirmHealing: function () {
			var data = this.current();
			if (!data) return;
			if (data.purpose !== 'heal' && data.insufficientHP && data.items.length && !data.members.some(function (mon) {
				return mon.id === this.member && !mon.disabled && mon.items.length;
			}, this)) return;
			this.room.submit('retryheal', {value: data.key, member: this.member || undefined}); this.render();
		},
		cancelHealing: function () {
			var data = this.current();
			if (data) this.room.submit('retrycancel', {value: data.key});
		},
		remove: function () {
			if (this.room.retryHealingPopup === this) this.room.retryHealingPopup = null;
			var room = this.room;
			clearTimeout(room.retryPopupTimer);
			room.retryPopupTimer = setTimeout(function () { room.revealRetryHealing(); }, 200);
			return globals.Popup.prototype.remove.apply(this, arguments);
		},
	});
	this.RogueEvolutionPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.member = data.member; this.target = data.target;
			this.userid = app.user.get('userid');
			var run = this.room.state.run;
			this.runid = run.id;
			var mon = run.team.find(function (entry) { return entry.id === data.member; });
			this.species = mon && mon.set.species;
			var options = mon ? (mon.evolutionDetails || []).filter(function (evo) { return evo.ready && (!run.growthPaused || !evo.item); }) : [];
			if (!this.target && options.length === 1) this.target = idOf(options[0].species);
			var target = this.target;
			var option = options.find(function (evo) { return idOf(evo.species) === target; });
			this.$el.addClass('rogue-evolution-popup');
			var html = '<h3>' + (target ? '确认进化' : '选择进化方向') + '</h3>';
			if (option) {
				html += '<p><strong>' + escape(localName(mon.set.species)) + ' → ' + escape(localName(option.species)) + '</strong></p>' +
					'<p>进化后无法退回原形态。性格、资质及成长记录保留，不会补满 HP 或 PP。</p>';
				option.requirements.filter(function (condition) { return condition.resource || /消耗/.test(condition.text); }).forEach(function (condition) {
					html += '<p class="rogue-evolution-cost">消耗 1 个 ' + escape(localName(condition.name || option.item)) + '</p>';
				});
				html += button('confirmEvolution', '', '确认进化');
			} else if (!target && options.length) {
				html += '<p>请选择一个方向，随后会再次确认。</p>';
				options.forEach(function (evo) {
					html += '<p>' + button('chooseEvolution', idOf(evo.species), '进化为 ' + localName(evo.species)) + '</p>';
				});
			} else html += '<p>当前进化条件已改变，请返回队伍重新查看。</p>';
			stableHTML(this, html + button('cancelEvolution', '', '稍后再说'));
		},
		cancelEvolution: function () {
			var run = this.room.state && this.room.state.run, self = this;
			var mon = run && run.team.find(function (entry) { return entry.id === self.member; });
			if (app.user.get('userid') === this.userid && run && run.id === this.runid && mon &&
				mon.set.species === this.species && mon.evolutionNotice && !this.room.pending && evolutionEditable(run)) {
				this.room.submit('evolutionnotice', {member: this.member});
			}
			this.close();
		},
		chooseEvolution: function (target) {
			this.close(); this.room.evolveMember(this.member + '|' + target);
		},
		confirmEvolution: function () {
			var run = this.room.state && this.room.state.run, self = this;
			var mon = run && run.team.find(function (entry) { return entry.id === self.member; });
			if (app.user.get('userid') === this.userid && run && run.id === this.runid && evolutionEditable(run) &&
				!this.room.pending && mon && mon.set.species === this.species &&
				(mon.evolutionDetails || []).some(function (evo) { return evo.ready && (!run.growthPaused || !evo.item) && idOf(evo.species) === self.target; })) {
				this.room.submit('evolve', {member: this.member, value: this.target});
			}
			this.close();
		}
	});
	this.RogueExchangeAnimationPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			var exchange = data.exchange, self = this;
			this.$el.addClass('rogue-exchange-animation');
			stableHTML(this, '<h3>旅行的回忆</h3><div class="rogue-exchange-stage" aria-hidden="true">' +
				'<div class="rogue-exchange-before" style="' + Dex.getTeambuilderSprite({species: exchange.before}) + '"></div>' +
				'<span class="rogue-exchange-ball left"></span><span class="rogue-exchange-ball right"></span>' +
				'<div class="rogue-exchange-after" style="' + Dex.getTeambuilderSprite({species: exchange.after}) + '"></div></div>' +
				'<p>两颗精灵球交错而过。一眨眼，你又站在了旅游摊前。</p><p>' + escape(localName(exchange.before)) + ' → ' + escape(localName(exchange.after)) +
				'；还是原来那位伙伴。</p>' + button('close', '', '跳过动画，回到摊位'));
			var complete = function () { self.$el.addClass('complete'); self.$('button[name=close]').text('回到摊位'); };
			if (globals.matchMedia && globals.matchMedia('(prefers-reduced-motion: reduce)').matches) complete();
			else this.animationTimer = setTimeout(complete, 2400);
		},
		remove: function () { clearTimeout(this.animationTimer); return globals.Popup.prototype.remove.apply(this, arguments); },
	});
	this.RogueEvolutionAnimationPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.member = data.member;
			this.coop = data.coop;
			this.runid = this.coop ? this.coop.adventure : this.room.state.run.id; this.userid = app.user.get('userid');
			this.afterName = localName(data.after.species);
			this.$el.addClass('rogue-evolution-animation');
			var sprite = function (set, stage) {
				return '<div class="rogue-evolution-sprite ' + stage + '" role="img" aria-label="' + escape(localName(set.species)) +
					'" style="' + Dex.getTeambuilderSprite(set) + '"></div>';
			};
			var particles = '';
			for (var i = 0; i < 8; i++) particles += '<i style="--angle:' + (i * 45) + 'deg;--delay:' + (i * 65) + 'ms"></i>';
			stableHTML(this, '<h3>伙伴进化</h3><div class="rogue-evolution-stage" aria-hidden="true"><div class="rogue-evolution-glow"></div>' +
				'<div class="rogue-evolution-sparks">' + particles + '</div>' + sprite(data.before, 'before') + sprite(data.after, 'after') +
				'</div><p class="rogue-evolution-result" role="status">' + escape(localName(data.before.species)) + '正在进化……</p>' +
				'<div class="rogue-evolution-actions">' + button('close', '', '跳过动画') + '</div>');
			var self = this;
			if (globals.matchMedia && globals.matchMedia('(prefers-reduced-motion: reduce)').matches) this.finishAnimation();
			else this.animationTimer = setTimeout(function () { self.finishAnimation(); }, 3200);
		},
		finishAnimation: function () {
			clearTimeout(this.animationTimer);
			this.$el.addClass('complete');
			this.$('.rogue-evolution-result').text('进化完成！成为了' + this.afterName + '。');
			if (this.coop) { this.$('.rogue-evolution-actions').html(button('close', '', '返回联机队伍')); return; }
			var run = this.room.state && this.room.state.run, self = this;
			var mon = run && run.team.find(function (entry) { return entry.id === self.member; });
			var again = run && run.id === this.runid && evolutionEditable(run) && mon &&
				(mon.evolutionDetails || []).some(function (evo) { return evo.ready && (!run.growthPaused || !evo.item); });
			this.$('.rogue-evolution-actions').html(button('close', '', '返回队伍') + (again ? button('continueEvolution', '', '继续进化') : ''));
		},
		continueEvolution: function () {
			var run = this.room.state && this.room.state.run;
			this.close();
			if (app.user.get('userid') === this.userid && run && run.id === this.runid) this.room.showEvolutionChoices(this.member);
		},
		remove: function () {
			clearTimeout(this.animationTimer);
			if (this.coop) return globals.Popup.prototype.remove.apply(this, arguments);
			var room = this.room;
			clearTimeout(room.movePopupTimer);
			room.movePopupTimer = setTimeout(function () { room.revealPendingMove(); room.maybeShowEvolution(); }, 200);
			return globals.Popup.prototype.remove.apply(this, arguments);
		}
	});
	this.RogueCharmPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room;
			var run = this.room.state.run;
			this.runid = run.id; this.userid = app.user.get('userid');
			this.$el.addClass('rogue-spirit-popup rogue-charm-popup');
			var received = this.room.state.story && this.room.state.story.stage === 'charmeffect';
			stableHTML(this, '<div class="rogue-charm-art">' + charmIcon() + '</div><span class="rogue-caption">' +
				(received ? '获得替身护符' : '本局护符') + '</span><h3>护符庇佑</h3>' + charmDescription(run.charm.description) +
				(run.difficultyScales ? '<div class="rogue-charm-scales"><span>当前第 ' + run.floor + ' 层</span><strong>我方 ' +
					(run.difficultyScales.player * 100).toFixed(1) + '% · 对手 ' + (run.difficultyScales.opponent * 100).toFixed(1) + '%</strong></div>' : '') +
				button('acceptCharm', '', received ? '收好护符 · 继续前行' : '收起', !!this.room.pending));
		},
		acceptCharm: function () {
			var state = this.room.state, run = state && state.run;
			if (app.user.get('userid') === this.userid && run && run.id === this.runid && state.story && state.story.stage === 'charmeffect') this.room.submit('charmack');
			this.close();
		}
	});
	this.RogueSpiritPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room;
			var run = this.room.state.run, spirit = run.spirit;
			this.runid = run.id;
			this.$el.addClass('rogue-spirit-popup');
			var needsParty = run.pendingCapture || run.team.length > run.partyLimit;
			stableHTML(this, '<div class="rogue-spirit-art" role="img" aria-label="' + escape(localName(spirit.species)) + '" style="' +
				Dex.getTeambuilderSprite({species: spirit.species}) + '"></div><span class="rogue-caption">本局塔灵</span><h3>' +
				escape(spirit.name) + '</h3><p>' + escape(spirit.text) + '</p>' +
				lakeQuestHTML(run.blessings && run.blessings.lakeQuest) +
				button('acceptSpirit', '', run.phase === 'intro' ? needsParty ? '先安排初始队伍' : '轻点收起 · 开始旅程' : '收起', !!this.room.pending));
		},
		acceptSpirit: function () {
			var run = this.room.state.run;
			if (run && run.id === this.runid && run.phase === 'intro' && !run.pendingCapture && run.team.length <= run.partyLimit) this.room.submit('spiritack');
			this.close();
		}
	});
	this.RogueMergePopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room;
			var run = this.room.state.run;
			this.runid = run.id;
			this.userid = app.user.get('userid');
			this.member = data.member;
			var owned = run.team.concat(run.box || []);
			var keep = owned.find(function (mon) { return mon.id === data.member; });
			if (!keep) { stableHTML(this, '伙伴已变更，请重新打开。'); return; }
			this.candidates = owned.filter(function (mon) { return mon !== keep && idOf(mon.set.species) === idOf(keep.set.species) && (mon.stars || 1) === (keep.stars || 1); });
			var label = function (mon) { return escape(localName(mon.set.species)) + ' · Lv.' + mon.set.level + ' · ' +
				escape(localName(mon.set.nature || '')) + ' · HP ' + mon.hp + '/' + mon.maxhp + (run.box.indexOf(mon) >= 0 ? '（箱子）' : '（队伍）'); };
			var html = '<h3>确认升星 · ' + (keep.stars || 1) + ' → ' + ((keep.stars || 1) + 1) + ' 星</h3><p><b>保留：</b>' + label(keep) +
				'</p><p>保留此伙伴的性格、个体值、努力值、招式及状态；以下两位伙伴将被消耗，携带道具返还背包。</p>';
			for (var i = 0; i < 2; i++) html += '<p><label>消耗伙伴 ' + (i + 1) + '：<select name="merge-' + i + '">' +
				this.candidates.map(function (mon, n) { return '<option value="' + escape(mon.id) + '"' + (n === i ? ' selected' : '') + '>' + label(mon) + '</option>'; }).join('') + '</select></label></p>';
			stableHTML(this, html + button('confirmMerge', '', '确认消耗并升星', this.candidates.length < 2 || keep.stars >= 4) + button('close', '', '取消'));
		},
		confirmMerge: function () {
			var run = this.room.state.run;
			if (app.user.get('userid') !== this.userid || !run || run.id !== this.runid) { this.close(); return; }
			this.room.submit('merge', {member: this.member, order: [this.$('select[name=merge-0]').val(), this.$('select[name=merge-1]').val()]});
			this.close();
		}
	});
	this.RogueStarterPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.$el.addClass('rogue-starter-popup');
			this.room = data.room;
			this.starters = data.starters;
			this.index = 0;
			this.userid = app.user.get('userid');
			this.renderConfig();
		},
		renderConfig: function () {
			var id = this.starters[this.index];
			this.starter = this.room.state.starters.find(function (entry) { return entry.id === id && entry.available; });
			if (!this.starter) { this.close(); return; }
			var data = {starter: this.starter};
			var traits = starterTraits(data.starter);
			var build = this.room.starterBuilds[data.starter.id] || {nature: 'random', gender: 'random', ability: 'random', ivs: traits.ivs.max};
			var html = '<form class="rogue-starter-config"><p class="rogue-config-progress">配置伙伴 · ' + (this.index + 1) + ' / ' + this.starters.length + '</p>' +
				'<h3>' + escape(localName(data.starter.species)) + ' · 初始配置</h3>' +
				'<p><label>性格 <select name="nature" class="autofocus"><option value="random">随机（全部 25 种性格）</option>';
			(this.room.state.natures || []).filter(function (nature) { return traits.natures.indexOf(nature.id) >= 0; }).forEach(function (nature) {
				html += '<option value="' + escape(nature.id) + '"' + (build.nature === nature.id ? ' selected' : '') + '>' + escape(natureLabel(nature)) + '</option>';
			});
			html += '</select></label></p><p><label>性别 <select name="gender">';
			if (data.starter.gender === 'N') {
				html += '<option value="N">无性别（固定）</option>';
			} else {
				html += '<option value="random">随机（按物种性别比例）</option>';
				traits.genders.filter(function (gender) { return gender !== 'N' && (!data.starter.gender || gender === data.starter.gender); }).forEach(function (gender) {
					html += '<option value="' + gender + '"' + (build.gender === gender ? ' selected' : '') + '>' + (gender === 'M' ? '雄性 ♂' : '雌性 ♀') + '</option>';
				});
			}
			html += '</select></label></p><p><label>特性 <select name="ability"><option value="random">随机（普通特性）</option>';
			(data.starter.abilities || []).filter(function (ability) { return traits.abilities.indexOf(ability.id) >= 0; }).forEach(function (ability) {
				html += '<option value="' + escape(ability.id) + '"' + (build.ability === ability.id ? ' selected' : '') + '>' +
					escape(localName(ability.name)) + (ability.hidden ? '（隐藏特性）' : '') + '</option>';
			});
			html += '</select></label></p>';
			if (traits.shiny) html += '<p><label>外观 <select name="shiny"><option value="no">普通</option>' +
				'<option value="yes"' + (build.shiny ? ' selected' : '') + '>闪光 ★</option></select></label></p>';
			html += '<p class="rogue-config-note">捕捉过的性格、性别和特性可指定；捕捉过闪光伙伴的谱系可选择闪光外观。随机项在开始冒险时确定。</p>' +
				'<table><thead><tr><th>能力</th><th>个体值</th><th>已解锁范围</th></tr></thead><tbody>';
			Object.keys(statNames).forEach(function (stat) {
				html += '<tr><th><label for="rogue-iv-' + stat + '">' + statNames[stat] + '</label></th><td>' +
					'<input class="textbox" type="number" name="iv-' + stat + '" id="rogue-iv-' + stat + '" min="' + traits.ivs.min[stat] +
					'" max="' + traits.ivs.max[stat] + '" step="1" required value="' + build.ivs[stat] + '" /></td><td>' +
					traits.ivs.min[stat] + '～' + traits.ivs.max[stat] + '</td></tr>';
			});
			html += '</tbody></table><p class="rogue-config-note">御三家初始个体值均为 15；捕捉与事件分别拓展六项范围，默认选已解锁最大值。同一进化链共用，地区初始形态分开记录。</p>' +
				'<p class="rogue-config-note">招式自动装配；进入冒险后，可自由更换已解锁的合法招式。</p>' +
				'<p class="rogue-config-error" role="alert"></p><p class="buttonbar"><button type="submit" class="button"><strong>' +
				(this.index === this.starters.length - 1 ? '开始本次冒险' : '确认配置，下一只') + '</strong></button> ' +
				(this.index ? '<button type="button" name="previousStarter" class="button">上一只</button> ' : '') +
				'<button type="button" name="close" class="button">返回选择人选</button></p></form>';
			stableHTML(this, html);
		},
		previousStarter: function () {
			var data = {};
			this.$('form').serializeArray().forEach(function (entry) { data[entry.name] = entry.value; });
			if (!this.saveConfig(data)) return;
			this.index--; this.renderConfig();
		},
		saveConfig: function (data) {
			var room = this.room, id = this.starter.id;
			var starter = room.state && room.state.starters.find(function (entry) { return entry.id === id && entry.available; });
			if (app.user.get('userid') !== this.userid || !starter || room.pending ||
				room.selectedStarters.join(',') !== this.starters.join(',')) { this.close(); return false; }
			var traits = starterTraits(starter), ivs = {};
			var shiny = data.shiny === 'yes';
			var valid = data.nature === 'random' || traits.natures.indexOf(data.nature) >= 0;
			valid = valid && (!shiny || !!traits.shiny);
			valid = valid && (data.gender === 'random' || traits.genders.indexOf(data.gender) >= 0 || (data.gender === 'N' && starter.gender === 'N'));
			valid = valid && (data.ability === 'random' || ((traits.abilities || []).indexOf(data.ability) >= 0 &&
				(starter.abilities || []).some(function (ability) { return ability.id === data.ability; })));
			Object.keys(statNames).forEach(function (stat) {
				ivs[stat] = Number(data['iv-' + stat]);
				if (data['iv-' + stat] === '' || !Number.isInteger(ivs[stat]) || ivs[stat] < traits.ivs.min[stat] || ivs[stat] > traits.ivs.max[stat]) valid = false;
			});
			if (!valid) { this.$('.rogue-config-error').text('请选择已解锁的性格、性别、特性，以及范围内的整数个体值。'); return false; }
			room.starterBuilds[id] = {nature: data.nature, gender: data.gender, ivs: ivs, ability: data.ability, shiny: shiny};
			return true;
		},
		submit: function (data) {
			if (!this.saveConfig(data)) return;
			if (this.index < this.starters.length - 1) {
				this.index++; this.renderConfig();
			} else {
				this.close(); this.room.startAdventure();
			}
		}
	});
}).call(this);
