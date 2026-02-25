// src/swagger/SwaggerUI.ts
// Serves the Swagger UI HTML page and the OpenAPI JSON spec as CF Worker Responses.

export class SwaggerUI {
  constructor(
    private readonly spec: Record<string, unknown>,
    private readonly uiPath: string,
    private readonly jsonPath: string,
  ) {}

  /** Returns true if the path is either the UI or the JSON endpoint. */
  matches(path: string): boolean {
    return path === this.uiPath || path === this.jsonPath;
  }

  /** Dispatch the appropriate response for the given path. */
  handle(path: string): Response {
    return path === this.jsonPath ? this.serveJson() : this.serveHtml();
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
  </style>
</head>
<body>
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
}
