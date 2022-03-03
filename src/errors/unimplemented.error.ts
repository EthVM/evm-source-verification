export class UnimplementedError extends Error {
  constructor(name: string) {
    super(`${name} not unimplemented`);
  }
}