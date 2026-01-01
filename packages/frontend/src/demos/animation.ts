/**
 * Animation Demo
 * Demonstrates frame-by-frame animation with moving objects
 */

import { Compositor, AsciiObject } from '../../../compositor/src/Compositor';

type Shape = 'square' | 'circle' | 'triangle' | 'hollow-circle';

interface AnimatedObject {
  id: string;
  influenceRadius: number;
  layer: number;
  x: number;
  y: number;
  dx: number; // direction x
  dy: number; // direction y
  size: number; // 3-6 wide
  shape: Shape;
}

let compositor: Compositor;
let objects: AnimatedObject[] = [];
let nextId = 0;
let animationInterval: number | null = null;
let isPlaying = false;
let speed = 200; // ms between steps

let viewportWidth = 60;
let viewportHeight = 25;
let charWidth = 0;
let charHeight = 0;

function measureCharacterDimensions(): { width: number; height: number } {
  // Create temporary element to measure character dimensions
  const temp = document.createElement('pre');
  temp.style.fontFamily = "'Courier New', Courier, monospace";
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

function calculateViewportSize() {
  const outputDiv = document.querySelector('.demo-output') as HTMLElement;
  if (!outputDiv) {
    return { width: 60, height: 25 }; // Fallback
  }

  // Measure character dimensions if not already done
  if (charWidth === 0 || charHeight === 0) {
    const dims = measureCharacterDimensions();
    charWidth = dims.width;
    charHeight = dims.height;
  }

  // Get available space (subtract padding and border)
  const styles = getComputedStyle(outputDiv);
  const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  const borderX = parseFloat(styles.borderLeftWidth) + parseFloat(styles.borderRightWidth);
  const borderY = parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);

  const availableWidth = outputDiv.clientWidth - paddingX - borderX;
  const availableHeight = outputDiv.clientHeight - paddingY - borderY;

  // Calculate grid size (subtract 2 for borders)
  const width = Math.max(40, Math.floor(availableWidth / charWidth) - 2);
  const height = Math.max(20, Math.floor(availableHeight / charHeight) - 3);

  return { width, height };
}

export function renderAnimationDemo(): string {
  // Calculate viewport size
  const size = calculateViewportSize();
  viewportWidth = size.width;
  viewportHeight = size.height;

  // Initialize compositor
  compositor = new Compositor([], {
    x: 0,
    y: 0,
    width: viewportWidth,
    height: viewportHeight,
  });

  // Add initial random objects
  addRandomObject();
  addRandomObject();
  addRandomObject();

  // Set up resize observer
  setTimeout(() => {
    setupResizeObserver();
  }, 0);

  return getHtml();
}

function setupResizeObserver() {
  const outputDiv = document.querySelector('.demo-output') as HTMLElement;
  if (!outputDiv) return;

  const resizeObserver = new ResizeObserver(() => {
    const newSize = calculateViewportSize();
    if (newSize.width !== viewportWidth || newSize.height !== viewportHeight) {
      viewportWidth = newSize.width;
      viewportHeight = newSize.height;

      // Recreate compositor with new size
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        (window as any).animationPause();
      }

      compositor = new Compositor([], {
        x: 0,
        y: 0,
        width: viewportWidth,
        height: viewportHeight,
      });

      // Clamp objects to new bounds
      objects.forEach((obj) => {
        obj.x = Math.min(obj.x, viewportWidth - obj.size);
        obj.y = Math.min(obj.y, viewportHeight - obj.size);
      });

      updateCompositor();
      updateDisplay();

      if (wasPlaying) {
        (window as any).animationPlay();
      }
    }
  });

  resizeObserver.observe(outputDiv);
}

function generateContent(char: string, size: number, shape: Shape): (string | null)[][] {
  const content: (string | null)[][] = [];

  if (shape === 'square') {
    for (let y = 0; y < size; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < size; x++) {
        row.push(char);
      }
      content.push(row);
    }
  } else if (shape === 'circle') {
    const radius = size / 2;
    const center = size / 2 - 0.5;
    for (let y = 0; y < size; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        row.push(dist <= radius ? char : null);
      }
      content.push(row);
    }
  } else if (shape === 'triangle') {
    // Triangle: apex at top, base at bottom, height = (size + 1) / 2
    const height = Math.ceil((size + 1) / 2);
    for (let y = 0; y < height; y++) {
      const row: (string | null)[] = [];
      const width = Math.min(y * 2 + 1, size); // 1, 3, 5... capped at size
      const padding = Math.floor((size - width) / 2);
      for (let x = 0; x < size; x++) {
        if (x >= padding && x < padding + width) {
          row.push(char);
        } else {
          row.push(null);
        }
      }
      content.push(row);
    }
  } else if (shape === 'hollow-circle') {
    const outerRadius = size / 2;
    const innerRadius = size / 2 - 1.5; // Hollow inner ring
    const center = size / 2 - 0.5;
    for (let y = 0; y < size; y++) {
      const row: (string | null)[] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= outerRadius && dist >= innerRadius) {
          row.push(char);
        } else {
          row.push(null);
        }
      }
      content.push(row);
    }
  }

  return content;
}

function addRandomObject() {
  const influenceRadius = Math.floor(Math.random() * 5) + 3; // 3-7
  const shapes: Shape[] = ['square', 'circle', 'triangle', 'hollow-circle'];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];

  // Different size ranges for different shapes
  let size: number;
  if (shape === 'triangle') {
    const oddSizes = [3, 5]; // odd numbers in range 3-6
    size = oddSizes[Math.floor(Math.random() * oddSizes.length)];
  } else if (shape === 'hollow-circle') {
    size = Math.floor(Math.random() * 5) + 6; // 6-10
  } else {
    size = Math.floor(Math.random() * 4) + 3; // 3-6
  }

  addObject(influenceRadius, size, shape);
}

function addObject(influenceRadius: number, size: number, shape: Shape) {
  const id = `obj${nextId++}`;

  // Random position
  const x = Math.floor(Math.random() * (viewportWidth - size));
  const y = Math.floor(Math.random() * (viewportHeight - size));

  // Random direction (normalized)
  const angle = Math.random() * Math.PI * 2;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  // Random layer 0-20
  const layer = Math.floor(Math.random() * 21);

  objects.push({ id, influenceRadius, layer, x, y, dx, dy, size, shape });

  updateCompositor();
}

function updateCompositor() {
  // Clear all objects
  objects.forEach((obj) => {
    try {
      compositor.removeObject(obj.id);
    } catch (e) {
      // Object might not exist yet
    }
  });

  // Add all objects at their current positions
  objects.forEach((obj) => {
    const char = obj.influenceRadius.toString();
    const content = generateContent(char, obj.size, obj.shape);

    const options: any = {
      content,
      position: { x: Math.round(obj.x), y: Math.round(obj.y) },
      color: '#000000',
      layer: obj.layer,
    };

    // Only add influence if radius > 0
    if (obj.influenceRadius > 0) {
      options.influence = {
        radius: obj.influenceRadius,
        transform: {
          type: 'lighten',
          strength: 0.8,
          falloff: 'quadratic',
        },
      };
    }

    compositor.addObject(obj.id, options);
  });
}

function animationStep() {
  // Move all objects
  objects.forEach((obj) => {
    obj.x += obj.dx;
    obj.y += obj.dy;

    // Reverse direction if out of bounds
    if (obj.x < -obj.size || obj.x > viewportWidth) {
      obj.dx = -obj.dx;
      obj.x += obj.dx * 2; // Move back into bounds
    }
    if (obj.y < -obj.size || obj.y > viewportHeight) {
      obj.dy = -obj.dy;
      obj.y += obj.dy * 2; // Move back into bounds
    }
  });

  updateCompositor();
  updateDisplay();
}

function getHtml(): string {
  const output = compositor.render();

  return `
    <div class="demo-container">
      <h2>Animation</h2>

      <div class="demo-description">
        Objects of various shapes (squares, circles, triangles, hollow circles) move smoothly across the viewport.
        Each object displays its influence radius (3-7). Objects have random sizes: 3-6 for most shapes, 6-10 for hollow circles.
        When objects move out of view, they reverse direction. Objects are placed on random layers (0-20).
      </div>

      <div class="demo-controls">
        <div class="control-group">
          <button onclick="animationPlay()" ${isPlaying ? 'disabled' : ''}>Play</button>
          <button onclick="animationPause()" ${!isPlaying ? 'disabled' : ''}>Pause</button>
          <button onclick="animationStepForward()" ${isPlaying ? 'disabled' : ''}>Step Forward</button>
          <button onclick="animationAddRandom()">Add Random Object</button>
          <button onclick="animationRemoveRandom()" ${objects.length === 0 ? 'disabled' : ''}>Remove Random Object</button>
        </div>
        <div class="control-group">
          <span class="control-label">Speed (ms):</span>
          <input type="number" id="animation-speed" value="${speed}" min="50" max="1000" step="50" onchange="animationSetSpeed(this.value)" style="width: 80px;">
          <span class="control-label">Objects:</span>
          <span>${objects.length}</span>
        </div>
      </div>

      <div class="demo-output">${renderOutput(output)}</div>
    </div>
  `;
}

function renderOutput(output: { characters: string[][]; colors: string[][] }): string {
  let html = '';

  // Top border
  html += '+' + '-'.repeat(viewportWidth) + '+\n';

  // Content with side borders
  for (let y = 0; y < output.characters.length; y++) {
    html += '|';
    for (let x = 0; x < output.characters[y].length; x++) {
      const char = output.characters[y][x];
      const color = output.colors[y][x];
      html += `<span style="color: ${color}">${char}</span>`;
    }
    html += '|\n';
  }

  // Bottom border
  html += '+' + '-'.repeat(viewportWidth) + '+\n';

  return html;
}

// Global functions for button handlers
(window as any).animationPlay = () => {
  if (!isPlaying) {
    isPlaying = true;
    animationInterval = window.setInterval(animationStep, speed);
    updateDisplay();
  }
};

(window as any).animationPause = () => {
  if (isPlaying && animationInterval !== null) {
    isPlaying = false;
    window.clearInterval(animationInterval);
    animationInterval = null;
    updateDisplay();
  }
};

(window as any).animationStepForward = () => {
  if (!isPlaying) {
    animationStep();
  }
};

(window as any).animationSetSpeed = (value: string) => {
  speed = parseInt(value, 10);
  if (isPlaying && animationInterval !== null) {
    // Restart with new speed
    window.clearInterval(animationInterval);
    animationInterval = window.setInterval(animationStep, speed);
  }
};

(window as any).animationAddRandom = () => {
  addRandomObject();
  updateDisplay();
};

(window as any).animationRemoveRandom = () => {
  if (objects.length > 0) {
    const idx = Math.floor(Math.random() * objects.length);
    const removed = objects.splice(idx, 1)[0];
    compositor.removeObject(removed.id);
    updateDisplay();
  }
};

function updateDisplay() {
  const body = document.getElementById('content-body');
  if (body) {
    body.innerHTML = getHtml();
  }
}
