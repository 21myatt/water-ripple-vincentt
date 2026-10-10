# Plan — Fingertip Water Ripple

What: `Brief.md`. This file is how.

## Decisions (confirmed 2026-10-10)

- **Refraction reads the live camera** (`useXRCameraTexture`), aligned with Vincentt's own
  `VideoBackground`. That component draws the SDK's camera texture over the full viewport with
  UV 0..1, and the SDK has already cover-cropped and mirrored it, so **screen UV = camera UV
  = simulation UV**. The refraction quad renders directly after the background.
- **Touch rule:** straight fingers are in the water, and each straight fingertip acts like a held
  mouse cursor. Curled fingers lift out; a fist makes no ripples. Thumb, index, middle and ring
  per the brief (pinky excluded), every tracked hand.
- **Screen touch / mouse** also disturbs the water (the brief's "touches the screen"), which
  doubles as a desktop test input.
- **Credit:** Polygon (Shadertoy) on screen and in `CREDITS.md`. Licence confirmed by the project
  owner before publishing (Shadertoy's default is CC BY-NC-SA 3.0 unless the page says otherwise).

## Pipeline (`src/water/`)

1. **Simulation** (Buffer A → `simulation` shader): ping-pong HalfFloat render targets at reduced
   resolution (about 320 px wide, viewport aspect). Polygon's update is kept as written: wave
   equation, spring, damping, boundaries; RGBA = pressure, pressure velocity, ∂x, ∂y. A
   fixed 60 Hz step (≤ 3 steps per frame) keeps wave speed frame-rate independent. A tiny dead zone
   lets idle water settle to exactly zero.
2. **Injection** replaces `iMouse`: up to 8 capsules per step (previous → current fingertip
   position), each with radius, strength and falloff. Strength = base + speed-scaled, clamped. A
   new touch adds a stronger splash. A still fingertip injects nothing, so its ripples spread and
   fade.
3. **Refraction** (Image → `refraction` shader): a full-screen quad samples the camera at
   `uv + k · gradient` and adds Polygon's sun-glint highlight (tuned subtler), output in the
   renderer's colour space.

## Hand → touch points

- Per fingertip: One Euro smoothing (low latency). Straightness = |tip − mcp| / joint path
  length, with hysteresis. Inject only when touching AND moved > threshold since the last
  injection.
- `?debug` (dev-only): fingertip markers, touch state, injection count.

## Dev input

- Built and tuned against a recorded clip with a dev-only loader. Both were removed for production
  (2026-10-10): **the input is the webcam only.** `?debug` (fingertips) and `?debug=height`
  (wave heights) are dev-only.

## Production

- Title and share-preview metadata are in `index.html` (a platform file: re-apply after a template
  upgrade). An experience status signal is included (`ExperienceStatus.tsx`). New `src/` files are
  in the manifest's `creator` list.
- Licence confirmed by the project owner before publishing (see `CREDITS.md`). Registered as
  `fingertip-water-ripple` and published at https://fingertip-water-ripple.vincentt.app.

## Build order (from the brief)

1. Camera + refraction + persistent simulation (verify with mouse).
2. One fingertip, coordinate mapping verified.
3. Trails, strength, decay.
4. Multiple fingertips and hands.
5. Tuning: performance, lighting, refraction, responsiveness.
