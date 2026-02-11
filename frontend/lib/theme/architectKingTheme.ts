/**
 * Architect-King 2026 — Deep Teal UI System
 * 
 * Persona: Architect-King
 * Essence: Calm authority · clarity · systems · long-term thinking
 * Emotion: "I am in control. This will scale."
 * 
 * RULES:
 * - Primary color is Deep Teal (#0F766E)
 * - Use teal ONLY for primary actions, active states, and selections
 * - Canvas must feel elevated and sacred
 * - Side panels are neutral white with subtle gray borders
 * - Do NOT introduce new colors
 * - Choose restraint over decoration
 * - Choose clarity over cleverness
 * - Choose systems over trends
 */

export const ArchitectKingColors = {
  // Core Identity
  primary: "#0F766E",        // Deep Teal (authority)
  primaryHover: "#115E59",   // Intentional interaction
  primaryActive: "#134E4A",  // Commitment state

  // Supporting
  accent: "#14B8A6",         // Teal accent (sparingly)
  focusRing: "#2DD4BF",      // Accessibility + calm energy

  // Surfaces
  appBg: "#F6F8F9",          // Slightly cool neutral
  panelBg: "#FFFFFF",
  canvasBg: "#FFFFFF",

  // Borders & Dividers
  borderSubtle: "#E5E7EB",
  borderStrong: "#CBD5E1",

  // Text
  textPrimary: "#0F172A",    // Almost black
  textSecondary: "#475569",
  textMuted: "#94A3B8",

  // States
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
};

/**
 * Canvas styling - Sacred space with elevated feel
 */
export const canvasStyles = {
  background: ArchitectKingColors.canvasBg,
  boxShadow: `
    0 0 0 1px ${ArchitectKingColors.borderSubtle},
    0 12px 32px rgba(15, 118, 110, 0.08)
  `,
};

/**
 * Typography weights
 * - Headings: Semibold
 * - Labels: Medium
 * - Body: Regular
 */
export const typographyWeights = {
  heading: "600",      // Semibold
  label: "500",       // Medium
  body: "400",        // Regular
};

/**
 * Usage rules for reference:
 * 
 * Primary Teal (#0F766E) - Use ONLY for:
 * - Save Page button
 * - Primary CTA buttons
 * - Active / selected block
 * - Confirmed actions
 * 
 * Canvas:
 * - White background
 * - Subtle border
 * - Soft teal-tinted shadow
 * 
 * Panels:
 * - White background
 * - Neutral borders
 * - Teal appears only on: active item, focus, selection
 */

