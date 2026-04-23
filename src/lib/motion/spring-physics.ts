/**
 * spring-physics.ts
 * 
 * High-precision Spring Physics Engine for the Creative OS.
 * Implementation based on Hooke's Law: F = -k * x - c * v
 * Includes sub-frame sampling (8x) for silky smooth motion.
 */

export interface SpringConfig {
  stiffness: number; // k
  damping: number;   // c
  mass: number;      // m
}

export interface SpringState {
  current: number;
  target: number;
  velocity: number;
}

export class SpringIntegrator {
  private state: Map<string, SpringState> = new Map();
  private lastTime: number = performance.now();

  /** 
   * Update the spring state for a specific property.
   * Performs 8 sub-frame steps per call for high precision.
   */
  update(
    id: string, 
    target: number, 
    config: SpringConfig,
    dt: number = 1/60
  ): number {
    let s = this.state.get(id);
    if (!s) {
      s = { current: target, target, velocity: 0 };
      this.state.set(id, s);
    }
    s.target = target;

    // Sub-frame sampling (8 steps)
    const subDt = dt / 8;
    for (let i = 0; i < 8; i++) {
      const force = -config.stiffness * (s.current - s.target) - config.damping * s.velocity;
      const acceleration = force / config.mass;
      s.velocity += acceleration * subDt;
      s.current += s.velocity * subDt;
    }

    return s.current;
  }

  getVelocity(id: string): number {
    return this.state.get(id)?.velocity || 0;
  }

  reset(id: string, value: number) {
    this.state.set(id, { current: value, target: value, velocity: 0 });
  }
}
