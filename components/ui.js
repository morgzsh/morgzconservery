'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, DEMO } from '@/lib/data';
import { STATUS, EXPENSE_TYPES, EXPENSE_STATUS, EXPENSE_RULE, eur, pieceNumbers, timing } from '@/lib/calc';

export function isCapture() {
  if (typeof window === 'undefined') return false;
  try { if (location.search.includes('capture')) sessionStorage.setItem('cap', '1'); return sessionStorage.getItem('cap') === '1'; } catch { return false; }
}

export function DemoBanner() {
  if (!DEMO || isCapture()) return null;
  return (
    <div className="demo-banner">
      Mode démo — données fictives stockées dans ce navigateur.{' '}
      <button onClick={async () => { await api.reset(); location.href = '/login'; }}>Réinitialiser</button>
    </div>
  );
}

export function TopBar({ me, admin }) {
  const r = useRouter();
  return (
    <>
      <DemoBanner />
      <div className="top">
        <div className="in">
          <img src="/logo.png" alt="morgzconservery." />
          <span className="pill">PARTNER</span>
          <span className="sp" />
          {admin && <span className="badge dark">Admin</span>}
          <span className="who">{admin ? 'Morgz' : me?.full_name || me?.email}</span>
          <button className="btn ghost sm" onClick={async () => { await api.signOut(); r.replace('/login'); }}>Déconnexion</button>
        </div>
      </div>
    </>
  );
}

export function Stat({ k, v, h, dark }) {
  return (
    <div className={'stat' + (dark ? ' dark' : '')}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
      {h && <div className="h">{h}</div>}
    </div>
  );
}

export function Badge({ status }) {
  const s = STATUS[status] || STATUS.sourcing;
  return <span className={'badge ' + s.tone}>{s.label}</span>;
}

export function PieceCard({ p, share, onClick, owner, mine }) {
  const nb = pieceNumbers(p, share);
  const tm = timing(p);
  return (
    <button className="card" onClick={onClick}>
      <div className="ph">
        <span className="badge-wrap" style={{ position: 'absolute', top: 12, left: 12 }}><Badge status={p.status} /></span>
        {p.photos?.[0] ? <img src={p.photos[0]} alt="" /> : <span className="m">Photo à venir</span>}
      </div>
      <div className="bd">
        <div className="t">{p.brand ? p.brand + ' — ' : ''}{p.title}</div>
        <div className="m">{[p.size && 'Taille ' + p.size, p.condition, owner].filter(Boolean).join(' · ')}</div>
        <div className="row" style={{ marginTop: 12 }}>
          <div>
            <div className="m">Achat</div>
            <div style={{ fontWeight: 700 }}>{eur(nb.cost)}</div>
          </div>
          <div>
            <div className="m">{nb.sold ? 'Vendue' : 'Prix visé'}</div>
            <div style={{ fontWeight: 700 }}>{eur(nb.sold ? p.sale_price : p.target_price)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="m">{mine ? 'Ta part' : owner ? 'Part partenaire' : 'Ta part'}</div>
            <div className={'big ' + ((mine ? nb.morgzPart : nb.investorPart) >= 0 ? 'pos' : 'neg')}>{eur(mine ? nb.morgzPart : nb.investorPart, true)}</div>
          </div>
        </div>
        {tm && (
          <>
            <div className={'bar' + (tm.late ? ' late' : '')}><i style={{ width: tm.pct + '%' }} /></div>
            <div className="m" style={{ marginTop: 6 }}>
              {nb.sold ? `Vendue en ${tm.days} j` : `J+${tm.days} sur ${tm.target} j visés${tm.late ? ' · en retard' : ''}`}
            </div>
          </>
        )}
      </div>
    </button>
  );
}

export function Modal({ onClose, children }) {
  return (
    <div className="ov" onClick={onClose}>
      <div className="md" onClick={(e) => e.stopPropagation()}>
        <button className="btn ghost sm x" onClick={onClose}>Fermer</button>
        {children}
      </div>
    </div>
  );
}

export function PieceDetail({ p, share, onClose, actions, mine, owner }) {
  const nb = pieceNumbers(p, share);
  const tm = timing(p);
  const sh = Number(share) || 60;
  return (
    <Modal onClose={onClose}>
      <Badge status={p.status} />
      <h2 style={{ marginTop: 12 }}>{p.brand ? p.brand + ' — ' : ''}{p.title}</h2>
      <div className="m" style={{ color: 'var(--muted)', marginTop: -8 }}>{[p.size && 'Taille ' + p.size, p.condition].filter(Boolean).join(' · ')}</div>
      {p.photos?.length > 0 && <div className="gal" style={{ marginTop: 18 }}>{p.photos.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" /></a>)}</div>}
      <div className="kv">
        <div><div className="k">Prix d'achat</div><div className="v">{eur(p.purchase_price)}</div></div>
        <div><div className="k">Frais</div><div className="v">{eur(Number(p.fees || 0) + Number(p.extra_fees || 0))}</div></div>
        <div><div className="k">{nb.sold ? 'Prix de vente' : 'Prix visé'}</div><div className="v">{eur(nb.sold ? p.sale_price : p.target_price)}</div></div>
        <div><div className="k">{nb.sold ? 'Marge réelle' : 'Marge visée'}</div><div className="v">{eur(nb.sold ? nb.marginReal : nb.marginTarget)}</div></div>
        {mine
          ? <div><div className="k">Ta part (100 %)</div><div className={'v ' + (nb.morgzPart >= 0 ? 'pos' : 'neg')}>{eur(nb.morgzPart, true)}</div></div>
          : <div><div className="k">{owner ? `Part de ${owner} (${sh} %)` : `Ta part (${sh} %)`}</div><div className={'v ' + (nb.investorPart >= 0 ? 'pos' : 'neg')}>{eur(nb.investorPart, true)}</div></div>}
        <div><div className="k">Rendement</div><div className="v">{(mine ? (nb.cost > 0 ? nb.morgzPart / nb.cost * 100 : 0) : nb.roiPct).toFixed(0)} %</div></div>
      </div>
      {mine ? <div className="m" style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 10 }}>Pièce pour Morgz · 100 % de la marge pour toi</div> : <>
        <div className="split"><i style={{ width: sh + '%' }} /><u style={{ width: 100 - sh + '%' }} /></div>
        <div className="row m" style={{ color: 'var(--muted)', fontSize: 12.5 }}><span>{owner || 'Toi'} · {sh} %</span><span>Morgz · {100 - sh} %</span></div>
      </>}
      {tm && (
        <div style={{ marginTop: 18 }}>
          <div className="row"><b>Délai</b><span className="m" style={{ color: 'var(--muted)' }}>Acheté le {new Date(p.purchased_at).toLocaleDateString('fr-FR')}{p.sold_at ? ' · vendu le ' + new Date(p.sold_at).toLocaleDateString('fr-FR') : ' · objectif ' + tm.due.toLocaleDateString('fr-FR')}</span></div>
          <div className={'bar' + (tm.late ? ' late' : '')}><i style={{ width: tm.pct + '%' }} /></div>
        </div>
      )}
      {p.linked_expenses?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <b>Frais rattachés</b>
          <ExpenseList items={p.linked_expenses} compact />
        </div>
      )}
      {p.notes && <p style={{ marginTop: 18, color: 'var(--ink-2)' }}>{p.notes}</p>}
      {p.proofs?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <b>Preuves d'authenticité</b>
          <div className="chips" style={{ marginTop: 8 }}>{p.proofs.map((f, i) => <a key={i} className="badge" href={f.url} target="_blank" rel="noreferrer">{f.name}</a>)}</div>
        </div>
      )}
      {!nb.sold && <p className="m" style={{ color: 'var(--muted)', fontSize: 12, marginTop: 18 }}>Montants visés : estimation, non garantie.</p>}
      {actions && <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>{actions}</div>}
    </Modal>
  );
}

export function useBusy() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (fn) => { setBusy(true); setErr(''); try { await fn(); } catch (e) { setErr(e.message || String(e)); } finally { setBusy(false); } };
  return { busy, err, run, setErr };
}

export function Footer() {
  return <div className="foot">morgzconservery. partner · Paris — Worldwide · Montants visés indicatifs, capital et gains non garantis.</div>;
}

/** Liste des frais, côté partenaire comme côté admin. */
export function ExpenseList({ items, pieceName, owner, actions, compact }) {
  if (!items.length) return <div className="empty" style={compact ? { padding: 20 } : null}>Aucun frais.</div>;
  return (
    <div className="scroll" style={compact ? { marginTop: 8 } : null}><table className="tbl" style={compact ? { boxShadow: 'none', border: '1px solid var(--line)' } : null}>
      <thead><tr><th>Date</th><th>Frais</th>{!compact && <th>Rattaché à</th>}<th>Statut</th><th className="r">Montant</th>{actions && <th></th>}</tr></thead>
      <tbody>{items.map((e) => (
        <tr key={e.id}>
          <td>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
          <td><b>{EXPENSE_TYPES[e.type] || 'Frais'}</b>{e.label ? <div className="m" style={{ color: 'var(--muted)', fontSize: 12.5 }}>{e.label}</div> : null}
            {e.proof?.url ? <div><a className="m" href={e.proof.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>📎 {e.proof.name || 'Justificatif'}</a></div> : null}</td>
          {!compact && <td className="m" style={{ color: 'var(--muted)' }}>{[owner?.(e), e.piece_id ? (pieceName?.(e.piece_id) || 'Pièce') : 'Général'].filter(Boolean).join(' · ')}</td>}
          <td><span className={'badge ' + (e.status === 'regle' ? 'dark' : 'muted')}>{EXPENSE_STATUS[e.status] || 'Prévu'}</span></td>
          <td className="r"><b>−{eur(e.amount)}</b></td>
          {actions && <td className="r" style={{ whiteSpace: 'nowrap' }}>{actions(e)}</td>}
        </tr>
      ))}</tbody>
    </table></div>
  );
}

export function ExpenseRule({ share }) {
  const sh = Number(share) || 60;
  return (
    <p className="m" style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>
      {EXPENSE_RULE} Les frais sont déduits de la marge avant le partage {sh}/{100 - sh} : tu en portes {sh} %.
    </p>
  );
}
