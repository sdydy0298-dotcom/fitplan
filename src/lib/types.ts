export type RoutineItem = { id: string; exercise_id: string; position: number; target_sets: number; target_reps: number; target_weight: number; notes: string | null; };
export type RoutineDay = { id: string; weekday: number; position: number; routine_items: RoutineItem[] };
export type Routine = { id: string; owner_id: string; title: string; description: string | null; created_at: string; updated_at: string; routine_days: RoutineDay[] };
export type WorkoutSet = { id: string; set_no: number; reps: number; weight: number };
export type WorkoutEntry = { id: string; exercise_id: string; position: number; workout_sets: WorkoutSet[] };
export type Workout = { id: string; user_id: string; routine_id: string | null; performed_at: string; notes: string | null; created_at: string; workout_entries: WorkoutEntry[] };
export type ShareRoutine = { title: string; description: string | null; routine_days: Array<{weekday: number; position: number; routine_items: Array<{exercise_id: string; exercise_name?: string|null; position: number; target_sets: number; target_reps: number; target_weight: number; notes: string | null}>}> };
