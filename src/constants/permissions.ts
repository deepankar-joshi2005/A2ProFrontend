export interface PermissionItem {
  key: string;
  label: string;
}

export interface PermissionGroup {
  section?: string;
  title: string;
  key: string;
  items: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    section: 'MEMBERS',
    title: 'Manage members',
    key: 'members',
    items: [
      { key: 'members.view', label: 'View' },
      { key: 'members.add', label: 'Add' },
      { key: 'members.edit', label: 'Edit' },
      { key: 'members.delete', label: 'Delete' },
    ],
  },
  {
    title: 'Mark attendance',
    key: 'attendance',
    items: [{ key: 'attendance.mark', label: 'Mark attendance' }],
  },
  {
    title: 'Manage memberships',
    key: 'memberships',
    items: [
      { key: 'memberships.view', label: 'View' },
      { key: 'memberships.add', label: 'Add' },
      { key: 'memberships.edit', label: 'Edit' },
      { key: 'memberships.delete', label: 'Delete' },
      { key: 'memberships.freeze', label: 'Freeze / Unfreeze' },
    ],
  },
  {
    title: 'Manage PT plans',
    key: 'ptPlans',
    items: [
      { key: 'ptPlans.view', label: 'View' },
      { key: 'ptPlans.add', label: 'Add' },
      { key: 'ptPlans.edit', label: 'Edit' },
      { key: 'ptPlans.delete', label: 'Delete' },
      { key: 'ptPlans.freeze', label: 'Freeze / Unfreeze' },
    ],
  },
  {
    title: 'Manage services',
    key: 'services',
    items: [
      { key: 'services.view', label: 'View' },
      { key: 'services.add', label: 'Add' },
      { key: 'services.edit', label: 'Edit' },
      { key: 'services.delete', label: 'Delete' },
    ],
  },
  {
    section: 'REPORTS',
    title: 'View trends',
    key: 'reportsTrends',
    items: [{ key: 'reports.trends', label: 'View' }],
  },
  {
    title: 'View collection report',
    key: 'reportsCollection',
    items: [{ key: 'reports.collection', label: 'View' }],
  },
  {
    title: 'Attendance Report',
    key: 'reportsAttendance',
    items: [{ key: 'reports.attendance', label: 'View' }],
  },
  {
    section: 'DOWNLOADS',
    title: 'Download reports',
    key: 'downloads',
    items: [{ key: 'downloads.reports', label: 'View' }],
  },
  {
    section: 'GYM SETUP',
    title: 'Manage membership plans',
    key: 'gymSetupMembershipPlans',
    items: [
      { key: 'gymSetup.membershipPlans.view', label: 'View' },
      { key: 'gymSetup.membershipPlans.add', label: 'Add' },
      { key: 'gymSetup.membershipPlans.edit', label: 'Edit' },
      { key: 'gymSetup.membershipPlans.delete', label: 'Delete' },
    ],
  },
  {
    section: 'ENQUIRIES',
    title: 'Manage enquiries',
    key: 'enquiries',
    items: [
      { key: 'enquiries.view', label: 'View' },
      { key: 'enquiries.add', label: 'Add' },
      { key: 'enquiries.edit', label: 'Edit' },
      { key: 'enquiries.delete', label: 'Delete' },
    ],
  },
  {
    section: 'EXPENSES',
    title: 'Manage expenses',
    key: 'expenses',
    items: [
      { key: 'expenses.view', label: 'View' },
      { key: 'expenses.add', label: 'Add' },
      { key: 'expenses.edit', label: 'Edit' },
      { key: 'expenses.delete', label: 'Delete' },
    ],
  },
];

// Every permission key, flattened, defaulted to a given boolean.
export const buildPermissions = (value: boolean): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const group of PERMISSION_GROUPS) {
    for (const item of group.items) {
      const [section, ...rest] = item.key.split('.');
      if (!result[section]) result[section] = {};
      let cursor = result[section];
      while (rest.length > 1) {
        const k = rest.shift() as string;
        if (!cursor[k]) cursor[k] = {};
        cursor = cursor[k];
      }
      cursor[rest[0]] = value;
    }
  }
  return result;
};

export const getPermissionValue = (permissions: any, dotKey: string): boolean => {
  if (!permissions) return false;
  return dotKey.split('.').reduce<any>((obj, key) => (obj == null ? undefined : obj[key]), permissions) === true;
};

export const setPermissionValue = (permissions: any, dotKey: string, value: boolean): any => {
  const next = JSON.parse(JSON.stringify(permissions || {}));
  const parts = dotKey.split('.');
  let cursor = next;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cursor[parts[i]]) cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
  return next;
};
