'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ArrowRight,ClipboardList,Compass,Plus} from 'lucide-react';
import Protected from '@/components/Protected';
import PageHeading from '@/components/PageHeading';
import {loadRoutines} from '@/lib/data';
import type {Routine} from '@/lib/types';
export default function Routines(){return <Protected><RoutinesContent/></Protected>}
function RoutinesContent(){
 const [items,setItems]=useState<Routine[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{loadRoutines().then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 return <div className="app-page"><PageHeading eyebrow="MY ROUTINES" title="내 운동 루틴" description="요일별 운동을 구성하고 언제든 나에게 맞게 수정할 수 있어요."><Link href="/discover" className="btn btn-outline"><Compass size={16}/>공개 루틴 둘러보기</Link><Link href="/routines/new" className="btn btn-primary"><Plus size={17}/>새 루틴</Link></PageHeading>{error&&<div className="error-message">{error}</div>}{loading?<p className="muted">루틴을 불러오는 중…</p>:items.length?<div className="card-grid">{items.map(r=><Link href={`/routines/${r.id}`} className="routine-card" key={r.id}><div><span className="tag green"><ClipboardList size={13}/>MY ROUTINE</span><h3>{r.title}</h3><p>{r.description || '나만의 운동 루틴을 확인해 보세요.'}</p></div><div className="routine-card-footer"><span>{r.routine_days?.filter(d=>d.routine_items?.length).length??0}일 운동 · {r.routine_days?.reduce((sum,d)=>sum+(d.routine_items?.length??0),0)??0}개 종목</span><ArrowRight size={17}/></div></Link>)}</div>:<div className="empty"><ClipboardList size={32}/><h3>아직 저장한 루틴이 없어요</h3><p>요일별로 운동을 하나씩 배치하는 것부터 시작해 보세요.</p><Link className="btn btn-primary" href="/routines/new"><Plus size={17}/>첫 루틴 만들기</Link></div>}</div>;
}
