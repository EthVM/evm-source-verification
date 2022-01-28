# evm-source-verification

## Table of Contents

- [Commands](#commands)
  - [compile](#compile)
  - [metadata](#metadata)
  - [verify](#verify)
  - [validate-git-diffs](#validate-git-diffs)
- [Tests](#tests)
  - [Targetting Tests](#targetting-tests)

## Commands

### compile

### metadata

### verify

### validate-git-diffs

## Tests

### Targetting Tests

To run specific tests the npm `test` script and pass the desired files to jest using `--`.

```
# run test once
npm run test -- src/libs/regex.test.ts

# re-run tests on file changes
npm run test:watch -- src/libs/regex.test.ts
```

### TODO:

- add compiler field to encodedMetadata
