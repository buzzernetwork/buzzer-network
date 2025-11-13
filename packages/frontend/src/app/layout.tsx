import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument',
  subsets: ['latin'],
  weight: '400',
  style: ['italic', 'normal'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Buzzer Network',
  description: 'Connect directly with publishers. Transparent payments. No middlemen.',
  openGraph: {
    title: 'Buzzer Network',
    description: 'Connect directly with publishers. Transparent payments. No middlemen.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buzzer Network',
    description: 'Connect directly with publishers. Transparent payments. No middlemen.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <Header />
          <main id="main-content" className="animate-in fade-in duration-300">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

