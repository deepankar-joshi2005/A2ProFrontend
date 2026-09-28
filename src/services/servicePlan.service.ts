import api from '../config/api';

export interface ServicePlan {
  _id: string;
  name: string;
  amount: number;
  isActive: boolean;
}

export interface ServicePlanInput {
  name: string;
  amount: number;
}

export const listServicePlans = async (): Promise<ServicePlan[]> => {
  const res = await api.get('/api/service-plans', { params: { all: 'true' } });
  return res.data.services;
};

export const createServicePlan = async (input: ServicePlanInput): Promise<ServicePlan> => {
  const res = await api.post('/api/service-plans', input);
  return res.data.service;
};

export const updateServicePlan = async (id: string, input: Partial<ServicePlanInput>): Promise<ServicePlan> => {
  const res = await api.patch(`/api/service-plans/${id}`, input);
  return res.data.service;
};

export const deleteServicePlan = async (id: string): Promise<void> => {
  await api.delete(`/api/service-plans/${id}`);
};
