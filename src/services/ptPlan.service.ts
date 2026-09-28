import api from '../config/api';

export interface PTPlan {
  _id: string;
  name: string;
  amount: number;
  isSessionBased: boolean;
  sessions: number;
  durationUnit: 'months' | 'days';
  durationValue: number;
  durationInDays: number;
  isActive: boolean;
}

export interface PTPlanInput {
  name: string;
  amount: number;
  isSessionBased: boolean;
  sessions?: number;
  durationUnit?: 'months' | 'days';
  durationValue?: number;
}

export const listPTPlans = async (): Promise<PTPlan[]> => {
  const res = await api.get('/api/pt-plans', { params: { all: 'true' } });
  return res.data.plans;
};

export const createPTPlan = async (input: PTPlanInput): Promise<PTPlan> => {
  const res = await api.post('/api/pt-plans', input);
  return res.data.plan;
};

export const updatePTPlan = async (id: string, input: Partial<PTPlanInput>): Promise<PTPlan> => {
  const res = await api.patch(`/api/pt-plans/${id}`, input);
  return res.data.plan;
};

export const deletePTPlan = async (id: string): Promise<void> => {
  await api.delete(`/api/pt-plans/${id}`);
};
