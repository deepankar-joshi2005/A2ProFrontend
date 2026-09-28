import api from '../config/api';

export interface DashboardStats {
  today: {
    attendance: number;
    birthdays: number;
    expiresToday: number;
    ptExpiresToday: number;
  };
  attendanceMonthly: {
    monthlyCheckIns: number;
    uniqueMembersAttendance: number;
  };
  membershipExpiry: {
    expiring1to3: number;
    expiring4to7: number;
    expiring8to15: number;
  };
  ptPlanExpiry: {
    ptExpiring1to3: number;
    ptExpiring4to7: number;
    ptExpiring8to15: number;
  };
  membershipOverview: {
    activeMembers: number;
    expiredMembers: number;
    totalMembers: number;
    blockMembers: number;
  };
  ptPlanOverview: {
    activePTPlans: number;
    expiredPTPlans: number;
    totalPTPlans: number;
  };
}

export interface AttendanceRecord {
  _id: string;
  memberId: any;
  dateStr: string;
  punchInTime: string;
  punchOutTime: string | null;
  status: 'punched_in' | 'punched_out';
  createdAt: string;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get('/api/attendance/dashboard-stats');
  return res.data;
};

export const getTodayAttendance = async (): Promise<AttendanceRecord[]> => {
  const res = await api.get('/api/attendance/today');
  return res.data.records;
};

export const getAttendanceReport = async (dateStr?: string): Promise<{ dateStr: string; records: AttendanceRecord[] }> => {
  const res = await api.get('/api/attendance/report', { params: { date: dateStr } });
  return res.data;
};

export const punchAttendance = async (memberId: string): Promise<{ message: string; record: AttendanceRecord }> => {
  const res = await api.post('/api/attendance/punch', { memberId });
  return res.data;
};

export interface PeriodFinancialStats {

  admissionFees: number;
  membershipCollected: number;
  membershipDue: number;
  ptDue: number;
  servicePaid: number;
  serviceDue: number;
  expense: number;
}

export interface FinancialStatsResponse {
  todayCollection: number;
  thisMonth: PeriodFinancialStats;
  lastMonth: PeriodFinancialStats;
  last3Months: PeriodFinancialStats;
  thisYear: PeriodFinancialStats;
  lastYear: PeriodFinancialStats;
  lifetime: PeriodFinancialStats;
  custom?: PeriodFinancialStats | null;
}

export const getFinancialStats = async (from?: string, to?: string): Promise<FinancialStatsResponse> => {
  const res = await api.get('/api/attendance/financial-stats', { params: { from, to } });
  return res.data;
};

export const addBackDatedAttendance = async (params: {
  memberId: string;
  dateStr: string;
  punchInTime?: string;
}): Promise<{ message: string; record: AttendanceRecord }> => {
  const res = await api.post('/api/attendance/back-dated', params);
  return res.data;
};

export const getMonthlyAttendanceCounts = async (
  year: number,
  month: number
): Promise<Record<string, number>> => {
  const res = await api.get('/api/attendance/monthly-counts', { params: { year, month } });
  return res.data.counts || {};
};

export const getMemberAttendanceHistory = async (
  memberId: string
): Promise<AttendanceRecord[]> => {
  const res = await api.get(`/api/attendance/member-history/${memberId}`);
  return res.data.records || [];
};

export const getMyAttendanceHistory = async (
  month?: number,
  year?: number
): Promise<{ records: AttendanceRecord[]; member: any }> => {
  const params: any = {};
  if (month) params.month = month;
  if (year) params.year = year;
  const res = await api.get('/api/attendance/my-history', { params });
  return res.data;
};


