import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Interior Design AI Studio',
  description: 'Generate interior design concepts with AI, save them to your gallery, and refine them over time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
