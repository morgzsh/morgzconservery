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

/** Frais généraux (non rattachés à une pièce) d'un partenaire. */
export function generalExpenses(expenses = []) {
  const g = expenses.filter((e) => !e.piece_id);
  const total = (st) => g.filter((e) => !st || e.status === st).reduce((a, e) => a + n(e.amount), 0);
  return { all: total(), regle: total('regle'), prevu: total('prevu') };
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
  return {
    cost: cost(p),
    marginTarget,
    marginReal,
    sold,
    investorPart: margin * share,
    investorPartTarget: marginTarget * share,
    morgzPart: margin * (1 - share),
    roiPct: cost(p) > 0 ? (margin * share) / cost(p) * 100 : 0,
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
  const g = generalExpenses(expenses);
  const sum = (t) => movements.filter((m) => m.type === t).reduce((a, m) => a + n(m.amount), 0);
  const apports = sum('apport');
  const retraits = sum('retrait');
  const verses = sum('versement_gains');
  const active = pieces.filter((p) => p.status === 'achetee' || p.status === 'en_vente');
  const sold = pieces.filter((p) => p.status === 'vendue');
  const engage = active.reduce((a, p) => a + cost(p), 0);
  // Les frais généraux sont déduits de la marge avant le partage : le partenaire en porte sa part (ex. 60 %).
  const gainsRealises = sold.reduce((a, p) => a + pieceNumbers(p, sharePct).investorPart, 0) - g.regle * shr;
  const gainsPotentiels = active.reduce((a, p) => a + pieceNumbers(p, sharePct).investorPartTarget, 0) - g.prevu * shr;
  const fraisTotal = expenses.reduce((a, e) => a + n(e.amount), 0);
  const capital = apports - retraits;
  return {
    apports, retraits, verses, engage, capital,
    disponible: capital - engage - g.all,
    fraisTotal,
    fraisPart: fraisTotal * shr,
    fraisGeneraux: g,
    gainsRealises,
    gainsADispo: gainsRealises - verses,
    gainsPotentiels,
    valeur: capital + gainsRealises - verses,
    nbActive: active.length,
    nbSold: sold.length,
  };
}
