/**
 * ASCII Compositor Module
 *
 * A stateful scene manager for compositing ASCII art objects with proper layering,
 * transparency, and proximity-based influence effects. Optimized for animation
 * performance through viewport caching and object-level dirty tracking.
 *
 * @module @ascii-art-studio/compositor
 */

import { AsciiObject, type Influence, type Bounds, type RGB, parseHexColor } from './AsciiObject';

// Re-export types for public API
export { AsciiObject, type Influence };

/** Pre-computed hex lookup table: index 0-255 → '00'..'ff' */
const HEX_LUT: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

/** Convert RGB tuple to hex string */
function rgbToHex(rgb: RGB): string {
  return `#${HEX_LUT[rgb[0]]}${HEX_LUT[rgb[1]]}${HEX_LUT[rgb[2]]}`;
}

/** RGB black constant */
const RGB_BLACK: RGB = [0, 0, 0];
const RGB_WHITE: RGB = [255, 255, 255];

/**
 * Uniform color effect applied to an entire layer.
 * Applied to the whole viewport before rendering objects on the layer.
 * Like a colored filter or Photoshop adjustment layer.
 */
export interface LayerEffect {
  /** Color of the effect (hex #RRGGBB) */
  color: string;
  /** Transform type */
  type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
  /** Effect strength (0.0 to 1.0) */
  strength: number;
  /** Darken factor for multiply-darken (0.0 to 1.0, default 0.8) */
  darkenFactor?: number;
}

/** Camera viewport defining the visible region */
interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rendered output from the compositor.
 * Separate character and color grids for memory efficiency.
 */
export interface RenderOutput {
  /** 2D grid of characters [y][x] */
  characters: string[][];
  /** 2D grid of hex colors [y][x] (same dimensions as characters) */
  colors: string[][];
}

/**
 * ASCII Compositor - Stateful scene manager for ASCII art composition.
 *
 * Manages a collection of ASCII objects with layering, transparency, and influence effects.
 * Optimized for animation through whole-viewport caching with dirty region invalidation.
 *
 * Key features:
 * - Layer-based rendering (higher layers on top)
 * - Proximity-based influence gradients
 * - Glass pane effect (spaces with influence)
 * - Auto-edge detection via flood fill
 * - Viewport caching for performance
 * - Object flip operations
 *
 * @example
 * ```typescript
 * const compositor = new Compositor();
 * compositor.addObject('bg', {
 *   content: ['####', '####'],
 *   position: { x: 0, y: 0 },
 *   color: '#0000ff',
 *   layer: 0
 * });
 * const output = compositor.render({ x: 0, y: 0, width: 10, height: 10 });
 * ```
 */
export class Compositor {
  /** Scene objects stored by ID */
  private objects: Map<string, AsciiObject> = new Map();

  /** Layer effects stored by layer number */
  private layerEffects: Map<number, LayerEffect> = new Map();

  /** Pre-parsed RGB for layer effect colors */
  private layerEffectRGBs: Map<number, RGB> = new Map();

  /** Default viewport for render() calls */
  private defaultViewport?: Viewport;

  /** Dirty regions tracked as coordinate strings "x,y" */
  private dirtyRegions: Set<string> = new Set();

  /** Last rendered viewport for cache validation */
  private lastViewport?: Viewport;

  /** Cached render output (deep clone) */
  private cachedOutput?: RenderOutput;

  /**
   * Creates a new compositor with optional initial objects and default viewport.
   *
   * @param initialObjects - Optional array of AsciiObject instances to add at construction
   * @param defaultViewport - Optional default viewport for render() calls
   * @throws {Error} If duplicate object IDs are provided
   */
  constructor(initialObjects?: AsciiObject[], defaultViewport?: Viewport) {
    this.defaultViewport = defaultViewport;

    if (initialObjects) {
      for (const obj of initialObjects) {
        this.addObject(obj);
      }
    }
  }

  /**
   * Adds an AsciiObject to the scene.
   *
   * The object's current bounds are marked dirty to invalidate the render cache.
   *
   * @param obj - AsciiObject instance to add
   * @throws {Error} If object ID already exists
   */
  addObject(obj: AsciiObject): void {
    // Check for duplicate ID
    if (this.objects.has(obj.id)) {
      throw new Error(`Object with id '${obj.id}' already exists`);
    }

    this.objects.set(obj.id, obj);
    this.markRegionDirty(obj.getBounds());
  }

  /**
   * Removes an object from the scene.
   *
   * The object's region (including influence) is marked dirty to invalidate the cache.
   *
   * @param id - Object identifier
   * @throws {Error} If object ID not found
   */
  removeObject(id: string): void {
    const obj = this.getObjectOrThrow(id);
    this.markRegionDirty(obj.getBounds());
    this.objects.delete(id);
  }

  /**
   * Returns an object by ID.
   *
   * Objects are mutable - changes to the returned object will affect the scene.
   * Use object mutation methods (setPosition, setContent, etc.) to modify objects.
   *
   * @param id - Object identifier
   * @returns The AsciiObject instance
   * @throws {Error} If object ID not found
   */
  getObject(id: string): AsciiObject {
    return this.getObjectOrThrow(id);
  }

  /**
   * Returns all objects in the scene.
   *
   * Objects are mutable - changes to returned objects will affect the scene.
   *
   * @returns Array of AsciiObject instances
   */
  listObjects(): AsciiObject[] {
    return Array.from(this.objects.values());
  }

  /**
   * Set a uniform color effect for a layer.
   * The effect is applied to the entire viewport BEFORE rendering objects on this layer.
   * This creates a "filter layer" effect that tints everything below uniformly.
   *
   * @param layer - Layer number
   * @param effect - Layer effect configuration, or null to remove
   * @throws {Error} If color is not valid #RRGGBB format
   * @throws {Error} If strength is not between 0.0 and 1.0
   * @throws {Error} If darkenFactor is provided and not between 0.0 and 1.0
   *
   * @example
   * // Blue fog layer
   * compositor.setLayerEffect(3, {
   *   color: '#4444ff',
   *   type: 'multiply',
   *   strength: 0.5
   * });
   *
   * // Remove effect
   * compositor.setLayerEffect(3, null);
   */
  setLayerEffect(layer: number, effect: LayerEffect | null): void {
    if (effect === null) {
      this.layerEffects.delete(layer);
      this.layerEffectRGBs.delete(layer);
      // Mark entire viewport dirty since layer effect affects everything
      this.dirtyRegions.add('layer-effect');
      return;
    }

    // Validate color format
    if (!this.isValidColor(effect.color)) {
      throw new Error('Invalid color format: must be #RRGGBB');
    }

    // Validate strength
    if (effect.strength < 0 || effect.strength > 1) {
      throw new Error('Strength must be between 0.0 and 1.0');
    }

    // Validate darkenFactor if present
    if (effect.darkenFactor !== undefined) {
      if (effect.darkenFactor < 0 || effect.darkenFactor > 1) {
        throw new Error('darkenFactor must be between 0.0 and 1.0');
      }
      if (effect.type !== 'multiply-darken') {
        throw new Error('darkenFactor can only be used with multiply-darken transform type');
      }
    }

    // Store deep clone to prevent external mutations
    const normalizedColor = effect.color.toLowerCase();
    this.layerEffects.set(layer, {
      color: normalizedColor,
      type: effect.type,
      strength: effect.strength,
      ...(effect.darkenFactor !== undefined && { darkenFactor: effect.darkenFactor }),
    });
    this.layerEffectRGBs.set(layer, parseHexColor(normalizedColor));

    // Mark entire viewport dirty
    this.dirtyRegions.add('layer-effect');
  }

  /**
   * Get the current effect for a layer.
   *
   * @param layer - Layer number
   * @returns Deep clone of layer effect, or null if no effect is set
   */
  getLayerEffect(layer: number): LayerEffect | null {
    const effect = this.layerEffects.get(layer);
    if (!effect) {
      return null;
    }

    // Return deep clone
    return {
      color: effect.color,
      type: effect.type,
      strength: effect.strength,
      ...(effect.darkenFactor !== undefined && { darkenFactor: effect.darkenFactor }),
    };
  }

  /**
   * Returns the minimal bounding box containing all objects (including influence).
   *
   * If no objects exist, returns a zero-sized box at origin.
   *
   * @returns Canvas bounds
   */
  getCanvasBounds(): Bounds {
    if (this.objects.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Union of all object bounds
    for (const obj of this.objects.values()) {
      const bounds = obj.getBounds();
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Renders the scene to the specified viewport.
   *
   * Uses whole-viewport caching: if viewport unchanged and no dirty regions,
   * returns cached result. Otherwise re-renders entire viewport.
   *
   * @param viewport - Optional viewport (uses default if omitted)
   * @returns Rendered character and color grids
   * @throws {Error} If no viewport specified and no default viewport set
   * @throws {Error} If viewport width or height is not positive
   */
  render(viewport?: Viewport): RenderOutput {
    const vp = viewport || this.defaultViewport;
    if (!vp) {
      throw new Error('No viewport specified and no default viewport set');
    }

    if (vp.width <= 0 || vp.height <= 0) {
      throw new Error('Viewport width and height must be positive');
    }

    // Collect dirty bounds from all changed objects
    for (const obj of this.objects.values()) {
      if (obj.isDirty()) {
        const dirtyBounds = obj.getDirtyBounds();
        if (dirtyBounds) {
          this.markRegionDirty(dirtyBounds);
        }
        obj.clearDirty();
      }
    }

    // Regenerate masks for objects that need it (lazy)
    for (const obj of this.objects.values()) {
      if (obj.needsMaskRegeneration()) {
        obj.getInfluenceMask(); // Triggers regeneration
      }
    }

    // Check if we can use cached output
    if (
      this.cachedOutput &&
      this.lastViewport &&
      this.viewportsEqual(vp, this.lastViewport) &&
      this.dirtyRegions.size === 0
    ) {
      // Return a deep clone to prevent cache corruption from user mutations
      return {
        characters: this.cachedOutput.characters.map(row => [...row]),
        colors: this.cachedOutput.colors.map(row => [...row]),
      };
    }

    // Cache miss - render the scene
    const output = this.renderScene(vp);

    // Cache a deep clone to prevent corruption from user mutations
    this.cachedOutput = {
      characters: output.characters.map(row => [...row]),
      colors: output.colors.map(row => [...row]),
    };
    this.lastViewport = { ...vp };
    this.dirtyRegions.clear();

    return output;
  }

  /**
   * Renders the entire viewport from scratch.
   *
   * Implements top-down layer traversal with transparency accumulation.
   *
   * @param viewport - Viewport to render
   * @returns Rendered output
   */
  private renderScene(viewport: Viewport): RenderOutput {
    const characters: string[][] = [];
    const colors: string[][] = [];

    // Get layers sorted ascending (lower layers first, higher layers on top)
    const layers = this.getSortedLayers();

    // Cache objects per layer to avoid repeated lookups (performance optimization)
    const layerObjectsCache = new Map<number, AsciiObject[]>();
    for (const layer of layers) {
      layerObjectsCache.set(layer, this.getObjectsOnLayer(layer));
    }

    // Render each cell in the viewport
    for (let y = 0; y < viewport.height; y++) {
      const charRow: string[] = [];
      const colorRow: string[] = [];

      for (let x = 0; x < viewport.width; x++) {
        // Convert viewport coordinates to world coordinates
        const worldX = viewport.x + x;
        const worldY = viewport.y + y;

        // Render this cell by traversing layers top-down
        const { char, color } = this.renderCell(worldX, worldY, layers, layerObjectsCache);
        charRow.push(char);
        colorRow.push(color);
      }

      characters.push(charRow);
      colors.push(colorRow);
    }

    return { characters, colors };
  }

  /**
   * Renders a single cell by traversing layers top-down with transparency accumulation.
   *
   * Algorithm:
   * 1. Start at topmost layer
   * 2. Accumulate transparency values (0-100%)
   * 3. When content found, apply accumulated transforms to color
   * 4. Return rendered character and color
   *
   * Special cases:
   * - Space with influence: glass pane effect (transparent, contributes transform)
   * - Space without influence: opaque space character
   * - Accumulated transparency >= 100: fully transparent (blank)
   *
   * @param x - World X coordinate
   * @param y - World Y coordinate
   * @param layers - Sorted layer numbers (ascending)
   * @param layerObjectsCache - Pre-computed map of layer -> objects (performance optimization)
   * @returns Rendered character and color
   */
  private renderCell(x: number, y: number, layers: number[], layerObjectsCache: Map<number, AsciiObject[]>): { char: string; color: string } {
    // Working color accumulates influence transforms as RGB (no hex parsing)
    let wR = 0, wG = 0, wB = 0;
    // Collect all transforms to apply to final content color (uses pre-parsed RGB)
    const transformsToApply: Array<{
      tR: number; tG: number; tB: number; // target color RGB
      type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
      strength: number;
      darkenFactor?: number;
    }> = [];

    // Traverse layers top to bottom (reverse order of sorted array)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];

      // Collect layer effect as a transform
      const layerEffect = this.layerEffects.get(layer);
      if (layerEffect && layerEffect.strength > 0) {
        const rgb = this.layerEffectRGBs.get(layer)!;
        transformsToApply.push({
          tR: rgb[0], tG: rgb[1], tB: rgb[2],
          type: layerEffect.type,
          strength: layerEffect.strength,
          darkenFactor: layerEffect.darkenFactor,
        });
      }

      const objectsOnLayer = layerObjectsCache.get(layer) || [];

      // First-added-wins for same-layer overlaps
      for (const obj of objectsOnLayer) {
        // Calculate local coordinates relative to object origin
        const localX = x - obj.position.x;
        const localY = y - obj.position.y;

        // Get influence mask dimensions
        const influenceMask = obj.getInfluenceMask();
        const maskHeight = influenceMask.length;
        const maskWidth = maskHeight > 0 ? influenceMask[0].length : 0;

        // Adjust for influence radius offset (mask extends by radius on all sides)
        const radius = obj.influence?.radius || 0;
        const maskX = localX + radius;
        const maskY = localY + radius;

        // Check if position is within influence mask bounds
        if (maskY >= 0 && maskY < maskHeight && maskX >= 0 && maskX < maskWidth) {
          const maskValue = influenceMask[maskY][maskX];

          // null = no influence from this object at this position
          if (maskValue === null) {
            continue;
          }

          // maskValue === 100 means this is an opaque content cell
          if (maskValue === 100) {
            const contentY = localY;
            const contentX = localX;

            // Verify content coordinates are within bounds
            if (
              contentY >= 0 &&
              contentY < obj.content.length &&
              contentX >= 0 &&
              contentX < obj.content[contentY].length
            ) {
              const cell = obj.content[contentY][contentX];

              if (cell !== null && cell !== ' ') {
                // Non-space character - apply all transforms to object color
                if (transformsToApply.length === 0) {
                  return { char: cell, color: obj.color };
                }
                let fR = obj.colorRGB[0], fG = obj.colorRGB[1], fB = obj.colorRGB[2];
                for (let j = transformsToApply.length - 1; j >= 0; j--) {
                  const result = this.applyTransformRGB(fR, fG, fB, transformsToApply[j]);
                  fR = result[0]; fG = result[1]; fB = result[2];
                }
                return { char: cell, color: rgbToHex([fR, fG, fB]) };
              } else if (cell === ' ' && obj.influence) {
                // Glass pane effect: space with influence
                const strength = obj.influence.transform.strength;
                const infType = obj.influence.transform.type;
                const targetRGB = this.getInfluenceTargetRGB(obj, infType);

                const transform = {
                  tR: targetRGB[0], tG: targetRGB[1], tB: targetRGB[2],
                  type: infType,
                  strength,
                  darkenFactor: obj.influence.transform.darkenFactor,
                };
                transformsToApply.push(transform);

                // Apply to working color
                const result = this.applyTransformRGB(wR, wG, wB, transform);
                wR = result[0]; wG = result[1]; wB = result[2];
              } else if (cell !== null) {
                // Space without influence - apply all transforms to object color
                if (transformsToApply.length === 0) {
                  return { char: cell, color: obj.color };
                }
                let fR = obj.colorRGB[0], fG = obj.colorRGB[1], fB = obj.colorRGB[2];
                for (let j = transformsToApply.length - 1; j >= 0; j--) {
                  const result = this.applyTransformRGB(fR, fG, fB, transformsToApply[j]);
                  fR = result[0]; fG = result[1]; fB = result[2];
                }
                return { char: cell, color: rgbToHex([fR, fG, fB]) };
              }
            }
          }

          // maskValue < 100: influence gradient (not content)
          if (maskValue > 0 && maskValue < 100) {
            const infType = obj.influence!.transform.type;
            const strength = (maskValue / 100) * obj.influence!.transform.strength;
            const targetRGB = this.getInfluenceTargetRGB(obj, infType);

            const transform = {
              tR: targetRGB[0], tG: targetRGB[1], tB: targetRGB[2],
              type: infType,
              strength,
              darkenFactor: obj.influence!.transform.darkenFactor,
            };
            transformsToApply.push(transform);

            // Apply to working color
            const result = this.applyTransformRGB(wR, wG, wB, transform);
            wR = result[0]; wG = result[1]; wB = result[2];
          }
        }
      }
    }

    // No content found - apply all transforms to working color
    if (transformsToApply.length === 0) {
      return { char: ' ', color: '#000000' };
    }
    let fR = wR, fG = wG, fB = wB;
    for (let j = transformsToApply.length - 1; j >= 0; j--) {
      const result = this.applyTransformRGB(fR, fG, fB, transformsToApply[j]);
      fR = result[0]; fG = result[1]; fB = result[2];
    }
    return { char: ' ', color: rgbToHex([fR, fG, fB]) };
  }

  /**
   * Gets the pre-parsed RGB for an object's influence target color.
   */
  private getInfluenceTargetRGB(obj: AsciiObject, type: string): RGB {
    if (obj.influenceColorRGB) return obj.influenceColorRGB;
    if (type === 'lighten') return RGB_WHITE;
    if (type === 'darken') return RGB_BLACK;
    return obj.colorRGB;
  }

  /**
   * Applies a color transform using RGB tuples directly (no hex parsing).
   */
  private applyTransformRGB(
    r1: number, g1: number, b1: number,
    transform: {
      tR: number; tG: number; tB: number;
      type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
      strength: number;
      darkenFactor?: number;
    }
  ): RGB {
    if (transform.type === 'lighten' || transform.type === 'darken') {
      const t = Math.max(0, Math.min(1, transform.strength));
      return [
        Math.round(r1 + (transform.tR - r1) * t),
        Math.round(g1 + (transform.tG - g1) * t),
        Math.round(b1 + (transform.tB - b1) * t),
      ];
    }

    // Multiply
    let mr = transform.tR, mg = transform.tG, mb = transform.tB;
    if (transform.type === 'multiply-darken') {
      const factor = transform.darkenFactor || 0.8;
      mr = Math.round(mr * factor);
      mg = Math.round(mg * factor);
      mb = Math.round(mb * factor);
    }

    const r = Math.round((r1 / 255) * (mr / 255) * 255);
    const g = Math.round((g1 / 255) * (mg / 255) * 255);
    const b = Math.round((b1 / 255) * (mb / 255) * 255);

    return [
      Math.round(r1 + (r - r1) * transform.strength),
      Math.round(g1 + (g - g1) * transform.strength),
      Math.round(b1 + (b - b1) * transform.strength),
    ];
  }

  /**
   * Gets an object by ID or throws if not found.
   *
   * Helper method to reduce duplicate error handling code.
   */
  private getObjectOrThrow(id: string): AsciiObject {
    const obj = this.objects.get(id);
    if (!obj) {
      throw new Error(`Object with id '${id}' not found`);
    }
    return obj;
  }

  /**
   * Returns all unique layer numbers sorted ascending.
   */
  private getSortedLayers(): number[] {
    const layers = new Set<number>();
    // Include layers with objects
    for (const obj of this.objects.values()) {
      layers.add(obj.layer);
    }
    // Include layers with effects
    for (const layer of this.layerEffects.keys()) {
      layers.add(layer);
    }
    return Array.from(layers).sort((a, b) => a - b);
  }

  /**
   * Returns all objects on a specific layer.
   * Objects are returned in insertion order (first-added-wins for same-layer overlaps).
   */
  private getObjectsOnLayer(layer: number): AsciiObject[] {
    const objects: AsciiObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.layer === layer) {
        objects.push(obj);
      }
    }
    return objects;
  }

  /**
   * Validates color is in #RRGGBB format.
   */
  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * Marks a rectangular region as dirty for cache invalidation.
   *
   * Iterates through all cells in the bounding box and adds their coordinates
   * to the dirty regions set. This invalidates the viewport cache.
   */
  private markRegionDirty(bounds: Bounds): void {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        this.dirtyRegions.add(`${x},${y}`);
      }
    }
  }

  /**
   * Checks if two viewports are equal.
   */
  private viewportsEqual(a: Viewport, b: Viewport): boolean {
    return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  }
}
