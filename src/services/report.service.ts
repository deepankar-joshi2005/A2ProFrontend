import api from '../config/api';

export type TrendsPeriod = 'week' | 'quarter' | 'six_month' | 'yearly';

export interface TrendPoint {
  label: string;
  value: number;
}

export interface TrendsResponse {
  collectedPayment: TrendPoint[];
  newMembers: TrendPoint[];
}

export const getTrends = async (period: TrendsPeriod): Promise<TrendsResponse> => {
  const res = await api.get('/api/reports/trends', { params: { period } });
  return res.data;
};

export interface CollectionBucket {
  count: number;
  completeAmount: number;
  received: number;
  balanceDue: number;
}

export interface CollectionSummaryResponse {
  allMemberships: CollectionBucket;
  fullyPaid: CollectionBucket;
  partiallyPaid: CollectionBucket;
  notPaid: CollectionBucket;
}

export const getCollectionSummary = async (from?: string, to?: string): Promise<CollectionSummaryResponse> => {
  const res = await api.get('/api/reports/collection', { params: { from, to } });
  return res.data;
};

export interface PlanDueMember {
  _id: string;
  name: string;
  membershipId: string;
  mobile: string;
  countryCode: string;
  photoUrl: string | null;
  planName: string;
  dueAmount: number;
  completeAmount?: number;
  paidAmount?: number;
  purchaseDate?: string;
  planStartDate?: string;
  planExpiryDate: string;
}

export interface PlanDueResponse {
  dueAmount: number;
  members: PlanDueMember[];
}

export const getPlanDue = async (from?: string, to?: string, pt?: boolean): Promise<PlanDueResponse> => {
  const res = await api.get('/api/reports/plan-due', { params: { from, to, pt: pt ? 'true' : undefined } });
  return res.data;
};

export interface AdmissionMember {
  _id: string;
  name: string;
  membershipId: string;
  mobile: string;
  countryCode: string;
  photoUrl: string | null;
  planName: string;
  admissionFees: number;
  joiningDate: string;
  planStartDate: string;
  paymentMethod: string | null;
}

export interface AdmissionReportResponse {
  totalAdmissionFees: number;
  members: AdmissionMember[];
  count: number;
}

export const getAdmissionReport = async (from?: string, to?: string): Promise<AdmissionReportResponse> => {
  const res = await api.get('/api/reports/admission', { params: { from, to } });
  return res.data;
};

export interface SaleRecord {
  _id: string;
  name: string;
  membershipId: string;
  mobile: string;
  countryCode: string;
  invoiceNo: string;
  date: string;
  paidAmount: number;
  dueAmount: number;
  planName: string;
  paymentMethod: string | null;
}

export interface SalesResponse {
  thisMonthCollection: number;
  sales: SaleRecord[];
}

export const getSales = async (params: {
  from?: string;
  to?: string;
  paymentMethod?: string;
  planType?: string;
}): Promise<SalesResponse> => {
  const res = await api.get('/api/reports/sales', { params });
  return res.data;
};

/* ==================== EXPENSE SERVICES ==================== */

export interface ExpenseRecord {
  _id: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  date: string;
  createdAt: string;
}

export interface ExpenseListResponse {
  expenses: ExpenseRecord[];
  totalAmount: number;
  count: number;
}

export const getExpenseCategories = async (): Promise<string[]> => {
  const res = await api.get('/api/expenses/categories');
  return res.data.categories || [];
};

export const createExpenseCategory = async (name: string): Promise<string> => {
  const res = await api.post('/api/expenses/categories', { name });
  return res.data.category;
};

export const getExpenses = async (params: {
  from?: string;
  to?: string;
  category?: string;
  search?: string;
}): Promise<ExpenseListResponse> => {
  const res = await api.get('/api/expenses', { params });
  return res.data;
};

export const createExpense = async (data: {
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  date?: string;
}): Promise<ExpenseRecord> => {
  const res = await api.post('/api/expenses', data);
  return res.data.expense;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await api.delete(`/api/expenses/${id}`);
};

/* ==================== SERVICE (GYM SERVICE) SERVICES ==================== */

export interface GymServiceRecord {
  _id: string;
  memberId: {
    _id: string;
    name: string;
    membershipId: string;
    mobile: string;
    countryCode?: string;
  } | null;
  serviceName: string;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  date: string;
  notes?: string;
}

export interface GymServiceResponse {
  services: GymServiceRecord[];
  totalPaid: number;
  totalDue: number;
  count: number;
}

export const getGymServices = async (params: {
  from?: string;
  to?: string;
  type?: 'all' | 'paid' | 'due';
  search?: string;
  memberId?: string;
}): Promise<GymServiceResponse> => {
  const res = await api.get('/api/services', { params });
  return res.data;
};

export const deleteGymService = async (id: string): Promise<void> => {
  await api.delete(`/api/services/${id}`);
};

export const createGymService = async (data: {
  memberId: string;
  serviceName: string;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod?: string;
  date?: string;
  notes?: string;
}): Promise<GymServiceRecord> => {
  const res = await api.post('/api/services', data);
  return res.data.service;
};

