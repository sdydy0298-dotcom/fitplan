'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ClipboardList,CalendarDays,Plus} from 'lucide-react';
import Protected from '@/components/Protected';
import PageHeading from '@/components/PageHeading';
import WeeklyPlanner from '@/components/WeeklyPlanner';
import {loadRoutines,loadWorkouts} from '@/lib/data';
import type {Routine,Workout} from '@/lib/types';

function PlannerContent(){
 const [routines,setRoutines]=useState<Routine[]>([]);
 const [workouts,setWorkouts]=useState<Workout[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  Promise.all([loadRoutines(),loadWorkouts()])
   .then(([rs,ws])=>{if(active){setRoutines(rs);setWorkouts(ws);}})
   .catch(err=>{if(active)setError(err instanceof Error?err.message:'플래너를 불러오지 못했습니다.');})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[]);
 return <div className="app-page">
  <PageHeading eyebrow="WEEKLY PLANNER" title="나의 운동 플래너"
   description="계획한 날과 실제 운동한 날을 비교하고, 지나간 미기록 날짜까지 한눈에 확인해요.">
   <Link href="/routines" className="btn btn-outline"><ClipboardList size={16}/>내 루틴</Link>
   <Link href="/calendar" className="btn btn-outline"><CalendarDays size={16}/>월간 캘린더</Link>
   <Link href="/workouts/new" className="btn btn-primary"><Plus size={16}/>운동 기록</Link>
  </PageHeading>
  {error&&<div className="error-message" role="alert">{error}</div>}
  {loading?<div className="state-card"><CalendarDays size={25}/><h2>운동 계획을 불러오는 중…</h2></div>:
   !error&&<WeeklyPlanner routines={routines} workouts={workouts}/>}
  <section className="panel planner-guide">
   <h2>플래너를 사용하는 방법</h2>
   <div className="planner-guide-grid">
    <div><strong>01 · 루틴 정하기</strong><p>내 루틴에서 요일별 운동을 정하면 자동으로 주간 일정이 만들어집니다.</p></div>
    <div><strong>02 · 실제 운동 기록</strong><p>일정에서 운동 기록을 누르면 날짜와 루틴이 미리 선택됩니다. 기록을 저장해야 완료로 인정돼요.</p></div>
    <div><strong>03 · 달성 현황 확인</strong><p>완료·미기록·예정을 구분하고 이전 주로 이동해 달성률을 확인합니다.</p></div>
   </div>
   <Link href="/progress" className="text-link">주간 달성률·중량 그래프 확인하기 <ArrowRight size={15}/></Link>
  </section>
 </div>;
}
export default function PlannerPage(){return <Protected><PlannerContent/></Protected>;}
