# morgzconservery. partner

Plateforme de suivi pour les partenaires : chaque investisseur voit ses pièces (photos, prix d'achat, prix visé, marge, délai, sa part 60 %) ; toi tu gères tout depuis l'espace admin.

- **Sans configuration**, le site tourne en **mode démo** (données fictives dans le navigateur) : parfait pour tester.
- **Avec Supabase**, il passe en **mode réel** : comptes, base de données, photos.

## Mise en ligne (≈ 15 min)

### 1. Supabase (base de données + comptes) — gratuit
1. Crée un compte sur supabase.com → **New project** (région : Paris / eu-west-3).
2. **SQL Editor** → **New query** → colle tout le fichier `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user** : ton email (`mrgzconservery@gmail.com`) + un mot de passe, coche *Auto Confirm*.
4. Retourne dans **SQL Editor** et lance :
   ```sql
   update public.profiles set role = 'admin', full_name = 'Morgan Gati' where email = 'mrgzconservery@gmail.com';
   ```
5. **Project Settings → API** : copie `Project URL`, la clé `anon public` et la clé `service_role`.

### 2. Vercel
1. Mets ce dossier sur GitHub (nouveau repo privé, puis glisse les fichiers ou `git push`).
2. Sur vercel.com → **Add New → Project** → importe le repo.
3. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé anon
   - `SUPABASE_SERVICE_ROLE_KEY` = clé service_role (secrète)
4. **Deploy**. Option : ajoute un domaine (ex. `partner.morgzconservery.com`).

### 3. Utilisation
1. Connecte-toi sur `/login` → tu arrives sur l'espace **admin**.
2. **Partenaires → + Nouveau partenaire** : nom, email, part (60 %), apport initial. Le site génère un mot de passe provisoire → bouton *Copier le message* à envoyer en DM.
3. **Pièces → + Nouvelle pièce** : marque, modèle, taille, partenaire, prix d'achat, prix visé, frais, délai, photos, preuves d'authenticité. Les calculs 60/40 se font tout seuls.
4. Quand la pièce est vendue : *Marquer vendue* → prix réel + date.
5. **Mouvements** : enregistre les apports, retraits et gains versés.

## En local
```bash
npm install
npm run dev        # http://localhost:3000 (mode démo)
```
Pour tester en réel en local : copie `.env.example` en `.env.local` et remplis-le.

## Sécurité
- Chaque partenaire ne voit que **ses** pièces et **ses** mouvements (règles RLS dans Supabase).
- Seul le compte admin peut créer, modifier ou supprimer.
- La clé `service_role` ne doit jamais être dans le code ni partagée : uniquement dans Vercel.
- Les photos sont stockées dans un bucket public (liens non devinables) : n'y mets pas de documents personnels.
