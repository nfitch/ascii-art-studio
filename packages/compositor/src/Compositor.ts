type Cell = string | null;

interface Position {
  x: number;
  y: number;
}

interface Influence {
  radius: number;
  transform: {
    type: 'lighten' | 'darken';
    strength: number;
    falloff: 'linear' | 'quadratic' | 'exponential' | 'cubic';
  };
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface AddObjectOptions {
  content: Cell[][] | string[] | string;
  position: Position;
  color?: string;
  layer?: number;
  influence?: Influence;
  autoDetectEdges?: boolean;
}

export interface CompositorObject {
  id: string;
  content: Cell[][];
  position: Position;
  layer: number;
  color: string;
  influence?: Influence;
  flipHorizontal: boolean;
  flipVertical: boolean;
  bounds: Bounds;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderOutput {
  characters: string[][];
  colors: string[][];
}

interface InternalObject extends CompositorObject {
  influenceMask: (number | null)[][];
}

export class Compositor {
  private objects: Map<string, InternalObject> = new Map();
  private defaultViewport?: Viewport;
  private dirtyRegions: Set<string> = new Set();
  private lastViewport?: Viewport;
  private cachedOutput?: RenderOutput;

  constructor(initialObjects?: Partial<CompositorObject>[], defaultViewport?: Viewport) {
    this.defaultViewport = defaultViewport;

    if (initialObjects) {
      for (const obj of initialObjects) {
        if (!obj.id || !obj.content || !obj.position) {
          throw new Error('Invalid initial object: missing required fields (id, content, position)');
        }
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

  addObject(id: string, options: AddObjectOptions): void {
    if (this.objects.has(id)) {
      throw new Error(`Object with id '${id}' already exists`);
    }

    const color = options.color || '#000000';
    const layer = options.layer ?? 0;

    // Validate color
    if (!this.isValidColor(color)) {
      throw new Error('Invalid color format: must be #RRGGBB');
    }

    // Validate layer
    if (!Number.isInteger(layer)) {
      throw new Error('Layer must be an integer');
    }

    // Normalize content
    let content = this.normalizeContent(options.content);

    // Validate content
    if (content.length === 0 || content[0].length === 0) {
      throw new Error('Content must be non-empty');
    }

    // Auto-detect edges if requested
    if (options.autoDetectEdges) {
      content = this.autoDetectEdges(content);
    }

    // Validate influence
    if (options.influence) {
      if (options.influence.radius <= 0 || !Number.isInteger(options.influence.radius)) {
        throw new Error('Influence radius must be positive integer');
      }
      if (options.influence.transform.strength < 0 || options.influence.transform.strength > 1.0) {
        throw new Error('Influence strength must be between 0.0 and 1.0');
      }
    }

    // Generate influence mask
    const influenceMask = options.influence
      ? this.generateInfluenceMask(content, options.influence)
      : this.createEmptyMask(content);

    // Calculate bounds
    const bounds = this.calculateBounds(content, options.position, options.influence);

    const internalObject: InternalObject = {
      id,
      content: this.cloneContent(content),
      position: { ...options.position },
      layer,
      color,
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

  removeObject(id: string): void {
    const obj = this.getObjectOrThrow(id);
    this.markRegionDirty(obj.bounds);
    this.objects.delete(id);
  }

  moveObject(id: string, position: Position): void {
    const obj = this.getObjectOrThrow(id);

    // Mark old position dirty
    this.markRegionDirty(obj.bounds);

    // Update position and bounds
    obj.position = { ...position };
    obj.bounds = this.calculateBounds(obj.content, position, obj.influence);

    // Mark new position dirty
    this.markRegionDirty(obj.bounds);
  }

  flipHorizontal(id: string): void {
    const obj = this.getObjectOrThrow(id);

    this.markRegionDirty(obj.bounds);

    obj.flipHorizontal = !obj.flipHorizontal;
    obj.content = this.flipContentHorizontal(obj.content);

    if (obj.influence) {
      obj.influenceMask = this.generateInfluenceMask(obj.content, obj.influence);
    }

    this.markRegionDirty(obj.bounds);
  }

  flipVertical(id: string): void {
    const obj = this.getObjectOrThrow(id);

    this.markRegionDirty(obj.bounds);

    obj.flipVertical = !obj.flipVertical;
    obj.content = this.flipContentVertical(obj.content);

    if (obj.influence) {
      obj.influenceMask = this.generateInfluenceMask(obj.content, obj.influence);
    }

    this.markRegionDirty(obj.bounds);
  }

  setFlipHorizontal(id: string, flipped: boolean): void {
    const obj = this.getObjectOrThrow(id);

    if (obj.flipHorizontal === flipped) {
      return; // No-op
    }

    this.flipHorizontal(id);
  }

  setFlipVertical(id: string, flipped: boolean): void {
    const obj = this.getObjectOrThrow(id);

    if (obj.flipVertical === flipped) {
      return; // No-op
    }

    this.flipVertical(id);
  }

  getObject(id: string): CompositorObject {
    const obj = this.getObjectOrThrow(id);

    return {
      id: obj.id,
      content: this.cloneContent(obj.content),
      position: { ...obj.position },
      layer: obj.layer,
      color: obj.color,
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

  listObjects(): CompositorObject[] {
    return Array.from(this.objects.values()).map(obj => this.getObject(obj.id));
  }

  getCanvasBounds(): Bounds {
    if (this.objects.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const obj of this.objects.values()) {
      minX = Math.min(minX, obj.bounds.minX);
      minY = Math.min(minY, obj.bounds.minY);
      maxX = Math.max(maxX, obj.bounds.maxX);
      maxY = Math.max(maxY, obj.bounds.maxY);
    }

    return { minX, minY, maxX, maxY };
  }

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

    // Render the scene
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

  private renderScene(viewport: Viewport): RenderOutput {
    const characters: string[][] = [];
    const colors: string[][] = [];

    // Get sorted layers
    const layers = this.getSortedLayers();

    for (let y = 0; y < viewport.height; y++) {
      const charRow: string[] = [];
      const colorRow: string[] = [];

      for (let x = 0; x < viewport.width; x++) {
        const worldX = viewport.x + x;
        const worldY = viewport.y + y;

        const { char, color } = this.renderCell(worldX, worldY, layers);
        charRow.push(char);
        colorRow.push(color);
      }

      characters.push(charRow);
      colors.push(colorRow);
    }

    return { characters, colors };
  }

  private renderCell(x: number, y: number, layers: number[]): { char: string; color: string } {
    let accumulatedTransparency = 0;

    // Traverse layers top to bottom
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const objectsOnLayer = this.getObjectsOnLayer(layer);

      // First added wins on same layer
      for (const obj of objectsOnLayer) {
        // Check if position is within influence mask
        const localX = x - obj.position.x;
        const localY = y - obj.position.y;

        const maskHeight = obj.influenceMask.length;
        const maskWidth = maskHeight > 0 ? obj.influenceMask[0].length : 0;

        // Adjust for influence radius offset
        const radius = obj.influence?.radius || 0;
        const maskX = localX + radius;
        const maskY = localY + radius;

        if (maskY >= 0 && maskY < maskHeight && maskX >= 0 && maskX < maskWidth) {
          const maskValue = obj.influenceMask[maskY][maskX];

          if (maskValue === null) {
            continue; // No influence from this object
          }

          // Check if accumulated transparency >= 100
          if (accumulatedTransparency >= 100) {
            return { char: ' ', color: '#000000' };
          }

          // If mask value is 100, this is an opaque character
          if (maskValue === 100) {
            const contentY = localY;
            const contentX = localX;
            if (
              contentY >= 0 &&
              contentY < obj.content.length &&
              contentX >= 0 &&
              contentX < obj.content[contentY].length
            ) {
              const cell = obj.content[contentY][contentX];
              if (cell !== null && cell !== ' ') {
                // Non-space character - render it
                const transformedColor = this.applyTransparency(obj.color, accumulatedTransparency);
                return { char: cell, color: transformedColor };
              } else if (cell === ' ' && obj.influence) {
                // Space with influence acts as transparent (glass pane effect)
                // Accumulate the influence transform and continue to next layer
                const strength = obj.influence.transform.strength * 100;
                if (obj.influence.transform.type === 'lighten') {
                  accumulatedTransparency += strength;
                } else if (obj.influence.transform.type === 'darken') {
                  accumulatedTransparency -= strength;
                }
                // Continue to next layer
              } else if (cell !== null) {
                // Space without influence - renders as space
                const transformedColor = this.applyTransparency(obj.color, accumulatedTransparency);
                return { char: cell, color: transformedColor };
              }
            }
          }

          // Mask value < 100, accumulate transparency based on transform type
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

    // No content found
    return { char: ' ', color: '#000000' };
  }

  private applyTransparency(color: string, transparencyPercent: number): string {
    if (transparencyPercent === 0) {
      return color;
    }

    // Parse hex color
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

  private toHex(value: number): string {
    return value.toString(16).padStart(2, '0');
  }

  private getObjectOrThrow(id: string): InternalObject {
    const obj = this.objects.get(id);
    if (!obj) {
      throw new Error(`Object with id '${id}' not found`);
    }
    return obj;
  }

  private getSortedLayers(): number[] {
    const layers = new Set<number>();
    for (const obj of this.objects.values()) {
      layers.add(obj.layer);
    }
    return Array.from(layers).sort((a, b) => a - b);
  }

  private getObjectsOnLayer(layer: number): InternalObject[] {
    const objects: InternalObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.layer === layer) {
        objects.push(obj);
      }
    }
    return objects;
  }

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

  private isValidColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  private autoDetectEdges(content: Cell[][]): Cell[][] {
    const height = content.length;
    const width = content[0].length;
    const result = this.cloneContent(content);
    const visited = new Set<string>();

    // Flood fill from all edges
    for (let y = 0; y < height; y++) {
      this.floodFill(result, 0, y, visited);
      this.floodFill(result, width - 1, y, visited);
    }
    for (let x = 0; x < width; x++) {
      this.floodFill(result, x, 0, visited);
      this.floodFill(result, x, height - 1, visited);
    }

    return result;
  }

  private floodFill(content: Cell[][], x: number, y: number, visited: Set<string>): void {
    const height = content.length;
    const width = content[0].length;

    if (y < 0 || y >= height || x < 0 || x >= width) {
      return;
    }

    const key = `${x},${y}`;
    if (visited.has(key)) {
      return;
    }

    if (content[y][x] !== ' ') {
      return; // Not a space
    }

    visited.add(key);
    content[y][x] = null; // Mark as transparent

    // Recursively fill adjacent cells
    this.floodFill(content, x + 1, y, visited);
    this.floodFill(content, x - 1, y, visited);
    this.floodFill(content, x, y + 1, visited);
    this.floodFill(content, x, y - 1, visited);
  }

  private generateInfluenceMask(content: Cell[][], influence: Influence): (number | null)[][] {
    const { radius } = influence;
    const contentHeight = content.length;
    const contentWidth = content[0].length;

    const maskHeight = contentHeight + radius * 2;
    const maskWidth = contentWidth + radius * 2;

    // Initialize mask with nulls
    const mask: (number | null)[][] = Array(maskHeight)
      .fill(null)
      .map(() => Array(maskWidth).fill(null));

    // For each content cell
    for (let cy = 0; cy < contentHeight; cy++) {
      for (let cx = 0; cx < contentWidth; cx++) {
        if (content[cy][cx] === null) {
          continue; // Transparent cell
        }

        // Mark this position as 100 (opaque)
        const mx = cx + radius;
        const my = cy + radius;
        mask[my][mx] = 100;

        // Generate influence gradient
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) {
              continue; // Already set to 100
            }

            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > radius) {
              continue;
            }

            const influenceStrength = this.calculateFalloff(distance, radius, influence);
            const targetX = mx + dx;
            const targetY = my + dy;

            if (targetY >= 0 && targetY < maskHeight && targetX >= 0 && targetX < maskWidth) {
              const current = mask[targetY][targetX];
              mask[targetY][targetX] = Math.max(current || 0, influenceStrength);
            }
          }
        }
      }
    }

    return mask;
  }

  private calculateFalloff(distance: number, radius: number, influence: Influence): number {
    const { strength, falloff } = influence.transform;
    const normalized = distance / radius;

    let factor: number;
    switch (falloff) {
      case 'linear':
        factor = 1 - normalized;
        break;
      case 'quadratic':
        factor = 1 - normalized * normalized;
        break;
      case 'exponential':
        factor = Math.exp(-normalized * 3);
        break;
      case 'cubic':
        factor = 1 - normalized * normalized * normalized;
        break;
    }

    return factor * strength * 100;
  }

  private createEmptyMask(content: Cell[][]): (number | null)[][] {
    // For objects without influence, mask is just 100 where content exists
    return content.map(row => row.map(cell => (cell !== null ? 100 : null)));
  }

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

  private flipContentHorizontal(content: Cell[][]): Cell[][] {
    return content.map(row => [...row].reverse());
  }

  private flipContentVertical(content: Cell[][]): Cell[][] {
    return [...content].reverse();
  }

  private cloneContent(content: Cell[][]): Cell[][] {
    return content.map(row => [...row]);
  }

  private markRegionDirty(bounds: Bounds): void {
    // Simple dirty tracking - mark entire bounds region as dirty
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        this.dirtyRegions.add(`${x},${y}`);
      }
    }
  }

  private viewportsEqual(a: Viewport, b: Viewport): boolean {
    return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
  }
}
