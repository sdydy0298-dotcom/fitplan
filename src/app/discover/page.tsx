'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {ArrowRight,BookOpen,CalendarDays,ClipboardCopy,Dumbbell,Search,Share2,ShieldCheck} from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import {DAYS} from '@/lib/exercises';
import styles from './discover.module.css';

type Listing={
 token:string;title:string;description:string;days:number;exercises:number;
 weekdays:number[];shared_at:string;
};
export default function DiscoverPage(){
 const [items,setItems]=useState<Listing[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[days,setDays]=useState('all'),[order,setOrder]=useState('new');
 const retry=()=>{
  setLoading(true);setError('');
  fetch('/api/discover',{cache:'no-store'})
   .then(async res=>{const data=await res.json();if(!res.ok)throw new Error(data.error||'공개 루틴을 불러올 수 없어요.');return data;})
   .then(data=>setItems(Array.isArray(data.items)?data.items:[]))
   .catch(e=>setError(e instanceof Error?e.message:'목록을 불러올 수 없습니다.'))
   .finally(()=>setLoading(false));
 };
 useEffect(()=>{retry();},[]);
 const visible=useMemo(()=>{
  let data=items.filter(item=>{
   const text=(item.title+' '+item.description).toLocaleLowerCase('ko-KR');
   const q=query.trim().toLocaleLowerCase('ko-KR');
   if(q&&!text.includes(q))return false;
   if(days==='2'&&item.days>2)return false;
   if(days==='3'&&item.days!==3)return false;
   if(days==='4'&&item.days<4)return false;
   return true;
  });
  if(order==='days')data=[...data].sort((a,b)=>b.days-a.days||b.shared_at.localeCompare(a.shared_at));
  else data=[...data].sort((a,b)=>b.shared_at.localeCompare(a.shared_at));
  return data;
 },[items,query,days,order]);
 return <div className="app-page">
  <PageHeading eyebrow="COMMUNITY ROUTINE LIBRARY" title="공개 루틴 둘러보기"
   description="다른 사람이 공개 탐색을 허용한 운동 루틴을 찾아보고, 마음에 드는 루틴을 내 계정으로 복사할 수 있어요.">
   <Link href="/routines" className="btn btn-outline"><Dumbbell size={16}/>내 루틴 관리</Link>
  </PageHeading>
  <section className={styles.intro}>
   <span className={styles.introIcon}><ShieldCheck size={22}/></span>
   <div><strong>공개는 작성자가 직접 결정해요.</strong>
    <p>공유 링크만 만든 루틴은 이 목록에 나오지 않아요. ‘공개 탐색 허용’을 켠 루틴의 운동 구성만 표시되며, 개인 운동 기록이나 이메일은 공개하지 않습니다.</p>
   </div>
  </section>
  <section className={styles.filters} aria-label="공개 루틴 검색 및 필터">
   <label className={styles.search}>
    <Search size={18}/>
    <input aria-label="공개 루틴 검색" value={query} onChange={e=>setQuery(e.target.value)}
     placeholder="루틴 이름이나 설명 검색"/>
   </label>
   <label className={styles.selectLabel}>운동 일수
    <select value={days} onChange={e=>setDays(e.target.value)} aria-label="운동 일수">
     <option value="all">전체</option><option value="2">주 1~2일</option>
     <option value="3">주 3일</option><option value="4">주 4일 이상</option>
    </select>
   </label>
   <label className={styles.selectLabel}>정렬
    <select value={order} onChange={e=>setOrder(e.target.value)} aria-label="정렬 순서">
     <option value="new">최근 공유순</option><option value="days">운동 일수 많은 순</option>
    </select>
   </label>
  </section>
  {error&&<div className="error-message" role="alert">{error} <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>다시 조회</button></div>}
  {loading?<div className={styles.empty}><Dumbbell size={27}/><h2>공개 루틴을 불러오는 중…</h2></div>:
   error?null:
   visible.length?<><div className={styles.summary}><strong>{visible.length}개 루틴</strong><span>원본을 수정하지 않고 내 루틴으로 복사할 수 있어요.</span></div>
    <div className={styles.list}>{visible.map(item=><article className={styles.card} key={item.token}>
     <div className={styles.cardTop}><span><Share2 size={14}/>공개 루틴</span><span>{item.days}일 운동</span></div>
     <h2>{item.title}</h2>
     <p>{item.description||'운동 목표와 요일별 종목을 확인해 보세요.'}</p>
     <div className={styles.days}>{item.weekdays.map(day=><span key={day}>{DAYS[day]}요일</span>)}</div>
     <div className={styles.cardBottom}>
      <div><strong>{item.exercises}</strong><small>개 운동 종목</small></div>
      <Link href={'/share/'+item.token} className="btn btn-primary btn-sm">구성 보기·내 루틴으로 복사 <ArrowRight size={14}/></Link>
     </div>
    </article>)}</div>
   </>:<div className={styles.empty}><span className={styles.emptyIcon}><BookOpen size={26}/></span>
    <h2>{items.length?'검색 조건에 맞는 루틴이 없어요.':'아직 공개 탐색을 허용한 루틴이 없어요.'}</h2>
    <p>{items.length?'검색어나 주간 운동 일수를 변경해 보세요.':
     '내 루틴에서 공유 링크를 만든 뒤 ‘공개 탐색 허용’을 선택하면 여기에 나타납니다. 기존 공유 링크는 자동 공개되지 않아요.'}</p>
    <Link href="/routines" className="btn btn-primary"><ClipboardCopy size={16}/>내 루틴에서 공개 설정하기</Link>
   </div>}
  <div className={styles.foot}><CalendarDays size={17}/>공개된 루틴을 복사해도 원본 작성자의 계획과 기록은 변경되지 않아요.</div>
 </div>;
}