# Phase 6: UI Polish & Branding Implementation Plan

## Goal
To elevate the visual design of the application from a "Prototyping/Default" look to a "Salon/Professional" aesthetic.
Theme Concept: **Simple & Elegant (Clean White, Soft Greige, Muted Accent)**.

## Brand Identity Definition
- **Primary Color**: `Slate-700` (Dark gray for text/accents) -> No, let's go with **Soft Cocoa (`#8D6E63`)** or **Muted Teal (`#546E7A`)**?
    - Let's choose a **"Greige & Navy"** theme.
    - **Primary (Action)**: `#4F46E5` (Indigo) -> **`#5F6F81` (Slate Blue/Grey)** - elegant and neutral.
    - **Secondary**: `#F5F5F0` (Warm White/Beige).
- **Fonts**:
    - **Main**: `Zen Kaku Gothic New` (Clean, modern Japanese sans-serif).
    - **Headings**: `Shippori Mincho` (Elegant serif) for titles.

## Proposed Changes

### 1. Global Styles (`globals.css`)
- [ ] Import Google Fonts (@import url).
- [ ] Define CSS variables for theme colors.
- [ ] Apply fonts to body and headings.

### 2. Login Page (`src/app/login/page.tsx`)
- [ ] Center card layout with a clean, branded look.
- [ ] Add a logo placeholder or stylized text.
- [ ] Soften shadows.

### 3. Admin Dashboard (`src/app/admin/**`)
- [ ] sidebar / navigation styling.
- [ ] Replace `indigo-600` buttons with new branded buttons.
- [ ] Improve table readability (spacing, borders).

### 4. User Profile App (`src/app/app/**`)
- [ ] Mobile-first optimizations.
- [ ] Better "Add Link" button UI (floating action button or clearer block).

## Verification
- Check all pages on Mobile and Desktop view.
- Ensure text is readable and "vibe" matches the request.
