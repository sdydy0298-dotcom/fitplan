'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {
 ArrowRight,BookOpen,CalendarDays,CheckCircle2,ChevronRight,
 ClipboardList,Clock3,Compass,Dumbbell,History,Layers3,Play,TrendingUp
} from 'lucide-react';
import Protected from '@/components/Protected';
import PageHeading from '@/components/PageHeading';
import {useExerciseLibrary} from '@/lib/custom-exercises';
import {loadRoutines,loadWorkouts} from '@/lib/data';
import {DAYS} from '@/lib/exercises';
import {dateISO,fmtDate} from '@/lib/format';
import {calculatePlannerWeek,mondayOf} from '@/lib/planner';
import {getWeekPlan} from '@/lib/weekly-plan';
import {summarizeExercises} from '@/lib/workout-resume';
import type {SavedWeekPlan} from '@/lib/weekly-plan';
import type {Routine,Workout} from '@/lib/types';
import styles from './dashboard.module.css';

function DashboardData(){
 const {nameOf}=useExerciseLibrary();
 const [today,setToday]=useState('');
 const [routines,setRoutines]=useState<Routine[]>([]);
 const [workouts,setWorkouts]=useState<Workout[]>([]);
 const [activeWeek,setActiveWeek]=useState<SavedWeekPlan|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');

 useEffect(()=>{
  let live=true;
  const current=dateISO();
  setToday(current);
  Promise.all([
   loadRoutines(),
   loadWorkouts(),
   getWeekPlan(mondayOf(current),current)
  ])
   .then(([rs,ws,week])=>{
    if(!live)return;
    setRoutines(rs);
    setWorkouts(ws);
    setActiveWeek(week);
   })
   .catch(e=>{if(live)setError(e instanceof Error?e.message:'대시보드를 불러오지 못했습니다.');})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[]);

 const weekday=today?new Date(today+'T12:00:00').getDay():0;
 const todayItems=activeWeek?.days.find(d=>d.weekday===weekday)?.items??[];
 const todayRecords=activeWeek?.routine_id
  ?workouts.filter(w=>w.performed_at===today&&w.routine_id===activeWeek.routine_id):[];
 const exercises=summarizeExercises(todayItems,todayRecords);
 const targetSets=exercises.reduce((sum,x)=>sum+x.targetSets,0);
 const doneSets=exercises.reduce((sum,x)=>sum+x.completedSets,0);
 const remainingSets=Math.max(0,targetSets-doneSets);
 const todayPercent=targetSets?Math.round(doneSets/targetSets*100):0;
 const isTrainingDay=targetSets>0;
 const hasRoutine=Boolean(activeWeek?.routine_id);
 const isFinished=isTrainingDay&&doneSets>=targetSets;
 const week=today?calculatePlannerWeek(activeWeek,workouts,today):null;
 const weekAgo=new Date();
 weekAgo.setDate(weekAgo.getDate()-6);
 const since=dateISO(weekAgo);
 const recentDays=new Set(workouts.filter(w=>w.performed_at>=since&&w.performed_at<=today)
  .map(w=>w.performed_at)).size;
 const recentWorkouts=workouts.slice(0,4);

 const heroTitle=!hasRoutine?'운동 루틴을 선택해 시작해요.':
  !isTrainingDay?'오늘은 휴식일이에요.':
  isFinished?'오늘의 운동을 완료했어요.':
  doneSets>0?'좋아요, 남은 운동을 이어가요.':'오늘의 운동을 시작해 볼까요?';
 const heroDescription=!hasRoutine
  ?'마음에 드는 루틴을 하나 선택하면 이번 주부터 운동 계획이 시작돼요.'
  :!isTrainingDay
   ?'오늘은 예정된 운동이 없어요. 쉬어가거나 이번 주 계획에 운동을 추가해도 좋아요.'
   :isFinished
    ?'계획한 운동을 모두 기록했어요. 오늘의 운동 기록을 다시 확인할 수 있어요.'
    :doneSets>0
     ?'기록된 세트는 그대로 남아 있어요. 나머지 세트만 이어서 수행하면 돼요.'
     :'오늘 계획한 종목을 확인하고 실제로 수행한 세트를 기록해 보세요.';

 const workoutHref=hasRoutine
  ?'/workouts/new?routine='+encodeURIComponent(activeWeek?.routine_id||'')+'&date='+today+'&plan=1'
  :'/routines';

 return <div className="app-page">
  <PageHeading
   eyebrow="MY DASHBOARD"
   title="오늘의 운동, 여기서 시작하세요."
   description="오늘 할 운동과 최근 기록을 빠르게 확인해요. 요일별 일정과 계획 수정은 운동 플래너에서 관리할 수 있어요."
  >
   <Link href="/planner" className="btn btn-outline"><CalendarDays size={16}/>운동 플래너 보기</Link>
  </PageHeading>

  {error&&<div className="error-message" role="alert">{error}</div>}
  {loading?<div className="state-card"><Dumbbell size={26}/><h2>운동 현황을 불러오는 중…</h2></div>:
   !error&&<>
    <section className={styles.hero} aria-labelledby="dashboard-today-title">
     <div className={styles.heroMain}>
      <div className={styles.heroEyebrow}>
       <span className={styles.kicker}>TODAY'S TRAINING</span>
       <span className={styles.datePill}><CalendarDays size={13}/>{fmtDate(today)} · {DAYS[weekday]}요일</span>
       {hasRoutine&&<span className={styles.status}>
        {isTrainingDay?(isFinished?'운동 완료':doneSets>0?'진행 중':'기록 대기'):'휴식일'}
       </span>}
      </div>
      <h2 id="dashboard-today-title" className={styles.heroTitle}>{heroTitle}</h2>
      <p className={styles.heroDescription}>{heroDescription}</p>

      {hasRoutine&&<div className={styles.heroRoutine}>
       <Layers3 size={15}/>
       <span>진행 중인 루틴</span>
       <strong>{activeWeek?.routine_title}</strong>
      </div>}

      {isTrainingDay&&<div className={styles.exercisePreview} aria-label="오늘 계획한 운동">
       {exercises.slice(0,4).map(ex=>(
        <span key={ex.exercise_id} className={styles.exerciseChip+(ex.completedSets>=ex.targetSets?' '+styles.exerciseChipComplete:'')}>
         {ex.completedSets>=ex.targetSets?<CheckCircle2 size={14}/>:<Dumbbell size={14}/>}
         {nameOf(ex.exercise_id)} · {ex.completedSets}/{ex.targetSets}
        </span>
       ))}
       {exercises.length>4&&<span className={styles.exerciseChip}>외 {exercises.length-4}종목</span>}
      </div>}

      <div className={styles.heroActions}>
       {hasRoutine&&isTrainingDay?<Link href={workoutHref} className="btn btn-primary">
        <Play size={17}/>{doneSets>0?'오늘 운동 이어하기':'오늘 운동 시작하기'}<ArrowRight size={15}/>
       </Link>:hasRoutine?<Link href={'/planner/edit?date='+today} className="btn btn-primary">
        <CalendarDays size={17}/>오늘 운동 추가하기<ArrowRight size={15}/>
       </Link>:<Link href="/routines" className="btn btn-primary">
        <Dumbbell size={17}/>운동 루틴 선택하기<ArrowRight size={15}/>
       </Link>}
       <Link href={hasRoutine?'/planner':'/routines/new'} className="btn btn-outline">
        {hasRoutine?'주간 계획 확인':'새 루틴 만들기'}
        <ChevronRight size={15}/>
       </Link>
      </div>
     </div>
     <div className={styles.heroAside}>
      <div className={styles.asideCard}>
       <div className={styles.asideHeader}>
        <span className={styles.asideLabel}>{hasRoutine?'오늘의 수행 현황':'오늘의 운동'}</span>
        {isTrainingDay&&<span className={styles.asidePercent}>{todayPercent}%</span>}
       </div>
       {isTrainingDay?<>
        <div className={styles.numberLine}><strong>{doneSets}</strong><span>/ {targetSets}세트</span></div>
        <div className={styles.progressTrack} role="progressbar" aria-label="오늘 운동 세트 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={todayPercent}>
         <span className={styles.progressFill} style={{width:String(todayPercent)+'%'}}/>
        </div>
        <div className={styles.asideBottom}>
         <span>{exercises.length}개 운동 종목</span>
         <strong>{remainingSets===0?'모든 목표 세트 완료':remainingSets+'세트 남음'}</strong>
        </div>
       </>:<>
        <div className={styles.numberLine}><strong>{hasRoutine?'휴식':'대기'}</strong></div>
        <p className={styles.asideHint}>{hasRoutine?'예정된 운동이 없는 날이에요.':'루틴을 선택하면 오늘의 수행 현황이 표시돼요.'}</p>
       </>}
      </div>
     </div>
    </section>

    <section className={styles.overview} aria-label="운동 현황 요약">
     <div className={styles.metric}>
      <span className={styles.metricLabel}><TrendingUp size={16}/>이번 주 달성률</span>
      <strong className={styles.metricValue}>{week?.percentage??0}<small>%</small></strong>
      <span className={styles.metricDescription}>{week?.completedSets??0}/{week?.plannedSets??0}세트 수행</span>
     </div>
     <div className={styles.metric}>
      <span className={styles.metricLabel}><History size={16}/>최근 7일 운동</span>
      <strong className={styles.metricValue}>{recentDays}<small>일</small></strong>
      <span className={styles.metricDescription}>운동 기록이 있는 날짜 기준</span>
     </div>
     <div className={styles.metric}>
      <span className={styles.metricLabel}><ClipboardList size={16}/>내 운동 루틴</span>
      <strong className={styles.metricValue}>{routines.length}<small>개</small></strong>
      <span className={styles.metricDescription}>{hasRoutine?'현재 1개 루틴으로 운동 중':'시작할 루틴을 선택해 주세요'}</span>
     </div>
    </section>

    <div className={styles.mainGrid}>
     <section className={styles.panel} aria-labelledby="recent-workouts-heading">
      <div className={styles.sectionHeading}>
       <h2 id="recent-workouts-heading">최근 운동 기록</h2>
       <Link href="/workouts">전체 기록 보기<ArrowRight size={14}/></Link>
      </div>
      {recentWorkouts.length?recentWorkouts.map(w=>{
       const count=w.workout_entries.reduce((sum,e)=>sum+(e.workout_sets?.length||0),0);
       return <Link href={'/workouts/'+w.id+'/edit'} className={styles.recordRow} key={w.id}>
        <span className={styles.recordIcon}><CheckCircle2 size={18}/></span>
        <span className={styles.recordInfo}>
         <strong>{fmtDate(w.performed_at)}</strong>
         <span>{w.workout_entries.length}개 종목 · 실제 수행 {count}세트</span>
        </span>
        <ChevronRight className={styles.recordArrow} size={18}/>
       </Link>;
      }):<div className={styles.emptyState}>
       <Clock3 size={27}/>
       <strong>아직 운동 기록이 없어요</strong>
       <p>첫 운동을 저장하면 최근 기록에 나타나요.</p>
      </div>}
     </section>

     <section className={styles.panel} aria-labelledby="quick-menu-heading">
      <div className={styles.sectionHeading}><h2 id="quick-menu-heading">빠른 이동</h2></div>
      <div className={styles.shortcuts}>
       <Link href="/planner" className={styles.shortcut}>
        <span className={styles.shortcutIcon}><CalendarDays size={19}/></span>
        <span className={styles.shortcutText}><strong>운동 플래너</strong><span>요일별 계획·수정</span></span>
       </Link>
       <Link href="/routines" className={styles.shortcut}>
        <span className={styles.shortcutIcon}><Dumbbell size={19}/></span>
        <span className={styles.shortcutText}><strong>내 루틴</strong><span>루틴 선택·관리</span></span>
       </Link>
       <Link href="/calendar" className={styles.shortcut}>
        <span className={styles.shortcutIcon}><CalendarDays size={19}/></span>
        <span className={styles.shortcutText}><strong>월간 캘린더</strong><span>운동한 날 확인</span></span>
       </Link>
       <Link href="/progress" className={styles.shortcut}>
        <span className={styles.shortcutIcon}><TrendingUp size={19}/></span>
        <span className={styles.shortcutText}><strong>성장 분석</strong><span>세트·달성률·중량</span></span>
       </Link>
       <Link href="/discover" className={styles.shortcut}>
        <span className={styles.shortcutIcon}><Compass size={19}/></span>
        <span className={styles.shortcutText}><strong>루틴 둘러보기</strong><span>공개 운동 계획 복사</span></span>
       </Link>
       <Link href="/exercises" className={styles.shortcut}>
        <span className={styles.shortcutIcon}><BookOpen size={19}/></span>
        <span className={styles.shortcutText}><strong>운동 가이드</strong><span>운동법 확인</span></span>
       </Link>
      </div>
      <div className={styles.bottomNote}>
       <CalendarDays size={15}/>이번 주 일정 변경은 운동 플래너에서 할 수 있어요.
      </div>
     </section>
    </div>
   </>}
 </div>;
}
export default function Dashboard(){return <Protected><DashboardData/></Protected>;}
