Pokémon Showdown Client
========================================================================

Navigation: [Website][1] | [Server repository][2] | **Client repository** | [Dex repository][3]

  [1]: http://pokemonshowdown.com/
  [2]: https://github.com/Zarel/Pokemon-Showdown
  [3]: https://github.com/Zarel/Pokemon-Showdown-Dex

Introduction
------------------------------------------------------------------------

This is a repository for most of the client code for Pokémon Showdown.

This is what runs `play.pokemonshowdown.com`.

**WARNING: You probably want the [Pokémon Showdown server][4]**, if you're
setting up a server.

  [4]: https://github.com/Zarel/Pokemon-Showdown

Browser support
------------------------------------------------------------------------

Pokémon Showdown currently supports, in order of preference:

 - Chrome
 - Firefox
 - Opera
 - Safari 5+
 - IE11+
 - Chrome/Firefox/Safari for various mobile devices

Pokémon Showdown is usable, but expect degraded performance and certain features not to work in:

 - Safari 4+
 - IE9+

Pokémon Showdown is mostly developed on Chrome, and Chrome or the desktop client is required for certain features like dragging-and-dropping teams from PS to your computer. However, bugs reported on any supported browser will usually be fixed pretty quickly.

Testing
------------------------------------------------------------------------

Client testing now requires a build step! Install the latest Node.js (we
require v14 or later) and Git, and run `node build` (on Windows) or `./build`
(on other OSes) to build.

For local private-server development, a full build can use your existing server
checkout without cloning or pulling from GitHub:

```powershell
node build full --local-server ..\pokemon-showdown
```

The path is relative to this client repository (absolute paths are also accepted).
Install dependencies in both repositories first. This command builds that server
checkout and uses it for all generated data, including mod data, learnsets,
sprite metadata, and shared client code. It does not change either repository's
branch or synchronize Git. Normal `node build full` retains its remote-cache
workflow. `PS_SERVER_PATH` can also select the server for individual build tools;
build the server first when running a data generator on its own.

You can make and test client changes simply by building after each change,
and opening `testclient.html`. This will allow you to test changes to the
client without setting up your own login server.

### Build with a local server checkout

If the server source is available locally, a full build can regenerate client
data without cloning or pulling from GitHub. From the client repository, run:

```sh
node build full --local-server ../pokemon-showdown
```

This builds the selected server checkout and uses it for all generated data and
shared client code, including local uncommitted data changes. Both repositories
must already have their dependencies installed. Without `--local-server`, a full
build keeps using the remote repository in `caches/pokemon-showdown`.

### 幻想杯线上部署（含内置计算器）

`play.pokemonshowdown.com/showdex/` 现在随客户端仓库交付，包含可直接运行的
Showdex、资源清单、许可证和对应源码包。线上只需服务端和客户端两个仓库；
玩家不需要浏览器插件，服务器也不需要安装 Showdex 的构建依赖。

在服务器的客户端仓库目录执行：

```sh
node build full --local-server ../pokemon-showdown
node build-tools/showdex-assets.js
```

第一条命令会重新构建旁边的服务端，并生成对应的幻想杯宝可梦、招式、特性、
道具数据；计算器继续使用这些数据和服务器的原生伤害计算，不必手动更新名单。
然后按原来的管理方式重启对战服务。网页根目录应指向 `play.pokemonshowdown.com/`，
或者完整复制该目录（包括 `showdex/`）到现有网页根目录。

部署后检查 `https://你的域名/showdex/main.js`、`showdex/asset-manifest.json`
和 `showdex/source.tar.gz` 均可访问。若页面有计算器脚本标签而 `main.js` 返回 404，
就是静态资源没有发布到实际网页根目录，重启对战进程不能解决这个问题。
普通 `node build` 和完整构建都会检查资源清单，缺文件或版本混杂时直接报错；
生成的网页也会按文件内容更新版本参数，避免一直使用 `?v1` 的旧缓存。

修改计算器界面源码时，在开发机准备好相邻 `showdex` 仓库及其依赖后执行
`npm run build:battle-assist`，将更新后的 `showdex/` 资源与客户端改动一起提交。
无需修改计算器源码的日常宝可梦数据更新，使用上面的完整构建命令即可。

### Test keys

For security reasons, browsers [don't let other websites control PS][5], so
they can't screw with your account, but it does make it harder to log in on
the test client.

The default hack makes you copy/paste the data instead, but if you're
refreshing a lot, just add a `config/testclient-key.js` file, with the
contents:

    const POKEMON_SHOWDOWN_TESTCLIENT_KEY = 'sid';

Replace `sid` with the contents of your actual PS `sid` cookie. You can quickly
grab it from:

> https://play.pokemonshowdown.com/testclient-key.php

Make sure to put it in `config/` and not `play.pokemonshowdown.com/config/`.

(This is the only supported method of logging in on the beta Preact testclient.)

  [5]: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

### Other servers

You can connect to an arbitrary server by navigating to
`testclient.html?~~host:port`. For example, to connect to a server running
locally on port 8000, you can navigate to `testclient.html?~~localhost:8000`.

**NOTE**: Certain browsers will convert `'?'` to `'%3F'` when reading files off
of the local filesystem. As a workaround, try using a different browser or
serving the files locally first (ie. run `npx http-server` from the
directory this README is in, then navigate in your browser to
`http://localhost:8080/testclient.html?~~localhost:8000`).

### Limitations

Even with a test key, the following things will fail in `testclient.html`:

+ Registering
+ Logging into other accounts (you can still switch to other unregistered
  accounts and back, though)

Everything else can be tested.

Warning
------------------------------------------------------------------------

This repository is not "batteries included". It does NOT include instructions
to run a full Pokémon Showdown login server, and we will not provide them.
Please do not ask for help on this; you will be turned away.

If you make a mistake hosting a login server, your users' passwords can get
stolen, so we do not want anyone to host a login server unless they can
figure out how to do it without help.

It also doesn't include several resource files (namely, the `/audio/` and
`/sprites/` directories) for size reasons.

On the other hand, as long as you don't want to run your own login server,
this repository contains everything you need to test changes to the client;
just see the "Testing" section above.

License
------------------------------------------------------------------------

Pokémon Showdown's client is distributed under the terms of the [AGPLv3][6].

The reason is mostly because I don't want low-effort proprietary forks that add bad code that steals everyone's passwords, or something like that.

If you're doing _anything_ else other than forking, _especially_ if you want to some client code files in your own open-source project that you want to release under a more permissive license (like, if you want to make your own multiplayer open-source game client for a different game), please ask at `staff@pokemonshowdown.com`. I hold all the copyright to the AGPLv3 parts and can relicense them to MIT for you.

  [6]: http://www.gnu.org/licenses/agpl-3.0.html

**WARNING:** This is **NOT** the same license as Pokémon Showdown's server.
