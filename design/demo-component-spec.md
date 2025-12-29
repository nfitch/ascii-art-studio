# Demo Component Specification

## Overview

The Demo component is the primary interactive demonstration for ASCII Art Studio. It showcases the full capabilities of the Compositor with an interactive 400×400 character world featuring full-screen mode, zoom, scroll, and animation controls.

## Purpose

- Serve as the main entry point and showcase for ASCII Art Studio
- Demonstrate all major Compositor features in a single interactive demo
- Provide an engaging user experience with smooth animations and responsive controls
- Act as a playground for users to experiment with ASCII art composition

## Component Location

- **File:** `/Users/nate/projects/ascii-art-studio/packages/frontend/src/demos/demo.ts`
- **Navigation:** Top-level nav item above "Compositor Demos" section
- **Route:** Triggered by `selectDemo('demo')`

## Features

### 1. 400×400 Character World

The demo operates in a fixed 400×400 character world coordinate system:

- **Boundary Box:** Drawn using double-line Unicode box characters (╔╗╚╝║═)
- **Rendering Layer:** Boundary box renders at layer -1 (below all objects)
- **Position:** Boundary positioned at world coordinates (0, 0)
- **Object Movement:** Objects bounce off inner edges at x/y = 1 and x/y = 399

#### Boundary Box Implementation

```typescript
function generateBoundaryBox(width: number, height: number): (string | null)[][] {
  // Creates 2D array with:
  // - Corners: ╔ (top-left), ╗ (top-right), ╚ (bottom-left), ╝ (bottom-right)
  // - Edges: ═ (horizontal), ║ (vertical)
  // - Interior: null (transparent)
}
```

The boundary is a compositor object, not an HTML border, ensuring it's part of the world coordinate system.

### 2. Full Screen Mode

Toggle between normal (content-body) and full-screen (entire browser window) modes.

#### Implementation

**CSS Approach:**
```css
body.fullscreen header { display: none; }
body.fullscreen #sidebar { display: none; }
body.fullscreen #content { width: 100vw; height: 100vh; }
body.fullscreen #content-body { padding: 0; height: 100vh; overflow: hidden; }
```

**Toggle Logic:**
1. Add/remove 'fullscreen' class on body element
2. Recalculate viewport size for new container dimensions
3. Clamp viewport position to new boundaries
4. Update display

**Button:**
- Normal mode: [▢] - Click to enter fullscreen
- Fullscreen mode: [×] - Click to exit fullscreen
- Tooltip: "Toggle full screen"

### 3. Zoom System

Adjust font size to zoom in/out of the ASCII art.

#### Configuration

- **Base Font Size:** 12pt (Courier New)
- **Zoom Range:** -5 to +10 (7pt to 22pt)
- **Increment:** ±1pt per button click
- **World Size:** Remains 400×400 characters
- **Effect:** Changes character pixel dimensions, not world dimensions

#### Implementation

```typescript
const currentFontSize = baseFontSize + zoomLevel; // 12pt + zoomLevel
style="font-size: ${currentFontSize}pt"
```

**Viewport Recalculation:**
When zoom level changes:
1. Measure new character pixel dimensions
2. Calculate new viewport character count based on container size
3. Clamp viewport position to stay within world boundaries

**Controls:**
- [+] button: Zoom in (increase font size)
- [-] button: Zoom out (decrease font size)
- Current font size display (e.g., "12pt")
- Buttons disabled at limits
- Tooltips: "Zoom in (+1pt)", "Zoom out (-1pt)"

### 4. Viewport and Scrolling System

The viewport shows a portion of the 400×400 world, controlled by scroll buttons.

#### World vs Viewport Coordinates

- **World:** Fixed 400×400 character space
- **Viewport:** Variable size window into the world
- **Viewport Position:** (viewportX, viewportY) - top-left corner in world coordinates
- **Viewport Size:** Calculated dynamically based on container size and font size

#### Viewport Size Calculation

```typescript
function calculateViewportSize(): { width: number; height: number } {
  const currentFontSize = baseFontSize + zoomLevel;
  const { width: charWidth, height: charHeight } = measureCharacterDimensions(currentFontSize);

  const availableWidth = container.clientWidth;
  const availableHeight = container.clientHeight;

  const width = Math.min(400, Math.floor(availableWidth / charWidth));
  const height = Math.min(400, Math.floor(availableHeight / charHeight));

  return { width, height };
}
```

#### Scroll Controls

Each scroll button pans the viewport by 1 character:

- [<] Left: Decrease viewportX by 1
- [>] Right: Increase viewportX by 1
- [^] Up: Decrease viewportY by 1
- [v] Down: Increase viewportY by 1

**Boundaries:**
- viewportX: [0, max(0, 400 - viewportWidth)]
- viewportY: [0, max(0, 400 - viewportHeight)]

**Button States:**
- Disabled when at edge of world
- Tooltips: "Pan left 1 char", "Pan right 1 char", "Pan up 1 char", "Pan down 1 char"

#### Rendering with Viewport

```typescript
const output = compositor.render({
  x: viewportX,
  y: viewportY,
  width: viewportWidth,
  height: viewportHeight
});
```

### 5. Animation System

Objects move smoothly across the 400×400 world, bouncing off the boundary box edges.

#### Animated Objects

**AnimatedObject Interface:**
```typescript
interface AnimatedObject {
  id: string;              // Unique identifier
  x: number;               // X position (floating point)
  y: number;               // Y position (floating point)
  dx: number;              // X velocity (normalized -1 to 1)
  dy: number;              // Y velocity (normalized -1 to 1)
  size: number;            // Object dimensions
  shape: Shape;            // 'square' | 'circle' | 'triangle' | 'hollow-circle'
  influenceRadius: number; // Proximity effect radius (3-7)
  layer: number;           // Rendering layer (0-20)
}
```

#### Movement Algorithm

**Animation Step:**
```typescript
function animationStep() {
  objects.forEach((obj) => {
    obj.x += obj.dx;
    obj.y += obj.dy;

    // Bounce off inner edges of boundary box
    if (obj.x < 1 || obj.x + obj.size > 399) {
      obj.dx = -obj.dx;
      obj.x += obj.dx * 2; // Correct position back into bounds
    }
    if (obj.y < 1 || obj.y + obj.size > 399) {
      obj.dy = -obj.dy;
      obj.y += obj.dy * 2;
    }
  });

  updateCompositor();
  updateDisplay();
}
```

**Key Points:**
- Objects bounce at world coordinates 1 and 399 (inside the boundary)
- Velocity vectors are normalized (unit vectors from random angles)
- Movement is continuous with floating-point positions
- Positions rounded to integers when rendering

#### Shape Generation

Four shape types with different size ranges:

**Square (3-6 chars):**
- Solid rectangle of characters

**Circle (3-6 chars):**
- Distance-based circular shape
- Uses `Math.sqrt(dx² + dy²) <= radius`

**Triangle (3 or 5 chars):**
- Apex at top, expands downward
- Only odd sizes for symmetry
- Height = Math.ceil((size + 1) / 2)

**Hollow Circle (6-10 chars):**
- Outer radius boundary with inner transparent ring
- `outerRadius - innerRadius = 1.5`

#### Random Object Creation

```typescript
function addRandomObject() {
  influenceRadius = random(3, 7);
  shape = random(['square', 'circle', 'triangle', 'hollow-circle']);
  size = shapeSpecificSize(shape);
  position = random within world boundaries;
  angle = random(0, 2π);
  dx = cos(angle);
  dy = sin(angle);
  layer = random(0, 20);
}
```

#### Animation Controls

**[▷] Play:**
- Starts animation interval at current speed
- Disabled when playing
- Tooltip: "Play"

**[⏸] Pause:**
- Stops animation interval
- Disabled when paused
- Tooltip: "Pause"

**[⪢] Step Forward:**
- Advances one frame
- Disabled when playing
- Tooltip: "Step forward"

**[⊕] Add Random Object:**
- Creates new object with random properties
- Always enabled
- Tooltip: "Add random object"

**[⊖] Remove Random Object:**
- Removes random object from scene
- Disabled when no objects
- Tooltip: "Remove random object"

**Speed Control:**
- Number input (50-2000ms)
- Updates interval if currently playing
- Label: "Speed: [____]ms"

**Object Counter:**
- Displays current object count
- Label: "Objects: N"

### 6. Control Bar Specification

The control bar is organized into 5 logical groups:

```
[▢] | Zoom: [+][-] 12pt | Scroll: [<][>][^][v] | Animation: [▷][⏸][⪢][⊕][⊖] | Speed: [200]ms Objects: 3
```

**Layout:**
- Horizontal flex layout
- Groups separated visually
- Labels for clarity
- Consistent button sizing
- Tooltips on all buttons

**Styling:**
- Background: #f8f8f8
- Border: 1px solid #2a2a2a
- Padding: 1rem
- Margin bottom: 2rem

## State Management

### Module-Level State

All state is stored in module-level variables:

```typescript
let compositor: Compositor;
let objects: AnimatedObject[] = [];
let nextId = 0;
let animationInterval: number | null = null;
let isPlaying = false;
let speed = 200;
let isFullscreen = false;
let baseFontSize = 12;
let zoomLevel = 0;
let viewportX = 0;
let viewportY = 0;
let viewportWidth = 80;
let viewportHeight = 40;
```

### State Reset Behavior

State resets when:
- Browser refreshed
- User navigates away from Demo and returns
- Page reloaded

**No Persistence:**
- No localStorage
- No cookies
- No URL parameters
- Fresh state on each `renderDemoDemo()` call

### Initial State

When demo loads:
- 3 random objects spawned
- Viewport at (0, 0)
- Zoom level 0 (12pt font)
- Not fullscreen
- Animation paused

## Rendering Pipeline

### Display Update Flow

```
User Action
  ↓
Update State
  ↓
updateCompositor() - Add/remove/update objects
  ↓
Compositor.render(viewport) - Calculate output
  ↓
renderOutput() - Convert to HTML with colors
  ↓
updateDisplay() - Replace content-body innerHTML
  ↓
Browser Re-renders
```

### Output Rendering

```typescript
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
```

**No HTML Borders:**
- Boundary box is part of the compositor output
- Output is pure ASCII with color spans
- Pre-formatted text in .demo-output div

### Performance Considerations

**Compositor Optimization:**
- Viewport caching with dirty region invalidation
- Only re-renders when objects change or viewport moves
- Compositor handles all color blending and layering

**Animation Performance:**
- Fixed interval (not requestAnimationFrame)
- Full re-render each frame (expected for moving objects)
- ~200ms default interval (5 FPS)

**Viewport Recalculation:**
- Only on zoom, fullscreen toggle, or window resize
- Debounced if needed for window resize events

## Technical Details

### Character Dimension Measurement

```typescript
function measureCharacterDimensions(fontSize: number): { width: number; height: number } {
  const temp = document.createElement('pre');
  temp.style.fontFamily = "'Courier New', Courier, monospace";
  temp.style.fontSize = `${fontSize}pt`;
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';
  temp.style.whiteSpace = 'pre';
  temp.style.lineHeight = '1.2';
  temp.textContent = 'X';
  document.body.appendChild(temp);

  const rect = temp.getBoundingClientRect();
  const { width, height } = rect;

  document.body.removeChild(temp);

  return { width, height };
}
```

### Global Function Exports

All control functions attached to window for onclick handlers:

```typescript
(window as any).demoToggleFullscreen
(window as any).demoZoomIn
(window as any).demoZoomOut
(window as any).demoScrollLeft
(window as any).demoScrollRight
(window as any).demoScrollUp
(window as any).demoScrollDown
(window as any).demoAnimationPlay
(window as any).demoAnimationPause
(window as any).demoAnimationStepForward
(window as any).demoAnimationAddRandom
(window as any).demoAnimationRemoveRandom
(window as any).demoSetSpeed
```

### Browser Compatibility

**Required Features:**
- Flexbox (layout)
- Unicode box-drawing characters (boundary)
- CSS classList API (fullscreen toggle)
- window.setInterval (animation)
- getBoundingClientRect (measurement)

**Font Requirements:**
- Courier New must include ╔╗╚╝║═ glyphs
- Monospace font stack as fallback

## Usage Patterns

### Typical User Flow

1. User clicks "Demo" in navigation
2. Demo loads with 3 random objects and boundary box
3. User clicks Play to start animation
4. User zooms in to see objects closer
5. User scrolls to pan around the 400×400 world
6. User toggles fullscreen for immersive experience
7. User adds/removes objects to experiment
8. User adjusts speed to change animation pace

### Edge Cases Handled

**Viewport > World:**
- Viewport clamped to max 400×400
- Centered if container larger than world

**Zoom Limits:**
- Zoom in disabled at +10 (22pt)
- Zoom out disabled at -5 (7pt)

**Scroll Boundaries:**
- Scroll buttons disabled at world edges
- Position clamped to valid range

**Object Count:**
- Remove button disabled when no objects
- No hard limit on object count (performance degrades naturally)

**Fullscreen Transition:**
- Viewport recalculated on toggle
- Position clamped to new viewport size
- Animation continues during transition

## Comparison to Animation Demo

The Demo component reuses patterns from the Animation demo:

**Similarities:**
- AnimatedObject interface
- Shape generation functions
- Movement and collision logic
- Play/pause/step controls
- updateCompositor() pattern

**Differences:**
- **World Size:** 400×400 vs dynamic viewport size
- **Boundary:** Compositor object vs HTML borders
- **Viewport:** Scrollable viewport into world vs fixed viewport
- **Zoom:** Font-size control vs fixed font
- **Full Screen:** Toggle mode vs always in content-body
- **Navigation:** Top-level vs in Compositor Demos section

## Future Enhancements

Potential additions (not currently implemented):

- Save/load object configurations
- Export ASCII art to clipboard
- Custom object creation with user input
- Object selection and editing
- Additional shape types
- Color customization per object
- Background grid or patterns
- Viewport follow mode (camera follows object)
- Performance metrics display
- Touch/gesture support for mobile

## Files Modified

**New Files:**
- `/Users/nate/projects/ascii-art-studio/packages/frontend/src/demos/demo.ts`
- `/Users/nate/projects/ascii-art-studio/design/demo-component-spec.md`

**Modified Files:**
- `/Users/nate/projects/ascii-art-studio/packages/frontend/src/main.ts` (import, routing)
- `/Users/nate/projects/ascii-art-studio/packages/frontend/index.html` (navigation)
- `/Users/nate/projects/ascii-art-studio/packages/frontend/src/style.css` (fullscreen styles)
- `/Users/nate/projects/ascii-art-studio/design/00-index.md` (documentation index)

**Reference Files:**
- `/Users/nate/projects/ascii-art-studio/packages/frontend/src/demos/animation.ts` (patterns reference)
- `/Users/nate/projects/ascii-art-studio/packages/compositor/src/Compositor.ts` (API usage)
