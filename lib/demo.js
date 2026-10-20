export function demoSeed() {
  const admin = 'demo-admin', inv = 'demo-investor';
  return {
    session: null,
    profiles: [
      { id: admin, email: 'admin@demo.fr', full_name: 'Morgan Gati', role: 'admin', share_pct: 60 },
      { id: inv, email: 'investisseur@demo.fr', full_name: 'Investisseur démo', role: 'investor', share_pct: 60 },
    ],
    movements: [
      { id: 'm1', investor_id: inv, type: 'apport', amount: 1000, date: '2026-10-15', note: 'Apport initial' },
    ],
    pieces: [
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
