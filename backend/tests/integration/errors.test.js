import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';

const app = createApp();

describe('tratamento de erros', () => {
  it('retorna 404 no envelope padrão para rota inexistente', async () => {
    const response = await request(app).get('/api/rota-que-nao-existe');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.requestId).toBeTruthy();
  });

  it('retorna 400 para JSON malformado', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"quebrado":');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('retorna 413 para payload acima do limite', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(200 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body.success).toBe(false);
  });

  it('aplica os cabeçalhos de segurança do helmet', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers).not.toHaveProperty('x-powered-by');
  });

  it('recusa origem não permitida pelo CORS', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://origem-nao-autorizada.example');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('aceita a origem configurada em FRONTEND_URL', async () => {
    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('indisponibilidade do banco', () => {
  it('responde 503 imediatamente quando o banco não está pronto, sem esperar o timeout', async () => {
    const inicio = Date.now();
    const response = await request(app).get('/api/motos');
    const decorridoMs = Date.now() - inicio;

    // Sem a guarda, o Mongoose enfileiraria o comando e só falharia após 10 s.
    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/banco de dados/i);
    expect(decorridoMs).toBeLessThan(1000);
  });
});
