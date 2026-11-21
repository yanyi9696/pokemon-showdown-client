/* global window, document */
(function () {
	'use strict';
	if (window.FantasyTeambuilder) return;
	var pending;
	var entry = document.currentScript;
	var searchAsset = entry && entry.getAttribute('data-search-src');
	function ready() {
		return (!window.BattleTeambuilderTableAsset || window.BattleTeambuilderTableLoaded === true) &&
			(!searchAsset || !!window.BattleSearchIndex);
	}
	function script(url, check) {
		if (check()) return Promise.resolve(true);
		if (!url) return Promise.resolve(false);
		return new Promise(function (resolve) {
			var node = document.createElement('script');
			var done = false;
			var timer = setTimeout(function () { finish(false); }, 30000);
			function finish(ok) {
				if (done) return;
				done = true;
				clearTimeout(timer);
				node.onload = node.onerror = null;
				if (!ok) node.remove();
				resolve(ok);
			}
			node.src = url;
			node.async = true;
			node.onload = function () { finish(check()); };
			node.onerror = function () { finish(false); };
			try { document.head.appendChild(node); } catch (e) { finish(false); }
		});
	}
	function load() {
		if (ready()) return Promise.resolve(true);
		if (pending) return pending;
		pending = Promise.all([
			script(window.BattleTeambuilderTableAsset, function () {
				return !window.BattleTeambuilderTableAsset || window.BattleTeambuilderTableLoaded === true;
			}),
			script(searchAsset, function () { return !searchAsset || !!window.BattleSearchIndex; }),
		]).then(function (results) { return results.every(Boolean); });
		var request = pending;
		request.then(function () { if (pending === request) pending = null; });
		return request;
	}
	window.FantasyTeambuilder = {load: load, ready: ready};
})();
