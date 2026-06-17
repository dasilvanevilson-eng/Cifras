import { createRouter } from './router.js';
import { AppLayout } from '../components/layout/AppLayout.js';
import { getCurrentUser, signOut } from '../services/authService.js';
import { createDefaultProfile, getProfileByUserId } from '../services/profilesService.js';
import { countSugestoesPendentes } from '../services/sugestoesMusicasService.js';
import { getPublicSystemSettings } from '../services/settingsService.js';
import { canEditContent } from '../features/auth/roles.js';
import { resolvePermissions } from '../features/auth/permissions.js';
import { listCurrentUserPermissionOverrides } from '../services/permissionsService.js';
import { installYoutubeFloatingPlayer } from '../utils/youtubePlayer.js';
import { applySystemSettings } from '../utils/systemSettings.js';

export async function startApp() {
  const root = document.querySelector('#app');

  if (!root) {
    throw new Error('Elemento #app nao encontrado.');
  }

  installYoutubeFloatingPlayer();
  await loadAndApplySystemSettings();

  const session = await loadSession();
  const pendingSuggestionsCount = await loadPendingSuggestionsCount(session);
  const router = createRouter();
  const page = await router.currentPage(session);

  root.replaceChildren(AppLayout(page, {
    user: session.user,
    profile: session.profile,
    permissions: session.permissions,
    pendingSuggestionsCount,
    onLogout: async () => {
      await signOut();
      window.location.href = '/login';
    },
  }));
}

async function loadAndApplySystemSettings() {
  try {
    const { data } = await getPublicSystemSettings();
    applySystemSettings(data);
  } catch (_error) {
    applySystemSettings();
  }
}

async function loadPendingSuggestionsCount(session) {
  if (!session?.user || !canEditContent(session?.profile?.papel)) {
    return 0;
  }

  try {
    const { count, error } = await countSugestoesPendentes();

    if (error) {
      throw error;
    }

    return Number(count || 0);
  } catch (_error) {
    return 0;
  }
}

async function loadSession() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { user: null, profile: null };
    }

    const profile = await loadProfile(user);
    const permissions = await loadPermissions(user.id, profile);
    return { user, profile, permissions };
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

async function loadPermissions(userId, profile) {
  try {
    const { data, error } = await listCurrentUserPermissionOverrides(userId);

    if (error) {
      throw error;
    }

    return resolvePermissions(profile?.papel, data || []);
  } catch (_error) {
    return resolvePermissions(profile?.papel);
  }
}
