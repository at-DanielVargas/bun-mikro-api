// src/swagger/SwaggerUI.ts
// Serves the Swagger UI HTML page and the OpenAPI JSON spec as CF Worker Responses.

import { SwaggerAuth } from './SwaggerAuth';
import { DocsPage } from './DocsPage';

export class SwaggerUI {
  private auth: SwaggerAuth;
  private docsPage: DocsPage;
  private docsHtmlPath: string;
  private swaggerVersion: string;

  constructor(
    private readonly spec: Record<string, unknown>,
    private readonly uiPath: string,
    private readonly jsonPath: string,
    auth?: SwaggerAuth,
    docsHtmlPath?: string,
    swaggerVersion?: string,
  ) {
    this.auth = auth ?? new SwaggerAuth();
    this.docsHtmlPath = docsHtmlPath ?? '/docs/guide';
    this.swaggerVersion = swaggerVersion ?? '5.17.14';
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

    // Detect if using legacy Swagger UI 2.x (versions < 3.0.0)
    const isLegacyVersion = this.isLegacySwaggerVersion(this.swaggerVersion);

    const html = isLegacyVersion 
      ? this.generateLegacyHtml(title, version, jsonUrl)
      : this.generateModernHtml(title, version, jsonUrl);

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  private isLegacySwaggerVersion(version: string): boolean {
    const majorVersion = parseInt(version.split('.')[0], 10);
    return majorVersion < 3;
  }

  private generateModernHtml(title: string, version: string, jsonUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} ${version} — Swagger UI</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${this.swaggerVersion}/swagger-ui.min.css">
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${this.swaggerVersion}/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${this.swaggerVersion}/swagger-ui-standalone-preset.min.js"></script>
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
  }

  private generateLegacyHtml(title: string, version: string, jsonUrl: string): string {
      const cdnBase = `https://cdn.jsdelivr.net/npm/swagger-ui@${this.swaggerVersion}/dist`;

      return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="x-ua-compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} ${version} — Swagger UI</title>
    <link href="${cdnBase}/css/typography.css" media="screen" rel="stylesheet" type="text/css"/>
    <link href="${cdnBase}/css/reset.css" media="screen" rel="stylesheet" type="text/css"/>
    <link href="${cdnBase}/css/screen.css" media="screen" rel="stylesheet" type="text/css"/>
    <link href="${cdnBase}/css/reset.css" media="print" rel="stylesheet" type="text/css"/>
    <link href="${cdnBase}/css/print.css" media="print" rel="stylesheet" type="text/css"/>
    <style>
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
    <script src="${cdnBase}/lib/object-assign-pollyfill.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/jquery-1.8.0.min.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/jquery.slideto.min.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/jquery.wiggle.min.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/jquery.ba-bbq.min.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/handlebars-4.0.5.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/lodash.min.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/backbone-min.js" type="text/javascript"></script>
    <script src="${cdnBase}/swagger-ui.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/highlight.9.1.0.pack.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/highlight.9.1.0.pack_extended.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/jsoneditor.min.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/marked.js" type="text/javascript"></script>
    <script src="${cdnBase}/lib/swagger-oauth.js" type="text/javascript"></script>
  </head>
  <body class="swagger-section">

  <div id='header'>
  <div class="swagger-ui-wrap">
    <a id="logo" href="http://swagger.io"><img class="logo__img" alt="swagger" height="30" width="30" src="${cdnBase}/images/logo_small.png" /><span class="logo__title">swagger</span></a>
    <form id='api_selector'>
      <div class='input'><input placeholder="http://example.com/api" id="input_baseUrl" name="baseUrl" type="text"/></div>
      <div id='auth_container'></div>
      <div class='input'><a id="explore" class="header__btn" href="#" data-sw-translate>Explore</a></div>
    </form>
  </div>
</div>
  
    <div id="message-bar" class="swagger-ui-wrap">&nbsp;</div>
    <div id="swagger-ui-container" class="swagger-ui-wrap"></div>

    <script type="text/javascript">
      $(function () {
        hljs.configure({
          highlightSizeThreshold: 5000
        });

        window.swaggerUi = new SwaggerUi({
          url: '${jsonUrl}',
          dom_id: "swagger-ui-container",
          supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
          onComplete: function(swaggerApi, swaggerUi) {
            console.log('Swagger UI loaded');
          },
          onFailure: function(data) {
            console.error('Unable to Load SwaggerUI', data);
          },
          defaultModelRendering: 'schema',
          jsonEditor: true,
          showRequestHeaders: false,
          showOperationIds: false
        });

        window.swaggerUi.load();
      });
    </script>
  </body>
  </html>`;
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
