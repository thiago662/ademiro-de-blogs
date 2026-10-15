// Gera src/environments/environment.ts a partir de variáveis de ambiente.
// Local: lê .env (npm scripts usam --env-file-if-exists). CI: lê vars/secrets do GitHub.
import { mkdirSync, writeFileSync } from 'node:fs';

const env = process.env;
const useEmulators = env.USE_EMULATORS === 'true';

const firebase = useEmulators
  ? { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-ademiro', appId: 'demo-app' }
  : {
      apiKey: env.FIREBASE_API_KEY,
      authDomain: env.FIREBASE_AUTH_DOMAIN,
      projectId: env.FIREBASE_PROJECT_ID,
      appId: env.FIREBASE_APP_ID,
    };

const missing = Object.entries(firebase).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(
    `write-env: faltando ${missing.join(', ')}. Copie .env.example para .env ` +
      `(ou use USE_EMULATORS=true para rodar com o emulador).`,
  );
  process.exit(1);
}

mkdirSync('src/environments', { recursive: true });
writeFileSync(
  'src/environments/environment.ts',
  `// Gerado por scripts/write-env.mjs. Não edite, não commite.\n` +
    `export const environment = ${JSON.stringify({ useEmulators, firebase }, null, 2)};\n`,
);
console.log(`write-env: environment gerado (${useEmulators ? 'emulador' : firebase.projectId}).`);
