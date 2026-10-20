'use client';
import { createClient } from '@supabase/supabase-js';
import { demoSeed } from './demo';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const DEMO = !URL || !KEY;

let sb = null;
function client() {
  if (!sb) sb = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}

/* ------------------------------------------------------------------ */
/* Mode démo : données locales dans le navigateur (aucun serveur).      */
/* ------------------------------------------------------------------ */
const DK = 'mzc-demo-v1';
function dload() {
  try { const s = JSON.parse(localStorage.getItem(DK)); if (s) return s; } catch {}
  const s = demoSeed(); dsave(s); return s;
}
function dsave(s) { try { localStorage.setItem(DK, JSON.stringify(s)); } catch {} }
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

const demo = {
  async session() { const s = dload(); return s.session ? { user: { id: s.session } } : null; },
  async signIn(email) {
    const s = dload();
    const u = s.profiles.find((p) => p.email.toLowerCase() === String(email).toLowerCase());
    if (!u) throw new Error('Compte introuvable (démo : admin@demo.fr ou investisseur@demo.fr)');
    s.session = u.id; dsave(s); return u;
  },
  async signOut() { const s = dload(); s.session = null; dsave(s); },
  async me() { const s = dload(); return s.profiles.find((p) => p.id === s.session) || null; },
  async updatePassword() { return true; },
  async profiles() { return dload().profiles; },
  async pieces(investorId) { const s = dload(); return s.pieces.filter((p) => !investorId || p.investor_id === investorId).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')); },
  async movements(investorId) { const s = dload(); return s.movements.filter((m) => !investorId || m.investor_id === investorId).sort((a, b) => b.date.localeCompare(a.date)); },
  async savePiece(p) {
    const s = dload();
    if (p.id) s.pieces = s.pieces.map((x) => (x.id === p.id ? { ...x, ...p } : x));
    else s.pieces.push({ ...p, id: uid(), created_at: new Date().toISOString() });
    dsave(s);
  },
  async deletePiece(id) { const s = dload(); s.pieces = s.pieces.filter((x) => x.id !== id); dsave(s); },
  async saveMovement(m) { const s = dload(); s.movements.push({ ...m, id: uid() }); dsave(s); },
  async deleteMovement(id) { const s = dload(); s.movements = s.movements.filter((x) => x.id !== id); dsave(s); },
  async createInvestor({ email, full_name, share_pct }) {
    const s = dload();
    if (s.profiles.some((p) => p.email === email)) throw new Error('Cet email existe déjà');
    s.profiles.push({ id: uid(), email, full_name, share_pct: Number(share_pct) || 60, role: 'investor' }); dsave(s);
  },
  async updateInvestor(p) { const s = dload(); s.profiles = s.profiles.map((x) => (x.id === p.id ? { ...x, ...p } : x)); dsave(s); },
  async upload(file) {
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  },
  async reset() { localStorage.removeItem(DK); },
};

/* ------------------------------------------------------------------ */
/* Mode production : Supabase                                          */
/* ------------------------------------------------------------------ */
function ok({ data, error }) { if (error) throw new Error(error.message); return data; }

const live = {
  async session() { const { data } = await client().auth.getSession(); return data.session; },
  async signIn(email, password) { return ok(await client().auth.signInWithPassword({ email, password })); },
  async signOut() { await client().auth.signOut(); },
  async me() {
    const { data } = await client().auth.getUser();
    if (!data.user) return null;
    return ok(await client().from('profiles').select('*').eq('id', data.user.id).single());
  },
  async updatePassword(password) { ok(await client().auth.updateUser({ password })); return true; },
  async profiles() { return ok(await client().from('profiles').select('*').order('created_at')); },
  async pieces(investorId) {
    let q = client().from('pieces').select('*').order('created_at', { ascending: false });
    if (investorId) q = q.eq('investor_id', investorId);
    return ok(await q);
  },
  async movements(investorId) {
    let q = client().from('movements').select('*').order('date', { ascending: false });
    if (investorId) q = q.eq('investor_id', investorId);
    return ok(await q);
  },
  async savePiece(p) {
    const row = { ...p }; delete row.created_at;
    for (const k of ['sale_price', 'purchased_at', 'sold_at', 'investor_id']) if (row[k] === '') row[k] = null;
    if (row.id) ok(await client().from('pieces').update(row).eq('id', row.id));
    else { delete row.id; ok(await client().from('pieces').insert(row)); }
  },
  async deletePiece(id) { ok(await client().from('pieces').delete().eq('id', id)); },
  async saveMovement(m) { ok(await client().from('movements').insert(m)); },
  async deleteMovement(id) { ok(await client().from('movements').delete().eq('id', id)); },
  async createInvestor(body) {
    const { data } = await client().auth.getSession();
    const r = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Erreur');
    return j;
  },
  async updateInvestor(p) {
    const { id, full_name, share_pct } = p;
    ok(await client().from('profiles').update({ full_name, share_pct }).eq('id', id));
  },
  async upload(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${new Date().toISOString().slice(0, 10)}/${uid()}.${ext}`;
    ok(await client().storage.from('partner').upload(path, file, { upsert: false, contentType: file.type }));
    return client().storage.from('partner').getPublicUrl(path).data.publicUrl;
  },
  async reset() {},
};

export const api = DEMO ? demo : live;
