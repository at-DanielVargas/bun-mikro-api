// src/core/MikroResponse.ts

export class MikroResponse {
  static json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
  }

  static text(data: string, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(data, {
      status,
      headers: {
        'Content-Type': 'text/plain',
        ...headers,
      },
    });
  }

  static html(data: string, status = 200, headers: Record<string, string> = {}): Response {
    return new Response(data, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      },
    });
  }

  static error(message: string, status = 500, headers: Record<string, string> = {}): Response {
    return MikroResponse.json({ error: message }, status, headers);
  }

  static noContent(): Response {
    return new Response(null, { status: 204 });
  }

  static redirect(url: string, status = 302): Response {
    return Response.redirect(url, status);
  }
}
