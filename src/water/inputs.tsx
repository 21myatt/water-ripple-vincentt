// Inputs → touch points, once per frame (useFrame priority -1, before the
// simulation at -0.5).
//
// - Fingertips: thumb, index, middle and ring of every tracked hand. A finger
//   is "in the water" while it is straight; it then acts like a held cursor.
// - Pointers: a finger on the screen or a pressed mouse button.
import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { XRModel } from "@vincentt-xr/sdk";
import { useXRContext, type XRModelNodeHandTracking } from "@vincentt-xr/sdk/low-level";

import { FINGERS } from "./config";
import { OneEuro } from "./oneEuro";
import { pruneTouches, setTouch } from "./touches";

type Point = { x: number; y: number };

/** Finger chains, wrist-side first: [mcp, pip, dip, tip]. */
const CHAINS: { name: string; joints: [number, number, number, number]; thumb?: boolean }[] = [
  { name: "thumb", joints: [1, 2, 3, 4], thumb: true },
  { name: "index", joints: [5, 6, 7, 8] },
  { name: "middle", joints: [9, 10, 11, 12] },
  { name: "ring", joints: [13, 14, 15, 16] },
];

type FingerState = { fx: OneEuro; fy: OneEuro; straight: boolean; seen: boolean };
const fingers = new Map<string, FingerState>();
const fingerState = (id: string): FingerState => {
  let f = fingers.get(id);
  if (!f) {
    f = { fx: new OneEuro(FINGERS.minCutoff, FINGERS.beta), fy: new OneEuro(FINGERS.minCutoff, FINGERS.beta), straight: false, seen: false };
    fingers.set(id, f);
  }
  return f;
};

/** Read-only view for the debug overlay: fingertip UV + straight flag. */
export const fingertips: { id: string; x: number; y: number; straight: boolean }[] = [];

const len = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Pointers currently pressed, by pointerId, in screen UV. */
const pointers = new Map<number, Point>();

let frame = 0;
let lastSeen = -Infinity;

export const InputRig = () => {
  const { session } = useXRContext();
  const { gl, size } = useThree();

  // Screen touch / mouse. Listeners on the canvas; overlays are click-through.
  useEffect(() => {
    const el = gl.domElement;
    const toUv = (e: PointerEvent): Point => {
      const r = el.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: 1 - (e.clientY - r.top) / r.height };
    };
    const down = (e: PointerEvent) => {
      pointers.set(e.pointerId, toUv(e));
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, toUv(e));
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.style.touchAction = "none";
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    frame += 1;
    const aspect = size.width / Math.max(1, size.height);
    const now = state.clock.elapsedTime * 1000;

    fingertips.length = 0;
    const node = session.getModelNode<XRModelNodeHandTracking>(XRModel.HAND_TRACKER);
    let hands = node?.hands ?? [];
    if (hands.length === 0 && node?.coordinates) hands = [{ coordinates: node.coordinates, handedness: node.handedness }];
    if (hands.some((h) => (h.coordinates?.length ?? 0) >= 21)) lastSeen = now;
    const handsGone = now - lastSeen > FINGERS.lostMs;

    fingers.forEach((f) => {
      f.seen = false;
    });

    hands.forEach((h, hi) => {
      const c = h.coordinates;
      if (!c || c.length < 21) return;
      // Tracker space → screen UV: centre-origin [-1, 1], Y up (mirror already applied by the SDK).
      const uv = (i: number): Point => ({ x: c[i].x * 0.5 + 0.5, y: c[i].y * 0.5 + 0.5 });
      // Aspect-correct for straightness, since UV x and y have different scales.
      const sp = (i: number): Point => ({ x: c[i].x * aspect, y: c[i].y });
      const handKey = h.handedness ?? `hand${hi}`;

      CHAINS.forEach(({ name, joints, thumb }) => {
        const id = `${handKey}:${name}`;
        const f = fingerState(id);
        const [a, b, cc, d] = joints.map(sp);
        const path = len(a, b) + len(b, cc) + len(cc, d);
        const straightness = path > 1e-5 ? len(a, d) / path : 0;
        const on = thumb ? FINGERS.thumbOn : FINGERS.straightOn;
        const off = thumb ? FINGERS.thumbOff : FINGERS.straightOff;
        let straight = f.straight ? straightness > off : straightness > on;
        if (thumb && straight) {
          const palm = len(sp(0), sp(9));
          straight = palm > 1e-5 && len(sp(4), sp(5)) / palm > FINGERS.thumbReach;
        }
        f.straight = straight;

        const tip = uv(joints[3]);
        if (!f.seen && fingertips.every((t) => t.id !== id)) {
          const x = f.fx.filter(tip.x, dt);
          const y = f.fy.filter(tip.y, dt);
          f.seen = true;
          fingertips.push({ id, x, y, straight: f.straight });
          setTouch(id, x, y, f.straight, frame, dt, aspect);
        }
      });
    });

    // Fingers unseen this frame drop their touch (pruned below). Their filters
    // survive a short dropout so tracking resumes smoothly; after that, reset.
    fingers.forEach((f, id) => {
      if (!f.seen && handsGone) fingers.delete(id);
    });

    pointers.forEach((p, pid) => setTouch(`pointer:${pid}`, p.x, p.y, true, frame, dt, aspect));
    pruneTouches(frame);
  }, -1);

  return null;
};
