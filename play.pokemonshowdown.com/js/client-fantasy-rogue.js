(function () {
	'use strict';
	var escape = BattleLog.escapeHTML;
	var globals = this;
	var companionPortraits = {guzma: 'guzma-expressions', iris: 'iris-champion'};
	var dialogueSheets = ['mela', 'atticus', 'ortega', 'eri', 'kieran', 'penny', 'carmine', 'n', 'lillie', 'korrina', 'nemona', 'blue', 'gladion', 'bede', 'silver', 'brock', 'maxie', 'marnie', 'kahili', 'liko', 'jenny', 'sabrina', 'flannery', 'roxie', 'viola', 'nessa', 'larry', 'lorelei', 'lance', 'lacey', 'steven',
		'giovanni', 'archer', 'cyrus', 'ghetsis', 'piers', 'charm', 'clover', 'coin', 'giacomo', 'rocket', 'magma', 'galactic', 'plasma', 'flare', 'skull', 'yell', 'teamstar',
		'jasmine', 'winona', 'gardenia', 'candice', 'clair', 'clay', 'nanu', 'valerie', 'leon', 'cynthia', 'diantha'];
	var dialogueCompanions = ['bea', 'acerola', 'iono', 'rika', 'guzma', 'lysandre', 'iris', 'poppy', 'lana', 'olivia', 'grusha', 'canari', 'sada', 'turo'];
	var singlePortraits = {mewtwo: 'sprites/rogue-dialogue/mewtwo-official.png', aqua: Dex.resolveAvatar('aquagrunt'),
		archie: Dex.resolveAvatar('archie-gen6'), hexmaniac: Dex.resolveAvatar('hexmaniac-gen6'),
		cheerleader: Dex.resolveAvatar('backersf'), snowboarder: Dex.resolveAvatar('skier')};
	var portraitVersions = {
		leon: '20261024', cynthia: '20261024', diantha: '20261024',
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
			return '<section><h3>' + escape(section.title) + '</h3><p>' + guideText(section.text) + '</p></section>';
		}).join('');
	}
	function guideText(text) {
		return escape(text || '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
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
			var bondGain = owned.some(function (b) { return b.family === 'bond'; }) && mon.initialPartner ? 10 : 3;
			html += resourceMeter('亲密度', mon.set.happiness || 0, 255, '满亲密度后开始积累羁绊');
			html += resourceMeter('羁绊', mon.bond, 100, (mon.bond || 0) >= 100 ? '最高伤害浮动已生效；每场一次 10% 保命' :
				'满亲密度后每层至少 +' + bondGain + ' · 距目标还需至多 ' + Math.ceil((100 - (mon.bond || 0)) / bondGain) + ' 层');
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
		if (!root || !root.ownerDocument) { room.$el.html(html); return; }
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
		if (first && scroll > 0) first.style.minHeight = (scroll + root.clientHeight) + 'px';
		patch(root, template.content);
		root.scrollTop = scroll; root.scrollLeft = left;
	}
	function blessingText(text) {
		return String(text || '').split(/(【[^】]+】)/g).map(function (part) {
			return /^【[^】]+】$/.test(part) ? '<strong class="rogue-term">【' + escape(localName(part.slice(1, -1))) + '】</strong>' : escape(part);
		}).join('');
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
		name = adjustedRogueName(name);
		var statuses = {par: '麻痹', brn: '烧伤', psn: '中毒', tox: '剧毒', slp: '睡眠', frz: '冰冻', fst: '冻伤', frostbite: '冻伤'};
		if (statuses[name]) return statuses[name];
		if (/薄荷$/.test(name)) return localName(name.slice(0, -2)).split(/[（(]/)[0].trim() + '薄荷';
		if (/^招式学习机：/.test(name)) return '招式学习机：' + localName(name.slice(6), 'move');
		if (name === 'Rogue Great Mage') return '大法师';
		if (/^[a-z0-9]+$/.test(name) && typeof Dex !== 'undefined') {
			var data = dex(), groups = kind ? [kind === 'move' ? 'moves' : kind === 'item' ? 'items' : kind] : ['items', 'abilities', 'species', 'moves'];
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
	var statNames = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
	var typeNames = {Normal: '一般', Fire: '火', Water: '水', Grass: '草', Electric: '电', Ice: '冰', Fighting: '格斗', Poison: '毒', Ground: '地面', Flying: '飞行', Psychic: '超能力', Bug: '虫', Rock: '岩石', Ghost: '幽灵', Dragon: '龙', Dark: '恶', Steel: '钢', Fairy: '妖精'};
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
	var kindNames = {wild: '野生战斗', battle: '战斗', elite: '精英', encounter: '遭遇', trainer: '训练家', rest: '休整',
		boss: '首领', gym: '道馆', event: '事件', reward: '奖励', shop: '商店', trade: '交易', adventure: '奇遇', fog: '未知区域'};
	var routeNames = {wild: '战斗', trainer: '遭遇', shop: '交易'};
	function floorNodeHeading(node) {
		if (!node) return '';
		var parts = node.name.split(/\s+·\s+/);
		return ' · <strong class="rogue-heading-region" data-kind="' + escape(node.kind) + '">' +
			escape(routeNames[node.kind] || kindNames[node.kind] || node.kind) + '</strong> · ' + escape(parts.shift()) +
			(parts.length ? ' · <span class="rogue-floor-subtitle">' + escape(parts.join(' · ')) + '</span>' : '');
	}
	function routeTone(kind) {
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
			boss: 'trophy', gym: 'university', event: 'question', reward: 'gift', shop: 'shopping-bag', trade: 'shopping-bag', rest: 'medkit', adventure: 'magic'};
		return cardSelectionMarker() +
			'<span class="rogue-route-emblem" aria-hidden="true"><i class="fa fa-' + (icons[kind] || 'compass') + '"></i></span>';
	}
	function blessingIcon(option) {
		var icons = {coin: 'adjust', dice: 'cube', friend: 'paw', catcher: 'bullseye', battletask: 'flag', eventtask: 'map-signs',
			supercombo: 'bolt', lowhp: 'heartbeat', pivot: 'exchange', swapstats: 'exchange', kid: 'child', slacker: 'moon-o',
			passdrops: 'level-down', bond: 'heart', pandorasilver: 'random', detect: 'eye', reservation: 'magic', money: 'money',
			starquest: 'star', weakness: 'shield', typexp: 'graduation-cap', overtime: 'hourglass-half', singer: 'microphone',
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
	var itemKinds = {ability: '特性调整', ball: '精灵球', heal: '恢复道具', revive: '复活道具', cure: '状态恢复', ether: 'PP 恢复', candy: '经验糖果', evolution: '进化道具', held: '携带道具', emblem: '属性转 · 独立栏位', treasure: '贵重物品', effort: '基础点数', tonic: '祝福道具', crown: '个体值训练'};
	var economyIcons = ['tinymushroom', 'balmmushroom', 'prettyfeather', 'stardust', 'starpiece', 'cometshard', 'pearl', 'bigpearl', 'pearlstring',
		'antidote', 'burnheal', 'iceheal', 'awakening', 'paralyzeheal', 'healthfeather', 'musclefeather', 'resistfeather', 'geniusfeather', 'cleverfeather', 'swiftfeather', 'leaderscrest', 'peatblock'];
	function dex() { return Dex.mod ? Dex.mod('gen9fantasy') : Dex; }
	function idOf(name) { return (name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
	function fa(name) { return '<i class="fa fa-' + name + '" aria-hidden="true"></i> '; }
	function itemIcon(item) {
		if (item.kind === 'mint') return fa('leaf');
		if (item.kind === 'forme') return '<img class="rogue-loot-icon pixelated" src="sprites/fantasy-rogue/key-items/' + escape(item.icon) + '.png" alt="" /> ';
		if (item.kind === 'machine') {
			var type = dex().moves.get(item.move || item.id.replace(/^tm/, '')).type;
			return '<img class="rogue-loot-icon pixelated" src="sprites/fantasy-rogue/tm/' + (typeNames[type] ? type.toLowerCase() : 'normal') + '.png" alt="' + escape(typeNames[type] || '一般') + '属性招式学习机" /> ';
		}
		var id = item.icon || item.id;
		var special = {
			abilitycapsule: '<g transform="rotate(-35 16 16)"><rect x="5" y="9" width="22" height="14" rx="7" fill="#63b1ec"/><path d="M16 9h4a7 7 0 0 1 0 14h-4Z" fill="#f1b4cf"/><path d="M9 12h4" stroke="white" stroke-width="2"/></g>',
			abilitypatch: '<path d="m7 3 19 4-1 21-21-4Z" fill="#e7ecfb"/><path d="m9 7 13 2-1 14-13-2Z" fill="#eec24e"/><path d="m12 10 7 1-1 8-7-1Z" fill="#fff5c5"/>',
			bottlecap: '<path d="m16 2 4 3 5 1 1 5 4 5-4 4-1 5-5 1-4 4-4-4-5-1-1-5-4-4 4-5 1-5 5-1Z" fill="#c0d0df"/><circle cx="16" cy="16" r="8" fill="#edf5ff"/>',
			goldbottlecap: '<path d="m16 2 4 3 5 1 1 5 4 5-4 4-1 5-5 1-4 4-4-4-5-1-1-5-4-4 4-5 1-5 5-1Z" fill="#e0a12e"/><circle cx="16" cy="16" r="8" fill="#ffe38b"/>',
			maxrevive: '<path d="m16 2 4 9 10 5-10 4-4 10-5-10-9-4 9-5Z" fill="#edb83c"/><path d="m16 8 3 8-3 8-3-8Z" fill="#fff4aa"/>'
		};
		if (special[id]) return '<svg class="rogue-loot-icon" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="#506781" stroke-width="1.2">' + special[id] + '</svg> ';
		if (economyIcons.indexOf(id) >= 0) return '<img class="rogue-loot-icon" src="sprites/fantasy-rogue/' + id + '.png" alt="" /> ';
		var frame = id.indexOf('expcandy') === 0 ? 'candy' : id === 'linkingcord' ? 'cord' :
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
	function moveRow(id, pp) {
		var move = dex().moves.get(id);
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
		if (item.kind === 'emblem') return '放入独立的属性转栏，不占携带道具位，可随时在战斗外取下。替换第二属性并开放对应五个招式；取下后撤销临时招式权限。';
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
		return text.replace(/[A-Za-z][A-Za-z0-9'’.:%♀♂ -]*/g, function (phrase) {
			var name = phrase.trim();
			return localName(name) + phrase.slice(name.length);
		});
	}
	function dialogueText(text) {
		// Emphasis is applied only after escaping; story copy cannot insert markup.
		return escape(eventText(text || '')).replace(/【[^】]+】|\d+(?:\.\d+)?\s*(?:金币|级|%|％)|首领|幻想精英|难对付|先把伙伴照顾好|战胜对手后就会消散|准备好了再上楼|技巧|力量|传授招式换路费|三张里选一张/g,
			function (word) { return '<strong>' + word + '</strong>'; });
	}
	function clearCardHTML(card) {
		var snap = card.snapshot;
		function signed(n) { return (n > 0 ? '+' : '') + n; }
		function abilityDescription(id) {
			var ability = dex().abilities.get(id);
			return id === 'roguegreatmage' ? '特攻变为原来的 2 倍。' : localName(ability.shortDesc || ability.desc || '暂无特性说明');
		}
		function memberHTML(mon) {
			if (mon.egg) return '<section class="rogue-clear-details"><h4>宝可梦蛋</h4><p>通关时尚未孵化，保留旅途记录，不参与通关卡对战。</p></section>';
			var detail = snap.memberDetails && snap.memberDetails[mon.id];
			var html = '<section class="rogue-clear-details"><h4>' + escape(localName(mon.set.species)) + (mon.set.shiny ? ' ★ 异色' : '') +
				' · Lv.' + mon.set.level + ' · ' + (mon.stars || 1) + ' 星</h4><p>性格：' + escape(localName(mon.set.nature || '')) +
				(mon.mintNature ? '（薄荷效果：' + escape(localName(mon.mintNature)) + '）' : '') +
				' · 性别：' + ({M: '雄性', F: '雌性'}[mon.set.gender] || '无性别') + ' · 亲密度：' + (mon.set.happiness || 0) + '</p>';
			html += '<p>属性：' + (detail ? detail.types : dex().species.get(mon.set.species).types).map(function (type) { return escape(localName(type)); }).join(' / ') +
				' · 太晶属性：' + escape(localName(mon.set.teraType || dex().species.get(mon.set.species).types[0])) +
				' · 属性转：' + escape(mon.emblem ? localName(dex().items.get(mon.emblem).name) : '无') + '</p>';
			html += '<div class="rogue-clear-stat-scroll"><table><thead><tr><th>能力</th><th>个体值</th><th>努力值</th><th>增幅前</th><th>常驻最终值</th><th>增加值</th><th>增幅比例</th></tr></thead><tbody>';
			Object.keys(statNames).forEach(function (stat) {
				html += '<tr><td>' + statNames[stat] + '</td><td>' + (mon.set.ivs ? mon.set.ivs[stat] : 31) + '</td><td>' +
					(mon.set.evs ? mon.set.evs[stat] : 0) + '</td><td>' + (detail ? detail.baseline[stat] : '—') + '</td><td><b>' +
					(detail ? detail.final[stat] : mon.stats ? mon.stats[stat] : '—') + '</b></td><td>' + (detail ? signed(detail.delta[stat]) : '—') +
					'</td><td>' + (detail ? signed(detail.percent[stat]) + '%' : '—') + '</td></tr>';
			});
			html += '</tbody></table></div><p class="rogue-caption">' + (detail ?
				'增幅前按相同形态、等级、个体值、努力值与性格计算。最终值为通关时的常驻面板；特性、道具及条件性战斗效果另列。' :
				'旧卡未记录增幅前数值；最终值仍使用当时存档，不按新规则补算。') + '</p>';
			if (detail && detail.sources.length) html += '<details open><summary>增幅来源与叠层</summary><ul class="rogue-clear-sources">' +
				detail.sources.map(function (source) { return '<li><b>' + escape(source.name) + '</b>：' + dialogueText(source.text) + '</li>'; }).join('') + '</ul></details>';
			html += '<dl class="rogue-clear-effects"><dt>主特性：【' + escape(localName(dex().abilities.get(mon.set.ability).name, 'ability')) + '】</dt><dd>' +
				escape(abilityDescription(mon.set.ability)) + '</dd>';
			var extras = detail ? detail.extraAbilities : (mon.extraAbilities || []).map(function (id) { return {id: id, source: '存档记录'}; });
			extras.forEach(function (extra) {
				html += '<dt>额外特性：【' + escape(localName(dex().abilities.get(extra.id).name, 'ability')) + '】 <small>' + escape(extra.source) +
					'</small></dt><dd>' + escape(abilityDescription(extra.id)) + '</dd>';
			});
			if (!extras.length) html += '<dt>额外特性：无' + (!detail ? '（旧卡仅显示已有记录）' : '') + '</dt>';
			var held = mon.set.item && dex().items.get(mon.set.item);
			html += '<dt>携带道具：' + escape(held ? localName(held.name) : '无道具') + '</dt>' +
				(held ? '<dd>' + escape(localName(held.shortDesc || held.desc || '')) + '</dd>' : '') + '</dl>';
			html += '<p>通关时 HP <b>' + mon.hp + '/' + mon.maxhp + '</b> · ' + escape(mon.hp ? Object.keys(mon.statuses || {}).map(function (id) { return localName(id); }).join(' / ') || localName(mon.status || '状态正常') : '已倒下') + '</p><div class="rogue-clear-moves"><b>出战招式</b><ul>' +
				mon.pp.map(function (slot) { return '<li>【' + escape(localName(dex().moves.get(slot.id).name, 'move')) + '】 ' + slot.pp + '/' + slot.maxpp + ' PP</li>'; }).join('') + '</ul></div>';
			var learned = (mon.moveMemory || []).filter(function (slot) { return !mon.pp.some(function (active) { return active.id === slot.id; }); });
			if (learned.length) html += '<details><summary>其他已学招式（' + learned.length + '）</summary><p>' + learned.map(function (slot) {
				return '【' + escape(localName(dex().moves.get(slot.id).name, 'move')) + '】 ' + slot.pp + '/' + slot.maxpp + ' PP';
			}).join(' / ') + '</p></details>';
			return html + '</section>';
		}
		var html = '<article class="rogue-clear-card"><header><span class="rogue-caption">第 200 层 · 通关纪念</span><h3>' + escape(card.name) +
			'的旅途</h3><p><b>' + escape(snap.spiritName || (snap.spirit ? snap.spirit : '无塔灵')) + '</b> · ' +
			escape(new Date(card.completedAt).toLocaleDateString()) + '</p></header><div class="rogue-clear-team">';
		snap.team.forEach(function (mon) {
			html += '<div class="rogue-clear-mon"><div class="rogue-clear-sprite" style="' + Dex.getTeambuilderSprite(mon.set) + '"></div>' +
				'<strong>' + escape(localName(mon.set.species)) + '</strong><span>Lv.' + mon.set.level + ' · ' + (mon.stars || 1) + ' 星</span></div>';
		});
		html += '</div><details><summary>查看队伍数值与本局效果</summary>';
		html += '<p>完整保留通关时的养成、祝福、永久增幅与塔灵效果。</p>' + snap.team.map(memberHTML).join('');
		if (snap.box && snap.box.length) html += '<details><summary>寄存伙伴（' + snap.box.length + '）</summary>' + snap.box.map(memberHTML).join('') + '</details>';
		if (snap.spirit === 'hoopamischief' && snap.hazards) html += '<p>最终战斗场地：己方 ' +
			escape(localName(dex().moves.get(snap.hazards[0]).name, 'move')) + ' · 对方 ' + escape(localName(dex().moves.get(snap.hazards[1]).name, 'move')) +
			'。约战时按双方卡片的敌我方向合并，遵守层数上限。</p>';
		html += '<p>局外六维加成：' + Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + snap.boosts[stat]; }).join(' / ') + '</p>' +
			'<p>' + [['太晶化', snap.teraUnlocked], ['超级进化', snap.megaUnlocked], ['超极巨化', snap.gmegaUnlocked], ['Z 招式', snap.zUnlocked]].map(function (system) {
				return system[0] + '：' + (system[1] ? '已解锁' : '未解锁');
			}).join(' · ') + '</p><p>' + escape(snap.spiritText || '本局未开启塔灵。') + '</p>' +
			'<p>开局卡：' + escape(snap.cardName || '无（旧版冒险）') + '</p><p>' + escape(snap.cardText || '') + '</p>' +
			'<h4>通关祝福</h4>' + (snap.blessings.length ? snap.blessings.map(function (entry) {
				var owned = snap.blessingEffects && snap.blessingEffects.owned.find(function (b) { return b.id === entry.id; });
				var target = owned && owned.target && snap.team.concat(snap.box || []).find(function (mon) { return mon.id === owned.target; });
				return '<details class="rogue-clear-blessing"><summary><b>' + escape(entry.name || entry.id) + '</b>' + (entry.floor ? ' · 第 ' + entry.floor + ' 层' : '') +
					'</summary><p>' + blessingText(entry.text) + '</p>' + (target ? '<p>指定伙伴：【' + escape(localName(target.set.species)) + '】</p>' : '') +
					(owned && owned.progress !== undefined ? '<p>累计进度：' + owned.progress + (owned.completed ? ' · 已完成' : '') + '</p>' : '') + '</details>';
			}).join('') : '<p>未选择祝福</p>');
		var effects = snap.blessingEffects || {};
		if (snap.rival) html += '<p>劲敌旅程：【' + escape(snap.rival.name) + '】 · 完成 ' + snap.rival.completed +
			'/8 段奇遇 · 熟悉度 ' + snap.rival.affection + (snap.rival.permanent ? ' · 永久同行' : '') + '</p>';
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
		events: {'change input[name=starter]': 'changeStarter', 'change input[name=useSpirit]': 'changeSpirit',
			'change select[name=starterType]': 'filterStarterType', 'change select[name=codexType]': 'filterCodexType',
			'input .rogue-compound-allocation input': 'updateCompoundAllocation',
			'change select[name=testSpirit]': 'changeSpirit', 'change select[name=selectedSpirit]': 'changeSpirit', 'change select[name=hpTarget]': 'changeHPTarget',
			'change select[name=target]': 'changeItemTarget', 'keydown .rogue-start-deck': 'cardKey',
			'keydown .rogue-ski': 'skiKey', 'input input[name=codexSearch]': 'codexSearchInput', 'change select[name=codexSearchMode]': 'codexSearchModeChanged', 'keydown input[name=codexSearch]': 'codexSearchKey', 'input .rogue-event-allocation input': 'updateEventEVTotal'},
		initialize: function () {
			this.$el.addClass('ps-room-light scrollable fantasyrogue');
			this.state = null;
			this.screen = 'home';
			this.codices = {};
			this.codexFilter = 'all'; this.codexPage = 0; this.codexQuery = '';
			this.pending = null;
			this.error = '';
			this.selectedStarters = [];
			this.starterBuilds = {};
			this.starterType = ''; this.codexType = '';
			this.selectedRoute = null;
			this.selectedBlessing = null;
			this.openPartyOnLayout = true;
			this.listenTo(app, 'response:fantasyrogue', this.receiveState);
			this.listenTo(app, 'response:fantasyrogueaction', this.receiveAction);
			this.listenTo(app, 'response:fantasyrogueski', this.receiveSki);
			this.listenTo(app, 'response:fantasyroguecodex', this.receiveCodex);
			this.listenTo(app, 'init:socketopened', this.refresh);
			this.listenTo(app, 'init:socketclosed', this.disconnected);
			// Sent after the server confirms a login, even if the user ID did not change.
			this.listenTo(app, 'init:choosename', this.refresh);
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
			if (entering) this.refresh();
		},
		hide: function () { this.visible = false; Room.prototype.hide.apply(this, arguments); },
		preparePanel: function () {
			if (!this.openPartyOnLayout) return;
			this.openPartyOnLayout = false;
			var panel = app.rooms.fantasyrogueparty || app._addRoom('fantasyrogueparty', null, true);
			panel.render();
			app.updateSideRoom(panel.id);
		},
		openParty: function () {
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
			clearTimeout(this.timer); clearTimeout(this.skiTimer); this.skiPending = null; this.skiQueue = []; this.stopListening();
			clearInterval(this.activityClock); this.activityClock = null;
			if (app.rooms.fantasyrogueparty) app.removeRoom('fantasyrogueparty');
		},
		joinRoom: function (id) { app.joinRoom(id); },
		identityChanged: function () {
			clearTimeout(this.skiTimer); this.skiPending = null; this.skiQueue = [];
			clearInterval(this.activityClock); this.activityClock = null;
			this.screen = 'home'; this.codices = {}; this.codexReplay = null; this.codexQuery = ''; this.codexPage = 0;
			this.evolutionPreview = null;
			this.revealedMove = null;
			this.starterBuilds = {};
			this.useSpirit = false; this.testSpirit = ''; this.selectedSpirit = ''; this.hpTarget = null; this.spiritPopupRun = null;
			this.selectedStarters = []; this.selectedRoute = null; this.selectedBlessing = null;
			this.selectedMember = null; this.itemTarget = null; this.state = null; this.pending = null; this.error = ''; this.refresh();
		},
		disconnected: function () {
			clearTimeout(this.skiTimer); this.skiPending = null; this.skiQueue = [];
			this.evolutionPreview = null;
			clearTimeout(this.timer);
			this.pending = null;
			this.selectedRoute = null;
			this.selectedBlessing = null;
			this.error = '连接已断开。重新连接后将读取服务器存档。';
			this.render();
		},
		refresh: function () {
			if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyrogue');
			if (['guide', 'blessings', 'events'].indexOf(this.screen) >= 0) this.loadCodex(this.screen);
			this.render();
		},
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
			this.maybeShowSpirit(); this.startFishingClock(); this.startSkiClock(); this.startActivityClock(); this.maybeShowEvolution();
		},
		startMenu: function () { this.screen = 'home'; this.codexReplay = null; this.render(); this.scrollCodexTop(); },
		maybeShowOnboarding: function () {
			var account = this.state && this.state.account, userid = app.user.get('userid');
			if (!account || !account.needsOnboarding || this.onboardingPopupUser === userid) return;
			this.onboardingPopupUser = userid;
			app.addPopup(globals.RogueOnboardingPopup, {room: this, userid: userid});
		},
		scrollCodexTop: function () {},
		openCodex: function (section) {
			if (['guide', 'blessings', 'events'].indexOf(section) < 0) return;
			this.screen = section; this.codexFilter = section === 'guide' ? 'items' : 'all';
			this.codexCollection = 'regions';
			this.codexQuery = ''; this.codexPage = 0; this.codexReplay = null;
			this.loadCodex(section); this.render(); this.scrollCodexTop();
		},
		loadCodex: function (section) {
			if (app.socket && app.socket.readyState === 1) app.send('/cmd fantasyroguecodex ' + section);
		},
		receiveCodex: function (data) {
			if (!data || data.userid !== app.user.get('userid') || ['guide', 'blessings', 'events'].indexOf(data.section) < 0) return;
			if (this.state && this.state.contentVersion && data.contentVersion && this.state.contentVersion !== data.contentVersion) return;
			var old = this.codices[data.section];
			if (old && old.contentVersion === data.contentVersion && old.revision > data.revision) return;
			this.codices[data.section] = data;
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
			var entry = ((this.codices.events || {}).entries || []).find(function (event) { return event.id === id; });
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
		},
		receiveState: function (state, storyOnly) {
			if (!state || state.userid !== app.user.get('userid')) return;
			if (state.protocolVersion !== 1) { this.error = '请刷新客户端以更新肉鸽页面。'; this.render(); return; }
			if (this.state && this.state.account && state.account && state.account.revision < this.state.account.revision) return;
			var codexChanged = this.state && this.state.contentVersion !== state.contentVersion;
			if (codexChanged) { this.codices = {}; this.codexReplay = null; }
			var previous = this.state && this.state.run;
			var incoming = state.run;
			if (!incoming || !(incoming.pendingMoves || []).length) this.revealedMove = null;
			if (incoming && (!previous || previous.id !== incoming.id)) this.openPartyOnLayout = true;
			if (!previous || !incoming || previous.id !== incoming.id || previous.floor !== incoming.floor ||
				previous.phase !== incoming.phase || this.state.account.revision !== state.account.revision) {
				this.selectedRoute = null;
				this.selectedBlessing = null;
			}
			this.state = state;
			if (codexChanged && ['guide', 'blessings', 'events'].indexOf(this.screen) >= 0) this.loadCodex(this.screen);
			if (state.account && state.account.needsOnboarding && this.screen === 'game') this.screen = 'home';
			if (this.$el[0] && this.$el[0].setAttribute) this.$el[0].setAttribute('aria-busy', this.pending ? 'true' : 'false');
			this.normalizeStarters();
			this.render(storyOnly === true);
			// Finish the last native battle animation before entering the saved ending.
			if (state.story && state.story.stage === 'ending' && previous && previous.roomid &&
				incoming && incoming.id === previous.id) {
				var finalBattle = app.rooms[previous.roomid];
				if (finalBattle && finalBattle.fantasyRogue && finalBattle.fantasyRogue.userid === state.userid) {
					finalBattle.fantasyRogueEnding = true;
					finalBattle.updateControls();
				}
			}
			if (app.curRoom === this && !storyOnly) app.updateLayout();
			this.maybeShowSpirit();
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
			if (result.ok && action === 'ackfailure') this.screen = 'home';
			if (result.state) this.receiveState(result.state, action === 'storynext' || action === 'storyskip');
			else this.refresh();
			if (result.ok && action === 'battle' && result.state.run && result.state.run.roomid) app.joinRoom(result.state.run.roomid);
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
			var parts = value.split(':');
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
		renderCompanionInvitation: function (invite, busy) {
			return '<section class="rogue-companion-invitation" role="dialog" aria-label="同行邀请"><h3>' +
				escape(invite.name) + '希望与你同行</h3><p>所有同行共用两个名额。告别保留已获得的永久奖励，暂停该人物的在队增益。</p>' +
				(invite.roster.length >= 2 ? invite.roster.map(function (c) {
					return button('companionInviteAction', c.id, '向' + c.name + '告别，接受邀请', busy);
				}).join('') : button('companionInviteAction', 'accept', '接受同行', busy)) +
				button('companionInviteAction', 'decline', '这次暂不同行', busy) + '</section>';
		},
		renderCompanions: function (run, busy) {
			var companions = run.companions || [], selected = run.selectedCompanions || companions.map(function (c) { return c.id; });
			var locked = busy || !!run.companionInvitation || run.phase === 'battle' || run.preview && run.preview.stage === 'result';
			var html = '';
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
				html += '<article class="rogue-companion rogue-rival-companion">' + (art ? '<span class="rogue-companion-portrait" style="' + portraitStyle(rival.id) + '"></span>' : '<img class="rogue-rival-native" src="' + escape(Dex.resolveAvatar(rival.id)) + '" alt="" />') + '<div class="rogue-companion-copy"><strong>' + escape(rival.name) + ' · 劲敌</strong><small>' + escape(rival.text) + ' · 熟悉度 ' + rival.affection + '</small><p>' + escape(rival.message) + '</p></div></article>';
			});
			(run.socialCompanions || []).forEach(function (c) {
				var art = portraitFile(c.id);
				html += '<article class="rogue-companion">' + (art ? '<span class="rogue-companion-portrait" style="' + portraitStyle(c.id) +
					'"></span>' : '<img class="rogue-rival-native" src="' + escape(Dex.resolveAvatar(c.id)) + '" alt="' + escape(c.name) + '" />') +
					'<div class="rogue-companion-copy"><strong>' + escape(c.name) + ' · 常驻同行</strong><small>偏好' +
					escape(c.region) + '相关、' + ({battle: '战斗', reward: '奖励', pokemon: '宝可梦'}[c.preference] || '') +
					'选项；喜欢' + escape((c.areas || []).map(function (id) { return kindNames[id] || id; }).join('、')) + '区域</small>' + button('socialCompanionAction', c.id + '|chat', '闲聊', locked) +
					(c.canConsult ? button('socialCompanionAction', c.id + '|advice', '听听建议', locked) : '') +
					(c.message ? '<p>' + escape(c.message) + '</p>' : '') +
					resourceMeter('同行训练家的赠礼', Math.min(15, c.preferences), 15, c.rewarded ? '已领取' : '听从偏好次数') +
					(c.giftOptions || []).map(function (gift) {
						return button('socialCompanionAction', c.id + '|gift:' + gift.id, '领取【' + gift.name + '】', locked);
					}).join('') + '</div></article>';
			});
			if (!companions.length) return html;
			return html + '<section class="rogue-companions" aria-label="同行训练家">' + companions.map(function (c) {
				var chat = c.smile && c.smileUntil, seconds = chat ? Math.max(0, (c.smileUntil - Date.now()) / 1000) : 0;
				var portrait = portraitStyle(c.id);
				var out = '<article class="rogue-companion"><button class="rogue-companion-portrait' + (c.smile ? ' smiling' : '') + (chat ? ' chatting' : '') +
					'" name="companionAction" value="' + c.id + '|chat" title="与' + escape(c.name) + '闲聊" aria-label="与' + escape(c.name) + '闲聊" style="' +
					portrait + 'animation-duration:' + seconds + 's"' + (locked ? ' disabled' : '') + '></button><div class="rogue-companion-copy"><strong>' + escape(c.name) + '</strong>';
				if (c.canConsult) out += button('companionAction', c.id + '|advice', '你想听听我的建议吗？', locked);
				if (c.message) out += '<p class="rogue-companion-speech">' + escape(c.message) + '</p>';
				if (c.giftCounter) out += resourceMeter('同行训练家的赠礼', Math.min(15, c.preferences), 15,
					(c.id === 'lana' ? '钓鱼次数' : c.id === 'olivia' ? '赌石次数' : '听从偏好次数') + (c.rewarded ? ' · 已领取' : c.giftPending ? ' · 待选择赠礼' : ''));
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
			var details = {starters: this.selectedStarters.slice(), starterBuilds: this.starterBuilds, useSpirit: !!this.useSpirit};
			if (this.useSpirit && this.state.localSpirits && this.testSpirit) details.testSpirit = this.testSpirit;
			else if (this.useSpirit && this.selectedSpirit) details.selectedSpirit = this.selectedSpirit;
			this.submit('start', details);
		},
		storyNext: function () { if (this.state.story) this.submit('storynext', {value: this.state.story.key}); },
		acknowledgeFailure: function (key) {
			var run = this.state && this.state.run;
			if (run && run.phase === 'defeated' && run.failure && run.failure.key === key) this.submit('ackfailure', {value: key});
		},
		storySkip: function () { if (this.state.story) this.submit('storyskip', {value: this.state.story.key}); },
		storyBattle: function () {
			var story = this.state.story;
			if (story && story.stage === 'bossintro' && story.battleReady) this.submit('battle', {value: story.key});
		},
		storyChapter: function (story) {
			return story.stage === 'restguide' ? '休整' : story.stage === 'leaguebriefing' ? '接下来的挑战' : story.stage === 'bossintro' ? '战前' : story.stage === 'gymgift' ? '途中' :
				story.stage === 'interlude' ? '旅途对话' : story.stage === 'ending' ? '终章' : story.stage === 'godinvite' ? '通关之后' : '序章';
		},
		storyHint: function (story) {
			return (story.battleReady ? '请选择下方操作' : '轻点继续 ▷') + ' · ' + (story.index + 1) + '/' + story.total;
		},
		storyActions: function (story, busy) {
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
			dialogue.disabled = busy || !!story.battleReady;
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
		affectionPopup: function (story) {
			if (!story.affectionGain || this.affectionPopupKey === story.key) return '';
			this.affectionPopupKey = story.key;
			return '<span class="rogue-affection-gain" role="status">好感度 +' + Number(story.affectionGain) + '</span>';
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
				'<div class="rogue-story-portal"></div>' + art + '</div><button name="storyNext" class="rogue-story-dialogue"' + (busy || story.battleReady ? ' disabled' : '') + '>' +
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
		replaceMember: function (id) { this.submit('replace', {value: id}); },
		evolveMember: function (value) {
			var parts = value.split('|');
			if (!this.pending && this.state.run && editable(this.state.run) && !this.state.run.healingLocked) {
				app.addPopup(globals.RogueEvolutionPopup, {room: this, member: parts[0], target: parts[1]});
			}
		},
		showEvolutionChoices: function (member) {
			if (!this.pending && this.state.run && editable(this.state.run) && !this.state.run.healingLocked) {
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
		equipEmblem: function (id) { this.submit('equipemblem', {member: this.selectedPokemon().id, value: id}); },
		applyEVs: function () {
			var evs = {}, self = this;
			Object.keys(statNames).forEach(function (stat) { evs[stat] = Number(self.$('input[name=ev-' + stat + ']').val()); });
			this.submit('evs', {member: this.selectedPokemon().id, evs: evs});
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
		chooseBlessingUpgrade: function (value) { this.submit('blessing', {value: value}); },
		chooseLongBlessingReward: function () { this.chooseBlessingReward(this.$('select[name=blessingRewardItem]').val()); },
		challengeShop: function () {
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'shopchallenge', title: '发起零元购挑战',
				text: '胜利可获得本店随机三种商品，各一件。无论胜负，战斗结束后本层商店都会关闭。确定现在挑战？'});
		},
		chooseBlessingReward: function (value) {
			var run = this.state.run, pending = run.blessings.pending[0];
			if (!pending) return;
			if (pending.kind === 'gift' && value === 'join' && run.team.length >= run.partyLimit) {
                this.giftReplace = pending.id; this.render(); return;
            }
            if (value === 'back' && pending.kind === 'gift') { this.giftReplace = null; this.render(); return; }
            var replaced = run.team.filter(function (mon) { return mon.id === value; })[0];
			if (pending.kind === 'gift' && (value === 'release' || replaced)) {
				var departing = replaced || pending.pokemon;
				var bound = run.blessings.owned.filter(function (entry) { return entry.target === departing.id; });
				app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'blessingreward', title: '确认伙伴去向',
					details: {member: pending.id, value: value}, text: '确定放走' + localName(departing.set.species) +
					(replaced ? '，让新伙伴加入队伍' : '') + '？' + (bound.length ? '这只伙伴绑定了“' + bound.map(function (entry) { return entry.name; }).join('、') + '”，放走后无法找回。' : '')});
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
			return html;
		},
		blessingMemberAction: function (value) {
			var parts = value.split(':');
			app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: parts[0], details: {member: parts.slice(1).join(':')},
				text: parts[0] === 'fantasize' ? '消耗 100 幻想碎片，将该伙伴转换为对应幻想形态？' :
					parts[0] === 'meltanevolve' ? '消耗 400 个美录坦糖果，进化为美录梅塔？' : '为这位圣剑士领取永久额外特性“锋锐”？'});
		},
		renderBlessingChoice: function (run, busy) {
			var state = run.blessings;
			if (!state) return '<p>正在读取祝福…</p>';
			var tierNames = {silver: '白银', gold: '黄金', prismatic: '棱彩', mixed: '银 · 金 · 彩'};
			var reward = state.pending[0];
			var html = '<h3>' + (state.beforeAdventure ? '启程祝福 · 第一层开战前' : reward && !state.round ? '旅途奖励' : '塔中的祝福') + '</h3>';
			if (reward) {
				html += '<h4>' + escape(reward.title) + '</h4>';
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
							return memberChoice('chooseBlessingReward', member.id, member, busy, '替换这位伙伴');
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
				if (state.evolutionCosts && state.evolutionCosts.includes(run.floor)) html += '<p class="rogue-caption">本轮已按一份棱彩祝福计入对手等级加成，不会因选择方向或强化再次加级。</p>';
				if (run.floor === 200) html += '<p class="rogue-caption">完成最后一次强化后保存通关卡。</p>';
				html += '<div class="rogue-evolution-choices">';
				var directions = {resistance: {icon: 'shield', text: '逐步改善队伍中该属性伙伴的抗性，减轻受到的属性克制。'},
					moves: {icon: 'bolt', text: '提升本属性招式威力、扩大打击面，或解锁招式专属效果。'},
					stats: {icon: 'line-chart', text: '每次从三项能力中选一项，让队伍中该属性伙伴的对应能力提升 15%。'}};
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
					html += '<article class="rogue-blessing-option rogue-blessing-' + tier + '"><button type="button" name="chooseBlessing" value="' + index +
						'" class="rogue-route rogue-blessing-card' + (option.chosen ? ' is-chosen' : '') + (selected ? ' is-selected' : '') +
						'" aria-pressed="' + selected + '"' + (busy || option.chosen ? ' disabled' : '') + '>' + cardSelectionMarker() +
						'<span class="rogue-blessing-quality">' + tierNames[tier] + '阶</span>' +
						'<span class="rogue-blessing-art" aria-hidden="true"><span class="rogue-blessing-emblem">' + fa(blessingIcon(option)) + '</span></span>' +
						'<strong class="rogue-blessing-title">' + escape(option.name) + '</strong>' +
						(option.type ? '<span class="rogue-blessing-type">' + escape(localName(option.type)) + '</span>' : '') +
						'<span class="rogue-blessing-description">' + blessingText(option.text) + '</span>' +
						(option.family === 'sound' || option.id === 'sound' ? '<span class="rogue-blessing-description"><b>当前队伍已有 ' + equippedSoundCount(run) + ' 个声音招式，选用后声音伤害 +' + equippedSoundCount(run) * 5 + '%。</b></span>' : '') +
						'<span class="rogue-blessing-cost">' + (cost.boss ? '固定首领 +' + cost.boss + ' 级 · 普通遭遇 +' + cost.normal + ' 级' : '对手不额外加级') + '</span>' +
						'<span class="rogue-route-hint">' + (option.chosen ? '已获得' : selected ? '已选中 · 再点一次领取' : '点击选中') + '</span></button>' +
						'<div class="rogue-blessing-refresh">' + button('refreshBlessing', String(index), '刷新 ' + option.refreshes + ' 次',
							busy || option.chosen || !option.refreshes, fa('refresh')) + '</div></article>';
				});
				html += '</div><p class="rogue-caption rogue-blessing-note">每张卡片独立刷新，品质保持不变。<br />' +
					'固定首领包括固定幻想精英、馆主、天王、冠军及最终首领；普通遭遇包括野生宝可梦、随机野生精英和事件 NPC。' +
					'加级按每次领取累加，允许超过 100 级；命运赠送的祝福不重复加级，捕捉后移除祝福造成的等级。</p>';
				if (run.floor === 1) html += '<p class="rogue-caption">本层通过祝福获得的伙伴均为 5 级。</p>';
			}
			return html;
		},
		renderBlessings: function (run, busy) {
			var state = run.blessings;
			if (!state) return '';
			var html = '<section class="rogue-owned-blessings"><h3>' + fa('star') + '本局祝福</h3><div class="rogue-resource-panel">' + resourceMeter('幻想碎片', state.shards, 100, '每次幻想化需 100 片，可继续积攒');
			if (state.candy || run.team.some(function (mon) { return idOf(mon.set.species) === 'meltan'; })) html += resourceMeter('美录坦糖果', state.candy, 400);
			if (state.owned.some(function (b) { return b.family === 'swords'; })) html += resourceMeter('圣剑使用', state.swordUses, ((state.swordRewards || []).length + 1) * 15, '达到目标可领取锋锐');
			if (state.owned.some(function (b) { return b.family === 'psychic'; })) html += resourceMeter('灵能', state.psychic, 100, '', '%');
			if (state.dogBoosts !== undefined) html += '<p><strong>汪汪队立大功：</strong>当前犬科伙伴登场随机提升 ' + state.dogBoosts + ' 项不同能力各 1 级。</p>';
			if (state.shopping) html += resourceMeter('消费升级', state.shopping.progress, state.shopping.threshold, '累计消费 ' + state.shopping.total + ' 金币 · 达标返还全队经验');
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
			html += '</div><p class="rogue-caption">祝福累计加级：固定首领 +' + (state.bossLevels === undefined ? state.levels : state.bossLevels) +
				' 级 · 普通遭遇 +' + state.levels + ' 级。祝福和任务进度会随存档保存。</p>';
			if (!state.owned.length) html += '<p>第一层开战前，以及通关第 50、100、150 层后各选择一轮祝福，共四轮；基拉祈每轮可选两项。</p>';
			state.owned.forEach(function (entry) {
				html += '<details data-rogue-key="blessing-' + escape(entry.id) + '" class="rogue-owned-blessing rogue-blessing-' + entry.tier + '"><summary>' + escape(entry.name) +
					(entry.progress !== undefined ? ' · ' + entry.progress + (entry.family === 'starquest' ? ' 次击倒' : ' / 15 区域') : '') +
					(entry.completed ? ' · 已完成' : '') + '</summary><p>' + blessingText(entry.text) + '</p>' +
					(entry.targetName ? '<p>指定伙伴：' + escape(localName(entry.targetName)) + '</p>' : '');
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
				if (mon.fantasyForm && state.shards >= 100) html += button('blessingMemberAction', 'fantasize:' + mon.id, localName(mon.set.species) + ' · 幻想化', locked);
				if (idOf(mon.set.species) === 'meltan' && state.candy >= 400) html += button('blessingMemberAction', 'meltanevolve:' + mon.id, '美录坦 · 糖果进化', locked);
				var species = idOf(mon.set.species);
				if (['cobalion', 'terrakion', 'virizion'].indexOf(species) >= 0 && state.swordRewards.indexOf(species) < 0 &&
					state.swordUses >= (state.swordRewards.length + 1) * 15) html += button('blessingMemberAction', 'swordreward:' + mon.id,
					localName(mon.set.species) + (mon.canReceiveSharpness === false ? ' · 已拥有锋锐' : ' · 领取锋锐'), locked || mon.canReceiveSharpness === false);
			});
			Object.keys(state.teraShards || {}).forEach(function (type) {
				html += '<details><summary><strong>' + escape(localName(type)) + '太晶碎片</strong>：' + state.teraShards[type] + '</summary>' +
					resourceMeter(localName(type) + '太晶碎片', state.teraShards[type], 50, '每次更改属性需 50 片，可继续积攒') + '<p>消耗 50 片，为以下伙伴更改太晶属性：</p>';
				run.team.forEach(function (mon) {
					html += button('changeTera', mon.id + ':' + type, localName(mon.set.species), locked || !run.teraUnlocked ||
						state.teraShards[type] < 50 || mon.set.teraType === type);
				});
				html += '</details>';
			});
			return html + '</section>';
		},
		openFusion: function () { app.addPopup(globals.RogueFusionPopup, {room: this}); },
		unfuseMember: function (id) { app.addPopup(globals.RogueCardConfirmPopup, {room: this, action: 'unfusion', details: {member: id}, text: '解除融合，恢复两位伙伴；第一位保留融合期间获得的经验。队伍已满时，需要安置第二位；已有箱子且有空位时会自动暂存。再次融合需要通关 10 层。'}); },
		changeTera: function (value) {
			var parts = value.split(':');
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
            if (this.screen !== 'game' || this.pending || !run || !editable(run) || run.healingLocked || app.curRoom && app.curRoom !== this) return;
            if (app.popups && app.popups.length) return;
            var seen = this.evolutionPrompts || (this.evolutionPrompts = {});
            var mon = run.team.find(function (m) { return m.evolutionNotice && !seen[run.id + m.id + m.set.species + m.set.level] && (m.evolutionDetails || []).some(function (e) { return e.ready; }); });
            if (!mon) return;
            seen[run.id + mon.id + mon.set.species + mon.set.level] = true;
            app.addPopup(globals.RogueEvolutionNoticePopup, {room: this, member: mon.id, species: mon.set.species});
        },
        renderFishing: function (event, busy) {
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
                '<div><p>滑块进入亮色区间时</p>' + button('fishingTap', '', '收线', busy) + '</div></div></div>' +
                '<div class="rogue-fishing-progress"><i></i></div><p class="rogue-fishing-feedback" aria-live="polite">成功 ' + event.fishing.hits + ' / 6 次 · ' + escape(event.fishing.feedback || '盯紧浮标，准备收线。') + '</p>' +
                '';
        },
        fishingTap: function () { var run = this.state.run; if (run && run.event && run.event.fishing) this.submit('event', {member: run.event.key, value: 'fishtap'}); },
        startFishingClock: function () {
            if (typeof requestAnimationFrame !== 'function') return;
            if (this.fishingFrame) cancelAnimationFrame(this.fishingFrame);
            var run = this.state && this.state.run, event = run && run.event, self = this;
            if (this.screen !== 'game' || !event || !event.fishing || event.stage !== 'choice') return;
            var fish = event.fishing, offset = fish.now - Date.now(), root = this.$el[0];
            if (!root) return;
            function tick() {
                if (self.screen !== 'game' || !root.querySelector('.rogue-fishing')) return;
                var now = Date.now() + offset, period = 2400 / (1 + fish.hits * 0.08);
                var phase = (fish.travel + Math.max(0, now - fish.anchor) * 2 / period) % 2;
                var cursor = phase <= 1 ? phase : 2 - phase;
                var progress = Math.max(0, Math.min(1, (now - fish.started) / 14000 - fish.hits * 0.04 + fish.misses * 0.035));
                root.querySelector('.rogue-fishing-cursor').style.top = cursor * 100 + '%';
                var zone = root.querySelector('.rogue-fishing-zone'); zone.style.top = (fish.center - fish.width / 2) * 100 + '%'; zone.style.height = fish.width * 100 + '%';
                root.querySelector('.rogue-fishing-progress i').style.transform = 'scaleX(' + progress + ')';
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
		startActivityClock: function () {
			var self = this, event = this.state && this.state.run && this.state.run.event;
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
				html += rivalArt ? '<span class="rogue-companion-portrait rogue-event-rival' + (event.rivalApproval ? ' smiling' : '') + '"' + affection + ' style="' + portraitStyle(event.rivalPortrait) + '"></span>' : '<img class="rogue-rival-native"' + affection + ' src="' + escape(Dex.resolveAvatar(event.rivalPortrait)) + '" alt="劲敌" />';
			}
			html += '</div>';
			if (event.silhouette) html += '<div class="rogue-quiz-silhouette" aria-label="宝可梦剪影" style="' + Dex.getTeambuilderSprite({species: event.silhouette}) + '"></div>';
			if (event.activity && event.stage === 'choice') html += '<div class="rogue-activity-track" aria-label="节拍轨道，中央绿色区域为命中区"><span class="rogue-activity-zone"></span><b class="rogue-activity-beat"></b></div><p class="rogue-activity-time">12.0 秒</p>';
			if (event.ski && event.stage === 'choice') return html + this.renderSki(event, busy) + '</article>';
			if (event.fishing && event.stage === 'choice') return html + this.renderFishing(event, busy) + '</article>';
			if (event.auction) html += '<section class="rogue-auction-board"><h4>本场拍品</h4><p>' + dialogueText(event.auction.catalog) +
				'</p><div class="rogue-auction-budgets">' + event.auction.npcs.map(function (npc) {
					return '<div><strong>' + escape(npc.name) + '</strong><span>剩余预算 <b>' + Number(npc.budget) + '</b> 金币</span></div>';
				}).join('') + '</div></section>';
			if (event.preview) {
				var preview = event.preview;
				html += '<div class="rogue-event-preview"><strong>' + escape(localName(preview.before)) + ' → ' + escape(localName(preview.after)) + '</strong>' +
					'<div class="rogue-event-form-sprite" style="' + Dex.getTeambuilderSprite({species: preview.after}) + '"></div>' +
					'<p>属性：' + preview.types.map(localName).join(' / ') + ' · 特性：' + escape(localName(preview.ability)) + '</p><p>' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' ' + preview.stats[stat]; }).join(' / ') + '</p>' +
					'<p>变化后 HP：' + preview.hp + ' / ' + preview.maxhp + '，不会复活濒死伙伴。</p><p>移除不合法招式：' +
					(preview.removed.map(function (id) { return escape(localName(Dex.moves.get(id).name, 'move')); }).join('、') || '无') + '</p><p>新增当前等级招式：' +
					(preview.added.map(function (id) { return escape(localName(Dex.moves.get(id).name, 'move')); }).join('、') || '无') + '</p><p>转换后携带招式：' +
					(preview.equipped || []).map(function (id) { return escape(localName(Dex.moves.get(id).name, 'move')); }).join('、') + '</p></div>';
			}
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
						(busy || option.disabled ? ' disabled' : '') + '><strong>' + escape(eventText(option.name) + recommendations(option.id)) + '</strong><small>' + escape(eventText(option.text)) + '</small></button>';
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
						'<div class="rogue-new-move">' + moveRow(pending.move) + '</div><p>选择替换位置。替换下来的招式会保留在可更换列表中。</p>';
					learner.set.moves.forEach(function (move, i) {
						html += '<div class="rogue-choice-row">' + moveRow(move, learner.pp[i]) +
							button('learnMove', String(i), '替换此招式', busy) + '</div>';
					});
					html += '<p>' + button('learnMove', 'skip', '暂不装备，保留在可更换列表', busy) + '</p></section>';
				}
			}
			return html;
		},
		renderFloor: function (run, busy) {
			var html = '<section class="rogue-floor" aria-label="本层操作">';
			if (run.preview && run.preview.stage === 'result') {
				var name = run.preview.trainer === 'sada' ? '奥琳 AI' : '弗图 AI';
				return html + '<h3>' + name + ' · 预演' + (run.preview.won ? '获胜' : '结束') + '</h3><p>' +
					(run.preview.won ? '「可以完美复现这次预演。你要接受这个结果吗？」接受后保留预演中的消耗，并结算胜利与成长。' : '「这次预演没有成功。已经排除预演中的损耗，请由你亲自挑战。」') + '</p>' +
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
				html += '<div class="rogue-receipt"><strong>' + fa('check-circle') + (run.lastReward.money < 0 ? '已结算' : '已到账') + ' · 第 ' + run.lastReward.floor + ' 层' +
					(run.lastReward.encounter ? ' · 第 ' + run.lastReward.encounter + ' 场' : '') + '</strong>' +
					loot(run.lastReward, this.state.items) + '</div>';
			}
			if (run.pendingCapture) {
				html += '<h3>队伍已满 · ' + (run.returningPartner ? '迎接修行伙伴' : '安置新伙伴') + '</h3><p>' +
					(run.returningPartner ? '修行归来的 ' : run.phase === 'intro' ? '塔灵赠送了 ' : '捕获了 ') + escape(localName(run.pendingCapture.set.species)) +
					' Lv.' + run.pendingCapture.set.level + (run.returningPartner ? '。请选择安置方式，再继续旅程。' : run.phase === 'intro' ? '。等级固定为 40。' : '。捕捉解锁已保存。') + '</p><p>';
				html += '</p><div class="rogue-member-choices">' + run.team.map(function (mon) { return memberChoice('replaceMember', mon.id, mon, busy, '替换这位伙伴'); }).join('') + '</div>';
				html += '<div class="rogue-partner-actions">' + button('replaceMember', 'release', run.returningPartner ? '告别这位伙伴' : '放生', busy) + '</div>';
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
				html += this.renderEvent(run, busy);
			} else if (run.phase === 'choose') {
				html += '<h3>选择本层路线</h3><span class="rogue-caption">点击卡片选中，再点一次进入</span><div class="rogue-routes">';
				(run.choices || []).forEach(function (node) {
					var selected = this.selectedRoute === node.id;
					html += '<button type="button" name="chooseRoute" value="' + escape(node.id) + '" class="rogue-route rogue-route-' + routeTone(node.kind) +
						(selected ? ' is-selected' : '') + '" aria-pressed="' + selected + '"' + (busy ? ' disabled' : '') + '>' + routeVortex() + routeEmblem(node.kind) +
						'<strong class="rogue-route-type">' + escape(routeNames[node.kind] || kindNames[node.kind] || node.kind) + '</strong><span class="rogue-route-subtitle">' + escape((node.kind === 'trainer' ? '与人对战' : node.name) + recommendedLabel(run, node.id)) + '</span><small>' +
						(node.biome ? 'Lv.' + (node.biome.level + (run.blessings ? run.blessings.levels : 0)) +
							(run.blessings && run.blessings.levels ? '（含祝福 +' + run.blessings.levels + '）' : '') + ' · ' + (node.biome.tier * 20) + '～' +
							(node.biome.tier * 20 + 20) + ' 档宝可梦池' : '') +
						'</small><span class="rogue-caption">' + (node.fogged ? '路线与收益被迷雾遮蔽' : node.wildLoot ? '本层战利品 · 每场结束入包' : node.kind === 'trade' ? '选购专门商品 · 可以直接离开' : node.kind === 'event' ? '进入后揭晓事件，选择会影响收益与风险' : '整层完成奖励') + '</span>' +
						('<span class="rogue-route-description">' + (node.kind === 'trade' ? '商品数量有限，库存不会随刷新改变。' : node.kind === 'trainer' ? '前方的遭遇尚不明朗。' : node.kind === 'elite' ? '挑战精英，可能获得战利品与经验糖果。' : node.kind === 'wild' ? '野生对战，可能获得战利品。' : node.kind === 'reward' ? '获得回复与复活物资，也可能带回其他旅途补给。' : '') + '</span>') +
						'<span class="rogue-route-hint">' + (selected ? '已选中 · 再点一次进入' : '点击选中') + '</span></button>';
				}, this);
				html += '</div>';
				if (!(run.choices || []).length) html += '<p>本层内容等待配置，存档已保留。</p>';
			} else if (run.phase === 'ready') {
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
				html += '<h3>' + (run.retreating ? '正在保存逃跑后的状态…' : '战斗进行中') + '</h3>' +
					button('joinRoom', run.roomid, '返回当前战斗', !run.roomid) + button('act', 'retreat', '逃跑', busy || run.retreating);
			} else if (run.phase === 'failed') {
				html += '<h3>连续挑战失败</h3><p>本层不允许途中治疗。重新挑战会恢复入层时的队伍和资源，已保存的捕捉解锁保留。</p>' +
					button('act', 'retry', '免费重试整层', busy);
			} else if (run.phase === 'rest' && run.node && run.node.kind === 'trade') {
				html += '<h3>' + escape(run.node.name) + '</h3><p>欢迎来到' + escape(run.node.name) + '！</p>' +
					button('act', 'continue', '交易完成，进入下一层', busy);
			} else if (run.phase === 'rest') {
				if (run.mentorOffer) {
                    html += '<section class="rogue-mentor-cards"><h3>老人递来的三张卡片</h3><p>选择一张，陪你迎战第 ' + run.mentorOffer.floor + ' 层首领。战胜后消散，重试时保留。</p><div class="rogue-routes">';
                    run.mentorOffer.cards.forEach(function (card) {
                        html += '<button class="rogue-route rogue-route-blue rogue-mentor-card" name="chooseMentorCard" value="' + card.id + '"' + (busy ? ' disabled' : '') + '><span class="rogue-route-emblem">' + fa(card.id === 'attack' ? 'bolt' : card.id === 'guard' ? 'shield' : 'star') + '</span><strong>' + escape(card.name) + '</strong><p class="rogue-route-description">' + escape(card.text) + '</p><span class="rogue-route-hint">收下这张卡片</span></button>';
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
					'<p>全队已恢复，通关卡已保存。挑战胜利额外获得 <strong>20 点局外成长点数</strong>；失败或放弃挑战仍正常进入结局。</p>' +
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
			if (mon.compound) html += '<p class="rogue-caption">【五号化合物】新增种族值已计入。锁定最终形态：【' + escape(localName(mon.compound.finalSpecies)) + '】；主特性为【化学之力】。</p>';
			if (mon.evRespec) html += '<p>事件允许重新分配一次：请保留总计 ' + mon.evRespec.total + ' 点。</p>' +
				button('applyEVs', '', '保存本次努力值分配', locked);
			else html += '<p class="rogue-caption">' + fa('lock') + '努力值平时不可修改；特殊事件开放后，可在这里重新分配。</p>';
			return html;
		},
		renderEditor: function (run, busy) {
			var mon = this.selectedPokemon();
			if (!mon) return '';
			this.selectedMember = mon.id;
			var locked = busy || !editable(run);
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
					'</span><small>' + (member.egg ? '距孵化 ' + member.remainingFloors + ' 层' : 'Lv.' + member.set.level + ' · ' + (member.hp ? 'HP ' + member.hp + '/' + member.maxhp : '已倒下')) + '</small></button>';
			});
			html += '</div><div class="rogue-member-toolbar"><span><strong>' + escape(localName(mon.set.species)) + '</strong>' +
				((mon.evolutionDetails || []).some(function (evo) { return evo.ready; }) ?
					'<button class="button rogue-evolution-trigger" name="showEvolutionChoices" value="' + escape(mon.id) + '"' +
					(locked || run.healingLocked ? ' disabled' : '') + '>↑ 可进化</button>' : '') + '</span><span>' +
				button('moveMember', '-1', '前移', locked || run.team[0] === mon, fa('arrow-left')) +
				button('moveMember', '1', '后移', locked || run.team[run.team.length - 1] === mon, fa('arrow-right')) + '</span></div>';
			if (mon.egg) return html + '<div class="rogue-floor"><h4>宝可梦蛋</h4><p>蛋里偶尔传来轻轻的响声。再前进 <b>' + mon.remainingFloors + '</b> 层，就能与新伙伴相见。</p></div></section>';
			html += '<div class="rogue-member-sheet"><div class="rogue-identity">' +
				'<div class="rogue-sprite-frame"><div class="rogue-sprite" role="img" aria-label="' + escape(localName(mon.set.species)) + '" style="' +
				(typeof Dex.getTeambuilderSprite === 'function' ? Dex.getTeambuilderSprite(mon.set) : '') + '"></div></div>' +
				'<div>' + typeIcons(mon.types || species.types) + '</div>' + (mon.stars > 1 || run.spirit && run.spirit.id === 'zygarde' ? '<b class="rogue-stars">' + '★'.repeat(mon.stars || 1) + '</b>' : '') +
				'<strong>HP ' + mon.hp + ' / ' + mon.maxhp + '</strong>' +
				'<meter min="0" max="' + mon.maxhp + '" value="' + mon.hp + '" aria-label="生命值"></meter>' +
				'<small>' + statusBadges(mon) + '</small></div>';
			var exp = mon.experienceProgress;
			var ability = dex().abilities ? dex().abilities.get(mon.set.ability || '') : {name: mon.set.ability || ''};
			var item = this.state.items.filter(function (entry) { return entry.id === idOf(mon.set.item); })[0];
			var emblem = this.state.items.filter(function (entry) { return entry.id === mon.emblem; })[0];
			var nature = localName(mon.mintNature || mon.set.nature || '—');
			var natureParts = nature.split(/\s*(?=[（(])/);
			html += '<div class="rogue-member-details"><div class="rogue-details-line"><span>等级<br /><b>' + mon.set.level +
				'</b></span><span>性别<br /><b>' + escape({M: '雄性', F: '雌性'}[mon.set.gender] || '无性别') + '</b></span><span class="rogue-nature">性格<br /><b>' +
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
				var move = mon.set.moves[i] && dex().moves.get(mon.set.moves[i]);
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
			if (mon.bond !== undefined) growth.push('羁绊 ' + mon.bond + ' / 100');
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
						(equipped >= 0 ? '<span class="rogue-move-slot" title="已装备 · 第 ' + (equipped + 1) + ' 位">' + (equipped + 1) + '</span>' : '') + moveRow(move.id, move) +
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
				this.state.items.filter(function (entry) { return entry.kind === 'emblem' && run.bag[entry.id] > 0; }).forEach(function (entry) {
					html += '<div class="rogue-option"><strong>' + itemIcon(entry) + escape(localName(entry.name)) + ' ×' + run.bag[entry.id] +
						'</strong><p>' + escape(itemDescription(entry)) + '</p>' + button('equipEmblem', entry.id, '赋予属性转', locked) + '</div>';
				});
			} else if (panel === 'items') {
				html += '<h4>选择携带道具</h4><p class="rogue-caption">从背包取出，替换下来的道具回到背包。</p>' +
					button('equipItem', '', '卸下当前道具', locked || !mon.set.item);
				this.state.items.filter(function (entry) { return entry.kind === 'held' && run.bag[entry.id] > 0; }).forEach(function (entry) {
					html += '<div class="rogue-option"><strong>' + itemIcon(entry) + escape(localName(entry.name)) + ' ×' + run.bag[entry.id] +
						'</strong><p>' + escape(itemDescription(entry)) + '</p>' + button('equipItem', entry.id, '携带', locked) + '</div>';
				});
			} else {
				html += this.renderStats(mon, locked) + '<div class="rogue-permanent-gains"><p class="rogue-boosts">局外能力加成：' +
					Object.keys(statNames).map(function (stat) { return statNames[stat] + ' +' + run.boosts[stat]; }).join(' / ') + '</p>' +
					this.renderRunTraining(run) + '</div>';
			}
			html += '</div><div class="rogue-evolution-details"><h4>进化条件' +
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
			var held = this.state.items.filter(function (item) { return item.kind !== 'treasure' && run.bag[item.id] > 0; });
			held.forEach(function (item) {
				html += '<div class="rogue-item-card"><div class="rogue-item-heading">' + itemIcon(item) + '<strong>' + escape(localName(item.name)) +
					'</strong><b>×' + run.bag[item.id] + '</b></div><small>' + escape(item.category || (item.kind === 'mint' ? '性格薄荷' : item.kind === 'machine' ? '招式学习机' : itemKinds[item.kind])) + '</small><p>' + escape(itemDescription(item)) + '</p>';
				if (['ball', 'evolution', 'held', 'emblem'].indexOf(item.kind) < 0) {
					var reason = !target ? '请选择目标' : target.egg ? '蛋尚未孵化' : '';
					if (target && !target.egg) {
						if (item.kind === 'heal') reason = !target.hp ? '需先复活' : target.hp >= target.maxhp ? 'HP 已满' : '';
						if (item.kind === 'revive') reason = target.hp ? '仅能复活濒死伙伴' : '';
						if (item.kind === 'cure') reason = !target.hp ? '需先复活' : !canCure(item, target) ? '无对应异常状态' : '';
						if (item.kind === 'ether') reason = !target.hp ? '需先复活' : !target.pp.some(function (slot) { return slot.pp < slot.maxpp; }) ? 'PP 已满' : '';
						if (item.kind === 'crown') reason = Object.keys(statNames).every(function (stat) { return target.set.ivs[stat] >= 31; }) ? '个体值已满' : '';
						if (item.kind === 'mint') reason = target.mintNature === item.nature ? '已生效' : '';
						if (item.kind === 'tonic') reason = target.tonics && target.tonics[item.id.replace(/^rogue/, '')] ? '已生效' : '';
						if (item.kind === 'ability') reason = target.abilityChanges && target.abilityChanges[item.id] ? '' : '没有可变更的特性';
						if (item.kind === 'machine') reason = (target.machineMoves || []).indexOf(item.move) < 0 ? '无法学习或已经掌握' : '';
						if (item.kind === 'candy') reason = !target.hp ? '需先复活' : target.fixedLevel || !target.uncappedLevel && target.set.level >= 100 ? '无法获得经验' : '';
						if (item.kind === 'effort') reason = target.set.evs[item.stat] >= 252 || Object.keys(statNames).reduce(function (sum, stat) {
							return sum + (target.set.evs[stat] || 0);
						}, 0) >= 510 ? '基础点数已达上限' : '';
					}
					html += button('useItem', item.id, reason || (item.kind === 'ability' ? '变更为' + localName(target.abilityChanges[item.id]) : '使用'), !usable || !!reason);
				}
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
					'<span class="rogue-caption"> 胜利获得三种商品；无论胜负，本店随后关闭。</span></p>';
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
				html += this.renderCompanions(run, busy);
				html += '<p class="rogue-tera rogue-system-status">' + fa(run.teraUnlocked ? 'diamond' : 'lock') + '太晶化：' +
					(run.teraUnlocked ? '本局已解锁，每场战斗限用一次。' : '未解锁，可通过预定祝福或第 100 层馆主赠礼解锁。') + '</p>' +
					'<p class="rogue-system-status">超进化：' + (run.megaUnlocked ? '已解锁' : '未解锁') + ' · 超巨进化：' + (run.gmegaUnlocked ? '已解锁' : '未解锁') + ' · Z 招式：' + (run.zUnlocked ? '已解锁' : '未解锁') +
					'。普通超级石与 Z 纯晶需先解锁系统，再携带使用。</p>' +
					this.renderDragonKing(run, busy) + this.renderEditor(run, busy) + this.renderBox(run, busy) + this.renderBag(run, busy);
				if (run.notices && run.notices.length) html += '<details class="rogue-notices"><summary>本次战斗的经验与成长明细</summary><ul>' +
					run.notices.map(function (notice) { return '<li>' + escape(noticeText(notice)) + '</li>'; }).join('') + '</ul></details>';
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
		renderGrowth: function (account, run, busy) {
			var ongoing = run && run.phase !== 'complete';
			var html = '<h3>' + fa('star') + '局外成长 · 余额 ' + account.points + ' 点</h3><p>新玩家首次建档获赠 20 点。每战胜一次塔内首领 获得 1 点；神之挑战胜利额外获得 20 点。购买后从下一次冒险生效。</p>';
			if (ongoing) {
				html += '<p class="infobox">' + fa('lock') + '当前冒险进行中，结束或放弃本局后开放加点和初始栏位购买。</p>';
			} else {
				html += '<div class="rogue-upgrades">';
				Object.keys(statNames).forEach(function (stat) {
					var cost = account.statCosts ? account.statCosts[stat] : account.boosts[stat] + 1;
					html += '<p>' + statNames[stat] + ' +' + account.boosts[stat] + ' / 10 ' +
						(account.boosts[stat] >= 10 ? '<strong>已达上限</strong>' :
							button('act', 'upgrade:' + stat, '花费 ' + cost + ' 点提升', busy || account.points < cost)) + '</p>';
				});
				var slotCost = account.slotCost === undefined ? account.slots * 20 : account.slotCost;
				html += '</div><p class="rogue-caption">六项能力分别计价：每项依次花费 1～10 点，提升至上限共需 55 点。</p><p>初始栏位 ' + account.slots + ' / 6 ' + (account.slots >= 6 ? '<strong>已扩展至上限</strong>' :
					button('act', 'upgrade:slot', '花费 ' + slotCost + ' 点扩展', busy || account.points < slotCost)) +
					'</p><p class="rogue-caption">每次扩展费用增加 20 点：20 / 40 / 60 / 80 / 100 点。</p>';
			}
			return html;
		},
		renderStartMenu: function () {
			var state = this.state, run = state && state.run;
			var hint = run && run.phase !== 'complete' ? '继续存档 · 第 ' + run.floor + ' 层' : '选择伙伴，开启一段新的旅途';
			return '<section class="rogue-start-menu" aria-label="幻想杯肉鸽开始界面">' +
				'<div class="rogue-start-heading"><span class="rogue-caption">一座塔，无数种可能</span><h2>你的幻想，从这里开始</h2>' +
				'<p>与宝可梦同行，发现每次旅途的不一样。</p></div>' +
				'<button class="rogue-start-primary" name="enterGame">' +
				'<span class="rogue-start-symbol" aria-hidden="true">' + fa('compass') + '</span><span><strong>开始你的幻想杯肉鸽之旅</strong><small>' +
				escape(hint) + '</small></span><span class="rogue-start-arrow" aria-hidden="true">→</span></button>' +
				'<div class="rogue-start-books">' + [
					['guide', 'book', '幻想杯图鉴', '认识幻想杯', '玩法入门 · 幻想宝可梦\n招式、特性与道具'],
					['blessings', 'diamond', '祝福图鉴', '收集旅途的力量', '白银 · 黄金 · 棱彩\n回顾已经获得的祝福'],
					['events', 'map-signs', '事件图鉴', '重温塔中的见闻', '每次选择，都是故事\n翻阅已经经历的事件'],
				].map(function (entry) {
					return '<button class="rogue-start-book book-' + entry[0] + '" name="openCodex" value="' + entry[0] + '">' +
						'<span class="rogue-book-emblem" aria-hidden="true">' + fa(entry[1]) + '</span><strong>' + entry[2] + '</strong>' +
						'<span>' + entry[3] + '</span><small>' + entry[4].replace('\n', '<br />') + '</small><b aria-hidden="true">翻开图鉴 ↗</b></button>';
				}).join('') + '</div><p class="rogue-start-note">旅途进度自动保存；进入后可随时返回开始页。</p></section>';
		},
		renderCodex: function () {
			var section = this.screen, data = this.codices[section], titles = {guide: '幻想杯图鉴', blessings: '祝福图鉴', events: '事件图鉴'};
			var html = '<section class="rogue-codex"><div class="rogue-codex-heading"><span class="rogue-caption">旅途手册 / ' + titles[section] +
				'</span><h2>' + titles[section] + '</h2><button class="button rogue-codex-back" name="startMenu">' + fa('arrow-left') + '返回开始页</button></div>';
			if (!data) return html + '<p>正在翻开图鉴…</p></section>';
			if (data.codexSchema !== 3) html += '<p class="message-error" role="status">图鉴与当前客户端的版本不一致。请更新客户端并重启游戏服务，再刷新存档；仅刷新网页无法加载尚未运行的新内容。</p>';
			if (data.preview) html += '<p class="rogue-caption">本地测试：全部条目完整展示，不改变存档的实际解锁记录。</p>';
			if (section === 'events' && this.codexReplay) {
				var replay = this.codexReplay, history = this.codexReplayHistory, page = replay.pages[history[history.length - 1]];
				var replayPortrait = page.portrait || replay.portrait;
				var replayArt = replayPortrait ? '<div class="rogue-reading-portrait">' +
					(portraitFile(replayPortrait) ? '<span class="rogue-companion-portrait" style="' + portraitStyle(replayPortrait) + '"></span>' :
					'<img alt="" src="' + escape(Dex.resolveAvatar(replayPortrait)) + '" />') + '</div>' : '';
				return html + button('closeEventReplay', '', '返回事件列表', false, fa('arrow-left')) +
					'<article class="rogue-event-reading"><span class="rogue-caption">文字回顾 · 可探索不同分支</span><h3>' + escape(replay.title) + '</h3>' +
					'<p class="rogue-reading-note">不消耗资源、不发放奖励，不影响当前冒险。奖励数量随实际冒险楼层变化。</p>' +
					replayArt +
					page.text.map(function (paragraph) { return '<p>' + escape(paragraph) + '</p>'; }).join('') +
					(page.battleSkipped ? '<p class="rogue-reading-skip">' + fa('forward') + '战斗画面已跳过，可继续查看结果。</p>' : '') +
					'<div class="rogue-reading-options">' + page.options.map(function (option) {
						return button('replayEventNext', option.next, option.label);
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
				if (section === 'events') html += '<nav class="rogue-codex-collections" aria-label="事件图鉴分册">' +
					[['regions', 'map-signs', '区域事件', '事件 · 奖励 · 遭遇 · 交易 · 奇遇'], ['companions', 'users', '训练家图鉴', '同行 · 道馆 · 天王与冠军 · 反派 · 其他人物']].map(function (entry) {
						var selected = (people ? 'companions' : 'regions') === entry[0];
						return '<button class="button' + (selected ? ' is-active' : '') + '" name="selectCodexCollection" value="' + entry[0] +
							'" aria-pressed="' + selected + '">' + fa(entry[1]) + '<span><strong>' + entry[2] + '</strong><small>' + entry[3] + '</small></span></button>';
					}).join('') + '</nav>';
				filters = section === 'blessings' ? [['all', '全部'], ['silver', '白银'], ['gold', '黄金'], ['prismatic', '棱彩'], ['unlocked', '已解锁']] :
					people ? [['all', '全部人物'], ['companion', '同行训练家'], ['rival', '劲敌'], ['gym', '道馆馆主'], ['elitefour', '天王'], ['champion', '冠军'], ['antagonist', '反派人物'], ['other', '其他人物']] :
					[['all', '全部区域'], ['ecology', '战斗、精英生态区域'], ['event', '事件'], ['reward', '奖励'], ['encounter', '遭遇'], ['trade', '交易'], ['adventure', '奇遇'], ['unlocked', '已经历']];
				entries = section === 'events' ? data.entries.filter(function (entry) { return (['companion', 'trainer'].indexOf(entry.category) >= 0) === people; }) : data.entries;
				var unlocked = entries.filter(function (entry) { return entry.unlocked; }).length;
				html += '<p class="rogue-codex-progress">' + (people ? '已遇见 ' : data.preview ? '可查看 ' : section === 'blessings' ? '已解锁 ' : '已经历 ') + '<b>' + unlocked + ' / ' + entries.length +
					'</b><span>' + (section === 'blessings' ? '按名称拼音首字母排列。+／++／+++ 分别对应第 50／100／150 层版本，获得过的祝福可查看全部版本。' : people ? '收录拥有立绘的人物；同一角色可按不同身份查看。遇见后解锁完整介绍，同行条目列出偏好与赠礼。' : '进入过的区域事件会收入图鉴，可以重读文字分支。') + '</span></p>';
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
			if (section !== 'blessings' && this.codexFilter !== 'beginner') {
				var collator = new Intl.Collator('zh-CN-u-co-pinyin', {sensitivity: 'base', ignorePunctuation: true, numeric: true});
				entries.sort(function (a, b) {
					if (moveGroup && (a.origin === 'original') !== (b.origin === 'original')) return a.origin === 'original' ? 1 : -1;
					var ar = /^rival:([^:]+):(\d+)$/.exec(a.id), br = /^rival:([^:]+):(\d+)$/.exec(b.id);
					if (ar && br) return collator.compare(a.name.split('·')[0], b.name.split('·')[0]) || Number(ar[2]) - Number(br[2]);
					return collator.compare(localName(a.name, entryKind), localName(b.name, entryKind)) || collator.compare(a.id, b.id);
				});
				html += '<p class="rogue-caption">按中文名称拼音首字母排列。</p>';
			}
			if (section === 'events') entries.sort(function (a, b) { return Number(b.category === 'ecology') - Number(a.category === 'ecology'); });
			if (active === 'ecology') html += '<p class="rogue-caption">黑色剪影表示尚未在该生态捕捉；其他地方的捕捉不会点亮这里。出现过的生态在后续 5 层暂不刷新。</p>';
			var pageSize = section === 'events' && active === 'ecology' ? 4 : 12;
			var total = Math.max(1, Math.ceil(entries.length / pageSize)); this.codexPage = Math.min(this.codexPage, total - 1);
			var lastMoveOrigin = '';
			html += '<div class="rogue-codex-grid">' + entries.slice(this.codexPage * pageSize, (this.codexPage + 1) * pageSize).map(function (entry) {
				var tier = {silver: '白银', gold: '黄金', prismatic: '棱彩'}[entry.tier];
				var icon = section === 'guide' ? (active === 'pokemon' ? '<span class="picon" style="' + Dex.getPokemonIcon(entry.name) + '"></span>' :
					(['items', 'exclusive'].indexOf(active) >= 0 || active === 'special' && entry.icon) ? itemIcon(entry) : fa('trophy')) : fa(section === 'events' ? 'map-signs' : blessingIcon(entry));
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
				return groupTitle + '<article data-codex-family="' + escape(entry.family || '') + '" class="rogue-codex-entry tier-' + (entry.tier || 'plain') + (entry.unlocked === false ? ' is-locked' : '') + '">' +
					'<div class="rogue-codex-entry-top"><span>' + icon + '</span><small>' + (tier ? tier + '阶' : section === 'events' ? (['companion', 'trainer'].indexOf(entry.category) >= 0 ? '训练家' : kindNames[entry.category || 'event']) : '幻想杯') +
					'</small>' + (entry.unlocked === false ? '<span class="rogue-codex-lock">' + fa('lock') + (trainerEntry ? '尚未遇见' : '未解锁') + '</span>' : trainerEntry ? '<span class="rogue-codex-seen">' + fa('check') + '已遇见过</span>' : '') + '</div>' +
					'<div class="rogue-codex-title"><h3>' + escape(localName(entry.name, entryKind)) + '</h3>' +
					(section === 'blessings' ? (entry.floors && entry.floors.length ? ['仅第 ' + entry.floors.join('、') + ' 层出现'] : []).concat(entry.availability || []).map(function (note) {
						return '<small class="rogue-blessing-restriction">' + escape(note) + '</small>';
					}).join('') : '') + '</div>' + body + (section === 'events' && entry.unlocked && entry.replay ?
					button('readEvent', entry.id, '回顾这段见闻', false, fa('book')) : '') + '</article>';
			}).join('') + '</div>';
			if (!entries.length) html += '<p class="rogue-codex-empty">' +
				'这里还没有符合条件的记录。' + '</p>';
			return html + '<div class="rogue-codex-pagination">' + button('pageCodex', String(this.codexPage - 1), '上一页', this.codexPage === 0) +
				'<span>第 ' + (this.codexPage + 1) + ' / ' + total + ' 页 · ' + entries.length + ' 项</span>' +
				button('pageCodex', String(this.codexPage + 1), '下一页', this.codexPage + 1 >= total) + '</div></section>';
		},
		revealPendingMove: function () {
			var run = this.state && this.state.run, pending = run && (run.pendingMoves || [])[0];
			if (!pending) { this.revealedMove = null; return; }
			var key = JSON.stringify([run.id, pending.member, pending.move]);
			if (this.screen !== 'game' || key === this.revealedMove) return;
			var root = this.$el && this.$el[0], prompt = root && root.querySelector('.rogue-pending-move');
			if (!prompt) return; // Dialogue or another prompt may still cover the learning controls.
			// On narrow screens the party tab can hide the learning prompt in the main room.
			if (!root.clientHeight && !this.revealingMove && app.curRoom === app.rooms.fantasyrogueparty && app.focusRoom) {
				this.revealingMove = true;
				try { app.focusRoom(this.id); } finally { this.revealingMove = false; }
			}
			if (!root.clientHeight || key === this.revealedMove) return;
			this.revealedMove = key;
			// Commit immediately: a saved-state render can cancel a smooth scroll midway.
			if (root.scrollTo) root.scrollTo({top: 0, behavior: 'instant'});
			root.scrollTop = 0;
		},
		render: function (storyOnly) {
			var state = this.state;
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
				(this.screen !== 'home' ? button('startMenu', '', '开始页', false, fa('compass')) : '') + '</p>' +
				(this.screen === 'game' && state && state.run && !state.story && !state.run.companionInvitation ? this.renderPendingMove(state.run, busy) : '') +
				'<h2>幻想杯肉鸽</h2>' + (state && state.run && state.run.spirit ? '<p class="rogue-spirit-badge">' +
				button('showSpirit', '', state.run.spirit.name, false, '<span class="picon" style="' + Dex.getPokemonIcon(state.run.spirit.species) + '"></span>') +
				'<span class="rogue-caption">点击查看本局效果</span></p>' : '<p>原生对战 · 捕捉伙伴 · 逐层成长</p>');
			if (this.error) html += '<p class="message-error">' + escape(this.error) + '</p>';
			if (this.pending && this.error) html += '<p class="rogue-save-status">正在保存操作… ' + button('sendPending', '', '查询／重发同一请求') + '</p>';
			this.updateParty();
			if (this.screen !== 'game') {
				if (!state) html += '<p class="rogue-caption">正在读取服务器存档…</p>';
				else if (!state.account && state.message) html += '<p class="infobox">' + escape(state.message) + '</p>';
				stableHTML(this, html + (this.screen === 'home' ? this.renderStartMenu() : this.renderCodex()) + '</div>'); return;
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
			if (run && run.companionInvitation) {
				stableHTML(this, html + this.renderCompanionInvitation(run.companionInvitation, busy) + '</div>'); return;
			}
			if (state.storyEnabled && run && run.phase === 'complete') {
				if (run.postgame === 'won') html += '<p class="infobox">神之挑战成功！额外获得 20 点局外成长点数。</p>';
				html += '<h3>留在床头的卡片</h3><p>这次旅途已经留存。下一次醒来，会遇到什么呢？</p>';
				var card = state.pendingClear || (state.cards || []).find(function (entry) { return entry.runId === run.id; });
				if (card) html += clearCardHTML(card);
				html += state.pendingClear ? this.renderPendingClear(state.pendingClear, state.cards, busy) :
					'<p>' + (card ? card.public ? '通关卡已公开，可在展示页管理。' : '通关卡已私下收藏，可在展示页主动公开。' :
						'这次旅途已结束；本次通关卡未保留在收藏中。') + '</p>' + button('act', 'newstory', '开启新的篇章', busy);
				stableHTML(this, html + button('joinRoom', 'fantasyroguegallery', '前往通关卡展示') + '</div>'); return;
			}
			var ongoing = run && run.phase !== 'complete';
			if (run) html += '<h3 class="rogue-floor-heading">' + (run.phase === 'intro' ? '启程之前' : '第 ' + run.floor + ' / 200 层') + floorNodeHeading(run.node) +
				(run.time ? '<span class="rogue-time rogue-time-' + escape(run.time.id || '') + '" title="白天两层 → 黄昏一层 → 夜晚两层 → 黎明一层，循环交替">' + fa(run.time.name === '夜晚' ? 'moon-o' : 'sun-o') + escape(run.time.name) + '</span>' : '') +
				(run.floorEnvironment && (run.floorEnvironment.weather || run.floorEnvironment.terrain) ? '<span class="rogue-time rogue-environment" title="本层固定的天气／场地，也用于特殊进化判断">' + fa('cloud') + escape(run.floorEnvironment.name) + '</span>' : '') + '</h3>' +
				this.renderFloor(run, busy) + this.renderShop(run, busy);
			if (!ongoing) {
				html += '<h3>选择本次冒险的伙伴</h3><p class="rogue-caption">先选好队伍，再依次配置每一只宝可梦。</p>';
				if (account.spiritUnlocked) {
					html += '<p><label><input type="checkbox" name="useSpirit"' + (this.useSpirit ? ' checked' : '') + (busy ? ' disabled' : '') + ' /> 开启塔灵</label>' +
						'<span class="rogue-caption"> · 默认随机；使用某个塔灵通关 200 层后，可手动选择该塔灵' + (state.localSpirits ? ' · 本地可测试全部塔灵' : '') + '</span></p>';
					if (this.useSpirit) html += '<p><label>本次塔灵：<select name="selectedSpirit"' + (busy ? ' disabled' : '') +
						'><option value="">随机抽取（包含未通关塔灵）</option>' +
						(state.selectableSpirits || []).map(function (spirit) { return '<option value="' + escape(spirit.id) + '"' + (this.selectedSpirit === spirit.id ? ' selected' : '') + '>' +
							escape(spirit.name) + '（已通关）</option>'; }, this).join('') + '</select></label></p>';
					if (this.useSpirit && state.localSpirits) html += '<p><label>测试塔灵：<select name="testSpirit"><option value="">随机抽取</option>' +
						(state.spirits || []).map(function (spirit) { return '<option value="' + escape(spirit.id) + '"' + (this.testSpirit === spirit.id ? ' selected' : '') + '>' +
							escape(spirit.name) + '</option>'; }, this).join('') + '</select></label></p>';
				} else html += '<p class="rogue-caption">无塔灵通关 200 层，可解锁“开启塔灵”。</p>';
				html += '<p><strong class="rogue-starter-count" aria-live="polite">已选 ' + this.selectedStarters.length +
					' 只 · 已用 ' + this.starterSlotsUsed() + ' / ' + account.slots + ' 个初始名额</strong></p>' +
					'<p class="rogue-caption">普通伙伴占 1 格，传说宝可梦与幻之宝可梦占 4 格，一级神占 6 格。仅限制初始选择，旅途中仍可组成正常队伍。</p>' + typeFilter('starterType', this.starterType) + '<div class="rogue-starter-generations">';
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
				state.starters.filter(function (starter) {
					return starter.available && (!starterType || (starter.types || dex().species.get(starter.species).types).indexOf(starterType) >= 0);
				}).forEach(function (starter) {
					var gen = starter.gen || dex().species.get(starter.species).gen || 9;
					(generations[gen] || (generations[gen] = [])).push(starter);
				});
				Object.keys(generations).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (gen) {
					html += '<details data-rogue-key="starter-gen-' + gen + '"><summary>第 ' + gen + ' 世代 · ' + generations[gen].length + ' 只</summary><div class="rogue-starters">';
					generations[gen].forEach(renderStarter); html += '</div></details>';
				});
				if (!Object.keys(generations).length) html += '<p>还没有已解锁的该属性伙伴。</p>';
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
	this.FantasyRogueGalleryRoom = this.Room.extend({
		type: 'fantasyroguegallery', title: '通关卡展示', minWidth: 320, bestWidth: 1100,
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
			var html = '<div class="pad"><p>' + button('joinRoom', 'fantasyrogue', '返回爬塔') + button('refresh', '', '刷新展示') + '</p>' +
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
			var event = this.owner.state && this.owner.state.run && this.owner.state.run.event;
			if (event && event.key === this.eventKey && event.stage === 'watch') this.owner.chooseEvent('watched');
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
			this.room = data.room; this.runid = this.room.state.run.id; this.revision = this.room.state.account.revision;
			var run = this.room.state.run;
			this.offers = run.growthOffers || []; this.members = run.team.filter(function (m) { return !m.egg && !m.fusion; });
			var html = '<h3>训练营 · 安排一次集训</h3><p>当场完成，伙伴不离队。确认后，本营地不能追加训练。</p><label>训练员 <select name="campTier">' + this.offers.map(function (o) { return '<option value="' + o.id + '">' + escape(o.name) + ' · 每项 +' + o.amount / 100 + '% · 每位每项 ' + o.price + ' 金币</option>'; }).join('') + '</select></label>';
			html += '<fieldset><legend>参加的伙伴</legend>' + this.members.map(function (m) { return '<label style="display:block;margin:6px"><input type="checkbox" name="campMember" value="' + escape(m.id) + '" />' + escape(localName(m.set.species)) + ' · Lv.' + m.set.level + '</label>'; }).join('') + '</fieldset><fieldset><legend>训练项目</legend>';
			html += ['atk', 'def', 'spa', 'spd', 'spe'].map(function (stat) { return '<label style="display:inline-block;margin:6px"><input type="checkbox" name="campStat" value="' + stat + '" />' + statNames[stat] + '</label>'; }).join('') + '</fieldset><div class="camp-preview" aria-live="polite"></div>' + button('confirmTraining', '', '确认训练') + button('close', '', '暂不训练');
			stableHTML(this, html); this.updatePrice();
		},
		selection: function () { return {value: this.$('select[name=campTier]').val(), trainingMembers: this.$('input[name=campMember]:checked').map(function () { return this.value; }).get(), trainingStats: this.$('input[name=campStat]:checked').map(function () { return this.value; }).get()}; },
		updatePrice: function () {
			var selection = this.selection(), tier = this.offers.find(function (o) { return o.id === selection.value; });
			var members = this.members.filter(function (m) { return selection.trainingMembers.indexOf(m.id) >= 0; }), stats = selection.trainingStats;
			var price = tier.price * members.length * stats.length, capped = members.some(function (m) { return stats.some(function (s) { return (m.campTraining && m.campTraining[s] || 0) >= 6000; }); });
			this.$('button[name=confirmTraining]').prop('disabled', !tier.remaining || !members.length || !stats.length || capped || price > this.room.state.run.money);
			this.$('.camp-preview').html('<p><strong>总价：' + price + ' 金币</strong> · 余额 ' + this.room.state.run.money + ' 金币</p>' + members.map(function (m) { return '<p>' + escape(localName(m.set.species)) + '：' + stats.map(function (s) { var before = m.campTraining && m.campTraining[s] || 0; return statNames[s] + ' +' + before / 100 + '% → +' + Math.min(6000, before + tier.amount) / 100 + '%'; }).join('、') + '</p>'; }).join('') + (capped ? '<p>有项目已达上限，请取消该项目或伙伴。</p>' : ''));
		},
		confirmTraining: function () {
			if (this.room.state.run && this.room.state.run.id === this.runid && this.room.state.account.revision === this.revision) this.room.submit('buygrowth', this.selection());
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
			stableHTML(this, '<div class="rogue-crown-popup"><h3>为' + escape(localName(data.member.set.species)) + '使用【' + escape(data.item.name) + '】</h3><p>' + escape(data.item.description) + '</p>' +
				(gold ? button('trainIV', 'all', '将六项个体值提升至 31', Object.keys(statNames).every(function (stat) { return data.member.set.ivs[stat] >= 31; })) :
				Object.keys(statNames).map(function (stat, i) { return '<p>' + button('trainIV', '' + i, statNames[stat] + ' · ' + data.member.set.ivs[stat] + ' → 31', data.member.set.ivs[stat] >= 31) + '</p>'; }).join('')) + button('close', '', '取消') + '</div>');
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
			stableHTML(this, '<h3>' + escape(data.title || '确认操作') + '</h3><p>' + escape(data.text) + '</p>' + button('confirmCard', '', '确认') + button('close', '', '取消'));
		},
		confirmCard: function () {
			if (app.user.get('userid') === this.userid) this.data.room.submit(this.data.action, this.data.details);
			this.close();
		}
	});
	this.FantasyRoguePartyRoom = this.Room.extend({
		type: 'fantasyrogueparty', title: '队伍及背包', isSideRoom: true, minWidth: 320, bestWidth: 960,
		events: {'change select[name=target]': 'changeItemTarget'},
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
	this.RogueOnboardingPopup = this.Popup.extend({
		type: 'modal',
		initialize: function (data) {
			this.room = data.room; this.userid = data.userid;
			this.$el.addClass('rogue-onboarding');
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
				'<h3>战局不利时，可以逃跑再准备</h3><p>所有肉鸽战斗都能点击<b>「逃跑」</b>，回到当前战斗的准备界面。' +
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
            stableHTML(this, '<h3>伙伴的变化</h3><p>' + escape(localName(data.species)) + '的样子不太一样，似乎可以进化了。</p><div class="rogue-partner-actions">' + button('evolveNow', '', '立即进化') + button('later', '', '稍后再说') + '</div>');
        },
        evolveNow: function () { this.close(); this.room.evolveMember(this.member); },
        later: function () { this.close(); this.room.submit('evolutionnotice', {member: this.member}); }
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
			var options = mon ? (mon.evolutionDetails || []).filter(function (evo) { return evo.ready; }) : [];
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
			if (run && run.id === this.runid && mon && mon.evolutionNotice && !this.room.pending && editable(run)) {
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
			if (app.user.get('userid') === this.userid && run && run.id === this.runid && editable(run) &&
				!run.healingLocked && !this.room.pending && mon && mon.set.species === this.species &&
				(mon.evolutionDetails || []).some(function (evo) { return evo.ready && idOf(evo.species) === self.target; })) {
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
			this.runid = this.room.state.run.id; this.userid = app.user.get('userid');
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
			var run = this.room.state && this.room.state.run, self = this;
			var mon = run && run.team.find(function (entry) { return entry.id === self.member; });
			var again = run && run.id === this.runid && editable(run) && mon &&
				(mon.evolutionDetails || []).some(function (evo) { return evo.ready; });
			this.$('.rogue-evolution-actions').html(button('close', '', '返回队伍') + (again ? button('continueEvolution', '', '继续进化') : ''));
		},
		continueEvolution: function () {
			var run = this.room.state && this.room.state.run;
			this.close();
			if (app.user.get('userid') === this.userid && run && run.id === this.runid) this.room.showEvolutionChoices(this.member);
		},
		remove: function () {
			clearTimeout(this.animationTimer);
			return globals.Popup.prototype.remove.apply(this, arguments);
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
			html += '</tbody></table><p class="rogue-config-note">初始均为 20；捕捉与事件分别拓展六项范围，默认选已解锁最大值。同一进化链共用，地区初始形态分开记录。</p>' +
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
