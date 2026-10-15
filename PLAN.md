# Plano MVP — Ademiro de Blogs v2

Gerenciador de conteúdo para múltiplos blogs, open source, publicado no GitHub Pages, com dados no Firebase (plano Spark, sem custo). Qualquer pessoa pode fazer fork e conectar o próprio projeto Firebase.

## Status

| Fase | Situação |
|---|---|
| 0 — Fundação | ✅ |
| 1 — Autenticação | ✅ |
| 2 — Blogs e membros | ✅ |
| 3 — Posts e editor Markdown | ✅ |
| 4 — Campos customizados | ✅ |
| 5 — Segurança e qualidade | ✅ |
| 6 — Documentação | ✅ |

**Desvios do plano original:**
- Fase 2: admin não vira "owner" do blog ao criar — admin já tem acesso global; papéis por blog são só `editor` e `viewer`.
- Fase 5: incluído aviso de alterações não salvas (guard + `beforeunload`) e contorno de bug do Milkdown 7.22.2 com imagem sem título (removido ao atualizar para 7.22.3, que corrigiu o bug).
- Testes de rules usam o projeto `demo-rules-test`, isolado do emulador de desenvolvimento.

---

## 1. Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Frontend | Angular (última estável), projeto novo via `ng new` | Código atual será quase todo reescrito; migrar 17→atual major a major é retrabalho |
| Padrões Angular | Standalone, signals, control flow (`@if`/`@for`), zoneless se estável | Padrão atual do framework |
| UI | Bootstrap + Font Awesome (últimas versões) | Já conhecido, menor atrito |
| Banco | Cloud Firestore `(default)`, região `southamerica-east1` | Rules por documento, queries, subcoleções |
| SDK | Firebase JS SDK modular, **sem AngularFire** | AngularFire costuma atrasar versões do Angular; service fino resolve |
| Auth | E-mail/senha + Anônimo (visitante demo) | Login só para proteger; demo sem senha compartilhada |
| Conteúdo | Markdown (GFM + footnotes + code highlight) | Portável, seguro, pronto para IA e futura migração Postgres |
| Editor | Milkdown Crepe (WYSIWYG que salva Markdown) | Completo: toolbar, slash menu, tabelas, código, imagens. Fallback: CodeMirror 6 + preview |
| Imagens | **Somente URL externa `https://`** (sem upload) | Storage exige plano Blaze; upload fica para depois |
| Config | Variáveis de ambiente → arquivo gerado no build; nada pessoal no repo | Repo público e forkável |
| Deploy | GitHub Actions → GitHub Pages | Sem build commitado (`docs/` sai) |
| Dev local | Firebase Emulator Suite (Auth + Firestore) | Testa Rules de verdade, sem tocar em produção |

> **Segurança — premissa:** o `firebaseConfig` web **não é segredo** (vai no JS do navegador). Secrets do GitHub servem para não deixar dados pessoais no repo, não para proteger produção. A proteção real é: **Auth + Security Rules deny-by-default + allowlist de admins + domínios autorizados**.

---

## 2. Papéis e acesso

| Ator | Como entra | Pode |
|---|---|---|
| **Público** (sem login) | — | Ler blog e posts `published` (usado pelos fronts dos blogs) |
| **Visitante demo** | Botão "Entrar como visitante" (Auth anônimo) | Ler tudo dos blogs com `demo: true` (inclusive rascunhos e config). Nunca escreve |
| **viewer** | Membro do blog | Ler tudo do blog |
| **editor** | Membro do blog | Ler + criar/editar/excluir posts + editar valores de config do blog |
| **admin** | UID em `admins/{uid}` | Tudo: criar/excluir blogs, definir campos, gerenciar membros |

- Usuários são criados manualmente no console do Firebase (sem tela de cadastro).
- Auth permite criar conta via API mesmo sem tela → Rules **nunca** liberam algo só por `request.auth != null`; sempre exigem admin, membro ou anônimo+demo.
- Membros são adicionados por UID na tela do blog (sem convite por e-mail no MVP).

---

## 3. Modelo de dados (Firestore)

```
admins/{uid}
  email

blogs/{blogId}
  name, slug, description, publicUrl
  demo: bool
  fieldDefs: [ { key, label, type, required, options?, scope: 'blog' | 'post', order } ]
  settings:  { <key>: valor }            ← valores dos fieldDefs scope 'blog'
  createdAt, updatedAt

blogs/{blogId}/members/{uid}
  uid, role: 'editor' | 'viewer', addedAt

blogs/{blogId}/posts/{postId}
  slug, title, subtitle, summary, coverUrl
  body                                   ← markdown
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  custom: { <key>: valor }               ← valores dos fieldDefs scope 'post'
  extras: [ { key, label, type, value } ] ← campos avulsos só deste post
  authorUid, createdAt, updatedAt, publishedAt
```

**Tipos de campo:** `text`, `textarea`, `markdown`, `number`, `boolean`, `date`, `url`, `select`, `tags`.

**Notas:**
- `members` fica em subcoleção para não expor UIDs na leitura pública do blog.
- "Meus blogs" = collection group query em `members` onde `uid == auth.uid`.
- Slug único por blog: verificação por query antes de salvar. *Ceiling: sem garantia transacional; aceitável com 1–2 editores. Upgrade: coleção `slugs/{blogId_slug}` em transação.*
- Timestamps via `serverTimestamp()`, validados nas Rules com `request.time`.
- Limite de documento Firestore: 1 MiB → Rules limitam `body` (~500 mil caracteres) e `extras` (≤ 30 itens).

**Índices compostos previstos:**
- `posts`: `status ==` + `publishedAt desc` (leitura pública)
- `posts`: `status ==` + `updatedAt desc` (lista no admin)
- collection group `members`: `uid ==`

---

## 4. Security Rules — matriz

| Recurso | Público | Anônimo (demo) | viewer | editor | admin |
|---|---|---|---|---|---|
| `admins/{uid}` | ✗ | ✗ | só o próprio doc | só o próprio doc | só o próprio doc |
| `blogs/{id}` read | ✓ | ✓ | ✓ | ✓ | ✓ |
| `blogs/{id}` create/delete | ✗ | ✗ | ✗ | ✗ | ✓ |
| `blogs/{id}` update `settings` | ✗ | ✗ | ✗ | ✓ | ✓ |
| `blogs/{id}` update demais campos | ✗ | ✗ | ✗ | ✗ | ✓ |
| `members` read | ✗ | ✗ | só o próprio | só o próprio | ✓ |
| `members` write | ✗ | ✗ | ✗ | ✗ | ✓ |
| `posts` read `published` | ✓ | ✓ (blog demo) | ✓ | ✓ | ✓ |
| `posts` read draft/archived | ✗ | ✓ (blog demo) | ✓ | ✓ | ✓ |
| `posts` write | ✗ | ✗ | ✗ | ✓ | ✓ |
| qualquer outro caminho | ✗ | ✗ | ✗ | ✗ | ✗ |

Validações de escrita em `posts`: campos permitidos (`keys().hasOnly`), tipos, `status` no enum, `slug` com regex `^[a-z0-9-]+$`, tamanhos, `authorUid == request.auth.uid` na criação, URLs de imagem começando com `https://`.

---

## 5. Configuração e deploy (sem dados pessoais no repo)

**Arquivos commitados:** `.env.example`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `scripts/write-env.mjs`, seed fictício do emulador.

**Arquivos ignorados:** `.env`, `src/environments/environment*.ts` (gerados), `.firebaserc` (contém project ID), `.private/`.

**Fluxo local:**
```
cp .env.example .env            # preencher com o firebaseConfig
npm run env                     # node --env-file=.env scripts/write-env.mjs
npm run emulators               # firebase emulators:start --import=./emulator-seed
npm start                       # USE_EMULATORS=true conecta no emulador
```

**Fluxo de deploy (GitHub Actions, push em `master`):**
1. `npm ci`
2. Gera environment a partir de **Repository Secrets** (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, …)
3. `ng build --base-href /<repo>/`
4. Copia `index.html` → `404.html` (fallback de rotas SPA)
5. `actions/upload-pages-artifact` + `actions/deploy-pages`

**Rules/índices:** deploy manual no MVP (`firebase deploy --only firestore:rules,firestore:indexes`). Deploy via CI com service account fica para depois.

---

## 6. Fases e PRs

Cada item = 1 PR pequeno. Critério de pronto ao final de cada fase.

### Fase 0 — Fundação
- **PR 1 · Projeto novo:** remover app antigo, `ng new` na última versão estável (standalone, SCSS), Bootstrap + Font Awesome, logo/assets antigos, estrutura de pastas. Remove `docs/`, `@kolkov/angular-editor`, mock de `sessionStorage`.
- **PR 2 · Config + Firebase local:** `.env.example`, `scripts/write-env.mjs`, environments ignorados, `firebase.json` com emuladores (Auth, Firestore, UI), `firestore.rules` deny-all, `firestore.indexes.json`, `core/firebase.ts` (init + conexão condicional ao emulador), seed fictício.
- **PR 3 · CI/CD:** workflow de deploy no Pages + workflow de CI (build) em PR.

✅ App vazio sobe local apontando pro emulador e publica no Pages via Action, sem nenhum dado pessoal no repo.

### Fase 1 — Autenticação
- **PR 4 · Login:** tela de login e-mail/senha, logout, `AuthService` com signal do usuário, `authGuard`, layout base (navbar).
- **PR 5 · Visitante + Rules base:** botão "Entrar como visitante" (anônimo), helpers nas Rules (`isAdmin`, `isAnon`, `isMember`, `role`), setup de testes de Rules com `@firebase/rules-unit-testing` + `node --test`.

✅ Só admin/membro/visitante entra; conta criada fora da allowlist não lê nada (teste cobrindo).

### Fase 2 — Blogs
- **PR 6 · CRUD de blogs:** lista "meus blogs" (+ blogs demo para anônimo), criar/editar/excluir (admin), campos `name`, `slug`, `description`, `publicUrl`, `demo`.
- **PR 7 · Membros:** tela de membros do blog (adicionar por UID, papel editor/viewer, remover), Rules + testes.

✅ Admin cadastra blogs e membros; viewer vê sem editar; visitante vê só blog demo.

### Fase 3 — Posts
- **PR 8 · Lista de posts:** `/blogs/:blogId/posts`, filtro por status, criar post (título → slug).
- **PR 9 · Editor de post (campos fixos):** título, subtítulo, resumo, capa (URL + preview), tags, status, publicar/despublicar (`publishedAt`), excluir com confirmação, slug único.
- **PR 10 · Editor Markdown:** spike + integração Milkdown Crepe (fallback CodeMirror 6 se integração travar), imagens por URL, CSP (`img-src https:`), Rules de validação de `posts` + testes.

✅ Ciclo completo rascunho → publicado → arquivado; público lê só publicados.

### Fase 4 — Campos customizados
- **PR 11 · Config de campos do blog:** `/blogs/:blogId/settings` — CRUD de `fieldDefs` (tipo, obrigatório, opções, scope, ordem) + formulário dos valores scope `blog`.
- **PR 12 · Campos no post:** formulário dinâmico (Reactive Forms) dos `fieldDefs` scope `post` → `custom`; botão "+ campo" para `extras` avulsos; validação no front e nas Rules.

✅ Cada blog tem seus próprios campos; post pode ter campos extras só dele.

### Fase 5 — Segurança e qualidade
- **PR 13 · Hardening:** suíte completa de testes cobrindo a matriz da seção 4, CI rodando testes no emulador, Dependabot, revisão final de CSP, checklist de console (domínios autorizados, proteção contra enumeração de e-mail, App Check opcional).

✅ Todos os cenários da matriz testados e verdes no CI.

### Fase 6 — Documentação
- **PR 14 · README:** guia de fork (criar projeto Firebase, ativar Auth/Firestore, deploy de Rules, variáveis no GitHub, primeiro admin), padrão de Markdown suportado, exemplo de leitura pública para os fronts dos blogs (`where('status','==','published')` + `orderBy('publishedAt','desc')`).

✅ Alguém de fora consegue subir a própria instância só com o README.

---

## 7. Fora do MVP

- Upload de imagens (Firebase Storage/Blaze ou alternativa) e galeria de mídia
- Histórico de versões de post
- Convite de membros por e-mail
- Agendamento de publicação
- Canais de distribuição (LinkedIn, Instagram, roteiro, carrossel) e geração por IA
- Migração dos posts antigos do Realtime DB (script de import do JSON exportado, se desejado)
- Deploy de Rules via CI
- Migração futura para API própria + PostgreSQL
