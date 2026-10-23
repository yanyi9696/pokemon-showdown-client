# Rogue dialogue portraits

Generated with the built-in image_gen tool on 2026-10-19 for the requested dialogue presentation. Each transparent PNG has two equal square cells: neutral on the left, approval on the right. Grunts use an embarrassed acknowledgement instead of a smile. CSS selects the cell without copying or repainting image pixels.

Companion trainers reuse their existing paired assets in `../rogue-companions/`. The registry in `client-fantasy-rogue.js` includes only available images. Brock now has a matching neutral/approval pair based on the two user-provided references. Kahili uses only the light-blue golf outfit for both expressions; the shared URL is versioned to replace cached older artwork. Maxie has a generated pair. Lacey was replaced using the user-provided reference; Marnie, Kahili and Liko were added for the new companion blessings.

`mewtwo-official.png` is the unmodified official Mewtwo illustration from the [official Pokémon Pokédex](https://ph.portal-pokemon.com/pokedex/0150/), downloaded from `https://ph.portal-pokemon.com/images/pokedex/ad7ffb53f984a6623c53f01cfbc06fc8565ecbd4.png` on 2026-10-19 at the user's request. It is a single image, displayed whole in both dialogue states and the codex; no second expression is claimed. This file is official Pokémon artwork, unlike the generated project illustrations.

Generation specifications and output provenance: `generation.json`. Generated artwork is a project illustration based on the named Pokémon characters; it is not official artwork.

## Champion expansion, 2026-10-24

Leon, Cynthia and Diantha have new transparent two-expression sheets, generated with the built-in `image_gen` tool from character references and the existing Steven sheet as the layout reference. Exact prompts, source references and SHA-256 hashes are recorded in [champions-20261024.json](champions-20261024.json). Lance reuses his existing expression sheet for both Elite Four and champion scenes. The four newly added characters also have local Showdown battle avatars under `../trainers/`.

Ash's generated expression sheet remains unfinished: three attempts, including a flatter cartoon style, were rejected by the image service with the category `other`. His local Showdown pixel avatar is displayed in dialogue, events, the codex and the travelling-companion panel. It is a fallback, not a generated portrait or a two-expression sheet.

Viola was revised on 2026-10-19 with the native image editor using the existing pair and three user-supplied references. Both expressions now share the swept-back rounded hair silhouette and inward-curled front locks, with matching pose, camera and linework.

## Rival portrait revision, 2026-10-20

All ten rivals now have newly generated, personality-specific poses: Marnie holds her jacket lapel, Lana tends a fishing rod, Lillie grips her backpack straps, Korrina adjusts her Mega Glove, Nemona offers a battle with a ball extended toward the viewer, Blue rests one elbow on his opposite arm with a ball by his shoulder, Gladion grips his wrist, Bede looks back with an appraising gesture, N opens a hand as if listening, and Silver holds a ball low at his side. Approval ranges from a restrained smile to an enthusiastic grin according to the character. A single character's pose and outfit remain consistent between expressions.

Official character descriptions, game artwork and character histories were reviewed individually. Reference links, full prompts and output provenance are in [rivals-20261020.json](rivals-20261020.json); the reviewed references are not distributed as game portraits. All current rival sheets are original `image_gen` outputs, 1774 × 887 RGBA with two equal cells. N and Korrina received native image edits to keep long hair inside the frames. Small horizontal offsets in the shared client portrait renderer align expression changes without editing the PNG pixels. These offsets apply to story dialogue, rival events, the companion panel and the trainer codex.

Marnie remains in this directory; Lana remains at `../rogue-companions/lana.png`, shared by her rival and blessing appearances. All ten image URLs use the `20261020-rivals-v2` cache version. Images remain loaded on demand. [Preview all ten portraits](rivals-preview.html).
