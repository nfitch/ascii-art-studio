/**
 * ASCII Compositor Module
 *
 * A stateful scene manager for compositing ASCII art objects with proper layering,
 * transparency, and proximity-based influence effects. Optimized for animation
 * performance through viewport caching and object-level dirty tracking.
 *
 * @module @ascii-art-studio/compositor
 */

import { AsciiObject, type Influence, type Bounds } from './AsciiObject';

// Re-export types for public API
export { AsciiObject, type Influence };

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
    this.layerEffects.set(layer, {
      color: effect.color.toLowerCase(),
      type: effect.type,
      strength: effect.strength,
      ...(effect.darkenFactor !== undefined && { darkenFactor: effect.darkenFactor }),
    });

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
    // Working color accumulates influence transforms (affects background view from below)
    let workingColor = '#000000';
    // Collect all transforms (layer effects and influences) to apply to final content color
    const transformsToApply: Array<{
      targetColor: string; // Color to interpolate toward (for lighten/darken) or multiply by
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
        transformsToApply.push({
          targetColor: layerEffect.color,
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
                let finalColor = obj.color;
                for (let j = transformsToApply.length - 1; j >= 0; j--) {
                  finalColor = this.applyTransform(finalColor, transformsToApply[j]);
                }
                return { char: cell, color: finalColor };
              } else if (cell === ' ' && obj.influence) {
                // Glass pane effect: space with influence - collect as transform and apply to working color
                const strength = obj.influence.transform.strength;
                const targetColor =
                  obj.influence.transform.type === 'lighten' ? (obj.influence.color ?? '#ffffff') :
                  obj.influence.transform.type === 'darken' ? (obj.influence.color ?? '#000000') :
                  (obj.influence.color ?? obj.color);

                // Collect for later application to content
                const transform = {
                  targetColor,
                  type: obj.influence.transform.type,
                  strength,
                  darkenFactor: obj.influence.transform.darkenFactor,
                };
                transformsToApply.push(transform);

                // Also apply to working color for background (inline for performance)
                workingColor = this.applyTransform(workingColor, transform);
                // Continue to next layer (don't return)
              } else if (cell !== null) {
                // Space without influence - apply all transforms to object color
                let finalColor = obj.color;
                for (let j = transformsToApply.length - 1; j >= 0; j--) {
                  finalColor = this.applyTransform(finalColor, transformsToApply[j]);
                }
                return { char: cell, color: finalColor };
              }
            }
          }

          // maskValue < 100: influence gradient (not content)
          // Collect as transform and apply to working color
          if (maskValue > 0 && maskValue < 100) {
            const strength = (maskValue / 100) * obj.influence!.transform.strength;
            const targetColor =
              obj.influence!.transform.type === 'lighten' ? (obj.influence!.color ?? '#ffffff') :
              obj.influence!.transform.type === 'darken' ? (obj.influence!.color ?? '#000000') :
              (obj.influence!.color ?? obj.color);

            // Collect for later application to content
            const transform = {
              targetColor,
              type: obj.influence!.transform.type,
              strength,
              darkenFactor: obj.influence!.transform.darkenFactor,
            };
            transformsToApply.push(transform);

            // Also apply to working color for background (inline for performance)
            workingColor = this.applyTransform(workingColor, transform);
          }
        }
      }
    }

    // No content found at this position - apply all transforms to working color
    let finalColor = workingColor;
    for (let j = transformsToApply.length - 1; j >= 0; j--) {
      finalColor = this.applyTransform(finalColor, transformsToApply[j]);
    }
    return { char: ' ', color: finalColor };
  }

  /**
   * Converts a number (0-255) to a 2-digit hex string.
   */
  private toHex(value: number): string {
    return value.toString(16).padStart(2, '0');
  }

  /**
   * Applies a color transform with inlined color math for performance.
   * Combines interpolation and multiply logic in a single function to enable JIT optimization.
   *
   * @param baseColor - Starting color in #RRGGBB format
   * @param transform - Transform to apply
   * @returns Transformed color in #RRGGBB format
   */
  private applyTransform(
    baseColor: string,
    transform: {
      targetColor: string;
      type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
      strength: number;
      darkenFactor?: number;
    }
  ): string {
    // Parse base color (inline to avoid function call overhead)
    const r1 = parseInt(baseColor.slice(1, 3), 16);
    const g1 = parseInt(baseColor.slice(3, 5), 16);
    const b1 = parseInt(baseColor.slice(5, 7), 16);

    // Parse target color
    const r2 = parseInt(transform.targetColor.slice(1, 3), 16);
    const g2 = parseInt(transform.targetColor.slice(3, 5), 16);
    const b2 = parseInt(transform.targetColor.slice(5, 7), 16);

    let finalR: number;
    let finalG: number;
    let finalB: number;

    if (transform.type === 'lighten' || transform.type === 'darken') {
      // Interpolation (inline)
      const t = Math.max(0, Math.min(1, transform.strength));
      finalR = Math.round(r1 + (r2 - r1) * t);
      finalG = Math.round(g1 + (g2 - g1) * t);
      finalB = Math.round(b1 + (b2 - b1) * t);
    } else {
      // Multiply (inline)
      let mr2 = r2;
      let mg2 = g2;
      let mb2 = b2;

      if (transform.type === 'multiply-darken') {
        const factor = transform.darkenFactor || 0.8;
        mr2 = Math.round(r2 * factor);
        mg2 = Math.round(g2 * factor);
        mb2 = Math.round(b2 * factor);
      }

      const r = Math.round((r1 / 255) * (mr2 / 255) * 255);
      const g = Math.round((g1 / 255) * (mg2 / 255) * 255);
      const b = Math.round((b1 / 255) * (mb2 / 255) * 255);

      finalR = Math.round(r1 + (r - r1) * transform.strength);
      finalG = Math.round(g1 + (g - g1) * transform.strength);
      finalB = Math.round(b1 + (b - b1) * transform.strength);
    }

    return `#${this.toHex(finalR)}${this.toHex(finalG)}${this.toHex(finalB)}`;
  }

  /**
   * Interpolates between two colors by a given strength.
   * Used for layer effects that blend toward a target color.
   *
   * @param baseColor - Starting color in #RRGGBB format
   * @param targetColor - Target color to interpolate toward
   * @param strength - Interpolation strength (0.0 to 1.0+)
   * @returns Interpolated color in #RRGGBB format
   */
  private interpolateColor(baseColor: string, targetColor: string, strength: number): string {
    // Clamp strength to [0, 1]
    const t = Math.max(0, Math.min(1, strength));

    // Parse colors
    const r1 = parseInt(baseColor.slice(1, 3), 16);
    const g1 = parseInt(baseColor.slice(3, 5), 16);
    const b1 = parseInt(baseColor.slice(5, 7), 16);

    const r2 = parseInt(targetColor.slice(1, 3), 16);
    const g2 = parseInt(targetColor.slice(3, 5), 16);
    const b2 = parseInt(targetColor.slice(5, 7), 16);

    // Linear interpolation
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${this.toHex(r)}${this.toHex(g)}${this.toHex(b)}`;
  }

  /**
   * Applies multiply blend to a color for layer effects.
   * Used for layer-level multiply transformations.
   *
   * @param baseColor - Base color in #RRGGBB format
   * @param multiplyColor - Color to multiply by
   * @param strength - Blend strength (0.0 to 1.0)
   * @param type - multiply or multiply-darken
   * @param darkenFactor - Darken factor for multiply-darken (0.0 to 1.0, default 0.8)
   * @returns Transformed color in #RRGGBB format
   */
  private applyLayerMultiply(
    baseColor: string,
    multiplyColor: string,
    strength: number,
    type: 'multiply' | 'multiply-darken',
    darkenFactor?: number
  ): string {
    // Parse base color
    const r1 = parseInt(baseColor.slice(1, 3), 16);
    const g1 = parseInt(baseColor.slice(3, 5), 16);
    const b1 = parseInt(baseColor.slice(5, 7), 16);

    // Parse multiply color
    let r2 = parseInt(multiplyColor.slice(1, 3), 16);
    let g2 = parseInt(multiplyColor.slice(3, 5), 16);
    let b2 = parseInt(multiplyColor.slice(5, 7), 16);

    // Apply darken factor if multiply-darken
    if (type === 'multiply-darken') {
      const factor = darkenFactor || 0.8;
      r2 = Math.round(r2 * factor);
      g2 = Math.round(g2 * factor);
      b2 = Math.round(b2 * factor);
    }

    // Multiply normalized values
    const r = Math.round((r1 / 255) * (r2 / 255) * 255);
    const g = Math.round((g1 / 255) * (g2 / 255) * 255);
    const b = Math.round((b1 / 255) * (b2 / 255) * 255);

    // Lerp between base and multiplied based on strength
    const finalR = Math.round(r1 + (r - r1) * strength);
    const finalG = Math.round(g1 + (g - g1) * strength);
    const finalB = Math.round(b1 + (b - b1) * strength);

    return `#${this.toHex(finalR)}${this.toHex(finalG)}${this.toHex(finalB)}`;
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
