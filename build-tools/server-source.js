'use strict';

const fs = require('fs');
const path = require('path');

// All data generators and shared client code must use the same server checkout.
const rootDir = path.resolve(__dirname, '..');
const useLocalServer = !!process.env.PS_SERVER_PATH;
const serverDir = path.resolve(rootDir, process.env.PS_SERVER_PATH || 'caches/pokemon-showdown');
const serverPath = (...parts) => path.join(serverDir, ...parts);

if (useLocalServer) {
	for (const filename of ['build', 'sim/dex.ts', 'sim/teams.ts', 'server/chat-formatter.ts']) {
		if (!fs.existsSync(serverPath(filename))) {
			throw new Error(`Invalid local server checkout: ${serverDir} (missing ${filename}).`);
		}
	}
}

module.exports = { serverDir, serverPath, useLocalServer };
