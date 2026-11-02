'use client';
import {useState,type FormEvent} from 'react';
import {Plus,X} from 'lucide-react';
import type {ExerciseCategory,NewCustomExercise} from '@/lib/custom-exercises';

const categories:ExerciseCategory[]=['가슴','등','하체','어깨','팔','코어','기타'];

export default function CustomExerciseForm({onSave,onCancel}:{onSave:(data:NewCustomExercise)=>Promise<void>;onCancel:()=>void}){
 const [name,setName]=useState('');
 const [muscle,setMuscle]=useState<ExerciseCategory>('가슴');
 const [equipment,setEquipment]=useState('');
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const submit=async(event:FormEvent<HTMLFormElement>)=>{
   event.preventDefault();
   setError('');
   if(!name.trim())return setError('운동 이름을 입력해 주세요.');
   setSaving(true);
   try{await onSave({name,muscle,equipment});}
   catch(e){setError(e instanceof Error?e.message:'운동 등록에 실패했습니다.');}
   finally{setSaving(false);}
 };
 return <form onSubmit={submit} className="custom-exercise-form" aria-label="내 운동 직접 등록">
   <div className="panel-header">
     <div><h3>목록에 없는 운동 등록</h3><p className="small" style={{margin:0}}>등록한 운동은 내 목록에 저장되어 다른 루틴과 기록에서도 다시 사용할 수 있어요.</p></div>
     <button type="button" className="icon-btn" aria-label="등록 취소" onClick={onCancel} disabled={saving}><X size={16}/></button>
   </div>
   <label className="input-field">운동 이름
     <input value={name} onChange={e=>setName(e.target.value)} maxLength={80} autoFocus required placeholder="예: 케이블 킥백"/>
   </label>
   <div className="field-grid">
     <label className="input-field">운동 부위
       <select value={muscle} onChange={e=>setMuscle(e.target.value as ExerciseCategory)}>
         {categories.map(m=><option key={m} value={m}>{m}</option>)}
       </select>
     </label>
     <label className="input-field">기구 (선택)
       <input value={equipment} onChange={e=>setEquipment(e.target.value)} maxLength={80} placeholder="예: 케이블 머신"/>
     </label>
   </div>
   {error&&<div className="error-message" role="alert">{error}</div>}
   <button type="submit" className="btn btn-primary" disabled={saving}><Plus size={15}/>{saving?'등록 중…':'등록하고 바로 추가'}</button>
 </form>;
}
