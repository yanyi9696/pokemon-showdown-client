<?php

if ((substr($_SERVER['REMOTE_ADDR'],0,11) === '69.164.163.') ||
		(substr(@$_SERVER['HTTP_X_FORWARDED_FOR'],0,11) === '69.164.163.')) {
	die('website disabled');
}

/********************************************************************
 * Header
 ********************************************************************/

function ThemeHeaderTemplate() {
	global $panels;
?>
<!DOCTYPE html>
<html><head>

	<meta charset="utf-8" />

	<title><?php if ($panels->pagetitle) echo htmlspecialchars($panels->pagetitle).' - '; ?>Pok&eacute;mon Showdown</title>

<?php if ($panels->pagedescription) { ?>
	<meta name="description" content="<?php echo htmlspecialchars($panels->pagedescription); ?>" />
<?php } ?>

	<meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=IE8" />
	<link rel="stylesheet" href="//psc.sciroccogti.top/style/font-awesome.css?0.055653723544085265" />
	<link rel="stylesheet" href="//ps.sciroccogti.top/theme/panels.css?0.11691446541544837" />
	<link rel="stylesheet" href="//ps.sciroccogti.top/theme/main.css?0.6767342979714295" />
	<link rel="stylesheet" href="//psc.sciroccogti.top/style/battle.css?0.008538091089088873" />
	<link rel="stylesheet" href="//psc.sciroccogti.top/style/replay.css?0.6217797027154286" />
	<link rel="stylesheet" href="//psc.sciroccogti.top/style/utilichart.css?0.23149688832989246" />

	<!-- Workarounds for IE bugs to display trees correctly. -->
	<!--[if lte IE 6]><style> li.tree { height: 1px; } </style><![endif]-->
	<!--[if IE 7]><style> li.tree { zoom: 1; } </style><![endif]-->

	<script type="text/javascript">
		var _gaq = _gaq || [];
		_gaq.push(['_setAccount', 'UA-26211653-1']);
		_gaq.push(['_setDomainName', 'pokemonshowdown.com']);
		_gaq.push(['_setAllowLinker', true]);
		_gaq.push(['_trackPageview']);

		(function() {
			var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
			ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
			var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
		})();
	</script>
</head><body>

	<div class="pfx-topbar">
		<div class="header">
			<ul class="nav">
				<li><a class="button nav-first<?php if ($panels->tab === 'home') echo ' cur'; ?>" href="//pokemonshowdown.com/"><img src="//ps.sciroccogti.top/images/pokemonshowdownbeta.png?0.049856383667505" alt="Pok&eacute;mon Showdown! (beta)" /> Home</a></li>
				<li><a class="button<?php if ($panels->tab === 'pokedex') echo ' cur'; ?>" href="//dex.pokemonshowdown.com/">Pok&eacute;dex</a></li>
				<li><a class="button<?php if ($panels->tab === 'replay') echo ' cur'; ?>" href="/">Replays</a></li>
				<li><a class="button<?php if ($panels->tab === 'ladder') echo ' cur'; ?>" href="//pokemonshowdown.com/ladder/">Ladder</a></li>
				<li><a class="button nav-last" href="//pokemonshowdown.com/forums/">Forum</a></li>
			</ul>
			<ul class="nav nav-play">
				<li><a class="button greenbutton nav-first nav-last" href="http://play.pokemonshowdown.com/">Play</a></li>
			</ul>
			<div style="clear:both"></div>
		</div>
	</div>
<?php
}

/********************************************************************
 * Footer
 ********************************************************************/

function ThemeScriptsTemplate() {
?>
	<script src="//psc.sciroccogti.top/js/lib/jquery-1.11.0.min.js?0.39355377259182567"></script>
	<script src="//psc.sciroccogti.top/js/lib/lodash.core.js?0.1226025182373236"></script>
	<script src="//psc.sciroccogti.top/js/lib/backbone.js?0.6538233592834366"></script>
	<script src="//dex.pokemonshowdown.com/js/panels.js?0.09411378208753418"></script>
<?php
}

function ThemeFooterTemplate() {
	global $panels;
?>
<?php $panels->scripts(); ?>

	<script src="//psc.sciroccogti.top/js/lib/jquery-cookie.js?0.9049121555275259"></script>
	<script src="//psc.sciroccogti.top/js/lib/html-sanitizer-minified.js?0.7901613963622258"></script>
	<script src="//psc.sciroccogti.top/js/battle-sound.js?0.7491238797789863"></script>
	<script src="//psc.sciroccogti.top/config/config.js?0.7067372507336822"></script>
	<script src="//psc.sciroccogti.top/js/battledata.js?0.3907279293863848"></script>
	<script src="//psc.sciroccogti.top/data/pokedex-mini.js?0.25981826447444734"></script>
	<script src="//psc.sciroccogti.top/data/pokedex-mini-bw.js?0.6971789100199395"></script>
	<script src="//psc.sciroccogti.top/data/graphics.js?0.6468977133668896"></script>
	<script src="//psc.sciroccogti.top/data/pokedex.js?0.7038228082473601"></script>
	<script src="//psc.sciroccogti.top/data/items.js?0.7402906027655991"></script>
	<script src="//psc.sciroccogti.top/data/moves.js?0.8264065804568284"></script>
	<script src="//psc.sciroccogti.top/data/abilities.js?0.7683196862860806"></script>
	<script src="//psc.sciroccogti.top/data/teambuilder-tables.js?0.20459951617397842"></script>
	<script src="//psc.sciroccogti.top/js/battle-tooltips.js?0.4431988604578154"></script>
	<script src="//psc.sciroccogti.top/js/battle.js?0.783043450385682"></script>
	<script src="/js/replay.js?1e09ceb9"></script>

</body></html>
<?php
}
