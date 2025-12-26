/**
 * Influence Explorer Demo
 * Demonstrates proximity-based influence gradients
 */

import { Compositor } from '../../../compositor/src/Compositor';

let currentFrame = 0;
const totalFrames = 19;

// Pre-generate all frames for both columns
const frames: {
  radius2: { characters: string[][]; colors: string[][] }[];
  radius4: { characters: string[][]; colors: string[][] }[];
} = {
  radius2: [],
  radius4: [],
};

export function renderInfluenceExplorerDemo(): string {
  // Generate all frames for both radius values
  generateFrames();
  currentFrame = 0;
  return getHtml();
}

function generateFrames() {
  const viewportWidth = 40;
  const viewportHeight = 15;

  // Positions for each frame
  // Frames 1-5: objects move from edges to corner overlap
  // Frames 6-20: objects stay in place, curtain drops down between them
  const positions = [
    { top: { x: 2, y: 4 }, bottom: { x: 30, y: 14 }, curtain: null }, // Frame 1: Far apart
    { top: { x: 6, y: 4 }, bottom: { x: 26, y: 12 }, curtain: null }, // Frame 2: Moving closer
    { top: { x: 10, y: 4 }, bottom: { x: 21, y: 10 }, curtain: null }, // Frame 3: Approaching
    { top: { x: 13, y: 4 }, bottom: { x: 18, y: 8 }, curtain: null }, // Frame 4: Getting close
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: null }, // Frame 5: Corner overlap
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -10 } }, // Frame 6: Curtain starts
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -8 } }, // Frame 7
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -6 } }, // Frame 8
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -4 } }, // Frame 9
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: -2 } }, // Frame 10
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 0 } }, // Frame 11
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 2 } }, // Frame 12
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 4 } }, // Frame 13
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 6 } }, // Frame 14
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 8 } }, // Frame 15
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 10 } }, // Frame 16
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 12 } }, // Frame 17
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 14 } }, // Frame 18
    { top: { x: 15, y: 4 }, bottom: { x: 17, y: 7 }, curtain: { x: 2, y: 16 } }, // Frame 19
  ];

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

  // Generate frames for radius=2
  frames.radius2 = positions.map((pos, idx) => {
    const compositor = new Compositor([], {
      x: 0,
      y: 0,
      width: viewportWidth,
      height: viewportHeight,
    });

    // Bottom object (layer 0)
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#000000',
      layer: 0,
      influence: {
        radius: 2,
        transform: {
          type: 'lighten',
          strength: 1.0,
          falloff: 'quadratic',
        },
      },
    });

    // Curtain object (layer 1) - only in frames 6-10
    if (pos.curtain) {
      const curtainContent: string[] = [];
      for (let i = 0; i < 12; i++) {
        curtainContent.push('###################################'); // 35 chars wide
      }
      compositor.addObject('curtain', {
        content: curtainContent,
        position: pos.curtain,
        color: '#000000',
        layer: 1,
        influence: {
          radius: 2,
          transform: {
            type: 'lighten',
            strength: 1.0,
            falloff: 'quadratic',
          },
        },
      });
    }

    // Top object (layer 2)
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#000000',
      layer: 2,
      influence: {
        radius: 2,
        transform: {
          type: 'lighten',
          strength: 1.0,
          falloff: 'quadratic',
        },
      },
    });

    return compositor.render();
  });

  // Generate frames for radius=4
  frames.radius4 = positions.map((pos, idx) => {
    const compositor = new Compositor([], {
      x: 0,
      y: 0,
      width: viewportWidth,
      height: viewportHeight,
    });

    // Bottom object (layer 0)
    compositor.addObject('bottom', {
      content: ['=====', '=====', '=====', '=====', '=====', '====='],
      position: pos.bottom,
      color: '#000000',
      layer: 0,
      influence: {
        radius: 4,
        transform: {
          type: 'lighten',
          strength: 1.0,
          falloff: 'quadratic',
        },
      },
    });

    // Curtain object (layer 1) - only in frames 6-10
    if (pos.curtain) {
      const curtainContent: string[] = [];
      for (let i = 0; i < 12; i++) {
        curtainContent.push('###################################'); // 35 chars wide
      }
      compositor.addObject('curtain', {
        content: curtainContent,
        position: pos.curtain,
        color: '#000000',
        layer: 1,
        influence: {
          radius: 4,
          transform: {
            type: 'lighten',
            strength: 1.0,
            falloff: 'quadratic',
          },
        },
      });
    }

    // Top object (layer 2)
    compositor.addObject('top', {
      content: ['*****', '*****', '*****', '*****', '*****', '*****'],
      position: pos.top,
      color: '#000000',
      layer: 2,
      influence: {
        radius: 4,
        transform: {
          type: 'lighten',
          strength: 1.0,
          falloff: 'quadratic',
        },
      },
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
        Watch how influence affects nearby space as two objects approach.
        Left column: radius=2  |  Right column: radius=4
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

      <div style="display: flex; gap: 2rem;">
        <div style="flex: 1;">
          <h3 style="margin-bottom: 1rem;">Radius 2</h3>
          <div class="demo-output">${renderOutput(frames.radius2[currentFrame])}</div>
        </div>
        <div style="flex: 1;">
          <h3 style="margin-bottom: 1rem;">Radius 4</h3>
          <div class="demo-output">${renderOutput(frames.radius4[currentFrame])}</div>
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
