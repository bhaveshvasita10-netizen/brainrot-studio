import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Soul — AI Companions',
  description: 'Discover, create and chat with AI companions.',
};

export default function RootLayout({children}:{readonly children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
