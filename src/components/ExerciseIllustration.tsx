import Image from 'next/image';

// FITPLAN uses licensed, exercise-specific WebP artwork stored in /public/exercises.
// Each file represents the matching exercise ID, rather than a generic icon.
export default function ExerciseIllustration({
  id, className='', label
}: {id:string; className?:string; label?:string}) {
  return <Image
    src={`/exercises/${id}.webp`}
    alt={`${label ?? id} 운동 동작 일러스트`}
    width={512}
    height={512}
    className={`exercise-illustration ${className}`}
    sizes="(max-width: 720px) 48vw, (max-width: 1100px) 30vw, 220px"
    unoptimized
  />;
}
