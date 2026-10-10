// Scene.tsx — Fingertip Water Ripple. The camera image lies beneath a thin,
// invisible layer of water; straight fingertips disturb it. See Brief.md (what)
// and PLAN.md (how).
import { lazy, Suspense } from "react";
import { HandTracker } from "@vincentt-xr/sdk/tracking";

import { Credit } from "./water/Credit";
import { ExperienceStatus } from "./water/ExperienceStatus";
import { InputRig } from "./water/inputs";
import { Instructions } from "./water/Instructions";
import { Water } from "./water/Water";

// Dev-only `?debug` overlay, lazy and behind a constant esbuild folds to false
// in production. Two rules: `process.env.NODE_ENV`, not `import.meta.env.DEV`
// (vincentt-xr/v2-template#112); and write the check INSIDE the ternary —
// hoisted into a `const`, esbuild keeps the dead branch and the chunk ships.
const HandDebug =
  process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).has("debug")
    ? lazy(() => import("./water/HandDebug"))
    : null;

export const Scene = () => (
  <>
    {/* 30 fps inference: fingertips are smoothed between samples. */}
    <HandTracker targetFps={30} />
    <InputRig />
    <ExperienceStatus />

    <Water />
    <Instructions />
    <Credit />

    {HandDebug ? (
      <Suspense fallback={null}>
        <HandDebug />
      </Suspense>
    ) : null}
  </>
);
