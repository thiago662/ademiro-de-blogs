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
  limit,
  orderBy,
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

const postData = (authorUid, over = {}) => ({
  title: 'Post',
  subtitle: '',
  summary: '',
  slug: 'post',
  coverUrl: '',
  body: '# Olá',
  tags: [],
  status: 'draft',
  custom: {},
  extras: [],
  authorUid,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  publishedAt: null,
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
    await setDoc(
      doc(db, 'blogs', 'tech', 'posts', 'pub'),
      postData(EDITOR, { slug: 'pub', status: 'published', publishedAt: serverTimestamp() }),
    );
    await setDoc(doc(db, 'blogs', 'tech', 'posts', 'draft'), postData(EDITOR, { slug: 'draft' }));
    await setDoc(doc(db, 'blogs', 'demo', 'posts', 'draft'), postData(ADMIN, { slug: 'draft' }));
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
  it('deployUrl é opcional e só https', async () => {
    await assertSucceeds(setDoc(doc(as.admin(), 'blogs', 'd1'), blogData({ slug: 'd1', deployUrl: 'https://github.com/x/y/actions' })));
    await assertSucceeds(setDoc(doc(as.admin(), 'blogs', 'd2'), blogData({ slug: 'd2', deployUrl: '' })));
    await assertFails(setDoc(doc(as.admin(), 'blogs', 'd3'), blogData({ slug: 'd3', deployUrl: 'http://inseguro' })));
    await assertFails(setDoc(doc(as.admin(), 'blogs', 'd4'), blogData({ slug: 'd4', deployUrl: 42 })));
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

describe('posts: leitura', () => {
  const post = (db, blog, id) => doc(db, 'blogs', blog, 'posts', id);
  const posts = (db, blog) => collection(db, 'blogs', blog, 'posts');

  it('público lê publicado, não lê rascunho', async () => {
    await assertSucceeds(getDoc(post(as.public(), 'tech', 'pub')));
    await assertFails(getDoc(post(as.public(), 'tech', 'draft')));
  });
  it('público lista só com filtro de publicados', async () => {
    await assertSucceeds(getDocs(query(posts(as.public(), 'tech'), where('status', '==', 'published'))));
    await assertFails(getDocs(posts(as.public(), 'tech')));
  });
  it('consultas do README funcionam para o público', async () => {
    const db = as.public();
    await assertSucceeds(getDocs(query(collection(db, 'blogs'), where('slug', '==', 'tech'), limit(1))));
    await assertSucceeds(
      getDocs(query(posts(db, 'tech'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'))),
    );
    await assertSucceeds(
      getDocs(query(posts(db, 'tech'), where('status', '==', 'published'), where('slug', '==', 'pub'), limit(1))),
    );
    await assertFails(getDocs(query(posts(db, 'tech'), where('slug', '==', 'draft'))));
  });
  it('membros (editor e viewer) e admin leem rascunhos', async () => {
    for (const db of [as.editor(), as.viewer(), as.admin()]) {
      await assertSucceeds(getDocs(posts(db, 'tech')));
    }
  });
  it('estranho só vê publicados', async () => {
    await assertFails(getDoc(post(as.stranger(), 'tech', 'draft')));
    await assertSucceeds(getDoc(post(as.stranger(), 'tech', 'pub')));
  });
  it('visitante lê rascunho só em blog demo', async () => {
    await assertSucceeds(getDocs(posts(as.guest(), 'demo')));
    await assertFails(getDoc(post(as.guest(), 'tech', 'draft')));
  });
});

describe('posts: escrita', () => {
  const post = (db, blog, id) => doc(db, 'blogs', blog, 'posts', id);

  it('editor cria post válido no próprio blog', () =>
    assertSucceeds(setDoc(post(as.editor(), 'tech', 'novo'), postData(EDITOR, { slug: 'novo' }))));
  it('editor publica com publishedAt', () =>
    assertSucceeds(
      setDoc(post(as.editor(), 'tech', 'novo'), postData(EDITOR, { status: 'published', publishedAt: serverTimestamp() })),
    ));
  it('rejeita post inválido', async () => {
    const bad = [
      { title: '' },
      { slug: 'Slug Ruim' },
      { coverUrl: 'http://inseguro.com/a.png' },
      { status: 'publicado' },
      { status: 'published', publishedAt: null },
      { body: 'x'.repeat(500001) },
      { campoExtra: 1 },
    ];
    for (const over of bad) {
      await assertFails(setDoc(post(as.editor(), 'tech', 'novo'), postData(EDITOR, over)));
    }
  });
  it('autor é sempre quem cria e não muda depois', async () => {
    await assertFails(setDoc(post(as.editor(), 'tech', 'novo'), postData(ADMIN)));
    await assertFails(updateDoc(post(as.editor(), 'tech', 'draft'), { authorUid: ADMIN, updatedAt: serverTimestamp() }));
  });
  it('editor edita e exclui post do blog', async () => {
    await assertSucceeds(updateDoc(post(as.editor(), 'tech', 'draft'), { title: 'Novo', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(post(as.editor(), 'tech', 'draft')));
  });
  it('editor não escreve em blog de que não é membro', async () => {
    await assertFails(setDoc(post(as.editor(), 'demo', 'novo'), postData(EDITOR)));
    await assertFails(deleteDoc(post(as.editor(), 'demo', 'draft')));
  });
  it('viewer, visitante, estranho e público não escrevem', async () => {
    for (const [db, uid] of [[as.viewer(), VIEWER], [as.guest(), GUEST], [as.stranger(), STRANGER], [as.public(), null]]) {
      await assertFails(setDoc(post(db, 'tech', 'novo'), postData(uid)));
      await assertFails(updateDoc(post(db, 'tech', 'pub'), { title: 'X', updatedAt: serverTimestamp() }));
      await assertFails(deleteDoc(post(db, 'tech', 'pub')));
    }
    await assertFails(setDoc(post(as.guest(), 'demo', 'novo'), postData(GUEST)));
  });
  it('admin escreve em qualquer blog', async () => {
    await assertSucceeds(setDoc(post(as.admin(), 'demo', 'novo'), postData(ADMIN)));
    await assertSucceeds(deleteDoc(post(as.admin(), 'tech', 'pub')));
  });
});

describe('campos customizados', () => {
  const fieldDef = (key) => ({ key, label: key, type: 'text', required: false, options: [], scope: 'post' });
  const many = (n, make) => Array.from({ length: n }, (_, i) => make(`f${i}`));

  it('admin define campos; editor não', async () => {
    const fieldDefs = [fieldDef('nivel')];
    await assertSucceeds(updateDoc(doc(as.admin(), 'blogs', 'tech'), { fieldDefs, updatedAt: serverTimestamp() }));
    await assertFails(
      updateDoc(doc(as.editor(), 'blogs', 'tech'), { fieldDefs: [fieldDef('outro')], updatedAt: serverTimestamp() }),
    );
  });
  it('limites de tamanho', async () => {
    await assertFails(
      updateDoc(doc(as.admin(), 'blogs', 'tech'), { fieldDefs: many(51, fieldDef), updatedAt: serverTimestamp() }),
    );
    const settings = Object.fromEntries(many(51, (k) => [k, 'x']));
    await assertFails(updateDoc(doc(as.editor(), 'blogs', 'tech'), { settings, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as.editor(), 'blogs', 'tech', 'posts', 'novo'), postData(EDITOR, { custom: settings })));
    await assertFails(
      setDoc(doc(as.editor(), 'blogs', 'tech', 'posts', 'novo'), postData(EDITOR, { extras: many(31, (k) => ({ key: k })) })),
    );
  });
  it('editor grava custom e extras no post', () =>
    assertSucceeds(
      setDoc(
        doc(as.editor(), 'blogs', 'tech', 'posts', 'novo'),
        postData(EDITOR, { custom: { nivel: 'avançado' }, extras: [{ key: 'ref', label: 'Ref', type: 'url', value: 'https://x.dev' }] }),
      ),
    ));
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
