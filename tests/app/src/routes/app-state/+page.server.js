export async function load({platform}) {
    let api = await (await platform?.request("/api/test"))?.json();
    return {api};
}