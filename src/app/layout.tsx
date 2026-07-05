import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Highlight Saver',
  description: 'Save and review highlights from any website.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
