import api from '../config/api';

export interface DietMeal {
  name: string;
  quantity: string;
  calories: string;
  notes: string;
}

export interface DietDay {
  title: string;
  meals: DietMeal[];
}

export interface DietPlan {
  _id: string;
  name: string;
  days: DietDay[];
  notes: string;
  isActive: boolean;
}

export interface DietPlanInput {
  name: string;
  days: DietDay[];
  notes?: string;
}

export const listDietPlans = async (): Promise<DietPlan[]> => {
  const res = await api.get('/api/diet-plans', { params: { all: 'true' } });
  return res.data.plans;
};

export const createDietPlan = async (input: DietPlanInput): Promise<DietPlan> => {
  const res = await api.post('/api/diet-plans', input);
  return res.data.plan;
};

export const updateDietPlan = async (id: string, input: Partial<DietPlanInput>): Promise<DietPlan> => {
  const res = await api.patch(`/api/diet-plans/${id}`, input);
  return res.data.plan;
};

export const deleteDietPlan = async (id: string): Promise<void> => {
  await api.delete(`/api/diet-plans/${id}`);
};
