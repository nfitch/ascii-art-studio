/**
 * Flip & Transform Demo
 * Demonstrates horizontal and vertical flip operations
 */

import { Compositor, AsciiObject } from '../../../compositor/src/Compositor';

let compositor: Compositor;
let flipH = false;
let flipV = false;

export function renderFlipTransformDemo(): string {
  compositor = new Compositor([], { x: 0, y: 0, width: 50, height: 20 });

  // Add background pattern
  addBackgroundPattern();

  updateObject();

  return getHtml();
}

function addBackgroundPattern() {
  // Create a solid dot background
  const pattern: string[] = [];
  for (let y = 0; y < 20; y++) {
    pattern.push('.'.repeat(50));
  }

  compositor.addObject(new AsciiObject({ id: 'background',
    content: pattern,
    position: { x: 0, y: 0 },
    color: '#404040', // Darker for more contrast
    layer: -1, // Behind the arrow
  }));
}

function createArrowShape(): (string | null)[][] {
  // Create a shape with directional characters that mirror
  // Uses arrows, brackets, slashes, and box drawing characters
  return [
    [null, null, '╔', '═', '═', '═', '╗', null, null],
    [null, '/', '║', '→', '→', '→', '║', '\\', null],
    ['(', '<', '║', '>', '>', '>', '║', '>', ')'],
    ['[', '<', '╚', '═', '═', '═', '╝', '>', ']'],
    [null, '\\', null, '↓', null, '↓', null, '/', null],
  ];
}

function updateObject() {
  // Remove existing object
  try {
    compositor.removeObject('arrow');
  } catch (e) {
    // Object doesn't exist yet
  }

  // Add arrow object
  compositor.addObject(new AsciiObject({ id: 'arrow',
    content: createArrowShape(),
    position: { x: 20, y: 5 },
    color: '#000000',
    layer: 0,
    influence: {
      radius: 7,
      transform: {
        type: 'lighten',
        strength: 1.0,
        falloff: 'linear',
      },
    },
  }));

  // Apply flips based on current state
  const obj = compositor.getObject('arrow');
  if (obj) {
    // Flip to match desired state with character mirroring
    if (flipH !== obj.flipHorizontal) {
      compositor.getObject('arrow').flipHorizontalToggle(true);
    }
    if (flipV !== obj.flipVertical) {
      compositor.getObject('arrow').flipVerticalToggle(true);
    }
  }
}

function getHtml(): string {
  const output = compositor.render();

  return `
    <div class="demo-container">
      <h2>Flip & Transform</h2>

      <div class="demo-description">
        Demonstrates horizontal and vertical flip operations with character mirroring.
        Directional characters like arrows, brackets, and box corners mirror to their opposites.
        The flip operations transform both the object's content and its influence gradient.
      </div>

      <div class="demo-controls">
        <div class="control-group">
          <button onclick="flipTransformToggleH()">Toggle Flip Horizontal</button>
          <button onclick="flipTransformToggleV()">Toggle Flip Vertical</button>
          <button onclick="flipTransformReset()">Reset</button>
        </div>
        <div class="control-group">
          <span class="control-label">State:</span>
          <span>H: ${flipH ? 'ON' : 'OFF'} | V: ${flipV ? 'ON' : 'OFF'}</span>
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
(window as any).flipTransformToggleH = () => {
  flipH = !flipH;
  updateObject();
  updateDisplay();
};

(window as any).flipTransformToggleV = () => {
  flipV = !flipV;
  updateObject();
  updateDisplay();
};

(window as any).flipTransformReset = () => {
  flipH = false;
  flipV = false;
  updateObject();
  updateDisplay();
};

function updateDisplay() {
  const body = document.getElementById('content-body');
  if (body) {
    body.innerHTML = getHtml();
  }
}
