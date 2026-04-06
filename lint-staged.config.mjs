/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*': ['oxfmt --write --no-error-on-unmatched-pattern'],
  '*.nix': ['alejandra'],
  '*.{ts,tsx}': ['oxlint --fix', () => 'pnpm typecheck', () => 'pnpm size', () => 'pnpm test'],
};
