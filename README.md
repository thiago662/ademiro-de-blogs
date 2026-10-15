# 📌 Ademiro de Blogs

**PT:** Gerenciador de conteúdo para múltiplos blogs. Você cadastra blogs, escreve posts em Markdown, define campos próprios para cada blog e consome o conteúdo em qualquer site via Firebase. Roda 100% no plano gratuito do Firebase e é publicado no GitHub Pages — faça um fork e conecte o seu próprio projeto Firebase.

**EN:** Multi-blog content manager. Register blogs, write posts in Markdown, define per-blog custom fields and read the content from any site through Firebase. Runs entirely on Firebase's free plan and deploys to GitHub Pages — fork it and plug in your own Firebase project. *(Detailed docs below are in Portuguese.)*

![GitHub last commit](https://img.shields.io/github/last-commit/thiago662/ademiro-de-blogs)

---

## 🌟 Funcionalidades

- **Vários blogs** em um único painel, cada um com seus posts, membros e configurações.
- **Editor Markdown visual** (Milkdown Crepe): títulos, listas, tarefas, tabelas, blocos de código, LaTeX, imagens por URL e menu `/`.
- **Posts** com título, subtítulo, slug, resumo, capa, tags e status (rascunho, publicado, arquivado).
- **Campos customizados** por blog — no blog (ex.: bio do autor) ou em todo post (ex.: nível, stack) — e **campos avulsos** em um post específico.
- **Login e papéis:** admin, editor, somente leitura e **visitante** (acesso de demonstração sem senha).
- **Segurança no banco:** Security Rules deny-by-default com 40 testes automatizados, CSP estrita, sem dados pessoais no repositório.

## 🛠️ Tecnologias

| Camada | Uso |
|---|---|
| [Angular 22](https://angular.dev/) | standalone, signals, zoneless |
| [Firebase](https://firebase.google.com/) | Authentication + Cloud Firestore (plano Spark) |
| [Milkdown Crepe](https://milkdown.dev/) | editor WYSIWYG que salva Markdown |
| [Bootstrap 5](https://getbootstrap.com/) + [Font Awesome 7](https://fontawesome.com/) | interface |
| Firebase Emulator Suite | desenvolvimento local e testes das rules |
| GitHub Actions + Pages | CI e deploy |

---

## 🚀 Rodando localmente

Não precisa de conta no Firebase: o desenvolvimento usa o **emulador** com dados de exemplo.

**Requisitos:** Node.js **24.15+** e Java **21+** (para o emulador).

```bash
git clone https://github.com/thiago662/ademiro-de-blogs.git
cd ademiro-de-blogs
npm install
cp src/environments/firebase.config.example.ts src/environments/firebase.config.ts   # já vem com useEmulators = true

npm run emulators             # terminal 1 — Auth + Firestore, UI em http://127.0.0.1:4000
npm start                     # terminal 2 — app em http://localhost:4200
```

**Contas do emulador** (existem só localmente):

| Usuário | Senha | Acesso |
|---|---|---|
| `admin@demo.local` | `admin123` | admin (tudo) |
| `editor@demo.local` | `demo123` | editor no "Blog Técnico" |
| `viewer@demo.local` | `demo123` | somente leitura no "Blog Técnico" |
| Botão "Entrar como visitante" | — | só leitura no "Blog Demo" |

**Scripts:**

| Comando | O que faz |
|---|---|
| `npm start` | servidor de desenvolvimento |
| `npm run build` | build de produção em `dist/` |
| `npm test` | testes unitários (Vitest) |
| `npm run test:rules` | sobe o emulador e roda os testes das Security Rules |
| `npm run emulators` | emulador com o seed de `emulator-seed/` |
| `npm run emulators:export` | salva o estado atual do emulador como novo seed |

> **Configuração:** `src/environments/firebase.config.ts` é o seu arquivo pessoal (ignorado pelo git). Com `useEmulators = true` o app usa o emulador; com `false`, o Firebase real dos valores em `firebaseConfig`. O `environment.ts` padrão do Angular só importa esse arquivo.

---

## ☁️ Usando com o seu Firebase (fork)

### 1. Projeto Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com/) no plano **Spark** (gratuito).
2. **Firestore Database → Criar banco de dados:** ID `(default)`, a região mais próxima de você (não muda depois), **modo de produção**.
3. **Authentication → Método de login:** ative **E-mail/senha** e **Anônimo**.
4. **Authentication → Configurações → Domínios autorizados:** adicione `<seu-usuario>.github.io`.
5. **Authentication → Usuários → Adicionar usuário:** crie o seu login e copie o **UID**.
6. **Firestore → Iniciar coleção** `admins` → ID do documento = **seu UID** → campo `email` (string). Isso te torna admin.
7. **Visão geral → Adicionar app → Web:** copie o `firebaseConfig` (não marque Hosting).

> Não é preciso ativar Storage nem Hosting. Imagens entram por URL externa.

### 2. Security Rules e índices

```bash
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes --project <seu-project-id>
```

Repita sempre que `firestore.rules` ou `firestore.indexes.json` mudarem.

### 3. GitHub Pages

1. **Settings → Pages → Source:** `GitHub Actions`.
2. **Settings → Secrets and variables → Actions → Secrets → New repository secret** chamado **`FIREBASE_CONFIG`**, com o objeto copiado do console — só o `{ ... }`, sem o `const firebaseConfig =`:

   ```js
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
   ```

   Esses valores não são segredos (vão no JS publicado), mas como *secret* ficam mascarados nos logs públicos do Actions. Forks não herdam secrets: cada um usa o próprio.

3. Faça push na `master`. O workflow `Deploy GitHub Pages` publica em `https://<seu-usuario>.github.io/<nome-do-repo>/`.

Para rodar local contra o projeto real em vez do emulador, preencha `firebaseConfig` no seu `src/environments/firebase.config.ts` e troque para `useEmulators = false` — o `npm start` recarrega sozinho.

---

## 👥 Papéis

| Papel | Como obter | Pode |
|---|---|---|
| **Admin** | UID na coleção `admins` | tudo: criar/excluir blogs, definir campos, gerenciar membros |
| **Editor** | membro do blog | ler, criar, editar e excluir posts; preencher os valores do blog |
| **Somente leitura** | membro do blog | ver tudo do blog, inclusive rascunhos |
| **Visitante** | botão "Entrar como visitante" | ver tudo dos blogs marcados como **demo**, sem editar |
| **Público** | sem login | ler blogs e posts **publicados** (usado pelos sites dos blogs) |

Membros são adicionados pelo admin na tela **Membros** do blog, informando o UID (o usuário precisa existir em Authentication).

## 🧩 Campos customizados

Em **Configurações** do blog, o admin define campos com rótulo, chave, tipo (texto, texto longo, Markdown, número, sim/não, data, URL, lista de opções, tags), obrigatoriedade e escopo:

- **Escopo blog** → preenchido uma vez, fica em `blog.settings` (ex.: bio do autor, LinkedIn).
- **Escopo post** → aparece em todo post do blog, fica em `post.custom` (ex.: nível, stack).
- **Campos extras** → criados dentro de um post específico, ficam em `post.extras` com definição e valor juntos.

---

## 📖 Lendo os posts no seu blog

O site do blog (qualquer framework) lê direto do Firestore com o mesmo `firebaseConfig`. Sem login, as rules liberam **apenas** blogs e posts publicados — toda consulta de posts precisa filtrar `status == 'published'`.

**Estrutura:**

```
blogs/{blogId}
  name, slug, description, publicUrl, fieldDefs[], settings{}
blogs/{blogId}/posts/{postId}
  title, subtitle, summary, slug, coverUrl, body (markdown), tags[],
  status, custom{}, extras[], publishedAt, updatedAt
```

**Exemplo (Firebase JS SDK):**

```js
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, limit, orderBy, query, where } from 'firebase/firestore';

const db = getFirestore(initializeApp(firebaseConfig));

// Blog pelo slug
const [blog] = (await getDocs(query(collection(db, 'blogs'), where('slug', '==', 'meu-blog'), limit(1)))).docs;

// Posts publicados, mais recentes primeiro (índice já incluso em firestore.indexes.json)
const posts = await getDocs(query(
  collection(db, 'blogs', blog.id, 'posts'),
  where('status', '==', 'published'),
  orderBy('publishedAt', 'desc'),
));

// Post pelo slug
const [post] = (await getDocs(query(
  collection(db, 'blogs', blog.id, 'posts'),
  where('status', '==', 'published'),
  where('slug', '==', 'meu-post'),
  limit(1),
))).docs;
```

**Renderizando o Markdown:** use um parser com suporte a GFM (tabelas, listas de tarefas, tachado) — por exemplo [`marked`](https://marked.js.org/) — e **sempre sanitize** o HTML gerado com [`DOMPurify`](https://github.com/cure53/DOMPurify) antes de inserir na página.

**Integração com o painel** (opcional, em *Editar blog*):
- **URL pública** — se o site usar a rota `/<slug-do-post>`, o editor mostra o botão **Ver no blog** nos posts publicados.
- **URL do deploy do site** — página do workflow que publica o site (ex.: `https://github.com/<usuario>/<repo>/actions/workflows/deploy.yml`). Vira o botão **Republicar site**, útil quando o site gera as páginas no build (prerender) e precisa ser publicado de novo após um post novo.

> **Imagens:** o editor grava imagens em bloco como `![1.00](url "legenda")` — o *alt* guarda a proporção da imagem e a legenda vai no *título*. Ao renderizar, use o título como texto alternativo.

---

## 🔒 Segurança

- O `firebaseConfig` web **não é segredo** — ele vai no JavaScript do navegador. A proteção real são as **Security Rules** (`firestore.rules`): tudo é negado por padrão e cada acesso exige admin, membro do blog ou visitante em blog demo. Estar logado nunca basta.
- As rules são cobertas por testes (`tests/rules/`) que rodam no CI a cada pull request.
- **CSP** estrita em `src/index.html`: sem scripts inline, imagens apenas `https`, conexões apenas com o Firebase.
- Nenhum dado pessoal no repositório: `src/environments/firebase.config.ts` e `.firebaserc` são ignorados.

**Checklist do console antes de publicar:**
- [ ] Rules e índices publicados (`firebase deploy --only firestore:rules,firestore:indexes`).
- [ ] Domínios autorizados no Authentication contêm só `localhost` e o seu domínio do Pages.
- [ ] Proteção contra enumeração de e-mail ativada (Authentication → Configurações).
- [ ] Opcional: [App Check](https://firebase.google.com/docs/app-check) com reCAPTCHA para reduzir abuso.

---

## 🗺️ Limitações e próximos passos

- Sem upload de imagens (exigiria o plano pago do Firebase Storage) — use URLs externas.
- Membros são identificados por UID; não há convite por e-mail.
- Fora do MVP: histórico de versões, agendamento de publicação, canais de distribuição (LinkedIn, Instagram) e geração com IA.

Plano completo em [PLAN.md](PLAN.md).

---

## ✉️ Contato / Contact

**Thiago Gonçalves Santos** - [@thiago662](https://github.com/thiago662) - thiago1santos12@gmail.com

🔗 **Link do Projeto / Project Link**: [https://github.com/thiago662/ademiro-de-blogs](https://github.com/thiago662/ademiro-de-blogs)
