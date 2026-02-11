/**
 * Phase 4 (06_NEVER_LOAD_EAGERLY_BANS): Dev-only safety rails.
 * - Runtime guards: assertMetadataOnly, warnHeavyContentList in domain/utils/loadGuards.ts.
 * - TODO escalation: Add rule to WARN when list repo methods (findByOrgId, findPublicPages, etc.)
 *   are called from use-cases or routes without opts.includeContent for list endpoints.
 *   (Requires custom rule or no-restricted-syntax with AST; currently deferred.)
 */
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  // Phase 4: Future overrides can WARN when appPageRepository/postRepository findByOrgId
  // is called without opts.includeContent (requires custom rule or per-repo selector).
};

