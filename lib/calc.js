export const STATUS = {
  sourcing: { label: 'En sourcing', tone: 'muted' },
  achetee: { label: 'Achetée', tone: 'dark' },
  en_vente: { label: 'En vente', tone: 'chrome' },
  vendue: { label: 'Vendue', tone: 'ok' },
};

const n = (v) => (v === null || v === undefined || v === '' ? 0 : Number(v));

export function eur(v, sign = false) {
  const x = Math.round(n(v) * 100) / 100;
  const s = x.toLocaleString('fr-FR', { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return (sign && x > 0 ? '+' : '') + s + ' €';
}

export function cost(p) { return n(p.purchase_price) + n(p.fees) + n(p.extra_fees); }

/** Types de frais (déplacements, etc.). */
export const EXPENSE_TYPES = { deplacement: 'Déplacement', train: 'Train', uber: 'Uber / taxi', autre: 'Autre' };
export const EXPENSE_STATUS = { prevu: 'Prévu', regle: 'Réglé' };
export const EXPENSE_RULE = 'Frais justifiés, plafonnés à 10 % du prix d’achat sauf accord.';

/** Ajoute à chaque pièce les frais qui lui sont rattachés (déduits de sa marge). */
export function withExpenses(pieces, expenses = []) {
  return pieces.map((p) => {
    const linked = expenses.filter((e) => e.piece_id === p.id);
    return { ...p, linked_expenses: linked, extra_fees: linked.reduce((a, e) => a + n(e.amount), 0) };
  });
}

const isSet = (v) => v !== null && v !== undefined && v !== '';

/** Part d'un frais payée par le partenaire (en €) : montant choisi à la main, sinon sa part en %. */
export function partnerPortion(e, sharePct = 60) {
  if (!e.investor_id) return 0;
  if (isSet(e.investor_amount)) return n(e.investor_amount);
  return n(e.amount) * n(sharePct) / 100;
}

/** Frais généraux (non rattachés à une pièce) d'un partenaire : totaux et part du partenaire. */
export function generalExpenses(expenses = [], sharePct = 60) {
  const g = expenses.filter((e) => !e.piece_id);
  const total = (st) => g.filter((e) => !st || e.status === st).reduce((a, e) => a + n(e.amount), 0);
  const part = (st) => g.filter((e) => !st || e.status === st).reduce((a, e) => a + partnerPortion(e, sharePct), 0);
  return { all: total(), regle: total('regle'), prevu: total('prevu'), partAll: part(), partRegle: part('regle'), partPrevu: part('prevu') };
}

/** Plafond : frais rattachés > 10 % du prix d'achat. */
export function overCap(p) { return n(p.purchase_price) > 0 && n(p.extra_fees) > 0.1 * n(p.purchase_price); }

/** Marge visée et réelle d'une pièce, et part de l'investisseur. */
export function pieceNumbers(p, sharePct = 60) {
  const share = n(sharePct) / 100;
  const marginTarget = n(p.target_price) - cost(p);
  const sold = p.status === 'vendue' && p.sale_price !== null && p.sale_price !== undefined && p.sale_price !== '';
  const marginReal = sold ? n(p.sale_price) - cost(p) : null;
  const margin = sold ? marginReal : marginTarget;
  // Frais rattachés dont la répartition a été choisie à la main : on corrige l'écart avec le partage en %.
  let adj = 0;
  if (p.investor_id) for (const e of p.linked_expenses || []) if (isSet(e.investor_amount)) adj += n(e.investor_amount) - n(e.amount) * share;
  // Co-financement : le partenaire n'a mis qu'une partie du prix → il touche sa part sur la portion qu'il a financée.
  const c = cost(p);
  const coFi = p.investor_id && isSet(p.investor_contribution) && c > 0;
  const mise = !p.investor_id ? 0 : coFi ? n(p.investor_contribution) : c;
  const ratio = c > 0 ? Math.min(1, mise / c) : 1;
  let inv = margin * ratio * share - adj, invT = marginTarget * ratio * share - adj;
  // Part du partenaire forcée à la main sur la pièce : elle prime sur tout le reste.
  const forced = p.investor_id && isSet(p.investor_amount);
  if (forced) { inv = n(p.investor_amount); invT = n(p.investor_amount); }
  if (!p.investor_id) { inv = 0; invT = 0; }
  return {
    cost: c,
    mise, coFi, ratio,
    retour: mise + inv,
    retourTarget: mise + invT,
    morgzMise: Math.max(0, c - mise),
    marginTarget,
    marginReal,
    sold,
    forced,
    investorPart: inv,
    investorPartTarget: invT,
    morgzPart: margin - inv,
    roiPct: mise > 0 ? inv / mise * 100 : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Pièces à 2 partenaires                                               */
/* ------------------------------------------------------------------ */
export const hasTwo = (p) => !!(p && p.investor_id && p.investor2_id);
export const isPartnerOf = (p, id) => !!id && (p.investor_id === id || p.investor2_id === id);

/** Mises des 2 partenaires (par défaut : moitié-moitié du prix de la pièce). */
function twoMises(p) {
  const c = cost(p);
  const m1 = isSet(p.investor_contribution) ? n(p.investor_contribution) : c / 2;
  const m2 = isSet(p.investor2_contribution) ? n(p.investor2_contribution) : c / 2;
  return [m1, m2];
}

/** La pièce vue par un partenaire donné (sa mise, ses frais). Pièce à 1 partenaire : inchangée. */
export function pieceFor(p, partnerId) {
  if (!hasTwo(p)) return p;
  const [m1, m2] = twoMises(p);
  const second = partnerId === p.investor2_id;
  return {
    ...p,
    investor_id: second ? p.investor2_id : p.investor_id,
    investor_contribution: second ? m2 : m1,
    investor_amount: second ? (p.investor2_amount ?? null) : p.investor_amount,
    linked_expenses: (p.linked_expenses || []).filter((e) => e.investor_id === (second ? p.investor2_id : p.investor_id)),
    co_partner_id: second ? p.investor_id : p.investor2_id,
  };
}

/** Chiffres globaux d'une pièce côté Morgz (0, 1 ou 2 partenaires). */
export function morgzNumbers(p, shareOf) {
  const sh = (id) => (id ? shareOf(id) : 0);
  const base = pieceNumbers(p, sh(p.investor_id));
  if (!hasTwo(p)) return { ...base, parts: p.investor_id ? [{ id: p.investor_id, nb: base }] : [] };
  const a = pieceNumbers(pieceFor(p, p.investor_id), sh(p.investor_id));
  const b = pieceNumbers(pieceFor(p, p.investor2_id), sh(p.investor2_id));
  const margin = base.sold ? base.marginReal : base.marginTarget;
  const inv = a.investorPart + b.investorPart;
  return {
    ...base,
    coFi: true, forced: false,
    mise: a.mise + b.mise,
    morgzMise: Math.max(0, base.cost - a.mise - b.mise),
    investorPart: inv,
    investorPartTarget: a.investorPartTarget + b.investorPartTarget,
    morgzPart: margin - inv,
    retour: a.retour + b.retour,
    retourTarget: a.retourTarget + b.retourTarget,
    roiPct: a.mise + b.mise > 0 ? inv / (a.mise + b.mise) * 100 : 0,
    parts: [{ id: p.investor_id, nb: a }, { id: p.investor2_id, nb: b }],
  };
}

/** Avancement dans le temps : jours écoulés / délai visé. */
export function timing(p) {
  if (!p.purchased_at) return null;
  const start = new Date(p.purchased_at);
  const end = p.sold_at ? new Date(p.sold_at) : new Date();
  const days = Math.max(0, Math.round((end - start) / 86400000));
  const target = n(p.target_days) || 30;
  const due = new Date(start.getTime() + target * 86400000);
  return { days, target, pct: Math.min(100, (days / target) * 100), due, late: !p.sold_at && days > target };
}

/** Résumé d'un investisseur à partir de ses mouvements et de ses pièces. */
export function investorSummary(pieces, movements, sharePct = 60, expenses = []) {
  const shr = n(sharePct) / 100;
  const g = generalExpenses(expenses, sharePct);
  const sum = (t) => movements.filter((m) => m.type === t).reduce((a, m) => a + n(m.amount), 0);
  const apports = sum('apport');
  const retraits = sum('retrait');
  const verses = sum('versement_gains');
  // Ajustements manuels du bénéfice (ajout ou correction à la baisse).
  const ajust = sum('gain_plus') - sum('gain_moins');
  const active = pieces.filter((p) => p.status === 'achetee' || p.status === 'en_vente');
  const sold = pieces.filter((p) => p.status === 'vendue');
  const engage = active.reduce((a, p) => a + pieceNumbers(p, sharePct).mise, 0);
  // Les frais généraux sont déduits de la marge avant le partage : le partenaire en porte sa part (ex. 60 %).
  const gainsRealises = sold.reduce((a, p) => a + pieceNumbers(p, sharePct).investorPart, 0) - g.partRegle + ajust;
  const gainsPotentiels = active.reduce((a, p) => a + pieceNumbers(p, sharePct).investorPartTarget, 0) - g.partPrevu;
  const fraisTotal = expenses.reduce((a, e) => a + n(e.amount), 0);
  const capital = apports - retraits;
  return {
    apports, retraits, verses, engage, capital, ajust,
    disponible: capital - engage - g.all,
    fraisTotal,
    fraisPart: expenses.reduce((a, e) => a + partnerPortion(e, sharePct), 0),
    fraisGeneraux: g,
    gainsRealises,
    gainsADispo: gainsRealises - verses,
    gainsPotentiels,
    valeur: capital + gainsRealises - verses,
    nbActive: active.length,
    nbSold: sold.length,
  };
}

/* ------------------------------------------------------------------ */
/* Mes comptes : ce que morgz gagne personnellement                     */
/* ------------------------------------------------------------------ */
const d10 = (v) => String(v || '').slice(0, 10);

/**
 * Journal des opérations de morgz.
 * - Vente d'une pièce : sa part de la marge réelle (100 % si la pièce n'a pas de partenaire).
 * - Frais généraux réglés : sa part (100 % si aucun partenaire).
 * Les frais rattachés à une pièce sont déjà déduits de sa marge (via withExpenses).
 */
export function morgzLedger(pieces, expenses, shareOf, movements = [], orders = []) {
  const ev = [];
  // Commandes clients livrées : 100 % de la marge pour Morgz.
  for (const o of orders) {
    if (o.status !== 'livree') continue;
    const nb = orderNumbers(o);
    ev.push({ date: d10(o.delivered_at || o.updated_at || o.created_at), kind: 'client', amount: nb.marge, order: o, investor_id: null, label: (o.brand ? o.brand + ' — ' : '') + o.title, margin: nb.marge, client_id: o.client_id });
  }
  for (const p of pieces) {
    if (p.status !== 'vendue' || !p.sold_at) continue;
    const nb = morgzNumbers(p, shareOf);
    ev.push({ date: d10(p.sold_at), kind: 'vente', amount: nb.morgzPart, piece: p, investor_id: p.investor_id, label: (p.brand ? p.brand + ' — ' : '') + p.title, margin: nb.marginReal });
  }
  for (const e of expenses) {
    if (e.piece_id || e.status !== 'regle') continue;
    const sh = e.investor_id ? shareOf(e.investor_id) : 0;
    ev.push({ date: d10(e.date), kind: 'frais', amount: -(n(e.amount) - partnerPortion(e, sh)), expense: e, investor_id: e.investor_id, label: e.label || EXPENSE_TYPES[e.type] || 'Frais' });
  }
  // Un bénéfice ajouté à un partenaire sort de la part de Morgz (et inversement).
  for (const m of movements) {
    if (!m.investor_id || (m.type !== 'gain_plus' && m.type !== 'gain_moins')) continue;
    ev.push({ date: d10(m.date), kind: 'ajust', amount: m.type === 'gain_plus' ? -n(m.amount) : n(m.amount), investor_id: m.investor_id, label: m.note || 'Ajustement des gains partenaire' });
  }
  ev.sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  for (const x of ev) { bal += x.amount; x.balance = bal; }
  return ev;
}

/** Synthèse de mes comptes. */
export function morgzSummary(pieces, expenses, shareOf, movements = [], orders = []) {
  const ledger = morgzLedger(pieces, expenses, shareOf, movements, orders);
  const sales = ledger.filter((x) => x.kind === 'vente' || x.kind === 'client');
  const month = new Date().toISOString().slice(0, 7);
  const active = pieces.filter((p) => p.status === 'achetee' || p.status === 'en_vente');
  const pending = active.reduce((a, p) => a + morgzNumbers(p, shareOf).morgzPart, 0)
    + orders.filter((o) => ORDER_OPEN(o)).reduce((a, o) => a + orderNumbers(o).marge, 0)
    - expenses.filter((e) => !e.piece_id && e.status === 'prevu').reduce((a, e) => a + n(e.amount) - partnerPortion(e, e.investor_id ? shareOf(e.investor_id) : 0), 0);
  const gains = ledger.filter((x) => x.amount > 0).reduce((a, x) => a + x.amount, 0);
  const pertes = ledger.filter((x) => x.amount < 0).reduce((a, x) => a + x.amount, 0);
  const fraisPaid = expenses.filter((e) => e.status === 'regle').reduce((a, e) => a + n(e.amount) - partnerPortion(e, e.investor_id ? shareOf(e.investor_id) : 0), 0);
  return {
    ledger,
    solde: ledger.length ? ledger[ledger.length - 1].balance : 0,
    mois: ledger.filter((x) => x.date.startsWith(month)).reduce((a, x) => a + x.amount, 0),
    pending, gains, pertes, fraisPaid,
    nbSales: sales.length,
    winRate: sales.length ? (sales.filter((s) => s.amount > 0).length / sales.length) * 100 : 0,
    best: sales.reduce((b, s) => (!b || s.amount > b.amount ? s : b), null),
    nbActive: active.length,
  };
}

function bucketKey(date, period) {
  if (period === 'month') return date.slice(0, 7) + '-01';
  if (period === 'week') {
    const d = new Date(date + 'T00:00:00Z');
    const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  }
  return date;
}

/** Bougies (ouverture / plus haut / plus bas / clôture du solde) + courbe + gains/pertes par période. */
export function ledgerSeries(ledger, period = 'day', start = 0) {
  const candles = [], line = [], bars = [];
  let bal = start;
  const groups = new Map();
  for (const x of ledger) { const k = bucketKey(x.date, period); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
  for (const [time, evs] of groups) {
    const open = bal; let hi = bal, lo = bal;
    for (const x of evs) { bal += x.amount; hi = Math.max(hi, bal); lo = Math.min(lo, bal); }
    const r = (v) => Math.round(v * 100) / 100;
    candles.push({ time, open: r(open), high: r(hi), low: r(lo), close: r(bal) });
    line.push({ time, value: r(bal) });
    bars.push({ time, value: r(bal - open) });
  }
  return { candles, line, bars };
}


/* ------------------------------------------------------------------ */
/* Commandes clients (pièces sourcées pour un acheteur)                */
/* ------------------------------------------------------------------ */
export const ORDER_STATUS = {
  demande: 'Demande reçue',
  sourcing: 'En sourcing',
  trouvee: 'Pièce trouvée',
  achetee: 'Achetée',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};
export const ORDER_STEPS = ['demande', 'sourcing', 'trouvee', 'achetee', 'expediee', 'livree'];
export const ORDER_OPEN = (o) => o.status !== 'livree' && o.status !== 'annulee';

/** Chiffres d'une commande client : ce qu'il paie, ce qu'il reste, et ma marge (côté admin). */
export function orderNumbers(o) {
  const price = n(o.price), deposit = n(o.deposit);
  const cost = n(o.purchase_price) + n(o.fees);
  return { price, deposit, reste: Math.max(0, price - deposit), cost, marge: price - cost, hasCost: isSet(o.purchase_price) };
}
