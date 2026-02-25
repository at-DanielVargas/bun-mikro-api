// src/swagger/SwaggerAuth.ts
// Basic authentication middleware for Swagger documentation

export interface SwaggerUser {
  username: string;
  password: string;
}

export class SwaggerAuth {
  private users: SwaggerUser[];

  constructor(users: SwaggerUser[] = []) {
    this.users = users;
  }

  /**
   * Add a user for basic authentication
   */
  addUser(username: string, password: string): this {
    this.users.push({ username, password });
    return this;
  }

  /**
   * Check if authentication is enabled
   */
  isEnabled(): boolean {
    return this.users.length > 0;
  }

  /**
   * Verify the Authorization header
   */
  verify(request: Request): boolean {
    if (!this.isEnabled()) return true;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return false;
    }

    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    
    // Split only on the first colon to handle passwords with colons
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) return false;
    
    const username = credentials.slice(0, colonIndex);
    const password = credentials.slice(colonIndex + 1);

    return this.users.some(
      (user) => user.username === username && user.password === password
    );
  }

  /**
   * Return 401 Unauthorized response with WWW-Authenticate header
   */
  unauthorizedResponse(): Response {
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Swagger Documentation", charset="UTF-8"',
        'Content-Type': 'text/plain',
      },
    });
  }
}
