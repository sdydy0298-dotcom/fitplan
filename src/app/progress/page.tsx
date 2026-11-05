'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,BarChart3,ChartNoAxesCombined,CalendarDays,TrendingUp,Dumbbell} from 'lucide-react';
import Protected from '@/components/Protected';
import PageHeading from '@/components/PageHeading';
import {useExerciseLibrary} from '@/lib/custom-exercises';
import {loadWorkouts} from '@/lib/data';
import {browserDb} from '@/lib/supabase';
import {weeklyTrend,weightHistory,exerciseIds} from '@/lib/analytics';
import type {SavedWeekPlan,PlanVersion} from '@/lib/weekly-plan';
import type {Workout} from '@/lib/types';
import {dateISO,fmtDate} from '@/lib/format';
import styles from './progress.module.css';

type PlotPoint={label:string;value:number|null};
function Graph({points,kind,limit,unit,ariaLabel}:{points:PlotPoint[];kind:'line'|'bar';limit?:number;unit:string;ariaLabel:string}){
 const values=points.map(p=>p.value).filter((v):v is number=>v!==null&&Number.isFinite(v));
 if(!values.length)return <div className={styles.noChart}>이 기간에 비교할 기록이 없어요.</div>;
 const width=760,height=225,left=43,right=20,top=20,bottom=36;
 const iw=width-left-right,ih=height-top-bottom;
 const ceiling=Math.max(limit||0,Math.ceil(Math.max(...values,1)*1.2));
 const x=(i:number)=>left+(points.length===1?iw/2:iw*i/(points.length-1));
 const y=(v:number)=>top+(1-v/ceiling)*ih;
 const path=points.map((point,i)=>{
  if(point.value===null)return '';
  const prev=i===0||points[i-1].value===null?'M':'L';
  return prev+' '+x(i).toFixed(2)+' '+y(point.value).toFixed(2);
 }).filter(Boolean).join(' ');
 const lines=[0,1,2,3,4];
 return <div className={styles.plotWrap}>
  <svg className={styles.plot} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} preserveAspectRatio="xMidYMid meet">
   {lines.map(step=><g key={step}>
    <line x1={left} x2={width-right} y1={top+step*ih/4} y2={top+step*ih/4} stroke="#e8efea" strokeDasharray="3 5"/>
    <text x={left-9} y={top+step*ih/4+4} fontSize="11" fill="#8a9f91" textAnchor="end">{Math.round(ceiling*(4-step)/4)}</text>
   </g>)}
   {kind==='line'&&<path d={path} stroke="#689b4e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>}
   {points.map((p,i)=>p.value===null?null:
    kind==='bar'?<rect key={i} x={x(i)-Math.max(5,iw/Math.max(points.length,4)/2.7)} y={y(p.value)}
     width={Math.max(10,Math.min(32,iw/Math.max(points.length,4)/1.4))} height={Math.max(0,top+ih-y(p.value))}
     rx="5" fill="#9bcc7a"><title>{p.label} · {p.value}{unit}</title></rect>:
    <circle key={i} cx={x(i)} cy={y(p.value)} r="4.5" fill="#fff" stroke="#689b4e" strokeWidth="2.5">
     <title>{p.label} · {p.value}{unit}</title>
    </circle>)}
   {points.map((p,i)=>{
    const step=Math.max(1,Math.ceil(points.length/6));
    if(i%step!==0&&i!==points.length-1)return null;
    return <text key={i} x={x(i)} y={height-12} fontSize="11" fill="#859b8d" textAnchor="middle">{p.label}</text>;
   })}
  </svg>
 </div>;
}
function ProgressContent(){
 const {nameOf}=useExerciseLibrary();
 const [items,setItems]=useState<Workout[]>([]);
 const [plans,setPlans]=useState<SavedWeekPlan[]>([]);
 const [versions,setVersions]=useState<PlanVersion[]>([]);
 const [period,setPeriod]=useState(12);
 const [exercise,setExercise]=useState('');
 const [busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let live=true;
  Promise.all([
   loadWorkouts(),
   browserDb().from('weekly_plans').select('*').order('week_start',{ascending:false}).limit(150),
   browserDb().from('plan_versions').select('*').order('effective_week',{ascending:false}).limit(180)
  ]).then(([workouts,weekRes,versionRes])=>{
   if(!live)return;
   if(weekRes.error)throw weekRes.error;
   if(versionRes.error)throw versionRes.error;
   setItems(workouts);setPlans((weekRes.data||[]) as SavedWeekPlan[]);
   setVersions((versionRes.data||[]) as PlanVersion[]);
  }).catch(e=>{if(live)setError(e instanceof Error?e.message:'운동 기록을 불러올 수 없습니다.');})
   .finally(()=>{if(live)setBusy(false);});
  return ()=>{live=false;};
 },[]);
 const ids=useMemo(()=>exerciseIds(items),[items]);
 const selected=ids.includes(exercise)?exercise:ids[0]||'';
 const trends=useMemo(()=>weeklyTrend(items,plans,versions,period,dateISO()),
  [items,plans,versions,period]);
 const history=useMemo(()=>selected?weightHistory(items,selected,trends[0]?.week):[],
  [items,selected,trends]);
 const groups=useMemo(()=>ids.map(id=>({id,records:weightHistory(items,id)})),[ids,items]);
 const totalSets=items.reduce((sum,w)=>sum+w.workout_entries.reduce((n,e)=>n+e.workout_sets.length,0),0);
 const days=new Set(items.map(w=>w.performed_at)).size;
 const plannedWeeks=trends.filter(w=>w.adherence!==null);
 const avgPercent=plannedWeeks.length?Math.round(plannedWeeks.reduce((n,w)=>n+(w.adherence||0),0)/plannedWeeks.length):null;
 const points=trends.map(t=>({label:t.label,value:t.sets}));
 const pctPoints=trends.map(t=>({label:t.label,value:t.adherence}));
 const weightPoints=history.map(x=>({label:x.date.slice(5).replace('-','/'),value:x.best}));
 return <div className="app-page">
  <PageHeading eyebrow="WORKOUT ANALYTICS" title="나의 운동 성장 분석"
   description="실제로 기록한 세트와 최고 중량, 주간 계획 달성률을 기간별로 비교해요.">
   <Link href="/calendar" className="btn btn-outline"><CalendarDays size={16}/>월간 캘린더</Link>
   <Link href="/workouts/new" className="btn btn-primary">운동 기록하기<ArrowRight size={15}/></Link>
  </PageHeading>
  {error&&<div className="error-message" role="alert">{error}</div>}
  {busy?<div className="state-card">성장 기록을 불러오는 중…</div>:<>
   <div className={styles.toolbar}>
    <div><strong>분석 기간</strong><span>주별 통계는 실제 운동 기록과 당시 주간 계획을 기준으로 해요.</span></div>
    <div className={styles.periods} role="group" aria-label="분석 기간">
     {[[4,'최근 4주'],[12,'최근 12주'],[24,'최근 24주']].map(([count,label])=>
      <button key={count} type="button" className={period===count?styles.active:''}
       aria-pressed={period===count} onClick={()=>setPeriod(Number(count))}>{label}</button>)}
    </div>
   </div>
   <div className={styles.stats}>
    <div><span><Dumbbell size={15}/>누적 수행 세트</span><strong>{totalSets}<small>세트</small></strong></div>
    <div><span><CalendarDays size={15}/>누적 운동일</span><strong>{days}<small>일</small></strong></div>
    <div><span><TrendingUp size={15}/>기간 내 주간 평균 달성률</span>
     <strong>{avgPercent===null?'—':avgPercent}<small>{avgPercent===null?'기록 없음':'%'}</small></strong></div>
   </div>
   <div className={styles.charts}>
    <section className={styles.chartCard}>
     <div className={styles.chartHeader}><span className="eyebrow">TRAINING VOLUME</span><h2>주간 수행 세트</h2>
      <p>한 주에 실제로 완료한 세트 수를 비교합니다.</p></div>
     <Graph kind="bar" points={points} unit="세트" ariaLabel="주간 수행 세트 수 막대 그래프"/>
    </section>
    <section className={styles.chartCard}>
     <div className={styles.chartHeader}><span className="eyebrow">WEEKLY ADHERENCE</span><h2>주간 계획 달성률</h2>
      <p>목표 세트 대비 수행 세트의 비율이며, 계획이 없었던 주는 계산에서 제외해요.</p></div>
     <Graph kind="line" points={pctPoints} limit={100} unit="%" ariaLabel="주별 세트 달성률 선 그래프"/>
    </section>
   </div>
   <section className={styles.chartCard}>
    <div className={styles.weightHeader}>
     <div className={styles.chartHeader}><span className="eyebrow">STRENGTH PROGRESS</span><h2>종목별 최고 중량 변화</h2>
      <p>날짜별 실제 기록 중 가장 높은 중량을 비교해요.</p></div>
     <label className={styles.selectLabel}>운동 종목
      <select value={selected} onChange={e=>setExercise(e.target.value)} disabled={!ids.length}>
       {ids.length?ids.map(id=><option value={id} key={id}>{nameOf(id)}</option>):<option value="">기록된 종목 없음</option>}
      </select>
     </label>
    </div>
    <Graph kind="line" points={weightPoints} unit="kg" ariaLabel={nameOf(selected)+' 날짜별 최고 중량 그래프'}/>
    <p className={styles.note}>체중 운동 등 중량을 0kg으로 기록한 종목은 0kg으로 표시돼요. 최고 중량만으로 운동 능력을 평가하지 않습니다.</p>
   </section>
   <section className={styles.chartCard}>
    <div className={styles.chartHeader}><h2>종목별 최근 기록 비교</h2>
     <p>같은 날짜의 여러 운동 기록은 합산하고, 서로 다른 날짜의 최고 중량을 비교해요.</p></div>
    {groups.length?<div className={styles.tableScroll}><table className="progress-table"><thead><tr>
     <th>운동 종목</th><th>최근 날짜</th><th>최근 최고</th><th>이전 최고</th><th>변화</th>
    </tr></thead><tbody>{groups.map(g=>{
     const current=g.records[g.records.length-1],previous=g.records[g.records.length-2];
     const diff=previous?current.best-previous.best:null;
     return <tr key={g.id}><td><strong>{nameOf(g.id)}</strong><br/><span className="tiny muted">최근 {current.sets}세트 · {current.reps}회</span></td>
      <td>{fmtDate(current.date)}</td><td>{current.best}kg</td><td>{previous?previous.best+'kg':'—'}</td>
      <td><span className={'tag '+(diff!==null&&diff>0?'green':'')}>{diff===null?'—':(diff>0?'+':'')+diff.toFixed(1)+'kg'}</span></td>
     </tr>;
    })}</tbody></table></div>:<div className={styles.noChart}><ChartNoAxesCombined size={24}/>아직 운동 기록이 없어요. 운동을 저장하면 그래프가 만들어져요.</div>}
   </section>
  </>}
 </div>;
}
export default function ProgressPage(){return <Protected><ProgressContent/></Protected>}
