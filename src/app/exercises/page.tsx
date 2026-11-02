'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowRight,BookOpen,ChevronRight,Search} from 'lucide-react';
import PageHeading from '@/components/PageHeading';
import ExerciseIllustration from '@/components/ExerciseIllustration';
import {EXERCISES,MUSCLES} from '@/lib/exercises';
export default function ExerciseList(){
 const [filter,setFilter]=useState('전체'),[query,setQuery]=useState('');
 const list=useMemo(()=>EXERCISES.filter(e=>(filter==='전체'||e.muscle===filter)&&`${e.name} ${e.english} ${e.equipment}`.toLowerCase().includes(query.trim().toLowerCase())),[filter,query]);
 return <div className="app-page"><PageHeading eyebrow="EXERCISE LIBRARY" title="운동 가이드" description="어떤 운동을 해야 할지 모르겠다면, 기본 동작부터 차근차근 살펴보세요."><span className="tag green"><BookOpen size={14}/>{EXERCISES.length}개 기본 가이드</span></PageHeading><div className="filter-bar"><div className="filter-buttons">{MUSCLES.map(m=><button key={m} className={'filter-button '+(filter===m?'selected':'')} onClick={()=>setFilter(m)}>{m}</button>)}</div><div className="search-field" style={{marginLeft:'auto'}}><Search size={17}/><input className="input" placeholder="운동 이름 또는 기구 검색" value={query} onChange={e=>setQuery(e.target.value)} aria-label="운동 검색"/></div></div>{list.length?<div className="card-grid exercise-library-grid">{list.map((e,i)=><Link href={`/exercises/${e.id}`} key={e.id} className="exercise-card panel"><div className="exercise-art"><span>{e.muscle.toUpperCase()} / 0{(i%9)+1}</span><ExerciseIllustration id={e.id} label={e.name}/></div><div className="exercise-card-body"><span className={'tag '+(e.level==='초급'?'green':'orange')}>{e.level}</span><h3>{e.name}</h3><p>{e.english}</p><div className="exercise-card-bottom"><span>{e.equipment} · {e.muscle}</span><ChevronRight size={17}/></div></div></Link>)}</div>:<div className="empty"><Search size={25}/><h3>검색된 운동이 없어요</h3><p>검색어를 바꾸거나 다른 운동 부위를 선택해 보세요.</p></div>}<div className="notice" style={{marginTop:25}}><BookOpen size={18}/>이 가이드는 일반적인 운동 학습용입니다. 통증이나 부상이 있다면 운동을 중단하고 전문가에게 상담하세요.</div></div>;
}
