/**
 * AsciiObject - Mutable scene graph node for ASCII art composition
 *
 * Represents a single ASCII art object that can be rendered by the Compositor.
 * Objects track their own dirty state and regenerate influence masks lazily.
 *
 * @module @ascii-art-studio/compositor
 */

/** Represents a single cell in the ASCII grid. null = transparent, string = visible character */
export type Cell = string | null;

/** 2D position in canvas coordinates */
export interface Position {
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
    /** Transform type */
    type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken';
    /** Maximum effect strength at distance 0 (0.0 to 1.0) */
    strength: number;
    /** How influence decreases with distance */
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
    /** Darken factor for 'multiply-darken' type (0.0 to 1.0, default 0.8) */
    darkenFactor?: number;
  };
}

/** Axis-aligned bounding box */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Options for creating an AsciiObject.
 * Content can be provided in three equivalent formats:
 * 1. Cell matrix: [['#', '#'], ['#', null]]
 * 2. String array: ['##', '# ']
 * 3. Newline string: '##\n# '
 */
export interface AsciiObjectOptions {
  /** Unique identifier for the object */
  id: string;
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
 * Mutable ASCII art object for scene composition.
 *
 * Objects manage their own state, track changes, and regenerate influence masks
 * lazily when needed. The Compositor observes objects and marks dirty regions
 * for efficient re-rendering.
 */
export class AsciiObject {
  /** Unique identifier */
  public readonly id: string;

  /** Normalized content as Cell[][] */
  public content: Cell[][];

  /** Current position */
  public position: Position;

  /** Layer number */
  public layer: number;

  /** Hex color in #RRGGBB format */
  public color: string;

  /** Influence configuration */
  public influence?: Influence;

  /** True if object is flipped horizontally */
  public flipHorizontal: boolean = false;

  /** True if object is flipped vertically */
  public flipVertical: boolean = false;

  /** Accumulated dirty bounding box (union of all positions since last render) */
  private _dirtyBounds: Bounds | null = null;

  /** True if influence mask needs regeneration */
  private _maskInvalidated: boolean = true;

  /** Cached influence mask (regenerated when invalidated) */
  private _influenceMask: (number | null)[][] | null = null;

  /** Cached bounds (recalculated when needed) */
  private _bounds: Bounds | null = null;

  /**
   * Creates a new AsciiObject.
   *
   * @param options - Object configuration
   */
  constructor(options: AsciiObjectOptions) {
    // Validate required fields
    if (!options || !options.id || !options.content || !options.position) {
      const missing: string[] = [];
      if (!options?.id) missing.push('id');
      if (!options?.content) missing.push('content');
      if (!options?.position) missing.push('position');
      throw new Error(`Invalid initial object: missing required fields (${missing.join(', ')})`);
    }

    this.id = options.id;
    this.content = this.normalizeContent(options.content);

    // Validate content is not empty
    if (this.content.length === 0 || this.content[0].length === 0) {
      throw new Error('Content must be non-empty');
    }

    if (options.autoDetectEdges) {
      this.content = this.autoDetectEdges(this.content);
    }

    this.position = { ...options.position };
    this.color = (options.color || '#000000').toLowerCase();
    this.layer = options.layer ?? 0;
    this.influence = options.influence ? this.cloneInfluence(options.influence) : undefined;

    // Validate layer is integer
    if (!Number.isInteger(this.layer)) {
      throw new Error('Layer must be an integer');
    }

    // Validate color format
    if (!this.isValidColor(this.color)) {
      throw new Error('Invalid color format: must be #RRGGBB');
    }

    // Validate influence if present
    if (this.influence) {
      const { radius, transform } = this.influence;

      if (radius <= 0 || !Number.isInteger(radius)) {
        throw new Error('Influence radius must be positive integer');
      }

      if (transform.strength < 0 || transform.strength > 1.0) {
        throw new Error('Influence strength must be between 0.0 and 1.0');
      }
    }

    // Initial state is dirty
    this._dirtyBounds = this.calculateBounds();
  }

  /**
   * Sets the object's position.
   * Accumulates dirty bounds for both old and new positions.
   *
   * @param x - New x coordinate
   * @param y - New y coordinate
   */
  setPosition(x: number, y: number): void {
    // Mark old position dirty
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());

    // Update position
    this.position = { x, y };

    // Invalidate bounds cache
    this._bounds = null;

    // Mark new position dirty
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());
  }

  /**
   * Sets the object's content.
   * Invalidates mask and marks bounds dirty.
   *
   * @param content - New content (any format)
   * @param autoDetectEdges - Apply flood fill to detect transparent edges
   */
  setContent(content: Cell[][] | string[] | string, autoDetectEdges: boolean = false): void {
    // Mark old bounds dirty
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());

    // Update content
    this.content = this.normalizeContent(content);

    if (autoDetectEdges) {
      this.content = this.autoDetectEdges(this.content);
    }

    // Invalidate cached data
    this._maskInvalidated = true;
    this._influenceMask = null;
    this._bounds = null;

    // Mark new bounds dirty
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());
  }

  /**
   * Sets the object's color.
   * Marks bounds dirty.
   *
   * @param color - New hex color (#RRGGBB)
   */
  setColor(color: string): void {
    const normalizedColor = color.toLowerCase();
    if (!this.isValidColor(normalizedColor)) {
      throw new Error(`Invalid color format: ${color}. Expected #RRGGBB.`);
    }

    this.color = normalizedColor;

    // Mark bounds dirty (color change affects render)
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());
  }

  /**
   * Sets the object's influence configuration.
   * Invalidates mask and marks bounds dirty.
   *
   * @param influence - New influence configuration (or undefined to remove)
   */
  setInfluence(influence: Influence | undefined): void {
    // Mark old bounds dirty
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());

    // Update influence
    this.influence = influence ? this.cloneInfluence(influence) : undefined;

    // Invalidate cached data
    this._maskInvalidated = true;
    this._influenceMask = null;
    this._bounds = null;

    // Mark new bounds dirty
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());
  }

  /**
   * Sets the object's layer.
   * Marks bounds dirty.
   *
   * @param layer - New layer number
   */
  setLayer(layer: number): void {
    this.layer = layer;

    // Mark bounds dirty (layer affects render order)
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());
  }

  /**
   * Toggles horizontal flip.
   * Invalidates mask and marks bounds dirty.
   */
  flipHorizontalToggle(): void {
    // Mark bounds dirty before flip
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());

    // Physically flip the content horizontally
    this.content = this.content.map(row => [...row].reverse());

    // Toggle flag
    this.flipHorizontal = !this.flipHorizontal;

    // Invalidate mask and bounds (content changed)
    this._maskInvalidated = true;
    this._influenceMask = null;
    this._bounds = null;

    // Mark bounds dirty after flip
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());
  }

  /**
   * Toggles vertical flip.
   * Invalidates mask and marks bounds dirty.
   */
  flipVerticalToggle(): void {
    // Mark bounds dirty before flip
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());

    // Physically flip the content vertically
    this.content = [...this.content].reverse();

    // Toggle flag
    this.flipVertical = !this.flipVertical;

    // Invalidate mask and bounds (content changed)
    this._maskInvalidated = true;
    this._influenceMask = null;
    this._bounds = null;

    // Mark bounds dirty after flip
    this._dirtyBounds = this.unionBounds(this._dirtyBounds, this.getBounds());
  }

  /**
   * Sets horizontal flip to specific state.
   *
   * @param flipped - Target flip state
   */
  setFlipHorizontal(flipped: boolean): void {
    if (this.flipHorizontal !== flipped) {
      this.flipHorizontalToggle();
    }
  }

  /**
   * Sets vertical flip to specific state.
   *
   * @param flipped - Target flip state
   */
  setFlipVertical(flipped: boolean): void {
    if (this.flipVertical !== flipped) {
      this.flipVerticalToggle();
    }
  }

  /**
   * Checks if object has changed since last render.
   *
   * @returns True if object is dirty
   */
  isDirty(): boolean {
    return this._dirtyBounds !== null;
  }

  /**
   * Gets the accumulated dirty bounding box.
   * Returns the union of all bounds the object has occupied since last clear.
   *
   * @returns Dirty bounds or null if clean
   */
  getDirtyBounds(): Bounds | null {
    return this._dirtyBounds;
  }

  /**
   * Clears dirty state after render.
   * Called by Compositor after consuming dirty bounds.
   */
  clearDirty(): void {
    this._dirtyBounds = null;
  }

  /**
   * Checks if influence mask needs regeneration.
   *
   * @returns True if mask is invalidated
   */
  needsMaskRegeneration(): boolean {
    return this._maskInvalidated;
  }

  /**
   * Gets the influence mask, regenerating if needed (lazy).
   * The mask is cached until invalidated by content/influence/flip changes.
   *
   * @returns Influence mask
   */
  getInfluenceMask(): (number | null)[][] {
    if (this._maskInvalidated || this._influenceMask === null) {
      this.regenerateMask();
    }
    return this._influenceMask!;
  }

  /**
   * Gets the bounding box including influence radius.
   * Cached until position/content/influence changes.
   *
   * @returns Bounding box
   */
  getBounds(): Bounds {
    if (this._bounds === null) {
      this._bounds = this.calculateBounds();
    }
    return this._bounds;
  }

  /**
   * Regenerates the influence mask based on current content and influence.
   * Applies flip transformations if needed.
   */
  private regenerateMask(): void {
    let content = this.content;

    // Apply flip transformations
    if (this.flipHorizontal) {
      content = this.flipContentHorizontal(content);
    }
    if (this.flipVertical) {
      content = this.flipContentVertical(content);
    }

    // Generate mask
    if (this.influence) {
      this._influenceMask = this.generateInfluenceMask(content, this.influence);
    } else {
      this._influenceMask = this.createEmptyMask(content);
    }

    this._maskInvalidated = false;
  }

  /**
   * Generates influence mask with gradient falloff.
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
   * Creates empty influence mask for objects without influence.
   */
  private createEmptyMask(content: Cell[][]): (number | null)[][] {
    return content.map(row => row.map(cell => (cell !== null ? 100 : null)));
  }

  /**
   * Calculates bounding box including influence radius.
   */
  private calculateBounds(): Bounds {
    const height = this.content.length;
    const width = this.content[0].length;
    const radius = this.influence?.radius || 0;

    return {
      minX: this.position.x - radius,
      minY: this.position.y - radius,
      maxX: this.position.x + width - 1 + radius,
      maxY: this.position.y + height - 1 + radius,
    };
  }

  /**
   * Computes union of two bounding boxes.
   */
  private unionBounds(a: Bounds | null, b: Bounds | null): Bounds | null {
    if (a === null) return b;
    if (b === null) return a;

    return {
      minX: Math.min(a.minX, b.minX),
      minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX),
      maxY: Math.max(a.maxY, b.maxY),
    };
  }

  /**
   * Normalizes content from any input format to Cell[][].
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
   * Auto-detects transparent edges using flood fill algorithm.
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
   * Iterative flood fill implementation using queue.
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
   * Flips content matrix horizontally.
   */
  private flipContentHorizontal(content: Cell[][]): Cell[][] {
    return content.map(row => [...row].reverse());
  }

  /**
   * Flips content matrix vertically.
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
   * Deep clones influence configuration.
   */
  private cloneInfluence(influence: Influence): Influence {
    return {
      radius: influence.radius,
      color: influence.color,
      transform: { ...influence.transform },
    };
  }

  /**
   * Validates color is in #RRGGBB format.
   */
  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }
}
