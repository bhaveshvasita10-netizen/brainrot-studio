import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title:'Brainrot Studio AI', description:'Original surreal cartoon creation studio' };

export default function RootLayout({children}:{readonly children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
