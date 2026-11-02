'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CalendarDays,Plus,Trash2} from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import Protected from '@/components/Protected';
import {useExerciseLibrary} from '@/lib/custom-exercises';
import {loadWorkouts,orderedItems} from '@/lib/data';

import {browserDb} from '@/lib/supabase';
import {fmtDate} from '@/lib/format';
import type {Workout} from '@/lib/types';
function Content(){const {nameOf}=useExerciseLibrary();const [items,setItems]=useState<Workout[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const refresh=()=>loadWorkouts().then(setItems).catch(e=>setError(e.message));
 useEffect(()=>{refresh().finally(()=>setLoading(false));},[]);
 const del=async(id:string)=>{if(!window.confirm('이 운동 기록을 삭제할까요?'))return;const{error}=await browserDb().from('workout_sessions').delete().eq('id',id);if(error)setError(error.message);else setItems(prev=>prev.filter(x=>x.id!==id));};
 return <div className="app-page"><PageHeading eyebrow="TRAINING LOG" title="운동 기록" description="실제로 수행한 운동을 날짜별로 모아서 확인해요."><Link href="/workouts/new" className="btn btn-primary"><Plus size={17}/>운동 기록하기</Link></PageHeading>{error&&<div className="error-message">{error}</div>}{loading?<p>기록을 불러오는 중…</p>:items.length?<div className="form-stack">{items.map(w=><div className="panel" key={w.id}><div className="panel-header"><div><span className="eyebrow">WORKOUT SESSION</span><h2 style={{marginTop:6,marginBottom:0}}>{fmtDate(w.performed_at)}</h2></div><div className="button-row"><Link className="btn btn-ghost btn-sm" href={`/workouts/${w.id}/edit`}>수정 <ArrowRight size={15}/></Link><button className="icon-btn" aria-label="운동 기록 삭제" onClick={()=>del(w.id)}><Trash2 size={17}/></button></div></div><div className="button-row">{orderedItems(w.workout_entries??[]).map(e=><span key={e.id} className="tag">{nameOf(e.exercise_id)} · {e.workout_sets?.length}세트</span>)}</div>{w.notes&&<p className="small" style={{marginTop:13,marginBottom:0}}>{w.notes}</p>}</div>)}</div>:<div className="empty"><CalendarDays size={30}/><h3>아직 운동 기록이 없어요</h3><p>오늘의 운동을 입력하면 이전 기록과 비교할 수 있어요.</p><Link href="/workouts/new" className="btn btn-primary">첫 운동 기록하기</Link></div>}</div>;
}
export default function Workouts(){return <Protected><Content/></Protected>}
