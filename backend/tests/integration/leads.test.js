import { CONSENT_TEXT_VERSION, LEAD_STATUS, MOTO_STATUS, USER_ROLE } from '@motorshop/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { RefreshToken } from '../../src/modules/auth/refreshToken.model.js';
import { Brand } from '../../src/modules/brands/brand.model.js';
import { Lead } from '../../src/modules/leads/lead.model.js';
import { Moto } from '../../src/modules/motos/moto.model.js';
import { StoreSettings } from '../../src/modules/store/store.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { autenticar, comToken, criarUsuario } from '../helpers/auth.js';
import { connect, disconnect, skipWithoutDb } from '../helpers/db.js';

const app = createApp();

const consent = { accepted: true, textVersion: CONSENT_TEXT_VERSION };
const contato = { name: 'Maria Silva', phone: '(49) 99999-8888', consent };

function criarMoto(brandId, overrides = {}) {
  return Moto.create({
    brand: brandId,
    model: 'CB 500F',
    year: 2024,
    mileage: 4200,
    price: 3_890_000,
    engineCapacity: 471,
    fuel: 'FLEX',
    transmission: 'MANUAL',
    color: 'Vermelha',
    slug: `moto-${Math.random().toString(16).slice(2, 10)}`,
    ...overrides,
  });
}

const enviar = (corpo) => request(app).post('/api/leads').send(corpo);

describe.skipIf(skipWithoutDb)('API de leads', () => {
  let honda;

  beforeAll(connect);
  afterAll(disconnect);

  beforeEach(async () => {
    await Promise.all([
      Lead.deleteMany({}),
      Moto.deleteMany({}),
      Brand.deleteMany({}),
      User.deleteMany({}),
      RefreshToken.deleteMany({}),
      StoreSettings.deleteMany({}),
    ]);
    honda = await Brand.create({ name: 'Honda', slug: 'honda' });
    await StoreSettings.create({
      name: 'Loja Teste',
      financing: {
        monthlyRate: 1.79,
        installmentOptions: [12, 24, 36, 48],
        minDownPaymentPercent: 20,
      },
    });
  });

  async function tokenDe(role = USER_ROLE.ADMIN) {
    const email = `${role.toLowerCase()}@teste.com`;
    await criarUsuario({ email, role, name: role === USER_ROLE.ADMIN ? 'Ana' : 'Super' });
    return (await autenticar(app, { email })).accessToken;
  }

  describe('POST /api/leads', () => {
    it('cria os quatro tipos e grava cada um corretamente', async () => {
      const moto = await criarMoto(honda._id);

      const corpos = [
        { ...contato, type: 'MOTO_INTEREST', moto: String(moto._id) },
        {
          ...contato,
          phone: '49 98888-7777',
          type: 'SELL_MOTO',
          data: {
            brand: 'Yamaha',
            model: 'Fazer',
            year: 2019,
            mileage: 28000,
            expectedPrice: 14000,
          },
        },
        { ...contato, phone: '49 97777-6666', type: 'CONTACT', message: 'Vocês aceitam troca?' },
        {
          ...contato,
          phone: '49 96666-5555',
          type: 'FINANCING',
          data: { vehiclePrice: 38900, downPayment: 8000, installments: 36 },
        },
      ];

      for (const corpo of corpos) {
        const response = await enviar(corpo);
        expect(response.status, corpo.type).toBe(201);
      }

      const leads = await Lead.find().lean();
      expect(leads).toHaveLength(4);

      const venda = leads.find((lead) => lead.type === 'SELL_MOTO');
      expect(venda.data.expectedPrice).toBe(1_400_000); // centavos
      expect(venda.phone).toBe('+5549988887777');
      expect(venda.status).toBe(LEAD_STATUS.NEW);
    });

    it('simulação vira lead FINANCING com a parcela calculada pelo servidor', async () => {
      const moto = await criarMoto(honda._id);

      const response = await enviar({
        ...contato,
        type: 'FINANCING',
        moto: String(moto._id),
        data: { vehiclePrice: 30000, downPayment: 6000, installments: 48 },
      });

      expect(response.status).toBe(201);
      const lead = await Lead.findOne().lean();
      expect(String(lead.moto)).toBe(String(moto._id));
      expect(lead.data).toEqual({
        vehiclePrice: 3_000_000,
        downPayment: 600_000,
        installments: 48,
        monthlyRate: 1.79,
        installmentValue: 74_939,
      });
    });

    it('422 para simulação fora das regras da loja', async () => {
      const fora = (data) => enviar({ ...contato, type: 'FINANCING', data });

      expect(
        (await fora({ vehiclePrice: 30000, downPayment: 6000, installments: 60 })).status,
      ).toBe(422);
      expect(
        (await fora({ vehiclePrice: 30000, downPayment: 1000, installments: 48 })).status,
      ).toBe(422);
      expect(await Lead.countDocuments()).toBe(0);
    });

    it('lead de interesse referencia a moto certa', async () => {
      const moto = await criarMoto(honda._id);

      await enviar({ ...contato, type: 'MOTO_INTEREST', moto: String(moto._id) });

      const lead = await Lead.findOne().lean();
      expect(String(lead.moto)).toBe(String(moto._id));
    });

    it('422 para tipo inválido ou data incompatível com o tipo', async () => {
      expect((await enviar({ ...contato, type: 'SPAM' })).status).toBe(422);
      expect(
        (await enviar({ ...contato, type: 'CONTACT', message: 'Olá!!', data: { brand: 'x' } }))
          .status,
      ).toBe(422);
      expect(await Lead.countDocuments()).toBe(0);
    });

    it('422 para interesse em moto INACTIVE', async () => {
      const moto = await criarMoto(honda._id, { status: MOTO_STATUS.INACTIVE });
      const response = await enviar({ ...contato, type: 'MOTO_INTEREST', moto: String(moto._id) });
      expect(response.status).toBe(422);
    });

    it('honeypot preenchido: 201, mas nada é gravado', async () => {
      const response = await enviar({
        ...contato,
        type: 'CONTACT',
        message: 'Compre seguidores',
        website: 'http://spam.example',
      });

      expect(response.status).toBe(201);
      expect(await Lead.countDocuments()).toBe(0);
    });

    it('grava consentimento com data e versão, e a origem', async () => {
      await enviar({
        ...contato,
        type: 'CONTACT',
        message: 'Olá, tudo bem?',
        source: { page: '/contato', referrer: 'https://google.com/', utm: { source: 'google' } },
      });

      const lead = await Lead.findOne().lean();
      expect(lead.consent.accepted).toBe(true);
      expect(lead.consent.textVersion).toBe(CONSENT_TEXT_VERSION);
      expect(lead.consent.at).toBeInstanceOf(Date);
      expect(lead.source.page).toBe('/contato');
      expect(lead.source.utm.source).toBe('google');
    });

    it('reenvio logo em seguida não cria um segundo lead', async () => {
      const corpo = { ...contato, type: 'CONTACT', message: 'Olá, tudo bem?' };

      const primeiro = await enviar(corpo);
      const segundo = await enviar(corpo);

      expect(segundo.status).toBe(201);
      expect(segundo.body.data.id).toBe(primeiro.body.data.id);
      expect(await Lead.countDocuments()).toBe(1);
    });

    it('não devolve telefone nem e-mail na resposta', async () => {
      const response = await enviar({
        ...contato,
        email: 'maria@exemplo.com',
        type: 'CONTACT',
        message: 'Olá, tudo bem?',
      });

      expect(JSON.stringify(response.body)).not.toMatch(/99999|maria@exemplo/);
    });
  });

  describe('rotas administrativas', () => {
    it('401 sem token', async () => {
      expect((await request(app).get('/api/admin/leads')).status).toBe(401);
    });

    it('lista do mais recente para o mais antigo, com a moto e valores em reais', async () => {
      const moto = await criarMoto(honda._id);
      await enviar({ ...contato, type: 'MOTO_INTEREST', moto: String(moto._id) });
      await enviar({
        ...contato,
        phone: '49 98888-7777',
        type: 'SELL_MOTO',
        data: { brand: 'Yamaha', model: 'Fazer', year: 2019, mileage: 28000, expectedPrice: 14000 },
      });
      const token = await tokenDe();

      const { body } = await comToken(request(app).get('/api/admin/leads'), token);

      expect(body.meta.total).toBe(2);
      expect(body.data[0].type).toBe('SELL_MOTO');
      expect(body.data[0].data.expectedPrice).toBe(14000);
      expect(body.data[1].moto).toMatchObject({ model: 'CB 500F', brand: { name: 'Honda' } });
      expect(body.data[1].phone).toBe('+5549999998888');
    });

    it('filtra por tipo, status e período', async () => {
      await enviar({ ...contato, type: 'CONTACT', message: 'Olá, tudo bem?' });
      await enviar({ ...contato, phone: '49 98888-7777', type: 'CONTACT', message: 'Outro' });
      await Lead.updateOne({ phone: '+5549988887777' }, { status: LEAD_STATUS.WON });
      const token = await tokenDe();
      const listar = (query) => comToken(request(app).get(`/api/admin/leads${query}`), token);

      expect((await listar('?tipo=SELL_MOTO')).body.meta.total).toBe(0);
      expect((await listar('?tipo=CONTACT')).body.meta.total).toBe(2);
      expect((await listar('?status=WON')).body.meta.total).toBe(1);

      const amanha = new Date(Date.now() + 86_400_000).toISOString();
      expect((await listar(`?de=${amanha}`)).body.meta.total).toBe(0);
      expect((await listar('?tipo=INVENTADO')).status).toBe(422);
    });

    it('muda o status e acrescenta anotação assinada', async () => {
      await enviar({ ...contato, type: 'CONTACT', message: 'Olá, tudo bem?' });
      const lead = await Lead.findOne();
      const token = await tokenDe();

      const { body } = await comToken(
        request(app).patch(`/api/admin/leads/${lead._id}`),
        token,
      ).send({ status: 'IN_PROGRESS', note: 'Liguei, retorna amanhã' });

      expect(body.data.status).toBe('IN_PROGRESS');
      expect(body.data.notes).toHaveLength(1);
      expect(body.data.notes[0]).toMatchObject({
        text: 'Liguei, retorna amanhã',
        authorName: 'Ana',
      });
    });

    it('ADMIN não exclui; SUPER_ADMIN exclui de verdade', async () => {
      await enviar({ ...contato, type: 'CONTACT', message: 'Olá, tudo bem?' });
      const lead = await Lead.findOne();

      const admin = await tokenDe(USER_ROLE.ADMIN);
      const negado = await comToken(request(app).delete(`/api/admin/leads/${lead._id}`), admin);
      expect(negado.status).toBe(403);
      expect(await Lead.countDocuments()).toBe(1);

      const superAdmin = await tokenDe(USER_ROLE.SUPER_ADMIN);
      const excluido = await comToken(
        request(app).delete(`/api/admin/leads/${lead._id}`),
        superAdmin,
      );
      expect(excluido.status).toBe(204);
      expect(await Lead.countDocuments()).toBe(0);
    });
  });
});
