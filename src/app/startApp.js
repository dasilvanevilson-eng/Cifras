import { createRouter } from './router.js';
import { AppLayout } from '../components/layout/AppLayout.js';
import { getCurrentUser, signOut } from '../services/authService.js';
import { createDefaultProfile, getProfileByUserId } from '../services/profilesService.js';

export async function startApp() {
  const root = document.querySelector('#app');

  if (!root) {
    throw new Error('Elemento #app nao encontrado.');
  }

  const session = await loadSession();
  const router = createRouter();
  const page = await router.currentPage(session);

  root.replaceChildren(AppLayout(page, {
    user: session.user,
    profile: session.profile,
    onLogout: async () => {
      await signOut();
      window.location.href = '/login';
    },
  }));
}

async function loadSession() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { user: null, profile: null };
    }

    const profile = await loadProfile(user);
    return { user, profile };
  } catch (error) {
    return { user: null, profile: null };
  }
}

async function loadProfile(user) {
  try {
    const profile = await getProfileByUserId(user.id);
    return profile || createDefaultProfile(user);
  } catch (error) {
    return createDefaultProfile(user);
  }
}
