import api from '../config/api';
import { DietPlan } from './dietPlan.service';

export interface MemberDietPlan {
  _id: string;
  memberId: string;
  planId: DietPlan;
  assignedDate: string;
}

export const listMemberDietPlans = async (memberId: string): Promise<MemberDietPlan[]> => {
  const res = await api.get(`/api/members/${memberId}/diet-plans`);
  return res.data.plans;
};

export const assignMemberDietPlan = async (memberId: string, planId: string): Promise<MemberDietPlan> => {
  const res = await api.post(`/api/members/${memberId}/diet-plans`, { planId });
  return res.data.plan;
};

export const deleteMemberDietPlan = async (memberId: string, planAssignmentId: string): Promise<void> => {
  await api.delete(`/api/members/${memberId}/diet-plans/${planAssignmentId}`);
};
