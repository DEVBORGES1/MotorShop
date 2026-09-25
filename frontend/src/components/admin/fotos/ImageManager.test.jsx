// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fotosAdmin } from '@/services/adminService.js';
import { enviarAoProvedor } from '@/services/uploadService.js';
import { renderizar, VENDEDOR } from '@/test/renderizar.jsx';

import { ImageManager } from './ImageManager.jsx';

vi.mock('@/services/adminService.js', () => ({
  fotosAdmin: {
    assinatura: vi.fn(),
    vincular: vi.fn(),
    ordenar: vi.fn(),
    alterar: vi.fn(),
    remover: vi.fn(),
  },
}));
vi.mock('@/services/uploadService.js', () => ({
  enviarAoProvedor: vi.fn(),
  metadadosDoEnvio: (resposta) => ({ publicId: resposta.public_id }),
}));

const foto = (n, extra = {}) => ({
  id: `f${n}`,
  url: `https://img.test/f${n}.jpg`,
  order: n - 1,
  ...extra,
});
const moto = (images, mainImageId = images[0]?.id ?? null) => ({ images, mainImageId });
const arquivo = (nome, tipo = 'image/jpeg', bytes = 1000) =>
  new File([new Uint8Array(bytes)], nome, { type: tipo });

function gestor(imagens = [foto(1), foto(2), foto(3)]) {
  return renderizar(
    <ImageManager
      motoId="m1"
      imagensIniciais={imagens}
      principalInicial={imagens[0]?.id ?? null}
    />,
    { usuario: VENDEDOR },
  );
}

const ordemNaTela = () => screen.getAllByRole('img').map((img) => img.getAttribute('src'));

describe('ImageManager (fotos da moto no painel)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:previa');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fotosAdmin.assinatura.mockResolvedValue({ uploadUrl: 'https://upload.test', fields: {} });
  });

  it('envia várias fotos com UMA assinatura e mostra cada uma ao terminar', async () => {
    let n = 0;
    enviarAoProvedor.mockImplementation(async () => {
      n += 1;
      return { public_id: `loja/motos/m1/p${n}` };
    });
    fotosAdmin.vincular
      .mockResolvedValueOnce(moto([foto(1)]))
      .mockResolvedValueOnce(moto([foto(1), foto(2)]));
    const { user } = gestor([]);

    await user.upload(screen.getByLabelText(/Arraste as fotos aqui/), [
      arquivo('frente.jpg'),
      arquivo('lateral.jpg'),
    ]);

    await waitFor(() => expect(screen.getByText('2 de 20 fotos.', { exact: false })).toBeTruthy());
    expect(fotosAdmin.assinatura).toHaveBeenCalledTimes(1);
    expect(enviarAoProvedor).toHaveBeenCalledTimes(2);
    expect(fotosAdmin.vincular).toHaveBeenCalledWith('m1', { publicId: 'loja/motos/m1/p1' });
    expect(screen.getByText('Principal')).toBeTruthy();
  });

  it('arquivo que não é imagem é recusado antes de enviar, com o motivo', async () => {
    gestor([]);
    // Sem o filtro do `accept`: arrastar um arquivo ignora o seletor do navegador.
    const user = userEvent.setup({ applyAccept: false });

    await user.upload(screen.getByLabelText(/Arraste as fotos aqui/), [
      arquivo('contrato.pdf', 'application/pdf'),
    ]);

    expect(await screen.findByText(/contrato\.pdf:/)).toBeTruthy();
    expect(fotosAdmin.assinatura).not.toHaveBeenCalled();
  });

  it('falha no provedor: a foto fica na fila com o erro e pode ser removida', async () => {
    enviarAoProvedor.mockRejectedValue(new Error('Falha de rede no envio'));
    const { user } = gestor([]);

    await user.upload(screen.getByLabelText(/Arraste as fotos aqui/), [arquivo('frente.jpg')]);

    expect(await screen.findByText('Falha de rede no envio')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Remover' }));
    expect(screen.queryByText('Falha de rede no envio')).toBeNull();
  });

  it('assinatura recusada: nada é enviado e o erro aparece', async () => {
    fotosAdmin.assinatura.mockRejectedValue(new Error('Armazenamento de imagens não configurado'));
    const { user } = gestor([]);

    await user.upload(screen.getByLabelText(/Arraste as fotos aqui/), [arquivo('frente.jpg')]);

    expect(await screen.findByText('Armazenamento de imagens não configurado')).toBeTruthy();
    expect(enviarAoProvedor).not.toHaveBeenCalled();
  });

  it('mover para frente grava a nova ordem', async () => {
    fotosAdmin.ordenar.mockImplementation(async (_, { order, mainImageId }) =>
      moto(
        order.map((id, i) => ({ ...foto(Number(id.slice(1))), order: i })),
        mainImageId,
      ),
    );
    const { user } = gestor();

    await user.click(screen.getByRole('button', { name: 'Mover foto 1 de 3 para frente' }));

    expect(fotosAdmin.ordenar).toHaveBeenCalledWith('m1', {
      order: ['f2', 'f1', 'f3'],
      mainImageId: 'f1',
    });
    await waitFor(() => expect(ordemNaTela()[0]).toContain('f2'));
  });

  it('tornar principal grava a nova capa', async () => {
    fotosAdmin.ordenar.mockResolvedValue(moto([foto(1), foto(2), foto(3)], 'f3'));
    const { user } = gestor();

    await user.click(screen.getAllByRole('button', { name: 'Tornar principal' })[1]);

    expect(fotosAdmin.ordenar).toHaveBeenCalledWith('m1', {
      order: ['f1', 'f2', 'f3'],
      mainImageId: 'f3',
    });
  });

  it('falha ao reordenar volta a ordem de antes e explica', async () => {
    fotosAdmin.ordenar.mockRejectedValue(new Error('As fotos mudaram desde que a tela foi aberta'));
    const { user } = gestor();

    await user.click(screen.getByRole('button', { name: 'Mover foto 1 de 3 para frente' }));

    expect(await screen.findByText('As fotos mudaram desde que a tela foi aberta')).toBeTruthy();
    expect(ordemNaTela()[0]).toContain('f1');
  });

  it('descrição da foto é salva ao sair do campo', async () => {
    fotosAdmin.alterar.mockResolvedValue(moto([foto(1, { alt: 'Lateral' }), foto(2), foto(3)]));
    const { user } = gestor();

    await user.type(screen.getByLabelText('Descrição da foto 1 de 3'), ' Lateral ');
    await user.tab();

    expect(fotosAdmin.alterar).toHaveBeenCalledWith('m1', 'f1', { alt: 'Lateral' });
  });

  it('excluir pede confirmação e remove', async () => {
    fotosAdmin.remover.mockResolvedValue(moto([foto(2), foto(3)]));
    const { user } = gestor();

    await user.click(screen.getByRole('button', { name: 'Excluir foto 1 de 3' }));

    expect(window.confirm.mock.lastCall[0]).toMatch(/apagado do armazenamento/);
    expect(fotosAdmin.remover).toHaveBeenCalledWith('m1', 'f1');
    await waitFor(() => expect(screen.getByText('2 de 20 fotos.', { exact: false })).toBeTruthy());
  });

  it('com 20 fotos, some a área de envio', () => {
    gestor(Array.from({ length: 20 }, (_, i) => foto(i + 1)));

    expect(screen.queryByText(/Arraste as fotos aqui/)).toBeNull();
  });
});
