/**
 * Auto-Edge Detection Demo
 * Demonstrates flood fill edge detection with hollow shapes
 */

import { Compositor } from '../../../compositor/src/Compositor';

export function renderAutoEdgeDemo(): string {
  return getHtml();
}

function createRingShape(): (string | null)[][] {
  // Create a hollow ring - outer ring of '#', inner hole of spaces
  // autoDetectEdges will convert outer spaces to nulls via flood fill
  const size = 20;
  const outerRadius = 10;
  const innerRadius = 5;
  const center = 9.5;
  const content: (string | null)[][] = [];

  for (let y = 0; y < size; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= outerRadius && dist >= innerRadius) {
        row.push('#');
      } else {
        row.push(' '); // Use spaces, not nulls
      }
    }
    content.push(row);
  }

  return content;
}

function createRingShapeExplicit(): string[][] {
  // Same ring but with 'x' showing spaces explicitly
  const size = 20;
  const outerRadius = 10;
  const innerRadius = 5;
  const center = 9.5;
  const content: string[][] = [];

  for (let y = 0; y < size; y++) {
    const row: string[] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= outerRadius && dist >= innerRadius) {
        row.push('#');
      } else {
        row.push('x'); // Show spaces as 'x'
      }
    }
    content.push(row);
  }

  return content;
}

function addBackground(compositor: Compositor) {
  const pattern: string[] = [];
  for (let y = 0; y < 26; y++) {
    pattern.push('.'.repeat(40));
  }

  compositor.addObject('background', {
    content: pattern,
    position: { x: 0, y: 0 },
    color: '#808080',
    layer: -1,
  });
}

function getHtml(): string {
  // Create three compositors for three panes
  const comp1 = new Compositor([], { x: 0, y: 0, width: 40, height: 26 });
  const comp2 = new Compositor([], { x: 0, y: 0, width: 40, height: 26 });
  const comp3 = new Compositor([], { x: 0, y: 0, width: 40, height: 26 });

  // Pane 1: Explicit spaces (shown as 'x')
  addBackground(comp1);
  comp1.addObject('ring', {
    content: createRingShapeExplicit(),
    position: { x: 10, y: 3 },
    color: '#000000',
    layer: 0,
  });

  // Pane 2: No edge detection
  addBackground(comp2);
  comp2.addObject('ring', {
    content: createRingShape(),
    position: { x: 10, y: 3 },
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
  });

  // Pane 3: With edge detection
  addBackground(comp3);
  comp3.addObject('ring', {
    content: createRingShape(),
    position: { x: 10, y: 3 },
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
  });

  const output1 = comp1.render();
  const output2 = comp2.render();
  const output3 = comp3.render();

  return `
    <div class="demo-container">
      <h2>Auto-Edge Detection</h2>

      <div class="demo-description">
        Demonstrates flood fill edge detection on a hollow ring shape.
        The ring has an outer edge and an inner hole. Auto-edge detection uses flood fill
        to distinguish between outer transparent edges and inner transparent holes.
      </div>

      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        <div style="flex: 1;">
          <h3 style="margin-bottom: 0.5rem;">1. Explicit Spaces</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Shows 'x' where spaces are in content</p>
          <div class="demo-output">${renderOutput(output1)}</div>
        </div>
        <div style="flex: 1;">
          <h3 style="margin-bottom: 0.5rem;">2. No Edge Detection</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em;">autoDetectEdges: false</p>
          <div class="demo-output">${renderOutput(output2)}</div>
        </div>
        <div style="flex: 1;">
          <h3 style="margin-bottom: 0.5rem;">3. With Edge Detection</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em;">autoDetectEdges: true</p>
          <div class="demo-output">${renderOutput(output3)}</div>
        </div>
      </div>

      <div style="margin-top: 1rem; padding: 1rem; border: 1px solid #2a2a2a; background: #f8f8f8;">
        <strong>How it works:</strong> With autoDetectEdges enabled, flood fill starts from the viewport edges
        and marks all reachable nulls as transparent edges. Nulls that can't be reached (like the inner hole)
        remain as opaque empty space.
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
