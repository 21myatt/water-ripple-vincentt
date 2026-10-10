// The water: a persistent GPU wave simulation (Polygon's Buffer A) and a
// full-screen refraction of the live camera (Polygon's Image pass).
//
// Shader foundation: "Buffer A" and "Image" by Polygon on Shadertoy —
// https://www.shadertoy.com/user/Polygon. Shadertoy inputs are replaced:
// iResolution → uResolution, iFrame → cleared targets, iMouse → fingertip
// capsules (uSeg / uSegParam), iChannel0 → the previous simulation state,
// iChannel1 → the SDK's camera texture.
//
// Alignment: Vincentt's <VideoBackground> draws useXRCameraTexture() across the
// full viewport with UV 0..1 (the SDK already cover-crops and mirrors it), so
// screen UV = camera UV = simulation UV, and the refraction quad lines up by
// construction.
import { useEffect, useMemo, useRef } from "react";
import {
  GLSL3,
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector4,
  WebGLRenderTarget,
} from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRCameraTexture } from "@vincentt-xr/sdk/low-level";

import { LOOK, RIPPLE, SIM } from "./config";
import { stats, touches } from "./touches";

const MAX_SEG = 8;

// ─── Buffer A: wave simulation ───────────────────────────────────────────────

const simVert = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const simFrag = /* glsl */ `
precision highp float;
uniform sampler2D uState;
uniform vec2 uResolution;
uniform float uDelta;
uniform float uSpring;
uniform float uVelDamp;
uniform float uPressDamp;
uniform float uDeadZone;
uniform int uCount;
uniform vec4 uSeg[${MAX_SEG}];      // a.xy, b.xy in sim pixels
uniform vec4 uSegParam[${MAX_SEG}]; // radius, strength, falloff, -
// GLSL3: three.js does not define gl_FragColor here, so declare the output.
layout(location = 0) out highp vec4 fragColor;

float segDist(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  return distance(p, a + t * ab);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  ivec2 ic = ivec2(fragCoord);
  ivec2 maxc = ivec2(uResolution) - 1;
  vec4 here = texelFetch(uState, ic, 0);
  float pressure = here.x;
  float pVel = here.y;

  float p_right = texelFetch(uState, min(ic + ivec2(1, 0), maxc), 0).x;
  float p_left  = texelFetch(uState, max(ic + ivec2(-1, 0), ivec2(0)), 0).x;
  float p_up    = texelFetch(uState, min(ic + ivec2(0, 1), maxc), 0).x;
  float p_down  = texelFetch(uState, max(ic + ivec2(0, -1), ivec2(0)), 0).x;

  // Polygon: change values so the screen boundaries aren't fixed.
  if (fragCoord.x == 0.5) p_left = p_right;
  if (fragCoord.x == uResolution.x - 0.5) p_right = p_left;
  if (fragCoord.y == 0.5) p_down = p_up;
  if (fragCoord.y == uResolution.y - 0.5) p_up = p_down;

  // Horizontal and vertical wave function.
  pVel += uDelta * (-2.0 * pressure + p_right + p_left) / 4.0;
  pVel += uDelta * (-2.0 * pressure + p_up + p_down) / 4.0;
  pressure += uDelta * pVel;
  // "Spring" motion: water waves rather than sound waves.
  pVel -= uSpring * uDelta * pressure;
  // Damping so things calm down, and pressure can't build up forever.
  pVel *= 1.0 - uVelDamp * uDelta;
  pressure *= uPressDamp;

  // Idle water settles to exactly flat (half-float residue otherwise lingers).
  if (abs(pressure) < uDeadZone && abs(pVel) < uDeadZone) { pressure = 0.0; pVel = 0.0; }

  vec4 outv = vec4(pressure, pVel, (p_right - p_left) / 2.0, (p_up - p_down) / 2.0);

  // Fingertip injection (replaces iMouse): capsules from the last injection point.
  for (int i = 0; i < ${MAX_SEG}; i++) {
    if (i >= uCount) break;
    vec4 s = uSeg[i];
    vec4 sp = uSegParam[i];
    float d = segDist(fragCoord, s.xy, s.zw);
    if (d <= sp.x) outv.x += sp.y * pow(1.0 - d / sp.x, sp.z);
  }

  fragColor = outv;
}
`;

// ─── Image: refraction + glint ───────────────────────────────────────────────

const imageVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const imageFrag = /* glsl */ `
uniform sampler2D uState;
uniform sampler2D uCamera;
uniform float uRefraction;
uniform float uGlint;
uniform float uGlintPower;
uniform float uShowHeight;
varying vec2 vUv;

void main() {
  vec4 data = texture2D(uState, vUv);
  // Color = camera, offset by the water's slope.
  vec4 color = texture2D(uCamera, clamp(vUv + uRefraction * data.zw, 0.0, 1.0));
  // Sunlight glint. Only where the surface tilts, so flat water is untouched.
  vec3 normal = normalize(vec3(-data.z, 0.2, -data.w));
  float flat_ = pow(max(0.0, dot(vec3(0.0, 1.0, 0.0), normalize(vec3(-3.0, 10.0, 3.0)))), uGlintPower);
  float g = pow(max(0.0, dot(normal, normalize(vec3(-3.0, 10.0, 3.0)))), uGlintPower);
  color.rgb += vec3(max(0.0, g - flat_)) * uGlint;
  // Debug (?debug=height): Polygon's "brightness = water height" view, blended in.
  color.rgb = mix(color.rgb, vec3(data.x * 2.0 + 0.5), uShowHeight);
  gl_FragColor = vec4(color.rgb, 1.0);
  #ifdef CAMERA_SRGB
  #include <colorspace_fragment>
  #endif
}
`;

const makeTarget = (w: number, h: number) =>
  new WebGLRenderTarget(w, h, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  });

export const Water = () => {
  const { gl, size } = useThree();
  const camera = useXRCameraTexture();

  // Simulation size: fixed width, viewport aspect.
  const simW = SIM.width;
  const simH = Math.max(1, Math.round((SIM.width * size.height) / Math.max(1, size.width)));

  const sim = useMemo(() => {
    const material = new ShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: simVert,
      fragmentShader: simFrag,
      uniforms: {
        uState: { value: null },
        uResolution: { value: new Vector2(simW, simH) },
        uDelta: { value: SIM.delta },
        uSpring: { value: SIM.spring },
        uVelDamp: { value: SIM.velocityDamping },
        uPressDamp: { value: SIM.pressureDamping },
        uDeadZone: { value: SIM.deadZone },
        uCount: { value: 0 },
        uSeg: { value: Array.from({ length: MAX_SEG }, () => new Vector4()) },
        uSegParam: { value: Array.from({ length: MAX_SEG }, () => new Vector4()) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const scene = new Scene();
    const quad = new Mesh(new PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    scene.add(quad);
    return { material, scene, cam: new OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [simW, simH]);

  const targets = useMemo(() => [makeTarget(simW, simH), makeTarget(simW, simH)], [simW, simH]);
  const read = useRef(0);
  const acc = useRef(0);


  // Fresh targets start at zero (Polygon's iFrame == 0 branch).
  useEffect(() => {
    const prev = gl.getRenderTarget();
    targets.forEach((t) => {
      gl.setRenderTarget(t);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, false, false);
    });
    gl.setRenderTarget(prev);
    return () => targets.forEach((t) => t.dispose());
  }, [gl, targets]);

  const image = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: imageVert,
        fragmentShader: imageFrag,
        uniforms: {
          uState: { value: null },
          uCamera: { value: null },
          uRefraction: { value: LOOK.refraction },
          uGlint: { value: LOOK.glint },
          uGlintPower: { value: LOOK.glintPower },
          uShowHeight: {
            value:
              process.env.NODE_ENV !== "production" &&
              new URLSearchParams(window.location.search).get("debug") === "height"
                ? 0.85
                : 0,
          },
        },
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  if (process.env.NODE_ENV !== "production") {
    (window as unknown as { __water: unknown }).__water = { gl, targets, read, simW, simH, image, camera, sim };
  }

  // Match the camera texture's colour handling, like VideoBackground's basic material.
  useEffect(() => {
    if (!camera) return;
    const srgb = camera.colorSpace === SRGBColorSpace;
    image.defines = srgb ? { CAMERA_SRGB: "" } : {};
    image.needsUpdate = true;
  }, [camera, image]);

  useFrame((_state, rawDt) => {
    // ── Collect injections (fingertips and pointers) ──
    const u = sim.material.uniforms;
    let n = 0;
    const aspect = size.width / Math.max(1, size.height);
    touches.forEach((t) => {
      if (!t.active || n >= RIPPLE.maxInjections) return;
      const x = t.x * simW;
      const y = t.y * simH;
      if (t.lastX === null || t.lastY === null) {
        // Entering the water: one splash.
        u.uSeg.value[n].set(x, y, x, y);
        u.uSegParam.value[n].set(RIPPLE.splashRadius, RIPPLE.splashStrength, RIPPLE.falloff, 0);
        t.lastX = t.x;
        t.lastY = t.y;
        n += 1;
        return;
      }
      const moved = Math.hypot((t.x - t.lastX) * aspect, t.y - t.lastY);
      if (moved < RIPPLE.minMove) return; // a still fingertip adds nothing
      const strength = Math.min(RIPPLE.maxStrength, RIPPLE.strength + t.speed * RIPPLE.speedGain);
      u.uSeg.value[n].set(t.lastX * simW, t.lastY * simH, x, y);
      u.uSegParam.value[n].set(RIPPLE.radius, strength, RIPPLE.falloff, 0);
      t.lastX = t.x;
      t.lastY = t.y;
      n += 1;
    });
    stats.injections += n;

    // ── Step the simulation at a fixed rate ──
    acc.current = Math.min(acc.current + rawDt, SIM.maxSteps / SIM.rate);
    let steps = Math.floor(acc.current * SIM.rate);
    if (steps === 0 && n > 0) steps = 1; // never drop an injection
    acc.current -= steps / SIM.rate;
    if (acc.current < 0) acc.current = 0;

    const prev = gl.getRenderTarget();
    for (let s = 0; s < steps; s += 1) {
      // Inject on the first sub-step only.
      u.uCount.value = s === 0 ? n : 0;
      u.uState.value = targets[read.current].texture;
      gl.setRenderTarget(targets[1 - read.current]);
      gl.render(sim.scene, sim.cam);
      read.current = 1 - read.current;
    }
    gl.setRenderTarget(prev);

    image.uniforms.uState.value = targets[read.current].texture;
    image.uniforms.uCamera.value = camera ?? null;
  }, -0.5);

  // Drawn right after Vincentt's VideoBackground (renderOrder -999 in App.tsx).
  return (
    <mesh material={image} renderOrder={-998} frustumCulled={false} visible={!!camera}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};
