import api from '../config/api';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'staff';
  mobile?: string;
  isTrainer?: boolean;
  permissions?: Record<string, any>;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResult> => {
  const res = await api.post('/api/auth/register', { name, email, password });
  return res.data;
};

export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  const res = await api.post('/api/auth/login', { email, password });
  return res.data;
};