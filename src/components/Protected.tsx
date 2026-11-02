'use client';
import {useEffect} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {AlertTriangle,LoaderCircle} from 'lucide-react';
import {useAuth} from './AuthProvider';
export default function Protected({children}:{children:React.ReactNode}){
 const {user,ready,configured}=useAuth(),router=useRouter(),path=usePathname();
 useEffect(()=>{if(ready&&configured&&!user)router.replace(`/login?next=${encodeURIComponent(path)}`);},[ready,configured,user,router,path]);
 if(!configured) return <div className="state-card"><AlertTriangle/><h2>연결 설정이 필요합니다</h2><p>Supabase 프로젝트를 연결하면 계정과 기록 저장 기능을 이용할 수 있어요. README의 설정 안내를 확인해 주세요.</p></div>;
 if(!ready||!user)return <div className="state-card"><LoaderCircle className="spin"/><h2>계정 확인 중</h2><p>잠시만요. 로그인 상태를 확인하고 있어요.</p></div>;
 return <>{children}</>;
}
