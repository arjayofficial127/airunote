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
      backgroundColor: '#fff9ef',
      borderColor: '#d7c8ab',
      cardClassName: 'shadow-md backdrop-blur-[1px]',
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
      backgroundColor: '#edf4ff',
      borderColor: '#91a8ca',
      cardClassName: 'shadow-md backdrop-blur-[1px]',
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
      backgroundColor: '#fff7c7',
      borderColor: '#d8c36a',
      cardClassName: 'shadow-md backdrop-blur-[1px]',
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
      backgroundColor: '#f6ebd7',
      borderColor: '#bc9b70',
      cardClassName: 'shadow-md backdrop-blur-[1px]',
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
      cardClassName: 'shadow-md backdrop-blur-[1px]',
      cardStyle: {
        backgroundColor: normalizedOverrideColor,
        borderColor: mixHexColors(normalizedOverrideColor, '#475569', 0.18),
      },
      swatchColor: normalizedOverrideColor,
    };
  }

  const preset = getAppearancePreset(theme.presetId);
  if (preset) {
    return {
      cardClassName: preset.noteCard.cardClassName ?? 'shadow-md backdrop-blur-[1px]',
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
        cardClassName: 'shadow-md backdrop-blur-[1px]',
        cardStyle: {
          backgroundColor: '#fffaf0',
          borderColor: '#d8ccb5',
        },
        swatchColor: '#fffaf0',
      };
    case 'recycled-paper':
      return {
        cardClassName: 'shadow-md backdrop-blur-[1px]',
        cardStyle: {
          backgroundColor: '#fbf1de',
          borderColor: '#c9a874',
        },
        swatchColor: '#fbf1de',
      };
    case 'custom-color': {
      const baseColor = theme.customColor ?? DEFAULT_CUSTOM_COLOR;
      const isDarkSurface = getRelativeLuminance(baseColor) < 0.42;
      const cardColor = isDarkSurface
        ? mixHexColors(baseColor, '#ffffff', 0.9)
        : mixHexColors(baseColor, '#ffffff', 0.74);

      return {
        cardClassName: 'shadow-md backdrop-blur-[1px]',
        cardStyle: {
          backgroundColor: cardColor,
          borderColor: mixHexColors(baseColor, '#334155', 0.22),
        },
        swatchColor: cardColor,
      };
    }
    case 'dark':
    default:
      return {
        cardClassName: 'shadow-lg backdrop-blur-[1px]',
        cardStyle: {
          backgroundColor: '#f7fafc',
          borderColor: '#94a3b8',
        },
        swatchColor: '#f7fafc',
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
          backgroundColor: '#f7f3e8',
          backgroundImage: [
            'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,238,224,0.98))',
            'linear-gradient(90deg, rgba(120,113,108,0.03) 0, rgba(120,113,108,0.03) 1px, transparent 1px, transparent 24px)',
          ].join(','),
          backgroundSize: '100% 100%, 24px 24px',
        },
        'border border-stone-200/80 shadow-inner',
        'text-stone-600'
      );
    case 'recycled-paper':
      return buildSurfaceTheme(
        {
          backgroundColor: '#e9dcc4',
          backgroundImage: [
            'linear-gradient(180deg, rgba(245,236,216,0.98), rgba(225,210,183,0.98))',
            'radial-gradient(circle at 18% 22%, rgba(120,94,58,0.09) 0 1.2px, transparent 1.4px)',
            'radial-gradient(circle at 76% 34%, rgba(120,94,58,0.07) 0 1px, transparent 1.3px)',
            'radial-gradient(circle at 44% 72%, rgba(120,94,58,0.06) 0 1.1px, transparent 1.5px)',
            'linear-gradient(90deg, rgba(146,119,84,0.04) 0, rgba(146,119,84,0.04) 1px, transparent 1px, transparent 28px)',
          ].join(','),
          backgroundSize: '100% 100%, 180px 180px, 220px 220px, 200px 200px, 28px 28px',
        },
        'border border-amber-200/80 shadow-inner',
        'text-amber-900/70'
      );
    case 'custom-color':
      return buildSurfaceTheme(
        {
          backgroundColor: customColor,
          backgroundImage: [
            'linear-gradient(180deg, rgba(255,255,255,0.09), rgba(0,0,0,0.14))',
            'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.08), transparent 28%)',
            'radial-gradient(circle at 78% 14%, rgba(255,255,255,0.06), transparent 24%)',
          ].join(','),
        },
        'border border-white/10 shadow-inner',
        'text-white/72'
      );
    case 'dark':
    default:
      return buildSurfaceTheme(
        {
          backgroundColor: '#0f172a',
          backgroundImage: [
            'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,1))',
            'radial-gradient(circle at 18% 20%, rgba(56,189,248,0.10), transparent 28%)',
            'radial-gradient(circle at 82% 12%, rgba(148,163,184,0.10), transparent 22%)',
          ].join(','),
        },
        'border border-slate-700/70 shadow-inner',
        'text-slate-300'
      );
  }
}