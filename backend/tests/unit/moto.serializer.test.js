import { MOTO_STATUS } from '@motorshop/shared';
import { describe, expect, it } from 'vitest';

import { serializePublicMotoDetail } from '../../src/modules/motos/moto.serializer.js';

const doc = (extra = {}) => ({
  _id: '64b000000000000000000001',
  __v: 0,
  brand: { _id: '64b000000000000000000002', name: 'Honda', slug: 'honda' },
  model: 'CB 500F',
  price: 3_000_000, // centavos
  previousPrice: 3_200_000,
  onSale: true,
  status: MOTO_STATUS.AVAILABLE,
  ...extra,
});

describe('serializePublicMotoDetail', () => {
  it('devolve o preço em reais para moto disponível', () => {
    const moto = serializePublicMotoDetail(doc());
    expect(moto.price).toBe(30_000);
    expect(moto.previousPrice).toBe(32_000);
  });

  it('mantém o preço de moto reservada', () => {
    expect(serializePublicMotoDetail(doc({ status: MOTO_STATUS.RESERVED })).price).toBe(30_000);
  });

  it('oculta preço e oferta de moto vendida (decisão A)', () => {
    const moto = serializePublicMotoDetail(doc({ status: MOTO_STATUS.SOLD }));
    expect(moto).toMatchObject({ price: null, previousPrice: null, onSale: false });
    expect(moto.model).toBe('CB 500F');
  });
});
