# Claude Context - ascii-art-studio

## CRITICAL: Session Startup - Working Styles

**At the start of every session, you MUST:**

Read `working-styles/README.md` and follow the instructions there.

---

## Project-Specific Instructions

### Project Overview

**ASCII Art Studio** - A modular TypeScript library suite for creating, manipulating, and animating ASCII art in web browsers.

**Current Phase:** Phase 0 - Project Setup and Infrastructure

**Main Checklist:** [design/project-checklist.md](design/project-checklist.md)

### Project Structure

Monorepo with 6 packages:
- `frontend` - HTML showcase and interactive playground (GitHub Pages)
- `compositor` - ASCII compositing module (foundational)
- `animator` - Animation module (depends on compositor)
- `zoom` - ASCII art scaling module (independent)
- `img-to-ascii` - Image to ASCII conversion (independent)
- `draw` - ASCII art drawing tool (independent)

### Technology Stack

- TypeScript (all modules except potentially portions of img-to-ascii)
- npm workspaces for monorepo management
- Vite for building and dev server with hot-reloading
- Vitest for testing
- GitHub Pages for frontend hosting

### Development Workflow

Each major phase follows this pattern:
1. Design Document
2. Deep-dive TypeScript API design
3. Write comprehensive tests against API
4. Implement (TDD - tests first, then implementation)
5. Thoroughly document APIs
6. Build examples in HTML frontend

### Design Documentation

All design documents are in the `design/` directory:
- [design/00-index.md](design/00-index.md) - Documentation index
- [design/01-project-overview.md](design/01-project-overview.md) - Project overview
- [design/02-requirements.md](design/02-requirements.md) - Requirements
- [design/project-checklist.md](design/project-checklist.md) - Main project checklist

**Phase 1 (Compositor):**
- [design/phase-1-compositor-design.md](design/phase-1-compositor-design.md) - Design and architecture
- [design/phase-1-compositor-api.md](design/phase-1-compositor-api.md) - TypeScript API specification

### Critical Rules

1. All modules must be independently usable (except animator depends on compositor)
2. Comprehensive test coverage required for all modules
3. TDD approach - write tests first, then implementation
4. Update design documentation as project evolves
5. Frontend must showcase all capabilities with interactive examples
