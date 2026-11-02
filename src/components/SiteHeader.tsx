'use client';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {Activity,ArrowUpRight,BookOpen,CalendarClock,CalendarDays,ChartNoAxesCombined,ClipboardList,Dumbbell,LogIn,LogOut,Menu,X} from 'lucide-react';
import {useEffect,useState} from 'react';
import {browserDb} from '@/lib/supabase';
import {useAuth} from './AuthProvider';
const nav=[{href:'/dashboard',label:'대시보드',icon:Activity},{href:'/planner',label:'운동 플래너',icon:CalendarClock},{href:'/routines',label:'내 루틴',icon:ClipboardList},{href:'/exercises',label:'운동 가이드',icon:BookOpen},{href:'/workouts',label:'운동 기록',icon:CalendarDays},{href:'/progress',label:'진행 현황',icon:ChartNoAxesCombined}];
export default function SiteHeader(){
 const {user,configured}=useAuth();const pathname=usePathname();const router=useRouter();const [open,setOpen]=useState(false);
 const [memberName,setMemberName]=useState('');
 useEffect(()=>{
  if(!user?.id){setMemberName('');return;}
  let active=true;
  browserDb().from('users').select('email').eq('user_id',user.id).maybeSingle()
   .then(({data})=>{if(active)setMemberName(data?.email?.split('@')[0]||'내 계정');});
  return ()=>{active=false;};
 },[user?.id]);
 const logout=async()=>{await browserDb().auth.signOut();setOpen(false);router.push('/');router.refresh();};
 return <>
  <header className="site-header"><div className="header-inner">
   <Link href="/" className="brand"><span className="brand-mark"><Dumbbell size={22} strokeWidth={2.6}/></span><span>FIT<span className="brand-accent">PLAN</span></span></Link>
   <nav className="desktop-nav" aria-label="주 메뉴">
    {(user?nav:nav.filter(x=>x.href==='/exercises')).map(({href,label})=><Link key={href} href={href} className={pathname===href?'nav-link active':'nav-link'}>{label}</Link>)}
   </nav>
   <div className="header-actions">{user?<><span className="user-name">{memberName||'내 계정'}</span><button className="icon-btn" onClick={logout} title="로그아웃" aria-label="로그아웃"><LogOut size={19}/></button></>:<Link href={configured?'/login':'/exercises'} className="btn btn-sm btn-dark">{configured?'로그인':'가이드 보기'}<ArrowUpRight size={15}/></Link>}
    <button className="icon-btn mobile-only" onClick={()=>setOpen(!open)} aria-label={open?'메뉴 닫기':'메뉴 열기'}>{open?<X/>:<Menu/>}</button>
   </div>
  </div></header>
  {open&&<nav className="mobile-menu" aria-label="모바일 메뉴">{nav.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setOpen(false)}><Icon size={18}/>{label}</Link>)}{user?<button onClick={logout}><LogOut size={18}/>로그아웃</button>:<Link href="/login" onClick={()=>setOpen(false)}><LogIn size={18}/>로그인</Link>}</nav>}
 </>;
}
