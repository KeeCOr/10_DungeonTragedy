# Dragon Tactics Combat VFX Resource Update

## Added asset

`public/assets/combat-vfx-atlas-v1.png` is a transparent 2x2 atlas containing slash, impact, healing, and taunt feedback effects. It was generated on a chroma-key background and alpha-validated after conversion.

## Runtime usage

`css/combat-vfx.css` is loaded after the main stylesheet. Existing damage floats use the upper-left slash cell; existing healing floats use the lower-left healing cell. Number labels remain HTML text above the graphic, so combat values stay readable.

## Follow-up boundary

The impact and taunt cells are intentionally not attached yet: current engine events do not expose a stable visual anchor for them. Movement and taunt feedback should be connected only when those anchors are added with test coverage.

## Generation prompt

2D dark-fantasy mobile RPG combat VFX atlas: crimson sword slash, golden impact, emerald healing burst, and violet-red taunt shockwave arranged in a clean 2x2 grid. No text or characters. Generated on a flat chroma-key background, then locally converted to alpha PNG.
