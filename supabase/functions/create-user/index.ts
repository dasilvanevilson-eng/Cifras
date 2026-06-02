import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!['GET', 'POST'].includes(req.method)) {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization') || '';
  const token = authorization.replace('Bearer ', '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Funcao sem configuracao administrativa.' }, 500);
  }

  if (!token) {
    return jsonResponse({ error: 'Sessao nao informada.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await adminClient.auth.getUser(token);

  if (userError || !userData.user) {
    return jsonResponse({ error: 'Sessao invalida.' }, 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('papel')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }

  if (profile?.papel !== 'admin') {
    return jsonResponse({ error: 'Apenas administradores podem cadastrar usuarios.' }, 403);
  }

  if (req.method === 'GET') {
    return listUsers(adminClient);
  }

  let payload;

  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: 'Dados invalidos.' }, 400);
  }

  const email = String(payload?.email || '').trim().toLowerCase();
  const password = String(payload?.password || '');
  const nome = String(payload?.nome || '').trim() || email;
  const papel = String(payload?.papel || 'musico').trim();

  if (!email || !password) {
    return jsonResponse({ error: 'Informe e-mail e senha.' }, 400);
  }

  if (!['admin', 'editor', 'musico'].includes(papel)) {
    return jsonResponse({ error: 'Papel invalido.' }, 400);
  }

  if (password.length < 6) {
    return jsonResponse({ error: 'A senha deve ter pelo menos 6 caracteres.' }, 400);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (createError || !created.user) {
    return jsonResponse({ error: createError?.message || 'Nao foi possivel criar o usuario.' }, 400);
  }

  const { data: savedProfile, error: saveProfileError } = await adminClient
    .from('profiles')
    .upsert({
      id: created.user.id,
      nome,
      papel,
    })
    .select('id, nome, papel')
    .single();

  if (saveProfileError) {
    return jsonResponse({ error: saveProfileError.message }, 500);
  }

  return jsonResponse({
    user: {
      id: created.user.id,
      email: created.user.email,
      ...savedProfile,
    },
  });
});

async function listUsers(adminClient: ReturnType<typeof createClient>) {
  const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersError) {
    return jsonResponse({ error: authUsersError.message }, 500);
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, nome, papel, created_at');

  if (profilesError) {
    return jsonResponse({ error: profilesError.message }, 500);
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const users = (authUsers.users || [])
    .map((user) => {
      const profile = profilesById.get(user.id);

      return {
        id: user.id,
        email: user.email,
        nome: profile?.nome || user.user_metadata?.nome || user.email || '-',
        papel: profile?.papel || 'musico',
        created_at: profile?.created_at || user.created_at,
      };
    })
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  return jsonResponse({ users });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
