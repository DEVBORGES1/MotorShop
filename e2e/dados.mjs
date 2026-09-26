/**
 * Dados do ambiente E2E, compartilhados pelo servidor (que os grava no banco)
 * e pelas especificações (que os usam para entrar e conferir).
 *
 * Tudo fictício. O segredo do "Cloudinary" existe para o teste assinar as
 * respostas do provedor falso, que o servidor confere de verdade.
 */

export const PORTA = 3100;
export const ORIGEM = `http://localhost:${PORTA}`;

export const CLOUDINARY = Object.freeze({
  cloudName: 'motorshop-e2e',
  apiKey: '000000000000000',
  apiSecret: 'segredo-do-provedor-falso-e2e',
  pasta: 'e2e',
});

// Uma conta por fluxo: o login é limitado a 5 tentativas por conta em 15 min
// (como em produção), e cada fluxo entra com a sua.
const SENHA = 'chave-forte-do-teste-e2e-2026';
export const CONTAS = Object.freeze({
  cadastro: { name: 'Dono (cadastro)', email: 'cadastro@e2e.test', password: SENHA },
  status: { name: 'Dono (status)', email: 'status@e2e.test', password: SENHA },
  leads: { name: 'Dono (leads)', email: 'leads@e2e.test', password: SENHA },
  conferencia: { name: 'Conferência', email: 'conferencia@e2e.test', password: SENHA },
  revenda: { name: 'Dono (revenda)', email: 'revenda@e2e.test', password: SENHA },
  // Conta própria: o limite de login (5 por conta a cada 15 min) é por e-mail.
  equipe: { name: 'Dono (equipe)', email: 'equipe@e2e.test', password: SENHA },
});

export const LOJA = Object.freeze({
  name: 'Motos do Teste',
  slogan: 'Motos revisadas para o teste de ponta a ponta',
  contact: { whatsapp: '49999990000', phone: '4935550000', email: 'contato@e2e.test' },
  address: { street: 'Rua das Motos', number: '10', city: 'Chapecó', state: 'SC' },
  features: { financingEnabled: true, sellMotoEnabled: true },
  financing: { monthlyRate: 1.79, installmentOptions: [12, 24, 36, 48], minDownPaymentPercent: 20 },
});

export const MARCAS = Object.freeze([
  { name: 'Honda', slug: 'honda' },
  { name: 'Yamaha', slug: 'yamaha' },
]);

/** Preço em centavos, como no banco (D-04). */
export const MOTOS = Object.freeze([
  {
    marca: 'honda',
    model: 'CB 500F',
    year: 2024,
    mileage: 4200,
    price: 3_890_000,
    engineCapacity: 471,
    color: 'Vermelha',
    slug: 'honda-cb-500f-2024',
  },
  {
    marca: 'yamaha',
    model: 'Fazer 250',
    year: 2019,
    mileage: 28_000,
    price: 1_450_000,
    engineCapacity: 249,
    color: 'Azul',
    slug: 'yamaha-fazer-250-2019',
  },
  {
    marca: 'honda',
    model: 'Biz 125',
    year: 2022,
    mileage: 9000,
    price: 1_390_000,
    engineCapacity: 125,
    color: 'Branca',
    slug: 'honda-biz-125-2022',
  },
]);
