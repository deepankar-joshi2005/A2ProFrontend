import api from '../config/api';

export interface TeamMember {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  countryCode: string;
  isTrainer: boolean;
  permissions: Record<string, any>;
}

export interface PublicTrainer {
  _id: string;
  name: string;
  isTrainer: boolean;
  mobile: string;
  countryCode: string;
}

export interface TeamMemberInput {
  name: string;
  email: string;
  mobile: string;
  countryCode?: string;
  password?: string;
  isTrainer: boolean;
  permissions: Record<string, any>;
}

export const listTeamMembers = async (): Promise<TeamMember[]> => {
  const res = await api.get('/api/team-members');
  return res.data.staff;
};

// For member portal — returns only staff marked as trainers
export const listPublicTrainers = async (): Promise<PublicTrainer[]> => {
  const res = await api.get('/api/team-members/trainers');
  return res.data.trainers;
};

export const createTeamMember = async (input: TeamMemberInput): Promise<TeamMember> => {
  const res = await api.post('/api/team-members', input);
  return res.data.staff;
};

export const updateTeamMember = async (id: string, input: Partial<TeamMemberInput>): Promise<TeamMember> => {
  const res = await api.patch(`/api/team-members/${id}`, input);
  return res.data.staff;
};

export const deleteTeamMember = async (id: string): Promise<void> => {
  await api.delete(`/api/team-members/${id}`);
};
