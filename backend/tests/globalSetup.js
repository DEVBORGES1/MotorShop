/**
 * Sobe um MongoDB em memória para os testes de integração.
 *
 * Se o binário do mongod não puder ser obtido (rede restrita, ambiente sem
 * acesso ao download), o setup NÃO falha: ele deixa a URI indefinida e os
 * testes de integração se marcam como pulados, com aviso visível. Assim a
 * suíte continua útil onde o banco existe, e honesta onde não existe.
 */
export default async function setup({ provide }) {
  let server;

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    server = await MongoMemoryServer.create();
    provide('mongoUri', server.getUri());
  } catch (error) {
    provide('mongoUri', null);
    console.warn(
      '\n⚠  MongoDB em memória indisponível — testes de integração com banco serão PULADOS.\n' +
        `   Motivo: ${error.message.split('\n')[0]}\n`,
    );
  }

  return async () => {
    await server?.stop();
  };
}
