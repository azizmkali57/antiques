import './globals.css';

export const metadata = {
  title: 'VESTIGE — Studies in form',
  description: 'A cinematic collection of sculptural objects in gold, steel, and reflected light.',
  icons: {
    icon: '/favicon.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
