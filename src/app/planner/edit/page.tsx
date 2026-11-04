'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowDown,ArrowLeft,ArrowUp,Plus,Save,Trash2} from 'lucide-react';
import Protected from '@/components/Protected';
import PageHeading from '@/components/PageHeading';
import {getWeekPlan,saveThisWeek} from '@/lib/weekly-plan';
import type {PlanDay,PlanItem,SavedWeekPlan} from '@/lib/weekly-plan';
import {mondayOf} from '@/lib/planner';
import {dateISO,friendlyError} from '@/lib/format';
import {DAYS,EXERCISES} from '@/lib/exercises';
import {useExerciseLibrary,type NewCustomExercise,isCustomExercise} from '@/lib/custom-exercises';
import CustomExerciseForm from '@/components/CustomExerciseForm';

const freshItem=(exerciseId=EXERCISES[0].id):PlanItem=>({
 key:crypto.randomUUID(),exercise_id:exerciseId,target_sets:3,
 target_reps:10,target_weight:0,notes:''
});
function WeekEditContent(){
 const router=useRouter();
 const [week,setWeek]=useState<SavedWeekPlan|null>(null);
 const [days,setDays]=useState<PlanDay[]>([]);
 const [weekday,setWeekday]=useState(1);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [showCustomForm,setShowCustomForm]=useState(false);
 const {options,addCustom,catalogError}=useExerciseLibrary();
 useEffect(()=>{
  let live=true;
  const today=dateISO();
  const params=new URLSearchParams(window.location.search);
  const date=params.get('date')||today;
  const selected=/^\d{4}-\d{2}-\d{2}$/.test(date)&&mondayOf(date)===mondayOf(today)?date:today;
  setWeekday(new Date(selected+'T12:00:00').getDay());
  getWeekPlan(mondayOf(today),today)
   .then(w=>{
    if(!live)return;
    if(w){setWeek(w);setDays(w.days.map(day=>({...day,items:day.items.map(i=>({...i}))})));}
    else setError('시작한 루틴이 없습니다. 먼저 내 루틴을 선택해 주세요.');
   })
   .catch(e=>{if(live)setError(friendlyError(e));})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[]);
 const mutateDay=(fn:(arr:PlanItem[])=>PlanItem[])=>setDays(prev=>prev.map(d=>
  d.weekday===weekday?{...d,items:fn(d.items)}:d
 ));
 const changeItem=(key:string,patch:Partial<PlanItem>)=>
  mutateDay(items=>items.map(it=>it.key===key?{...it,...patch}:it));
 const reorder=(key:string,direction:-1|1)=>mutateDay(items=>{
  const original=items.findIndex(x=>x.key===key);
  const target=original+direction;
  if(original<0||target<0||target>=items.length)return items;
  const next=[...items];[next[original],next[target]]=[next[target],next[original]];
  return next;
 });
 const addCustomItem=async(info:NewCustomExercise)=>{
  const created=await addCustom(info);
  mutateDay(items=>[...items,freshItem(created.id)]);
  setShowCustomForm(false);
 };
 const save=async()=>{
  if(!week||saving)return;
  setSaving(true);setError('');
  try{
   await saveThisWeek(week,days);
   router.push('/planner');router.refresh();
  }catch(e){setError(friendlyError(e));}
  finally{setSaving(false);}
 };
 if(loading)return <div className="state-card">이번 주 계획을 불러오는 중…</div>;
 if(!week)return <div className="state-card"><h2>이번 주 계획을 수정할 수 없어요</h2><p>{error}</p><Link href="/planner" className="btn btn-primary">플래너로 돌아가기</Link></div>;
 const currentDay=days.find(day=>day.weekday===weekday);
 const scheduled=days.filter(d=>d.items.length).length;
 return <div className="app-page">
  <Link href="/planner" className="text-link"><ArrowLeft size={15}/>플래너로 돌아가기</Link>
  <div style={{height:20}}/>
  <PageHeading eyebrow="THIS WEEK ONLY" title="이번 주 운동만 수정"
   description={'기본 루틴: '+week.routine_title+' · 지금 수정한 내용은 이번 주에만 적용돼요. 다음 주에는 기본 루틴으로 돌아갑니다.'}/>
  <div className="notice" style={{marginBottom:20}}>
   <Save size={17}/><span>기본 루틴과 이미 저장한 운동 기록은 바뀌지 않아요. 운동을 추가·삭제하거나 순서를 변경한 뒤 이번 주 계획을 저장하세요.</span>
  </div>
  <div className="two-col editor-grid">
   <div className="form-stack">
    <section className="panel">
     <div className="panel-header"><h2>요일별 운동 계획</h2><span className="tag green">총 {scheduled}일 운동</span></div>
     <div className="weekday-tabs">{days.map(d=><button type="button" key={d.weekday}
      onClick={()=>setWeekday(d.weekday)} className={'weekday-tab '+(weekday===d.weekday?'current':'')}>
      <div>{DAYS[d.weekday]}</div><span style={{display:'block',fontSize:10,marginTop:3}}>{d.items.length?d.items.length+'개':'휴식'}</span>
     </button>)}</div>
     <div className="day-editor">
      <div className="panel-header"><h3>{DAYS[weekday]}요일 운동</h3>
       <button type="button" className="btn btn-primary btn-sm" disabled={(currentDay?.items.length||0)>=40}
        onClick={()=>mutateDay(items=>[...items,freshItem()])}><Plus size={15}/>운동 추가</button>
      </div>
      <div className="custom-exercise-tools"><button type="button" className="btn btn-outline btn-sm"
       onClick={()=>setShowCustomForm(x=>!x)}><Plus size={15}/>없는 운동 직접 등록</button>
       <span className="field-hint">직접 등록한 운동도 추가할 수 있어요.</span>
      </div>
      {showCustomForm&&<CustomExerciseForm onSave={addCustomItem} onCancel={()=>setShowCustomForm(false)}/>}
      {currentDay?.items.length?currentDay.items.map((item,i)=><div key={item.key} className="item-editor">
       <div className="item-head">
        <strong>운동 {i+1}</strong>
        <div className="button-row">
         <button className="icon-btn" type="button" aria-label="위로 이동" disabled={i===0}
          onClick={()=>reorder(item.key,-1)}><ArrowUp size={15}/></button>
         <button className="icon-btn" type="button" aria-label="아래로 이동" disabled={i===currentDay.items.length-1}
          onClick={()=>reorder(item.key,1)}><ArrowDown size={15}/></button>
         <button className="icon-btn" type="button" aria-label="운동 삭제"
          onClick={()=>mutateDay(items=>items.filter(x=>x.key!==item.key))}><Trash2 size={15}/></button>
        </div>
       </div>
       <label className="input-field" style={{marginTop:12}}>운동 종목
        <select value={item.exercise_id} onChange={e=>changeItem(item.key,{exercise_id:e.target.value})}>
         {options.map(x=><option key={x.id} value={x.id}>{x.name} · {x.muscle}{x.custom?' (직접 등록)':''}</option>)}
        </select>
       </label>
       <div className="mini-grid">
        <label className="input-field">목표 세트<input type="number" min="1" max="15"
         value={item.target_sets} onChange={e=>changeItem(item.key,{target_sets:Number(e.target.value)})}/></label>
        <label className="input-field">반복 횟수<input type="number" min="1" max="300"
         value={item.target_reps} onChange={e=>changeItem(item.key,{target_reps:Number(e.target.value)})}/></label>
        <label className="input-field">목표 kg<input type="number" min="0" max="2000" step=".5"
         value={item.target_weight} onChange={e=>changeItem(item.key,{target_weight:Number(e.target.value)})}/></label>
       </div>
       <input className="input" style={{marginTop:10}} maxLength={250} value={item.notes}
        onChange={e=>changeItem(item.key,{notes:e.target.value})} placeholder="메모 (선택)"/>
       {!isCustomExercise(item.exercise_id)&&<Link className="text-link"
        href={'/exercises/'+item.exercise_id} target="_blank" style={{marginTop:10}}>운동 가이드 보기</Link>}
      </div>):<div className="empty"><h3>현재는 휴식일이에요</h3><p>이번 주에만 운동을 추가할 수 있어요.</p></div>}
     </div>
    </section>
   </div>
   <aside className="form-stack">
    <section className="panel"><h2>이번 주 미리보기</h2>
     {days.map(d=><div className="list-row" key={d.weekday}>
      <strong className="small">{DAYS[d.weekday]}요일</strong>
      <span className="small muted">{d.items.length?d.items.length+'개 운동':'휴식'}</span>
     </div>)}
    </section>
    <div className="notice"><Save size={17}/><span>이 화면에서는 이번 주만 바뀌어요. 매주 반복될 기본 루틴은 '내 루틴 → 수정하기'에서 변경할 수 있어요.</span></div>
    {catalogError&&<div className="error-message">{catalogError}</div>}
    {error&&<div className="error-message" role="alert">{error}</div>}
    <button className="btn btn-primary btn-lg" type="button" onClick={save} disabled={saving}>
     <Save size={17}/>{saving?'저장 중…':'이번 주 계획 저장하기'}
    </button>
   </aside>
  </div>
 </div>;
}
export default function WeekEditPage(){return <Protected><WeekEditContent/></Protected>}
