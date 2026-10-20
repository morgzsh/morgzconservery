import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Crée un compte investisseur (réservé à l'admin). */
export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return Response.json({ error: 'Serveur non configuré (SUPABASE_SERVICE_ROLE_KEY manquante)' }, { status: 500 });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return Response.json({ error: 'Non connecté' }, { status: 401 });
  const { data: me } = await admin.from('profiles').select('role').eq('id', who.user.id).single();
  if (me?.role !== 'admin') return Response.json({ error: 'Réservé à l’admin' }, { status: 403 });

  const { email, password, full_name, share_pct } = await req.json();
  if (!email || !password || password.length < 8) return Response.json({ error: 'Email et mot de passe (8 caractères min.) requis' }, { status: 400 });

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });

  await admin.from('profiles').upsert({ id: data.user.id, email, full_name, role: 'investor', share_pct: Number(share_pct) || 60 });
  return Response.json({ id: data.user.id });
}
