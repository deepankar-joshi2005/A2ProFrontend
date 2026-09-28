import api from '../config/api';
import { PTPlan } from './ptPlan.service';

export interface MemberPTPlan {
  _id: string;
  memberId: string;
  ptPlanId: PTPlan;
  startDate: string;
  expiryDate: string;
  isFrozen: boolean;
}

export const listMemberPTPlans = async (memberId: string): Promise<MemberPTPlan[]> => {
  const res = await api.get(`/api/members/${memberId}/pt-plans`);
  return res.data.plans;
};

export const assignMemberPTPlan = async (
  memberId: string,
  input: { ptPlanId: string; startDate?: string }
): Promise<MemberPTPlan> => {
  const res = await api.post(`/api/members/${memberId}/pt-plans`, input);
  return res.data.plan;
};

export const toggleFreezeMemberPTPlan = async (memberId: string, planAssignmentId: string): Promise<MemberPTPlan> => {
  const res = await api.patch(`/api/members/${memberId}/pt-plans/${planAssignmentId}/freeze`);
  return res.data.plan;
};

export const deleteMemberPTPlan = async (memberId: string, planAssignmentId: string): Promise<void> => {
  await api.delete(`/api/members/${memberId}/pt-plans/${planAssignmentId}`);
};
