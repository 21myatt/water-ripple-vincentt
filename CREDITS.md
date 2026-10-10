# Credits

## Water shader — Polygon (Shadertoy)

- **Author:** [Polygon](https://www.shadertoy.com/user/Polygon) on Shadertoy
- **Used:** the "Buffer A" wave simulation and the "Image" refraction/glint pass, supplied in
  `Brief.md`, ported to `src/water/Water.tsx`.
- **Changes:** Shadertoy inputs replaced with app uniforms (`iResolution`, `iFrame`, `iMouse`,
  `iChannel0/1`); mouse injection replaced by multi-point fingertip capsules with radius,
  strength, falloff and speed scaling; fixed-rate stepping at reduced resolution; a dead zone so
  idle water settles flat; the glint offset so flat water is untouched; the camera texture used
  as the refracted image. The wave equation, spring, damping and boundary handling are kept as
  written.

The credit is also shown on screen (bottom right) while the experience runs, linked to
Polygon's Shadertoy profile.

> **Licence: to confirm before publishing.** Shaders on Shadertoy are licensed
> [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) by default unless the
> author states otherwise on the shader's page. That licence does not allow commercial use, and
> adaptations must be shared alike. Check the original shader's page, or get Polygon's
> permission, and record the outcome here.
