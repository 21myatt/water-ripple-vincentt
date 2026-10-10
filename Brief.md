Build a real-time webcam experience that transforms the camera feed into a responsive water-like surface. When the user touches the screen with a fingertip gesture or moves their fingertips close to the virtual surface, realistic ripples spread outward from those points, distorting the live camera image as though it were reflected in water.

The goal is to create a minimal, visually rich experience driven by hand movement and fluid simulation, not a conventional AR scene.

## 1. Core Interaction

### Fingertip Touch

Track the user's hand through the webcam and detect the tips of the index finger, middle finger, ring finger, and thumb.

When a fingertip touches the virtual surface, inject a disturbance into the water simulation at its corresponding screen position.

The interaction should produce:

- Circular ripples spreading outward from the fingertip.
- Smooth refraction and distortion of the live camera image.
- Subtle highlights that catch the light along the moving wave.
- Overlapping wave patterns when multiple fingertips touch simultaneously.

### Fingertip Movement

As the user drags a fingertip across the virtual surface, leave a continuous trail of smaller disturbances. Moving faster should create a more energetic wake.

When the fingertip stops, the ripples should continue spreading naturally before gradually fading away.

### Multiple Fingers

Allow several fingertips to generate ripples simultaneously. Each finger should create its own disturbance, with waves interacting and overlapping naturally.

Avoid generating a new disturbance every frame without control. Use movement thresholds, touch-state tracking, and adjustable injection strength to prevent excessive noise.

### Idle State

When no fingers interact with the surface, the camera image should remain stable and undistorted. Previously generated ripples should continue evolving until the water settles.

## 2. Water Simulation Shader

Use the supplied Buffer A and Image shader code as the foundation of the effect.

### Buffer A: Wave Simulation

Maintain a persistent simulation texture containing:

- Water pressure or height.
- Pressure velocity.
- Horizontal height gradient.
- Vertical height gradient.

Update the simulation using neighboring texels to propagate waves across the surface. Preserve the spring-like behavior and damping that allow ripples to spread and gradually settle.

Replace the existing mouse-based disturbance injection with fingertip coordinates supplied by the hand-tracking system.

Each fingertip disturbance should support configurable:

- Injection radius.
- Wave strength.
- Falloff.
- Velocity or movement-based intensity.

Support multiple simultaneous fingertip inputs.

### Image: Refraction and Lighting

Use the simulation texture to distort the live webcam feed through its height gradients.

Preserve the core refraction approach:

- Sample the camera texture with gradient-based UV offsets.
- Calculate a simulated surface normal from the height gradients.
- Add a subtle specular highlight to create the impression of a reflective water surface.

The effect should distort the actual camera image rather than place a separate water texture over it.

Keep the original shader behavior recognizable while tuning its parameters for a webcam-sized real-time render.

## 3. Hand Tracking

Use the project's existing webcam hand-tracking architecture, or a suitable browser-based hand-landmark tracker.

- Track fingertip landmarks in real time.
- Convert normalized landmark coordinates into simulation texture coordinates.
- Account for the webcam's mirrored display and coordinate orientation.
- Smooth fingertip movement enough to reduce jitter without introducing noticeable latency.
- Detect fingertip contact using a configurable virtual interaction zone or a deliberate touch gesture.
- Support multiple hands if the tracking system allows it.

Do not assume that a fingertip is physically touching a real surface. The experience should simulate contact using a clear, consistent interaction rule.

For the initial version, prefer fingertip proximity or a deliberate pinch/touch gesture over complex contact inference.

## 4. Visual Direction

Keep the experience minimal and immersive.

- Show the user's live camera feed across the full viewport.
- Use transparent-looking water refraction instead of an opaque blue overlay.
- Keep highlights subtle, elegant, and physically inspired.
- Make small ripples visible without overwhelming the camera image.
- Allow larger, more energetic waves when the user moves quickly.
- Avoid unnecessary 3D objects, UI panels, and decorative effects.

The effect should feel like the camera image exists beneath a thin, invisible layer of water.

## 5. Technical Requirements

- Use the existing Vite, React, and Three.js/React Three Fiber stack where applicable.
- Implement the wave simulation using ping-pong render targets or an equivalent persistent GPU simulation.
- Preserve simulation state between frames.
- Use the supplied shaders as the starting point rather than replacing them with a static ripple animation.
- Replace Shadertoy-specific inputs such as `iResolution`, `iFrame`, `iMouse`, and `iChannel0` with the appropriate application uniforms and textures.
- Pass fingertip positions from the hand-tracking layer into the shader.
- Handle multiple ripple sources in a single simulation update.
- Use a lower-resolution simulation buffer if needed for performance, while rendering the final distortion at display resolution.
- Ensure that the camera texture and simulation UV coordinates remain aligned.
- Keep the effect responsive on ordinary laptops with webcams.

## 6. Implementation Order

**Phase 1:** Render the live camera feed with the supplied refraction shader and a persistent wave simulation.

**Phase 2:** Replace mouse input with one tracked fingertip and verify coordinate mapping.

**Phase 3:** Add continuous fingertip trails, adjustable ripple strength, and smooth wave decay.

**Phase 4:** Support multiple fingertips and overlapping ripples.

**Phase 5:** Tune performance, lighting, refraction, and tracking responsiveness.

## 7. Success Criteria

The user should be able to move a fingertip across the camera view and see realistic ripples emerge exactly where the finger moves.

Ripples should spread naturally, distort the live image, overlap without breaking, and eventually disappear.

The experience must remain visually stable when the hand is idle, and the interaction should feel immediate.

**Design principle: Your fingertips do not touch the screen. They disturb the invisible water between you and the camera.**

Source Code from Shader Toys
Credits to Polygon (https://www.shadertoy.com/user/Polygon)
###Buffer

```jsx
// Make this a smaller number for a smaller timestep.
// Don't make it bigger than 1.4 or the universe will explode.
const float delta = 1.0;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    if (iFrame == 0) {fragColor = vec4(0); return;}

    float pressure = texelFetch(iChannel0, ivec2(fragCoord), 0).x;
    float pVel = texelFetch(iChannel0, ivec2(fragCoord), 0).y;

    float p_right = texelFetch(iChannel0, ivec2(fragCoord) + ivec2(1, 0), 0).x;
    float p_left = texelFetch(iChannel0, ivec2(fragCoord) + ivec2(-1, 0), 0).x;
    float p_up = texelFetch(iChannel0, ivec2(fragCoord) + ivec2(0, 1), 0).x;
    float p_down = texelFetch(iChannel0, ivec2(fragCoord) + ivec2(0, -1), 0).x;

    // Change values so the screen boundaries aren't fixed.
    if (fragCoord.x == 0.5) p_left = p_right;
    if (fragCoord.x == iResolution.x - 0.5) p_right = p_left;
	if (fragCoord.y == 0.5) p_down = p_up;
    if (fragCoord.y == iResolution.y - 0.5) p_up = p_down;

    // Apply horizontal wave function
    pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
    // Apply vertical wave function (these could just as easily have been one line)
    pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;

    // Change pressure by pressure velocity
    pressure += delta * pVel;

    // "Spring" motion. This makes the waves look more like water waves and less like sound waves.
    pVel -= 0.005 * delta * pressure;

    // Velocity damping so things eventually calm down
    pVel *= 1.0 - 0.002 * delta;

    // Pressure damping to prevent it from building up forever.
    pressure *= 0.999;

    //x = pressure. y = pressure velocity. Z and W = X and Y gradient
    fragColor.xyzw = vec4(pressure, pVel, (p_right - p_left) / 2.0, (p_up - p_down) / 2.0);


    if (iMouse.z > 1.0) {
        float dist = distance(fragCoord, iMouse.xy);
        if (dist <= 20.0) {
            fragColor.x += 1.0 - dist / 20.0;
        }
    }
}
```

###Image

```jsx
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    vec4 data = texture(iChannel0, uv);

    // Brightness = water height
    //fragColor.xyz = vec3(data.x + 1.0) / 2.0;

    // Color = texture
    fragColor = texture(iChannel1, uv + 0.2 * data.zw);

    // Sunlight glint
    vec3 normal = normalize(vec3(-data.z, 0.2, -data.w));
    fragColor += vec4(1) * pow(max(0.0, dot(normal, normalize(vec3(-3, 10, 3)))), 60.0);
}
```
