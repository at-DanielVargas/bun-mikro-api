// src/swagger/SwaggerUI.ts
// Serves the Swagger UI HTML page and the OpenAPI JSON spec as CF Worker Responses.

import { SwaggerAuth } from './SwaggerAuth';
import { DocsPage } from './DocsPage';

export class SwaggerUI {
  private auth: SwaggerAuth;
  private docsPage: DocsPage;
  private docsHtmlPath: string;

  constructor(
    private readonly spec: Record<string, unknown>,
    private readonly uiPath: string,
    private readonly jsonPath: string,
    auth?: SwaggerAuth,
    docsHtmlPath?: string,
  ) {
    this.auth = auth ?? new SwaggerAuth();
    this.docsHtmlPath = docsHtmlPath ?? '/docs/guide';
    this.docsPage = new DocsPage(spec, uiPath);
  }

  /** Returns true if the path is either the UI, JSON endpoint, or docs guide. */
  matches(path: string): boolean {
    return path === this.uiPath || path === this.jsonPath || path === this.docsHtmlPath;
  }

  /** Dispatch the appropriate response for the given path. */
  handle(path: string, request: Request): Response {
    // Check authentication
    if (!this.auth.verify(request)) {
      return this.auth.unauthorizedResponse();
    }

    if (path === this.jsonPath) {
      return this.serveJson();
    }
    
    if (path === this.docsHtmlPath) {
      return this.serveDocsPage(request);
    }
    
    return this.serveHtml();
  }

  /* ------------------------------------------------------------------ */

  private serveJson(): Response {
    return new Response(
      JSON.stringify(this.spec, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  private serveHtml(): Response {
    const title    = String(
      (this.spec['info'] as Record<string, unknown>)?.['title'] ?? 'API Docs',
    ).replace(/[<>"&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;' }[c] ?? c));
    const version  = String(
      (this.spec['info'] as Record<string, unknown>)?.['version'] ?? '',
    ).replace(/[<>"&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;' }[c] ?? c));
    const jsonUrl  = this.jsonPath;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} ${version} — Swagger UI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: sans-serif; }
    .topbar { display: none; }
    .docs-link {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #4F46E5;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      transition: background 0.2s;
    }
    .docs-link:hover {
      background: #4338CA;
    }
  </style>
</head>
<body>
  <a href="${this.docsHtmlPath}" class="docs-link">📖 Documentation Guide</a>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.min.js"></script>
  <script>
    SwaggerUIBundle({
      url:                  '${jsonUrl}',
      dom_id:               '#swagger-ui',
      presets:              [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout:               'StandaloneLayout',
      deepLinking:          true,
      tryItOutEnabled:      true,
      filter:               true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  private serveDocsPage(request: Request): Response {
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en';
    const html = this.docsPage.generate(lang);

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
