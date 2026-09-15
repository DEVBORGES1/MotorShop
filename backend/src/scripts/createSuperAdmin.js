import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

import { PASSWORD_MIN_LENGTH, USER_ROLE } from '@motorshop/shared';
import mongoose from 'mongoose';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { hashPassword } from '../modules/auth/password.js';
import { User } from '../modules/users/user.model.js';
import { createUserSchema } from '../modules/users/user.schema.js';

/**
 * Cria o primeiro SUPER_ADMIN.
 *
 * Este é o **único** caminho para criar o primeiro administrador: não existe
 * endpoint HTTP de cadastro e não há credencial padrão embutida — as duas
 * falhas mais comuns em sistemas deste tipo.
 *
 * A senha é digitada sem aparecer na tela e não passa por argumento de linha de
 * comando, que ficaria registrado no histórico do shell.
 */

/**
 * Saída que pode ser silenciada, para que a senha não apareça enquanto é
 * digitada. Evita manipular o terminal com códigos de escape.
 */
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!output.muted) stdout.write(chunk, encoding);
    callback();
  },
});
output.muted = false;

async function askHidden(rl, question) {
  stdout.write(question);
  output.muted = true;
  try {
    return await rl.question('');
  } finally {
    output.muted = false;
    stdout.write('\n');
  }
}

async function run() {
  const connected = await connectDatabase();
  if (!connected) {
    console.error('MONGODB_URI não definida — configure o .env antes de criar o administrador.');
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: stdin, output, terminal: true });

  try {
    const existentes = await User.countDocuments({ role: USER_ROLE.SUPER_ADMIN, active: true });
    if (existentes > 0) {
      console.log(`Já existe(m) ${existentes} super administrador(es) ativo(s).`);
      const resposta = await rl.question('Criar mais um mesmo assim? (s/N) ');
      if (resposta.trim().toLowerCase() !== 's') {
        console.log('Cancelado.');
        return;
      }
    }

    const name = (await rl.question('Nome: ')).trim();
    const email = (await rl.question('E-mail: ')).trim().toLowerCase();
    const password = await askHidden(rl, 'Senha: ');
    const confirmation = await askHidden(rl, 'Confirme a senha: ');

    if (password !== confirmation) {
      console.error('As senhas não conferem.');
      process.exitCode = 1;
      return;
    }

    // Reaproveita a MESMA validação da API: uma regra só, um comportamento só.
    const parsed = createUserSchema.safeParse({
      name,
      email,
      password,
      role: USER_ROLE.SUPER_ADMIN,
    });

    if (!parsed.success) {
      console.error('Dados inválidos:');
      for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
      console.error(`(A senha precisa de ao menos ${PASSWORD_MIN_LENGTH} caracteres.)`);
      process.exitCode = 1;
      return;
    }

    if (await User.exists({ email: parsed.data.email })) {
      console.error(`Já existe um usuário com o e-mail ${parsed.data.email}.`);
      process.exitCode = 1;
      return;
    }

    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      role: USER_ROLE.SUPER_ADMIN,
      passwordHash: await hashPassword(parsed.data.password),
    });

    console.log(`Super administrador criado: ${parsed.data.email}`);
    console.log('Acesse o painel em /admin/login');
  } finally {
    rl.close();
  }
}

run()
  .catch((error) => {
    console.error('Falha ao criar administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    await mongoose.connection.close();
  });
