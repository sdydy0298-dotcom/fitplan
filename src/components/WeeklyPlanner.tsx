'use client';
import {useMemo,useState,useEffect} from 'react';
import Link from 'next/link';
import {ArrowRight,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Dumbbell,Minus,Plus,XCircle} from 'lucide-react';
import type {Routine,Workout} from '@/lib/types';
import {calculatePlannerWeek} from '@/lib/planner';
import {dateISO,fmtDate} from '@/lib/format';

const weekdayLabels=['일','월','화','수','목','금','토'];
const statusNames={
 done:'운동 완료',
 partial:'일부 완료',
 missed:'미기록',
 today:'기록 대기',
 upcoming:'예정',
 rest:'휴식',
 extra:'자유 운동'
};
const slotNames={done:'완료',missed:'미기록',today:'기록 대기',upcoming:'예정'};

export default function WeeklyPlanner({
 routines,workouts,compact=false
}:{routines:Routine[];workouts:Workout[];compact?:boolean}){
 const [today,setToday]=useState('');
 const [offset,setOffset]=useState(0);
 const [chosenDate,setChosenDate]=useState('');
 useEffect(()=>{setToday(dateISO());},[]);
 const week=useMemo(
  ()=>today?calculatePlannerWeek(routines,workouts,today,offset):null,
  [routines,workouts,today,offset]
 );
 if(!week){
  return <section className="panel planner-panel"><h2>주간 운동 플래너</h2><p className="small">이번 주 계획을 불러오는 중…</p></section>;
 }
 const selected=week.days.find(day=>day.date===chosenDate)
  ??week.days.find(day=>day.date===today)??week.days[0];
 const title=week.start.slice(5).replace('-','.')+' ~ '+week.end.slice(5).replace('-','.');
 const hasPlan=week.planned>0;
 return <section className={'panel planner-panel'+(compact?' planner-compact':'')} aria-label="주간 운동 달성 플래너">
  <div className="planner-header">
   <div>
    <span className="eyebrow">WEEKLY TRAINING PLANNER</span>
    <h2>이번 주, 계획대로 운동했나요?</h2>
    <p className="small">저장한 운동 기록을 기준으로 완료 여부를 자동 표시합니다.</p>
   </div>
   <div className="planner-navigation">
    <button className="icon-btn" type="button" onClick={()=>{setOffset(v=>Math.max(-52,v-1));setChosenDate('');}} disabled={offset<=-52} aria-label="이전 주"><ChevronLeft size={18}/></button>
    <strong aria-live="polite">{title}</strong>
    <button className="icon-btn" type="button" onClick={()=>{setOffset(v=>Math.min(0,v+1));setChosenDate('');}} disabled={offset===0} aria-label="다음 주"><ChevronRight size={18}/></button>
    {offset!==0&&<button type="button" className="btn btn-ghost btn-sm" onClick={()=>{setOffset(0);setChosenDate('');}}>이번 주</button>}
   </div>
  </div>
  <div className="planner-overview">
   <div className="planner-ring" style={{background:'conic-gradient(#a8d86a '+week.percentage+'%,#e8eeea 0)'}}>
    <div className="planner-ring-inner">
     <strong>{week.percentage}%</strong>
     <span>{hasPlan?'주간 달성률':'계획 없음'}</span>
    </div>
   </div>
   <div className="planner-summary">
    <div className="planner-progress-top"><strong>{week.completed} / {week.planned}회 완료</strong><span>이번 주 전체 계획 기준</span></div>
    <div className="planner-progress-track" role="progressbar" aria-label="주간 운동 달성률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={week.percentage}>
     <span style={{width:week.percentage+'%'}}/>
    </div>
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
    onClick={()=>setChosenDate(day.date)}
    aria-pressed={selected.date===day.date}
    aria-label={fmtDate(day.date)+' '+statusNames[day.status]}>
    <span className="planner-weekday">{weekdayLabels[day.weekday]}</span>
    <strong>{Number(day.date.slice(-2))}</strong>
    <span className="planner-day-icon">
     {day.status==='done'?<CheckCircle2 size={17}/>:
      day.status==='missed'?<XCircle size={17}/>:
      day.status==='partial'?<CheckCircle2 size={17}/>:
      day.status==='today'?<Clock3 size={17}/>:
      day.status==='upcoming'?<Clock3 size={17}/>:
      day.status==='extra'?<Dumbbell size={17}/>:<Minus size={17}/>}
    </span>
    <span className="planner-day-label">{statusNames[day.status]}</span>
   </button>)}
  </div>:<div className="planner-empty">
   <Dumbbell size={20}/>
   <span>운동 루틴에 요일별 종목을 등록하면 주간 달성률이 자동으로 계산돼요.</span>
   <Link href="/routines/new" className="btn btn-primary btn-sm">루틴 만들기 <ArrowRight size={14}/></Link>
  </div>}
  {hasPlan&&<div className="planner-details">
   <div className="planner-detail-header">
    <div><strong>{fmtDate(selected.date)} · {weekdayLabels[selected.weekday]}요일</strong>
     <span className={'planner-status is-'+selected.status}>{statusNames[selected.status]}</span>
    </div>
    {compact&&<Link href="/planner" className="text-link">전체 플래너 <ArrowRight size={14}/></Link>}
   </div>
   {selected.slots.length?selected.slots.map(slot=><div key={slot.routineId} className="planner-detail-row">
    <div className="planner-detail-name">
     <Link href={'/routines/'+slot.routineId}>{slot.routineTitle}</Link>
     <span>{slot.exerciseCount}개 운동 · <b className={'planner-slot-status is-'+slot.status}>{slotNames[slot.status]}</b></span>
    </div>
    {slot.status==='done'?<Link href="/workouts" className="btn btn-ghost btn-sm">기록 보기 <ArrowRight size={14}/></Link>:
     slot.status==='upcoming'?<span className="tag gray">예정</span>:
     <Link className="btn btn-primary btn-sm" href={'/workouts/new?routine='+encodeURIComponent(slot.routineId)+'&date='+selected.date}>
      <Plus size={14}/>운동 기록
     </Link>}
   </div>):
   <div className="planner-rest-message">
    {selected.recordedCount>0?'이날은 계획 없이 운동을 기록했어요. 자유 운동은 주간 계획 달성률에 포함되지 않아요.':'이날 계획된 운동이 없어요. 휴식일로 표시합니다.'}
   </div>}
  </div>}
  {!compact&&<p className="planner-note">
   운동 계획과 날짜가 일치하는 실제 저장 기록만 완료로 계산합니다. 운동을 하지 않은 과거 날짜는 미기록으로 표시해요.
   자유 운동은 별도로 표시하고, 루틴 변경 시 과거 주간 계획도 현재 설정을 기준으로 다시 계산될 수 있습니다.
  </p>}
 </section>;
}
