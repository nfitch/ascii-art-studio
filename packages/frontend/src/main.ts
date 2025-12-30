/**
 * ASCII Art Studio Frontend
 * Interactive showcase and playground
 */

import { renderDemoDemo } from './demos/demo';
import { renderBasicLayeringDemo } from './demos/basic-layering';
import { renderInfluenceExplorerDemo } from './demos/influence-explorer';
import { renderGlassPaneDemo } from './demos/glass-pane';
import { renderLayerEffectsDemo } from './demos/layer-effects';
import { renderAnimationDemo } from './demos/animation';
import { renderFlipTransformDemo } from './demos/flip-transform';
import { renderEdgeDetectionStaticDemo } from './demos/auto-edge';
import { renderEdgeDetectionDynamicDemo } from './demos/edge-detection-dynamic';

// Demo registry
const demos = [
  { id: 'basic-layering', title: 'Basic Layering' },
  { id: 'influence-explorer', title: 'Influence Explorer' },
  { id: 'glass-pane', title: 'Glass Pane Effect' },
  { id: 'layer-effects', title: 'Layer Effects' },
  { id: 'animation', title: 'Animation' },
  { id: 'flip-transform', title: 'Flip & Transform' },
  { id: 'edge-detection-static', title: 'Edge Detection: Static' },
  { id: 'edge-detection-dynamic', title: 'Edge Detection: Dynamic' },
];

let currentDemo: string | null = null;
let expanded = true;

// Initialize
function init() {
  renderNav();
  showWelcome();
}

// Render navigation
function renderNav() {
  const navItems = document.getElementById('nav-items');
  if (!navItems) return;

  navItems.className = expanded ? 'nav-items' : 'nav-items collapsed';
  navItems.innerHTML = demos
    .map(
      (demo) => `
    <div class="nav-item ${currentDemo === demo.id ? 'selected' : ''}" onclick="selectDemo('${demo.id}')">
      <span class="tree-prefix">-</span>
      <span>${demo.title}</span>
    </div>
  `
    )
    .join('');
}

// Toggle demos section
function toggleDemos() {
  expanded = !expanded;
  const icon = document.getElementById('expand-icon');
  if (icon) {
    icon.textContent = expanded ? '[-]' : '[+]';
  }
  renderNav();
}

// Select demo
function selectDemo(id: string) {
  currentDemo = id;
  renderNav();

  const demo = demos.find((d) => d.id === id);
  if (!demo) return;

  const body = document.getElementById('content-body');

  if (body) {
    // Route to specific demo implementations
    if (id === 'demo') {
      body.innerHTML = renderDemoDemo();
    } else if (id === 'basic-layering') {
      body.innerHTML = renderBasicLayeringDemo();
    } else if (id === 'influence-explorer') {
      body.innerHTML = renderInfluenceExplorerDemo();
    } else if (id === 'glass-pane') {
      body.innerHTML = renderGlassPaneDemo();
    } else if (id === 'layer-effects') {
      body.innerHTML = renderLayerEffectsDemo();
    } else if (id === 'animation') {
      body.innerHTML = renderAnimationDemo();
    } else if (id === 'flip-transform') {
      body.innerHTML = renderFlipTransformDemo();
    } else if (id === 'edge-detection-static') {
      body.innerHTML = renderEdgeDetectionStaticDemo();
    } else if (id === 'edge-detection-dynamic') {
      body.innerHTML = renderEdgeDetectionDynamicDemo();
    } else {
      // Placeholder for other demos
      body.innerHTML = `
        <div class="demo-container">
          <h2>${demo.title}</h2>

          <div class="demo-description">
            Demo: ${demo.title}
          </div>

          <div class="demo-controls">
            <div class="control-group">
              <button>Button 1</button>
              <button>Button 2</button>
            </div>
          </div>

          <div class="demo-output">
Demo output will go here...

####
####
          </div>
        </div>
      `;
    }
  }
}

// Show welcome
function showWelcome() {
  const body = document.getElementById('content-body');

  if (body) {
    body.innerHTML = `
      <div class="welcome">
        <h2>Welcome to ASCII Art Studio</h2>
        <p>Select a demo from the left to get started.</p>
      </div>
    `;
  }
}

// Make functions globally accessible
(window as any).toggleDemos = toggleDemos;
(window as any).selectDemo = selectDemo;

init();
console.log('ASCII Art Studio - Frontend loaded');
