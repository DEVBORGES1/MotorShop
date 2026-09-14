import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';

const app = createApp();

describe('GET /api/health', () => {
  it('responde 200 com o envelope de sucesso', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.message).toBe('API is running');
  });

  it('reporta o estado do banco sem expor a conexão', async () => {
    const { body } = await request(app).get('/api/health');

    expect(body.data.database).toHaveProperty('status');
    expect(JSON.stringify(body)).not.toMatch(/mongodb(\+srv)?:\/\//);
  });
});

describe('GET /api', () => {
  it('informa que a API está no ar', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
