
//src/app/liabilities/page.tsx
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AssetsManager from '../assets/AssetsManager';
import BottomNav from '@/components/BottomNav';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LiabilitiesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) redirect('/login');

  return (
    <div 
      className="min-h-screen relative pb-24"
      style={{
        background: "linear-gradient(160deg, #0d1f3c 0%, #080e1a 50%, #0B1120 100%)",
      }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-rose-600/10 blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full bg-orange-600/[0.08] blur-[80px]" />
      </div>
      
      <div className="relative z-10">
        <AssetsManager userId={user.id} type="liabilities" />
      </div>

      <BottomNav />
    </div>
  );
}