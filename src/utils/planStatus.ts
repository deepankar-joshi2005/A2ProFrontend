export type PlanStatusType = 'expired' | 'warning' | 'active';

export interface PlanStatusInfo {
  status: PlanStatusType;
  daysLeft: number;
  color: string;         // Color for date text and status label
  bgColor: string;       // Background color for badge
  lightColor: string;    // Color for glowing status light / indicator dot ("batti")
  label: string;         // Display label e.g., "Expired", "Expiring (3d)", "Active"
}

export function getPlanStatus(expiryDate: Date | string | null | undefined): PlanStatusInfo {
  if (!expiryDate) {
    return {
      status: 'expired',
      daysLeft: -999,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      lightColor: '#EF4444',
      label: 'Expired',
    };
  }

  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) {
    return {
      status: 'expired',
      daysLeft: -999,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      lightColor: '#EF4444',
      label: 'Expired',
    };
  }

  const now = new Date();
  // Normalize both dates to midnight for exact calendar day difference
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const expStart = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()).getTime();

  const MS_PER_DAY = 86400000;
  const daysLeft = Math.round((expStart - todayStart) / MS_PER_DAY);

  if (daysLeft < 0) {
    // Expired -> RED
    return {
      status: 'expired',
      daysLeft,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.15)',
      lightColor: '#EF4444',
      label: 'Expired',
    };
  } else if (daysLeft <= 7) {
    // Expiring in 1-7 days -> ORANGE
    return {
      status: 'warning',
      daysLeft,
      color: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      lightColor: '#F59E0B',
      label: daysLeft === 0 ? 'Expires Today' : `Expiring (${daysLeft}d)`,
    };
  } else {
    // Active (> 7 days) -> GREEN
    return {
      status: 'active',
      daysLeft,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.15)',
      lightColor: '#10B981',
      label: 'Active',
    };
  }
}

export function calculateDefaultEndDate(startDate: Date, plan: { durationUnit?: 'months' | 'days'; durationValue?: number; durationInDays?: number }): Date {
  const end = new Date(startDate);
  if (plan.durationUnit === 'months' && plan.durationValue) {
    end.setMonth(end.getMonth() + Number(plan.durationValue));
  } else if (plan.durationInDays) {
    end.setDate(end.getDate() + Number(plan.durationInDays));
  } else if (plan.durationValue) {
    end.setDate(end.getDate() + Number(plan.durationValue));
  } else {
    end.setDate(end.getDate() + 30);
  }
  return end;
}
