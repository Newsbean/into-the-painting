import globals from 'globals';

// One job: catch names that are not defined anywhere. When code moves between the
// files of a world, a forgotten import is the usual mistake, and it only shows up at
// run time in the one world that uses it.
export default [
  { ignores: ['dist/**', 'capture/**', 'refs/**', 'node_modules/**'] },
  {
    files: ['src/**/*.js', 'tools/**/*.mjs', '*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-undef': 'error', 'no-dupe-keys': 'error', 'no-const-assign': 'error', 'no-unreachable': 'error' },
  },
];
