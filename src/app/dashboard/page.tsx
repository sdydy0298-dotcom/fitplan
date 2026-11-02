'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,BookOpen,CalendarCheck,ClipboardList,Dumbbell,Plus,TrendingUp} from 'lucide-react';
import Protected from '@/components/Protected';
import PageHeading from '@/components/PageHeading';
import {loadRoutines,loadWorkouts,orderedDays} from '@/lib/data';
import {DAYS,getExercise} from '@/lib/exercises';
import type {Routine,Workout} from '@/lib/types';
import {dateISO,fmtDate} from '@/lib/format';
function DashboardData(){
 const [routines,setRoutines]=useState<Routine[]>([]),[workouts,setWorkouts]=useState<Workout[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{Promise.all([loadRoutines(),loadWorkouts()]).then(([r,w])=>{setRoutines(r);setWorkouts(w);}).catch(e=>setError(e.message)).finally(()=>setBusy(false));},[]);
 const today=new Date().getDay();const todays=routines.flatMap(r=>orderedDays(r).filter(d=>d.weekday===today).map(d=>({routine:r,day:d})));
 const weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-6);const since=dateISO(weekAgo);
 const weekCount=workouts.filter(w=>w.performed_at>=since).length;
 return <div className="app-page"><PageHeading eyebrow="MY TRAINING SPACE" title="오늘도 나답게, 한 걸음." description="내 루틴과 운동 기록을 한눈에 확인해 보세요."><Link className="btn btn-primary" href="/workouts/new"><Plus size={17}/>운동 기록하기</Link></PageHeading>
  {error&&<div className="error-message">{error}</div>}
  <div className="stats-grid"><div className="stat-card highlight"><span>내 운동 루틴</span><strong>{busy?'…':routines.length}</strong><small>저장한 주간 계획</small></div><div className="stat-card"><span>최근 7일 운동</span><strong>{busy?'…':weekCount}<span style={{fontSize:15,marginLeft:5}}>회</span></strong><small>실제 기록한 운동 횟수</small></div><div className="stat-card"><span>전체 운동 기록</span><strong>{busy?'…':workouts.length}<span style={{fontSize:15,marginLeft:5}}>회</span></strong><small>꾸준함의 흔적</small></div></div>
  <div className="two-col"><section className="panel"><div className="panel-header"><h2>오늘의 운동</h2><span className="tag green"><CalendarCheck size={14}/> {DAYS[today]}요일</span></div>{todays.length?todays.map(({routine,day})=><div className="workout-summary" key={routine.id}><div className="panel-header"><h3>{routine.title}</h3><Link href={`/routines/${routine.id}`} className="text-link">루틴 보기 <ArrowRight size={13}/></Link></div><div className="button-row">{day.routine_items?.map(it=><span className="tag" key={it.id}>{getExercise(it.exercise_id)?.name??it.exercise_id}</span>)}</div><Link href={`/workouts/new?routine=${routine.id}`} className="btn btn-dark btn-sm" style={{marginTop:16}}>이 루틴으로 기록 <ArrowRight size={14}/></Link></div>):<div className="empty"><Dumbbell size={30}/><h3>오늘 계획된 운동이 없어요</h3><p>휴식일이라면 충분히 쉬어도 좋아요. 원하는 운동을 새로 기록할 수도 있어요.</p><Link href="/routines/new" className="btn btn-primary btn-sm">새 루틴 만들기</Link></div>}</section>
   <section className="panel"><div className="panel-header"><h2>최근 운동 기록</h2><Link href="/workouts" className="text-link">전체 보기 <ArrowRight size={14}/></Link></div>{workouts.slice(0,4).length?workouts.slice(0,4).map(w=><Link key={w.id} href={`/workouts/${w.id}/edit`} className="list-row"><div><h3>{fmtDate(w.performed_at)}</h3><p>{w.workout_entries?.length??0}개 운동 · {w.workout_entries?.reduce((a,e)=>a+(e.workout_sets?.length||0),0)}세트</p></div><ArrowRight size={16}/></Link>):<div className="empty"><ClipboardList size={28}/><h3>아직 기록이 없어요</h3><p>첫 운동을 기록하면 여기에 보여요.</p></div>}</section></div>
  <div className="spacer"/><section className="panel"><div className="panel-header"><h2>운동을 더 쉽게 시작하기</h2></div><div className="steps-flex"><Link href="/routines/new"><Dumbbell size={21}/><b>루틴 만들기</b><span>주간 운동 계획 작성</span></Link><Link href="/exercises"><BookOpen size={21}/><b>운동법 확인</b><span>자세와 주의사항 확인</span></Link><Link href="/progress"><TrendingUp size={21}/><b>변화 돌아보기</b><span>이전 운동과 비교</span></Link></div></section>
 </div>;
}
export default function Dashboard(){return <Protected><DashboardData/></Protected>}
