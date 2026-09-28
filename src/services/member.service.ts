import { Platform } from 'react-native';
import api from '../config/api';

export interface MembershipPlan {
  _id: string;
  name: string;
  amount: number;
  durationUnit: 'months' | 'days';
  durationValue: number;
  durationInDays: number;
  isActive: boolean;
}

export interface Member {
  _id: string;
  name: string;
  photoUrl: string | null;
  gender: 'male' | 'female';
  countryCode: string;
  mobile: string;
  membershipId: string;
  batchLabel: string;
  planId: MembershipPlan | null;
  planAmount: number;
  isFrozen: boolean;
  isBlocked: boolean;
  joiningDate: string;
  paymentDate: string | null;
  paidAmount: number;
  paymentMethod: string | null;
  comments: string;
  discountType: 'percent' | 'amount';
  discountValue: number;
  admissionFees: number;
  dueAmount: number;
  planExpiryDate: string | null;
  email: string;
  dob: string | null;
  address: string;
  notes: string;
  accountUserId: string | null;
  createdAt: string;
}

export interface CreateMemberInput {
  name: string;
  gender: 'male' | 'female';
  countryCode: string;
  mobile: string;
  membershipId: string;
  planId: string;
  joiningDate: string;
  paymentDate?: string;
  paidAmount: number;
  paymentMethod?: string;
  comments?: string;
  discountType: 'percent' | 'amount';
  discountValue: number;
  admissionFees: number;
  email: string;
  password?: string;
  dob?: string;
  address?: string;
  notes?: string;
}

export interface MyProfileResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  };
  member: Member | null;
}

export const getMyProfile = async (): Promise<MyProfileResponse> => {
  const res = await api.get('/api/members/me');
  return res.data;
};

export const listMembers = async (): Promise<Member[]> => {
  const res = await api.get('/api/members');
  return res.data.members;
};

export const getMember = async (id: string): Promise<Member> => {
  const res = await api.get(`/api/members/${id}`);
  return res.data.member;
};

export const listPlans = async (): Promise<MembershipPlan[]> => {
  const res = await api.get('/api/plans');
  return res.data.plans;
};

export const listAllPlans = async (): Promise<MembershipPlan[]> => {
  const res = await api.get('/api/plans', { params: { all: 'true' } });
  return res.data.plans;
};

export interface PlanInput {
  name: string;
  amount: number;
  durationUnit: 'months' | 'days';
  durationValue: number;
}

export const createPlan = async (input: PlanInput): Promise<MembershipPlan> => {
  const res = await api.post('/api/plans', input);
  return res.data.plan;
};

export const updatePlan = async (id: string, input: Partial<PlanInput>): Promise<MembershipPlan> => {
  const res = await api.patch(`/api/plans/${id}`, input);
  return res.data.plan;
};

export const deletePlan = async (id: string): Promise<void> => {
  await api.delete(`/api/plans/${id}`);
};

export const getNextMembershipId = async (): Promise<string> => {
  const res = await api.get('/api/members/next-id');
  return res.data.nextMembershipId;
};

export const checkMembershipIdAvailable = async (membershipId: string): Promise<boolean> => {
  const res = await api.get('/api/members/check-membership-id', { params: { membershipId } });
  return res.data.available;
};

export const createMember = async (
  input: CreateMemberInput,
  photoUri: string | null
): Promise<Member> => {
  const formData = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  });
  if (photoUri) {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(photoUri)).blob();
      formData.append('photo', blob, 'photo.jpg');
    } else {
      formData.append('photo', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    }
  }
  const res = await api.post('/api/members', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.member;
};

export const deleteMember = async (id: string): Promise<void> => {
  await api.delete(`/api/members/${id}`);
};

export const createMemberAccount = async (memberId: string, password: string): Promise<void> => {
  await api.post(`/api/members/${memberId}/create-account`, { password });
};

export interface RenewPlanInput {
  planId: string;
  planStartDate?: string;
  paymentDate?: string;
  paidAmount?: number;
  paymentMethod?: string;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
  admissionFees?: number;
  comments?: string;
}

export const renewMemberPlan = async (memberId: string, input: RenewPlanInput): Promise<Member> => {
  const res = await api.post(`/api/members/${memberId}/renew-plan`, input);
  return res.data.member;
};

export const clearMemberPlan = async (memberId: string): Promise<Member> => {
  const res = await api.delete(`/api/members/${memberId}/plan`);
  return res.data.member;
};

export const toggleFreezeMember = async (memberId: string): Promise<Member> => {
  const res = await api.patch(`/api/members/${memberId}/freeze`);
  return res.data.member;
};

export const toggleBlockMember = async (memberId: string): Promise<Member> => {
  const res = await api.patch(`/api/members/${memberId}/block`);
  return res.data.member;
};

export const assignMemberBatch = async (memberId: string, batchId: string | null): Promise<Member> => {
  const res = await api.patch(`/api/members/${memberId}/batch`, { batchId });
  return res.data.member;
};

