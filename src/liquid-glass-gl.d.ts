// Type definitions for glass-morphism WebGL renderer (LiquidGlassGL)

export interface GLShape { x: number; y: number; w: number; h: number; r: number }

export interface GLParams {
  bezel?: number;
  thickness?: number;
  ior?: number;
  /** Frost blur radius in px. */
  frost?: number;
  chromatic?: number;
  specular?: number;
  /** Smooth-min radius: shapes closer than this melt together. 0 = no merging. */
  merge?: number;
  /** 0–1 white wash. */
  tint?: number;
  magnify?: number;
  shadow?: number;
  saturate?: number;
  lightAngle?: number;
}

export default class LiquidGlassGL {
  constructor(canvas: HTMLCanvasElement, source: TexImageSource, params?: GLParams);
  /** False when WebGL2 is unavailable. */
  readonly ok: boolean;
  params: Required<GLParams>;
  /** Called every frame; return up to 8 shapes in canvas CSS pixels. */
  shapes: () => GLShape[];
  /** Re-upload the source after it changes. */
  uploadSource(): void;
  render(): void;
  start(): void;
  stop(): void;
}

declare global {
  interface Window { LiquidGlassGL: typeof LiquidGlassGL }
}
