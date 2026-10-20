import './globals.css';

export const metadata = {
  title: 'morgzconservery. partner',
  description: 'Espace partenaires morgzconservery.',
  icons: { icon: '/icon.png' },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
