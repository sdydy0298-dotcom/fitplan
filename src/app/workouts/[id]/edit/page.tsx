'use client';
import {useParams} from 'next/navigation';
import WorkoutEditor from '@/components/WorkoutEditor';
export default function EditWorkout(){const {id}=useParams<{id:string}>();return <WorkoutEditor editId={id}/>;}
