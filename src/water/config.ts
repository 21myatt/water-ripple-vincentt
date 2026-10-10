// Every tunable. Simulation units are sim pixels; screen units are UV (0..1).

export const SIM = {
  /** Simulation width in texels; height follows the viewport aspect. */
  width: 320,
  /** Steps per second (fixed timestep, so wave speed is frame-rate independent). */
  rate: 60,
  /** Cap on catch-up steps in one frame. */
  maxSteps: 3,
  /** Polygon's constants (Buffer A), kept as written. */
  delta: 1.0,
  spring: 0.005,
  velocityDamping: 0.002,
  pressureDamping: 0.999,
  /** |pressure| and |velocity| below this snap to 0, so idle water is perfectly still. */
  deadZone: 0.0004,
};

export const RIPPLE = {
  /** Injection radius for a moving fingertip (sim texels). */
  radius: 5.5,
  /** Pressure added per injection at the centre. */
  strength: 0.4,
  /** Extra strength per (UV / s) of fingertip speed: faster = bigger wake. */
  speedGain: 0.3,
  maxStrength: 1.2,
  /** Falloff exponent: 1 = cone (Polygon's original), higher = softer edge. */
  falloff: 1.4,
  /** A fingertip entering the water splashes: bigger and stronger, once. */
  splashRadius: 8,
  splashStrength: 0.9,
  /** Minimum movement before another injection (UV, aspect-corrected). */
  minMove: 0.006,
  /** Max injections per frame, across all fingers and pointers. */
  maxInjections: 8,
};

export const LOOK = {
  /** Polygon's refraction: uv + refraction · gradient. */
  refraction: 0.15,
  /** Sun-glint strength and sharpness (Polygon: 1.0 and 60). */
  glint: 0.45,
  glintPower: 60,
};

export const FINGERS = {
  /** Straightness = |tip − mcp| / joint path length. Hysteresis band. */
  straightOn: 0.9,
  straightOff: 0.82,
  /** Thumb uses its own band (it rarely reads perfectly straight). */
  thumbOn: 0.86,
  thumbOff: 0.78,
  /** The thumb must also point away from the hand: tip ↔ index knuckle, × palm size.
   *  A thumb tucked over a fist reads fairly straight but fails this. */
  thumbReach: 0.48,
  /** One Euro filter for fingertips: responsive, light smoothing. */
  minCutoff: 2.2,
  beta: 1.4,
  /** Landmarks missing longer than this = hand gone (ms). */
  lostMs: 200,
};
