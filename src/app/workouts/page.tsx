'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CalendarDays,FilterX,Plus,Search,Trash2} from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import Protected from '@/components/Protected';
import {useExerciseLibrary} from '@/lib/custom-exercises';
import {loadWorkouts,loadRoutines,orderedItems} from '@/lib/data';
import {browserDb} from '@/lib/supabase';
import {dateISO,fmtDate} from '@/lib/format';
import type {Routine,Workout} from '@/lib/types';
import styles from './workouts.module.css';

function WorkoutsContent(){
 const {nameOf}=useExerciseLibrary();
 const [items,setItems]=useState<Workout[]>([]);
 const [routines,setRoutines]=useState<Routine[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [period,setPeriod]=useState('all');
 const [routine,setRoutine]=useState('all');
 const [order,setOrder]=useState('new');
 const [from,setFrom]=useState(''),[to,setTo]=useState('');
 useEffect(()=>{
  let live=true;
  Promise.all([loadWorkouts(),loadRoutines()])
   .then(([workouts,rs])=>{if(live){setItems(workouts);setRoutines(rs);}})
   .catch(e=>{if(live)setError(e instanceof Error?e.message:'기록을 불러오지 못했습니다.');})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[]);
 const titleById=useMemo(()=>new Map(routines.map(r=>[r.id,r.title])),[routines]);
 const filtered=useMemo(()=>{
  const today=dateISO();
  let start='';
  if(['7','30','90'].includes(period)){
   const d=new Date(today+'T12:00:00');
   d.setDate(d.getDate()-Number(period)+1);
   start=dateISO(d);
  }else if(period==='custom')start=from;
  const end=period==='custom'?to:today;
  const q=query.trim().toLocaleLowerCase('ko-KR');
  return items.filter(w=>{
   if(start&&w.performed_at<start)return false;
   if(end&&w.performed_at>end)return false;
   if(routine!=='all'&&w.routine_id!==routine)return false;
   if(q){
    const names=w.workout_entries.map(e=>nameOf(e.exercise_id)).join(' ');
    const searchable=[fmtDate(w.performed_at),w.performed_at,w.notes||'',
     w.routine_id?titleById.get(w.routine_id)||'':'자유 운동',names].join(' ').toLocaleLowerCase('ko-KR');
    if(!searchable.includes(q))return false;
   }
   return true;
  }).sort((a,b)=>(order==='old'?a.performed_at.localeCompare(b.performed_at):
   b.performed_at.localeCompare(a.performed_at))||
   (order==='old'?a.created_at.localeCompare(b.created_at):b.created_at.localeCompare(a.created_at)));
 },[items,query,period,routine,order,from,to,titleById,nameOf]);
 const reset=()=>{setQuery('');setPeriod('all');setRoutine('all');setOrder('new');setFrom('');setTo('');};
 const del=async(id:string)=>{
  if(!window.confirm('이 운동 기록을 삭제할까요?'))return;
  setError('');
  const {error:err}=await browserDb().from('workout_sessions').delete().eq('id',id);
  if(err)setError(err.message);
  else setItems(prev=>prev.filter(w=>w.id!==id));
 };
 const sets=filtered.reduce((n,w)=>n+w.workout_entries.reduce((s,e)=>s+e.workout_sets.length,0),0);
 return <div className="app-page">
  <PageHeading eyebrow="TRAINING LOG" title="운동 기록"
   description="날짜·루틴·종목별로 검색하고 실제 수행한 운동을 확인하거나 수정해요.">
   <Link href="/calendar" className="btn btn-outline"><CalendarDays size={16}/>월간 캘린더</Link>
   <Link href="/workouts/new" className="btn btn-primary"><Plus size={17}/>운동 기록하기</Link>
  </PageHeading>
  {error&&<div className="error-message" role="alert">{error}</div>}
  <section className={styles.filters} aria-label="운동 기록 검색 및 필터">
   <label className={styles.search}><Search size={18}/>
    <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="운동 이름·루틴 이름·메모 검색"
     aria-label="운동 기록 검색"/>
   </label>
   <div className={styles.selectRow}>
    <label>기간
     <select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="운동 기록 기간">
      <option value="all">전체 기간</option><option value="7">최근 7일</option><option value="30">최근 30일</option>
      <option value="90">최근 90일</option><option value="custom">직접 선택</option>
     </select>
    </label>
    <label>루틴
     <select value={routine} onChange={e=>setRoutine(e.target.value)} aria-label="운동 기록 루틴">
      <option value="all">모든 루틴</option><option value="free">자유 운동</option>
      {routines.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
     </select>
    </label>
    <label>정렬
     <select value={order} onChange={e=>setOrder(e.target.value)} aria-label="운동 기록 정렬">
      <option value="new">최신순</option><option value="old">오래된순</option>
     </select>
    </label>
   </div>
   {period==='custom'&&<div className={styles.dates}>
    <label>시작 날짜<input type="date" aria-label="시작 날짜" max={to||dateISO()} value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label>종료 날짜<input type="date" aria-label="종료 날짜" min={from||undefined} max={dateISO()} value={to} onChange={e=>setTo(e.target.value)}/></label>
   </div>}
   <div className={styles.filterFoot}>
    <span><strong>{filtered.length}건</strong> 검색됨 · 총 {sets}세트 수행</span>
    <button className={styles.clear} type="button" onClick={reset}><FilterX size={15}/>조건 초기화</button>
   </div>
  </section>
  {loading?<div className="state-card">운동 기록을 불러오는 중…</div>:
   filtered.length?<div className={styles.records}>
    {filtered.map(w=>{
     const total=w.workout_entries.reduce((sum,e)=>sum+e.workout_sets.length,0);
     return <article className={styles.record} key={w.id}>
      <div className={styles.recordTop}>
       <div><span className="eyebrow">WORKOUT SESSION</span>
        <h2>{fmtDate(w.performed_at)}</h2>
        <p>{w.routine_id?titleById.get(w.routine_id)||'기존 루틴 기록':'자유 운동'} · {w.workout_entries.length}개 종목 · {total}세트</p>
       </div>
       <div className="button-row">
        <Link href={'/workouts/'+w.id+'/edit'} className="btn btn-ghost btn-sm">수정<ArrowRight size={14}/></Link>
        <button type="button" className="icon-btn" aria-label="운동 기록 삭제" onClick={()=>del(w.id)}><Trash2 size={16}/></button>
       </div>
      </div>
      <div className={styles.chips}>{orderedItems(w.workout_entries).map(e=>
       <span key={e.id}>{nameOf(e.exercise_id)} <strong>{e.workout_sets.length}세트</strong></span>)}</div>
      {w.notes&&<p className={styles.note}>{w.notes}</p>}
     </article>;
    })}
   </div>:<div className={styles.empty}><CalendarDays size={29}/>
    <h3>{items.length?'검색 조건에 맞는 운동 기록이 없어요.':'아직 저장한 운동 기록이 없어요.'}</h3>
    <p>{items.length?'검색 조건을 바꾸거나 초기화해 보세요.':'운동을 수행한 뒤 완료한 세트를 기록해 보세요.'}</p>
    {items.length?<button className="btn btn-outline" onClick={reset}>조건 초기화</button>:
     <Link href="/workouts/new" className="btn btn-primary">첫 운동 기록하기</Link>}
   </div>}
 </div>;
}
export default function WorkoutsPage(){return <Protected><WorkoutsContent/></Protected>}
