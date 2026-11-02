import { createClient } from '@supabase/supabase-js';
export const isConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT_REF'));
function createBrowserDatabase(){
 if(!isConfigured()) throw new Error('Supabase 연결 정보가 없습니다. README의 환경변수 설정을 확인해 주세요.');
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},db:{schema:'fitplan'}});
}
let instance: ReturnType<typeof createBrowserDatabase> | null = null;
export function browserDb(): ReturnType<typeof createBrowserDatabase> {
 if(!instance) instance=createBrowserDatabase();
 return instance;
}
