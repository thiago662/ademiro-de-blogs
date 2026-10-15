import { firebaseConfig, useEmulators } from './firebase.config';

// Emulador usa um projeto demo-*: nunca toca em produção, mesmo com a config real preenchida.
const emulatorConfig = { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-ademiro', appId: 'demo-app' };

export const environment = {
  useEmulators,
  firebase: useEmulators ? emulatorConfig : firebaseConfig,
};
