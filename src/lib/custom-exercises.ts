'use client';
import {useEffect,useMemo,useState} from 'react';
import {useAuth} from '@/components/AuthProvider';
import {browserDb} from '@/lib/supabase';
import {EXERCISES,getExercise,type MuscleGroup} from '@/lib/exercises';

export type ExerciseCategory=MuscleGroup|'기타';
export type CustomExercise={id:string;name:string;muscle:ExerciseCategory;equipment:string};
export type ExerciseOption=CustomExercise&{custom:boolean};
export type NewCustomExercise={name:string;muscle:ExerciseCategory;equipment:string};

export const isCustomExercise=(id:string)=>id.startsWith('custom-');

export function useExerciseLibrary(){
 const {user,ready}=useAuth();
 const userId=user?.id;
 const [mine,setMine]=useState<CustomExercise[]>([]);
 const [error,setError]=useState('');
 useEffect(()=>{
   let live=true;
   if(!ready||!userId){setMine([]);return;}
   browserDb().from('exercise_catalog')
     .select('id,name,muscle,equipment')
     .eq('owner_id',userId)
     .order('created_at',{ascending:true})
     .then(({data,error})=>{
       if(!live)return;
       if(error){setError('내가 등록한 운동을 불러오지 못했습니다.');return;}
       setError('');
       setMine((data??[]) as CustomExercise[]);
     });
   return ()=>{live=false;};
 },[ready,userId]);

 const options=useMemo<ExerciseOption[]>(()=>[
   ...EXERCISES.map(e=>({id:e.id,name:e.name,muscle:e.muscle,equipment:e.equipment,custom:false})),
   ...mine.map(e=>({...e,custom:true}))
 ],[mine]);

 const nameOf=(id:string)=>mine.find(e=>e.id===id)?.name??getExercise(id)?.name??id;

 const addCustom=async (input:NewCustomExercise):Promise<CustomExercise>=>{
   const name=input.name.trim().replace(/\s+/g,' ');
   const equipment=input.equipment.trim().replace(/\s+/g,' ')||'직접 등록';
   if(!name||name.length>80)throw new Error('운동 이름은 1~80자로 입력해 주세요.');
   if(equipment.length>80)throw new Error('운동 기구는 80자 이내로 입력해 주세요.');
   if(!['가슴','등','하체','어깨','팔','코어','기타'].includes(input.muscle))throw new Error('운동 부위를 선택해 주세요.');
   const existing=mine.find(e=>e.name.toLocaleLowerCase('ko')===name.toLocaleLowerCase('ko')&&e.muscle===input.muscle);
   if(existing)return existing;
   const {data:{user:current},error:authError}=await browserDb().auth.getUser();
   if(authError||!current)throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');
   const id='custom-'+crypto.randomUUID().replace(/-/g,'');
   const {data,error}=await browserDb().from('exercise_catalog')
     .insert({id,name,muscle:input.muscle,equipment,level:'직접 등록',owner_id:current.id})
     .select('id,name,muscle,equipment')
     .single();
   if(error)throw new Error('운동 등록에 실패했습니다. '+error.message);
   if(!data)throw new Error('운동 등록 결과를 확인하지 못했습니다.');
   const created=data as CustomExercise;
   setMine(prev=>prev.some(e=>e.id===created.id)?prev:[...prev,created]);
   return created;
 };
 return {options,mine,nameOf,addCustom,catalogError:error};
}
