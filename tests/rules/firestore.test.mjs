// Testes das Security Rules. Rodar com: npm run test:rules (sobe o emulador do Firestore).
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
} from 'firebase/firestore';

setLogLevel('silent'); // PERMISSION_DENIED é o resultado esperado em metade dos testes

const ADMIN = 'admin-uid';
const EDITOR = 'editor-uid';
const VIEWER = 'viewer-uid';
const STRANGER = 'stranger-uid'; // conta válida no Auth, fora da allowlist e sem blog
const GUEST = 'guest-uid';

let env;

before(async () => {
  // Projeto próprio: clearFirestore nunca apaga os dados do emulador de dev (demo-ademiro).
  // Host vem de FIRESTORE_EMULATOR_HOST (definido pelo emulators:exec).
  env = await initializeTestEnvironment({
    projectId: 'demo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(() => env.cleanup());

const blogData = (over = {}) => ({
  name: 'Blog',
  slug: 'blog',
  description: '',
  publicUrl: '',
  demo: false,
  fieldDefs: [],
  settings: {},
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});

const memberData = (uid, role, over = {}) => ({
  uid,
  role,
  label: '',
  addedAt: serverTimestamp(),
  ...over,
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins', ADMIN), { email: 'admin@demo.local' });
    await setDoc(doc(db, 'blogs', 'tech'), blogData({ name: 'Tech', slug: 'tech' }));
    await setDoc(doc(db, 'blogs', 'demo'), blogData({ name: 'Demo', slug: 'demo', demo: true }));
    await setDoc(doc(db, 'blogs', 'tech', 'members', EDITOR), memberData(EDITOR, 'editor'));
    await setDoc(doc(db, 'blogs', 'tech', 'members', VIEWER), memberData(VIEWER, 'viewer'));
  });
});

const as = {
  public: () => env.unauthenticatedContext().firestore(),
  admin: () => env.authenticatedContext(ADMIN).firestore(),
  editor: () => env.authenticatedContext(EDITOR).firestore(),
  viewer: () => env.authenticatedContext(VIEWER).firestore(),
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

describe('blogs: leitura', () => {
  it('público lê blog e lista', async () => {
    await assertSucceeds(getDoc(doc(as.public(), 'blogs', 'tech')));
    await assertSucceeds(getDocs(collection(as.public(), 'blogs')));
  });
  it('visitante lista blogs demo', () =>
    assertSucceeds(getDocs(query(collection(as.guest(), 'blogs'), where('demo', '==', true)))));
});

describe('blogs: escrita', () => {
  it('admin cria blog válido', () =>
    assertSucceeds(setDoc(doc(as.admin(), 'blogs', 'novo'), blogData({ slug: 'novo' }))));
  it('admin não cria blog inválido', async () => {
    await assertFails(setDoc(doc(as.admin(), 'blogs', 'x1'), blogData({ slug: 'Slug Errado' })));
    await assertFails(setDoc(doc(as.admin(), 'blogs', 'x2'), blogData({ name: '' })));
    await assertFails(setDoc(doc(as.admin(), 'blogs', 'x3'), blogData({ publicUrl: 'http://inseguro' })));
    await assertFails(setDoc(doc(as.admin(), 'blogs', 'x4'), blogData({ hacker: true })));
  });
  it('não-admin não cria blog', async () => {
    for (const db of [as.public(), as.guest(), as.stranger(), as.editor(), as.viewer()]) {
      await assertFails(setDoc(doc(db, 'blogs', 'novo'), blogData({ slug: 'novo' })));
    }
  });
  it('admin edita e exclui blog', async () => {
    await assertSucceeds(updateDoc(doc(as.admin(), 'blogs', 'tech'), { name: 'Novo nome', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(as.admin(), 'blogs', 'tech')));
  });
  it('editor altera só settings', async () => {
    await assertSucceeds(updateDoc(doc(as.editor(), 'blogs', 'tech'), { settings: { bio: 'oi' }, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as.editor(), 'blogs', 'tech'), { name: 'Hack', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as.editor(), 'blogs', 'tech'), { demo: true, updatedAt: serverTimestamp() }));
  });
  it('editor não mexe em blog de que não é membro', () =>
    assertFails(updateDoc(doc(as.editor(), 'blogs', 'demo'), { settings: {}, updatedAt: serverTimestamp() })));
  it('viewer, visitante e estranho não editam nem excluem', async () => {
    for (const db of [as.viewer(), as.guest(), as.stranger()]) {
      await assertFails(updateDoc(doc(db, 'blogs', 'tech'), { settings: {}, updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(db, 'blogs', 'tech')));
    }
  });
  it('editor não exclui blog', () => assertFails(deleteDoc(doc(as.editor(), 'blogs', 'tech'))));
});

describe('members', () => {
  it('membro lê o próprio vínculo, não o dos outros', async () => {
    await assertSucceeds(getDoc(doc(as.editor(), 'blogs', 'tech', 'members', EDITOR)));
    await assertFails(getDoc(doc(as.editor(), 'blogs', 'tech', 'members', VIEWER)));
  });
  it('admin lista membros; público, visitante e estranho não', async () => {
    await assertSucceeds(getDocs(collection(as.admin(), 'blogs', 'tech', 'members')));
    for (const db of [as.public(), as.guest(), as.stranger(), as.viewer()]) {
      await assertFails(getDocs(collection(db, 'blogs', 'tech', 'members')));
    }
  });
  it('collection group "meus blogs" só com o próprio uid', async () => {
    await assertSucceeds(getDocs(query(collectionGroup(as.viewer(), 'members'), where('uid', '==', VIEWER))));
    await assertFails(getDocs(query(collectionGroup(as.viewer(), 'members'), where('uid', '==', EDITOR))));
    await assertFails(getDocs(collectionGroup(as.viewer(), 'members')));
  });
  it('admin adiciona, altera e remove membro', async () => {
    const ref = doc(as.admin(), 'blogs', 'tech', 'members', STRANGER);
    await assertSucceeds(setDoc(ref, memberData(STRANGER, 'viewer', { label: 'Fulano' })));
    await assertSucceeds(updateDoc(ref, { role: 'editor' }));
    await assertSucceeds(deleteDoc(ref));
  });
  it('admin não grava membro inválido', async () => {
    const ref = (uid) => doc(as.admin(), 'blogs', 'tech', 'members', uid);
    await assertFails(setDoc(ref(STRANGER), memberData(STRANGER, 'owner')));
    await assertFails(setDoc(ref(STRANGER), memberData(EDITOR, 'viewer')));
    await assertFails(setDoc(ref(STRANGER), memberData(STRANGER, 'viewer', { extra: 1 })));
  });
  it('ninguém além do admin grava membros', async () => {
    for (const db of [as.editor(), as.viewer(), as.guest(), as.stranger(), as.public()]) {
      await assertFails(setDoc(doc(db, 'blogs', 'tech', 'members', STRANGER), memberData(STRANGER, 'editor')));
      await assertFails(deleteDoc(doc(db, 'blogs', 'tech', 'members', VIEWER)));
    }
  });
  it('estranho não se autopromove', () =>
    assertFails(setDoc(doc(as.stranger(), 'blogs', 'tech', 'members', STRANGER), memberData(STRANGER, 'editor'))));
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
