/**
 * MongoDB para os testes de integração.
 *
 * Com `TEST_MONGODB_URI` definida (a CI usa um contêiner `mongo:7`; aqui, um
 * Docker local), usa esse servidor — cada arquivo de teste cria e apaga o
 * seu próprio banco. Sem ela, sobe um MongoDB em memória.
 *
 * Se o binário do mongod não puder ser obtido (rede restrita, ambiente sem
 * acesso ao download), o setup NÃO falha: ele deixa a URI indefinida e os
 * testes de integração se marcam como pulados, com aviso visível. Assim a
 * suíte continua útil onde o banco existe, e honesta onde não existe.
 */
export default async function setup({ provide }) {
  // Único ponto dos testes que lê o ambiente direto: roda antes de a
  // aplicação existir, para decidir que banco ela vai usar.
  const externo = process.env.TEST_MONGODB_URI;
  if (externo) {
    provide('mongoUri', externo);
    return undefined;
  }

  let server;

  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    server = await MongoMemoryServer.create();
    provide('mongoUri', server.getUri());
  } catch (error) {
    // Na CI, pular os testes de banco seria um verde falso: falha de vez.
    if (process.env.CI) {
      throw new Error(`Sem MongoDB para os testes na CI: ${error.message}`, { cause: error });
    }
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
