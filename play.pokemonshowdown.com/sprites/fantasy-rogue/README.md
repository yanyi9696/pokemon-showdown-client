# 幻想杯肉鸽道具图来源

试玩版从 PokéRogue 道具图集显示 `rare_candy`（作为四种经验糖果的临时通用图标）、`linking_cord`，以及 PS 缺少的 `potion`、`super_potion`、`hyper_potion`、`revive`、`full_heal`、`elixir`。使用 CSS 图集坐标，不裁切、重绘或修改原 PNG；其他道具沿用 Showdown 图标。

- 上游：[pagefaultgames/pokerogue-assets](https://github.com/pagefaultgames/pokerogue-assets)
- 固定提交：`81f8e60c3c57ccdcddb3c41dd54d4748cb3b5aad`
- 文件：[images/items.png](https://github.com/pagefaultgames/pokerogue-assets/blob/81f8e60c3c57ccdcddb3c41dd54d4748cb3b5aad/images/items.png)
- 坐标来源：同一提交的 `images/items.json`，`rare_candy` 为 x229/y400/w23/h23，`linking_cord` 为 x28/y115/w27/h26。
- PNG SHA-256：`51b8c2ca1036e026c36e8c689dc56837e8702f4f331030059cd4fe3d7dddfb17`
- 恢复道具坐标（x/y/w/h）：potion 218/169/17/23，super_potion 234/192/17/23，hyper_potion 215/331/17/23，revive 479/54/12/17，full_heal 200/331/15/23，elixir 77/168/18/24。
- 上游 [images/REUSE.toml](https://github.com/pagefaultgames/pokerogue-assets/blob/81f8e60c3c57ccdcddb3c41dd54d4748cb3b5aad/images/REUSE.toml) 对 `items.png` 的声明：`SPDX-FileCopyrightText = "Nintendo, Game Freak, and Creatures Inc."`，`SPDX-License-Identifier = "LicenseRef-FAIR-USE"`。相应说明随附于 `LicenseRef-FAIR-USE.txt`；此声明不等同于上游代码的 AGPL 许可。

只在本站请求这份本地图集，不运行时请求 PokéRogue 网站。界面的文字名称不依赖图片加载。

## 2026-10-07 商店与战利品补图

黑奇石、大蘑菇、金珠、巨大金珠及六种增强剂继续使用上述固定版本的 PokéRogue 图集；CSS 坐标来自同一 `items.json`，未修改图集。

该图集没有小蘑菇、芳香蘑菇、珍珠系列、星星系列及努力值羽毛。缺少的 15 张正作道具像素图来自 [PokeAPI/sprites 的 items 目录](https://github.com/PokeAPI/sprites/tree/master/sprites/items)，以原始 PNG 保存，未重绘；逐文件来源及 SHA-256 见 `economy-icons.json`。获取日期为 2026-10-07，下载通过 jsDelivr 的该仓库镜像，游戏运行时只读取本站文件。

PokeAPI 仓库代码许可不转移 Pokémon 原始美术版权；游戏图像的原作者为 Nintendo / Game Freak / Creatures。与现有图集相同，保留原始版权归属，不宣称原创。
