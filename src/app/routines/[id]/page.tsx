'use client';
import {useParams,useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,CalendarPlus,Check,Copy,Edit3,ExternalLink,Link2,Lock,Share2,Trash2} from 'lucide-react';
import Protected from '@/components/Protected';
import {useExerciseLibrary,isCustomExercise} from '@/lib/custom-exercises';
import PageHeading from '@/components/PageHeading';
import {loadRoutine,orderedDays,orderedItems} from '@/lib/data';
import type {Routine} from '@/lib/types';
import {DAYS} from '@/lib/exercises';
import {browserDb} from '@/lib/supabase';
import {friendlyError} from '@/lib/format';
import {dateISO} from '@/lib/format';
import {mondayOf} from '@/lib/planner';
import {startRoutine,versionForWeek} from '@/lib/weekly-plan';
import {useAuth} from '@/components/AuthProvider';
type Share={id:string;token:string;active:boolean;discoverable:boolean};
function Detail({id}:{id:string}){
 const {nameOf}=useExerciseLibrary();
 const {user}=useAuth(),router=useRouter(),[activeId,setActiveId]=useState<string|null>(null),[routine,setRoutine]=useState<Routine|null>(null),[share,setShare]=useState<Share|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{Promise.all([loadRoutine(id),browserDb().from('routine_shares').select('id,token,active,discoverable').eq('routine_id',id).maybeSingle(),versionForWeek(mondayOf(dateISO()))]).then(([r,s,v])=>{setRoutine(r);if(s.error)throw s.error;setShare(s.data as Share|null);setActiveId(v?.routine_id||null);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[id]);
 const activate=async()=>{
  if(!routine||saving)return;
  if(activeId&&activeId!==routine.id&&!window.confirm('현재 진행 중인 다른 루틴을 이 루틴으로 바꿀까요? 이번 주 계획은 교체되지만 기존 운동 기록은 유지됩니다.'))return;
  if(activeId===routine.id&&!window.confirm('이번 주 계획을 기본 루틴으로 다시 시작할까요? 이번 주에만 수정한 내용은 초기화되지만 운동 기록은 유지됩니다.'))return;
  setSaving(true);setError('');setMessage('');
  try{await startRoutine(routine);router.push('/planner');router.refresh();}
  catch(e){setError(friendlyError(e));}finally{setSaving(false);}
 };
 const toggleShare=async()=>{
  if(!user||!routine)return;setSaving(true);setError('');setMessage('');try{
   const db=browserDb();
   if(share?.active){const{error}=await db.from('routine_shares').update({active:false,discoverable:false,revoked_at:new Date().toISOString()}).eq('id',share.id);if(error)throw error;setShare({...share,active:false,discoverable:false});setMessage('공유를 중지했습니다. 기존 링크는 더 이상 열리지 않습니다.');}
   else{
    const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    const{data,error}=await db.from('routine_shares').upsert({...(share?{id:share.id}:{}),routine_id:id,owner_id:user.id,token,active:true,discoverable:false,revoked_at:null},{onConflict:'routine_id'}).select('id,token,active,discoverable').single();if(error)throw error;setShare(data as Share);setMessage('공유 링크가 활성화되었습니다.');
   }
  }catch(e){setError(friendlyError(e));}finally{setSaving(false);}
 };
 const toggleDiscovery=async()=>{
  if(!share?.active||saving)return;
  const previous=share,enabled=!share.discoverable;
  // Controlled checkbox needs immediate feedback, even during a network save.
  setShare({...share,discoverable:enabled});
  setSaving(true);setError('');setMessage('');
  try{
   const {data,error}=await browserDb().from('routine_shares')
    .update({discoverable:enabled}).eq('id',share.id)
    .select('id,token,active,discoverable').single();
   if(error)throw error;
   setShare(data as Share);
   setMessage(enabled?'공개 루틴 둘러보기 목록에 표시됩니다.':'공개 목록에서는 숨겼습니다. 기존 공유 링크는 그대로 사용할 수 있어요.');
  }catch(e){
   setShare(previous);
   setError('공개 설정을 저장하지 못했습니다. '+friendlyError(e));
  }finally{setSaving(false);}
 };
 const remove=async()=>{if(!window.confirm('이 루틴을 삭제할까요? 이 작업은 되돌릴 수 없습니다.'))return;setSaving(true);try{const{error}=await browserDb().from('routines').delete().eq('id',id);if(error)throw error;router.push('/routines');router.refresh();}catch(e){setError(friendlyError(e));setSaving(false);}};
 const link=share?.active&&typeof window!=='undefined'?`${window.location.origin}/share/${share.token}`:'';
 const copy=async()=>{try{await navigator.clipboard.writeText(link);setMessage('링크를 복사했어요.');}catch{setError('복사에 실패했습니다. 아래 주소를 직접 복사해 주세요.');}};
 if(loading)return <div className="state-card">루틴 정보를 불러오는 중…</div>;
 if(!routine)return <div className="state-card"><h2>루틴을 찾을 수 없어요</h2><p>삭제됐거나 접근 권한이 없는 루틴입니다.</p><Link href="/routines" className="btn btn-primary">목록으로</Link></div>;
 const days=orderedDays(routine);
 return <div className="app-page"><Link href="/routines" className="text-link"><ArrowLeft size={15}/>내 루틴으로 돌아가기</Link><div style={{height:20}}/><PageHeading eyebrow="MY ROUTINE" title={routine.title} description={routine.description||'나에게 맞는 운동을 꾸준히 이어가 보세요.'}><Link href={`/routines/${id}/edit`} className="btn btn-outline"><Edit3 size={16}/>내 루틴 수정</Link><button type="button" className="btn btn-primary" onClick={activate} disabled={saving}><CalendarPlus size={16}/>{saving?'적용 중…':activeId===id?'이번 주 다시 적용':'이 루틴으로 시작'}</button></PageHeading>
 <div className="two-col"><section className="panel"><div className="panel-header"><h2>주간 운동 구성</h2><span className="tag green">{days.length}일 운동</span></div>{days.length?days.map(d=><div key={d.id} className="workout-summary"><div className="panel-header"><h3>{DAYS[d.weekday]}요일</h3><span className="tag">{d.routine_items?.length??0}개 종목</span></div>{orderedItems(d.routine_items||[]).map(it=><div className="list-row" key={it.id}><div><h3>{nameOf(it.exercise_id)}</h3><p>{it.target_sets}세트 × {it.target_reps}회 · 목표 {Number(it.target_weight)}kg{it.notes?` · ${it.notes}`:''}</p></div>{!isCustomExercise(it.exercise_id)&&<Link href={`/exercises/${it.exercise_id}`} aria-label="운동 가이드 보기"><ExternalLink size={17}/></Link>}</div>)}</div>):<div className="empty"><p>등록된 운동이 없어요.</p></div>}</section><aside className="form-stack"><section className="panel"><div className="panel-header"><h2>운동 시작</h2>{activeId===id?<span className="tag green">진행 중</span>:null}</div><p className="small">기본 루틴으로 시작하면 매주 자동으로 반복돼요. 그 주에만 추가하거나 뺀 운동은 기본 루틴에 영향을 주지 않아요.</p><button type="button" className="btn btn-primary" disabled={saving} onClick={activate}>{saving?'적용 중…':'이 루틴으로 이번 주 시작하기'} <ArrowRight size={15}/></button></section><section className="panel"><div className="panel-header"><h2>루틴 공유</h2>{share?.active?<span className="tag green"><Share2 size={13}/>공유 중</span>:<span className="tag"><Lock size={13}/>비공개</span>}</div><p className="small">루틴의 운동 구성만 공유해요. 내 운동 기록과 계정 정보는 공유되지 않아요.</p>{link&&<><div className="share-url">{link}</div><div className="button-row" style={{marginTop:12}}><button className="btn btn-dark btn-sm" onClick={copy}><Copy size={15}/>링크 복사</button><Link className="btn btn-outline btn-sm" href={link} target="_blank"><ExternalLink size={15}/>미리보기</Link></div></>}<button disabled={saving} className={'btn '+(share?.active?'btn-outline':'btn-primary')} style={{marginTop:15}} onClick={toggleShare}>{saving?'처리 중…':share?.active?'공유 중지하기':'공유 링크 만들기'} <ArrowRight size={15}/></button><p className="field-hint" style={{marginTop:11}}>공유를 다시 켜면 새 주소가 발급돼요.</p>
 {share?.active&&<div className="discovery-consent">
   <label className="discovery-consent-label">
    <input type="checkbox" checked={share.discoverable} onChange={toggleDiscovery} disabled={saving}/>
    <span><strong>공개 루틴 둘러보기에 표시</strong>
     <small>동의한 경우에만 모든 방문자의 검색 목록에 운동 구성과 공유 링크가 나타나요. 이메일과 개인 운동 기록은 공개되지 않습니다.</small>
    </span>
   </label>
   <Link href="/discover" className="text-link">공개 루틴 목록 확인 <ArrowRight size={14}/></Link>
  </div>}</section><section className="panel"><h2>안내</h2><div className="notice"><Link2 size={17}/><span>공유받은 사용자는 계정에 로그인한 후 이 루틴을 자신의 계획으로 복사하고 수정할 수 있어요.</span></div></section><section className="danger-zone"><h3 style={{fontSize:14,margin:'0 0 6px'}}>루틴 삭제</h3><p className="small">루틴이 삭제되어도 이미 저장된 운동 기록은 남습니다.</p><button disabled={saving} onClick={remove} className="btn btn-danger btn-sm"><Trash2 size={15}/>루틴 삭제</button></section>{error&&<div className="error-message" role="alert">{error}</div>}{message&&<div className="success-message" role="status"><Check size={14}/> {message}</div>}</aside></div></div>;
}
export default function RoutineDetail(){const {id}=useParams<{id:string}>();return <Protected><Detail id={id}/></Protected>}
