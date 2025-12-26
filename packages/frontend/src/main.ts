/**
 * ASCII Art Studio Frontend
 * Interactive showcase and playground
 */

import { renderBasicLayeringDemo } from './demos/basic-layering';
import { renderInfluenceExplorerDemo } from './demos/influence-explorer';
import { renderGlassPaneDemo } from './demos/glass-pane';
import { renderAnimationDemo } from './demos/animation';

// Demo registry
const demos = [
  { id: 'basic-layering', title: 'Basic Layering' },
  { id: 'influence-explorer', title: 'Influence Explorer' },
  { id: 'glass-pane', title: 'Glass Pane Effect' },
  { id: 'animation', title: 'Animation' },
  { id: 'flip-transform', title: 'Flip & Transform' },
  { id: 'auto-edge', title: 'Auto-Edge Detection' },
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
    if (id === 'basic-layering') {
      body.innerHTML = renderBasicLayeringDemo();
    } else if (id === 'influence-explorer') {
      body.innerHTML = renderInfluenceExplorerDemo();
    } else if (id === 'glass-pane') {
      body.innerHTML = renderGlassPaneDemo();
    } else if (id === 'animation') {
      body.innerHTML = renderAnimationDemo();
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
