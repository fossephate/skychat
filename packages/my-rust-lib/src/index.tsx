import MyRustLib from './NativeMyRustLib';

export function multiply(a: number, b: number): number {
  return MyRustLib.multiply(a, b);
}
