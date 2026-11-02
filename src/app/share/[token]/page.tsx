'use client';
import {useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowRight,ClipboardCopy,Dumbbell,LockKeyhole,Share2} from 'lucide-react';
import {useAuth} from '@/components/AuthProvider';
import type {ShareRoutine} from '@/lib/types';
import {DAYS,getExercise} from '@/lib/exercises';
import {browserDb} from '@/lib/supabase';
export default function PublicShare(){
 const {token}=useParams<{token:string}>();const {user,configured}=useAuth(),router=useRouter();
 const [routine,setRoutine]=useState<ShareRoutine|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let live=true;fetch(`/api/share/${encodeURIComponent(token)}`,{cache:'no-store'}).then(async res=>{const x=await res.json();if(!res.ok)throw new Error(x.error||'공유 루틴을 찾을 수 없습니다.');return x;}).then(x=>{if(live)setRoutine(x.routine);}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[token]);
 const copy=async()=>{
  if(!user){router.push(`/login?next=${encodeURIComponent(`/share/${token}`)}`);return;}
  setError('');setBusy(true);
  try{const{data}=await browserDb().auth.getSession();const accessToken=data.session?.access_token;if(!accessToken)throw new Error('로그인 세션이 없습니다.');const res=await fetch(`/api/share/${encodeURIComponent(token)}/copy`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`}});const result=await res.json();if(!res.ok)throw new Error(result.error||'복사하지 못했습니다.');router.push(`/routines/${result.id}`);router.refresh();}catch(e){setError(e instanceof Error?e.message:'복사 중 오류가 발생했습니다.');}finally{setBusy(false);}
 };
 if(loading)return <div className="state-card">공유 루틴을 불러오는 중…</div>;
 if(!routine)return <div className="state-card"><LockKeyhole size={29}/><h2>이 루틴을 볼 수 없어요</h2><p>{error||'공유가 중단되었거나 링크가 잘못되었어요.'}</p><Link className="btn btn-primary" href="/">FITPLAN 홈으로</Link></div>;
 return <div className="app-page"><PageHeader title={routine.title} description={routine.description}/><div className="two-col"><section className="panel"><h2>요일별 운동 구성</h2>{routine.routine_days.slice().sort((a,b)=>a.weekday-b.weekday).map((day,i)=><div key={i} className="workout-summary"><div className="panel-header"><h3>{DAYS[day.weekday]}요일</h3><span className="tag">{day.routine_items.length}개 종목</span></div>{day.routine_items.slice().sort((a,b)=>a.position-b.position).map((it,j)=><div className="list-row" key={j}><div><h3>{getExercise(it.exercise_id)?.name||it.exercise_id}</h3><p>{it.target_sets}세트 × {it.target_reps}회 · {it.target_weight}kg</p></div><Link className="text-link" href={`/exercises/${it.exercise_id}`}>운동법 <ArrowRight size={13}/></Link></div>)}</div>)}</section><aside className="form-stack"><section className="panel"><div className="panel-header"><h2>나도 이 루틴으로 시작하기</h2><Dumbbell size={20}/></div><p className="small">복사하면 나만의 루틴이 만들어져요. 운동 종목과 목표 중량을 자유롭게 수정할 수 있고, 원본에는 영향을 주지 않아요.</p><button onClick={copy} disabled={busy||!configured} className="btn btn-primary btn-lg" style={{width:'100%'}}><ClipboardCopy size={17}/>{busy?'복사 중…':user?'내 루틴으로 복사':'로그인하고 복사하기'}</button>{error&&<div className="error-message" role="alert">{error}</div>}</section><div className="notice"><Share2 size={18}/>이 페이지에는 공유된 운동 구성만 표시됩니다. 작성자의 개인 운동 기록이나 이메일은 제공되지 않습니다.</div></aside></div></div>;
}
function PageHeader({title,description}:{title:string;description:string|null}){return <div className="page-heading"><div><span className="eyebrow">SHARED ROUTINE</span><h1>{title}</h1><p>{description||'FITPLAN에서 공유한 운동 계획입니다.'}</p></div><span className="tag green"><Share2 size={14}/>읽기 전용</span></div>}
