# Tests

The `test/` directory should not contain any script files

e2e and general purpose tests or test utilities should be placed in `src/tests`

Tests are transpiled to the `dist.tests/` directory. `dist.tests/` should contain similar structure to the production build's `dist/` directory. If `test/` contains test scripts and they are compiled to `dist.tests`, then the `dist.tests/` will no longer be rooted at `src`, and instead will rooted at the project's directory, making its structure dillimilar to the production build's `dist`.
