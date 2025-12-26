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
interface Influence {
  /** Influence radius in cells (must be positive integer) */
  radius: number;
  transform: {
    /** Transform type: 'lighten' interpolates toward white, 'darken' toward black */
    type: 'lighten' | 'darken';
    /** Maximum effect strength at distance 0 (0.0 to 1.0) */
    strength: number;
    /** How influence decreases with distance */
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
  };
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
  constructor(initialObjects?: Partial<CompositorObject>[], defaultViewport?: Viewport) {
    this.defaultViewport = defaultViewport;

    if (initialObjects) {
      for (const obj of initialObjects) {
        // Validate required fields
        if (!obj.id || !obj.content || !obj.position) {
          throw new Error('Invalid initial object: missing required fields (id, content, position)');
        }
        // Add object - this validates and processes the object
        this.addObject(obj.id, {
          content: obj.content,
          position: obj.position,
          color: obj.color,
          layer: obj.layer,
          influence: obj.influence,
        });
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
    const color = options.color || '#000000';
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
        transform: {
          type: options.influence.transform.type,
          strength: options.influence.transform.strength,
          falloff: options.influence.transform.falloff,
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

    // Render each cell in the viewport
    for (let y = 0; y < viewport.height; y++) {
      const charRow: string[] = [];
      const colorRow: string[] = [];

      for (let x = 0; x < viewport.width; x++) {
        // Convert viewport coordinates to world coordinates
        const worldX = viewport.x + x;
        const worldY = viewport.y + y;

        // Render this cell by traversing layers top-down
        const { char, color } = this.renderCell(worldX, worldY, layers);
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
   * @returns Rendered character and color
   */
  private renderCell(x: number, y: number, layers: number[]): { char: string; color: string } {
    let accumulatedTransparency = 0;

    // Traverse layers top to bottom (reverse order of sorted array)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const objectsOnLayer = this.getObjectsOnLayer(layer);

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

          // Early exit if fully transparent
          if (accumulatedTransparency >= 100) {
            return { char: ' ', color: '#000000' };
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
                // Non-space character - render it with accumulated transforms
                const transformedColor = this.applyTransparency(obj.color, accumulatedTransparency);
                return { char: cell, color: transformedColor };
              } else if (cell === ' ' && obj.influence) {
                // Glass pane effect: space with influence acts as transparent
                // Accumulate the influence transform and continue to lower layers
                const strength = obj.influence.transform.strength * 100;
                if (obj.influence.transform.type === 'lighten') {
                  accumulatedTransparency += strength;
                } else if (obj.influence.transform.type === 'darken') {
                  accumulatedTransparency -= strength;
                }
                // Continue to next layer (don't return)
              } else if (cell !== null) {
                // Space without influence - render as opaque space
                const transformedColor = this.applyTransparency(obj.color, accumulatedTransparency);
                return { char: cell, color: transformedColor };
              }
            }
          }

          // maskValue < 100: influence gradient (not content)
          // Accumulate transparency based on transform type
          if (maskValue > 0 && maskValue < 100) {
            if (obj.influence!.transform.type === 'lighten') {
              accumulatedTransparency += maskValue;
            } else if (obj.influence!.transform.type === 'darken') {
              accumulatedTransparency -= maskValue;
            }
          }

          // Check again if accumulated transparency >= 100
          if (accumulatedTransparency >= 100) {
            return { char: ' ', color: '#000000' };
          }
        }
      }
    }

    // No content found at this position
    return { char: ' ', color: '#000000' };
  }

  /**
   * Applies transparency transform to a color.
   *
   * Positive transparency: interpolate toward white (lighten)
   * Negative transparency: interpolate toward black (darken)
   * Zero transparency: return original color
   *
   * @param color - Base color in #RRGGBB format
   * @param transparencyPercent - Transparency amount (-100 to 100+)
   * @returns Transformed color in #RRGGBB format
   */
  private applyTransparency(color: string, transparencyPercent: number): string {
    if (transparencyPercent === 0) {
      return color;
    }

    // Parse hex color components
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    if (transparencyPercent >= 100) {
      return '#ffffff'; // Fully transparent = white
    }

    if (transparencyPercent > 0) {
      // Lighten: interpolate towards white
      const factor = transparencyPercent / 100;
      const newR = Math.round(r + (255 - r) * factor);
      const newG = Math.round(g + (255 - g) * factor);
      const newB = Math.round(b + (255 - b) * factor);
      return `#${this.toHex(newR)}${this.toHex(newG)}${this.toHex(newB)}`;
    } else {
      // Darken: interpolate towards black (negative transparency)
      const factor = Math.abs(transparencyPercent) / 100;
      const newR = Math.round(r * (1 - factor));
      const newG = Math.round(g * (1 - factor));
      const newB = Math.round(b * (1 - factor));
      return `#${this.toHex(newR)}${this.toHex(newG)}${this.toHex(newB)}`;
    }
  }

  /**
   * Converts a number (0-255) to a 2-digit hex string.
   */
  private toHex(value: number): string {
    return value.toString(16).padStart(2, '0');
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
    for (const obj of this.objects.values()) {
      layers.add(obj.layer);
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
   * Recursive flood fill implementation.
   *
   * Marks all spaces reachable from (x, y) as transparent (null).
   * Stops at non-space characters.
   */
  private floodFill(content: Cell[][], x: number, y: number, visited: Set<string>): void {
    const height = content.length;
    const width = content[0].length;

    // Bounds check
    if (y < 0 || y >= height || x < 0 || x >= width) {
      return;
    }

    const key = `${x},${y}`;
    if (visited.has(key)) {
      return; // Already visited
    }

    if (content[y][x] !== ' ') {
      return; // Not a space - don't fill
    }

    visited.add(key);
    content[y][x] = null; // Mark as transparent

    // Recursively fill adjacent cells (4-way connectivity)
    this.floodFill(content, x + 1, y, visited);
    this.floodFill(content, x - 1, y, visited);
    this.floodFill(content, x, y + 1, visited);
    this.floodFill(content, x, y - 1, visited);
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
