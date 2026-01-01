/**
 * Layer Effects Demo
 * Demonstrates how layer effects apply uniform color transformations to entire layers
 */

import { Compositor, AsciiObject } from '../../../compositor/src/Compositor';

export function renderLayerEffectsDemo(): string {
  return getHtml();
}

function generateScene(config: {
  layer1Effect?: { type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken'; color: string; strength: number };
  layer2Effect?: { type: 'lighten' | 'darken' | 'multiply' | 'multiply-darken'; color: string; strength: number };
}): { characters: string[][]; colors: string[][] } {
  const compositor = new Compositor([], { x: 0, y: 0, width: 50, height: 20 });

  // Layer 0: Background scenery (gray buildings and ground)
  compositor.addObject(new AsciiObject({ id: 'ground',
    content: [Array(50).fill('=').join('')],
    position: { x: 0, y: 15 },
    color: '#666666',
    layer: 0,
  }));

  compositor.addObject(new AsciiObject({ id: 'building1',
    content: [
      '##########',
      '##########',
      '##########',
      '##########',
      '##########',
    ],
    position: { x: 5, y: 10 },
    color: '#808080',
    layer: 0,
  }));

  compositor.addObject(new AsciiObject({ id: 'building2',
    content: [
      '########',
      '########',
      '########',
      '########',
    ],
    position: { x: 20, y: 11 },
    color: '#999999',
    layer: 0,
  }));

  compositor.addObject(new AsciiObject({ id: 'building3',
    content: [
      '############',
      '############',
      '############',
      '############',
      '############',
      '############',
    ],
    position: { x: 35, y: 9 },
    color: '#707070',
    layer: 0,
  }));

  // Layer 1: Mid-ground objects (trees)
  compositor.addObject(new AsciiObject({ id: 'tree1',
    content: [
      '  ***  ',
      ' ***** ',
      '*******',
      '   |   ',
      '   |   ',
    ],
    position: { x: 16, y: 10 },
    color: '#00aa00',
    layer: 1,
  }));

  compositor.addObject(new AsciiObject({ id: 'tree2',
    content: [
      ' *** ',
      '*****',
      '  |  ',
      '  |  ',
    ],
    position: { x: 30, y: 11 },
    color: '#00cc00',
    layer: 1,
  }));

  // Apply layer 1 effect if specified
  if (config.layer1Effect) {
    compositor.setLayerEffect(1, config.layer1Effect);
  }

  // Layer 2: Foreground objects (characters)
  compositor.addObject(new AsciiObject({ id: 'person1',
    content: [
      ' O ',
      '/|\\',
      '/ \\',
    ],
    position: { x: 12, y: 12 },
    color: '#ff0000',
    layer: 2,
  }));

  compositor.addObject(new AsciiObject({ id: 'person2',
    content: [
      ' O ',
      '/|\\',
      '/ \\',
    ],
    position: { x: 25, y: 12 },
    color: '#0000ff',
    layer: 2,
  }));

  // Apply layer 2 effect if specified
  if (config.layer2Effect) {
    compositor.setLayerEffect(2, config.layer2Effect);
  }

  return compositor.render();
}

function getHtml(): string {
  // Generate different variations
  const noEffects = generateScene({});

  const layer1Lighten = generateScene({
    layer1Effect: { type: 'lighten', color: '#ffffff', strength: 0.6 },
  });

  const layer1Darken = generateScene({
    layer1Effect: { type: 'darken', color: '#000000', strength: 0.5 },
  });

  const layer1Multiply = generateScene({
    layer1Effect: { type: 'multiply', color: '#ff8800', strength: 0.8 },
  });

  const layer2MultiplyBlue = generateScene({
    layer2Effect: { type: 'multiply', color: '#4444ff', strength: 0.7 },
  });

  const bothEffects = generateScene({
    layer1Effect: { type: 'multiply', color: '#ffaa00', strength: 0.6 },
    layer2Effect: { type: 'lighten', color: '#ffffff', strength: 0.4 },
  });

  return `
    <div class="demo-container">
      <h2>Layer Effects</h2>

      <div class="demo-description">
        Layer effects apply uniform color transformations to entire layers,
        affecting all objects on that layer and all layers below.
        This is useful for atmospheric effects, lighting conditions, and depth fog.
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1.5rem; align-items: start;">
        <div style="display: flex; flex-direction: column;">
          <h3 style="margin-bottom: 0.5rem;">No Effects (Baseline)</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em; color: #444; flex-shrink: 0;">
            Layer 0: Buildings (gray)<br>
            Layer 1: Trees (green)<br>
            Layer 2: People (red, blue)
          </p>
          <div class="demo-output">${renderOutput(noEffects)}</div>
        </div>

        <div style="display: flex; flex-direction: column;">
          <h3 style="margin-bottom: 0.5rem;">Layer 1: Lighten toward White</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em; color: #444; flex-shrink: 0;">
            Makes layer 1 and below brighter, like daytime lighting
          </p>
          <div class="demo-output">${renderOutput(layer1Lighten)}</div>
        </div>

        <div style="display: flex; flex-direction: column;">
          <h3 style="margin-bottom: 0.5rem;">Layer 1: Darken toward Black</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em; color: #444; flex-shrink: 0;">
            Makes layer 1 and below darker, like nighttime
          </p>
          <div class="demo-output">${renderOutput(layer1Darken)}</div>
        </div>

        <div style="display: flex; flex-direction: column;">
          <h3 style="margin-bottom: 0.5rem;">Layer 1: Multiply by Orange</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em; color: #444; flex-shrink: 0;">
            Applies orange tint to layer 1 and below, like sunset
          </p>
          <div class="demo-output">${renderOutput(layer1Multiply)}</div>
        </div>

        <div style="display: flex; flex-direction: column;">
          <h3 style="margin-bottom: 0.5rem;">Layer 2: Multiply by Blue</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em; color: #444; flex-shrink: 0;">
            Applies blue tint to layer 2 and below (all layers)
          </p>
          <div class="demo-output">${renderOutput(layer2MultiplyBlue)}</div>
        </div>

        <div style="display: flex; flex-direction: column;">
          <h3 style="margin-bottom: 0.5rem;">Combined Effects</h3>
          <p style="margin-bottom: 0.5rem; font-size: 0.9em; color: #444; flex-shrink: 0;">
            Layer 1: multiply orange, Layer 2: lighten white
          </p>
          <div class="demo-output">${renderOutput(bothEffects)}</div>
        </div>
      </div>

      <div style="margin-top: 2rem; padding: 1rem; border: 1px solid #2a2a2a; background: #f8f8f8;">
        <strong>How Layer Effects Work:</strong>
        <ul style="margin: 0.5rem 0 0 1.5rem; padding: 0;">
          <li>Layer effects apply to the entire viewport at a specific layer</li>
          <li>Effects are applied bottom-up (lower layer numbers first)</li>
          <li>A layer effect affects its own layer and all layers below it</li>
          <li>Multiple layer effects stack - layer 2 effects apply after layer 1 effects</li>
          <li>Types: lighten (brighten), darken (dim), multiply (color filter), multiply-darken (darker color filter)</li>
        </ul>
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
