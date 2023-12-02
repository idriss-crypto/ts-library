export async function fetchSafe (input: RequestInfo, init?: RequestInit): Promise<Response> {
  if ('fetch' in globalThis) { return await fetch(input, init) } else { // @ts-expect-error
    return await (await import('node-fetch')).default(input, init)
  }
}
