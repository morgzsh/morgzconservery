export function demoSeed() {
  const admin = 'demo-admin', inv = 'demo-investor';
  return {
    session: null,
    profiles: [
      { id: admin, email: 'admin@demo.fr', full_name: 'Morgz', role: 'admin', share_pct: 60 },
      { id: inv, email: 'investisseur@demo.fr', full_name: 'Lucas Martin', role: 'investor', share_pct: 60 },
    ],
    movements: [
      { id: 'm1', investor_id: inv, type: 'apport', amount: 1000, date: '2026-08-25', note: 'Apport initial' },
    ],
    expenses: [
      { id: 'e1', investor_id: inv, piece_id: null, type: 'train', amount: 50, date: '2026-10-24', label: 'Moitié du billet de train Paris', status: 'prevu', proof: null },
      { id: 'e3', investor_id: null, piece_id: null, type: 'train', amount: 64, date: '2026-09-14', label: 'Aller-retour Paris (sourcing)', status: 'regle', proof: null },
      { id: 'e2', investor_id: inv, piece_id: 'p2', type: 'uber', amount: 18, date: '2026-10-18', label: 'Uber récupération de la pièce', status: 'regle', proof: { name: 'Reçu Uber.pdf', url: '#' } },
    ],
    pieces: [
      { id: 'p3', investor_id: inv, title: 'Orbit Sneakers', brand: 'Bottega Veneta', size: '43', condition: 'Neuf',
        status: 'vendue', purchase_price: 520, target_price: 780, sale_price: 760, fees: 15, purchased_at: '2026-08-28', target_days: 30, sold_at: '2026-09-08',
        photos: ['/demo/orbit.jpg'], proofs: [], notes: 'Argent, taille 43.', created_at: '2026-08-28T10:00:00Z' },
      { id: 'p4', investor_id: null, title: 'Replica', brand: 'Maison Margiela', size: '42', condition: 'Neuf',
        status: 'vendue', purchase_price: 310, target_price: 420, sale_price: 280, fees: 10, purchased_at: '2026-09-02', target_days: 30, sold_at: '2026-09-21',
        photos: ['/demo/replica.jpg'], proofs: [], notes: 'Stock perso. Vendue à perte pour libérer du cash.', created_at: '2026-09-02T10:00:00Z' },
      { id: 'p5', investor_id: null, title: 'Sac Musette', brand: 'Goyard', size: 'TU', condition: 'Neuf',
        status: 'vendue', purchase_price: 1450, target_price: 1900, sale_price: 1950, fees: 25, purchased_at: '2026-09-15', target_days: 30, sold_at: '2026-10-02',
        photos: ['/demo/musette.jpg'], proofs: [], notes: 'Noir naturel.', created_at: '2026-09-15T10:00:00Z' },
      { id: 'p6', investor_id: inv, title: "America's Cup", brand: 'Prada', size: '42', condition: 'Neuf',
        status: 'vendue', purchase_price: 380, target_price: 560, sale_price: 590, fees: 12, purchased_at: '2026-10-05', target_days: 30, sold_at: '2026-10-12',
        photos: ['/demo/prada.jpg'], proofs: [], notes: 'Bleu / argent.', created_at: '2026-10-05T10:00:00Z' },
      {
        id: 'p1', investor_id: inv, title: 'Hoodie Scroll Logo', brand: 'Chrome Hearts', size: 'S', condition: 'Neuf',
        status: 'en_vente', purchase_price: 600, target_price: 1100, sale_price: null, fees: 0,
        purchased_at: '2026-10-16', target_days: 30, sold_at: null,
        photos: ['/demo/hoodie.png'], proofs: [{ name: 'Facture fournisseur.pdf', url: '#' }],
        notes: 'Rouge, taille S. Très demandé cet hiver.', created_at: '2026-10-16T10:00:00Z',
      },
      {
        id: 'p2', investor_id: inv, title: 'Jogging Scroll Logo', brand: 'Chrome Hearts', size: 'M', condition: 'Neuf',
        status: 'vendue', purchase_price: 400, target_price: 900, sale_price: 900, fees: 0,
        purchased_at: '2026-10-16', target_days: 30, sold_at: '2026-10-19',
        photos: ['/demo/pants.jpg'], proofs: [{ name: 'Authentification.pdf', url: '#' }],
        notes: 'Noir, taille M. Vendu à un client du réseau.', created_at: '2026-10-16T11:00:00Z',
      },
    ],
  };
}
