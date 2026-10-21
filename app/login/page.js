'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, DEMO } from '@/lib/data';
import { DemoBanner, useBusy, isCapture } from '@/components/ui';

export default function Login() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { busy, err, run } = useBusy();
  const [cap, setCap] = useState(false);
  useEffect(() => setCap(isCapture()), []);

  const go = (e, p) => run(async () => {
    await api.signIn(e, p);
    const me = await api.me();
    r.replace(me?.role === 'admin' ? '/admin' : '/espace');
  });

  return (
    <>
      <DemoBanner />
      <main style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <img src="/logo-partner.png" alt="morgzconservery. partner" style={{ width: 260, maxWidth: '80%', mixBlendMode: 'multiply' }} />
          <h1 style={{ fontSize: 34, marginTop: 28 }}>Espace partenaire.</h1>
          <p className="sub" style={{ marginBottom: 28 }}>Suis tes pièces, tes ventes et ta part en temps réel.</p>
          <form onSubmit={(e) => { e.preventDefault(); go(email, password); }} style={{ textAlign: 'left', display: 'grid', gap: 14 }}>
            <div><label>Email</label><input className="in-f" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            {(!DEMO || cap) && <div><label>Mot de passe</label><input className="in-f" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></div>}
            <button className="btn" disabled={busy} style={{ height: 48, marginTop: 4 }}>{busy ? 'Connexion…' : 'Se connecter'}</button>
          </form>
          {err && <div className="err">{err}</div>}
          {DEMO && !cap && (
            <div style={{ marginTop: 26 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>Essayer la démo</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn ghost sm" onClick={() => go('admin@demo.fr')}>Vue admin</button>
                <button className="btn ghost sm" onClick={() => go('investisseur@demo.fr')}>Vue investisseur</button>
              </div>
            </div>
          )}
          <p className="m" style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 34 }}>Accès réservé aux partenaires. Identifiants fournis par morgzconservery.</p>
        </div>
      </main>
    </>
  );
}
