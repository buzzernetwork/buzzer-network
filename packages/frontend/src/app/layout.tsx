import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Buzzer Network - X402 Ad Network',
  description: 'Decentralized ad network on BASE blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}

