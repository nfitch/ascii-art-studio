# ASCII Art Studio

Modular TypeScript libraries for creating, manipulating, and animating ASCII art in web browsers.

https://nfitch.github.io/ascii-art-studio/

Disclaimer: All code writen by https://claude.ai/ .

## Project Structure

This is a monorepo containing the following packages:

- `packages/frontend` - Interactive showcase and playground (GitHub Pages)
- `packages/compositor` - ASCII compositing module (foundational)
- `packages/animator` - Animation module (depends on compositor)
- `packages/zoom` - ASCII art scaling module (independent)
- `packages/img-to-ascii` - Image to ASCII conversion (independent)
- `packages/draw` - ASCII art drawing tool (independent)

## Setup

```bash
# Install dependencies
npm install

# Run frontend dev server with hot-reloading
npm run dev

# Build all packages
npm run build

# Run tests
npm test

# Type check
npm run type-check
```

## Development Workflow

See [design/project-checklist.md](design/project-checklist.md) for the full project roadmap.

Each phase follows:
1. Design Document
2. Deep-dive TypeScript API design
3. Comprehensive tests against API
4. Implementation (TDD)
5. Thoroughly document APIs
6. Build examples in frontend

## Documentation

All design documents are in the [design/](design/) directory:
- [design/00-index.md](design/00-index.md) - Documentation index
- [design/01-project-overview.md](design/01-project-overview.md) - Project overview
- [design/02-requirements.md](design/02-requirements.md) - Requirements
- [design/project-checklist.md](design/project-checklist.md) - Main project checklist

## Current Status

**Phase 0: Project Setup and Infrastructure** - ✓ COMPLETE
- Monorepo with npm workspaces
- Vite build tooling with hot-reloading
- Vitest testing framework
- GitHub Pages deployment
- Complete design documentation structure

**Phase 1: ASCII Compositor Module** - ✓ COMPLETE
- Design document with all architectural decisions
- Complete TypeScript API specification
- 87 comprehensive tests (100% passing)
- Full implementation with all features:
  - Stateful scene manager with viewport caching
  - Object management (add, remove, move, flip)
  - Proximity-based influence with gradient falloff
  - Transform types: lighten and darken
  - Glass pane effects with spaces + influence
  - Auto-edge detection with flood fill
- Production-ready, all issues resolved

**Next:** Phase 2 - Animator Module
