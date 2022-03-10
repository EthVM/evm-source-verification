import { parseSolidityCompilerName } from './solidity';

describe('solidity', () => {
  describe('parseSolidityCompilerName', () => {
    {
      const major = 0;
      const minor = 4;
      const patch = 11;
      const version = `${major}.${minor}.${patch}`;
      const commit = '68ef5810';
      const compilername = `v${version}+commit.${commit}`;
      it(`should work ${compilername}`, () => {
        const nameDetail = parseSolidityCompilerName(compilername);
        expect(nameDetail!.longVersion).toBe(compilername.replace(/^v/, ''));
        expect(nameDetail!.version).toBe(version);
        expect(nameDetail!.commit).toBe(commit);
        expect(nameDetail!.major).toBe(major);
        expect(nameDetail!.minor).toBe(minor);
        expect(nameDetail!.patch).toBe(patch);
      });
    }
    {
      const major = 0;
      const minor = 4;
      const patch = 12;
      const version = `${major}.${minor}.${patch}`;
      const commit = '194ff033';
      const compilername = `${version}+commit.${commit}`;
      it(`should work ${compilername}`, () => {
        const nameDetail = parseSolidityCompilerName(compilername);
        expect(nameDetail!.longVersion).toBe(compilername.replace(/^v/, ''));
        expect(nameDetail!.version).toBe(version);
        expect(nameDetail!.commit).toBe(commit);
        expect(nameDetail!.major).toBe(major);
        expect(nameDetail!.minor).toBe(minor);
        expect(nameDetail!.patch).toBe(patch);
      });
    }
    {
      const major = 0;
      const minor = 1;
      const patch = 3;
      const version = `${major}.${minor}.${patch}`;
      const commit = '028f561d';
      const compilername = `v${version}+commit.${commit}`;
      it(`should work ${compilername}`, () => {
        const nameDetail = parseSolidityCompilerName(compilername);
        expect(nameDetail!.longVersion).toBe(compilername.replace(/^v/, ''));
        expect(nameDetail!.version).toBe(version);
        expect(nameDetail!.commit).toBe(commit);
        expect(nameDetail!.major).toBe(major);
        expect(nameDetail!.minor).toBe(minor);
        expect(nameDetail!.patch).toBe(patch);
      });
    }
  });
});