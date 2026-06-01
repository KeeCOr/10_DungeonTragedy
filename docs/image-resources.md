# Dragon Tactics Image Resources

This list is based on `docs/DragonTragedy_gameplay_preview.png`: a dark fantasy combat screen with a large boss presence, volcanic battlefield, ornate metal HUD, compact skill bar, and race/player portrait chips.

## Generated Assets

| Asset | File | Size | Purpose |
| --- | --- | ---: | --- |
| Dragon boss banner | `public/assets/dragon-boss-banner.png` | 1774x887 | Top boss/dragon strip background. Use behind dragon HP, phase, and upcoming dragon cards. |
| Lava board texture | `public/assets/lava-board-texture.png` | 1254x1254 | Tactical board floor under the 5x3 grid. Use with a dark overlay so pieces and threat cells stay readable. |
| Skill icon atlas | `public/assets/skill-icon-atlas.png` | 1536x1024 | Bottom action bar icons. Crop as a 3x2 atlas for attack, move, guard, fire, lightning, and roar-style actions. |
| Fantasy card frame | `public/assets/fantasy-card-frame.png` | 1024x1536 | Card background/frame for hand cards or enlarged card detail panels. Keep text rendered in HTML over the empty center. |
| Race portrait atlas | `public/assets/race-portrait-atlas.png` | 2172x724 | Player HUD portrait medallions. Crop as a 4x1 atlas for human, elf, dwarf, and orc. |
| UI button frame atlas | `public/assets/ui-button-frame-atlas.png` | 1024x1536 | Shared button skin for normal, active/hover, and disabled states. Use HTML text over the empty center. |
| UI panel frame | `public/assets/ui-panel-frame.png` | 1535x1024 | Shared ornamental frame/background for right-side panels, player HUD, logs, and mission panels. |
| Race token atlas | `public/assets/race-token-atlas.png` | 2172x724 | Board piece tokens for human, elf, dwarf, and orc. Crop as a 4x1 atlas. |
| Dragon boss medallion | `public/assets/dragon-boss-medallion.png` | 1254x1254 | Compact boss portrait for the top boss bar and dragon turn indicator. |
| Dragon type atlas | `public/assets/dragon-type-atlas.png` | 2048x682 | Five boss portraits for fire, ice, venom, storm, and gold dragon encounters. Crop as a 5x1 atlas. |

## Recommended Next Assets

| Priority | Asset | Why |
| --- | --- | --- |
| High | Threat marker decal atlas | Dragon attack preview cells need more visual punch than CSS-only red overlays. |
| High | Movement/attack effect sprites | Other users' actions become clearer with short trail, slash, impact, heal, and taunt effects. |
| Medium | Small resource/status icons | HP, shield, hidden, taunt, mission, treasure, and turn status can become compact chips instead of text-heavy panels. |
| Medium | Mini-map or round timer frame | The reference image uses a decorative circular side widget; this can replace some empty/verbose side UI. |
| Low | Background vignette panels | Subtle ornamental panel backplates can unify HUD sections without adding more layout boxes. |

## Prompt Set Used

### Dragon Boss Banner

Dark fantasy dragon boss banner for a web board game, massive black-red dragon over cracked volcanic stone and lava glow, Korean mobile RPG combat UI mood, wide cinematic composition, no text, no logo, no watermark.

### Lava Board Texture

Top-down cracked volcanic stone battlefield tile for a 5x3 tactical grid, ancient basalt slabs, glowing lava fissures, subtle ritual marks, no characters, no UI, no text.

### Skill Icon Atlas

Six square fantasy skill icons in a 3 by 2 atlas: sword slash attack, swirling movement dash, golden shield guard, fire explosion, blue lightning strike, dragon roar flame mask. Dark ornate metal frames, no text or numbers.

### Fantasy Card Frame

Single empty vertical fantasy action card template with ornate dark metal frame and parchment-black interior for HTML text overlay. No letters, no symbols that look like text, no character art.

### Race Portrait Atlas

Four circular fantasy character portrait medallions in a 4 by 1 atlas: human knight, elf archer, dwarf guardian, orc warrior. Same ornate round frame style, no text or numbers.

### UI Button Frame Atlas

Three empty horizontal ornate RPG button frames in a vertical atlas: normal, active/hover, and disabled. Dark metal body, aged gold trim, ember accents, no text or icons.

### UI Panel Frame

Large empty ornate rectangular HUD panel frame with blackened metal border, aged gold corners, subtle ember cracks, and dark center for HTML overlay content. No text or icons.

### Race Token Atlas

Four circular board-game tokens in a 4 by 1 atlas: human knight, elf archer, dwarf guardian, and orc warrior. Designed for readable board cells rather than large portraits.

### Dragon Boss Medallion

One circular boss portrait medallion with a black-red dragon head, gold-black frame, and ember lighting. Used for compact boss HUD placement.

### Dragon Type Atlas

Five circular dragon boss medallion portraits arranged in a single horizontal row: fire, frost, venom, storm, and ancient gold. Used for randomized encounter portraits.
