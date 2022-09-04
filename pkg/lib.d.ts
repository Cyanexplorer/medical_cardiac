/* tslint:disable */
/* eslint-disable */
/**
*/
export class MarchingCubes {
  free(): void;
/**
* @returns {MarchingCubes}
*/
  static new(): MarchingCubes;
/**
* @param {Uint8Array} volume
* @param {number} dims_u
* @param {number} dims_v
* @param {number} dims_d
* @param {number} ratio
*/
  set_volume(volume: Uint8Array, dims_u: number, dims_v: number, dims_d: number, ratio: number): void;
/**
* @param {number} ratio
*/
  set_cube(ratio: number): void;
/**
* @param {number} ratio
* @returns {Float32Array}
*/
  marching_cubes(ratio: number): Float32Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_marchingcubes_free: (a: number) => void;
  readonly marchingcubes_new: () => number;
  readonly marchingcubes_set_volume: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly marchingcubes_set_cube: (a: number, b: number) => void;
  readonly marchingcubes_marching_cubes: (a: number, b: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        