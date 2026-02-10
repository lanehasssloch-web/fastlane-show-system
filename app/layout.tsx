import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'FastLane Show System',
  description: 'Cross-device show dashboard and teleprompter management',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
