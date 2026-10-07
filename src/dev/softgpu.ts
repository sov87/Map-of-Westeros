/**
 * Smoke-test shim for GPU-less hosts (`?softgpu=1`: cloud sessions, CI — never stills or film).
 *
 * three r186 always passes the identity texture-view `swizzle: 'rgba'` (the string form of the current
 * spec). Older Chromium builds (e.g. Playwright's bundled Chromium 141 on Linux) type that member as the
 * draft's GPUTextureComponentSwizzle dictionary and reject the string, so no bind group can be created.
 * Dropping the identity swizzle changes nothing about sampling; the shim is installed only in software-GPU
 * smoke mode, so hardware renders (Chrome 154+) run three unmodified.
 */
export function installSoftGpuShims(): void {
  const T = (globalThis as { GPUTexture?: { prototype: { createView: (d?: GPUTextureViewDescriptor) => GPUTextureView } } }).GPUTexture;
  if (!T) return;
  const createView = T.prototype.createView;
  T.prototype.createView = function (this: GPUTexture, desc?: GPUTextureViewDescriptor) {
    const d = desc as (GPUTextureViewDescriptor & { swizzle?: unknown }) | undefined;
    if (d && d.swizzle === 'rgba') {
      const { swizzle: _identity, ...rest } = d;
      return createView.call(this, rest);
    }
    return createView.call(this, desc);
  };
}
