// The water's inputs. Fingertips (hand tracking) and pointers (touch / mouse)
// both write touch points here; the simulation turns them into injections.

export type TouchPoint = {
  /** Current position, screen UV (0..1, origin bottom-left — same as the camera texture). */
  x: number;
  y: number;
  /** In the water this frame. */
  active: boolean;
  /** Position of the last injection; null until the first one after touching. */
  lastX: number | null;
  lastY: number | null;
  /** Speed in UV / s (aspect-corrected), smoothed. */
  speed: number;
  /** Seen this frame (stale points are dropped). */
  frame: number;
};

export const touches = new Map<string, TouchPoint>();

/** Count of injections so far (dev readout). */
export const stats = { injections: 0 };

export const setTouch = (id: string, x: number, y: number, active: boolean, frame: number, dt: number, aspect: number) => {
  let t = touches.get(id);
  if (!t) {
    t = { x, y, active: false, lastX: null, lastY: null, speed: 0, frame };
    touches.set(id, t);
  }
  const moved = Math.hypot((x - t.x) * aspect, y - t.y);
  const inst = dt > 0 ? moved / dt : 0;
  t.speed += (inst - t.speed) * Math.min(1, dt * 12);
  t.x = x;
  t.y = y;
  if (!active) {
    t.lastX = null;
    t.lastY = null;
  }
  t.active = active;
  t.frame = frame;
};

/** Forget points not refreshed this frame (lost hand, released pointer). */
export const pruneTouches = (frame: number) => {
  touches.forEach((t, id) => {
    if (t.frame !== frame) touches.delete(id);
  });
};

if (process.env.NODE_ENV !== "production") {
  (window as unknown as { __touches: unknown }).__touches = { touches, stats };
}
