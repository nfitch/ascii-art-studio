/**
 * Basic Layering Demo
 * Demonstrates layer-based rendering with compositor
 */

import { Compositor, AsciiObject } from '../../../compositor/src/Compositor';

let compositor: Compositor;
let layers: { id: string; layer: number; char: string; color: string }[] = [];
let nextId = 0;

export function renderBasicLayeringDemo(): string {
  // Initialize compositor
  compositor = new Compositor([], { x: 0, y: 0, width: 40, height: 15 });

  // Add initial layers
  layers = [
    { id: 'bg', layer: 0, char: '.', color: '#808080' },
    { id: 'mid', layer: 1, char: '#', color: '#0000ff' },
    { id: 'top', layer: 2, char: '@', color: '#ff0000' },
  ];

  // Add objects to compositor
  compositor.addObject(new AsciiObject({ id: 'bg',
    content: Array(10)
      .fill(null)
      .map(() => Array(30).fill('.')),
    position: { x: 5, y: 2 },
    color: '#808080',
    layer: 0,
  }));

  compositor.addObject(new AsciiObject({ id: 'mid',
    content: Array(6)
      .fill(null)
      .map(() => Array(20).fill('#')),
    position: { x: 10, y: 4 },
    color: '#0000ff',
    layer: 1,
  }));

  compositor.addObject(new AsciiObject({ id: 'top',
    content: Array(3)
      .fill(null)
      .map(() => Array(10).fill('@')),
    position: { x: 15, y: 6 },
    color: '#ff0000',
    layer: 2,
  }));

  nextId = 3;

  return getHtml();
}

function getHtml(): string {
  const output = compositor.render();

  return `
    <div class="demo-container">
      <h2>Basic Layering</h2>

      <div class="demo-description">
        Demonstrates layer-based rendering. Higher layer numbers appear on top of lower layers.
        Try adding or removing layers to see how they stack.
      </div>

      <div class="demo-controls">
        <div class="control-group">
          <button onclick="basicLayeringAddLayer()">Add Layer</button>
          <button onclick="basicLayeringRemoveLayer()">Remove Top Layer</button>
          <button onclick="basicLayeringReset()">Reset</button>
        </div>
        <div class="control-group">
          <span class="control-label">Layers:</span>
          <span>${layers.length} (Layer 0 = bottom, Layer ${layers.length - 1} = top)</span>
        </div>
      </div>

      <div class="demo-output">${renderOutput(output)}</div>
    </div>
  `;
}

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

// Global functions for button handlers
(window as any).basicLayeringAddLayer = () => {
  const newLayer = layers.length;
  const chars = ['*', '+', 'X', 'O', '%', '#', '@', '=', '~', '&', '$'];

  // Random character
  const char = chars[Math.floor(Math.random() * chars.length)];

  // Random darker color (RGB values 0-180 for darker shades)
  const r = Math.floor(Math.random() * 180);
  const g = Math.floor(Math.random() * 180);
  const b = Math.floor(Math.random() * 180);
  const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

  const id = `layer${nextId++}`;
  layers.push({ id, layer: newLayer, char, color });

  // Random size between 3x6 and 6x12
  const width = Math.floor(Math.random() * 7) + 6;
  const height = Math.floor(Math.random() * 4) + 3;

  // Random position within viewport bounds (40x15)
  const x = Math.floor(Math.random() * (40 - width));
  const y = Math.floor(Math.random() * (15 - height));

  compositor.addObject(id, {
    content: Array(height)
      .fill(null)
      .map(() => Array(width).fill(char)),
    position: { x, y },
    color,
    layer: newLayer,
  });

  updateDisplay();
};

(window as any).basicLayeringRemoveLayer = () => {
  if (layers.length === 0) return;

  const removed = layers.pop()!;
  compositor.removeObject(removed.id);

  updateDisplay();
};

(window as any).basicLayeringReset = () => {
  renderBasicLayeringDemo();
  updateDisplay();
};

function updateDisplay() {
  const body = document.getElementById('content-body');
  if (body) {
    body.innerHTML = getHtml();
  }
}
