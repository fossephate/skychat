import MyRustLib2 from './NativeMyRustLib2';

export function multiply(a: number, b: number): number {
  return MyRustLib2.multiply(a, b);
}
