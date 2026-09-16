import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Brainrot Studio',
  description: 'Original surreal cartoon studio',
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
