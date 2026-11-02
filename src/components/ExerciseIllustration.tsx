import Image from 'next/image';

// Every exercise has its own square WebP illustration in public/exercises.
// Using fill keeps the source image out of grid/flex intrinsic sizing,
// so wide cards and the detail hero can show the whole pose without clipping.
export default function ExerciseIllustration({
  id, className='', label
}: {id:string; className?:string; label?:string}) {
  return <Image
    src={`/exercises/${id}.webp`}
    alt={`${label ?? id} 운동 동작 일러스트`}
    fill
    className={`exercise-illustration ${className}`}
    sizes="(max-width: 720px) 50vw, (max-width: 1100px) 33vw, 440px"
    style={{objectFit:'contain',objectPosition:'center'}}
    unoptimized
  />;
}
