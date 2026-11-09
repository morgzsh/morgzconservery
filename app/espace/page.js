'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, DEMO } from '@/lib/data';
import { eur, investorSummary, withExpenses, pieceFor, pieceNumbers, ORDER_STATUS, ORDER_STEPS, orderNumbers, payout } from '@/lib/calc';
import { TopBar, Stat, PieceCard, PieceDetail, Modal, Footer, ExpenseList, ExpenseRule, useBusy } from '@/components/ui';

const MV = { apport: 'Apport', retrait: 'Retrait de capital', versement_gains: 'Gains versés', gain_plus: 'Gains ajoutés', gain_moins: 'Gains corrigés (−)' };
const PLUS = (t) => t === 'apport' || t === 'gain_plus';

export default function Espace() {
  const r = useRouter();
  const [me, setMe] = useState(null);
  const [pieces, setPieces] = useState([]);
  const [mvts, setMvts] = useState([]);
  const [exps, setExps] = useState([]);
  const [open, setOpen] = useState(null);
  const [pwd, setPwd] = useState(false);
  const [props, setProps] = useState([]);
  const [answering, setAnswering] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wds, setWds] = useState([]);
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await api.session())) return r.replace('/login');
      const m = await api.me();
      if (!m) return r.replace('/login');
      if (m.role === 'admin') return r.replace('/admin');
      setMe(m);
      if (m.role === 'client') { setOrders(await api.orders(m.id)); return; }
      const ex = await api.expenses(m.id);
      setExps(ex);
      setPieces(withExpenses(await api.pieces(m.id), ex).map((p) => pieceFor(p, m.id)));
      setMvts(await api.movements(m.id));
      setProps(await api.proposals(m.id));
      setWds(await api.withdrawals(m.id));
    })();
  }, [r]);

  if (!me) return null;
  if (me.role === 'client') return <ClientSpace me={me} orders={orders} />;
  const share = me.share_pct ?? 60;
  const s = investorSummary(pieces, mvts, share, exps);
  const pieceName = (id) => { const p = pieces.find((x) => x.id === id); return p ? (p.brand ? p.brand + ' — ' : '') + p.title : 'Pièce'; };
  const first = (me.full_name || '').split(' ')[0];

  return (
    <>
      <TopBar me={me} />
      <main className="wrap">
        <section className="hero">
          <div className="eyebrow">Espace partenaire · {share} % de la marge</div>
          <h1>{first ? `Bonjour ${first}.` : 'Bonjour.'}</h1>
          <p className="sub">Voici où en sont tes pièces.</p>
        </section>

        {me.partner_message && (
          <div className="msgcard">
            <div className="msghead"><span className="msgdot" />Message de Morgz{me.partner_message_at && <span className="msgdate">{new Date(me.partner_message_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>}</div>
            <p>{me.partner_message}</p>
          </div>
        )}

        <div className="stats">
          <Stat dark k="Valeur actuelle" v={eur(s.valeur)} h="Capital + gains réalisés non versés" />
          <Stat k="Capital investi" v={eur(s.capital)} h={`${eur(s.engage)} engagés · ${eur(s.disponible)} disponibles`} />
          <Stat k="Gains réalisés" v={eur(s.gainsRealises, true)} h={`${s.nbSold} pièce${s.nbSold > 1 ? 's' : ''} vendue${s.nbSold > 1 ? 's' : ''}`} />
          <Stat k="Gains visés en cours" v={eur(s.gainsPotentiels, true)} h={`${s.nbActive} pièce${s.nbActive > 1 ? 's' : ''} en cours · non garantis`} />
        </div>

        <Solde s={s} wds={wds} onAsk={() => setAsk(true)} />

        {props.length > 0 && (
          <>
            <h2>Propositions pour toi</h2>
            <p className="m" style={{ color: 'var(--muted)', marginTop: -8, marginBottom: 16 }}>Des pièces que Morgz peut sourcer. Dis-lui si tu es partant, il s'occupe du reste.</p>
            <div style={{ display: 'grid', gap: 14, marginBottom: 34 }}>{props.map((x) => {
              const nb = pieceNumbers({ purchase_price: x.purchase_price, target_price: x.target_price, fees: 0, status: 'achetee', investor_id: me.id, investor_contribution: x.contribution }, share);
              const respond = async (ok) => { setAnswering(x.id); try { await api.respondProposal(x.id, ok); setProps(await api.proposals(me.id)); } catch (e) { alert(e.message || 'Erreur'); } setAnswering(null); };
              return (
                <div key={x.id} className="propcard">
                  <div className="pimg">{x.photos?.[0] ? <img src={x.photos[0]} alt="" /> : <span className="m">Photo à venir</span>}</div>
                  <div className="pb">
                    <div className="t" style={{ fontWeight: 700, fontSize: 17 }}>{x.brand ? x.brand + ' — ' : ''}{x.title}</div>
                    {x.size && <div className="m" style={{ color: 'var(--muted)' }}>Taille {x.size}</div>}
                    <div className="kv" style={{ marginTop: 12 }}>
                      <div><div className="k">Prix d'achat</div><div className="v">{eur(x.purchase_price)}</div></div>
                      <div><div className="k">Revente visée</div><div className="v">{eur(x.target_price)}</div></div>
                      <div><div className="k">Ta mise</div><div className="v">{eur(nb.mise)}</div></div>
                      <div><div className="k">Ta part visée ({share} %)</div><div className="v pos">{eur(nb.investorPartTarget, true)}</div></div>
                    </div>
                    {x.note && <p style={{ marginTop: 10, color: 'var(--ink-2)' }}>{x.note}</p>}
                    {x.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                        <button className="btn" disabled={answering === x.id} onClick={() => respond(true)}>Je suis partant</button>
                        <button className="btn ghost" disabled={answering === x.id} onClick={() => respond(false)}>Pas pour moi</button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 14 }}><span className={'badge ' + (x.status === 'accepted' ? 'ok' : '')}>{x.status === 'accepted' ? 'Tu es partant · Morgz te recontacte' : 'Tu as passé ton tour'}</span></div>
                    )}
                    <div className="m" style={{ color: 'var(--muted)', fontSize: 12, marginTop: 10 }}>Montants visés : estimation, non garantie.</div>
                  </div>
                </div>
              );
            })}</div>
          </>
        )}

        <h2>Tes pièces</h2>
        {pieces.length === 0 ? (
          <div className="empty">Aucune pièce pour le moment.<br />Tu seras informé dès la première sélection.</div>
        ) : (
          <div className="grid">{pieces.map((p) => <PieceCard key={p.id} p={p} share={share} onClick={() => setOpen(p)} />)}</div>
        )}

        <div className="section">
          <div className="row"><h2 style={{ margin: 0 }}>Frais</h2>{exps.length > 0 && <span className="m" style={{ color: 'var(--muted)' }}>Total {eur(s.fraisTotal)} · ta part {eur(s.fraisPart)}</span>}</div>
          <div style={{ marginTop: 14 }}><ExpenseList items={exps} pieceName={pieceName} share={share} partLabel="Ta part" /></div>
          <ExpenseRule share={share} />
        </div>

        <div className="section">
          <h2>Historique</h2>
          {mvts.length === 0 ? <div className="empty">Aucun mouvement.</div> : (
            <div className="scroll"><table className="tbl">
              <thead><tr><th>Date</th><th>Mouvement</th><th>Mention</th><th className="r">Montant</th></tr></thead>
              <tbody>{mvts.map((m) => (
                <tr key={m.id}><td>{new Date(m.date).toLocaleDateString('fr-FR')}</td><td><b>{MV[m.type]}</b></td><td className="m" style={{ color: 'var(--muted)' }}>{m.note}</td><td className="r"><b>{PLUS(m.type) ? '+' : '−'}{eur(m.amount)}</b></td></tr>
              ))}</tbody>
            </table></div>
          )}
          <p style={{ marginTop: 18, color: 'var(--muted)', fontSize: 13.5 }}>
            Pour réinvestir ou récupérer tes gains, écris-moi en DM sur <b style={{ color: 'var(--ink)' }}>@morgzconservery</b>.
          </p>
          {!DEMO && <button className="btn ghost sm" onClick={() => setPwd(true)}>Changer mon mot de passe</button>}
        </div>
        <Footer />
      </main>
      {ask && <AskWithdrawal me={me} s={s} onClose={() => setAsk(false)} onSaved={async () => { setAsk(false); setWds(await api.withdrawals(me.id)); }} />}
      {open && <PieceDetail p={open} share={share} onClose={() => setOpen(null)} />}
      {pwd && <PasswordModal onClose={() => setPwd(false)} />}
    </>
  );
}

function PasswordModal({ onClose }) {
  const [p, setP] = useState('');
  const [done, setDone] = useState(false);
  const { busy, err, run } = useBusy();
  return (
    <Modal onClose={onClose}>
      <h2>Nouveau mot de passe</h2>
      {done ? <p>C'est fait ✅</p> : (
        <form onSubmit={(e) => { e.preventDefault(); run(async () => { await api.updatePassword(p); setDone(true); }); }}>
          <label>8 caractères minimum</label>
          <input className="in-f" type="password" minLength={8} required value={p} onChange={(e) => setP(e.target.value)} />
          <button className="btn" style={{ marginTop: 14 }} disabled={busy}>Enregistrer</button>
          {err && <div className="err">{err}</div>}
        </form>
      )}
    </Modal>
  );
}


/** Espace acheteur : il suit ses commandes, sans jamais voir mes coûts. */
function ClientSpace({ me, orders }) {
  const first = (me.full_name || '').split(' ')[0];
  const open = orders.filter((o) => o.status !== 'livree' && o.status !== 'annulee');
  const past = orders.filter((o) => !open.includes(o));
  const d = (x) => new Date(x).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const Card = ({ o }) => {
    const nb = orderNumbers(o);
    const idx = ORDER_STEPS.indexOf(o.status);
    return (
      <div className="ordcard">
        <div className="oimg">{o.photos?.[0] ? <img src={o.photos[0]} alt="" /> : <span className="m">Photo à venir</span>}</div>
        <div className="ob">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div>
              <div className="t" style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-.02em' }}>{o.brand ? o.brand + ' — ' : ''}{o.title}</div>
              <div className="m" style={{ color: 'var(--muted)' }}>{[o.size, o.reference && 'Réf. ' + o.reference].filter(Boolean).join(' · ')}</div>
            </div>
            <span className={'badge ' + (o.status === 'livree' ? 'ok' : o.status === 'annulee' ? 'late' : 'warn')}>{ORDER_STATUS[o.status]}</span>
          </div>
          {o.status !== 'annulee' && (
            <div className="steps">{ORDER_STEPS.map((st, i) => (
              <div key={st} className={'st ' + (i < idx ? 'done' : i === idx ? 'cur' : '')}><i /><span>{ORDER_STATUS[st]}</span></div>
            ))}</div>
          )}
          <div className="bar"><i style={{ width: Math.min(100, Number(o.progress || 0)) + '%' }} /></div>
          <div className="m" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>Avancement : {Number(o.progress || 0)} %{o.eta && o.status !== 'livree' ? ` · prévue vers le ${d(o.eta)}` : ''}{o.status === 'livree' && o.delivered_at ? ` · livrée le ${d(o.delivered_at)}` : ''}</div>
          <div className="kv" style={{ marginTop: 14 }}>
            <div><div className="k">Prix</div><div className="v">{o.price != null ? eur(nb.price) : 'À confirmer'}</div></div>
            <div><div className="k">Acompte versé</div><div className="v">{eur(nb.deposit)}</div></div>
            <div><div className="k">Reste à payer</div><div className="v">{eur(nb.reste)}</div></div>
          </div>
          {o.client_note && (
            <div className="msgcard" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="msghead"><span className="msgdot" />Où en est Morgz{o.updated_at && <span className="msgdate">{d(o.updated_at)}</span>}</div>
              <p>{o.client_note}</p>
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <>
      <TopBar me={me} />
      <main className="wrap">
        <section className="hero">
          <div className="eyebrow">Suivi de commande</div>
          <h1>{first ? `Bonjour ${first}.` : 'Bonjour.'}</h1>
          <p className="sub">Voici où en sont tes pièces.</p>
        </section>
        {orders.length === 0 && <div className="empty">Aucune commande pour le moment.</div>}
        {open.length > 0 && <><h2>En cours</h2><div style={{ display: 'grid', gap: 16, marginBottom: 30 }}>{open.map((o) => <Card key={o.id} o={o} />)}</div></>}
        {past.length > 0 && <><h2>Historique</h2><div style={{ display: 'grid', gap: 16 }}>{past.map((o) => <Card key={o.id} o={o} />)}</div></>}
        <Footer client />
      </main>
    </>
  );
}


const WD_ST = { pending: ['En attente', 'warn'], paid: ['Versé', 'ok'], refused: ['Refusé', 'late'] };

/** Ce que Morgz me doit, ce que je peux retirer, ce qu'il m'a déjà rendu. */
function Solde({ s, wds, onAsk }) {
  const p = payout(s);
  const d = (x) => new Date(x).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return (
    <div className="section" style={{ marginTop: 0 }}>
      <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0 }}>Ton argent</h2>
        <button className="btn sm" onClick={onAsk}>Demander un retrait</button>
      </div>
      <div className="kv" style={{ marginTop: 14 }}>
        <div><div className="k">Ce que Morgz te doit</div><div className="v">{eur(p.du)}</div><div className="m" style={{ fontSize: 12, color: 'var(--muted)' }}>capital + gains pas encore versés</div></div>
        <div><div className="k">Retirable tout de suite</div><div className="v pos">{eur(p.retirable)}</div><div className="m" style={{ fontSize: 12, color: 'var(--muted)' }}>{eur(p.bloque)} encore dans des pièces en cours</div></div>
        <div><div className="k">Déjà reçu</div><div className="v">{eur(p.rembourse)}</div><div className="m" style={{ fontSize: 12, color: 'var(--muted)' }}>{eur(s.verses)} de gains · {eur(s.retraits)} de capital</div></div>
      </div>
      {wds.length > 0 && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>{wds.map((w) => (
          <div key={w.id} className="row" style={{ padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 14, background: '#fff' }}>
            <span>Retrait demandé le {d(w.created_at)} · <b>{eur(w.amount)}</b></span>
            <span className={'badge ' + WD_ST[w.status][1]}>{WD_ST[w.status][0]}</span>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function AskWithdrawal({ me, s, onClose, onSaved }) {
  const p = payout(s);
  const [f, setF] = useState({ amount: '', note: '' });
  const { busy, err, run } = useBusy();
  return (
    <Modal onClose={onClose}>
      <h2>Demander un retrait</h2>
      <p className="m" style={{ color: 'var(--muted)', fontSize: 13, marginTop: -6 }}>Morgz reçoit ta demande et te fait le virement. Tu peux retirer tout de suite <b>{eur(p.retirable)}</b>. Le reste ({eur(p.bloque)}) revient quand les pièces en cours sont vendues.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        const a = Number(f.amount);
        if (!(a > 0)) throw new Error('Indique un montant.');
        await api.requestWithdrawal({ investor_id: me.id, amount: a, note: f.note });
        onSaved();
      }); }}>
        <div className="fgrid">
          <Field label="Montant (€)"><input className="in-f" type="number" step="0.01" min="1" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder={'max conseillé : ' + eur(p.retirable)} /></Field>
          <Field label="Message (optionnel)"><input className="in-f" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="ex. sur mon RIB habituel" /></Field>
        </div>
        <div style={{ marginTop: 8 }}><button type="button" className="btn ghost sm" onClick={() => setF({ ...f, amount: String(Math.round(p.retirable * 100) / 100) })}>Tout ce qui est retirable ({eur(p.retirable)})</button></div>
        {err && <div className="err">{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn" disabled={busy}>Envoyer la demande</button>
          <button type="button" className="btn ghost" onClick={onClose}>Annuler</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, full, children }) {
  return <div className={full ? 'full' : ''}><label>{label}</label>{children}</div>;
}
