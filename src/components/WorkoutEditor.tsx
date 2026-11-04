'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Dumbbell,Plus,Save,Trash2} from 'lucide-react';
import PageHeading from './PageHeading';
import Protected from './Protected';
import {loadRoutines,loadWorkout,orderedDays,orderedItems} from '@/lib/data';
import {browserDb} from '@/lib/supabase';
import {DAYS,EXERCISES} from '@/lib/exercises';
import {useExerciseLibrary,isCustomExercise,type NewCustomExercise} from '@/lib/custom-exercises';
import CustomExerciseForm from '@/components/CustomExerciseForm';
import {dateISO,friendlyError} from '@/lib/format';
import {getWeekPlan} from '@/lib/weekly-plan';
import {mondayOf} from '@/lib/planner';
import type {Routine} from '@/lib/types';
type LogSet={key:string;reps:number;weight:number;done:boolean};
type LogEntry={key:string;exercise_id:string;sets:LogSet[]};
const key=()=>Math.random().toString(36).slice(2)+Date.now();
const setItem=(reps=10,weight=0,done=false):LogSet=>({key:key(),reps,weight,done});
const entry=(exercise_id=EXERCISES[0].id,sets=3,reps=10,weight=0):LogEntry=>({key:key(),exercise_id,sets:Array.from({length:sets},()=>setItem(reps,weight))});
function Content({editId}:{editId?:string}){
 const router=useRouter(),[date,setDate]=useState(dateISO()),[notes,setNotes]=useState(''),[routines,setRoutines]=useState<Routine[]>([]),[routineId,setRoutineId]=useState(''),[selectedDay,setSelectedDay]=useState(1),[entries,setEntries]=useState<LogEntry[]>([]),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;Promise.all([loadRoutines(),editId?loadWorkout(editId):Promise.resolve(null)]).then(async ([rs,w])=>{
  if(!active)return;setRoutines(rs);
  if(w){setDate(w.performed_at);setNotes(w.notes||'');setRoutineId(w.routine_id||'');setEntries(orderedItems(w.workout_entries||[]).map(e=>({key:key(),exercise_id:e.exercise_id,sets:[...(e.workout_sets||[])].sort((a,b)=>a.set_no-b.set_no).map(s=>setItem(s.reps,Number(s.weight),true))})));}
  else if(editId){setError('운동 기록을 찾을 수 없어요.');}
  else{
   const params=new URLSearchParams(window.location.search);
   const requestedDate=params.get('date')||'';
   const chosenDate=/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)&&
    dateISO(new Date(requestedDate+'T12:00:00'))===requestedDate?requestedDate:dateISO();
   setDate(chosenDate);
   const dayIndex=new Date(chosenDate+'T12:00:00').getDay();
   setSelectedDay(dayIndex);
   const id=params.get('routine');
   const selectedRoutine=rs.find(r=>r.id===id);
   if(selectedRoutine){
    setRoutineId(selectedRoutine.id);
    if(requestedDate===chosenDate){
     let loaded=false;
     if(params.get('plan')==='1'){
      const weekly=await getWeekPlan(mondayOf(chosenDate));
      if(!active)return;
      const target=weekly?.routine_id===selectedRoutine.id
       ?weekly.days.find(day=>day.weekday===dayIndex):null;
      if(target){
       setEntries(target.items.map(it=>entry(it.exercise_id,it.target_sets,it.target_reps,Number(it.target_weight))));
       loaded=true;
      }
     }
     if(!loaded){
      const day=orderedDays(selectedRoutine).find(d=>d.weekday===dayIndex&&(d.routine_items||[]).length>0);
      if(day)setEntries(orderedItems(day.routine_items).map(it=>
       entry(it.exercise_id,it.target_sets,it.target_reps,Number(it.target_weight))));
     }
    }
   }
  }
 }).catch(e=>setError(e.message)).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[editId]);
 const {options,nameOf,addCustom,catalogError}=useExerciseLibrary();
 const [showCustomForm,setShowCustomForm]=useState(false);
 const routine=routines.find(r=>r.id===routineId);const days=routine?orderedDays(routine).filter(d=>d.routine_items?.length):[];
 const fromRoutine=async()=>{
  if(!routine)return;
  setError('');
  try{
   const weekly=await getWeekPlan(mondayOf(date));
   const picked=weekly?.routine_id===routine.id?weekly.days.find(d=>d.weekday===selectedDay):null;
   if(picked){
    setEntries(picked.items.map(it=>entry(it.exercise_id,it.target_sets,it.target_reps,Number(it.target_weight))));
    return;
   }
   const day=days.find(d=>d.weekday===selectedDay)||days[0];
   if(!day)throw new Error('선택한 루틴에 운동이 없어요.');
   setEntries(orderedItems(day.routine_items).map(it=>entry(it.exercise_id,it.target_sets,it.target_reps,Number(it.target_weight))));
  }catch(e){setError(friendlyError(e));}
 };
 const updateEntry=(ek:string,patch:Partial<LogEntry>)=>setEntries(prev=>prev.map(e=>e.key===ek?{...e,...patch}:e));
 const updateSet=(ek:string,sk:string,patch:Partial<LogSet>)=>setEntries(prev=>
  prev.map(e=>e.key===ek?{...e,sets:e.sets.map(s=>s.key===sk?{
   ...s,...patch,
   done:patch.done!==undefined?patch.done:true
  }:s)}:e));
 const addNewCustom=async(input:NewCustomExercise)=>{const created=await addCustom(input);setEntries(prev=>[...prev,entry(created.id)]);setShowCustomForm(false);};
 const save=async()=>{
  setError('');
  if(!date)return setError('운동 날짜를 선택해 주세요.');
  if(date>dateISO())return setError('미래 날짜의 운동 기록은 저장할 수 없습니다.');
  const performed=entries.map(e=>({
   exercise_id:e.exercise_id,
   sets:e.sets.filter(s=>s.done).map(s=>({reps:s.reps,weight:s.weight}))
  })).filter(e=>e.sets.length);
  if(!performed.length)return setError('실제로 수행한 세트의 완료 체크를 해 주세요.');
  if(performed.some(e=>e.sets.some(s=>!Number.isInteger(s.reps)||s.reps<1||s.reps>300||!Number.isFinite(s.weight)||s.weight<0||s.weight>2000)))return setError('완료한 세트의 실제 횟수와 중량을 확인해 주세요.');
  setBusy(true);
  try{
   const {error}=await browserDb().rpc('save_workout',{
    p_id:editId||null,p_date:date,p_routine_id:routineId||null,
    p_notes:notes,p_entries:performed
   });
   if(error)throw error;
   const fromPlan=!editId&&new URLSearchParams(window.location.search).get('plan')==='1';
   router.push(fromPlan?'/planner':'/workouts');router.refresh();
  }catch(e){setError(friendlyError(e));}finally{setBusy(false);}
 };
 if(loading)return <div className="state-card">운동 정보를 불러오는 중…</div>;
 return <div className="app-page"><Link href="/workouts" className="text-link"><ArrowLeft size={15}/>운동 기록으로 돌아가기</Link><div style={{height:20}}/><PageHeading eyebrow="WORKOUT TRACKER" title={editId?'운동 기록 수정':'오늘의 운동 기록'} description="계획한 세트 중 실제로 수행한 세트만 완료 체크해 주세요. 체크한 세트만 기록에 저장됩니다."/><div className="two-col"><div className="form-stack"><section className="panel form-stack"><h2>운동 정보</h2><div className="field-grid"><label className="input-field">운동 날짜<input type="date" max={dateISO()} value={date} onChange={e=>{setDate(e.target.value);if(e.target.value)setSelectedDay(new Date(e.target.value+'T12:00:00').getDay());if(!editId)setEntries([]);}}/></label><label className="input-field">불러올 루틴<select value={routineId} onChange={e=>{setRoutineId(e.target.value);setSelectedDay(new Date(date+'T12:00:00').getDay());if(!editId)setEntries([]);}}><option value="">루틴 없이 자유롭게 기록</option>{routines.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}</select></label></div>{routine&&days.length>0&&<div className="form-stack"><label className="input-field">루틴의 운동 요일<select value={days.some(d=>d.weekday===selectedDay)?selectedDay:days[0].weekday} onChange={e=>setSelectedDay(Number(e.target.value))}>{days.map(d=><option value={d.weekday} key={d.id}>{DAYS[d.weekday]}요일</option>)}</select></label><button className="btn btn-ghost" onClick={fromRoutine} type="button">선택한 요일의 목표 불러오기 <ArrowRight size={16}/></button><p className="field-hint">기본 계획 또는 이번 주 수정 계획을 불러옵니다. 실제로 수행한 세트만 체크해 저장해 주세요.</p></div>}<label className="input-field">운동 메모 (선택)<textarea value={notes} maxLength={500} onChange={e=>setNotes(e.target.value)} placeholder="오늘 컨디션, 느낀 점 등"/></label></section><section className="panel"><div className="panel-header"><h2>실제 수행한 운동</h2><button className="btn btn-ghost btn-sm" type="button" onClick={()=>setEntries(prev=>[...prev,entry()])}><Plus size={15}/>운동 추가</button></div><div className="custom-exercise-tools"><button type="button" className="btn btn-outline btn-sm" onClick={()=>setShowCustomForm(v=>!v)}><Plus size={15}/>목록에 없는 운동 직접 등록</button><span className="field-hint">내 운동으로 저장하고 바로 기록할 수 있어요.</span></div>{showCustomForm&&<CustomExerciseForm onSave={addNewCustom} onCancel={()=>setShowCustomForm(false)}/>} {entries.length?entries.map((e,i)=><div className="workout-entry" key={e.key}><div className="panel-header"><h3>운동 {i+1}</h3><button className="icon-btn" aria-label="운동 제거" onClick={()=>setEntries(prev=>prev.filter(x=>x.key!==e.key))}><Trash2 size={15}/></button></div><label className="input-field">운동 종목<select value={e.exercise_id} onChange={event=>updateEntry(e.key,{exercise_id:event.target.value})}>{options.map(x=><option value={x.id} key={x.id}>{x.name}{x.custom?' (직접 등록)':''}</option>)}</select></label><div className="set-row"><span>세트</span><span className="field-hint">완료</span><span className="field-hint">실제 횟수</span><span className="field-hint">실제 중량(kg)</span><span/></div>{e.sets.map((s,j)=><div className="set-row" key={s.key}><span>{j+1}</span><label className="set-done-check" aria-label={`${i+1}번 운동 ${j+1}세트 완료 여부`}><input type="checkbox" checked={s.done} onChange={event=>updateSet(e.key,s.key,{done:event.target.checked})}/></label><input className="input" type="number" min="1" max="300" value={s.reps} onChange={event=>updateSet(e.key,s.key,{reps:Number(event.target.value)})} aria-label={`${i+1}번 운동 ${j+1}세트 횟수`}/><input className="input" type="number" min="0" max="2000" step="0.5" value={s.weight} onChange={event=>updateSet(e.key,s.key,{weight:Number(event.target.value)})} aria-label={`${i+1}번 운동 ${j+1}세트 중량`}/><button className="icon-btn" aria-label="세트 제거" disabled={e.sets.length===1} onClick={()=>updateEntry(e.key,{sets:e.sets.filter(x=>x.key!==s.key)})}><Trash2 size={14}/></button></div>)}<div className="button-row" style={{marginTop:11}}><button className="btn btn-ghost btn-sm" onClick={()=>updateEntry(e.key,{sets:[...e.sets,setItem()]})} disabled={e.sets.length>=20}><Plus size={14}/>세트 추가</button>{!isCustomExercise(e.exercise_id)?<Link href={`/exercises/${e.exercise_id}`} className="text-link" target="_blank">운동 가이드 <ArrowRight size={13}/></Link>:<span className="field-hint">직접 등록한 운동 · 가이드 없음</span>}</div></div>):<div className="empty"><Dumbbell size={26}/><h3>운동이 비어 있어요</h3><p>직접 운동을 추가하거나 내 루틴에서 불러와 보세요.</p></div>}</section></div><aside className="form-stack"><section className="panel"><h2>기록 미리보기</h2><div className="stat-card highlight" style={{marginBottom:13}}><span>총 운동 세트</span><strong>{entries.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0)}</strong><small>{entries.length}개 운동</small></div>{entries.map((e,i)=><div key={e.key} className="list-row"><span className="small">{nameOf(e.exercise_id)}</span><span className="tag">{e.sets.filter(s=>s.done).length}/{e.sets.length}세트 완료</span></div>)}</section><div className="notice"><Save size={17}/>완료 체크한 세트만 저장돼요. 계획만 불러온 세트는 자동으로 완료 처리되지 않으며, 기본 루틴은 바뀌지 않습니다.</div>{catalogError&&<div className="error-message" role="alert">{catalogError}</div>}{error&&<div className="error-message" role="alert">{error}</div>}<button disabled={busy} className="btn btn-primary btn-lg" onClick={save}><Save size={17}/>{busy?'저장 중…':'운동 기록 저장하기'}</button></aside></div></div>;
}
export default function WorkoutEditor({editId}:{editId?:string}){return <Protected><Content editId={editId}/></Protected>}
