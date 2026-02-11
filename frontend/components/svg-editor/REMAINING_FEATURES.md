# SVG Editor - Remaining Features (Optimized Implementation Plan)

## ✅ COMPLETED (Phases 1-2)
- Selection, resize handles, move, delete, duplicate
- Layers panel, z-index controls, properties panel
- Undo/Redo, snap to grid, keyboard shortcuts
- Zoom/Pan/Fit, clean SVG export
- Multi-select, alignment, distribute, group/ungroup

---

## 🚀 QUICK WINS (High Impact, Fast Implementation)

### Group A: Export & Import (2-3 hours)
**Why first:** Users need these immediately. Simple, isolated features.

1. **PNG Export (1x/2x/4x)** ⚡
   - Use existing `exportToSvg()` → Canvas → PNG
   - Add export dropdown: SVG | PNG 1x | PNG 2x | PNG 4x
   - File: `services/svgEditorExport.ts` (add `exportToImage` function)
   - UI: Update export panel in `SvgEditor.tsx`

2. **SVG Import (Basic)** ⚡
   - Parse SVG string → `SvgEditorData`
   - Support: rect, circle, ellipse, line, path, polygon, text
   - File: `services/svgEditorImport.ts` (new)
   - Hook: Add `onImport` prop to `SvgEditorProps`

3. **Copy SVG to Clipboard** ⚡
   - Button in export panel
   - `navigator.clipboard.writeText(svgString)`

### Group B: Lock Layers (1 hour)
**Why now:** Field exists, just needs UI + behavior.

4. **Lock Layer UI & Behavior** ⚡
   - Add lock icon to LayersPanel (next to visibility)
   - Prevent selection/move/resize when layer locked
   - Update hit testing to skip locked layers
   - File: `components/SvgEditorLayersPanel.tsx`

### Group C: Component Props Enhancement (1 hour)
**Why now:** Makes editor truly reusable without breaking changes.

5. **Enhanced Props** ⚡
   - Add `mode?: 'logo' | 'generic'` (affects presets/toolbar)
   - Add `readOnly?: boolean` (disable all editing)
   - Add `initialTool?: Tool` (set starting tool)
   - Add `onExportSvg?: (svg: string) => void` (separate from onSave)
   - File: `types/svgEditor.types.ts` + `SvgEditor.tsx`

---

## 🏗️ FOUNDATION WORK (Enables Other Features)

### Group D: Path Editing Foundation (4-5 hours)
**Why now:** Needed for bezier handles and boolean ops.

6. **Enhanced Path Point Editing** 🔧
   - Make path points draggable (currently visible but not interactive)
   - Update path `d` attribute when points move
   - Store path as editable structure (not just string)
   - Files: 
     - `types/svgEditor.types.ts` (enhance PathPoint with handles)
     - `services/svgEditorUtils.ts` (path manipulation functions)
     - `SvgEditor.tsx` (path point drag handlers)

7. **Path Data Structure** 🔧
   - Convert `d` string ↔ editable path structure
   - Support: M, L, C (cubic bezier), Q (quadratic bezier)
   - Cache: bbox, point count, segment types
   - File: `services/svgEditorPathUtils.ts` (new)

### Group E: Artboards/Canvas Presets (2-3 hours)
**Why now:** Common logo sizes, improves UX.

8. **Canvas Presets** 🔧
   - Preset dropdown: 512x512, 1024x1024, 1920x1080, Custom
   - Background color/transparent toggle
   - Update viewport when preset changes
   - File: `components/SvgEditorCanvasPresets.tsx` (new)
   - UI: Add to toolbar or properties panel

---

## 🎨 ADVANCED FEATURES (Phase 3 Completion)

### Group F: Bezier Handles (6-8 hours)
**Why later:** Requires path editing foundation.

9. **Bezier Handle Rendering** 🎨
   - Show handles for selected path points
   - Handle types: smooth (mirrored) vs corner (independent)
   - Visual: lines from point to handles, handle circles
   - File: `components/SvgEditorCanvas.tsx` (render handles)

10. **Bezier Handle Interaction** 🎨
    - Drag handles to adjust curves
    - Toggle smooth/corner mode (double-click or button)
    - Update path data in real-time
    - File: `SvgEditor.tsx` (handle drag logic)

### Group G: Boolean Operations (8-10 hours)
**Why later:** Complex geometry, can use library if available.

11. **Boolean Ops (Union/Subtract MVP)** 🎨
    - Union: combine two paths into one
    - Subtract: remove one path from another
    - UI: Context menu or toolbar button (when 2+ paths selected)
    - Implementation: Use `paper.js` or `clipper-lib` if in repo, else simple MVP
    - File: `services/svgEditorBooleanOps.ts` (new)

12. **Stroke to Outline** 🎨
    - Convert stroked shape → filled outline path
    - Apply to: rect, circle, ellipse, line, polygon
    - Use path offset algorithm (simplified for MVP)
    - File: `services/svgEditorPathUtils.ts` (add function)

---

## 📱 MOBILE-FIRST UI (Phase 5)

### Group H: Mobile Layout (8-10 hours)
**Why later:** Major UI overhaul, needs careful planning.

13. **Responsive Layout System** 📱
    - Bottom tool dock (mobile)
    - Left toolbar (desktop)
    - Collapsible property sheet
    - Layers drawer (slide-in)
    - File: `components/SvgEditorMobileLayout.tsx` (new)
    - File: `components/SvgEditorDesktopLayout.tsx` (new)

14. **Mobile Gestures** 📱
    - Pinch zoom (touch events)
    - 2-finger pan
    - Long-press context menu
    - File: `hooks/useSvgEditorMobileGestures.ts` (new)

15. **Desktop View Mode (Mobile)** 📱
    - Toggle button: "Desktop View"
    - Constrained min-width container
    - Scrollable canvas
    - File: `SvgEditor.tsx` (add view mode state)

---

## 🗄️ CREATOR LIBRARY (Phase 6)

### Group I: Asset Management (10-12 hours)
**Why last:** Requires backend integration, separate from editor core.

16. **Creator Library UI** 🗄️
    - Grid view of saved logos
    - Thumbnail generation (SVG → canvas → image)
    - Search + sort (recent, name)
    - File: `components/SvgEditorLibrary.tsx` (new)

17. **Save Asset** 🗄️
    - Save dialog: name, visibility (private/org/public)
    - Member selection (if org visibility)
    - Generate preview thumbnail
    - File: `services/svgEditorAssetService.ts` (new)
    - Backend: API endpoint for asset CRUD

18. **Load Asset** 🗄️
    - Click thumbnail → load into editor
    - Update `initialData` prop
    - File: Integration in parent component

---

## 📊 IMPLEMENTATION PRIORITY MATRIX

### Sprint 1: Quick Wins (4-5 hours)
- ✅ PNG Export
- ✅ SVG Import (basic)
- ✅ Copy to Clipboard
- ✅ Lock Layers
- ✅ Enhanced Props

**Impact:** High | **Effort:** Low | **Dependencies:** None

### Sprint 2: Foundation (6-8 hours)
- ✅ Path Editing Foundation
- ✅ Path Data Structure
- ✅ Canvas Presets

**Impact:** Medium | **Effort:** Medium | **Dependencies:** None

### Sprint 3: Advanced Path (14-18 hours)
- ✅ Bezier Handles (rendering + interaction)
- ✅ Boolean Ops (Union/Subtract)
- ✅ Stroke to Outline

**Impact:** High | **Effort:** High | **Dependencies:** Sprint 2

### Sprint 4: Mobile UX (8-10 hours)
- ✅ Responsive Layout
- ✅ Mobile Gestures
- ✅ Desktop View Mode

**Impact:** High | **Effort:** Medium | **Dependencies:** None

### Sprint 5: Creator Library (10-12 hours)
- ✅ Library UI
- ✅ Save/Load Assets
- ✅ Backend Integration

**Impact:** Medium | **Effort:** High | **Dependencies:** Backend API

---

## 🎯 RECOMMENDED ORDER

**Week 1:** Sprint 1 (Quick Wins) → Immediate user value
**Week 2:** Sprint 2 (Foundation) → Enables advanced features
**Week 3:** Sprint 3 (Advanced Path) → Logo creation power
**Week 4:** Sprint 4 (Mobile) → Broader accessibility
**Week 5:** Sprint 5 (Library) → Asset management

**Total Estimated Time:** 42-55 hours

---

## 📝 NOTES

- **Boolean Ops:** No geometry libraries found in `package.json`. Implement simple MVP for basic shapes (rect, circle, ellipse) first. Can add library later if needed.
- **Mobile Gestures:** Use `react-use-gesture` or native touch events (lighter).
- **Creator Library:** Can be separate component that wraps `SvgEditor` - keeps editor core clean.
- **Path Editing:** Start with linear paths (M, L), then add bezier support incrementally.
