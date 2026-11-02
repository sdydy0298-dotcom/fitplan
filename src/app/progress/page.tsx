'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,ChartNoAxesCombined,TrendingUp} from 'lucide-react';
import Protected from '@/components/Protected';
import {useExerciseLibrary} from '@/lib/custom-exercises';
import PageHeading from '@/components/PageHeading';
import {loadWorkouts,orderedItems} from '@/lib/data';
import type {Workout} from '@/lib/types';

import {fmtDate} from '@/lib/format';
type Point={date:string;best:number;sets:number;reps:number};
function Content(){
 const {nameOf}=useExerciseLibrary();
 const [items,setItems]=useState<Workout[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{loadWorkouts().then(setItems).catch(e=>setError(e.message)).finally(()=>setBusy(false));},[]);
 const groups=useMemo(()=>{const map=new Map<string,Point[]>();for(const w of items){for(const e of w.workout_entries??[]){const sets=e.workout_sets??[];if(!sets.length)continue;const a=map.get(e.exercise_id)||[];a.push({date:w.performed_at,best:Math.max(...sets.map(s=>Number(s.weight))),sets:sets.length,reps:sets.reduce((sum,s)=>sum+s.reps,0)});map.set(e.exercise_id,a);}}return [...map.entries()].map(([exercise_id,history])=>({exercise_id,history:history.sort((a,b)=>b.date.localeCompare(a.date))})).sort((a,b)=>a.exercise_id.localeCompare(b.exercise_id));},[items]);
 return <div className="app-page"><PageHeading eyebrow="PROGRESS REPORT" title="나의 진행 현황" description="숫자 하나보다 중요한 건 조금씩 이어온 기록이에요."><Link href="/workouts/new" className="btn btn-primary">운동 기록하기 <ArrowRight size={16}/></Link></PageHeading>{error&&<div className="error-message">{error}</div>}{busy?<p>기록을 불러오는 중…</p>:groups.length?<><div className="stats-grid"><div className="stat-card highlight"><span>누적 운동일</span><strong>{new Set(items.map(w=>w.performed_at)).size}</strong><small>운동을 기록한 서로 다른 날짜</small></div><div className="stat-card"><span>기록한 종목</span><strong>{groups.length}</strong><small>종목별 변화를 확인해요</small></div><div className="stat-card"><span>누적 세트</span><strong>{items.reduce((sum,w)=>sum+w.workout_entries.reduce((ss,e)=>ss+e.workout_sets.length,0),0)}</strong><small>실제로 기록한 세트</small></div></div><section className="panel"><div className="panel-header"><h2>종목별 최근 기록</h2><span className="tag green"><TrendingUp size={14}/>최신 vs 이전</span></div><div style={{overflowX:'auto'}}><table className="progress-table"><thead><tr><th>운동 종목</th><th>최근 날짜</th><th>최근 최고 중량</th><th>직전 최고 중량</th><th>변화</th></tr></thead><tbody>{groups.map(g=>{const latest=g.history[0],previous=g.history[1];const diff=previous?latest.best-previous.best:null;return <tr key={g.exercise_id}><td><strong>{nameOf(g.exercise_id)}</strong><br/><span className="tiny muted">최근 {latest.sets}세트 · 총 {latest.reps}회</span></td><td>{fmtDate(latest.date)}</td><td>{latest.best}kg</td><td>{previous?`${previous.best}kg`:'기록 없음'}</td><td><span className={'tag '+(diff!==null&&diff>0?'green':'')}>{diff===null?'—':`${diff>0?'+':''}${diff.toFixed(1)}kg`}</span></td></tr>})}</tbody></table></div><p className="field-hint" style={{marginTop:16}}>동일 종목의 최근 기록과 이전 기록에 있는 최고 중량을 비교합니다. 자세·반복 횟수 등 다른 요소를 고려한 운동 능력 평가가 아닙니다.</p></section></>:<div className="empty"><ChartNoAxesCombined size={30}/><h3>비교할 기록이 아직 없어요</h3><p>같은 운동을 두 번 이상 기록하면 최근 기록과 이전 기록을 비교할 수 있어요.</p><Link href="/workouts/new" className="btn btn-primary">운동 기록하기</Link></div>}</div>;
}
export default function Progress(){return <Protected><Content/></Protected>}
