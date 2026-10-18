# 同行训练家半身立绘

2026-10-18 使用 Codex 内置图像生成工具制作的宝可梦同人素材，非官方原图。

每张 PNG 为透明背景的两帧横向图集，1774 × 887：左侧常态，右侧笑脸。两帧使用相同服装、姿态、镜头与人物比例。客户端通过 `background-position` 切换表情，按 120 × 120 显示单帧。

共同制作要求：宝可梦游戏风格的清晰赛璐璐上色，腰部以上，同一角色两种表情，平视镜头，透明背景；不含文字、标志、场景或额外角色。

| 文件 | 角色 | 形象约束 |
| --- | --- | --- |
| bea.png | 彩豆 | 灰色短发、黑色发饰、深肤色，白黑橙色武道服；平时专注克制，认可时微笑 |
| acerola.png | 阿塞罗拉 | 紫色头发、灰紫色补丁连衣裙；好奇活泼，笑脸亲切 |
| lana.png | 水莲 | 蓝色短发、蓝白水手式服装；平时沉静，笑脸温和 |
| sada.png | 奥琳 AI | 棕色波浪长发、白色研究服、橙色远古风内搭和牙饰，细微青色 AI 光泽 |
| turo.png | 弗图 AI | 棕色短发、短胡须、白色研究服、紫色未来风内搭，细微青色 AI 光泽 |
| iono.png | 奇树 | 粉蓝双色长发、小磁怪发饰、宽大黄黑外套；左侧自然专注，右侧开心微笑 |
| canari.png | 卡娜莉 | 青蓝头发、淡黄锯齿额发、红色发圈、金色眼睛、黄色短款外套与黑色交叉系带；左侧自然，右侧笑脸 |

立绘均为生成的同人图集，不是官方原画的裁切。卡娜莉的外观以[宝可梦官方角色介绍](https://www.pokemon.co.jp/ex/legends_z-a/sc/characters/251106_01/)为参考；官方中文名为“卡娜莉”。

## 2026-10-18 新增图集的提示词

通过 Codex 内置 imagegen 生成，透明背景；输出原图直接保存为本目录的 PNG，未二次编辑。

两张共用提示词：

> Production game companion portrait sprite sheet. Transparent 2:1 image, exactly two equal square frames side by side. The same waist-up character centered at identical scale in each frame, no overlap. Left frame: neutral attentive expression. Right frame: happy smiling expression. Same pose and clothing, only expression changes. Clear Pokémon-style anime cel shading, readable at 120 pixels. No letters, watermark, scenery, other people, decorative frame, or shadow outside the character.

奇树附加提示词：

> Iono from Pokémon. Long pastel pink-and-blue hair, Magnemite hair ornaments, oversized yellow and black jacket. Warm, energetic streamer personality. Preserve the recognizable character design in both frames.

卡娜莉附加提示词：

> Canari from Pokémon Legends: Z-A. Use the provided official reference for character identity and clothing. Turquoise-blue hair with a pale yellow zigzag forelock, short lightning-shaped side ponytails with red ties, golden eyes, tan skin, yellow cropped hoodie/top with black crossed straps. Both frames show the same waist-up character, front-facing; left neutral and right smiling.
