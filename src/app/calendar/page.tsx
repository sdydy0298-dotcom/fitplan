'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CalendarDays,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Plus,TrendingUp} from 'lucide-react';
import Protected from '@/components/Protected';
import PageHeading from '@/components/PageHeading';
import {browserDb} from '@/lib/supabase';
import {loadWorkouts} from '@/lib/data';
import {useExerciseLibrary} from '@/lib/custom-exercises';
import {dateISO,fmtDate} from '@/lib/format';
import {makeMonth,monthDates,monthLabel,nextMonth} from '@/lib/monthly-calendar';
import type {CalendarStatus} from '@/lib/monthly-calendar';
import type {SavedWeekPlan,PlanVersion} from '@/lib/weekly-plan';
import type {Workout} from '@/lib/types';
import {mondayOf} from '@/lib/planner';
import styles from './calendar.module.css';

const weekdays=['월','화','수','목','금','토','일'];
const statusLabel:Record<CalendarStatus,string>={
 done:'완료',partial:'일부 완료',missed:'미기록',today:'오늘 예정',
 upcoming:'예정',rest:'휴식',extra:'자유 운동', 'not-started':'시작 전',none:'계획 없음'
};
function CalendarContent(){
 const {nameOf}=useExerciseLibrary();
 const [today,setToday]=useState('');
 const [month,setMonth]=useState('');
 const [selected,setSelected]=useState('');
 const [weeks,setWeeks]=useState<SavedWeekPlan[]>([]);
 const [versions,setVersions]=useState<PlanVersion[]>([]);
 const [workouts,setWorkouts]=useState<Workout[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{const now=dateISO();setToday(now);setMonth(now.slice(0,7));setSelected(now);},[]);
 useEffect(()=>{
  if(!month)return;
  let live=true;
  const dates=monthDates(month);
  const first=mondayOf(dates[0]),last=mondayOf(dates[dates.length-1]);
  setLoading(true);setError('');
  Promise.all([
   browserDb().from('weekly_plans').select('*').gte('week_start',first).lte('week_start',last),
   browserDb().from('plan_versions').select('*').lte('effective_week',last)
    .order('effective_week',{ascending:false}).order('created_at',{ascending:false}),
   loadWorkouts()
  ]).then(([planResult,versionResult,records])=>{
   if(!live)return;
   if(planResult.error)throw planResult.error;
   if(versionResult.error)throw versionResult.error;
   setWeeks((planResult.data||[]) as SavedWeekPlan[]);
   setVersions((versionResult.data||[]) as PlanVersion[]);
   setWorkouts(records);
  }).catch(e=>{if(live)setError(e instanceof Error?e.message:'월간 기록을 불러오지 못했어요.');})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[month]);
 const result=useMemo(()=>month&&today?makeMonth(month,workouts,weeks,versions,today):null,
  [month,today,workouts,weeks,versions]);
 const active=result?.days.find(d=>d.date===selected)||result?.days.find(d=>d.inMonth);
 const changeMonth=(offset:number)=>{
  const next=nextMonth(month,offset);
  setMonth(next);
  setSelected(next===today.slice(0,7)?today:next+'-01');
 };
 const startHref=active?.routineId
  ?'/workouts/new?routine='+encodeURIComponent(active.routineId)+'&date='+active.date+'&plan=1'
  :'/workouts/new?date='+active?.date;
 return <div className="app-page">
  <PageHeading eyebrow="MONTHLY WORKOUT CALENDAR" title="월간 운동 캘린더"
   description="운동한 날과 놓친 날을 달력으로 확인해요. 실제 기록과 당시 주간 계획을 기준으로 계산합니다.">
   <Link href="/planner" className="btn btn-outline"><CalendarDays size={16}/>주간 플래너</Link>
   <Link href="/progress" className="btn btn-primary"><TrendingUp size={16}/>성장 그래프</Link>
  </PageHeading>
  <section className={styles.overview}>
   <div className={styles.heading}>
    <div><span className="eyebrow">MONTHLY OVERVIEW</span><h2>{month&&monthLabel(month)}</h2></div>
    <div className={styles.controls}>
     <button type="button" className="icon-btn" aria-label="이전 달" disabled={!month||loading} onClick={()=>changeMonth(-1)}><ChevronLeft size={18}/></button>
     <button type="button" className={styles.todayButton} onClick={()=>{setMonth(today.slice(0,7));setSelected(today);}} disabled={!today||loading}>이번 달</button>
     <button type="button" className="icon-btn" aria-label="다음 달" disabled={!month||loading} onClick={()=>changeMonth(1)}><ChevronRight size={18}/></button>
    </div>
   </div>
   {error&&<div className="error-message" role="alert">{error}</div>}
   {loading||!result?<div className={styles.loading}>월간 운동 기록을 불러오는 중…</div>:<>
    <div className={styles.summary}>
     <div><span>실제 운동한 날</span><strong>{result.workoutDays}<small>일</small></strong></div>
     <div><span>계획 완료·일부 완료</span><strong>{result.completedDays+result.partialDays}<small>일</small></strong></div>
     <div><span>이번 달 세트 달성률</span><strong>{result.percentage}<small>%</small></strong></div>
    </div>
    <div className={styles.legend}>
     {(['done','partial','missed','upcoming','rest','extra','not-started'] as CalendarStatus[]).map(status=>
      <span key={status}><i className={styles['dot-'+status]}/>{statusLabel[status]}</span>)}
    </div>
    <div className={styles.calendar} role="grid" aria-label={monthLabel(month)+' 운동 기록'}>
     {weekdays.map(day=><div key={day} className={styles.weekday} role="columnheader">{day}</div>)}
     {result.days.map(day=><button key={day.date} type="button" role="gridcell"
      aria-label={fmtDate(day.date)+' '+statusLabel[day.status]+(day.plannedSets?' '+day.completedSets+'/'+day.plannedSets+'세트':'')}
      aria-pressed={active?.date===day.date}
      onClick={()=>{if(!day.inMonth)setMonth(day.date.slice(0,7));setSelected(day.date);}}
      className={[styles.day,styles['day-'+day.status],!day.inMonth?styles.outside:'',
       active?.date===day.date?styles.selected:'',day.date===today?styles.current:''].join(' ')}>
      <strong>{Number(day.date.slice(-2))}</strong>
      {day.status==='done'?<CheckCircle2 className={styles.dayIcon} size={16}/>:
       day.status==='partial'?<Clock3 className={styles.dayIcon} size={16}/>:
       <span className={styles.dayDot}/>}
      <span className={styles.dayLabel}>{statusLabel[day.status]}</span>
      {day.plannedSets>0&&<span className={styles.daySets}>{day.completedSets}/{day.plannedSets}</span>}
     </button>)}
    </div>
    <div className={styles.footer}>해당 날짜를 선택하면 운동 종목과 수행 기록을 자세히 볼 수 있어요. 미래 날짜는 예정으로 표시돼요.</div>
   </>}
  </section>
  {!loading&&!error&&result&&active&&<section className={styles.details} aria-label="선택한 날짜의 운동 상세">
   <div className={styles.detailHeader}>
    <div><span className="eyebrow">DAY DETAILS</span>
     <h2>{fmtDate(active.date)} <span className={styles.status}>{statusLabel[active.status]}</span></h2>
     <p>{active.routineTitle||'선택한 날짜에 적용된 루틴이 없어요.'}</p>
    </div>
    <div className={styles.detailActions}>
     {active.date<=today&&<Link href={startHref} className="btn btn-primary"><Plus size={15}/>운동 기록하기</Link>}
     <Link href="/workouts" className="btn btn-outline">기록 목록<ArrowRight size={14}/></Link>
    </div>
   </div>
   {active.exercises.length?<div className={styles.exercises}>
    {active.exercises.map(ex=><div key={ex.exercise_id} className={styles.exerciseRow}>
     <span className={styles.exerciseIcon}><CheckCircle2 size={17}/></span>
     <span className={styles.exerciseTitle}>{nameOf(ex.exercise_id)}</span>
     <div className={styles.exerciseCount}>{ex.completed_sets} / {ex.target_sets}세트</div>
     <div className={styles.exerciseTrack}><span style={{width:(ex.target_sets?ex.completed_sets/ex.target_sets*100:0)+'%'}}/></div>
    </div>)}
   </div>:<div className={styles.empty}>
    {active.status==='extra'?'기본 계획에 없었지만 실제로 운동한 날이에요. 기록 목록에서 내용을 확인할 수 있어요.':
     active.status==='not-started'?'이날은 루틴을 시작하기 전이어서 미기록에 포함하지 않아요.':
     active.status==='rest'?'운동 계획이 없는 휴식일이에요.':'이 날짜에 정해진 운동 계획이 없어요.'}
   </div>}
   <p className={styles.detailFoot}>기록된 운동 {active.workoutCount}건 · 실제 수행 {active.recordedSets}세트</p>
  </section>}
 </div>;
}
export default function CalendarPage(){return <Protected><CalendarContent/></Protected>}
