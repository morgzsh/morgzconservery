'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, DEMO } from '@/lib/data';
import { STATUS, eur, investorSummary, pieceNumbers } from '@/lib/calc';
import { TopBar, Stat, PieceCard, PieceDetail, Modal, Footer, Badge, useBusy } from '@/components/ui';

const MV = { apport: 'Apport', retrait: 'Retrait de capital', versement_gains: 'Gains versés' };
const today = () => new Date().toISOString().slice(0, 10);

export default function Admin() {
  const r = useRouter();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('pieces');
  const [profiles, setProfiles] = useState([]);
  const [pieces, setPieces] = useState([]);
  const [mvts, setMvts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState(null);
  const [edit, setEdit] = useState(null);
  const [newInv, setNewInv] = useState(false);
  const [editInv, setEditInv] = useState(null);
  const [newMv, setNewMv] = useState(false);
  const [editMv, setEditMv] = useState(null);

  const load = useCallback(async () => {
    setProfiles(await api.profiles());
    setPieces(await api.pieces());
    setMvts(await api.movements());
  }, []);

  useEffect(() => {
    (async () => {
      if (!(await api.session())) return r.replace('/login');
      const m = await api.me();
      if (!m) return r.replace('/login');
      if (m.role !== 'admin') return r.replace('/espace');
      setMe(m); await load();
    })();
  }, [r, load]);

  if (!me) return null;
  const investors = profiles.filter((p) => p.role === 'investor');
  const byId = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const shareOf = (id) => byId[id]?.share_pct ?? 60;

  const capital = investors.reduce((a, i) => a + investorSummary([], mvts.filter((m) => m.investor_id === i.id)).capital, 0);
  const active = pieces.filter((p) => p.status === 'achetee' || p.status === 'en_vente');
  const engage = active.reduce((a, p) => a + pieceNumbers(p).cost, 0);
  const sold = pieces.filter((p) => p.status === 'vendue');
  const morgzReal = sold.reduce((a, p) => a + pieceNumbers(p, shareOf(p.investor_id)).morgzPart, 0);
  const invReal = sold.reduce((a, p) => a + pieceNumbers(p, shareOf(p.investor_id)).investorPart, 0);
  const shown = pieces.filter((p) => filter === 'all' || p.status === filter);

  return (
    <>
      <TopBar me={me} admin />
      <main className="wrap">
        <section className="hero">
          <div className="eyebrow">Tableau de bord · admin</div>
          <h1>Salut {(me.full_name || 'Morgz').split(' ')[0]}.</h1>
          <p className="sub">{investors.length} partenaire{investors.length > 1 ? 's' : ''} · {active.length} pièce{active.length > 1 ? 's' : ''} en cours · {sold.length} vendue{sold.length > 1 ? 's' : ''}</p>
        </section>

        <div className="stats">
          <Stat dark k="Capital partenaires" v={eur(capital)} h={`${eur(capital - engage)} disponibles`} />
          <Stat k="Engagé en pièces" v={eur(engage)} h={`${active.length} en cours`} />
          <Stat k="Ta marge réalisée" v={eur(morgzReal, true)} h="Part morgz sur pièces vendues" />
          <Stat k="Dû aux partenaires" v={eur(invReal, true)} h="Gains réalisés, avant versements" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div className="tabs">
            {[['pieces', 'Pièces'], ['investors', 'Partenaires'], ['mvts', 'Mouvements']].map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <div style={{ marginBottom: 22 }}>
            {tab === 'pieces' && <button className="btn" onClick={() => setEdit({})}>+ Nouvelle pièce</button>}
            {tab === 'investors' && <button className="btn" onClick={() => setNewInv(true)}>+ Nouveau partenaire</button>}
            {tab === 'mvts' && <button className="btn" onClick={() => setNewMv(true)} disabled={!investors.length}>+ Nouveau mouvement</button>}
          </div>
        </div>

        {tab === 'pieces' && (
          <>
            <div className="chips" style={{ marginBottom: 16 }}>
              {[['all', 'Toutes'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
                <button key={k} className={'btn sm ' + (filter === k ? '' : 'ghost')} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
            {shown.length === 0 ? <div className="empty">Aucune pièce. Ajoute ta première pièce.</div> : (
              <div className="grid">{shown.map((p) => (
                <PieceCard key={p.id} p={p} share={shareOf(p.investor_id)} owner={byId[p.investor_id]?.full_name || 'Non attribuée'} onClick={() => setView(p)} />
              ))}</div>
            )}
          </>
        )}

        {tab === 'investors' && (investors.length === 0 ? <div className="empty">Aucun partenaire.</div> : (
          <div className="scroll"><table className="tbl">
            <thead><tr><th>Partenaire</th><th>Part</th><th className="r">Capital</th><th className="r">Engagé</th><th className="r">Gains réalisés</th><th className="r">Valeur</th><th></th></tr></thead>
            <tbody>{investors.map((i) => {
              const s = investorSummary(pieces.filter((p) => p.investor_id === i.id), mvts.filter((m) => m.investor_id === i.id), i.share_pct);
              return (
                <tr key={i.id}>
                  <td style={{ cursor: 'pointer' }} onClick={() => setEditInv(i)}><b>{i.full_name || '—'}</b><div className="m" style={{ color: 'var(--muted)' }}>{i.email}</div></td>
                  <td>{i.share_pct} %</td>
                  <td className="r">{eur(s.capital)}</td>
                  <td className="r">{eur(s.engage)}</td>
                  <td className="r pos">{eur(s.gainsRealises, true)}</td>
                  <td className="r"><b>{eur(s.valeur)}</b></td>
                  <td className="r"><button className="btn ghost sm" onClick={() => setEditInv(i)}>Gérer</button></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        ))}

        {tab === 'mvts' && (mvts.length === 0 ? <div className="empty">Aucun mouvement. Enregistre le premier apport.</div> : (
          <div className="scroll"><table className="tbl">
            <thead><tr><th>Date</th><th>Partenaire</th><th>Mouvement</th><th>Note</th><th className="r">Montant</th><th></th></tr></thead>
            <tbody>{mvts.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                <td>{byId[m.investor_id]?.full_name || '—'}</td>
                <td><b>{MV[m.type]}</b></td>
                <td className="m" style={{ color: 'var(--muted)' }}>{m.note}</td>
                <td className="r"><b>{m.type === 'apport' ? '+' : '−'}{eur(m.amount)}</b></td>
                <td className="r" style={{ whiteSpace: 'nowrap' }}><button className="btn ghost sm" onClick={() => setEditMv(m)}>Modifier</button> <button className="btn danger sm" onClick={async () => { if (confirm('Supprimer ce mouvement ?')) { await api.deleteMovement(m.id); load(); } }}>Suppr.</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        ))}
        <Footer />
      </main>

      {view && (
        <PieceDetail p={view} share={shareOf(view.investor_id)} onClose={() => setView(null)} actions={<>
          <button className="btn" onClick={() => { setEdit(view); setView(null); }}>Modifier</button>
          {view.status !== 'vendue' && <button className="btn ghost" onClick={() => { setEdit({ ...view, status: 'vendue', sale_price: view.target_price, sold_at: today() }); setView(null); }}>Marquer vendue</button>}
          <button className="btn danger" onClick={async () => { if (confirm('Supprimer cette pièce ?')) { await api.deletePiece(view.id); setView(null); load(); } }}>Supprimer</button>
        </>} />
      )}
      {edit && <PieceForm initial={edit} investors={investors} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {newInv && <InvestorForm onClose={() => setNewInv(false)} onSaved={() => { setNewInv(false); load(); }} />}
      {editInv && byId[editInv.id] && (
        <PartnerEditor inv={byId[editInv.id]} pieces={pieces.filter((p) => p.investor_id === editInv.id)} mvts={mvts.filter((m) => m.investor_id === editInv.id)}
          onClose={() => setEditInv(null)} reload={load} onDeleted={() => { setEditInv(null); load(); }} />
      )}
      {editMv && <MovementForm investors={investors} initial={editMv} onClose={() => setEditMv(null)} onSaved={() => { setEditMv(null); load(); }} />}
      {newMv && <MovementForm investors={investors} onClose={() => setNewMv(false)} onSaved={() => { setNewMv(false); load(); }} />}
    </>
  );
}

function Field({ label, full, children }) {
  return <div className={full ? 'full' : ''}><label>{label}</label>{children}</div>;
}

function PieceForm({ initial, investors, onClose, onSaved }) {
  const [p, setP] = useState({
    title: '', brand: '', size: '', condition: 'Neuf', status: 'achetee', purchase_price: '', target_price: '', sale_price: '',
    fees: 0, purchased_at: today(), target_days: 30, sold_at: '', photos: [], proofs: [], notes: '', investor_id: investors[0]?.id || '',
    ...initial,
  });
  const { busy, err, run } = useBusy();
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const num = (k) => (e) => setP({ ...p, [k]: e.target.value === '' ? '' : Number(e.target.value) });
  const share = investors.find((i) => i.id === p.investor_id)?.share_pct ?? 60;
  const nb = pieceNumbers({ ...p }, share);

  const upload = (kind) => async (e) => {
    const files = [...e.target.files];
    await run(async () => {
      const urls = [];
      for (const f of files) urls.push({ name: f.name, url: await api.upload(f) });
      if (kind === 'photos') setP((x) => ({ ...x, photos: [...(x.photos || []), ...urls.map((u) => u.url)] }));
      else setP((x) => ({ ...x, proofs: [...(x.proofs || []), ...urls] }));
    });
    e.target.value = '';
  };

  return (
    <Modal onClose={onClose}>
      <h2>{initial.id ? 'Modifier la pièce' : 'Nouvelle pièce'}</h2>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        const row = { ...p, purchase_price: Number(p.purchase_price) || 0, target_price: Number(p.target_price) || 0, fees: Number(p.fees) || 0, target_days: Number(p.target_days) || 30, sale_price: p.sale_price === '' ? null : Number(p.sale_price) };
        if (row.status !== 'vendue') { row.sale_price = null; row.sold_at = null; }
        await api.savePiece(row); onSaved();
      }); }}>
        <div className="fgrid">
          <Field label="Marque"><input className="in-f" value={p.brand} onChange={set('brand')} placeholder="Chrome Hearts" /></Field>
          <Field label="Modèle"><input className="in-f" required value={p.title} onChange={set('title')} placeholder="Hoodie Scroll Logo" /></Field>
          <Field label="Taille"><input className="in-f" value={p.size} onChange={set('size')} /></Field>
          <Field label="État"><input className="in-f" value={p.condition} onChange={set('condition')} /></Field>
          <Field label="Partenaire">
            <select value={p.investor_id || ''} onChange={set('investor_id')}>
              <option value="">Non attribuée</option>
              {investors.map((i) => <option key={i.id} value={i.id}>{i.full_name || i.email}</option>)}
            </select>
          </Field>
          <Field label="Statut">
            <select value={p.status} onChange={set('status')}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          </Field>
          <Field label="Prix d'achat (€)"><input className="in-f" type="number" step="0.01" min="0" value={p.purchase_price} onChange={num('purchase_price')} /></Field>
          <Field label="Prix de revente visé (€)"><input className="in-f" type="number" step="0.01" min="0" value={p.target_price} onChange={num('target_price')} /></Field>
          <Field label="Frais (port, plateforme, authentif.)"><input className="in-f" type="number" step="0.01" min="0" value={p.fees} onChange={num('fees')} /></Field>
          <Field label="Délai visé (jours)"><input className="in-f" type="number" min="1" value={p.target_days} onChange={num('target_days')} /></Field>
          <Field label="Date d'achat"><input className="in-f" type="date" value={p.purchased_at || ''} onChange={set('purchased_at')} /></Field>
          {p.status === 'vendue' ? (
            <>
              <Field label="Prix de vente réel (€)"><input className="in-f" type="number" step="0.01" min="0" required value={p.sale_price ?? ''} onChange={num('sale_price')} /></Field>
              <Field label="Date de vente"><input className="in-f" type="date" required value={p.sold_at || ''} onChange={set('sold_at')} /></Field>
            </>
          ) : <div />}
          <Field label="Photos" full>
            <input type="file" accept="image/*" multiple onChange={upload('photos')} />
            <div className="thumbs">{(p.photos || []).map((u, i) => <span key={i}><img src={u} alt="" /><button type="button" onClick={() => setP({ ...p, photos: p.photos.filter((_, j) => j !== i) })}>×</button></span>)}</div>
          </Field>
          <Field label="Preuves d'authenticité (factures, certificats…)" full>
            <input type="file" multiple onChange={upload('proofs')} />
            <div className="chips" style={{ marginTop: 8 }}>{(p.proofs || []).map((f, i) => <span key={i} className="badge">{f.name} <button type="button" style={{ border: 0, background: 'none', cursor: 'pointer' }} onClick={() => setP({ ...p, proofs: p.proofs.filter((_, j) => j !== i) })}>×</button></span>)}</div>
          </Field>
          <Field label="Notes (visibles par le partenaire)" full><textarea value={p.notes || ''} onChange={set('notes')} /></Field>
        </div>
        <div className="kv">
          <div><div className="k">{p.status === 'vendue' ? 'Marge réelle' : 'Marge visée'}</div><div className="v">{eur(p.status === 'vendue' ? nb.marginReal ?? 0 : nb.marginTarget)}</div></div>
          <div><div className="k">Part partenaire ({share} %)</div><div className="v pos">{eur(nb.investorPart, true)}</div></div>
          <div><div className="k">Ta part ({100 - share} %)</div><div className="v">{eur(nb.morgzPart, true)}</div></div>
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        {err && <div className="err">{err}</div>}
      </form>
    </Modal>
  );
}

function genPwd() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}

function InvestorForm({ initial, onClose, onSaved }) {
  const editing = !!initial;
  const [f, setF] = useState({ full_name: '', email: '', share_pct: 60, password: genPwd(), apport: '', ...initial });
  const [done, setDone] = useState(null);
  const { busy, err, run } = useBusy();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (done) return (
    <Modal onClose={onSaved}>
      <h2>Partenaire créé ✅</h2>
      <p>Envoie-lui ces identifiants (il pourra changer son mot de passe ensuite) :</p>
      <div className="kv" style={{ gridTemplateColumns: '1fr' }}>
        <div><div className="k">Lien</div><div className="v" style={{ fontSize: 15 }}>{typeof location !== 'undefined' ? location.origin : ''}/login</div></div>
        <div><div className="k">Email</div><div className="v" style={{ fontSize: 15 }}>{done.email}</div></div>
        {!DEMO && <div><div className="k">Mot de passe</div><div className="v" style={{ fontSize: 15 }}>{done.password}</div></div>}
      </div>
      <button className="btn" onClick={() => navigator.clipboard?.writeText(`Ton espace morgzconservery. partner : ${location.origin}/login\nEmail : ${done.email}${DEMO ? '' : `\nMot de passe : ${done.password}`}`)}>Copier le message</button>
    </Modal>
  );

  return (
    <Modal onClose={onClose}>
      <h2>{editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}</h2>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        if (editing) { await api.updateInvestor({ id: f.id, full_name: f.full_name, share_pct: Number(f.share_pct) }); return onSaved(); }
        await api.createInvestor({ email: f.email.trim(), password: f.password, full_name: f.full_name, share_pct: Number(f.share_pct) });
        if (Number(f.apport) > 0) {
          const inv = (await api.profiles()).find((x) => x.email === f.email.trim());
          if (inv) await api.saveMovement({ investor_id: inv.id, type: 'apport', amount: Number(f.apport), date: today(), note: 'Apport initial' });
        }
        setDone({ email: f.email.trim(), password: f.password });
      }); }}>
        <div className="fgrid">
          <Field label="Nom et prénom"><input className="in-f" required value={f.full_name} onChange={set('full_name')} /></Field>
          <Field label="Part de la marge (%)"><input className="in-f" type="number" min="0" max="100" value={f.share_pct} onChange={set('share_pct')} /></Field>
          {!editing && <>
            <Field label="Email"><input className="in-f" type="email" required value={f.email} onChange={set('email')} /></Field>
            {!DEMO ? <Field label="Mot de passe provisoire"><input className="in-f" required minLength={8} value={f.password} onChange={set('password')} /></Field> : <div />}
            <Field label="Apport initial (€, optionnel)"><input className="in-f" type="number" min="0" value={f.apport} onChange={set('apport')} /></Field>
          </>}
        </div>
        <button className="btn" style={{ marginTop: 18 }} disabled={busy}>{busy ? '…' : editing ? 'Enregistrer' : 'Créer le compte'}</button>
        {err && <div className="err">{err}</div>}
      </form>
    </Modal>
  );
}

function MovementForm({ investors, initial, fixedInvestor, onClose, onSaved }) {
  const editing = !!initial?.id;
  const [m, setM] = useState({ investor_id: fixedInvestor || investors[0]?.id, type: 'apport', amount: '', date: today(), note: '', ...initial });
  const { busy, err, run } = useBusy();
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });
  return (
    <Modal onClose={onClose}>
      <h2>{editing ? 'Modifier le mouvement' : 'Nouveau mouvement'}</h2>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        const row = { investor_id: m.investor_id, type: m.type, amount: Number(m.amount), date: m.date, note: m.note || '' };
        if (editing) await api.updateMovement({ id: m.id, ...row }); else await api.saveMovement(row);
        onSaved();
      }); }}>
        <div className="fgrid">
          <Field label="Partenaire"><select value={m.investor_id} onChange={set('investor_id')} disabled={!!fixedInvestor}>{investors.map((i) => <option key={i.id} value={i.id}>{i.full_name || i.email}</option>)}</select></Field>
          <Field label="Type"><select value={m.type} onChange={set('type')}>{Object.entries(MV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Montant (€)"><input className="in-f" type="number" step="0.01" min="0" required value={m.amount} onChange={set('amount')} /></Field>
          <Field label="Date"><input className="in-f" type="date" required value={m.date} onChange={set('date')} /></Field>
          <Field label="Note" full><input className="in-f" value={m.note} onChange={set('note')} placeholder="Virement reçu, réf. PARTNER…" /></Field>
        </div>
        <button className="btn" style={{ marginTop: 18 }} disabled={busy}>Enregistrer</button>
        {err && <div className="err">{err}</div>}
      </form>
    </Modal>
  );
}

function PartnerEditor({ inv, pieces, mvts, onClose, reload, onDeleted }) {
  const [f, setF] = useState({ full_name: inv.full_name || '', email: inv.email || '', share_pct: inv.share_pct ?? 60, password: '' });
  const [saved, setSaved] = useState(false);
  const [mv, setMv] = useState(null);
  const [del, setDel] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const { busy, err, run } = useBusy();
  const set = (k) => (e) => { setSaved(false); setF({ ...f, [k]: e.target.value }); };
  const s = investorSummary(pieces, mvts, f.share_pct);
  const active = pieces.filter((p) => p.status === 'achetee' || p.status === 'en_vente').length;

  if (mv) return <MovementForm investors={[inv]} fixedInvestor={inv.id} initial={mv} onClose={() => setMv(null)} onSaved={async () => { setMv(null); await reload(); }} />;

  return (
    <Modal onClose={onClose}>
      <h2>{inv.full_name || inv.email}</h2>
      <div className="m" style={{ color: 'var(--muted)', marginTop: -8 }}>{inv.email}</div>

      <div className="kv">
        <div><div className="k">Capital investi</div><div className="v">{eur(s.capital)}</div></div>
        <div><div className="k">Engagé en pièces</div><div className="v">{eur(s.engage)}</div></div>
        <div><div className="k">Disponible</div><div className="v">{eur(s.disponible)}</div></div>
        <div><div className="k">Gains réalisés</div><div className="v pos">{eur(s.gainsRealises, true)}</div></div>
        <div><div className="k">Gains versés</div><div className="v">{eur(s.verses)}</div></div>
        <div><div className="k">Valeur actuelle</div><div className="v">{eur(s.valeur)}</div></div>
      </div>

      <h3 style={{ margin: '22px 0 10px', fontSize: 17 }}>Informations</h3>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        const body = { id: inv.id, full_name: f.full_name, share_pct: Number(f.share_pct) };
        if (f.email.trim() && f.email.trim() !== inv.email) body.email = f.email.trim();
        if (f.password) body.password = f.password;
        await api.updateInvestor(body); await reload(); setF({ ...f, password: '' }); setSaved(true);
      }); }}>
        <div className="fgrid">
          <Field label="Nom et prénom"><input className="in-f" required value={f.full_name} onChange={set('full_name')} /></Field>
          <Field label="Part de la marge (%)"><input className="in-f" type="number" min="0" max="100" value={f.share_pct} onChange={set('share_pct')} /></Field>
          <Field label="Email de connexion"><input className="in-f" type="email" required value={f.email} onChange={set('email')} /></Field>
          {!DEMO ? <Field label="Nouveau mot de passe (optionnel)"><input className="in-f" minLength={8} value={f.password} onChange={set('password')} placeholder="Laisser vide pour ne pas changer" /></Field> : <div />}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
          <button className="btn" disabled={busy}>{busy ? '…' : 'Enregistrer'}</button>
          {saved && <span className="pos" style={{ fontWeight: 600 }}>Enregistré ✓</span>}
        </div>
      </form>

      <div className="row" style={{ margin: '28px 0 10px' }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>Argent investi et versements</h3>
        <button className="btn ghost sm" onClick={() => setMv({ type: 'apport' })}>+ Ajouter</button>
      </div>
      {mvts.length === 0 ? <div className="empty" style={{ padding: 24 }}>Aucun mouvement.</div> : (
        <div className="scroll"><table className="tbl" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
          <thead><tr><th>Date</th><th>Type</th><th className="r">Montant</th><th></th></tr></thead>
          <tbody>{mvts.map((m) => (
            <tr key={m.id}>
              <td>{new Date(m.date).toLocaleDateString('fr-FR')}{m.note ? <div className="m" style={{ color: 'var(--muted)', fontSize: 12 }}>{m.note}</div> : null}</td>
              <td><b>{MV[m.type]}</b></td>
              <td className="r"><b>{m.type === 'apport' ? '+' : '−'}{eur(m.amount)}</b></td>
              <td className="r" style={{ whiteSpace: 'nowrap' }}>
                <button className="btn ghost sm" onClick={() => setMv(m)}>Modifier</button>{' '}
                <button className="btn danger sm" onClick={() => run(async () => { await api.deleteMovement(m.id); await reload(); })}>×</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}

      <div style={{ marginTop: 30, padding: 18, borderRadius: 18, border: '1px solid #f3d3c4', background: '#fff8f5' }}>
        <b style={{ color: 'var(--warn)' }}>Supprimer ce partenaire</b>
        <p className="m" style={{ color: 'var(--ink-2)', fontSize: 13.5, margin: '6px 0 12px' }}>
          Son compte et tout son historique d'argent seront supprimés définitivement.
          {pieces.length > 0 && ` Ses ${pieces.length} pièce${pieces.length > 1 ? 's' : ''} resteront dans ta liste, en « Non attribuée ».`}
          {active > 0 && ` Attention : ${active} pièce${active > 1 ? 's sont' : ' est'} encore en cours.`}
        </p>
        {!del ? <button className="btn danger sm" onClick={() => setDel(true)}>Supprimer…</button> : (
          <div>
            <label>Pour confirmer, tape son nom : <b>{inv.full_name || inv.email}</b></label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="in-f" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
              <button className="btn" style={{ background: 'var(--warn)' }} disabled={busy || confirmName.trim() !== (inv.full_name || inv.email).trim()}
                onClick={() => run(async () => { await api.deleteInvestor(inv.id); onDeleted(); })}>Supprimer définitivement</button>
            </div>
          </div>
        )}
      </div>
      {err && <div className="err">{err}</div>}
    </Modal>
  );
}
