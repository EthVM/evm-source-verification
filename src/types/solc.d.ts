/// <reference types="emscripten" />

/**
 * @see [npm](https://www.npmjs.com/package/solc)
 * @see [GitHub](https://github.com/ethereum/solc-js#readme)
 */
declare module 'solc' {
  // from https://github.com/ethereum/solc-js/blob/master/wrapper.ts
  interface CompilerMethods {
    version: () => string;
    semver: (version: string) => string;
    license: () => string;
    lowlevel: {
      compileSingle: (input: string, arg1?: number) => string;
      compileMulti: (input: string, arg1?: number) => string;
      compileCallback: (input: string, arg1?: number, arg2?: number) => string;
      compileStandard: (input: string, arg1?: number) => string;
    },
    features: {
      legacySingleInput: boolean;
      multipleInputs: boolean;
      importCallback: boolean;
      nativeStandardJSON: boolean;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compile: (input: string, readCallback?: any) => string;
    loadRemoteVersion: (versionString: string, cb: (err: null | Error, compiler: CompilerMethods) => void) => void;
    setupMethods: SetupMethods;
  }

  interface SetupMethods { (wasm: EmscriptenModule): CompilerMethods };

  const ret: CompilerMethods;

  export default ret;
}