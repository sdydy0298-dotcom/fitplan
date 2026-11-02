import { createClient, type SupabaseClient } from '@supabase/supabase-js';
let instance: SupabaseClient | null = null;
export const isConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT_REF'));
export function browserDb(): SupabaseClient {
  if (!isConfigured()) throw new Error('Supabase 연결 정보가 없습니다. README의 환경변수 설정을 확인해 주세요.');
  if (!instance) instance = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return instance;
}
