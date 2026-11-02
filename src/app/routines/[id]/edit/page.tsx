'use client';
import {useParams} from 'next/navigation';
import RoutineEditor from '@/components/RoutineEditor';
export default function EditRoutine(){const {id}=useParams<{id:string}>();return <RoutineEditor id={id}/>;}
