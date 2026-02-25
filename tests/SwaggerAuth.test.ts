// tests/SwaggerAuth.test.ts
import { describe, test, expect } from 'bun:test';
import { SwaggerAuth } from '../src/swagger/SwaggerAuth';

describe('SwaggerAuth', () => {
  test('should create instance without users', () => {
    const auth = new SwaggerAuth();
    expect(auth.isEnabled()).toBe(false);
  });

  test('should create instance with users', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'admin123' }
    ]);
    expect(auth.isEnabled()).toBe(true);
  });

  test('should add user', () => {
    const auth = new SwaggerAuth();
    expect(auth.isEnabled()).toBe(false);
    
    auth.addUser('admin', 'admin123');
    expect(auth.isEnabled()).toBe(true);
  });

  test('should verify valid credentials', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'admin123' }
    ]);

    const credentials = btoa('admin:admin123');
    const request = new Request('http://localhost/docs', {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    expect(auth.verify(request)).toBe(true);
  });

  test('should reject invalid credentials', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'admin123' }
    ]);

    const credentials = btoa('admin:wrongpassword');
    const request = new Request('http://localhost/docs', {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    expect(auth.verify(request)).toBe(false);
  });

  test('should reject missing authorization header', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'admin123' }
    ]);

    const request = new Request('http://localhost/docs');
    expect(auth.verify(request)).toBe(false);
  });

  test('should reject invalid authorization format', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'admin123' }
    ]);

    const request = new Request('http://localhost/docs', {
      headers: {
        'Authorization': 'Bearer token123'
      }
    });

    expect(auth.verify(request)).toBe(false);
  });

  test('should allow access when no users configured', () => {
    const auth = new SwaggerAuth();
    const request = new Request('http://localhost/docs');
    
    expect(auth.verify(request)).toBe(true);
  });

  test('should verify multiple users', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'admin123' },
      { username: 'dev', password: 'dev123' }
    ]);

    const adminCreds = btoa('admin:admin123');
    const adminRequest = new Request('http://localhost/docs', {
      headers: { 'Authorization': `Basic ${adminCreds}` }
    });

    const devCreds = btoa('dev:dev123');
    const devRequest = new Request('http://localhost/docs', {
      headers: { 'Authorization': `Basic ${devCreds}` }
    });

    expect(auth.verify(adminRequest)).toBe(true);
    expect(auth.verify(devRequest)).toBe(true);
  });

  test('should return 401 unauthorized response', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'admin123' }
    ]);

    const response = auth.unauthorizedResponse();
    
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('Basic realm');
  });

  test('should handle password with colon', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'pass:word:123' }
    ]);

    const credentials = btoa('admin:pass:word:123');
    const request = new Request('http://localhost/docs', {
      headers: { 'Authorization': `Basic ${credentials}` }
    });

    expect(auth.verify(request)).toBe(true);
  });

  test('should be case sensitive for username', () => {
    const auth = new SwaggerAuth([
      { username: 'Admin', password: 'admin123' }
    ]);

    const credentials = btoa('admin:admin123');
    const request = new Request('http://localhost/docs', {
      headers: { 'Authorization': `Basic ${credentials}` }
    });

    expect(auth.verify(request)).toBe(false);
  });

  test('should be case sensitive for password', () => {
    const auth = new SwaggerAuth([
      { username: 'admin', password: 'Admin123' }
    ]);

    const credentials = btoa('admin:admin123');
    const request = new Request('http://localhost/docs', {
      headers: { 'Authorization': `Basic ${credentials}` }
    });

    expect(auth.verify(request)).toBe(false);
  });
});
