'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const client = path.resolve(__dirname, '..');
const server = path.resolve(client, process.argv[2] || '../pokemon-showdown');
const showdex = path.resolve(client, process.argv[3] || '../showdex');
function run(cwd, args) { execFileSync(process.execPath, args, { cwd, stdio: 'inherit' }); }
run(server, ['build']);
run(showdex, ['scripts/build-fantasy.mjs', path.join(client, 'play.pokemonshowdown.com/showdex')]);
// The client Dex and calculator selectors are regenerated from the exact same server sources.
run(client, ['build', 'full', '--local-server', server]);
