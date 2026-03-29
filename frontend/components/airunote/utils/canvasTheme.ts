import type { CSSProperties } from 'react';

export type CanvasThemeMode = 'dark' | 'paper-white' | 'recycled-paper' | 'custom-color';
export type LensAppearancePresetId = 'writer' | 'research' | 'study' | 'paper-desk';

export interface LensCanvasTheme {
  mode: CanvasThemeMode;
  customColor: string | null;
  presetId: LensAppearancePresetId | null;
}

export interface CanvasSurfaceTheme {
  viewportStyle: CSSProperties;
  surfaceStyle: CSSProperties;
  surfaceClassName: string;
  emptyStateClassName: string;
}

export interface CanvasNoteCardTheme {
  cardStyle: CSSProperties;
  cardClassName: string;
  swatchColor: string;
}

interface LensAppearancePreset {
  id: LensAppearancePresetId;
  label: string;
  description: string;
  canvasTheme: {
    mode: CanvasThemeMode;
    customColor: string | null;
  };
  noteCard: {
    backgroundColor: string;
    borderColor: string;
    cardClassName?: string;
  };
}

const DEFAULT_CUSTOM_COLOR = '#2f3b52';
const DEFAULT_NOTE_OVERRIDE_COLOR = '#f8f1df';

export const CANVAS_THEME_OPTIONS: Array<{ value: CanvasThemeMode; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'paper-white', label: 'Paper White' },
  { value: 'recycled-paper', label: 'Textured Paper' },
  { value: 'custom-color', label: 'Custom Color' },
];

export const CANVAS_NOTE_COLOR_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '#f8f1df', label: 'Cream' },
  { value: '#f8dfe2', label: 'Blush' },
  { value: '#dff3e8', label: 'Mint' },
  { value: '#e0ecff', label: 'Sky' },
  { value: '#ece3ff', label: 'Lavender' },
  { value: '#e7edf5', label: 'Slate' },
];

export const LENS_APPEARANCE_PRESETS: LensAppearancePreset[] = [
  {
    id: 'writer',
    label: 'Writer',
    description: 'Calm paper surface with warm reading cards.',
    canvasTheme: {
      mode: 'paper-white',
      customColor: null,
    },
    noteCard: {
      backgroundColor: '#fff4de',
      borderColor: '#cdae78',
      cardClassName: 'shadow-[0_14px_30px_rgba(146,98,39,0.18)] ring-1 ring-white/80',
    },
  },
  {
    id: 'research',
    label: 'Research',
    description: 'Cooler workspace with crisp, reference-friendly cards.',
    canvasTheme: {
      mode: 'custom-color',
      customColor: '#2c3d59',
    },
    noteCard: {
      backgroundColor: '#e7f0ff',
      borderColor: '#6f8fbe',
      cardClassName: 'shadow-[0_14px_30px_rgba(37,99,235,0.18)] ring-1 ring-slate-900/5',
    },
  },
  {
    id: 'study',
    label: 'Study',
    description: 'Soft bright canvas with highlighter-friendly notes.',
    canvasTheme: {
      mode: 'custom-color',
      customColor: '#dfe8f4',
    },
    noteCard: {
      backgroundColor: '#fff2a6',
      borderColor: '#c8a42d',
      cardClassName: 'shadow-[0_14px_28px_rgba(202,138,4,0.18)] ring-1 ring-amber-50',
    },
  },
  {
    id: 'paper-desk',
    label: 'Paper Desk',
    description: 'Textured desk surface with grounded note cards.',
    canvasTheme: {
      mode: 'recycled-paper',
      customColor: null,
    },
    noteCard: {
      backgroundColor: '#f1dfc2',
      borderColor: '#a97d52',
      cardClassName: 'shadow-[0_14px_30px_rgba(120,84,47,0.2)] ring-1 ring-white/55',
    },
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCanvasThemeMode(value: unknown): value is CanvasThemeMode {
  return value === 'dark' || value === 'paper-white' || value === 'recycled-paper' || value === 'custom-color';
}

function isLensAppearancePresetId(value: unknown): value is LensAppearancePresetId {
  return value === 'writer' || value === 'research' || value === 'study' || value === 'paper-desk';
}

function readCanvasThemeCustomColor(background: Record<string, unknown> | null): string | null {
  return normalizeHexColor(background?.color) ?? normalizeHexColor(background?.customColor);
}

function getAppearancePreset(presetId: LensAppearancePresetId | null | undefined): LensAppearancePreset | null {
  if (!presetId) {
    return null;
  }

  return LENS_APPEARANCE_PRESETS.find((preset) => preset.id === presetId) ?? null;
}

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized.toLowerCase() : null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((value) => `${value}${value}`).join('')
    : normalized;

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

function mixHexColors(baseHex: string, mixHex: string, ratio: number): string {
  const base = hexToRgb(baseHex);
  const mix = hexToRgb(mixHex);
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  const mixChannel = (baseValue: number, mixValue: number) =>
    Math.round(baseValue * (1 - clampedRatio) + mixValue * clampedRatio)
      .toString(16)
      .padStart(2, '0');

  return `#${mixChannel(base.r, mix.r)}${mixChannel(base.g, mix.g)}${mixChannel(base.b, mix.b)}`;
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  const red = normalize(r);
  const green = normalize(g);
  const blue = normalize(b);

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function readLensCanvasTheme(metadata: Record<string, unknown> | null | undefined): LensCanvasTheme {
  const appearance = isRecord(metadata?.appearance) ? metadata.appearance : null;
  const canvas = isRecord(appearance?.canvas) ? appearance.canvas : null;
  const background = isRecord(canvas?.background) ? canvas.background : null;
  const presetId = isLensAppearancePresetId(canvas?.preset) ? canvas.preset : null;
  const mode = isCanvasThemeMode(background?.mode) ? background.mode : 'dark';
  const customColor = readCanvasThemeCustomColor(background);

  return {
    mode,
    customColor,
    presetId,
  };
}

export function buildLensMetadataWithCanvasTheme(
  metadata: Record<string, unknown> | null | undefined,
  theme: LensCanvasTheme
): Record<string, unknown> {
  const nextMetadata = isRecord(metadata) ? { ...metadata } : {};
  const nextAppearance = isRecord(nextMetadata.appearance) ? { ...nextMetadata.appearance } : {};
  const nextCanvas = isRecord(nextAppearance.canvas) ? { ...nextAppearance.canvas } : {};

  nextCanvas.background = {
    mode: theme.mode,
    ...(theme.mode === 'custom-color' && theme.customColor ? { color: theme.customColor } : {}),
  };

  if (theme.presetId) {
    nextCanvas.preset = theme.presetId;
  } else if ('preset' in nextCanvas) {
    delete nextCanvas.preset;
  }

  nextAppearance.canvas = nextCanvas;
  nextMetadata.appearance = nextAppearance;

  return nextMetadata;
}

export function getDefaultCanvasThemeCustomColor(): string {
  return DEFAULT_CUSTOM_COLOR;
}

export function buildLensCanvasThemeFromPreset(presetId: LensAppearancePresetId): LensCanvasTheme {
  const preset = getAppearancePreset(presetId);

  if (!preset) {
    return {
      mode: 'dark',
      customColor: null,
      presetId: null,
    };
  }

  return {
    mode: preset.canvasTheme.mode,
    customColor: preset.canvasTheme.customColor,
    presetId: preset.id,
  };
}

export function readCanvasItemNoteColorOverride(metadata: Record<string, unknown> | null | undefined): string | null {
  const appearance = isRecord(metadata?.appearance) ? metadata.appearance : null;
  const note = isRecord(appearance?.note) ? appearance.note : null;
  return normalizeHexColor(note?.color);
}

export function buildCanvasItemMetadataWithNoteColorOverride(
  metadata: Record<string, unknown> | null | undefined,
  color: string | null
): Record<string, unknown> {
  const nextMetadata = isRecord(metadata) ? { ...metadata } : {};
  const nextAppearance = isRecord(nextMetadata.appearance) ? { ...nextMetadata.appearance } : {};
  const nextNote = isRecord(nextAppearance.note) ? { ...nextAppearance.note } : {};

  if (color) {
    nextNote.color = color;
    nextAppearance.note = nextNote;
    nextMetadata.appearance = nextAppearance;
    return nextMetadata;
  }

  if ('color' in nextNote) {
    delete nextNote.color;
  }

  if (Object.keys(nextNote).length > 0) {
    nextAppearance.note = nextNote;
  } else if ('note' in nextAppearance) {
    delete nextAppearance.note;
  }

  nextMetadata.appearance = nextAppearance;
  return nextMetadata;
}

export function resolveCanvasNoteCardTheme(theme: LensCanvasTheme, overrideColor?: string | null): CanvasNoteCardTheme {
  if (overrideColor) {
    const normalizedOverrideColor = normalizeHexColor(overrideColor) ?? DEFAULT_NOTE_OVERRIDE_COLOR;
    return {
      cardClassName: 'shadow-[0_16px_34px_rgba(15,23,42,0.16)] ring-1 ring-white/70',
      cardStyle: {
        backgroundColor: normalizedOverrideColor,
        borderColor: mixHexColors(normalizedOverrideColor, '#334155', 0.24),
      },
      swatchColor: normalizedOverrideColor,
    };
  }

  const preset = getAppearancePreset(theme.presetId);
  if (preset) {
    return {
      cardClassName: preset.noteCard.cardClassName ?? 'shadow-md',
      cardStyle: {
        backgroundColor: preset.noteCard.backgroundColor,
        borderColor: preset.noteCard.borderColor,
      },
      swatchColor: preset.noteCard.backgroundColor,
    };
  }

  switch (theme.mode) {
    case 'paper-white':
      return {
        cardClassName: 'shadow-[0_12px_26px_rgba(120,113,108,0.12)] ring-1 ring-white/80',
        cardStyle: {
          backgroundColor: '#fffbf2',
          borderColor: '#cfbea2',
        },
        swatchColor: '#fffbf2',
      };
    case 'recycled-paper':
      return {
        cardClassName: 'shadow-[0_12px_26px_rgba(120,94,58,0.16)] ring-1 ring-white/55',
        cardStyle: {
          backgroundColor: '#f5e7cb',
          borderColor: '#b88d56',
        },
        swatchColor: '#f5e7cb',
      };
    case 'custom-color': {
      const baseColor = theme.customColor ?? DEFAULT_CUSTOM_COLOR;
      const isDarkSurface = getRelativeLuminance(baseColor) < 0.42;
      const cardColor = isDarkSurface
        ? mixHexColors(baseColor, '#ffffff', 0.82)
        : mixHexColors(baseColor, '#ffffff', 0.56);

      return {
        cardClassName: 'shadow-[0_18px_38px_rgba(15,23,42,0.2)] ring-1 ring-white/24',
        cardStyle: {
          backgroundColor: cardColor,
          borderColor: mixHexColors(baseColor, '#0f172a', 0.42),
        },
        swatchColor: cardColor,
      };
    }
    case 'dark':
    default:
      return {
        cardClassName: 'shadow-[0_16px_34px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/60',
        cardStyle: {
          backgroundColor: '#edf3ff',
          borderColor: '#7286a8',
        },
        swatchColor: '#edf3ff',
      };
  }
}

export function resolveCanvasSurfaceTheme(theme: LensCanvasTheme): CanvasSurfaceTheme {
  const customColor = theme.customColor ?? DEFAULT_CUSTOM_COLOR;

  const buildSurfaceTheme = (
    surfaceStyle: CSSProperties,
    surfaceClassName: string,
    emptyStateClassName: string
  ): CanvasSurfaceTheme => ({
    viewportStyle: {
      backgroundColor: surfaceStyle.backgroundColor,
      backgroundImage: surfaceStyle.backgroundImage,
      backgroundSize: surfaceStyle.backgroundSize,
      backgroundPosition: surfaceStyle.backgroundPosition,
      backgroundRepeat: surfaceStyle.backgroundRepeat,
    },
    surfaceStyle,
    surfaceClassName,
    emptyStateClassName,
  });

  switch (theme.mode) {
    case 'paper-white':
      return buildSurfaceTheme(
        {
          backgroundColor: '#f4ecdc',
          backgroundImage: [
            'linear-gradient(180deg, rgba(255,255,255,0.99), rgba(240,230,210,0.98))',
            'linear-gradient(0deg, rgba(148,163,184,0.07) 0, rgba(148,163,184,0.07) 1px, transparent 1px, transparent 30px)',
            'linear-gradient(90deg, rgba(120,113,108,0.045) 0, rgba(120,113,108,0.045) 1px, transparent 1px, transparent 24px)',
            'radial-gradient(circle at 14% 18%, rgba(255,255,255,0.5), transparent 22%)',
          ].join(','),
          backgroundSize: '100% 100%, 100% 30px, 24px 24px, auto',
        },
        'border border-stone-300/90 shadow-inner',
        'text-stone-600'
      );
    case 'recycled-paper':
      return buildSurfaceTheme(
        {
          backgroundColor: '#e2cca4',
          backgroundImage: [
            'linear-gradient(180deg, rgba(246,236,212,0.99), rgba(221,202,169,0.99))',
            'radial-gradient(circle at 18% 22%, rgba(120,94,58,0.13) 0 1.2px, transparent 1.4px)',
            'radial-gradient(circle at 76% 34%, rgba(120,94,58,0.11) 0 1px, transparent 1.3px)',
            'radial-gradient(circle at 44% 72%, rgba(120,94,58,0.09) 0 1.1px, transparent 1.5px)',
            'linear-gradient(90deg, rgba(146,119,84,0.075) 0, rgba(146,119,84,0.075) 1px, transparent 1px, transparent 28px)',
            'linear-gradient(0deg, rgba(120,94,58,0.04) 0, rgba(120,94,58,0.04) 1px, transparent 1px, transparent 32px)',
          ].join(','),
          backgroundSize: '100% 100%, 180px 180px, 220px 220px, 200px 200px, 28px 28px, 100% 32px',
        },
        'border border-amber-400/80 shadow-inner',
        'text-amber-900/70'
      );
    case 'custom-color':
      return buildSurfaceTheme(
        {
          backgroundColor: customColor,
          backgroundImage: [
            'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(0,0,0,0.22))',
            'linear-gradient(0deg, rgba(255,255,255,0.055) 0, rgba(255,255,255,0.055) 1px, transparent 1px, transparent 32px)',
            'linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 28px)',
            'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.12), transparent 28%)',
            'radial-gradient(circle at 78% 14%, rgba(255,255,255,0.1), transparent 24%)',
          ].join(','),
          backgroundSize: '100% 100%, 100% 32px, 28px 28px, auto, auto',
        },
        'border border-white/15 shadow-inner',
        'text-white/72'
      );
    case 'dark':
    default:
      return buildSurfaceTheme(
        {
          backgroundColor: '#0f172a',
          backgroundImage: [
            'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,1))',
            'linear-gradient(0deg, rgba(56,189,248,0.09) 0, rgba(56,189,248,0.09) 1px, transparent 1px, transparent 34px)',
            'linear-gradient(90deg, rgba(148,163,184,0.035) 0, rgba(148,163,184,0.035) 1px, transparent 1px, transparent 28px)',
            'radial-gradient(circle at 18% 20%, rgba(56,189,248,0.14), transparent 28%)',
            'radial-gradient(circle at 82% 12%, rgba(148,163,184,0.14), transparent 22%)',
          ].join(','),
          backgroundSize: '100% 100%, 100% 34px, 28px 28px, auto, auto',
        },
        'border border-slate-700/70 shadow-inner',
        'text-slate-300'
      );
  }
}