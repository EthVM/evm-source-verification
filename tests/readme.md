# Tests

## Targetting Test Files

To run specific tests the npm `test` script and pass the desired files to jest using `--`.

```
# run test once
npm run test -- src/libs/regex.test.ts

# re-run tests on file changes
npm run test:watch -- src/libs/regex.test.ts
```
