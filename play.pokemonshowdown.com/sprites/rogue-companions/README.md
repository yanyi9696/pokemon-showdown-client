# 同行训练家半身立绘

2026-10-18～19 使用 Codex 内置图像生成工具制作的宝可梦同人素材，非官方原图。旧古兹马官方立绘与第一版常态图保留来源记录，当前界面改用重新制作的常态／笑脸两帧图集；爱丽丝改用冠军造型。

除存档素材 `guzma.png` 与 `guzma-neutral.png` 外，每张 PNG 为透明背景的两帧横向图集，1774 × 887：左侧常态，右侧笑脸。两帧使用相同服装、姿态、镜头与人物比例。客户端通过 `background-position` 切换表情，按 120 × 120 显示单帧。`guzma-neutral.png` 是保留的第一版 1123 × 1367 透明单幅半身图。

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
| poppy.png | 波琵 | 深蓝头发、浅色连衣裙、钥匙挂饰；幼小、活泼，认可时开朗微笑 |
| iris.png | 爱丽丝 | 原版训练家造型的旧图集；保留存档，不再用于游戏或图鉴 |
| iris-champion.png | 爱丽丝 | 当前冠军造型常态／笑脸图集；紫色长发、绿宝石皇冠、粉白礼服 |
| guzma.png | 古兹马 | 官方原图：白发、黄色眼镜、黑色外衣、白色内搭；保留作形象参考 |
| guzma-neutral.png | 古兹马 | 第一版常态图；保留存档，不再用于游戏或图鉴 |
| guzma-expressions.png | 古兹马 | 当前常态／笑脸图集；统一脸型、姿态和线条，适度加深眼下阴影，修长下颌轮廓 |

生成的同人图集不是官方原画的裁切。卡娜莉的外观以[宝可梦官方角色介绍](https://www.pokemon.co.jp/ex/legends_z-a/sc/characters/251106_01/)为参考；官方中文名为“卡娜莉”。

旧古兹马素材来源：[官方角色页](https://www.pokemon.co.jp/ex/sun_moon/character/10.html)的[人物立绘](https://www.pokemon.co.jp/ex/sun_moon/common/images/character/10/portrait.png)。该 PNG 原样保留，当前不再用作表情图，以免与生成常态图画风不同。

古兹马现在与其他同行训练家一样使用独立两帧：闲聊时切换笑脸，6 秒后恢复；听从建议时显示笑脸，在下一事件恢复。游戏与事件图鉴共同使用 `guzma-expressions.png`。此前生成失败的记录已经被本次成功的普通编辑结果替代。

### guzma-expressions 实际生成提示词

内置 imagegen，透明背景。输入依次为第一版常态图、用户本次提供的微笑半身图（`codex-clipboard-72c1925e-83ba-4686-9bbd-fb7992f021a9.png`）、上文官方立绘。对照官方脸型调整常态与微笑，输出原图直接保存为 `guzma-expressions.png`，1774 × 887，未二次编辑。

> Edit the provided portraits into one production two-frame companion portrait sprite sheet of Guzma from Pokemon. Reference 1 is the current neutral portrait; reference 2 is the user-provided smiling portrait; reference 3 is his official character artwork and should guide facial proportions and attitude. Preserve the black-and-white casual outfit, yellow sunglasses on white spiky hair, gold necklace, wristwatch, purple arm marking, relaxed hands-in-pockets pose, and crisp cel-shaded rendering from references 1 and 2. Refine both faces to look more mature and closer to reference 3: slightly elongated cheeks and lower face, a more defined angular jaw and less tiny pointed chin, heavier half-lidded eyes, modest grey-brown shadows immediately below the lower eyelids, a confident roguish attitude. Subtle changes, not elderly, not sickly, no beard. Left frame: composed neutral closed mouth and slightly stern expression. Right frame: restrained crooked confident smile, subtly softened eyebrows. Both frames must have the EXACT same head outline, eye spacing, nose, jaw, hair silhouette, body, pose, clothing, line weight, palette, lighting and scale; only facial expression changes. Transparent background, horizontal 2:1 sheet divided into exactly two equal square frames with no visible divider. Each complete waist-up bust centered wholly within its own square, hair and shoulders fully visible, matching head positions and small equal transparent margins. No labels, watermarks, scenery, or other people.

### guzma-neutral 历史生成提示词

内置 imagegen，透明背景。输入一为用户提供的官方便装图，输入二只参考中性表情与视角，不采用铠甲。输出原图直接保存，未二次编辑。

> Use case: stylized-concept. Asset: a single neutral-state waist-up companion portrait for a Pokemon Showdown fan game. Create Guzma, the adult Pokemon trainer, as a clean 2D cel-shaded character portrait with a true transparent background. Input image 1 is the identity and clothing reference: white spiky hair, yellow sunglasses on his forehead, black casual jacket with white zigzag trim, white shirt, gold necklace. Preserve that casual outfit and recognisable face. Input image 2 is only a reference for the calm serious facial expression and slight three-quarter viewing angle; do not use its armor, period costume, scenery or frame. Relaxed neutral closed mouth, no smile, attentive eyes, shoulders natural. Single character from head to waist, entire hair and shoulders visible, centered, readable at 120 pixels, matching the straightforward illustration style of image 1. No lettering, watermark, decorative border or other characters.

## 2026-10-18 新增图集的提示词

通过 Codex 内置 imagegen 生成，透明背景；输出原图直接保存为本目录的 PNG，未二次编辑。

两张共用提示词：

> Production game companion portrait sprite sheet. Transparent 2:1 image, exactly two equal square frames side by side. The same waist-up character centered at identical scale in each frame, no overlap. Left frame: neutral attentive expression. Right frame: happy smiling expression. Same pose and clothing, only expression changes. Clear Pokémon-style anime cel shading, readable at 120 pixels. No letters, watermark, scenery, other people, decorative frame, or shadow outside the character.

奇树附加提示词：

> Iono from Pokémon. Long pastel pink-and-blue hair, Magnemite hair ornaments, oversized yellow and black jacket. Warm, energetic streamer personality. Preserve the recognizable character design in both frames.

卡娜莉附加提示词：

> Canari from Pokémon Legends: Z-A. Use the provided official reference for character identity and clothing. Turquoise-blue hair with a pale yellow zigzag forelock, short lightning-shaped side ponytails with red ties, golden eyes, tan skin, yellow cropped hoodie/top with black crossed straps. Both frames show the same waist-up character, front-facing; left neutral and right smiling.

早期制作的波琵、爱丽丝图集同样使用透明背景、两格等大的横向图集，左常态、右笑脸，同姿态同大小。波琵采用幼年四天王的钥匙挂饰与蓝色发型；爱丽丝当时采用初次登场时的浅黄粉色训练家服装。两张输出原图直接保存，未二次编辑；爱丽丝现已由下述冠军造型替换。

## 2026-10-19 冠军造型替换

`iris-champion.png` 使用内置 imagegen、透明背景生成，1774 × 887，输出原图直接保存，未二次编辑。输入依次为旧 `iris.png`（参考双帧布局与线条）和用户提供的冠军造型参考图 `codex-clipboard-a9aac820-0477-4b6b-85ef-1240801cb6bd.png`（参考皇冠、发型与礼服）。角色版本核对资料：[Pokémon Masters EX 官方冠军角色公告](https://pokemonmasters-game.com/en-US/announcements/Scout_3020_4W_1)。游戏与事件图鉴共同使用这份新图集。

实际成功提示词：

> Create a new fan-art companion portrait sheet of Iris in her Pokemon Champion outfit, using the supplied pictures as visual references. This is a new drawing of the existing fictional character. The first picture shows the current game's simple cel-shaded art style and paired expression layout. The second picture is the user's Champion costume reference. Draw her waist up, with rich brown skin, large deep-purple hair, the gold tiara with green gems, and a modest pink-and-white Champion dress with wide sleeves. Use simplified clean ink outlines and flat two-tone cel shading, slightly softer than the old asset. Straightforward friendly game character art; relaxed upright pose, arms at the sides. Make two equally sized square frames next to each other in one horizontal 2:1 transparent sprite sheet. The LEFT portrait has an attentive neutral closed-mouth expression. The RIGHT portrait has a bright friendly smile. Keep the same head shape, hair, costume, pose, proportions, colors, line thickness and lighting between frames. Show the full tiara and hair with small transparent margins, keep each bust entirely inside its half, and keep the head and shoulders at exactly the same coordinates relative to each half. Transparent background, no galaxy, no lettering, no divider, no border and no other figures.

## 2026-10-18 雪山与采集扩展

新增 `lysandre.png`、`olivia.png`、`grusha.png`、`rika.png`，均为两格透明背景图集，左常态、右笑脸。
弗拉达利采用《传说 Z-A》时期形象，参考[官方人物介绍](https://www.pokemon.co.jp/ex/legends_z-a/ja/characters/260113_09/)；其余三位沿用各自原作造型。以下为实际生成提示词，输出原图直接保存。

### lysandre

> Use case: stylized-concept. Asset: a single horizontal two-frame companion portrait sprite sheet for a Pokemon Showdown fan game. Create waist-up F / Lysandre in his Pokemon Legends Z-A appearance faithfully using the supplied reference: grey spiky hair, white angular beard with orange accents, black coat with large grey fur collar and patched orange sleeves, weary blue eye. Two equal width cells side by side, same scale and pose: LEFT calm neutral, RIGHT a restrained warm smile. Center each waist-up bust within its half, no text, no borders, no objects cut into adjacent cell. Crisp clean 2D Pokemon character art on true transparent background. This is an adult character. Sheet approximately 2:1.

### olivia

> Use case: stylized-concept. Asset: a single horizontal two-frame waist-up companion portrait sprite sheet. Pokemon trainer Olivia (Alola island kahuna): adult brown-skinned woman with dark brown bob hair, pink crystal hair ornament, pink and black tropical outfit, crystal jewelry. Faithful character design. Two equal width cells side by side, identical scale and facing/pose: LEFT composed neutral expression, RIGHT friendly cheerful smile. Clean crisp 2D Pokemon character illustration, true transparent background, no text, no borders, no scenery, each bust fully contained in its own half. Approximately 2:1 sheet.

### grusha

> Use case: stylized-concept. Asset: a horizontal two-frame waist-up companion portrait sprite sheet for Pokemon trainer Grusha. Faithful design: adult male, cyan hair with long fringe covering one eye, orange scarf with Pokeball detail, dark blue winter jacket. Two equal cells side by side, matching scale and pose: LEFT quiet reserved neutral, RIGHT slight shy smile with eyes softened. Clean crisp 2D Pokemon character art, true transparent background, no text, no border, no scenery, no overlapping cells. Each bust centered within its own half. Approximately 2:1 sheet.

### rika

> Use case: stylized-concept. Asset: horizontal two-frame waist-up companion portrait sprite sheet of Pokemon trainer Rika from Paldea. Adult woman, green long ponytail, red eyes, white collared shirt with black tie, black gloves, suspenders. Faithful design. Two equal cells side by side, matching scale and pose: LEFT relaxed neutral, RIGHT confident friendly smile. Clean crisp 2D Pokemon character art, true transparent background, no text, no borders, no scenery. Each waist-up bust centered entirely within its half. Approximately 2:1 sheet.
