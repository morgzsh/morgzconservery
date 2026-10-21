import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Vérifie que l'appel vient bien de l'admin. Renvoie { admin, me } ou une Response d'erreur. */
async function guard(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return { error: Response.json({ error: 'Serveur non configuré (SUPABASE_SERVICE_ROLE_KEY manquante)' }, { status: 500 }) };
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: who } = await admin.auth.getUser(token);
  if (!who?.user) return { error: Response.json({ error: 'Non connecté' }, { status: 401 }) };
  const { data: me } = await admin.from('profiles').select('role').eq('id', who.user.id).single();
  if (me?.role !== 'admin') return { error: Response.json({ error: 'Réservé à l’admin' }, { status: 403 }) };
  return { admin, uid: who.user.id };
}

/** Crée un compte partenaire. */
export async function POST(req) {
  const g = await guard(req); if (g.error) return g.error;
  const { email, password, full_name, share_pct } = await req.json();
  if (!email || !password || password.length < 8) return Response.json({ error: 'Email et mot de passe (8 caractères min.) requis' }, { status: 400 });
  const { data, error } = await g.admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  await g.admin.from('profiles').upsert({ id: data.user.id, email, full_name, role: 'investor', share_pct: Number(share_pct) || 60 });
  return Response.json({ id: data.user.id });
}

/** Modifie un partenaire : nom, part, email, mot de passe. */
export async function PATCH(req) {
  const g = await guard(req); if (g.error) return g.error;
  const { id, email, password, full_name, share_pct } = await req.json();
  if (!id) return Response.json({ error: 'id manquant' }, { status: 400 });
  const authUpdate = {};
  if (email) authUpdate.email = email;
  if (password) {
    if (password.length < 8) return Response.json({ error: 'Mot de passe : 8 caractères minimum' }, { status: 400 });
    authUpdate.password = password;
  }
  if (Object.keys(authUpdate).length) {
    const { error } = await g.admin.auth.admin.updateUserById(id, { ...authUpdate, email_confirm: true });
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  const row = {};
  if (full_name !== undefined) row.full_name = full_name;
  if (share_pct !== undefined) row.share_pct = Number(share_pct);
  if (email) row.email = email;
  if (Object.keys(row).length) {
    const { error } = await g.admin.from('profiles').update(row).eq('id', id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ ok: true });
}

/** Supprime un partenaire (compte + mouvements ; ses pièces deviennent « non attribuées »). */
export async function DELETE(req) {
  const g = await guard(req); if (g.error) return g.error;
  const { id } = await req.json();
  if (!id) return Response.json({ error: 'id manquant' }, { status: 400 });
  if (id === g.uid) return Response.json({ error: 'Tu ne peux pas supprimer ton propre compte admin' }, { status: 400 });
  const { error } = await g.admin.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
