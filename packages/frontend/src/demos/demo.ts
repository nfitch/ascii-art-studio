/**
 * Primary Demo Component
 * Features: Full-screen, zoom, scroll, animation with 400x400 boundary box
 */

import { Compositor, AsciiObject } from '@ascii-art-studio/compositor';

// World constants
const WORLD_WIDTH = 200;
const WORLD_HEIGHT = 50;

// State variables
let compositor: Compositor;
let objects: AnimatedObject[] = [];
let nextId = 0;
let animationInterval: number | null = null;
let isPlaying = false;
let speed = 200;

// Full screen state
let isFullscreen = false;

// Zoom state
const baseFontSize = 12;
let zoomLevel = 0;

// Scroll state (viewport position in world coordinates)
let viewportX = 0;
let viewportY = 0;
let viewportWidth = 80;  // Will be calculated dynamically
let viewportHeight = 40; // Will be calculated dynamically

// Object types
type Shape = 'arrow' | 'bracket-box' | 'diamond' | 'corner-box';

interface AnimatedObject {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  shape: Shape;
  hollow: boolean;
  influenceRadius: number;
  layer: number;
  flipH: boolean;
  flipV: boolean;
}

/**
 * Generate the boundary box with double-line characters
 */
function generateBoundaryBox(width: number, height: number): (string | null)[][] {
  const content: (string | null)[][] = [];

  for (let y = 0; y < height; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < width; x++) {
      if (y === 0 && x === 0) {
        row.push('╔');
      } else if (y === 0 && x === width - 1) {
        row.push('╗');
      } else if (y === height - 1 && x === 0) {
        row.push('╚');
      } else if (y === height - 1 && x === width - 1) {
        row.push('╝');
      } else if (y === 0 || y === height - 1) {
        row.push('═');
      } else if (x === 0 || x === width - 1) {
        row.push('║');
      } else {
        row.push(null); // Transparent interior
      }
    }
    content.push(row);
  }

  return content;
}

/**
 * Measure character dimensions at a given font size
 */
function measureCharacterDimensions(fontSize: number): { width: number; height: number } {
  const temp = document.createElement('pre');
  temp.style.fontFamily = "'Courier New', Courier, monospace";
  temp.style.fontSize = `${fontSize}pt`;
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';
  temp.style.whiteSpace = 'pre';
  temp.style.lineHeight = '1.2';
  temp.textContent = 'X';
  document.body.appendChild(temp);

  const rect = temp.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  document.body.removeChild(temp);

  return { width, height };
}

/**
 * Calculate viewport size based on container and current font size
 */
function calculateViewportSize(): { width: number; height: number } {
  const outputDiv = document.querySelector('.demo-output') as HTMLElement;
  if (!outputDiv) return { width: 80, height: 40 }; // Fallback

  const currentFontSize = baseFontSize + zoomLevel;
  const dims = measureCharacterDimensions(currentFontSize);

  const availableWidth = outputDiv.clientWidth;
  const availableHeight = outputDiv.clientHeight;

  const width = Math.min(WORLD_WIDTH, Math.floor(availableWidth / dims.width));
  const height = Math.min(WORLD_HEIGHT, Math.floor(availableHeight / dims.height));

  return { width, height };
}

/**
 * Update the compositor with current object state
 */
function updateCompositor() {
  // Remove all existing objects except boundary
  objects.forEach((obj) => {
    try {
      compositor.removeObject(obj.id);
    } catch (e) {
      // Object doesn't exist, ignore
    }
  });

  // Add all objects at current positions
  objects.forEach((obj) => {
    const content = generateContent(obj.size, obj.shape, obj.hollow);

    const asciiObj = new AsciiObject({ id: obj.id,
      content,
      position: { x: Math.round(obj.x), y: Math.round(obj.y) },
      color: '#0000ff',
      layer: obj.layer,
      influence: obj.influenceRadius > 0 ? {
        radius: obj.influenceRadius,
        transform: {
          type: 'lighten',
          strength: 0.8,
          falloff: 'quadratic',
        },
      } : undefined,
    });

    // Apply flips based on current direction
    if (obj.flipH) {
      asciiObj.flipHorizontalToggle(true);
    }
    if (obj.flipV) {
      asciiObj.flipVerticalToggle(true);
    }

    compositor.addObject(asciiObj);
  });
}

/**
 * Render the output with viewport
 */
function renderOutput(output: { characters: string[][]; colors: string[][] }): string {
  let html = '';

  for (let y = 0; y < output.characters.length; y++) {
    for (let x = 0; x < output.characters[y].length; x++) {
      const char = output.characters[y][x];
      const color = output.colors[y][x];
      html += `<span style="color: ${color}">${char}</span>`;
    }
    html += '\n';
  }

  return html;
}

/**
 * Update the display
 */
function updateDisplay() {
  const body = document.getElementById('content-body');
  if (body) {
    body.innerHTML = getHtml();
  }
}

/**
 * Generate content for a shape
 */
function generateContent(size: number, shape: Shape, hollow: boolean): (string | null)[][] {
  const content: (string | null)[][] = [];
  const fillChar = '↗';

  if (shape === 'arrow') {
    // Right-pointing arrow: flat left edge, pointed right
    // Clearly asymmetric - visually different when flipped
    const half = Math.floor(size / 2);
    for (let y = 0; y < size; y++) {
      const row: (string | null)[] = [];
      const distFromCenter = Math.abs(y - half);
      const width = size - distFromCenter;

      for (let x = 0; x < size; x++) {
        if (x >= width) {
          row.push(null);
        } else if (x === 0) {
          // Flat left edge
          row.push('║');
        } else if (x === width - 1) {
          // Right tip with slashes
          if (y === half) {
            row.push('>');
          } else if (y < half) {
            row.push('\\');
          } else {
            row.push('/');
          }
        } else if (hollow && x > 0 && y !== 0 && y !== size - 1) {
          row.push(null);
        } else {
          row.push(fillChar);
        }
      }
      content.push(row);
    }
  } else if (shape === 'bracket-box') {
    // Right-pointing bracket box: flat [ on left, pointed > on right
    const half = Math.floor(size / 2);
    for (let y = 0; y < size; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < size; x++) {
        if (x === 0) {
          // Flat left edge
          row.push('[');
        } else if (y === 0 || y === size - 1) {
          // Top and bottom
          row.push('─');
        } else if (x === size - 1 && y === half) {
          // Right point
          row.push('>');
        } else if (x === size - 1) {
          row.push(null);
        } else if (hollow) {
          row.push(null);
        } else {
          row.push(fillChar);
        }
      }
      content.push(row);
    }
  } else if (shape === 'diamond') {
    // Diamond with slashes and angle brackets
    const half = Math.floor(size / 2);
    for (let y = 0; y < size; y++) {
      const row: (string | null)[] = [];
      const distFromCenter = Math.abs(y - half);
      const width = Math.min((half - distFromCenter) * 2 + 1, size);
      const leftPad = Math.floor((size - width) / 2);

      for (let x = 0; x < size; x++) {
        if (x < leftPad || x >= leftPad + width) {
          row.push(null);
        } else if (x === leftPad && x === leftPad + width - 1) {
          // Single-cell point at top/bottom
          row.push(y < half ? '/' : '\\');
        } else if (x === leftPad) {
          row.push(y < half ? '/' : (y === half ? '<' : '\\'));
        } else if (x === leftPad + width - 1) {
          row.push(y < half ? '\\' : (y === half ? '>' : '/'));
        } else if (hollow) {
          row.push(null);
        } else {
          row.push(fillChar);
        }
      }
      content.push(row);
    }
  } else if (shape === 'corner-box') {
    // Right-pointing corner box: box on left with arrow point on right
    const half = Math.floor(size / 2);
    const boxWidth = Math.max(3, Math.floor(size * 2 / 3));
    for (let y = 0; y < size; y++) {
      const row: (string | null)[] = [];
      const distFromCenter = Math.abs(y - half);
      const pointExtent = boxWidth + (half - distFromCenter);
      const rowWidth = Math.min(pointExtent, size);

      for (let x = 0; x < size; x++) {
        if (x >= rowWidth) {
          row.push(null);
        } else if (y === 0 && x === 0) {
          row.push('╔');
        } else if (y === size - 1 && x === 0) {
          row.push('╚');
        } else if ((y === 0 || y === size - 1) && x < boxWidth) {
          row.push('═');
        } else if (x === 0) {
          row.push('║');
        } else if (x >= boxWidth) {
          // Arrow point extending right from box
          if (x === rowWidth - 1) {
            if (y === half) {
              row.push('>');
            } else if (y < half) {
              row.push('\\');
            } else {
              row.push('/');
            }
          } else if (hollow) {
            row.push(null);
          } else {
            row.push(fillChar);
          }
        } else if (hollow) {
          row.push(null);
        } else {
          row.push(fillChar);
        }
      }
      content.push(row);
    }
  }

  return content;
}

/**
 * Generate the HTML for the demo
 */
function getHtml(): string {
  // Calculate viewport
  const { width, height } = calculateViewportSize();
  viewportWidth = width;
  viewportHeight = height;

  // Render with viewport
  const output = compositor.render({
    x: viewportX,
    y: viewportY,
    width: viewportWidth,
    height: viewportHeight,
  });

  const currentFontSize = baseFontSize + zoomLevel;
  const canZoomIn = zoomLevel < 10;
  const canZoomOut = zoomLevel > -5;
  const canScrollLeft = viewportX > 0;
  const canScrollRight = viewportX + viewportWidth < WORLD_WIDTH;
  const canScrollUp = viewportY > 0;
  const canScrollDown = viewportY + viewportHeight < WORLD_HEIGHT;

  return `
    <div class="demo-container" style="height: 100%; display: flex; flex-direction: column; padding: 0; max-width: none;">
      <div class="demo-controls" style="display: flex; align-items: center; padding: 0.25rem; margin: 0; flex-wrap: nowrap;">
        <button onclick="demoToggleFullscreen()" title="Toggle full screen" style="padding: 0.25rem 0.5rem; margin-right: 0;">${isFullscreen ? '[×]' : '[▢]'}</button>
        <span style="width: 0.5rem;"></span>
        <button onclick="demoZoomIn()" ${!canZoomIn ? 'disabled' : ''} title="Zoom in (+1pt)" style="padding: 0.25rem 0.5rem; margin-right: 0;">[+]</button>
        <button onclick="demoZoomOut()" ${!canZoomOut ? 'disabled' : ''} title="Zoom out (-1pt)" style="padding: 0.25rem 0.5rem; margin-right: 0;">[-]</button>
        <span style="margin: 0 0.5rem;">${currentFontSize}pt</span>
        <button onclick="demoScrollLeft()" ${!canScrollLeft ? 'disabled' : ''} title="Pan left 1 char" style="padding: 0.25rem 0.5rem; margin-right: 0;">[<]</button>
        <button onclick="demoScrollRight()" ${!canScrollRight ? 'disabled' : ''} title="Pan right 1 char" style="padding: 0.25rem 0.5rem; margin-right: 0;">[>]</button>
        <button onclick="demoScrollUp()" ${!canScrollUp ? 'disabled' : ''} title="Pan up 1 char" style="padding: 0.25rem 0.5rem; margin-right: 0;">[^]</button>
        <button onclick="demoScrollDown()" ${!canScrollDown ? 'disabled' : ''} title="Pan down 1 char" style="padding: 0.25rem 0.5rem; margin-right: 0;">[v]</button>
        <span style="width: 0.5rem;"></span>
        <button onclick="demoAnimationPlay()" ${isPlaying ? 'disabled' : ''} title="Play animation" style="padding: 0.25rem 0.5rem; margin-right: 0;">[▷]</button>
        <button onclick="demoAnimationPause()" ${!isPlaying ? 'disabled' : ''} title="Pause animation" style="padding: 0.25rem 0.5rem; margin-right: 0;">[⏸]</button>
        <button onclick="demoAnimationStepForward()" ${isPlaying ? 'disabled' : ''} title="Step forward one frame" style="padding: 0.25rem 0.5rem; margin-right: 0;">[⪢]</button>
        <button onclick="demoAnimationAddRandom()" title="Add random object" style="padding: 0.25rem 0.5rem; margin-right: 0;">[⊕]</button>
        <button onclick="demoAnimationRemoveRandom()" ${objects.length === 0 ? 'disabled' : ''} title="Remove random object" style="padding: 0.25rem 0.5rem; margin-right: 0;">[⊖]</button>
        <span style="width: 0.5rem;"></span>
        <input type="number" id="demo-speed" value="${speed}" min="50" max="2000" step="50" title="Animation speed in milliseconds"
               style="width: 60px; padding: 0.25rem;" onchange="demoSetSpeed(this.value)">
        <span style="margin: 0 0.5rem;">ms</span>
        <span title="Number of objects in scene">Objects: ${objects.length}</span>
      </div>

      <div class="demo-output" style="font-size: ${currentFontSize}pt; flex: 1; overflow: hidden; padding: 0; margin: 0; border: none;"><pre style="margin: 0; padding: 0;">${renderOutput(output)}</pre></div>
    </div>
  `;
}

/**
 * Initialize and render the demo
 */
export function renderDemoDemo(): string {
  // Reset state
  isFullscreen = false;
  zoomLevel = 0;
  viewportX = 0;
  viewportY = 0;
  objects = [];
  nextId = 0;
  isPlaying = false;

  // Stop any existing animation
  if (animationInterval !== null) {
    clearInterval(animationInterval);
    animationInterval = null;
  }

  // Create compositor with full world size
  compositor = new Compositor([], {
    x: 0,
    y: 0,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  });

  // Add boundary box at layer -1
  compositor.addObject(new AsciiObject({ id: 'boundary',
    content: generateBoundaryBox(WORLD_WIDTH, WORLD_HEIGHT),
    position: { x: 0, y: 0 },
    color: '#000000',
    layer: -1,
  }));

  // Set up 5 layers with lighten effects to fade lower layers
  // This makes front layer (4) dark/saturated and back layer (0) light/faded
  const lightenStrengths = [0.7, 0.5, 0.3, 0.1, 0.0]; // Layer 0-4

  for (let layer = 0; layer < 5; layer++) {
    // Apply lighten effect to fade lower layers
    if (lightenStrengths[layer] > 0) {
      compositor.setLayerEffect(layer, {
        color: '#ffffff',
        type: 'lighten',
        strength: lightenStrengths[layer],
      });
    }
  }

  // Add 10 random objects across all layers
  for (let i = 0; i < 10; i++) {
    createRandomObject();
  }

  updateCompositor();

  return getHtml();
}

/**
 * Create a random object (data only, no compositor/display update)
 */
function createRandomObject() {
  const influenceRadius = Math.floor(Math.random() * 5) + 3; // 3-7
  const shape: Shape = 'arrow';

  // Random size 5-15
  const size = Math.floor(Math.random() * 11) + 5;

  // 50% chance to be hollow
  const hollow = Math.random() < 0.5;

  const id = `obj${nextId++}`;

  // Random position within world boundaries (away from edges)
  const margin = size + 2;
  const x = Math.floor(Math.random() * (WORLD_WIDTH - margin * 2)) + margin;
  const y = Math.floor(Math.random() * (WORLD_HEIGHT - margin * 2)) + margin;

  // Random direction (normalized)
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // Random layer 0-4 (matching our 5 layer setup)
  const layer = Math.floor(Math.random() * 5);

  // Initialize flip state based on initial direction
  const flipH = dx < 0;
  const flipV = dy > 0;

  objects.push({ id, influenceRadius, layer, x, y, dx, dy, size, shape, hollow, flipH, flipV });
}

/**
 * Animation step - move objects and bounce off boundaries
 */
function animationStep() {
  objects.forEach((obj) => {
    obj.x += obj.dx;
    obj.y += obj.dy;

    // Bounce off inner edges of boundary box (at x=1, y=1, x=399, y=399)
    if (obj.x < 1 || obj.x + obj.size > WORLD_WIDTH - 1) {
      obj.dx = -obj.dx;
      obj.x += obj.dx * 2; // Move back into bounds
    }
    if (obj.y < 1 || obj.y + obj.size > WORLD_HEIGHT - 1) {
      obj.dy = -obj.dy;
      obj.y += obj.dy * 2; // Move back into bounds
    }

    // Update flip state based on direction
    // Moving right and up is "normal" (no flip)
    // Moving left = flip horizontal
    // Moving down = flip vertical
    obj.flipH = obj.dx < 0;
    obj.flipV = obj.dy > 0;
  });

  updateCompositor();
  updateDisplay();
}

// Global functions for button handlers

// Full screen toggle
(window as any).demoToggleFullscreen = () => {
  isFullscreen = !isFullscreen;

  // Toggle fullscreen class on body
  if (isFullscreen) {
    document.body.classList.add('fullscreen');
  } else {
    document.body.classList.remove('fullscreen');
  }

  // Recalculate viewport size for new container dimensions
  setTimeout(() => {
    const { width, height } = calculateViewportSize();
    viewportWidth = width;
    viewportHeight = height;

    // Clamp viewport position to new boundaries
    viewportX = Math.min(viewportX, Math.max(0, WORLD_WIDTH - viewportWidth));
    viewportY = Math.min(viewportY, Math.max(0, WORLD_HEIGHT - viewportHeight));

    updateDisplay();
  }, 0);
};

// Zoom controls
(window as any).demoZoomIn = () => {
  if (zoomLevel < 10) {
    zoomLevel++;
    const { width, height } = calculateViewportSize();
    viewportWidth = width;
    viewportHeight = height;

    // Clamp viewport position to new boundaries
    viewportX = Math.min(viewportX, Math.max(0, WORLD_WIDTH - viewportWidth));
    viewportY = Math.min(viewportY, Math.max(0, WORLD_HEIGHT - viewportHeight));

    updateDisplay();
  }
};

(window as any).demoZoomOut = () => {
  if (zoomLevel > -5) {
    zoomLevel--;
    const { width, height } = calculateViewportSize();
    viewportWidth = width;
    viewportHeight = height;

    // Clamp viewport position to new boundaries
    viewportX = Math.min(viewportX, Math.max(0, WORLD_WIDTH - viewportWidth));
    viewportY = Math.min(viewportY, Math.max(0, WORLD_HEIGHT - viewportHeight));

    updateDisplay();
  }
};

// Scroll controls
(window as any).demoScrollLeft = () => {
  if (viewportX > 0) {
    viewportX--;
    updateDisplay();
  }
};

(window as any).demoScrollRight = () => {
  if (viewportX + viewportWidth < WORLD_WIDTH) {
    viewportX++;
    updateDisplay();
  }
};

(window as any).demoScrollUp = () => {
  if (viewportY > 0) {
    viewportY--;
    updateDisplay();
  }
};

(window as any).demoScrollDown = () => {
  if (viewportY + viewportHeight < WORLD_HEIGHT) {
    viewportY++;
    updateDisplay();
  }
};

// Animation controls
(window as any).demoAnimationPlay = () => {
  if (!isPlaying) {
    isPlaying = true;
    animationInterval = window.setInterval(animationStep, speed);
    updateDisplay();
  }
};

(window as any).demoAnimationPause = () => {
  if (isPlaying && animationInterval !== null) {
    isPlaying = false;
    window.clearInterval(animationInterval);
    animationInterval = null;
    updateDisplay();
  }
};

(window as any).demoAnimationStepForward = () => {
  if (!isPlaying) {
    animationStep();
  }
};

(window as any).demoSetSpeed = (value: string) => {
  speed = parseInt(value, 10);
  if (isPlaying && animationInterval !== null) {
    window.clearInterval(animationInterval);
    animationInterval = window.setInterval(animationStep, speed);
  }
};

(window as any).demoAnimationAddRandom = () => {
  createRandomObject();
  updateCompositor();
  updateDisplay();
};

(window as any).demoAnimationRemoveRandom = () => {
  if (objects.length > 0) {
    const idx = Math.floor(Math.random() * objects.length);
    const removed = objects.splice(idx, 1)[0];
    compositor.removeObject(removed.id);
    updateDisplay();
  }
};
