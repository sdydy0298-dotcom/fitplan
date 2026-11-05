'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2,ChevronLeft,ChevronRight,Clock3,
 Dumbbell,Minus,PenLine,Play,Plus,XCircle} from 'lucide-react';
import type {Routine,Workout} from '@/lib/types';
import {calculatePlannerWeek,mondayOf,shiftDate} from '@/lib/planner';
import {getWeekPlan,startRoutine,versionForWeek} from '@/lib/weekly-plan';
import type {PlanVersion,SavedWeekPlan} from '@/lib/weekly-plan';
import {dateISO,fmtDate} from '@/lib/format';

const weekdays=['일','월','화','수','목','금','토'];
const stateNames={
 done:'운동 완료',partial:'일부 완료',missed:'미기록',
 today:'기록 대기',upcoming:'예정',rest:'휴식',extra:'자유 운동','not-started':'시작 전'
};
const slotNames={done:'완료',partial:'일부 완료',missed:'미기록',today:'기록 대기',upcoming:'예정'};

export default function WeeklyPlanner({
 routines,workouts,compact=false,onActivePlanChange
}:{
 routines:Routine[];workouts:Workout[];compact?:boolean;
 onActivePlanChange?:(plan:SavedWeekPlan|null)=>void
}){
 const [today,setToday]=useState('');
 const [offset,setOffset]=useState(0);
 const [chosenDate,setChosenDate]=useState('');
 const [plan,setPlan]=useState<SavedWeekPlan|null>(null);
 const [currentVersion,setCurrentVersion]=useState<PlanVersion|null>(null);
 const [loading,setLoading]=useState(true);
 const [changing,setChanging]=useState(false);
 const [choosing,setChoosing]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{setToday(dateISO());},[]);
 const start=useMemo(()=>today?mondayOf(shiftDate(today,offset*7)):'',[today,offset]);
 useEffect(()=>{
  if(!today||!start)return;
  let live=true;
  setLoading(true);setError('');
  Promise.all([getWeekPlan(start,today),versionForWeek(mondayOf(today))])
   .then(([p,v])=>{
    if(!live)return;
    setPlan(p);setCurrentVersion(v);
    if(offset===0)onActivePlanChange?.(p);
   })
   .catch(e=>{if(live){setError(e instanceof Error?e.message:'주간 계획을 불러오지 못했습니다.');setPlan(null);}})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[start,today,offset,onActivePlanChange]);
 const week=useMemo(()=>today?calculatePlannerWeek(plan,workouts,today,offset,currentVersion):null,[plan,workouts,today,offset,currentVersion]);
 const selected=week?.days.find(day=>day.date===chosenDate)
  ??week?.days.find(day=>day.date===today)??week?.days[0];
 const activeRoutine=routines.find(r=>r.id===currentVersion?.routine_id);
 const startNow=async(routine:Routine)=>{
  if(changing||!today)return;
  if(plan&&offset===0&&!window.confirm('이번 주 계획을 이 루틴으로 새로 적용할까요? 이번 주에만 수정한 운동 구성은 초기화됩니다. 기존 운동 기록은 삭제하지 않습니다.'))return;
  setChanging(true);setError('');
  try{
   const next=await startRoutine(routine,today);
   const v=await versionForWeek(mondayOf(today));
   setCurrentVersion(v);setPlan(next);
   setOffset(0);setChosenDate(today);setChoosing(false);
   onActivePlanChange?.(next);
  }catch(e){setError(e instanceof Error?e.message:'루틴을 적용하지 못했습니다.');}
  finally{setChanging(false);}
 };
 if(!week||!selected){
  return <section className="panel planner-panel"><h2>주간 운동 플래너</h2><p className="small">운동 계획을 불러오는 중…</p></section>;
 }
 const title=week.start.slice(5).replace('-','.')+' ~ '+week.end.slice(5).replace('-','.');
 const hasPlan=week.planned>0;
 const current=offset===0;
 return <section className={'panel planner-panel'+(compact?' planner-compact':'')} aria-label="주간 운동 달성 플래너">
  <div className="planner-header">
   <div>
    <span className="eyebrow">WEEKLY TRAINING PLANNER</span>
    <h2>이번 주, 계획대로 운동했나요?</h2>
    <p className="small">선택한 기본 루틴은 매주 반복되고, 이번 주에만 자유롭게 바꿀 수 있어요.</p>
   </div>
   <div className="planner-navigation">
    <button className="icon-btn" type="button" onClick={()=>{setOffset(v=>Math.max(-52,v-1));setChosenDate('');}} disabled={offset<=-52||changing} aria-label="이전 주"><ChevronLeft size={18}/></button>
    <strong aria-live="polite">{title}</strong>
    <button className="icon-btn" type="button" onClick={()=>{setOffset(v=>Math.min(0,v+1));setChosenDate('');}} disabled={offset===0||changing} aria-label="다음 주"><ChevronRight size={18}/></button>
    {!current&&<button type="button" className="btn btn-ghost btn-sm" onClick={()=>{setOffset(0);setChosenDate('');}}>이번 주</button>}
   </div>
  </div>
  {error&&<div role="alert" className="error-message">{error}</div>}
  {current&&<div className="planner-active-bar">
   <div className="planner-active-label">
    <span className="tag green">{currentVersion?.routine_id?'진행 중':'선택 대기'}</span>
    <strong>{activeRoutine?.title||currentVersion?.routine_title||'시작한 루틴이 없어요'}</strong>
    <small>{currentVersion?.routine_id?'한 번 시작하면 매주 자동 반복됩니다.':'내 루틴을 선택해 이번 주 운동을 시작하세요.'}</small>
   </div>
   <button type="button" className="btn btn-outline btn-sm" disabled={changing} onClick={()=>setChoosing(v=>!v)}>
    <Play size={15}/>{currentVersion?.routine_id?'루틴 변경':'루틴 선택·시작'}
   </button>
  </div>}
  {current&&choosing&&<div className="planner-chooser">
   <h3>이번 주부터 사용할 기본 루틴</h3>
   <p className="small">한 가지만 선택해 시작해요. 나중에 이번 주 계획만 따로 수정할 수 있습니다.</p>
   {routines.length?routines.map(r=><div key={r.id} className="planner-choice">
    <div><strong>{r.title}</strong><span>{r.routine_days?.filter(day=>day.routine_items?.length).length??0}일 운동 · {r.routine_days?.reduce((n,d)=>n+(d.routine_items?.length||0),0)}개 종목</span></div>
    <button className="btn btn-primary btn-sm" type="button" disabled={changing||!r.routine_days.some(d=>d.routine_items?.length)}
     onClick={()=>startNow(r)}><Play size={15}/>{changing?'적용 중…':'이 루틴으로 시작'}</button>
   </div>):<div className="planner-rest-message">저장된 루틴이 없습니다. 먼저 루틴을 만들어 보세요.</div>}
   <Link href="/routines/new" className="text-link"><Plus size={14}/>나만의 루틴 만들기</Link>
  </div>}
  {loading?<div className="planner-rest-message">저장된 주간 계획을 확인하는 중…</div>:<>
   <div className="planner-overview">
    <div className="planner-ring" style={{background:'conic-gradient(#a8d86a '+week.percentage+'%,#e8eeea 0)'}}>
     <div className="planner-ring-inner"><strong>{week.percentage}%</strong><span>{hasPlan?'세트 달성률':'계획 없음'}</span></div>
    </div>
    <div className="planner-summary">
     <div className="planner-progress-top"><strong>{week.completedSets} / {week.plannedSets}세트 수행</strong><span>{week.completed}회 완료 · {week.partial}회 일부 완료</span></div>
     <div className="planner-progress-track" role="progressbar" aria-label="주간 운동 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={week.percentage}><span style={{width:week.percentage+'%'}}/></div>
     <div className="planner-counts">
      <div><span className="planner-count-mark is-done"/><strong>{week.completed}</strong><small>완료</small></div>
      <div><span className="planner-count-mark is-missed"/><strong>{week.missed}</strong><small>미기록</small></div>
      <div><span className="planner-count-mark is-upcoming"/><strong>{week.remaining}</strong><small>대기·예정</small></div>
     </div>
    </div>
   </div>
   {hasPlan?<div className="planner-week">
    {week.days.map(day=><button type="button" key={day.date}
     className={'planner-day is-'+day.status+(selected.date===day.date?' is-selected':'')}
     onClick={()=>setChosenDate(day.date)} aria-pressed={selected.date===day.date} aria-label={fmtDate(day.date)+' '+stateNames[day.status]}>
     <span className="planner-weekday">{weekdays[day.weekday]}</span>
     <strong>{Number(day.date.slice(-2))}</strong>
     <span className="planner-day-icon">{day.status==='done'||day.status==='partial'?<CheckCircle2 size={17}/>:
      day.status==='missed'?<XCircle size={17}/>:
      day.status==='today'||day.status==='upcoming'?<Clock3 size={17}/>:
      day.status==='extra'?<Dumbbell size={17}/>:<Minus size={17}/>}</span>
     <span className="planner-day-label">{stateNames[day.status]}</span>
    </button>)}
   </div>:<div className="planner-empty"><Dumbbell size={20}/>
    <span>{current?'이제 내 루틴 하나를 선택해 운동을 시작해 보세요.':'이 주에 적용한 운동 계획이 없어요.'}</span>
    {current&&<Link href="/routines" className="btn btn-primary btn-sm">내 루틴 보기 <ArrowRight size={14}/></Link>}
   </div>}
   {hasPlan&&<div className="planner-details">
    <div className="planner-detail-header">
     <div><strong>{fmtDate(selected.date)} · {weekdays[selected.weekday]}요일</strong><span className={'planner-status is-'+selected.status}>{stateNames[selected.status]}</span></div>
     <div className="button-row">
      {current&&plan&&<Link href={'/planner/edit?date='+selected.date} className="btn btn-outline btn-sm"><PenLine size={14}/>이번 주만 수정</Link>}
      {compact&&<Link href="/planner" className="text-link">전체 플래너 <ArrowRight size={14}/></Link>}
     </div>
    </div>
    {selected.slots.length?selected.slots.map((slot,i)=><div key={i} className="planner-detail-row">
     <div className="planner-detail-name">
      <strong>{slot.routineTitle}</strong>
      <span>{slot.exerciseCount}개 운동 · {slot.completedSets}/{slot.targetSets}세트 · <b className={'planner-slot-status is-'+slot.status}>{slotNames[slot.status]}</b></span>
     </div>
     {slot.status==='done'?<Link href="/workouts" className="btn btn-ghost btn-sm">기록 보기 <ArrowRight size={14}/></Link>:
      slot.status==='upcoming'?<span className="tag gray">예정</span>:
      <Link className="btn btn-primary btn-sm" href={'/workouts/new?routine='+encodeURIComponent(slot.routineId||'')+'&date='+selected.date+'&plan=1'}>
       <Plus size={14}/>운동 시작
      </Link>}
    </div>):
     <div className="planner-rest-message">
      {selected.recordedCount>0?'계획 없이 별도로 운동한 날짜예요. 자유 운동은 계획 달성률에 포함되지 않아요.':'이날은 휴식일이에요. 이번 주에만 운동을 추가할 수도 있어요.'}
     </div>}
   </div>}
   {!compact&&<p className="planner-note">계획한 종목의 실제 수행 세트만 달성률에 포함돼요. 일부 수행은 일부 완료로 표시하고, 계획 없는 자유 운동은 별도 기록으로 남습니다. 이전 주 계획은 저장된 당시 구성으로 유지됩니다.</p>}
  </>}
 </section>;
}
