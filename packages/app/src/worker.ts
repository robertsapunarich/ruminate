export interface Env {
  ASSETS: Fetcher;
  API: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route API and auth requests to the API service binding
    if (path.startsWith("/api/") || path.startsWith("/auth/")) {
      return env.API.fetch(request as any);
    }

    // First, try to serve the static asset from ASSETS
    const assetResponse = await env.ASSETS.fetch(request as any);

    // If the asset exists and is not a 404, return it
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // If it's a 404, serve index.html for SPA routing
    // This handles routes like /settings, /feeds, etc.
    const indexRequest = new Request(`${url.origin}/index.html`, request);
    return env.ASSETS.fetch(indexRequest as any);
  },
};
