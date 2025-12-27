/**
 * Auto-Edge Detection Demo
 * Demonstrates flood fill edge detection with various shapes
 */

import { Compositor } from '../../../compositor/src/Compositor';

export function renderEdgeDetectionStaticDemo(): string {
  return getHtml();
}

// Keep old name for compatibility
export function renderAutoEdgeDemo(): string {
  return renderEdgeDetectionStaticDemo();
}

// Shape 1: Ring
function createRingShape(): (string | null)[][] {
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
        row.push(' ');
      }
    }
    content.push(row);
  }

  return content;
}

function createRingShapeExplicit(): string[][] {
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
        row.push('x');
      }
    }
    content.push(row);
  }

  return content;
}

// Shape 2: Tiger Face
function createTigerShape(): (string | null)[][] {
  const lines = [
    '  ##       ##  ',
    ' ####     #### ',
    ' ####     #### ',
    '  ########### ',
    ' ############# ',
    '## ## ### ## ##',
    '## ##  #  ## ##',
    '###   ###   ###',
    ' ###  ###  ### ',
    '  #### # ####  ',
    '   ########    ',
    '    ######     ',
    '   ## ## ##    ',
    '  ##  ##  ##   ',
    ' ##   ##   ##  ',
  ];

  return lines.map(line =>
    line.padEnd(15, ' ').split('').map(char => char === ' ' ? ' ' : char)
  );
}

function createTigerShapeExplicit(): string[][] {
  const lines = [
    '  ##       ##  ',
    ' ####     #### ',
    ' ####     #### ',
    '  ########### ',
    ' ############# ',
    '## ## ### ## ##',
    '## ##  #  ## ##',
    '###   ###   ###',
    ' ###  ###  ### ',
    '  #### # ####  ',
    '   ########    ',
    '    ######     ',
    '   ## ## ##    ',
    '  ##  ##  ##   ',
    ' ##   ##   ##  ',
  ];

  return lines.map(line =>
    line.padEnd(15, ' ').split('').map(char => char === ' ' ? 'x' : char)
  );
}

// Shape 3: House
function createHouseShape(): (string | null)[][] {
  const lines = [
    '        ##      ',
    '       ####     ',
    '      ##  ##    ',
    '     ##    ##   ',
    '   ############ ',
    '   ##        ## ',
    '   ##  ####  ## ',
    '   ##  ####  ## ',
    '   ##  ####  ## ',
    '   ##        ## ',
    '   ##   ##   ## ',
    '   ##   ##   ## ',
    '   ##   ##   ## ',
    '   ############ ',
  ];

  return lines.map(line =>
    line.padEnd(16, ' ').split('').map(char => char === ' ' ? ' ' : char)
  );
}

function createHouseShapeExplicit(): string[][] {
  const lines = [
    '        ##      ',
    '       ####     ',
    '      ##  ##    ',
    '     ##    ##   ',
    '   ############ ',
    '   ##        ## ',
    '   ##  ####  ## ',
    '   ##  ####  ## ',
    '   ##  ####  ## ',
    '   ##        ## ',
    '   ##   ##   ## ',
    '   ##   ##   ## ',
    '   ##   ##   ## ',
    '   ############ ',
  ];

  return lines.map(line =>
    line.padEnd(16, ' ').split('').map(char => char === ' ' ? 'x' : char)
  );
}

// Shape 4: Fish
function createFishShape(): (string | null)[][] {
  const lines = [
    '              ',
    '    #####     ',
    '  ####   ##   ',
    ' ##  #    ### ',
    '##       #### ',
    '##       #### ',
    ' ##  #    ### ',
    '  ####   ##   ',
    '    #####     ',
  ];

  return lines.map(line =>
    line.padEnd(14, ' ').split('').map(char => char === ' ' ? ' ' : char)
  );
}

function createFishShapeExplicit(): string[][] {
  const lines = [
    '              ',
    '    #####     ',
    '  ####   ##   ',
    ' ##  #    ### ',
    '##       #### ',
    '##       #### ',
    ' ##  #    ### ',
    '  ####   ##   ',
    '    #####     ',
  ];

  return lines.map(line =>
    line.padEnd(14, ' ').split('').map(char => char === ' ' ? 'x' : char)
  );
}

// Shape 5: Hollow Square
function createHollowSquareShape(): (string | null)[][] {
  const lines = [
    '############',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '############',
  ];

  return lines.map(line =>
    line.padEnd(12, ' ').split('').map(char => char === ' ' ? ' ' : char)
  );
}

function createHollowSquareShapeExplicit(): string[][] {
  const lines = [
    '############',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '##        ##',
    '############',
  ];

  return lines.map(line =>
    line.padEnd(12, ' ').split('').map(char => char === ' ' ? 'x' : char)
  );
}

// Shape 6: Smiley Face
function createSmileyShape(): (string | null)[][] {
  const size = 16;
  const radius = 8;
  const center = 7.5;
  const content: (string | null)[][] = [];

  for (let y = 0; y < size; y++) {
    const row: (string | null)[] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Circle outline
      if (dist >= radius - 0.7 && dist <= radius + 0.7) {
        row.push('#');
      }
      // Left eye
      else if (x >= 4 && x <= 6 && y >= 5 && y <= 6) {
        row.push('#');
      }
      // Right eye
      else if (x >= 9 && x <= 11 && y >= 5 && y <= 6) {
        row.push('#');
      }
      // Smile (arc)
      else if (y >= 10 && y <= 11) {
        const smileDx = x - center;
        const smileDy = y - 10;
        const smileDist = Math.sqrt(smileDx * smileDx + smileDy * smileDy);
        if (smileDist >= 3 && smileDist <= 5 && y === 10) {
          row.push('#');
        } else {
          row.push(' ');
        }
      }
      else {
        row.push(' ');
      }
    }
    content.push(row);
  }

  return content;
}

function createSmileyShapeExplicit(): string[][] {
  const size = 16;
  const radius = 8;
  const center = 7.5;
  const content: string[][] = [];

  for (let y = 0; y < size; y++) {
    const row: string[] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Circle outline
      if (dist >= radius - 0.7 && dist <= radius + 0.7) {
        row.push('#');
      }
      // Left eye
      else if (x >= 4 && x <= 6 && y >= 5 && y <= 6) {
        row.push('#');
      }
      // Right eye
      else if (x >= 9 && x <= 11 && y >= 5 && y <= 6) {
        row.push('#');
      }
      // Smile (arc)
      else if (y >= 10 && y <= 11) {
        const smileDx = x - center;
        const smileDy = y - 10;
        const smileDist = Math.sqrt(smileDx * smileDx + smileDy * smileDy);
        if (smileDist >= 3 && smileDist <= 5 && y === 10) {
          row.push('#');
        } else {
          row.push('x');
        }
      }
      else {
        row.push('x');
      }
    }
    content.push(row);
  }

  return content;
}

// Shape 7: Tree
function createTreeShape(): (string | null)[][] {
  const lines = [
    '      ###      ',
    '     #####     ',
    '    #######    ',
    '   #########   ',
    '  ###########  ',
    '    #######    ',
    '   #########   ',
    '  ###########  ',
    ' ############# ',
    '   #########   ',
    '  ###########  ',
    ' ############# ',
    '###############',
    '      ###      ',
    '      ###      ',
    '      ###      ',
  ];

  return lines.map(line =>
    line.padEnd(15, ' ').split('').map(char => char === ' ' ? ' ' : char)
  );
}

function createTreeShapeExplicit(): string[][] {
  const lines = [
    '      ###      ',
    '     #####     ',
    '    #######    ',
    '   #########   ',
    '  ###########  ',
    '    #######    ',
    '   #########   ',
    '  ###########  ',
    ' ############# ',
    '   #########   ',
    '  ###########  ',
    ' ############# ',
    '###############',
    '      ###      ',
    '      ###      ',
    '      ###      ',
  ];

  return lines.map(line =>
    line.padEnd(15, ' ').split('').map(char => char === ' ' ? 'x' : char)
  );
}

// Shape 8: Vertical Line (1 character wide)
function createVerticalLineShape(): (string | null)[][] {
  const lines = [
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
  ];

  return lines.map(line =>
    line.padEnd(1, ' ').split('').map(char => char === ' ' ? ' ' : char)
  );
}

function createVerticalLineShapeExplicit(): string[][] {
  const lines = [
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
    '|',
  ];

  return lines.map(line =>
    line.padEnd(1, ' ').split('').map(char => char === ' ' ? 'x' : char)
  );
}

// Shape 9: Horizontal Line (1 character tall)
function createHorizontalLineShape(): (string | null)[][] {
  return [['=', '=', '=', '=', '=', '=', '=', '=', '=', '='].map(c => c === ' ' ? ' ' : c)];
}

function createHorizontalLineShapeExplicit(): string[][] {
  return [['=', '=', '=', '=', '=', '=', '=', '=', '=', '='].map(c => c === ' ' ? 'x' : c)];
}

// Shape 10: Single Character (1x1)
function createSingleCharShape(): (string | null)[][] {
  return [[' #']].map(line =>
    line.split('').map(char => char === ' ' ? ' ' : char)
  );
}

function createSingleCharShapeExplicit(): string[][] {
  return [[' #']].map(line =>
    line.split('').map(char => char === ' ' ? 'x' : char)
  );
}

function addBackground(compositor: Compositor) {
  const pattern: string[] = [];
  for (let y = 0; y < 23; y++) {
    pattern.push('.'.repeat(40));
  }

  compositor.addObject('background', {
    content: pattern,
    position: { x: 0, y: 0 },
    color: '#808080',
    layer: -1,
  });
}

interface ShapeDefinition {
  name: string;
  createShape: () => (string | null)[][];
  createShapeExplicit: () => string[][];
  position: { x: number; y: number };
}

const shapes: ShapeDefinition[] = [
  {
    name: 'Ring',
    createShape: createRingShape,
    createShapeExplicit: createRingShapeExplicit,
    position: { x: 10, y: 3 },
  },
  {
    name: 'Tiger Face',
    createShape: createTigerShape,
    createShapeExplicit: createTigerShapeExplicit,
    position: { x: 12, y: 3 },
  },
  {
    name: 'House',
    createShape: createHouseShape,
    createShapeExplicit: createHouseShapeExplicit,
    position: { x: 12, y: 3 },
  },
  {
    name: 'Fish',
    createShape: createFishShape,
    createShapeExplicit: createFishShapeExplicit,
    position: { x: 13, y: 8 },
  },
  {
    name: 'Hollow Square',
    createShape: createHollowSquareShape,
    createShapeExplicit: createHollowSquareShapeExplicit,
    position: { x: 14, y: 7 },
  },
  {
    name: 'Smiley Face',
    createShape: createSmileyShape,
    createShapeExplicit: createSmileyShapeExplicit,
    position: { x: 12, y: 5 },
  },
  {
    name: 'Tree',
    createShape: createTreeShape,
    createShapeExplicit: createTreeShapeExplicit,
    position: { x: 12, y: 7 }, // Planted at bottom
  },
  {
    name: 'Vertical Line',
    createShape: createVerticalLineShape,
    createShapeExplicit: createVerticalLineShapeExplicit,
    position: { x: 20, y: 7 },
  },
  {
    name: 'Horizontal Line',
    createShape: createHorizontalLineShape,
    createShapeExplicit: createHorizontalLineShapeExplicit,
    position: { x: 15, y: 11 },
  },
  {
    name: 'Single Character',
    createShape: createSingleCharShape,
    createShapeExplicit: createSingleCharShapeExplicit,
    position: { x: 20, y: 11 },
  },
];

function renderShape(shape: ShapeDefinition): string {
  // Create three compositors for three panes
  const comp1 = new Compositor([], { x: 0, y: 0, width: 40, height: 23 });
  const comp2 = new Compositor([], { x: 0, y: 0, width: 40, height: 23 });
  const comp3 = new Compositor([], { x: 0, y: 0, width: 40, height: 23 });

  // Pane 1: Explicit spaces
  addBackground(comp1);
  comp1.addObject('shape', {
    content: shape.createShapeExplicit(),
    position: shape.position,
    color: '#000000',
    layer: 0,
  });

  // Pane 2: No edge detection
  addBackground(comp2);
  comp2.addObject('shape', {
    content: shape.createShape(),
    position: shape.position,
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
  comp3.addObject('shape', {
    content: shape.createShape(),
    position: shape.position,
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
    <div style="margin-bottom: 2rem;">
      <h3 style="margin-bottom: 1rem;">${shape.name}</h3>
      <div style="display: flex; gap: 1rem;">
        <div style="flex: 1;">
          <p style="margin-bottom: 0.5rem; font-size: 0.9em;">Explicit Spaces</p>
          <div class="demo-output">${renderOutput(output1)}</div>
        </div>
        <div style="flex: 1;">
          <p style="margin-bottom: 0.5rem; font-size: 0.9em;">No Edge Detection</p>
          <div class="demo-output">${renderOutput(output2)}</div>
        </div>
        <div style="flex: 1;">
          <p style="margin-bottom: 0.5rem; font-size: 0.9em;">With Edge Detection</p>
          <div class="demo-output">${renderOutput(output3)}</div>
        </div>
      </div>
    </div>
  `;
}

function getHtml(): string {
  const shapesHtml = shapes.map(shape => renderShape(shape)).join('');

  return `
    <div class="demo-container">
      <h2>Edge Detection: Static</h2>

      <div class="demo-description">
        Demonstrates flood fill edge detection on various shapes including 1-character-wide objects.
        Auto-edge detection uses flood fill starting from viewport edges
        to distinguish between outer transparent edges and inner hollow areas.
        Scroll down to see different shape examples.
      </div>

      <div style="margin-top: 2rem;">
        ${shapesHtml}
      </div>

      <div style="margin-top: 1rem; padding: 1rem; border: 1px solid #2a2a2a; background: #f8f8f8;">
        <strong>How it works:</strong> With autoDetectEdges enabled, flood fill starts from the viewport edges
        and marks all reachable spaces as transparent edges. Spaces that can't be reached (like inner holes)
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
