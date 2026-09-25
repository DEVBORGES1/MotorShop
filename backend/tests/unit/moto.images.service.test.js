import { describe, expect, it, vi } from 'vitest';

// Sem provedor configurado (STORAGE_PROVIDER=none).
vi.mock('../../src/infra/storage/index.js', () => ({
  getStorage: () => null,
  storageFolder: 'teste',
}));
vi.mock('../../src/modules/motos/moto.service.js', () => ({
  getByIdAdmin: vi.fn(async () => ({ id: 'x', images: [] })),
}));

const imageService = await import('../../src/modules/motos/moto.images.service.js');
const uploadService = await import('../../src/modules/uploads/upload.service.js');

describe('sem provedor de armazenamento', () => {
  it('assinatura responde 503 com instrução, não 500', async () => {
    await expect(uploadService.createSignature({ motoId: 'x' })).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringMatching(/STORAGE_PROVIDER/),
    });
  });

  it('vincular foto responde 503', async () => {
    await expect(imageService.attachImage('x', {})).rejects.toMatchObject({ statusCode: 503 });
  });

  it('a pasta de cada moto fica sob a pasta-raiz configurada', () => {
    expect(imageService.folderForMoto('abc')).toBe('teste/motos/abc');
  });
});
