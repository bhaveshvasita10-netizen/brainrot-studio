import SoulStudio from '@/components/SoulStudio';

export const dynamic = 'force-dynamic';

// Production deployment trigger: Soul is the live app entrypoint.
export default function Home() {
  return <SoulStudio />;
}
