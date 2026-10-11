let cached: boolean | undefined

/** Whether this browser can create a WebGL context. Checked once, and the test
    context is released straight away so it doesn't count against the limit. */
export function supportsWebGL() {
  if (cached !== undefined) return cached
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    cached = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}
