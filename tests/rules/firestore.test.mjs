// Testes das Security Rules. Rodar com: npm run test:rules (sobe o emulador do Firestore).
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, setLogLevel } from 'firebase/firestore';

setLogLevel('silent'); // PERMISSION_DENIED é o resultado esperado em metade dos testes

const ADMIN = 'admin-uid';
const STRANGER = 'stranger-uid'; // conta válida no Auth, fora da allowlist
const GUEST = 'guest-uid';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ademiro',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), 'admins', ADMIN), { email: 'admin@demo.local' }),
  );
});

const as = {
  public: () => env.unauthenticatedContext().firestore(),
  admin: () => env.authenticatedContext(ADMIN).firestore(),
  stranger: () => env.authenticatedContext(STRANGER).firestore(),
  guest: () =>
    env.authenticatedContext(GUEST, { firebase: { sign_in_provider: 'anonymous' } }).firestore(),
};

describe('admins', () => {
  it('admin lê o próprio doc', () => assertSucceeds(getDoc(doc(as.admin(), 'admins', ADMIN))));
  it('público não lê', () => assertFails(getDoc(doc(as.public(), 'admins', ADMIN))));
  it('usuário fora da allowlist não lê doc de outro', () =>
    assertFails(getDoc(doc(as.stranger(), 'admins', ADMIN))));
  it('visitante não lê doc de outro', () => assertFails(getDoc(doc(as.guest(), 'admins', ADMIN))));
  it('ninguém escreve, nem admin', async () => {
    await assertFails(setDoc(doc(as.admin(), 'admins', ADMIN), { email: 'x' }));
    await assertFails(setDoc(doc(as.stranger(), 'admins', STRANGER), { email: 'x' }));
  });
});

describe('deny by default', () => {
  it('caminho desconhecido negado até para admin', async () => {
    await assertFails(getDoc(doc(as.admin(), 'qualquer', 'coisa')));
    await assertFails(setDoc(doc(as.admin(), 'qualquer', 'coisa'), { a: 1 }));
  });
  it('público e visitante negados', async () => {
    await assertFails(getDoc(doc(as.public(), 'qualquer', 'coisa')));
    await assertFails(setDoc(doc(as.guest(), 'qualquer', 'coisa'), { a: 1 }));
  });
});
