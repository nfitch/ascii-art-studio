/**
 * Edge Detection: Dynamic Demo
 * Interactive edge detection - click cells to toggle characters and see flood fill update
 */

import { Compositor, AsciiObject } from '../../../compositor/src/Compositor';

const GRID_WIDTH = 30;
const GRID_HEIGHT = 20;

// Grid state: true = has character, false/null = space
let grid: boolean[][] = [];

// Initialize with a simple pattern
function initializeGrid() {
  grid = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      row.push(false);
    }
    grid.push(row);
  }

  // Draw a simple hollow rectangle
  for (let x = 8; x < 22; x++) {
    grid[5][x] = true;  // Top
    grid[14][x] = true; // Bottom
  }
  for (let y = 5; y < 15; y++) {
    grid[y][8] = true;  // Left
    grid[y][21] = true; // Right
  }
}

export function renderEdgeDetectionDynamicDemo(): string {
  initializeGrid();
  return getHtml();
}

function toggleCell(x: number, y: number) {
  if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
    grid[y][x] = !grid[y][x];
    updateDisplay();
  }
}

function clearGrid() {
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x] = false;
    }
  }
  updateDisplay();
}

function renderCurrentState(): {
  withoutEdgeDetection: { characters: string[][]; colors: string[][] };
  withEdgeDetection: { characters: string[][]; colors: string[][] };
} {
  // Convert grid to content format
  const content: (string | null)[][] = grid.map(row =>
    row.map(cell => cell ? '#' : ' ')
  );

  // Without edge detection
  const comp1 = new Compositor([], { x: 0, y: 0, width: GRID_WIDTH, height: GRID_HEIGHT });
  comp1.addObject(new AsciiObject({ id: 'bg',
    content: Array(GRID_HEIGHT).fill('.'.repeat(GRID_WIDTH)),
    position: { x: 0, y: 0 },
    color: '#808080',
    layer: -1,
  }));
  comp1.addObject(new AsciiObject({ id: 'shape',
    content,
    position: { x: 0, y: 0 },
    color: '#000000',
    layer: 0,
    autoDetectEdges: false,
    influence: {
      radius: 2,
      transform: {
        type: 'lighten',
        strength: 1.0,
        falloff: 'linear',
      },
    },
  }));

  // With edge detection
  const comp2 = new Compositor([], { x: 0, y: 0, width: GRID_WIDTH, height: GRID_HEIGHT });
  comp2.addObject(new AsciiObject({ id: 'bg',
    content: Array(GRID_HEIGHT).fill('.'.repeat(GRID_WIDTH)),
    position: { x: 0, y: 0 },
    color: '#808080',
    layer: -1,
  }));
  comp2.addObject(new AsciiObject({ id: 'shape',
    content,
    position: { x: 0, y: 0 },
    color: '#000000',
    layer: 0,
    autoDetectEdges: true,
    influence: {
      radius: 2,
      transform: {
        type: 'lighten',
        strength: 1.0,
        falloff: 'linear',
      },
    },
  }));

  return {
    withoutEdgeDetection: comp1.render(),
    withEdgeDetection: comp2.render(),
  };
}

function getHtml(): string {
  const { withoutEdgeDetection, withEdgeDetection } = renderCurrentState();

  return `
    <div class="demo-container">
      <h2>Edge Detection: Dynamic</h2>

      <div class="demo-description">
        Interactive edge detection demonstration. Click on cells to toggle characters on/off.
        Watch how flood fill edge detection distinguishes between outer edges and inner hollow areas.
      </div>

      <div class="demo-controls">
        <div class="control-group">
          <button onclick="edgeDetectionDynamicClear()">Clear Grid</button>
        </div>
      </div>

      <div style="display: flex; gap: 2rem; margin-top: 1rem;">
        <div style="flex: 1;">
          <h3 style="margin-bottom: 1rem;">Without Edge Detection</h3>
          <div id="output-without" class="demo-output" style="cursor: pointer; user-select: none;">${renderOutput(withoutEdgeDetection, false)}</div>
        </div>
        <div style="flex: 1;">
          <h3 style="margin-bottom: 1rem;">With Edge Detection</h3>
          <div id="output-with" class="demo-output" style="cursor: pointer; user-select: none;">${renderOutput(withEdgeDetection, true)}</div>
        </div>
      </div>

      <div style="margin-top: 1rem; padding: 1rem; border: 1px solid #2a2a2a; background: #f8f8f8;">
        <strong>How it works:</strong> Click on any cell in either pane to toggle a character.
        The left pane shows influence affecting all spaces equally.
        The right pane uses flood fill from viewport edges - only outer spaces become transparent edges,
        while unreachable inner spaces remain opaque.
      </div>
    </div>
  `;
}

function renderOutput(output: { characters: string[][]; colors: string[][] }, withEdgeDetection: boolean): string {
  let html = '';
  for (let y = 0; y < output.characters.length; y++) {
    for (let x = 0; x < output.characters[y].length; x++) {
      const char = output.characters[y][x];
      const color = output.colors[y][x];
      const paneId = withEdgeDetection ? 'with' : 'without';
      html += `<span style="color: ${color}" onclick="edgeDetectionDynamicToggle(${x}, ${y})" data-x="${x}" data-y="${y}" data-pane="${paneId}">${char}</span>`;
    }
    html += '\n';
  }
  return html;
}

function updateDisplay() {
  const { withoutEdgeDetection, withEdgeDetection } = renderCurrentState();

  const outputWithout = document.getElementById('output-without');
  const outputWith = document.getElementById('output-with');

  if (outputWithout) {
    outputWithout.innerHTML = renderOutput(withoutEdgeDetection, false);
  }
  if (outputWith) {
    outputWith.innerHTML = renderOutput(withEdgeDetection, true);
  }
}

// Global functions for event handlers
(window as any).edgeDetectionDynamicToggle = (x: number, y: number) => {
  toggleCell(x, y);
};

(window as any).edgeDetectionDynamicClear = () => {
  clearGrid();
};
