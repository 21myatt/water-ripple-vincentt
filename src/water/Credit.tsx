// Credit for the water shader: Polygon on Shadertoy (Buffer A + Image).
// Full text in CREDITS.md. Only the link takes pointer events.
import type { CSSProperties } from "react";
import { Html } from "@react-three/drei";

const AUTHOR_URL = "https://www.shadertoy.com/user/Polygon";

const box: CSSProperties = {
  position: "absolute",
  right: 10,
  bottom: "max(8px, env(safe-area-inset-bottom))",
  maxWidth: "calc(100% - 20px)",
  font: '400 9px/1.3 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: "rgba(255,255,255,.6)",
  textShadow: "0 1px 3px rgba(0,0,0,.55)",
  letterSpacing: "0.02em",
  textAlign: "right",
  pointerEvents: "none",
  userSelect: "none",
};

const link: CSSProperties = { color: "inherit", textDecoration: "underline", pointerEvents: "auto" };

export const Credit = () => (
  <Html fullscreen zIndexRange={[21, 0]} pointerEvents="none">
    <div style={box}>
      Water shader based on work by{" "}
      <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" style={link}>
        Polygon
      </a>{" "}
      on Shadertoy · modified
    </div>
  </Html>
);
