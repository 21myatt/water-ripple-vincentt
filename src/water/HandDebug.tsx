// Dev-only (lazy-loaded by Scene.tsx). `?debug` — fingertips (cyan = in the water,
// grey = lifted) and the injection count.
import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color } from "three";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";

import { fingertips } from "./inputs";
import { stats } from "./touches";

const MAX = 16;
const ON = new Color("#00e5ff");
const OFF = new Color("#8a8f98");

const HandDebug = () => {
  const textRef = useRef<HTMLPreElement>(null);
  const { viewport, camera } = useThree();
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(MAX * 3), 3));
    g.setAttribute("color", new BufferAttribute(new Float32Array(MAX * 3), 3));
    return g;
  }, []);

  useFrame(() => {
    const { width, height } = viewport.getCurrentViewport(camera, [0, 0, 0]);
    const pos = geometry.getAttribute("position") as BufferAttribute;
    const col = geometry.getAttribute("color") as BufferAttribute;
    for (let i = 0; i < MAX; i += 1) {
      const t = fingertips[i];
      if (t) {
        pos.setXYZ(i, (t.x - 0.5) * width, (t.y - 0.5) * height, 0.5);
        const c = t.straight ? ON : OFF;
        col.setXYZ(i, c.r, c.g, c.b);
      } else {
        pos.setXYZ(i, 0, 0, 100);
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    if (textRef.current) {
      textRef.current.textContent =
        `${fingertips.length} tips  in water: ${fingertips.filter((t) => t.straight).map((t) => t.id).join(", ") || "none"}\n` +
        `injections ${stats.injections}`;
    }
  });

  return (
    <>
      <points geometry={geometry} renderOrder={50} frustumCulled={false}>
        <pointsMaterial size={10} sizeAttenuation={false} vertexColors depthTest={false} />
      </points>
      <Html fullscreen zIndexRange={[30, 0]} pointerEvents="none">
        <pre
          ref={textRef}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            margin: 0,
            font: "11px/1.4 ui-monospace, monospace",
            color: "#9ff",
            background: "rgba(0,0,0,.5)",
            padding: "6px 8px",
            borderRadius: 6,
          }}
        />
      </Html>
    </>
  );
};

export default HandDebug;
