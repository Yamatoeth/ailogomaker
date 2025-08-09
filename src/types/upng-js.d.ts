declare module 'upng-js' {
  export function encode(rgbaBuffers: ArrayBuffer[], width: number, height: number, colorDepth?: number, delays?: number[]): ArrayBuffer;
  export function decode(buffer: ArrayBuffer): any;
  export function toRGBA8(decoded: any): ArrayBuffer[];
  const _default: { encode: typeof encode; decode: typeof decode; toRGBA8: typeof toRGBA8 };
  export default _default;
}
