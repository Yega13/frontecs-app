# Frontecs — Visual Website Editor

Upload any static site ZIP → inject the editor → download → deploy anywhere.
No frameworks required. No cloud lock-in. Runs on a tiny Node server included in the output.

---

## How It Works

1. **Upload** your static site as a `.zip` file (HTML, CSS, JS, images — anything)
2. **Preview** the file tree
3. **Download** a new ZIP with the Frontecs editor injected
4. **Deploy** the output to any Node-capable host (Railway, Render, VPS, etc.)
5. **Open** `yoursite.com/__edit__/{secretKey}` to enter edit mode
6. **Edit** visually, save, and changes persist via Supabase

---

## Dev Setup

```bash
cd frontecs-app
npm install
npm run dev
```

Open `http://localhost:5173`, upload a ZIP, process, and download the output.

---

## Bottom Bar (visible in edit mode)

| Button | Position | Action |
|--------|----------|--------|
| **History** | Bottom left | Open/close the undo history panel |
| **Reorder** | Bottom left (next) | Toggle section drag-to-reorder mode |
| **Edit Mode** | Bottom center (bigger) | Shows you're in edit mode — click to open exit dialog |
| **Save** | Bottom right | Manually save all changes (Ctrl+S also works) |

---

## Exit Dialog

Clicking **Edit Mode** opens a custom exit dialog (no browser alert) with three options:
- **Save & Exit** — saves first, then returns to normal view
- **Exit Without Saving** — discards unsaved changes and exits
- **Keep Editing** — closes the dialog, stays in edit mode

---

## Text Editing

- **Click any text element** to make it editable (contentEditable)
- A formatting toolbar appears above the selected element
- **Bold** (Ctrl+B), **Italic** (Ctrl+I), **Underline** (Ctrl+U)
- **Text color** — color picker
- **Font size** — 10px to 72px dropdown
- **Font family** — system fonts + Google Fonts (auto-loaded on first use, persisted)
  - System: Arial, Georgia, Times New Roman, Verdana, Courier New, Trebuchet MS, Impact, Tahoma
  - Google: Roboto, Open Sans, Lato, Montserrat, Poppins, Playfair Display, Raleway, Oswald, Merriweather, Nunito, Inter, DM Sans, Bebas Neue
- **Delete element** — trash icon in toolbar hides the element (cross-page synced, undoable)
- Click outside or press **Escape** to deselect

---

## Image Editing

Click any image to open the image overlay:

- **Replace** — pick a new image file; auto-resized to max 1920px, saved as WebP/JPEG
- **Video URL** — replace image with an `<video autoplay muted loop>` element using any hosted video URL
- **Width input** — type an exact pixel width, press ✓ or Enter to apply
- **Drag corners** — four resize handles appear; drag any corner to resize proportionally
- **Delete** — hides the image (cross-page synced, undoable)
- Width input updates live while dragging corners

---

## Link Editing

- Click any link → a popup appears below it
- Edit the URL, press **Save** or Enter to confirm
- Press Escape to cancel

---

## SEO Editor

- Click **SEO** in the text toolbar
- Editable: **Page Title**, **Meta Description**, **OG Title**, **OG Description**
- Changes apply to the current page immediately and sync everywhere

---

## Section Reorder

- Click **Reorder** (bottom left) to enter reorder mode
- A green dashed bar appears at the top of each detected section
- **Drag sections up or down** to reorder the page layout
- Drop indicators (green border) show where the section will land
- Click **Reorder** again to exit, or press Escape
- Order is saved and applied cross-page on every load

Sections are detected automatically: top-level `<div>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<nav>`, `<aside>`, `<main>` elements inside the page's main container (height > 20px).

---

## Undo History Panel

- Click **History** (bottom left) to open the panel
- Shows all edits in reverse order (newest first)
- **◀ now** marker shows your current position in history
- **Click any entry** to jump to that point (undo or redo as needed)
- **Clear** button wipes the in-session history
- Up to 50 entries stored per session
- Keyboard: **Ctrl+Z** (undo), **Ctrl+Y** / **Ctrl+Shift+Z** (redo)

Edit type colors in history:

| Color | Type |
|-------|------|
| Indigo | Text edited |
| Purple | Image replaced |
| Violet | Video set |
| Orange | Link changed |
| Cyan | Image resized |
| Red | Element deleted |
| Green | Sections reordered |
| Amber | SEO updated |

---

## Cross-Page Sync

All edits store a CSS selector that identifies the edited element. On every page load, the editor re-applies all saved edits. This means text changes, image replacements, link edits, resizes, deletions, video replacements, font changes, and section reorders all appear automatically on every page that contains a matching element.

---

## Auto-Save

- Changes auto-save **600ms** after the last edit (debounced)
- Save indicator appears above the Save button: Saving… → Saved ✓ → or Save failed
- **Ctrl+S** triggers immediate save
- Closing the tab with unsaved changes triggers a browser warning
- Tab going to background (visibilitychange) auto-saves

---

## Flash Prevention

The server injects `<style id="__fe_hide__">html{visibility:hidden!important}</style>` as the first thing in `<head>`. The editor script removes it synchronously after applying all saved edits — the page only becomes visible once edits are already in place, with no flash of original content. A 2500ms CSS fallback handles edge cases where the editor script fails to load.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Shift+Z | Redo |
| Escape | Cancel current edit / close panels |
| Ctrl+B | Bold (while editing text) |
| Ctrl+I | Italic (while editing text) |
| Ctrl+U | Underline (while editing text) |

---

## Output ZIP Structure

```
/
├── index.html              ← original HTML with editor injected before </body>
├── [other pages].html
├── [original assets]
├── __editor__/
│   ├── editor.js           ← editor IIFE (vanilla JS, zero dependencies)
│   ├── editor.css          ← editor styles (all selectors namespaced with #__fe_*__)
│   └── config.json         ← { secretKey, siteId }
├── server.js               ← Express server
├── package.json
└── edits.json              ← local fallback (Supabase is primary storage)
```

---

## Server API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/edits` | GET | Returns saved edits + SEO from Supabase |
| `/api/save` | POST | Saves edits + SEO to Supabase (requires secretKey) |
| `/*` (HTML routes) | GET | Serves HTML with edits pre-injected (flash prevention) |
| `/*` (assets) | GET | Static file serving |

`server.js`, `package.json`, `edits.json` are blocked from public HTTP access (403).

---

## Storage (Supabase)

Edits are stored in a `site_edits` table:

```sql
site_id  text   -- unique per processed ZIP
edits    jsonb  -- array of edit objects { type, selector, before, after }
seo      jsonb  -- { title, description, ogTitle, ogDescription, _fonts[] }
```

`edits.json` in the output ZIP serves as a fallback if Supabase is unavailable.

---

## Security

- Edit mode requires the `secretKey` (32-char hex, random per ZIP)
- Validated server-side on every `/api/save` call
- Invalid keys show a full-screen blocking error
- Sessions stored in `sessionStorage` (cleared when user exits edit mode)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontecs app (local) | React + Vite |
| Editor (injected) | Vanilla JS IIFE, zero dependencies |
| Server (in output ZIP) | Express (~130 lines) |
| Storage | Supabase (PostgreSQL) |
| Image processing | Canvas API (WebP/JPEG, max 1920px) |
| Fonts | Google Fonts API (on-demand, persisted) |