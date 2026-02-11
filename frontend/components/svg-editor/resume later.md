# SVG Editor - Resume Later (Remaining Features)

**Last Updated:** Current Assessment  
**Status:** Sprint 1 Complete ✅ | Sprint 2-5 Remaining

---

## ✅ COMPLETED (Sprint 1: Quick Wins)

1. ✅ **PNG Export (1x/2x/4x)**
   - `exportToImage()` function in `services/svgEditorExport.ts`
   - Export buttons in export panel (1x, 2x, 4x scales)
   - Status: **COMPLETE**

2. ✅ **SVG Import (Basic)**
   - `importFromSvg()` function in `services/svgEditorImport.ts`
   - Supports: rect, circle, ellipse, line, path, polygon, text
   - Integrated in `SvgEditor.tsx` via `processedInitialData`
   - Status: **COMPLETE**

3. ✅ **Copy SVG to Clipboard**
   - Button in export panel
   - Uses `navigator.clipboard.writeText()`
   - Status: **COMPLETE**

4. ✅ **Lock Layers**
   - Lock icon button in `SvgEditorLayersPanel.tsx`
   - Prevents selection/move/resize when layer locked
   - Checked in `handleMouseDown`, resize, and drag handlers
   - Status: **COMPLETE**

5. ✅ **Enhanced Props**
   - `mode?: 'logo' | 'generic'` - Added to types and component
   - `readOnly?: boolean` - Disables all interactions
   - `initialTool?: Tool` - Sets starting tool on mount
   - `onExportSvg?: (svg: string) => void` - Separate export callback
   - Status: **COMPLETE**

---

## 🚧 REMAINING FEATURES (13 Items)

### 🏗️ SPRINT 2: Foundation Work (6-8 hours)

**Priority:** HIGH - Enables advanced path features

#### 6. Enhanced Path Point Editing
- **Status:** NOT STARTED
- **What's needed:**
  - Make path points draggable (currently visible but not interactive)
  - Update path `d` attribute when points move
  - Store path as editable structure (not just string)
- **Files to modify:**
  - `types/svgEditor.types.ts` - Enhance `PathPoint` with handles
  - `services/svgEditorUtils.ts` - Add path manipulation functions
  - `SvgEditor.tsx` - Add path point drag handlers
  - `components/SvgEditorCanvas.tsx` - Make path points interactive
- **Estimated time:** 2-3 hours

#### 7. Path Data Structure
- **Status:** NOT STARTED
- **What's needed:**
  - Convert `d` string ↔ editable path structure
  - Support: M (move), L (line), C (cubic bezier), Q (quadratic bezier)
  - Cache: bbox, point count, segment types
  - Parse and serialize path data
- **Files to create/modify:**
  - `services/svgEditorPathUtils.ts` (NEW) - Path parsing/serialization
  - `types/svgEditor.types.ts` - Add `EditablePath` interface
  - `SvgEditor.tsx` - Use editable path structure
- **Estimated time:** 2-3 hours

#### 8. Canvas Presets
- **Status:** NOT STARTED
- **What's needed:**
  - Preset dropdown: 512x512, 1024x1024, 1920x1080, Custom
  - Background color/transparent toggle
  - Update viewport when preset changes
- **Files to create/modify:**
  - `components/SvgEditorCanvasPresets.tsx` (NEW)
  - `SvgEditor.tsx` - Integrate preset selector
  - `types/svgEditor.types.ts` - Add canvas preset type
- **Estimated time:** 2 hours

---

### 🎨 SPRINT 3: Advanced Path Features (14-18 hours)

**Priority:** HIGH - Core logo creation power (requires Sprint 2)

#### 9. Bezier Handle Rendering
- **Status:** NOT STARTED
- **What's needed:**
  - Show handles for selected path points
  - Handle types: smooth (mirrored) vs corner (independent)
  - Visual: lines from point to handles, handle circles
- **Files to modify:**
  - `components/SvgEditorCanvas.tsx` - Render bezier handles
  - `types/svgEditor.types.ts` - Add handle data structure
- **Estimated time:** 3-4 hours

#### 10. Bezier Handle Interaction
- **Status:** NOT STARTED
- **What's needed:**
  - Drag handles to adjust curves
  - Toggle smooth/corner mode (double-click or button)
  - Update path data in real-time
- **Files to modify:**
  - `SvgEditor.tsx` - Handle drag logic
  - `components/SvgEditorCanvas.tsx` - Handle hit testing
  - `services/svgEditorPathUtils.ts` - Update path with handle positions
- **Estimated time:** 3-4 hours

#### 11. Boolean Operations (Union/Subtract MVP)
- **Status:** NOT STARTED
- **What's needed:**
  - Union: combine two paths into one
  - Subtract: remove one path from another
  - UI: Context menu or toolbar button (when 2+ paths selected)
- **Files to create/modify:**
  - `services/svgEditorBooleanOps.ts` (NEW) - Boolean operations
  - `SvgEditor.tsx` - Add boolean ops UI and handlers
  - **Note:** May need geometry library (paper.js, clipper-lib) or simple MVP
- **Estimated time:** 4-5 hours

#### 12. Stroke to Outline
- **Status:** NOT STARTED
- **What's needed:**
  - Convert stroked shape → filled outline path
  - Apply to: rect, circle, ellipse, line, polygon
  - Use path offset algorithm (simplified for MVP)
- **Files to modify:**
  - `services/svgEditorPathUtils.ts` - Add `strokeToOutline()` function
  - `SvgEditor.tsx` - Add "Convert to Path" button in properties panel
- **Estimated time:** 2-3 hours

---

### 📱 SPRINT 4: Mobile UX (8-10 hours)

**Priority:** MEDIUM - Broader accessibility (independent work)

#### 13. Responsive Layout System
- **Status:** NOT STARTED
- **What's needed:**
  - Bottom tool dock (mobile)
  - Left toolbar (desktop)
  - Collapsible property sheet
  - Layers drawer (slide-in)
- **Files to create/modify:**
  - `components/SvgEditorMobileLayout.tsx` (NEW)
  - `components/SvgEditorDesktopLayout.tsx` (NEW)
  - `SvgEditor.tsx` - Use responsive layout components
- **Estimated time:** 4-5 hours

#### 14. Mobile Gestures
- **Status:** NOT STARTED
- **What's needed:**
  - Pinch zoom (touch events)
  - 2-finger pan
  - Long-press context menu
- **Files to create/modify:**
  - `hooks/useSvgEditorMobileGestures.ts` (NEW)
  - `SvgEditor.tsx` - Integrate mobile gestures hook
- **Estimated time:** 2-3 hours

#### 15. Desktop View Mode (Mobile)
- **Status:** NOT STARTED
- **What's needed:**
  - Toggle button: "Desktop View"
  - Constrained min-width container
  - Scrollable canvas
- **Files to modify:**
  - `SvgEditor.tsx` - Add view mode state and toggle
  - `components/SvgEditorMobileLayout.tsx` - Add desktop view toggle
- **Estimated time:** 2 hours

---

### 🗄️ SPRINT 5: Creator Library (10-12 hours)

**Priority:** LOW - Requires backend integration (separate from editor core)

#### 16. Creator Library UI
- **Status:** NOT STARTED
- **What's needed:**
  - Grid view of saved logos
  - Thumbnail generation (SVG → canvas → image)
  - Search + sort (recent, name)
- **Files to create:**
  - `components/SvgEditorLibrary.tsx` (NEW)
  - `services/svgEditorThumbnail.ts` (NEW) - Thumbnail generation
- **Estimated time:** 4-5 hours

#### 17. Save Asset
- **Status:** NOT STARTED
- **What's needed:**
  - Save dialog: name, visibility (private/org/public)
  - Member selection (if org visibility)
  - Generate preview thumbnail
  - Backend: API endpoint for asset CRUD
- **Files to create/modify:**
  - `services/svgEditorAssetService.ts` (NEW)
  - `components/SvgEditorSaveDialog.tsx` (NEW)
  - Backend API integration
- **Estimated time:** 3-4 hours

#### 18. Load Asset
- **Status:** NOT STARTED
- **What's needed:**
  - Click thumbnail → load into editor
  - Update `initialData` prop
- **Files to modify:**
  - `components/SvgEditorLibrary.tsx` - Add load handler
  - Parent component integration
- **Estimated time:** 2-3 hours

---

## 📊 IMPLEMENTATION SUMMARY

### Completed
- **Sprint 1:** 5/5 items ✅ (4-5 hours)
  - PNG Export (1x/2x/4x)
  - SVG Import (Basic)
  - Copy SVG to Clipboard
  - Lock Layers
  - Enhanced Props

### Remaining
- **Sprint 2:** 0/3 items (6-8 hours)
- **Sprint 3:** 0/4 items (14-18 hours)
- **Sprint 4:** 0/3 items (8-10 hours)
- **Sprint 5:** 0/3 items (10-12 hours)

**Total Remaining:** 13 items, 38-48 hours

---

## 🎯 RECOMMENDED IMPLEMENTATION ORDER

### Next Steps (Priority Order)

1. **Sprint 2: Foundation** (6-8 hours)
   - Enables Sprint 3 features
   - Improves path editing UX
   - Adds canvas presets for common sizes

2. **Sprint 3: Advanced Path** (14-18 hours)
   - Core logo creation power
   - Bezier handles for precise curves
   - Boolean ops for complex shapes

3. **Sprint 4: Mobile UX** (8-10 hours)
   - Broader accessibility
   - Can be done in parallel with Sprint 5

4. **Sprint 5: Creator Library** (10-12 hours)
   - Requires backend API
   - Separate from editor core
   - Can be done in parallel with Sprint 4

---

## 📝 NOTES

- **Path Editing:** Start with linear paths (M, L), then add bezier support incrementally
- **Boolean Ops:** No geometry libraries found in `package.json`. Implement simple MVP for basic shapes (rect, circle, ellipse) first. Can add library later if needed.
- **Mobile Gestures:** Use `react-use-gesture` or native touch events (lighter).
- **Creator Library:** Can be separate component that wraps `SvgEditor` - keeps editor core clean.
- **File Structure:** All new files should follow existing patterns (hooks, services, components separation).

---

## 🔍 VERIFICATION CHECKLIST

When resuming work, verify:
- [ ] All Sprint 1 features still work (test export, import, clipboard, lock layers)
- [ ] No breaking changes to existing functionality
- [ ] TypeScript compiles without errors
- [ ] Linter passes
- [ ] Component size limits respected (< 300 lines for components, < 500 for hooks)

---

**Last Assessment Date:** Current  
**Next Recommended Sprint:** Sprint 2 (Foundation Work)
