// Type definitions for @sasivisvan/glass-morphism (LiquidGlass)
// https://github.com/Sasivisvan/Glass-Morphism

export type Profile = 'squircle' | 'circle' | 'lip' | 'linear';
export type PresetName = 'regular' | 'clear' | 'tinted' | 'prism' | 'lens' | 'thumb';

export interface GlassOptions {
  /** Start from a preset and override individual values. */
  preset?: PresetName;
  /** Width of the curved rim in px. Default 20. */
  bezel?: number;
  /** Glass height in px; more = stronger lensing. Default 24. */
  thickness?: number;
  /** Index of refraction. Default 1.5. */
  ior?: number;
  /** Surface profile of the rim. Default 'squircle'. */
  profile?: Profile;
  /** Multiplier on the final displacement. Default 1. */
  strength?: number;
  /** 0–0.3: pull the interior toward the centre (magnifying lens). Default 0. */
  magnify?: number;
  /** Frost blur in px, applied before refraction. Default 2. */
  blur?: number;
  /** Backdrop saturation. Default 1.5. */
  saturate?: number;
  /** Backdrop brightness multiplier. Default 1. */
  brightness?: number;
  /** 0–0.4: per-channel displacement split (colour fringing). Default 0. */
  chromatic?: number;
  /** 0–1: rim highlight opacity. Default 0.7. */
  specular?: number;
  /** Direction toward the light in degrees (screen space). -135 = top-left. */
  lightAngle?: number;
  /** Ignore LiquidGlass.setLight(). Default false. */
  fixedLight?: boolean;
  /** Override the corner radius in px; null = read from CSS. */
  radius?: number | null;
  /** Blur used when SVG backdrop filters are unsupported. Default 14. */
  fallbackBlur?: number;
  /** Alpha canvas defining an arbitrary glass shape (e.g. text). */
  shape?: HTMLCanvasElement;
}

export interface GlassHandle {
  readonly el: HTMLElement;
  readonly opts: Required<GlassOptions>;
  /** Merge new options and re-render. */
  update(opts: GlassOptions): void;
  /** Remove the filter and stop observing. */
  destroy(): void;
}

export interface TextShape {
  canvas: HTMLCanvasElement;
  mask: string;
  width: number;
  height: number;
}

export interface TextShapeOptions {
  font?: string;
  padding?: number;
  letterSpacing?: number;
  scale?: number;
}

export interface InitOptions {
  /** Re-run init for elements added later. */
  observe?: boolean;
  /** 'pointer' = highlights follow the pointer / device tilt. */
  light?: 'pointer';
}

export interface LiquidGlassAPI {
  readonly version: string;
  /** True in Chromium browsers, where SVG backdrop filters (refraction) work. */
  readonly supported: boolean;
  readonly DEFAULTS: Required<GlassOptions>;
  readonly PRESETS: Record<PresetName, GlassOptions>;
  readonly PROFILES: Record<Profile, (x: number) => number>;
  attach(el: HTMLElement, opts?: PresetName | GlassOptions): GlassHandle;
  detach(el: HTMLElement): void;
  get(el: HTMLElement): GlassHandle | undefined;
  /** Attach [data-liquid-glass] elements and enhance .lg-* components. */
  init(opts?: InitOptions): LiquidGlassAPI;
  init(root?: ParentNode, opts?: InitOptions): LiquidGlassAPI;
  initComponents(root?: ParentNode): void;
  /** Move the light for every glass element. */
  setLight(angle: number, opts?: { immediate?: boolean }): void;
  /** Light follows the pointer / device orientation. Returns a stop function. */
  followPointer(opts?: { range?: number }): () => void;
  textShape(text: string, opts?: TextShapeOptions): TextShape;
  /** Turn an element into glass shaped like `text`. */
  attachText(el: HTMLElement, text: string, opts?: PresetName | (GlassOptions & TextShapeOptions)): Promise<GlassHandle>;
  lens: { on(el: HTMLElement, opts?: GlassOptions): void; off(el: HTMLElement, opts?: GlassOptions): void };
}

declare const LiquidGlass: LiquidGlassAPI;
export default LiquidGlass;
export const attach: LiquidGlassAPI['attach'];
export const detach: LiquidGlassAPI['detach'];
export const get: LiquidGlassAPI['get'];
export const init: LiquidGlassAPI['init'];
export const initComponents: LiquidGlassAPI['initComponents'];
export const setLight: LiquidGlassAPI['setLight'];
export const followPointer: LiquidGlassAPI['followPointer'];
export const textShape: LiquidGlassAPI['textShape'];
export const attachText: LiquidGlassAPI['attachText'];
export const PRESETS: LiquidGlassAPI['PRESETS'];
export const DEFAULTS: LiquidGlassAPI['DEFAULTS'];
export const supported: boolean;

declare global {
  interface Window { LiquidGlass: LiquidGlassAPI }
  interface HTMLElementEventMap {
    'lg-change': CustomEvent<{ index: number; item: HTMLElement }>;
    'lg-open': CustomEvent;
    'lg-close': CustomEvent;
  }
}
