import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { DATABASE_ID } from '../game/online';

const env = import.meta.env;
export const emulatorMode = env.MODE === 'emulator' || env.VITE_USE_EMULATORS === 'true';
export const demoMode = env.MODE === 'demo' || env.VITE_APP_MODE === 'demo';
const config = emulatorMode
  ? {
      apiKey: 'demo-api-key',
      authDomain: 'localhost',
      projectId: 'demo-ash-and-oath',
      appId: 'demo-app',
    }
  : {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };
export const firebaseConfigured = !!(config.apiKey && config.projectId && config.appId);
const app = initializeApp(
  firebaseConfigured
    ? config
    : { apiKey: 'not-configured', projectId: 'demo-unconfigured', appId: 'unconfigured' },
);
if (!emulatorMode && env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY)
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
export const auth = getAuth(app);
export const db = getFirestore(app, DATABASE_ID);
export const functions = getFunctions(app, env.VITE_FIREBASE_REGION || 'us-central1');
if (emulatorMode) {
  if (!['localhost', '127.0.0.1'].includes(location.hostname))
    throw new Error('Emulators are restricted to local development.');
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
