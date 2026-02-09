/**
 * Influence Explorer Demo
 * Demonstrates proximity-based influence gradients
 */

import { Compositor, AsciiObject } from '../../../compositor/src/Compositor';

let currentFrame = 0;
const totalFrames = 19;
let currentMode: 'lighten' | 'multiply' | 'multiply-darken' | 'blue-glows-red' = 'lighten';
let topLayer = 3;
let bottomLayer = 1;

// Pre-generate all frames for all variations
const frames: {
  radius2: { characters: string[][]; colors: string[][] }[];
  radius4: { characters: string[][]; colors: string[][] }[];
  multiplyRadius2: { characters: string[][]; colors: string[][] }[];
  multiplyRadius4: { characters: string[][]; colors: string[][] }[];
  multiplyDarkenRadius2: { characters: string[][]; colors: string[][] }[];
  multiplyDarkenRadius4: { characters: string[][]; colors: string[][] }[];
  blueGlowsRedRadius2: { characters: string[][]; colors: string[][] }[];
  blueGlowsRedRadius4: { characters: string[][]; colors: string[][] }[];
} = {
  radius2: [],
  radius4: [],
  multiplyRadius2: [],
  multiplyRadius4: [],
  multiplyDarkenRadius2: [],
  multiplyDarkenRadius4: [],
  blueGlowsRedRadius2: [],
  blueGlowsRedRadius4: [],
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

  interface ModeConfig {
    topColor: string;
    bottomColor: string;
    curtainColor: string;
    influenceColor?: string;
    transform: { type: string; strength: number; falloff: string; darkenFactor?: number };
  }

  const modeConfigs: Record<string, ModeConfig> = {
    lighten: {
      topColor: '#000000', bottomColor: '#000000', curtainColor: '#000000',
      transform: { type: 'lighten', strength: 1.0, falloff: 'quadratic' },
    },
    multiply: {
      topColor: '#ff8888', bottomColor: '#8888ff', curtainColor: '#88ff88',
      transform: { type: 'multiply', strength: 1.0, falloff: 'quadratic' },
    },
    'multiply-darken': {
      topColor: '#ff8888', bottomColor: '#8888ff', curtainColor: '#88ff88',
      transform: { type: 'multiply-darken', strength: 1.0, falloff: 'quadratic', darkenFactor: 0.3 },
    },
    'blue-glows-red': {
      topColor: '#0000ff', bottomColor: '#0000ff', curtainColor: '#0000ff',
      influenceColor: '#ff0000',
      transform: { type: 'lighten', strength: 1.0, falloff: 'linear' },
    },
  };

  function renderFrames(radius: number, config: ModeConfig) {
    return positions.map((pos) => {
      const compositor = new Compositor([], { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
      const influence = {
        radius,
        ...(config.influenceColor ? { color: config.influenceColor } : {}),
        transform: config.transform,
      };
      compositor.addObject(new AsciiObject({ id: 'bottom',
        content: ['#####', '#####', '#####', '#####', '#####', '#####'],
        position: pos.bottom,
        color: config.bottomColor,
        layer: bottomLayer,
        influence,
      }));
      if (pos.curtain) {
        compositor.addObject(new AsciiObject({ id: 'curtain',
          content: Array(12).fill('███████████████████████████████████'),
          position: pos.curtain,
          color: config.curtainColor,
          layer: 2,
          influence,
        }));
      }
      compositor.addObject(new AsciiObject({ id: 'top',
        content: ['@@@@@', '@@@@@', '@@@@@', '@@@@@', '@@@@@', '@@@@@'],
        position: pos.top,
        color: config.topColor,
        layer: topLayer,
        influence,
      }));
      return compositor.render();
    });
  }

  frames.radius2 = renderFrames(2, modeConfigs.lighten);
  frames.radius4 = renderFrames(4, modeConfigs.lighten);
  frames.multiplyRadius2 = renderFrames(2, modeConfigs.multiply);
  frames.multiplyRadius4 = renderFrames(4, modeConfigs.multiply);
  frames.multiplyDarkenRadius2 = renderFrames(2, modeConfigs['multiply-darken']);
  frames.multiplyDarkenRadius4 = renderFrames(4, modeConfigs['multiply-darken']);
  frames.blueGlowsRedRadius2 = renderFrames(2, modeConfigs['blue-glows-red']);
  frames.blueGlowsRedRadius4 = renderFrames(4, modeConfigs['blue-glows-red']);
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

  // Get the appropriate frames for the current mode
  const radius2Frames = currentMode === 'lighten' ? frames.radius2 :
                        currentMode === 'multiply' ? frames.multiplyRadius2 :
                        currentMode === 'multiply-darken' ? frames.multiplyDarkenRadius2 :
                        frames.blueGlowsRedRadius2;
  const radius4Frames = currentMode === 'lighten' ? frames.radius4 :
                        currentMode === 'multiply' ? frames.multiplyRadius4 :
                        currentMode === 'multiply-darken' ? frames.multiplyDarkenRadius4 :
                        frames.blueGlowsRedRadius4;

  const modeDescriptions = {
    'lighten': 'Lighten (Black & White)',
    'multiply': 'Multiply (Light Red / Light Blue / Light Green)',
    'multiply-darken': 'Multiply-Darken (Light Red / Light Blue / Light Green, factor=0.3)',
    'blue-glows-red': 'Blue Glows Red (Blue objects with red influence)'
  };

  return `
    <div class="demo-container">
      <h2>Influence Explorer</h2>

      <div class="demo-description">
        Watch how different influence types affect nearby space as objects approach.
        Select a blend mode to see how it affects the interaction between objects.
      </div>

      <div class="demo-controls">
        <div class="control-group">
          <span class="control-label">Blend Mode:</span>
          <select onchange="influenceExplorerChangeMode(this.value)">
            <option value="lighten" ${currentMode === 'lighten' ? 'selected' : ''}>Lighten (Black & White)</option>
            <option value="multiply" ${currentMode === 'multiply' ? 'selected' : ''}>Multiply (Color)</option>
            <option value="multiply-darken" ${currentMode === 'multiply-darken' ? 'selected' : ''}>Multiply-Darken (Color)</option>
            <option value="blue-glows-red" ${currentMode === 'blue-glows-red' ? 'selected' : ''}>Blue Glows Red</option>
          </select>
        </div>
        <div class="control-group">
          <span class="control-label">@@@@@ Layer:</span>
          <select onchange="influenceExplorerChangeTopLayer(Number(this.value))">
            ${[0,1,2,3,4].map(l => `<option value="${l}" ${topLayer === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <span class="control-label">##### Layer:</span>
          <select onchange="influenceExplorerChangeBottomLayer(Number(this.value))">
            ${[0,1,2,3,4].map(l => `<option value="${l}" ${bottomLayer === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
          <span style="font-size: 0.8em; opacity: 0.7;">(curtain fixed at layer 2)</span>
        </div>
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
        <h3 style="margin-bottom: 1rem;">${modeDescriptions[currentMode]}</h3>
        <div style="display: flex; gap: 2rem;">
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 2</p>
            <div class="demo-output">${renderOutput(radius2Frames[currentFrame])}</div>
          </div>
          <div style="flex: 1;">
            <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Radius 4</p>
            <div class="demo-output">${renderOutput(radius4Frames[currentFrame])}</div>
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

(window as any).influenceExplorerChangeMode = (mode: 'lighten' | 'multiply' | 'multiply-darken' | 'blue-glows-red') => {
  currentMode = mode;
  updateDisplay();
};

(window as any).influenceExplorerChangeTopLayer = (layer: number) => {
  topLayer = layer;
  generateFrames();
  updateDisplay();
};

(window as any).influenceExplorerChangeBottomLayer = (layer: number) => {
  bottomLayer = layer;
  generateFrames();
  updateDisplay();
};

function updateDisplay() {
  const body = document.getElementById('content-body');
  if (body) {
    body.innerHTML = getHtml();
  }
}
