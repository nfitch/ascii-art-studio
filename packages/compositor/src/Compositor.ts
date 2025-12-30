/**
 * ASCII Compositor Module
 *
 * A stateful scene manager for compositing ASCII art objects with proper layering,
 * transparency, and proximity-based influence effects. Optimized for animation
 * performance through viewport caching and dirty region tracking.
 *
 * @module @ascii-art-studio/compositor
 */

/** Represents a single cell in the ASCII grid. null = transparent, string = visible character */
type Cell = string | null;

/** 2D position in canvas coordinates */
interface Position {
  x: number;
  y: number;
}

/**
 * Proximity-based influence configuration.
 * Objects emit gradients that affect the colors of lower layers based on distance.
 */
export interface Influence {
  /** Influence radius in cells (must be positive integer) */
  radius: number;
  /** Override color for influence (hex #RRGGBB). If not specified, uses object's color. */
  color?: string;
  transform: {
    /** Transform type: 'lighten' (toward white), 'darken' (toward black), 'multiply' (color multiplication), 'multiply-darken' (color multiplication + darkening) */
    type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
    /** Maximum effect strength at distance 0 (0.0 to 1.0) */
    strength: number;
    /** How influence decreases with distance */
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
    /** Darken factor for 'multiply-darken' type (0.0 to 1.0, default 0.8) */
    darkenFactor?: number;
  };
}

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

/** Axis-aligned bounding box */
interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Options for adding an object to the compositor.
 * Content can be provided in three equivalent formats:
 * 1. Cell matrix: [['#', '#'], ['#', null]]
 * 2. String array: ['##', '# ']
 * 3. Newline string: '##\n# '
 */
export interface AddObjectOptions {
  /** Object content (null = transparent, ' ' = opaque space, other = visible char) */
  content: Cell[][] | string[] | string;
  /** Canvas position where object's (0,0) origin is placed */
  position: Position;
  /** Hex color in #RRGGBB format (default: #000000) */
  color?: string;
  /** Layer number - higher layers render on top (default: 0) */
  layer?: number;
  /** Optional proximity-based influence effect */
  influence?: Influence;
  /** Use flood fill to auto-detect transparent edges (default: false) */
  autoDetectEdges?: boolean;
}

/**
 * Object specification for constructor initialization.
 * Same as AddObjectOptions but includes required id field.
 */
export interface InitialObject extends AddObjectOptions {
  /** Unique identifier for the object */
  id: string;
}

/**
 * Public view of a compositor object.
 * All fields are deep-cloned to prevent external mutations from corrupting internal state.
 */
export interface CompositorObject {
  /** Unique identifier */
  id: string;
  /** Normalized content as Cell[][] (deep clone) */
  content: Cell[][];
  /** Current position (clone) */
  position: Position;
  /** Layer number */
  layer: number;
  /** Hex color in #RRGGBB format */
  color: string;
  /** Influence configuration (deep clone if present) */
  influence?: Influence;
  /** True if object is flipped horizontally */
  flipHorizontal: boolean;
  /** True if object is flipped vertically */
  flipVertical: boolean;
  /** Cached bounding box including influence radius */
  bounds: Bounds;
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
 * Internal object representation with pre-computed influence mask.
 * The influence mask extends beyond content bounds by the influence radius.
 * Values: 100 = opaque content, 0-99 = influence gradient, null = no influence.
 */
interface InternalObject extends CompositorObject {
  /** Pre-computed influence mask (regenerated on flip) */
  influenceMask: (number | null)[][];
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
  private objects: Map<string, InternalObject> = new Map();

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
   * @param initialObjects - Optional array of partial objects to add at construction.
   *                        Only id, content, and position are required; other fields
   *                        are generated automatically.
   * @param defaultViewport - Optional default viewport for render() calls
   * @throws {Error} If any initial object is missing required fields (id, content, position)
   * @throws {Error} If any initial object fails validation (see addObject errors)
   */
  constructor(initialObjects?: InitialObject[], defaultViewport?: Viewport) {
    this.defaultViewport = defaultViewport;

    if (initialObjects) {
      for (const obj of initialObjects) {
        // Validate required fields before destructuring
        if (!obj.id || !obj.content || !obj.position) {
          throw new Error('Invalid initial object: missing required fields (id, content, position)');
        }
        // Add object - this validates and processes the object
        const { id, ...options } = obj;
        this.addObject(id, options);
      }
    }
  }

  /**
   * Adds a new object to the scene.
   *
   * The object is validated, normalized, and stored with a pre-computed influence mask.
   * The affected region is marked dirty to invalidate the render cache.
   *
   * @param id - Unique identifier for the object
   * @param options - Object configuration
   * @throws {Error} If object ID already exists
   * @throws {Error} If content is empty or has unequal row lengths
   * @throws {Error} If color is not valid #RRGGBB format
   * @throws {Error} If layer is not an integer
   * @throws {Error} If influence radius is not a positive integer
   * @throws {Error} If influence strength is not between 0.0 and 1.0
   */
  addObject(id: string, options: AddObjectOptions): void {
    // Check for duplicate ID
    if (this.objects.has(id)) {
      throw new Error(`Object with id '${id}' already exists`);
    }

    // Apply defaults
    const color = (options.color || '#000000').toLowerCase();
    const layer = options.layer ?? 0;

    // Validate color format (#RRGGBB)
    if (!this.isValidColor(color)) {
      throw new Error('Invalid color format: must be #RRGGBB');
    }

    // Validate layer is an integer
    if (!Number.isInteger(layer)) {
      throw new Error('Layer must be an integer');
    }

    // Normalize content to Cell[][] format
    let content = this.normalizeContent(options.content);

    // Validate content is non-empty
    if (content.length === 0 || content[0].length === 0) {
      throw new Error('Content must be non-empty');
    }

    // Auto-detect transparent edges using flood fill if requested
    if (options.autoDetectEdges) {
      content = this.autoDetectEdges(content);
    }

    // Validate influence configuration
    if (options.influence) {
      if (options.influence.radius <= 0 || !Number.isInteger(options.influence.radius)) {
        throw new Error('Influence radius must be positive integer');
      }
      if (options.influence.transform.strength < 0 || options.influence.transform.strength > 1.0) {
        throw new Error('Influence strength must be between 0.0 and 1.0');
      }
      if (options.influence.color && !this.isValidColor(options.influence.color)) {
        throw new Error('Influence color must be in #RRGGBB format');
      }
      if (options.influence.transform.darkenFactor !== undefined) {
        if (options.influence.transform.darkenFactor < 0 || options.influence.transform.darkenFactor > 1.0) {
          throw new Error('Influence darkenFactor must be between 0.0 and 1.0');
        }
        if (options.influence.transform.type !== 'multiply-darken') {
          throw new Error('Influence darkenFactor can only be used with multiply-darken transform type');
        }
      }
    }

    // Generate influence mask (pre-compute for performance)
    const influenceMask = options.influence
      ? this.generateInfluenceMask(content, options.influence)
      : this.createEmptyMask(content);

    // Calculate bounding box (includes influence radius)
    const bounds = this.calculateBounds(content, options.position, options.influence);

    // Create internal object with deep clones to prevent external mutations
    const internalObject: InternalObject = {
      id,
      content: this.cloneContent(content),
      position: { ...options.position },
      layer,
      color,
      // Deep clone influence to prevent external mutations
      influence: options.influence ? {
        radius: options.influence.radius,
        color: options.influence.color ? options.influence.color.toLowerCase() : undefined,
        transform: {
          type: options.influence.transform.type,
          strength: options.influence.transform.strength,
          falloff: options.influence.transform.falloff,
          darkenFactor: options.influence.transform.darkenFactor,
        },
      } : undefined,
      flipHorizontal: false,
      flipVertical: false,
      influenceMask,
      bounds,
    };

    this.objects.set(id, internalObject);
    this.markRegionDirty(bounds);
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
    this.markRegionDirty(obj.bounds);
    this.objects.delete(id);
  }

  /**
   * Moves an object to a new position.
   *
   * Both old and new regions (including influence) are marked dirty.
   *
   * @param id - Object identifier
   * @param position - New position
   * @throws {Error} If object ID not found
   */
  moveObject(id: string, position: Position): void {
    const obj = this.getObjectOrThrow(id);

    // Mark old position dirty
    this.markRegionDirty(obj.bounds);

    // Update position and recalculate bounds
    obj.position = { ...position };
    obj.bounds = this.calculateBounds(obj.content, position, obj.influence);

    // Mark new position dirty
    this.markRegionDirty(obj.bounds);
  }

  /**
   * Toggles horizontal flip state of an object.
   *
   * Flips the content matrix left-to-right and regenerates the influence mask if present.
   * The object's region is marked dirty.
   *
   * @param id - Object identifier
   * @throws {Error} If object ID not found
   */
  flipHorizontal(id: string): void {
    const obj = this.getObjectOrThrow(id);

    this.markRegionDirty(obj.bounds);

    // Toggle flip state
    obj.flipHorizontal = !obj.flipHorizontal;

    // Flip content matrix
    obj.content = this.flipContentHorizontal(obj.content);

    // Regenerate influence mask if object has influence
    if (obj.influence) {
      obj.influenceMask = this.generateInfluenceMask(obj.content, obj.influence);
    }

    this.markRegionDirty(obj.bounds);
  }

  /**
   * Toggles vertical flip state of an object.
   *
   * Flips the content matrix top-to-bottom and regenerates the influence mask if present.
   * The object's region is marked dirty.
   *
   * @param id - Object identifier
   * @throws {Error} If object ID not found
   */
  flipVertical(id: string): void {
    const obj = this.getObjectOrThrow(id);

    this.markRegionDirty(obj.bounds);

    // Toggle flip state
    obj.flipVertical = !obj.flipVertical;

    // Flip content matrix
    obj.content = this.flipContentVertical(obj.content);

    // Regenerate influence mask if object has influence
    if (obj.influence) {
      obj.influenceMask = this.generateInfluenceMask(obj.content, obj.influence);
    }

    this.markRegionDirty(obj.bounds);
  }

  /**
   * Sets horizontal flip to a specific state.
   *
   * No-op if object is already in the desired state.
   *
   * @param id - Object identifier
   * @param flipped - Desired flip state
   * @throws {Error} If object ID not found
   */
  setFlipHorizontal(id: string, flipped: boolean): void {
    const obj = this.getObjectOrThrow(id);

    if (obj.flipHorizontal === flipped) {
      return; // Already in desired state, no-op
    }

    this.flipHorizontal(id);
  }

  /**
   * Sets vertical flip to a specific state.
   *
   * No-op if object is already in the desired state.
   *
   * @param id - Object identifier
   * @param flipped - Desired flip state
   * @throws {Error} If object ID not found
   */
  setFlipVertical(id: string, flipped: boolean): void {
    const obj = this.getObjectOrThrow(id);

    if (obj.flipVertical === flipped) {
      return; // Already in desired state, no-op
    }

    this.flipVertical(id);
  }

  /**
   * Returns a deep clone of an object.
   *
   * All nested objects and arrays are cloned to prevent external mutations
   * from corrupting internal state.
   *
   * @param id - Object identifier
   * @returns Deep clone of the object
   * @throws {Error} If object ID not found
   */
  getObject(id: string): CompositorObject {
    const obj = this.getObjectOrThrow(id);

    // Return deep clone to prevent external mutations
    return {
      id: obj.id,
      content: this.cloneContent(obj.content),
      position: { ...obj.position },
      layer: obj.layer,
      color: obj.color,
      // Deep clone influence
      influence: obj.influence ? {
        radius: obj.influence.radius,
        transform: {
          type: obj.influence.transform.type,
          strength: obj.influence.transform.strength,
          falloff: obj.influence.transform.falloff,
          darkenFactor: obj.influence.transform.darkenFactor,
        },
      } : undefined,
      flipHorizontal: obj.flipHorizontal,
      flipVertical: obj.flipVertical,
      bounds: { ...obj.bounds },
    };
  }

  /**
   * Returns deep clones of all objects.
   *
   * Objects are returned in no particular order (not sorted by layer).
   *
   * @returns Array of object clones
   */
  listObjects(): CompositorObject[] {
    return Array.from(this.objects.values()).map(obj => this.getObject(obj.id));
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
      minX = Math.min(minX, obj.bounds.minX);
      minY = Math.min(minY, obj.bounds.minY);
      maxX = Math.max(maxX, obj.bounds.maxX);
      maxY = Math.max(maxY, obj.bounds.maxY);
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
    const layerObjectsCache = new Map<number, InternalObject[]>();
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
  private renderCell(x: number, y: number, layers: number[], layerObjectsCache: Map<number, InternalObject[]>): { char: string; color: string } {
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
        const maskHeight = obj.influenceMask.length;
        const maskWidth = maskHeight > 0 ? obj.influenceMask[0].length : 0;

        // Adjust for influence radius offset (mask extends by radius on all sides)
        const radius = obj.influence?.radius || 0;
        const maskX = localX + radius;
        const maskY = localY + radius;

        // Check if position is within influence mask bounds
        if (maskY >= 0 && maskY < maskHeight && maskX >= 0 && maskX < maskWidth) {
          const maskValue = obj.influenceMask[maskY][maskX];

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
  private getObjectOrThrow(id: string): InternalObject {
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
  private getObjectsOnLayer(layer: number): InternalObject[] {
    const objects: InternalObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.layer === layer) {
        objects.push(obj);
      }
    }
    return objects;
  }

  /**
   * Normalizes content from any of three input formats to Cell[][].
   *
   * Accepted formats:
   * 1. Cell matrix: [['#', '#'], ['#', null]]
   * 2. String array: ['##', '# ']
   * 3. Newline string: '##\n# '
   */
  private normalizeContent(content: Cell[][] | string[] | string): Cell[][] {
    if (typeof content === 'string') {
      // Newline-delimited string
      const lines = content.split('\n');
      return this.normalizeStringArray(lines);
    } else if (Array.isArray(content) && content.length > 0 && typeof content[0] === 'string') {
      // String array
      return this.normalizeStringArray(content as string[]);
    } else {
      // Cell matrix
      return this.validateAndCloneMatrix(content as Cell[][]);
    }
  }

  /**
   * Converts string array to Cell[][] and validates equal lengths.
   */
  private normalizeStringArray(lines: string[]): Cell[][] {
    if (lines.length === 0) {
      return [];
    }

    const width = lines[0].length;
    for (const line of lines) {
      if (line.length !== width) {
        throw new Error('Invalid content format: rows have unequal lengths');
      }
    }

    return lines.map(line => line.split(''));
  }

  /**
   * Validates Cell[][] has equal row lengths and returns a deep clone.
   */
  private validateAndCloneMatrix(matrix: Cell[][]): Cell[][] {
    if (matrix.length === 0) {
      return [];
    }

    const width = matrix[0].length;
    for (const row of matrix) {
      if (row.length !== width) {
        throw new Error('Invalid content format: rows have unequal lengths');
      }
    }

    return this.cloneContent(matrix);
  }

  /**
   * Validates color is in #RRGGBB format.
   */
  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * Auto-detects transparent edges using flood fill algorithm.
   *
   * Starting from all edge cells, flood fills spaces reachable from edges
   * and marks them as transparent (null). Trapped spaces remain opaque.
   *
   * @param content - Content to process
   * @returns Content with edge spaces converted to null
   */
  private autoDetectEdges(content: Cell[][]): Cell[][] {
    const height = content.length;
    const width = content[0].length;
    const result = this.cloneContent(content);
    const visited = new Set<string>();

    // Flood fill from all edge cells
    for (let y = 0; y < height; y++) {
      this.floodFill(result, 0, y, visited);           // Left edge
      this.floodFill(result, width - 1, y, visited);   // Right edge
    }
    for (let x = 0; x < width; x++) {
      this.floodFill(result, x, 0, visited);           // Top edge
      this.floodFill(result, x, height - 1, visited);  // Bottom edge
    }

    return result;
  }

  /**
   * Iterative flood fill implementation using queue to avoid stack overflow.
   *
   * Marks all spaces reachable from (x, y) as transparent (null).
   * Stops at non-space characters.
   */
  private floodFill(content: Cell[][], x: number, y: number, visited: Set<string>): void {
    const height = content.length;
    const width = content[0].length;

    const queue: Array<{ x: number; y: number }> = [{ x, y }];

    while (queue.length > 0) {
      const pos = queue.shift()!;
      const px = pos.x;
      const py = pos.y;

      // Bounds check
      if (py < 0 || py >= height || px < 0 || px >= width) {
        continue;
      }

      const key = `${px},${py}`;
      if (visited.has(key)) {
        continue; // Already visited
      }

      if (content[py][px] !== ' ') {
        continue; // Not a space - don't fill
      }

      visited.add(key);
      content[py][px] = null; // Mark as transparent

      // Add adjacent cells to queue (4-way connectivity)
      queue.push({ x: px + 1, y: py });
      queue.push({ x: px - 1, y: py });
      queue.push({ x: px, y: py + 1 });
      queue.push({ x: px, y: py - 1 });
    }
  }

  /**
   * Generates influence mask for an object with influence.
   *
   * The mask extends beyond content bounds by the influence radius on all sides.
   * For each content cell, generates a gradient based on distance and falloff function.
   * Multiple cells affecting the same position use maximum influence.
   *
   * Mask values:
   * - 100: opaque content cell
   * - 0-99: influence gradient strength
   * - null: no influence
   *
   * @param content - Object content
   * @param influence - Influence configuration
   * @returns Influence mask with padding
   */
  private generateInfluenceMask(content: Cell[][], influence: Influence): (number | null)[][] {
    const { radius } = influence;
    const contentHeight = content.length;
    const contentWidth = content[0].length;

    // Mask dimensions include radius padding on all sides
    const maskHeight = contentHeight + radius * 2;
    const maskWidth = contentWidth + radius * 2;

    // Initialize mask with nulls
    const mask: (number | null)[][] = Array(maskHeight)
      .fill(null)
      .map(() => Array(maskWidth).fill(null));

    // For each non-transparent content cell
    for (let cy = 0; cy < contentHeight; cy++) {
      for (let cx = 0; cx < contentWidth; cx++) {
        if (content[cy][cx] === null) {
          continue; // Transparent cell - skip
        }

        // Mark content position as 100 (opaque)
        const mx = cx + radius;
        const my = cy + radius;
        mask[my][mx] = 100;

        // Generate influence gradient in circle around this cell
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) {
              continue; // Already set to 100
            }

            // Calculate distance from content cell
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > radius) {
              continue; // Outside influence radius
            }

            // Calculate influence strength at this distance
            const influenceStrength = this.calculateFalloff(distance, radius, influence);
            const targetX = mx + dx;
            const targetY = my + dy;

            // Bounds check (should always pass, but defensive)
            if (targetY >= 0 && targetY < maskHeight && targetX >= 0 && targetX < maskWidth) {
              // Take maximum influence if multiple cells affect this position
              const current = mask[targetY][targetX];
              mask[targetY][targetX] = Math.max(current || 0, influenceStrength);
            }
          }
        }
      }
    }

    return mask;
  }

  /**
   * Calculates influence falloff at a given distance.
   *
   * Applies the configured falloff function to determine influence strength.
   * Returns a value between 0 and (strength * 100).
   *
   * Falloff functions:
   * - linear: 1 - (d/r)
   * - quadratic: 1 - (d/r)²
   * - exponential: e^(-3*d/r)
   * - cubic: 1 - (d/r)³
   *
   * @param distance - Distance from content cell
   * @param radius - Influence radius
   * @param influence - Influence configuration
   * @returns Influence strength (0-100)
   */
  private calculateFalloff(distance: number, radius: number, influence: Influence): number {
    const { strength, falloff } = influence.transform;
    const normalized = distance / radius; // 0.0 to 1.0

    let factor: number;
    switch (falloff) {
      case 'linear':
        factor = 1 - normalized;
        break;
      case 'quadratic':
        factor = 1 - normalized * normalized;
        break;
      case 'exponential':
        factor = Math.exp(-normalized * 3); // e^(-3x) for smooth falloff
        break;
      case 'cubic':
        factor = 1 - normalized * normalized * normalized;
        break;
    }

    return factor * strength * 100; // Scale to 0-100
  }

  /**
   * Creates an empty influence mask for objects without influence.
   *
   * Mask is same size as content with 100 where content exists, null otherwise.
   */
  private createEmptyMask(content: Cell[][]): (number | null)[][] {
    return content.map(row => row.map(cell => (cell !== null ? 100 : null)));
  }

  /**
   * Calculates bounding box for object content including influence radius.
   *
   * The bounds extend by the influence radius on all sides to cover the full
   * area affected by the object.
   */
  private calculateBounds(content: Cell[][], position: Position, influence?: Influence): Bounds {
    const height = content.length;
    const width = content[0].length;
    const radius = influence?.radius || 0;

    return {
      minX: position.x - radius,
      minY: position.y - radius,
      maxX: position.x + width - 1 + radius,
      maxY: position.y + height - 1 + radius,
    };
  }

  /**
   * Flips content matrix horizontally (left-to-right mirror).
   */
  private flipContentHorizontal(content: Cell[][]): Cell[][] {
    return content.map(row => [...row].reverse());
  }

  /**
   * Flips content matrix vertically (top-to-bottom mirror).
   */
  private flipContentVertical(content: Cell[][]): Cell[][] {
    return [...content].reverse();
  }

  /**
   * Deep clones a content matrix.
   */
  private cloneContent(content: Cell[][]): Cell[][] {
    return content.map(row => [...row]);
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
