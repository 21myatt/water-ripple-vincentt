// Shown whenever no hand is in view; gone the moment one appears. Hidden until
// the camera runs, so it never covers the shell's loading / camera-error screens.
import { useRef } from "react";
import type { CSSProperties } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { XRModel } from "@vincentt-xr/sdk";
import {
  useXRError,
  useXRModel,
  useXRReady,
  type XRModelNodeHandTracking,
} from "@vincentt-xr/sdk/low-level";

import { fingertips } from "./inputs";
import { stats } from "./touches";

/** No hand for this long brings the screen back (s). */
const RETURN_AFTER = 1.2;

const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const screen: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  padding: "0 28px max(88px, calc(env(safe-area-inset-bottom) + 72px))",
  background: "linear-gradient(to top, rgba(4,10,18,.5), rgba(4,10,18,0) 45%)",
  color: "#f2f8ff",
  fontFamily: font,
  textAlign: "center",
  opacity: 0,
  transition: "opacity 450ms ease",
  pointerEvents: "none",
  userSelect: "none",
};

const hint: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: "max(40px, calc(env(safe-area-inset-bottom) + 24px))",
  textAlign: "center",
  color: "rgba(242,248,255,.8)",
  font: `500 13px/1.3 ${font}`,
  letterSpacing: "0.04em",
  textShadow: "0 1px 6px rgba(0,0,0,.5)",
  opacity: 0,
  transition: "opacity 450ms ease",
  pointerEvents: "none",
  userSelect: "none",
};

export const Instructions = () => {
  const { ready } = useXRModel<XRModelNodeHandTracking>(XRModel.HAND_TRACKER);
  const cameraReady = useXRReady();
  const cameraError = useXRError();
  const root = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const missing = useRef(RETURN_AFTER);

  useFrame((_s, dt) => {
    const handVisible = fingertips.length > 0;
    missing.current = handVisible ? 0 : missing.current + dt;
    const show = cameraReady && !cameraError && (!ready || missing.current >= RETURN_AFTER);
    if (root.current) root.current.style.opacity = show ? "1" : "0";
    if (titleRef.current) {
      const text = ready ? "Raise your hand" : "Loading hand tracking…";
      if (titleRef.current.textContent !== text) titleRef.current.textContent = text;
    }
    // Hand in view but nothing disturbed yet: a nudge toward the rule.
    if (hintRef.current) {
      const on = handVisible && stats.injections < 6 && !show;
      hintRef.current.style.opacity = on ? "1" : "0";
    }
  });

  return (
    <Html fullscreen zIndexRange={[22, 0]} pointerEvents="none">
      <div ref={root} style={screen}>
        <div style={{ fontSize: 30 }} aria-hidden="true">
          ☝️
        </div>
        <div ref={titleRef} style={{ fontSize: 22, fontWeight: 650, letterSpacing: "0.01em" }}>
          Raise your hand
        </div>
        <div style={{ fontSize: 14, color: "rgba(242,248,255,.75)" }}>
          Straight fingers touch the water — move them to make ripples
        </div>
      </div>
      <div ref={hintRef} style={hint}>
        Straighten a finger and move it through the water
      </div>
    </Html>
  );
};
