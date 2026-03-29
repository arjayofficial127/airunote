'use client';

import type { Ref } from 'react';
import {
  CANVAS_ARRANGE_OPTIONS,
  type CanvasArrangePreset,
} from '@/components/airunote/utils/canvasArrange';
import {
  LENS_APPEARANCE_PRESETS,
  type LensAppearancePresetId,
  CANVAS_THEME_OPTIONS,
  type CanvasThemeMode,
} from '@/components/airunote/utils/canvasTheme';

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

type LayoutChangeUrgency = {
  level: 'high' | 'medium' | 'low' | 'idle';
  statusTone: string;
  saveTone: string;
  nudge: string | null;
};

interface FolderCanvasTopOverlayProps {
  overlayRef: Ref<HTMLDivElement>;
  itemCount: number;
  isNavigatorOpen: boolean;
  onToggleNavigator: () => void;
  onExportPdf: () => void;
  isExportingPdf: boolean;
  currentCanvasPresetId: LensAppearancePresetId | null;
  onCanvasPresetChange: (presetId: LensAppearancePresetId | null) => void;
  currentCanvasThemeMode: CanvasThemeMode;
  currentCanvasThemeColorDraft: string;
  onCanvasThemeModeChange: (mode: CanvasThemeMode) => void;
  onCanvasThemeColorDraftChange: (color: string) => void;
  onApplyCanvasThemeColor: () => void;
  isSavingCanvasTheme: boolean;
  isCanvasThemeColorDirty: boolean;
  canvasThemeFeedback: FeedbackState;
  activeCanvasNoteEditCount: number;
  eligibleCanvasNoteCount: number;
  dirtyCanvasNoteCount: number;
  dirtyCanvasNoteChangedLineCount: number;
  onEditAllCanvasNotes: () => void;
  onSaveCanvasNotes: () => void;
  onCancelCanvasNotes: () => void;
  isSavingCanvasNotes: boolean;
  canvasNotesFeedback: FeedbackState;
  hasPendingLayoutChanges: boolean;
  layoutChangedCount: number;
  isSavingCanvasChanges: boolean;
  onArrangeCanvas: (preset: CanvasArrangePreset) => void;
  onSaveAllCanvasChanges: () => void;
  onDiscardCanvasChanges: () => void;
  canvasSaveFeedback: FeedbackState;
  layoutChangeUrgency: LayoutChangeUrgency;
}

function OverlaySection({
  eyebrow,
  title,
  status,
  children,
}: {
  eyebrow: string;
  title: string;
  status: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-gradient-to-b from-white to-gray-50/80 p-3 shadow-sm dark:border-gray-700/80 dark:from-gray-900 dark:to-gray-800/80">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
            {eyebrow}
          </div>
          <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{title}</div>
        </div>
        {status}
      </div>
      {children}
    </section>
  );
}

function ExploreSection({
  isNavigatorOpen,
  onToggleNavigator,
  onExportPdf,
  isExportingPdf,
  itemCount,
}: {
  isNavigatorOpen: boolean;
  onToggleNavigator: () => void;
  onExportPdf: () => void;
  isExportingPdf: boolean;
  itemCount: number;
}) {
  return (
    <OverlaySection
      eyebrow="Explore"
      title="Navigation and export"
      status={
        <div className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300">
          {isNavigatorOpen ? 'Navigator on' : 'Navigator off'}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleNavigator}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
            isNavigatorOpen
              ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {isNavigatorOpen ? 'Hide Navigator' : 'Show Navigator'}
        </button>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={isExportingPdf || itemCount === 0}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
            !isExportingPdf && itemCount > 0
              ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
              : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
          }`}
        >
          {isExportingPdf ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>
    </OverlaySection>
  );
}

function CanvasSection({
  currentCanvasPresetId,
  onCanvasPresetChange,
  currentCanvasThemeMode,
  currentCanvasThemeColorDraft,
  onCanvasThemeModeChange,
  onCanvasThemeColorDraftChange,
  onApplyCanvasThemeColor,
  isSavingCanvasTheme,
  isCanvasThemeColorDirty,
  canvasThemeFeedback,
}: {
  currentCanvasPresetId: LensAppearancePresetId | null;
  onCanvasPresetChange: (presetId: LensAppearancePresetId | null) => void;
  currentCanvasThemeMode: CanvasThemeMode;
  currentCanvasThemeColorDraft: string;
  onCanvasThemeModeChange: (mode: CanvasThemeMode) => void;
  onCanvasThemeColorDraftChange: (color: string) => void;
  onApplyCanvasThemeColor: () => void;
  isSavingCanvasTheme: boolean;
  isCanvasThemeColorDirty: boolean;
  canvasThemeFeedback: FeedbackState;
}) {
  const currentCanvasThemeLabel =
    CANVAS_THEME_OPTIONS.find((option) => option.value === currentCanvasThemeMode)?.label ?? 'Dark';

  return (
    <OverlaySection
      eyebrow="Canvas"
      title="Surface appearance"
      status={
        <div className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-300">
          {currentCanvasThemeLabel}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-xl border border-gray-300 bg-white px-2 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <select
            aria-label="Lens appearance preset"
            value={currentCanvasPresetId ?? ''}
            onChange={(event) => onCanvasPresetChange((event.target.value || null) as LensAppearancePresetId | null)}
            disabled={isSavingCanvasTheme}
            className="rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 outline-none transition-colors dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-100">Preset</option>
            {LENS_APPEARANCE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id} className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-100">
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-xl border border-gray-300 bg-white px-2 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <select
            aria-label="Canvas theme"
            value={currentCanvasThemeMode}
            onChange={(event) => onCanvasThemeModeChange(event.target.value as CanvasThemeMode)}
            disabled={isSavingCanvasTheme}
            className="rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 outline-none transition-colors dark:bg-gray-800 dark:text-gray-100"
          >
            {CANVAS_THEME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-100">
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {currentCanvasThemeMode === 'custom-color' && (
          <>
            <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Color</span>
              <input
                type="color"
                value={currentCanvasThemeColorDraft}
                onChange={(event) => onCanvasThemeColorDraftChange(event.target.value)}
                disabled={isSavingCanvasTheme}
                className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
            <button
              type="button"
              onClick={onApplyCanvasThemeColor}
              disabled={!isCanvasThemeColorDirty || isSavingCanvasTheme}
              className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
                isCanvasThemeColorDirty && !isSavingCanvasTheme
                  ? 'border-violet-600 bg-violet-600 text-white hover:bg-violet-700'
                  : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
              }`}
            >
              {isSavingCanvasTheme ? 'Saving Theme...' : 'Apply Color'}
            </button>
          </>
        )}
        {canvasThemeFeedback && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs font-medium ${
              canvasThemeFeedback.type === 'success'
                ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {canvasThemeFeedback.message}
          </div>
        )}
      </div>
    </OverlaySection>
  );
}

function NotesSection({
  activeCanvasNoteEditCount,
  eligibleCanvasNoteCount,
  dirtyCanvasNoteCount,
  dirtyCanvasNoteChangedLineCount,
  onEditAllCanvasNotes,
  onSaveCanvasNotes,
  onCancelCanvasNotes,
  isSavingCanvasNotes,
  canvasNotesFeedback,
}: {
  activeCanvasNoteEditCount: number;
  eligibleCanvasNoteCount: number;
  dirtyCanvasNoteCount: number;
  dirtyCanvasNoteChangedLineCount: number;
  onEditAllCanvasNotes: () => void;
  onSaveCanvasNotes: () => void;
  onCancelCanvasNotes: () => void;
  isSavingCanvasNotes: boolean;
  canvasNotesFeedback: FeedbackState;
}) {
  return (
    <OverlaySection
      eyebrow="Notes"
      title="Editing and note saves"
      status={
        <div className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-300">
          {activeCanvasNoteEditCount > 0 ? `${activeCanvasNoteEditCount} active` : `${eligibleCanvasNoteCount} available`}
        </div>
      }
    >
      <div className="mb-2 rounded-xl border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-xs font-medium text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-300">
        {activeCanvasNoteEditCount > 0
          ? `${activeCanvasNoteEditCount} editing${dirtyCanvasNoteCount > 0 ? ` • ${dirtyCanvasNoteCount} unsaved` : ''}${dirtyCanvasNoteChangedLineCount > 0 ? ` • ${dirtyCanvasNoteChangedLineCount} changed lines` : ''}`
          : eligibleCanvasNoteCount > 0
            ? `${eligibleCanvasNoteCount} notes available`
            : 'No editable notes'}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onEditAllCanvasNotes}
          disabled={eligibleCanvasNoteCount === 0 || activeCanvasNoteEditCount === eligibleCanvasNoteCount}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
            eligibleCanvasNoteCount > 0 && activeCanvasNoteEditCount !== eligibleCanvasNoteCount
              ? 'border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700'
              : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
          }`}
        >
          Edit All Notes
        </button>
        <button
          type="button"
          onClick={onSaveCanvasNotes}
          disabled={dirtyCanvasNoteCount === 0 || isSavingCanvasNotes}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
            dirtyCanvasNoteCount > 0 && !isSavingCanvasNotes
              ? 'border-cyan-700 bg-cyan-700 text-white hover:bg-cyan-800'
              : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
          }`}
        >
          {isSavingCanvasNotes ? 'Saving Notes...' : `Save Notes${dirtyCanvasNoteCount > 0 ? ` (${dirtyCanvasNoteCount})` : ''}`}
        </button>
        <button
          type="button"
          onClick={onCancelCanvasNotes}
          disabled={activeCanvasNoteEditCount === 0 || isSavingCanvasNotes}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
            activeCanvasNoteEditCount > 0 && !isSavingCanvasNotes
              ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
          }`}
        >
          Cancel Notes
        </button>
        {canvasNotesFeedback && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs font-medium ${
              canvasNotesFeedback.type === 'success'
                ? 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-900/20 dark:text-cyan-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {canvasNotesFeedback.message}
          </div>
        )}
      </div>
    </OverlaySection>
  );
}

function LayoutSection({
  hasPendingLayoutChanges,
  layoutChangedCount,
  isSavingCanvasChanges,
  onArrangeCanvas,
  onSaveAllCanvasChanges,
  onDiscardCanvasChanges,
  canvasSaveFeedback,
  layoutChangeUrgency,
}: {
  hasPendingLayoutChanges: boolean;
  layoutChangedCount: number;
  isSavingCanvasChanges: boolean;
  onArrangeCanvas: (preset: CanvasArrangePreset) => void;
  onSaveAllCanvasChanges: () => void;
  onDiscardCanvasChanges: () => void;
  canvasSaveFeedback: FeedbackState;
  layoutChangeUrgency: LayoutChangeUrgency;
}) {
  return (
    <OverlaySection
      eyebrow="Layout"
      title="Arrangement and staged saves"
      status={
        <div className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${layoutChangeUrgency.statusTone}`}>
          {hasPendingLayoutChanges ? `${layoutChangedCount} unsaved` : 'All saved'}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-xl border border-gray-300 bg-white px-2 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <select
            aria-label="Arrange canvas layout"
            defaultValue=""
            onChange={(event) => {
              const preset = event.target.value as CanvasArrangePreset;
              if (!preset) {
                return;
              }

              onArrangeCanvas(preset);
              event.target.value = '';
            }}
            className="rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 outline-none transition-colors dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="" className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-100">Arrange</option>
            {CANVAS_ARRANGE_OPTIONS.map((option) => (
              <option key={option.preset} value={option.preset} className="bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-100">
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onSaveAllCanvasChanges}
          disabled={!hasPendingLayoutChanges || isSavingCanvasChanges}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
            hasPendingLayoutChanges && !isSavingCanvasChanges
              ? layoutChangeUrgency.saveTone
              : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
          }`}
        >
          {isSavingCanvasChanges ? 'Saving...' : `Save All${layoutChangedCount > 0 ? ` (${layoutChangedCount})` : ''}`}
        </button>
        <button
          type="button"
          onClick={onDiscardCanvasChanges}
          disabled={!hasPendingLayoutChanges || isSavingCanvasChanges}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ${
            hasPendingLayoutChanges && !isSavingCanvasChanges
              ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              : 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500'
          }`}
        >
          Discard Changes
        </button>
        {canvasSaveFeedback && (
          <div
            className={`rounded-xl border px-3 py-2 text-xs font-medium ${
              canvasSaveFeedback.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300'
            }`}
          >
            {canvasSaveFeedback.message}
          </div>
        )}
      </div>
    </OverlaySection>
  );
}

export function FolderCanvasTopOverlay({
  overlayRef,
  itemCount,
  isNavigatorOpen,
  onToggleNavigator,
  onExportPdf,
  isExportingPdf,
  currentCanvasPresetId,
  onCanvasPresetChange,
  currentCanvasThemeMode,
  currentCanvasThemeColorDraft,
  onCanvasThemeModeChange,
  onCanvasThemeColorDraftChange,
  onApplyCanvasThemeColor,
  isSavingCanvasTheme,
  isCanvasThemeColorDirty,
  canvasThemeFeedback,
  activeCanvasNoteEditCount,
  eligibleCanvasNoteCount,
  dirtyCanvasNoteCount,
  dirtyCanvasNoteChangedLineCount,
  onEditAllCanvasNotes,
  onSaveCanvasNotes,
  onCancelCanvasNotes,
  isSavingCanvasNotes,
  canvasNotesFeedback,
  hasPendingLayoutChanges,
  layoutChangedCount,
  isSavingCanvasChanges,
  onArrangeCanvas,
  onSaveAllCanvasChanges,
  onDiscardCanvasChanges,
  canvasSaveFeedback,
  layoutChangeUrgency,
}: FolderCanvasTopOverlayProps) {
  return (
    <div ref={overlayRef} className="pointer-events-auto flex w-full max-w-[min(76rem,calc(100vw-2rem))] flex-col gap-2">
      <div className="rounded-[28px] border border-white/70 bg-white/92 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-gray-700/80 dark:bg-gray-900/88">
        <div className="flex flex-wrap items-start justify-between gap-3 px-1 pb-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Folder Canvas
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              Explore, appearance, note workflow, and layout controls
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {itemCount} canvas items
            </div>
            <div className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${layoutChangeUrgency.statusTone}`}>
              {hasPendingLayoutChanges ? `${layoutChangedCount} layout pending` : 'Layout synced'}
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.1fr)]">
          <ExploreSection
            isNavigatorOpen={isNavigatorOpen}
            onToggleNavigator={onToggleNavigator}
            onExportPdf={onExportPdf}
            isExportingPdf={isExportingPdf}
            itemCount={itemCount}
          />
          <CanvasSection
            currentCanvasPresetId={currentCanvasPresetId}
            onCanvasPresetChange={onCanvasPresetChange}
            currentCanvasThemeMode={currentCanvasThemeMode}
            currentCanvasThemeColorDraft={currentCanvasThemeColorDraft}
            onCanvasThemeModeChange={onCanvasThemeModeChange}
            onCanvasThemeColorDraftChange={onCanvasThemeColorDraftChange}
            onApplyCanvasThemeColor={onApplyCanvasThemeColor}
            isSavingCanvasTheme={isSavingCanvasTheme}
            isCanvasThemeColorDirty={isCanvasThemeColorDirty}
            canvasThemeFeedback={canvasThemeFeedback}
          />
          <NotesSection
            activeCanvasNoteEditCount={activeCanvasNoteEditCount}
            eligibleCanvasNoteCount={eligibleCanvasNoteCount}
            dirtyCanvasNoteCount={dirtyCanvasNoteCount}
            dirtyCanvasNoteChangedLineCount={dirtyCanvasNoteChangedLineCount}
            onEditAllCanvasNotes={onEditAllCanvasNotes}
            onSaveCanvasNotes={onSaveCanvasNotes}
            onCancelCanvasNotes={onCancelCanvasNotes}
            isSavingCanvasNotes={isSavingCanvasNotes}
            canvasNotesFeedback={canvasNotesFeedback}
          />
          <LayoutSection
            hasPendingLayoutChanges={hasPendingLayoutChanges}
            layoutChangedCount={layoutChangedCount}
            isSavingCanvasChanges={isSavingCanvasChanges}
            onArrangeCanvas={onArrangeCanvas}
            onSaveAllCanvasChanges={onSaveAllCanvasChanges}
            onDiscardCanvasChanges={onDiscardCanvasChanges}
            canvasSaveFeedback={canvasSaveFeedback}
            layoutChangeUrgency={layoutChangeUrgency}
          />
        </div>
      </div>
      {layoutChangeUrgency.nudge && hasPendingLayoutChanges && !isSavingCanvasChanges && (
        <div
          className={`self-start rounded-2xl border px-4 py-2.5 text-xs font-medium shadow-lg ${
            layoutChangeUrgency.level === 'high'
              ? 'border-rose-200 bg-white/95 text-rose-700 dark:border-rose-900/40 dark:bg-gray-800/95 dark:text-rose-300'
              : 'border-amber-200 bg-white/95 text-amber-700 dark:border-amber-900/40 dark:bg-gray-800/95 dark:text-amber-300'
          }`}
        >
          {layoutChangeUrgency.nudge}
        </div>
      )}
    </div>
  );
}