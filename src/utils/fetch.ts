// TODO: use axios
export async function fetchSafe(input: RequestInfo, init?: RequestInit) {
    if ('fetch' in globalThis)
        return await fetch(input, init)
    else
        { // @ts-ignore
            return (await import("node-fetch")).default(input, init)
        }
}
