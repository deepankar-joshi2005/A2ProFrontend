import api from '../config/api';
import { WorkoutPlan } from './workoutPlan.service';

export interface MemberWorkoutPlan {
  _id: string;
  memberId: string;
  planId: WorkoutPlan;
  assignedDate: string;
}

export const listMemberWorkoutPlans = async (memberId: string): Promise<MemberWorkoutPlan[]> => {
  const res = await api.get(`/api/members/${memberId}/workout-plans`);
  return res.data.plans;
};

export const assignMemberWorkoutPlan = async (memberId: string, planId: string): Promise<MemberWorkoutPlan> => {
  const res = await api.post(`/api/members/${memberId}/workout-plans`, { planId });
  return res.data.plan;
};

export const deleteMemberWorkoutPlan = async (memberId: string, planAssignmentId: string): Promise<void> => {
  await api.delete(`/api/members/${memberId}/workout-plans/${planAssignmentId}`);
};
