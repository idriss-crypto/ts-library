// TODO: use axios
export async function fetchSafe(input: RequestInfo, init?: RequestInit) {
  if ('fetch' in globalThis) return await fetch(input, init);
  else {
    const nodeFetch = await import('node-fetch');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return nodeFetch.default(input, init);
  }
}
