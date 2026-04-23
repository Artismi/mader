import {
  Fn, vec2, vec4, texture, float, uniform, uv, mix, fract, sin, dot, timerLocal
} from 'three/tsl';

/**
 * Optical Flow Motion Blur Node
 * Smears the pixels along a velocity vector.
 */
export const opticalFlowBlur = Fn(([ colorTexture, vUv, velocity, intensity ]) => {
  const steps = 8;
  const stepSize = intensity.mul(velocity).div(float(steps));
  
  let finalColor = texture(colorTexture, vUv);
  
  for (let i = 1; i < steps; i++) {
    const offset = stepSize.mul(float(i));
    const sampleUV = vUv.sub(offset);
    finalColor = finalColor.add(texture(colorTexture, sampleUV));
  }
  
  return finalColor.div(float(steps));
});

/**
 * Temporal Feedback Node
 * Blends the current frame with the previous state to create trails.
 */
export const temporalFeedback = Fn(([ currentColor, previousTexture, vUv, persistence ]) => {
  const prevColor = texture(previousTexture, vUv);
  return mix(currentColor, prevColor, persistence);
});

/**
 * High-Precision 16-bit Dithering Node
 * Eliminates banding in dark/smooth areas.
 */
export const cinemaDither = Fn(([ color ]) => {
  // AG2: Animate noise seed per-frame to break static spatially-correlated grain grid
  const t = timerLocal()
  const animatedUv = uv().add(fract(t.mul(0.1)))
  const noise = fract(sin(dot(animatedUv, vec2(12.9898, 78.233))).mul(43758.5453))
  const ditherAmount = float(1.0).div(255.0)
  return color.add(noise.sub(0.5).mul(ditherAmount))
});

/**
 * Beat Pulse Node
 * Returns a 0-1 pulse based on the global BPM clock.
 */
export const beatPulse = Fn(([ bpmClock ]) => {
  return sin(bpmClock.mul(Math.PI)).mul(0.5).add(0.5);
});
