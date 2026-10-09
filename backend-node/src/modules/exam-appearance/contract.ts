// Browser-safe contract: deliberately contains no database, storage, or environment imports.
import { z } from 'zod';

export const builtinAssets = [
  {
    id: 'starbucks-logo',
    name: 'Starbucks logo',
    path: '/exams/store-9/starbucks.svg',
    mimeType: 'image/svg+xml',
    mask: true,
  },
  {
    id: 'wrapped-in-joy-gifts',
    name: 'Wrapped in Joy gifts',
    path: '/exams/holiday/wrapped-in-joy.svg',
    mimeType: 'image/svg+xml',
    mask: false,
  },
  {
    id: 'marry-furrmily-cats',
    name: 'Marry Furrmily cats',
    path: '/exams/store-9/cats.png',
    mimeType: 'image/png',
    mask: false,
  },
] as const;
export const assetSchema = z.discriminatedUnion('source', [
  z
    .object({
      source: z.literal('builtin'),
      assetId: z.enum(['starbucks-logo', 'marry-furrmily-cats', 'wrapped-in-joy-gifts']),
    })
    .strict(),
  z.object({ source: z.literal('org-file'), fileId: z.string().uuid() }).strict(),
]);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a six-digit hex color');
export const appearanceSchema = z
  .object({
    schemaVersion: z.literal(1),
    renderer: z.enum(['autumn', 'plain', 'holiday']),
    headerLabel: z.string().max(120),
    completionMessage: z.string().max(1000).optional(),
    brand: z
      .object({
        name: z.string().max(100),
        visible: z.boolean(),
        logo: assetSchema.nullable(),
        logoVisible: z.boolean(),
        logoAlt: z.string().max(200),
        badge: z.string().max(80),
        badgeVisible: z.boolean(),
      })
      .strict(),
    artwork: z
      .object({
        asset: assetSchema.nullable(),
        visible: z.boolean(),
        alt: z.string().max(200),
        caption: z.string().max(200),
      })
      .strict(),
    colors: z
      .object({
        background: color,
        backgroundEnd: color,
        glow: color,
        glowSecondary: color,
        header: color,
        headerText: color,
        surface: color,
        text: color,
        muted: color,
        primary: color,
        primaryText: color,
        accent: color,
        border: color,
        selected: color,
        logo: color,
      })
      .strict(),
    gradient: z.boolean(),
    decorations: z
      .object({
        leaves: z.boolean(),
        backgroundBranches: z.boolean(),
        headerBranches: z.boolean(),
        animated: z.boolean(),
        completion: z.boolean(),
      })
      .strict(),
    font: z.enum(['sans', 'serif', 'mono']),
    rounding: z.enum(['rounded', 'soft', 'square']),
    footer: z.object({ visible: z.boolean(), text: z.string().max(500) }).strict(),
    sound: z.object({ available: z.boolean(), defaultEnabled: z.boolean() }).strict(),
  })
  .strict();
export type Appearance = z.infer<typeof appearanceSchema>;
export type AssetReference = z.infer<typeof assetSchema>;
export const legacyAppearance: Appearance = {
  schemaVersion: 1,
  renderer: 'autumn',
  headerLabel: 'FY2026 · Graded exam',
  brand: {
    name: 'STARBUCKS',
    visible: true,
    logo: { source: 'builtin', assetId: 'starbucks-logo' },
    logoVisible: true,
    logoAlt: 'Starbucks',
    badge: 'District 10',
    badgeVisible: true,
  },
  artwork: {
    asset: { source: 'builtin', assetId: 'marry-furrmily-cats' },
    visible: true,
    alt: 'Marry Furrmily',
    caption: 'Marry Furrmily',
  },
  colors: {
    background: '#fbf5e9',
    backgroundEnd: '#f5eadb',
    glow: '#d97736',
    glowSecondary: '#00754a',
    header: '#2c1d17',
    headerText: '#ffffff',
    surface: '#fffdf8',
    text: '#2f2118',
    muted: '#705746',
    primary: '#00754a',
    primaryText: '#ffffff',
    accent: '#d97838',
    border: '#dcc3a5',
    selected: '#fff3df',
    logo: '#00754a',
  },
  gradient: true,
  decorations: {
    leaves: true,
    backgroundBranches: true,
    headerBranches: true,
    animated: true,
    completion: true,
  },
  font: 'sans',
  rounding: 'rounded',
  footer: {
    visible: true,
    text: 'Autumn edition · Sponsored by Starbucks District 10, Marry Furrmily',
  },
  sound: { available: true, defaultEnabled: true },
};
export const plainAppearance: Appearance = {
  ...legacyAppearance,
  renderer: 'plain',
  headerLabel: 'Graded exam',
  brand: {
    name: 'AIRUNOTE',
    visible: true,
    logo: null,
    logoVisible: false,
    logoAlt: '',
    badge: '',
    badgeVisible: false,
  },
  artwork: { asset: null, visible: false, alt: '', caption: '' },
  colors: {
    ...legacyAppearance.colors,
    background: '#f8fafc',
    backgroundEnd: '#f8fafc',
    header: '#0f172a',
    text: '#0f172a',
    muted: '#64748b',
    surface: '#ffffff',
    primary: '#2563eb',
    accent: '#2563eb',
    border: '#e2e8f0',
    selected: '#eff6ff',
  },
  gradient: false,
  decorations: {
    leaves: false,
    backgroundBranches: false,
    headerBranches: false,
    animated: false,
    completion: false,
  },
  footer: { visible: false, text: '' },
};
export const holidayAppearance: Appearance = {
  ...legacyAppearance,
  renderer: 'holiday',
  headerLabel: 'FY27 HOLIDAY PROMOTION',
  completionMessage:
    'END OF EXAM — Thank you for participating! Let’s get ready to celebrate the holiday season and create joyful moments for our customers.',
  brand: { ...legacyAppearance.brand, badge: '386 NEPO CENTER' },
  artwork: {
    asset: { source: 'builtin', assetId: 'wrapped-in-joy-gifts' },
    visible: true,
    alt: 'Holiday gifts wrapped with gold ribbons',
    caption: 'Wrapped in Joy',
  },
  colors: {
    background: '#fff9ef',
    backgroundEnd: '#f5e7d1',
    glow: '#b82c46',
    glowSecondary: '#0b5844',
    header: '#153d32',
    headerText: '#fff9ef',
    surface: '#fffdf8',
    text: '#273c32',
    muted: '#687365',
    primary: '#a9233f',
    primaryText: '#ffffff',
    accent: '#d6ac58',
    border: '#dcc69c',
    selected: '#fff0d2',
    logo: '#00754a',
  },
  footer: {
    visible: true,
    text: '386 NEPO CENTER · WRAPPED IN JOY',
  },
  sound: { available: true, defaultEnabled: false },
};
export function readAppearance(value: unknown): Appearance {
  const parsed = appearanceSchema.safeParse(value);
  return parsed.success ? parsed.data : structuredClone(legacyAppearance);
}
export function assetFileIds(config: Appearance): string[] {
  return [
    ...new Set(
      [config.brand.logo, config.artwork.asset].flatMap((asset) =>
        asset?.source === 'org-file' ? [asset.fileId] : []
      )
    ),
  ];
}
export const templateInputSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    config: appearanceSchema,
    revision: z.number().int().min(1).optional(),
  })
  .strict();
export const appearanceInputSchema = z
  .object({
    config: appearanceSchema,
    templateId: z.string().uuid().nullable(),
    revision: z.number().int().min(0),
  })
  .strict();
