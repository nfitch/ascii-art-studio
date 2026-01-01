/**
 * Glass Pane Effect Demo
 * Demonstrates how spaces with influence create tinted glass effects
 */

import { Compositor, AsciiObject } from '../../../compositor/src/Compositor';

export function renderGlassPaneDemo(): string {
  return getHtml();
}

function generateScene(
  glassMode: 'none' | 'lighten' | 'multiply'
): { characters: string[][]; colors: string[][] } {
  const compositor = new Compositor([], { x: 0, y: 0, width: 40, height: 15 });

  // Background pattern (layer 0) - gray objects to show blue tint
  compositor.addObject(new AsciiObject({ id: 'bg1',
    content: ['#####', '#####', '#####', '#####', '#####'],
    position: { x: 5, y: 3 },
    color: '#999999',
    layer: 0,
  }));

  compositor.addObject(new AsciiObject({ id: 'bg2',
    content: ['=====', '=====', '=====', '=====', '====='],
    position: { x: 15, y: 7 },
    color: '#999999',
    layer: 0,
  }));

  compositor.addObject(new AsciiObject({ id: 'bg3',
    content: ['*****', '*****', '*****', '*****', '*****'],
    position: { x: 28, y: 4 },
    color: '#999999',
    layer: 0,
  }));

  // Glass pane (layer 1) - made of spaces with influence
  if (glassMode !== 'none') {
    const glassContent: string[] = [];
    for (let i = 0; i < 12; i++) {
      glassContent.push('                    '); // 20 spaces
    }

    compositor.addObject(new AsciiObject({ id: 'glass',
      content: glassContent,
      position: { x: 10, y: 2 },
      color: glassMode === 'lighten' ? '#6666ff' : '#4444ff', // Stronger blue
      layer: 1,
      influence: {
        radius: 1,
        transform: {
          type: glassMode,
          strength: glassMode === 'lighten' ? 0.8 : 1.0,
          falloff: 'linear',
        },
      },
    }));
  }

  return compositor.render();
}

function getHtml(): string {
  const sceneWithoutGlass = generateScene('none');
  const sceneWithLighten = generateScene('lighten');
  const sceneWithMultiply = generateScene('multiply');

  return `
    <div class="demo-container">
      <h2>Glass Pane Effect</h2>

      <div class="demo-description">
        Demonstrates how spaces (not just visible characters) can have influence.
        A glass pane is an invisible layer made of spaces that affects objects beneath it,
        creating a tinted glass effect. Compare the different blend modes to see their effects.
      </div>

      <div style="display: flex; gap: 1.5rem; margin-top: 1rem;">
        <div style="flex: 1;">
          <h3 style="margin-bottom: 1rem;">Without Glass Pane</h3>
          <div class="demo-output">${renderOutput(sceneWithoutGlass)}</div>
        </div>
        <div style="flex: 1;">
          <h3 style="margin-bottom: 1rem;">Glass Pane (Lighten)</h3>
          <div class="demo-output">${renderOutput(sceneWithLighten)}</div>
        </div>
        <div style="flex: 1;">
          <h3 style="margin-bottom: 1rem;">Glass Pane (Multiply)</h3>
          <div class="demo-output">${renderOutput(sceneWithMultiply)}</div>
        </div>
      </div>

      <div style="margin-top: 1rem; padding: 1rem; border: 1px solid #2a2a2a; background: #f8f8f8;">
        <strong>How it works:</strong> The glass pane is a 20×12 region of spaces (not nulls) positioned at layer 1.
        Even though spaces are invisible, they can carry influence that affects lower layers.
        Lighten mode adds brightness with a tint, while multiply mode creates a color filter effect by multiplying the colors.
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

