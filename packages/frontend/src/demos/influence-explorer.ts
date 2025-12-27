/**
 * Influence Explorer Demo
 * Demonstrates proximity-based influence gradients
 */

import { Compositor } from '../../../compositor/src/Compositor';

let currentFrame = 0;
const totalFrames = 19;

// Pre-generate all frames for all variations
const frames: {
  radius2: { characters: string[][]; colors: string[][] }[];
  radius4: { characters: string[][]; colors: string[][] }[];
  multiplyRadius2: { characters: string[][]; colors: string[][] }[];
  multiplyRadius4: { characters: string[][]; colors: string[][] }[];
  multiplyDarkenRadius2: { characters: string[][]; colors: string[][] }[];
  multiplyDarkenRadius4: { characters: string[][]; colors: string[][] }[];
} = {
  radius2: [],
  radius4: [],
  multiplyRadius2: [],
  multiplyRadius4: [],
  multiplyDarkenRadius2: [],
  multiplyDarkenRadius4: [],
};

export function renderInfluenceExplorerDemo(): string {
  // Generate all frames for all variations
  generateFrames();
  currentFrame = 0;
  return getHtml();
}

function generateFrames() {
  const viewportWidth = 40;
  const viewportHeight = 15;

  // Positions for each frame
  const positions = [
    { top: { x: 2, y: 4 }, bottom: { x: 30, y: 14 }, curtain: null },
    { top: { x: 6, y: 4 }, bottom: { x: 26, y: 12 }, curtain: null },
    { top: { x: 10, y: 4 }, bottom: { x: 21, y: 10 }, curtain: null },
    { top: { x: 13, y: 4 }, bottom: { x: 18, y: 8 }, curtain: null },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: null },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -10 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -8 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -6 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -4 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -2 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 0 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 2 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 4 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 6 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 8 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 10 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 12 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 14 } },
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 16 } },
  ];

  // Row 1: Lighten (existing)
  frames.radius2 = positions.map((pos) => {
    const compositor = new Compositor([], { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#000000',
      layer: 0,
      influence: { radius: 2, transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' } },
    });
    if (pos.curtain) {
      compositor.addObject('curtain', {
        content: Array(12).fill('###################################'),
        position: pos.curtain,
        color: '#000000',
        layer: 1,
        influence: { radius: 2, transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' } },
      });
    }
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#000000',
      layer: 2,
      influence: { radius: 2, transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' } },
    });
    return compositor.render();
  });

  frames.radius4 = positions.map((pos) => {
    const compositor = new Compositor([], { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#000000',
      layer: 0,
      influence: { radius: 4, transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' } },
    });
    if (pos.curtain) {
      compositor.addObject('curtain', {
        content: Array(12).fill('###################################'),
        position: pos.curtain,
        color: '#000000',
        layer: 1,
        influence: { radius: 4, transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' } },
      });
    }
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#000000',
      layer: 2,
      influence: { radius: 4, transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' } },
    });
    return compositor.render();
  });

  // Row 2: Multiply
  frames.multiplyRadius2 = positions.map((pos) => {
    const compositor = new Compositor([], { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#0000ff',
      layer: 0,
      influence: { radius: 2, transform: { type: 'multiply', strength: 1.0, falloff: 'quadratic' } },
    });
    if (pos.curtain) {
      compositor.addObject('curtain', {
        content: Array(12).fill('###################################'),
        position: pos.curtain,
        color: '#00ff00',
        layer: 1,
        influence: { radius: 2, transform: { type: 'multiply', strength: 1.0, falloff: 'quadratic' } },
      });
    }
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#ff0000',
      layer: 2,
      influence: { radius: 2, transform: { type: 'multiply', strength: 1.0, falloff: 'quadratic' } },
    });
    return compositor.render();
  });

  frames.multiplyRadius4 = positions.map((pos) => {
    const compositor = new Compositor([], { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#0000ff',
      layer: 0,
      influence: { radius: 4, transform: { type: 'multiply', strength: 1.0, falloff: 'quadratic' } },
    });
    if (pos.curtain) {
      compositor.addObject('curtain', {
        content: Array(12).fill('###################################'),
        position: pos.curtain,
        color: '#00ff00',
        layer: 1,
        influence: { radius: 4, transform: { type: 'multiply', strength: 1.0, falloff: 'quadratic' } },
      });
    }
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#ff0000',
      layer: 2,
      influence: { radius: 4, transform: { type: 'multiply', strength: 1.0, falloff: 'quadratic' } },
    });
    return compositor.render();
  });

  // Row 3: Multiply-Darken
  frames.multiplyDarkenRadius2 = positions.map((pos) => {
    const compositor = new Compositor([], { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#0000ff',
      layer: 0,
      influence: { radius: 2, transform: { type: 'multiply-darken', strength: 1.0, falloff: 'quadratic', darkenFactor: 0.8 } },
    });
    if (pos.curtain) {
      compositor.addObject('curtain', {
        content: Array(12).fill('###################################'),
        position: pos.curtain,
        color: '#00ff00',
        layer: 1,
        influence: { radius: 2, transform: { type: 'multiply-darken', strength: 1.0, falloff: 'quadratic', darkenFactor: 0.8 } },
      });
    }
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#ff0000',
      layer: 2,
      influence: { radius: 2, transform: { type: 'multiply-darken', strength: 1.0, falloff: 'quadratic', darkenFactor: 0.8 } },
    });
    return compositor.render();
  });

  frames.multiplyDarkenRadius4 = positions.map((pos) => {
    const compositor = new Compositor([], { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#0000ff',
      layer: 0,
      influence: { radius: 4, transform: { type: 'multiply-darken', strength: 1.0, falloff: 'quadratic', darkenFactor: 0.8 } },
    });
    if (pos.curtain) {
      compositor.addObject('curtain', {
        content: Array(12).fill('###################################'),
        position: pos.curtain,
        color: '#00ff00',
        layer: 1,
        influence: { radius: 4, transform: { type: 'multiply-darken', strength: 1.0, falloff: 'quadratic', darkenFactor: 0.8 } },
      });
    }
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#ff0000',
      layer: 2,
      influence: { radius: 4, transform: { type: 'multiply-darken', strength: 1.0, falloff: 'quadratic', darkenFactor: 0.8 } },
    });
    return compositor.render();
  });
}

function getHtml(): string {
  const frameLabels = [
    'Frame 1: Far Apart',
    'Frame 2: Moving Closer',
    'Frame 3: Approaching',
    'Frame 4: Getting Close',
    'Frame 5: Meeting',
    'Frame 6: Curtain Appears',
    'Frame 7: Curtain Descending',
    'Frame 8: Curtain Descending',
    'Frame 9: Curtain Descending',
    'Frame 10: Curtain Descending',
    'Frame 11: Curtain Descending',
    'Frame 12: Curtain Descending',
    'Frame 13: Curtain Midway',
    'Frame 14: Curtain Descending',
    'Frame 15: Curtain Descending',
    'Frame 16: Curtain Descending',
    'Frame 17: Curtain Descending',
    'Frame 18: Curtain Lower',
    'Frame 19: Curtain Exits',
  ];

  return `
    <div class="demo-container">
      <h2>Influence Explorer</h2>

      <div class="demo-description">
        Watch how different influence types affect nearby space as objects approach.
        Each row shows a different blend mode. Each column shows a different radius.
      </div>

      <div class="demo-controls">
        <div class="control-group">
          <button onclick="influenceExplorerPrevFrame()" ${currentFrame === 0 ? 'disabled' : ''}>Previous Frame</button>
          <button onclick="influenceExplorerNextFrame()" ${currentFrame === totalFrames - 1 ? 'disabled' : ''}>Next Frame</button>
          <button onclick="influenceExplorerReset()">Reset</button>
        </div>
        <div class="control-group">
          <span class="control-label">Frame:</span>
          <span>${currentFrame + 1} / ${totalFrames} - ${frameLabels[currentFrame]}</span>
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Row 1: Lighten</h3>
        <div style="display: flex; gap: 2rem;">
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 2</p>
            <div class="demo-output">${renderOutput(frames.radius2[currentFrame])}</div>
          </div>
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 4</p>
            <div class="demo-output">${renderOutput(frames.radius4[currentFrame])}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Row 2: Multiply (Red / Blue / Green)</h3>
        <div style="display: flex; gap: 2rem;">
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 2</p>
            <div class="demo-output">${renderOutput(frames.multiplyRadius2[currentFrame])}</div>
          </div>
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 4</p>
            <div class="demo-output">${renderOutput(frames.multiplyRadius4[currentFrame])}</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 1rem;">Row 3: Multiply-Darken (Red / Blue / Green, factor=0.8)</h3>
        <div style="display: flex; gap: 2rem;">
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 2</p>
            <div class="demo-output">${renderOutput(frames.multiplyDarkenRadius2[currentFrame])}</div>
          </div>
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 4</p>
            <div class="demo-output">${renderOutput(frames.multiplyDarkenRadius4[currentFrame])}</div>
          </div>
        </div>
      </div>
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
(window as any).influenceExplorerPrevFrame = () => {
  if (currentFrame > 0) {
    currentFrame--;
    updateDisplay();
  }
};

(window as any).influenceExplorerNextFrame = () => {
  if (currentFrame < totalFrames - 1) {
    currentFrame++;
    updateDisplay();
  }
};

(window as any).influenceExplorerReset = () => {
  currentFrame = 0;
  updateDisplay();
};

function updateDisplay() {
  const body = document.getElementById('content-body');
  if (body) {
    body.innerHTML = getHtml();
  }
}
