import { CONSENT_TEXT_VERSION, LEAD_TYPE } from '@motorshop/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/modules/leads/lead.repository.js', () => ({
  create: vi.fn(),
  findRecentDuplicate: vi.fn(),
}));
vi.mock('../../src/modules/motos/moto.repository.js', () => ({
  existsPublic: vi.fn(),
}));
vi.mock('../../src/modules/store/store.repository.js', () => ({
  findPublic: vi.fn(),
}));

const { logger } = await import('../../src/config/logger.js');
const repository = await import('../../src/modules/leads/lead.repository.js');
const motoRepository = await import('../../src/modules/motos/moto.repository.js');
const storeRepository = await import('../../src/modules/store/store.repository.js');
const service = await import('../../src/modules/leads/lead.service.js');

const agora = new Date('2026-09-25T15:00:00Z');
const motoId = '64b000000000000000000001';

const entrada = (extra = {}) => ({
  type: LEAD_TYPE.CONTACT,
  name: 'Maria Silva',
  phone: '+5549999998888',
  email: 'maria@exemplo.com',
  message: 'Olá, vocês aceitam troca?',
  consent: { accepted: true, textVersion: CONSENT_TEXT_VERSION },
  source: { page: '/contato' },
  ...extra,
});

describe('lead.service.create', () => {
  let logInfo;

  beforeEach(() => {
    vi.clearAllMocks();
    logInfo = vi.spyOn(logger, 'info').mockImplementation(() => {});
    repository.findRecentDuplicate.mockResolvedValue(null);
    repository.create.mockImplementation(async (doc) => ({
      ...doc,
      _id: 'a'.repeat(24),
      createdAt: agora,
    }));
    motoRepository.existsPublic.mockResolvedValue(true);
    storeRepository.findPublic.mockResolvedValue({
      financing: {
        monthlyRate: 1.79,
        installmentOptions: [12, 24, 36, 48],
        minDownPaymentPercent: 20,
      },
    });
  });

  it('grava o consentimento com data do servidor e versão aceita', async () => {
    await service.create(entrada(), { now: agora });

    const gravado = repository.create.mock.calls[0][0];
    expect(gravado.consent).toEqual({
      accepted: true,
      at: agora,
      textVersion: CONSENT_TEXT_VERSION,
    });
    expect(gravado.source).toEqual({ page: '/contato' });
  });

  it('responde só com a confirmação, sem ecoar telefone nem e-mail', async () => {
    const resposta = await service.create(entrada(), { now: agora });

    expect(resposta).toEqual({ id: 'a'.repeat(24), type: LEAD_TYPE.CONTACT, createdAt: agora });
  });

  it('não registra telefone, e-mail nem nome no log (R-08)', async () => {
    await service.create(entrada(), { now: agora });

    const logado = JSON.stringify(logInfo.mock.calls);
    expect(logado).toContain('Lead criado');
    expect(logado).not.toContain('99999');
    expect(logado).not.toContain('maria@exemplo.com');
    expect(logado).not.toContain('Maria');
  });

  it('honeypot preenchido: responde sucesso e não grava nada', async () => {
    const resposta = await service.create(entrada({ website: 'http://spam' }), { now: agora });

    expect(repository.create).not.toHaveBeenCalled();
    expect(resposta.id).toMatch(/^[0-9a-f]{24}$/);
    expect(resposta.type).toBe(LEAD_TYPE.CONTACT);
  });

  it('envio repetido em instantes devolve o lead existente em vez de criar outro', async () => {
    repository.findRecentDuplicate.mockResolvedValue({
      _id: 'b'.repeat(24),
      type: LEAD_TYPE.CONTACT,
      createdAt: agora,
    });

    const resposta = await service.create(entrada(), { now: agora });

    expect(repository.create).not.toHaveBeenCalled();
    expect(resposta.id).toBe('b'.repeat(24));
    // A janela é contada a partir de agora, para trás.
    const { since } = repository.findRecentDuplicate.mock.calls[0][0];
    expect(since.getTime()).toBeLessThan(agora.getTime());
  });

  it('recusa lead de interesse em moto que não está visível ao público', async () => {
    motoRepository.existsPublic.mockResolvedValue(false);

    await expect(
      service.create(entrada({ type: LEAD_TYPE.MOTO_INTEREST, moto: motoId }), { now: agora }),
    ).rejects.toMatchObject({ statusCode: 422 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('guarda valores de venda em centavos (D-04)', async () => {
    await service.create(
      entrada({
        type: LEAD_TYPE.SELL_MOTO,
        message: undefined,
        data: {
          brand: 'Honda',
          model: 'CG 160',
          year: 2020,
          mileage: 30000,
          expectedPrice: 12500.5,
        },
      }),
      { now: agora },
    );

    expect(repository.create.mock.calls[0][0].data.expectedPrice).toBe(1_250_050);
    // Quilometragem não é dinheiro: fica como veio.
    expect(repository.create.mock.calls[0][0].data.mileage).toBe(30000);
  });

  describe('financiamento', () => {
    const simulacao = (data) => entrada({ type: LEAD_TYPE.FINANCING, message: undefined, data });

    it('recalcula a parcela com a taxa do servidor e grava taxa e parcela', async () => {
      await service.create(
        simulacao({ vehiclePrice: 30000, downPayment: 6000, installments: 48 }),
        { now: agora },
      );

      const { data } = repository.create.mock.calls[0][0];
      // Centavos (D-04). Parcela de referência: R$ 749,39 a 1,79% a.m. em 48x.
      expect(data).toEqual({
        vehiclePrice: 3_000_000,
        downPayment: 600_000,
        installments: 48,
        monthlyRate: 1.79,
        installmentValue: 74_939,
      });
    });

    it('recusa prazo que a loja não oferece', async () => {
      await expect(
        service.create(simulacao({ vehiclePrice: 30000, downPayment: 6000, installments: 60 }), {
          now: agora,
        }),
      ).rejects.toMatchObject({ statusCode: 422 });
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('recusa entrada abaixo do mínimo da loja', async () => {
      await expect(
        service.create(simulacao({ vehiclePrice: 30000, downPayment: 1000, installments: 48 }), {
          now: agora,
        }),
      ).rejects.toMatchObject({ statusCode: 422 });
    });

    it('recusa simulação quando a loja não configurou financiamento', async () => {
      storeRepository.findPublic.mockResolvedValue(null);
      await expect(
        service.create(simulacao({ vehiclePrice: 30000, downPayment: 6000, installments: 48 }), {
          now: agora,
        }),
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });
});
