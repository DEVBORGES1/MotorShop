import { describe, expect, it } from 'vitest';

import { consultaDoMapa, statusDeAbertura, urlDeRota, urlDoMapaIncorporado } from './loja.js';

const comercial = (weekday) => ({ weekday, opensAt: '08:00', closesAt: '18:00', closed: false });
const fechado = (weekday) => ({ weekday, opensAt: null, closesAt: null, closed: true });

/** Segunda a sexta 08–18, sábado 08–12, domingo fechado. */
const semana = [
  ...[1, 2, 3, 4, 5].map(comercial),
  { weekday: 6, opensAt: '08:00', closesAt: '12:00', closed: false },
  fechado(0),
];

/** 2026-09-28 é segunda-feira; horário local, como o navegador do visitante. */
const em = (dia, hora, minuto = 0) => new Date(2026, 8, dia, hora, minuto);

describe('statusDeAbertura', () => {
  it('dentro do horário: aberto, com a hora de fechar', () => {
    expect(statusDeAbertura(semana, em(28, 10, 30))).toEqual({
      aberto: true,
      texto: 'Aberto agora · fecha às 18:00',
    });
  });

  it('a abertura conta, o fechamento não (18:00 já está fechado)', () => {
    expect(statusDeAbertura(semana, em(28, 8, 0)).aberto).toBe(true);
    expect(statusDeAbertura(semana, em(28, 18, 0)).aberto).toBe(false);
  });

  it('antes de abrir no mesmo dia: abre hoje', () => {
    expect(statusDeAbertura(semana, em(28, 6, 15))).toEqual({
      aberto: false,
      texto: 'Fechado agora · abre hoje às 08:00',
    });
  });

  it('depois de fechar: abre amanhã', () => {
    expect(statusDeAbertura(semana, em(28, 19)).texto).toBe('Fechado agora · abre amanhã às 08:00');
  });

  it('sexta à noite: abre amanhã, no sábado', () => {
    expect(statusDeAbertura(semana, em(25, 20)).texto).toBe('Fechado agora · abre amanhã às 08:00');
  });

  it('sábado depois do meio-dia: o próximo dia aberto é a segunda', () => {
    expect(statusDeAbertura(semana, em(26, 13)).texto).toBe('Fechado agora · abre Seg às 08:00');
  });

  it('domingo fechado: abre amanhã (segunda)', () => {
    expect(statusDeAbertura(semana, em(27, 11)).texto).toBe('Fechado agora · abre amanhã às 08:00');
  });

  it('sem horário nenhum (ou semana toda fechada), não afirma nada', () => {
    expect(statusDeAbertura([], em(28, 10))).toBeNull();
    expect(statusDeAbertura(undefined, em(28, 10))).toBeNull();
    expect(statusDeAbertura([0, 1, 2].map(fechado), em(28, 10))).toBeNull();
  });
});

describe('endereço no mapa', () => {
  const endereco = {
    street: 'Rua das Motos',
    number: '10',
    district: 'Centro',
    city: 'Chapecó',
    state: 'SC',
  };

  it('monta a consulta com rua, número, bairro, cidade e estado', () => {
    expect(consultaDoMapa(endereco)).toBe('Rua das Motos, 10, Centro, Chapecó, SC');
  });

  it('sem rua não há o que marcar no mapa', () => {
    expect(consultaDoMapa({ city: 'Chapecó', state: 'SC' })).toBeNull();
    expect(urlDoMapaIncorporado({ city: 'Chapecó' })).toBeNull();
    expect(urlDeRota({})).toBeNull();
  });

  it('o mapa incorporado codifica o endereço na URL', () => {
    const url = urlDoMapaIncorporado(endereco);

    expect(url.startsWith('https://www.google.com/maps?q=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Rua das Motos, 10'));
    expect(url).toContain('output=embed');
  });

  it('"como chegar" prefere o link que o lojista configurou', () => {
    const mapsUrl = 'https://maps.app.goo.gl/abc';
    expect(urlDeRota({ ...endereco, mapsUrl })).toBe(mapsUrl);
    expect(urlDeRota(endereco)).toContain('google.com/maps/search/?api=1&query=');
  });

  it('o mapa incorporado prefere o link de "Incorporar mapa" do lojista', () => {
    const mapsEmbedUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12';
    expect(urlDoMapaIncorporado({ ...endereco, mapsEmbedUrl })).toBe(mapsEmbedUrl);
  });
});
