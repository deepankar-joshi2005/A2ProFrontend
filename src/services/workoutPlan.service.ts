import api from '../config/api';

export interface WorkoutExercise {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
}

export interface WorkoutDay {
  title: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  _id: string;
  name: string;
  days: WorkoutDay[];
  notes: string;
  isActive: boolean;
}

export interface WorkoutPlanInput {
  name: string;
  days: WorkoutDay[];
  notes?: string;
}

export const listWorkoutPlans = async (): Promise<WorkoutPlan[]> => {
  const res = await api.get('/api/workout-plans', { params: { all: 'true' } });
  return res.data.plans;
};

export const createWorkoutPlan = async (input: WorkoutPlanInput): Promise<WorkoutPlan> => {
  const res = await api.post('/api/workout-plans', input);
  return res.data.plan;
};

export const updateWorkoutPlan = async (id: string, input: Partial<WorkoutPlanInput>): Promise<WorkoutPlan> => {
  const res = await api.patch(`/api/workout-plans/${id}`, input);
  return res.data.plan;
};

export const deleteWorkoutPlan = async (id: string): Promise<void> => {
  await api.delete(`/api/workout-plans/${id}`);
};
