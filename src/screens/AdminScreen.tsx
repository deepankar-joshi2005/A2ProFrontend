import { useState, useEffect, useCallback } from 'react';
import { View, BackHandler, Alert } from 'react-native';
import { AuthUser } from '../services/auth.service';
import TeamMembersScreen from './TeamMembersScreen';
import AddTeamMemberScreen from './AddTeamMemberScreen';
import { TeamMember } from '../services/teamMember.service';
import MemberDetailScreen from './MemberDetailScreen';
import BusinessProfileScreen from './BusinessProfileScreen';
import MembersScreen from './MembersScreen';
import AddMemberScreen from './AddMemberScreen';
import DashboardScreen from './DashboardScreen';
import ReportsScreen from './ReportsScreen';
import GymScreen, { ManageTarget } from './GymScreen';
import RecordAttendanceScreen from './RecordAttendanceScreen';
import RenewPlanScreen from './RenewPlanScreen';
import AdmissionReportScreen from './AdmissionReportScreen';
import PendingPlanPaymentsScreen from './PendingPlanPaymentsScreen';
import ManageExpenseScreen from './ManageExpenseScreen';
import ServiceReportScreen from './ServiceReportScreen';
import PlansScreen from './PlansScreen';
import AddPlanScreen from './AddPlanScreen';
import PTPlansScreen from './PTPlansScreen';
import AddPTPlanScreen from './AddPTPlanScreen';
import GymServicesScreen from './GymServicesScreen';
import AddGymServiceScreen from './AddGymServiceScreen';
import BatchesScreen from './BatchesScreen';
import AddBatchScreen from './AddBatchScreen';
import WorkoutPlansScreen from './WorkoutPlansScreen';
import AddWorkoutPlanScreen from './AddWorkoutPlanScreen';
import DietPlansScreen from './DietPlansScreen';
import AddDietPlanScreen from './AddDietPlanScreen';
import { Member, MembershipPlan } from '../services/member.service';
import { PTPlan } from '../services/ptPlan.service';
import { ServicePlan } from '../services/servicePlan.service';
import { Batch } from '../services/batch.service';
import { WorkoutPlan } from '../services/workoutPlan.service';
import { DietPlan } from '../services/dietPlan.service';

export type AdminView =
  | 'members'
  | 'dashboard'
  | 'reports'
  | 'gym'
  | 'addMember'
  | 'recordAttendance'
  | 'renewPlan'
  | 'admissionReport'
  | 'pendingPlanPayments'
  | 'manageExpense'
  | 'serviceReport'
  | 'plans'
  | 'addPlan'
  | 'ptPlans'
  | 'addPtPlan'
  | 'gymServices'
  | 'addGymService'
  | 'batches'
  | 'addBatch'
  | 'workoutPlans'
  | 'addWorkoutPlan'
  | 'dietPlans'
  | 'addDietPlan'
  | 'teamMembers'
  | 'addTeamMember'
  | 'memberDetail'
  | 'businessProfile';

interface Props {
  user: AuthUser;
  token: string;
  onLogout: () => void;
}

export default function AdminScreen({ onLogout }: Props) {
  // Staff lands on the same starting tab as admin - each screen gates its own content.
  const [view, setView] = useState<AdminView>('members');
  const [previousView, setPreviousView] = useState<AdminView>('members');
  const [refreshKey, setRefreshKey] = useState(0);

  // Team Members edit-in-place state
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);

  // Member state for plan renewal page
  const [renewingMember, setRenewingMember] = useState<Member | null>(null);

  // Member Detail state
  const [viewingMember, setViewingMember] = useState<Member | null>(null);

  // Dynamic filter state passed to MembersScreen
  const [initialStatusFilter, setInitialStatusFilter] = useState('all');

  // Attendance tab state passed to RecordAttendanceScreen
  const [attendanceInitialTab, setAttendanceInitialTab] = useState<'attendance' | 'report'>('attendance');

  // Dynamic Date range filter passed to reports/screens
  const [filterFrom, setFilterFrom] = useState<Date | null>(null);
  const [filterTo, setFilterTo] = useState<Date | null>(null);
  const [filterPeriodLabel, setFilterPeriodLabel] = useState<string | undefined>(undefined);

  // Pending Plan Payments state
  const [isPTPending, setIsPTPending] = useState(false);

  // Service Report state
  const [serviceReportType, setServiceReportType] = useState<'paid' | 'due' | 'all'>('paid');

  // Reports screen initial tab
  const [reportsInitialTab, setReportsInitialTab] = useState<'sales' | 'trends' | 'plan_due' | 'pt_plan_due' | 'collection'>('trends');

  // Manage Plans edit-in-place state
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [editingPTPlan, setEditingPTPlan] = useState<PTPlan | null>(null);
  const [editingServicePlan, setEditingServicePlan] = useState<ServicePlan | null>(null);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editingWorkoutPlan, setEditingWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [editingDietPlan, setEditingDietPlan] = useState<DietPlan | null>(null);

  const navigateTo = (newView: AdminView) => {
    setPreviousView(view);
    setView(newView);
  };

  // Root tabs — pressing back here asks user if they want to exit
  const ROOT_VIEWS: AdminView[] = ['members', 'dashboard', 'reports', 'gym'];

  // Hardware back button handler
  const handleHardwareBack = useCallback(() => {
    // If on a root tab, show exit confirmation
    if (ROOT_VIEWS.includes(view)) {
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ],
        { cancelable: true }
      );
      return true; // consumed — don't exit immediately
    }
    // Otherwise go back to previous view
    setView(previousView);
    return true;
  }, [view, previousView]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [handleHardwareBack]);

  const handleOpenManage = (target: ManageTarget) => {
    navigateTo(target);
  };

  const handleNavigateMembersWithFilter = (filterKey: string) => {
    setInitialStatusFilter(filterKey);
    navigateTo('members');
  };

  const handleOpenRecordAttendance = (tab: 'attendance' | 'report' = 'attendance') => {
    setAttendanceInitialTab(tab);
    navigateTo('recordAttendance');
  };

  const handleOpenRenewPlan = (member: Member) => {
    setRenewingMember(member);
    navigateTo('renewPlan');
  };

  const handleOpenMemberDetail = (member: Member) => {
    setViewingMember(member);
    navigateTo('memberDetail');
  };
  // Navigators from Dashboard Payments Tab
  const handleOpenAdmissionReport = (from: Date, to: Date, periodLabel?: string) => {
    setFilterFrom(from);
    setFilterTo(to);
    setFilterPeriodLabel(periodLabel);
    navigateTo('admissionReport');
  };

  const handleOpenSalesReport = (from: Date, to: Date) => {
    setFilterFrom(from);
    setFilterTo(to);
    setReportsInitialTab('sales');
    navigateTo('reports');
  };

  const handleOpenPendingPlanPayments = (isPT: boolean, from: Date, to: Date, periodLabel?: string) => {
    setIsPTPending(isPT);
    setFilterFrom(from);
    setFilterTo(to);
    setFilterPeriodLabel(periodLabel);
    navigateTo('pendingPlanPayments');
  };

  const handleOpenManageExpense = (from: Date, to: Date) => {
    setFilterFrom(from);
    setFilterTo(to);
    navigateTo('manageExpense');
  };

  const handleOpenServiceReport = (type: 'paid' | 'due', from: Date, to: Date, periodLabel?: string) => {
    setServiceReportType(type);
    setFilterFrom(from);
    setFilterTo(to);
    setFilterPeriodLabel(periodLabel);
    navigateTo('serviceReport');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {view === 'members' && (
        <MembersScreen
          key={refreshKey}
          onLogout={onLogout}
          onAddMember={() => navigateTo('addMember')}
          onNavigateTab={(tab) => navigateTo(tab)}
          onOpenRenewPlanScreen={handleOpenRenewPlan}
          onOpenMemberDetail={handleOpenMemberDetail}
          initialStatusFilter={initialStatusFilter}
        />
      )}
      {view === 'dashboard' && (
        <DashboardScreen
          key={refreshKey}
          onLogout={onLogout}
          onNavigateTab={(tab) => {
            if (tab === 'reports') {
              setReportsInitialTab('trends');
              setFilterFrom(null);
              setFilterTo(null);
            }
            navigateTo(tab);
          }}
          onOpenRecordAttendance={handleOpenRecordAttendance}
          onNavigateMembersWithFilter={handleNavigateMembersWithFilter}
          onNavigateAdmissionReport={handleOpenAdmissionReport}
          onNavigateSalesReport={handleOpenSalesReport}
          onNavigatePendingPlanPayments={handleOpenPendingPlanPayments}
          onNavigateManageExpense={handleOpenManageExpense}
          onNavigateServiceReport={handleOpenServiceReport}
          onOpenMemberDetail={handleOpenMemberDetail}
        />
      )}
      {view === 'reports' && (
        <ReportsScreen
          key={refreshKey}
          onLogout={onLogout}
          onNavigateTab={(tab) => navigateTo(tab)}
          initialTab={reportsInitialTab}
          initialFrom={filterFrom}
          initialTo={filterTo}
          onOpenMemberDetail={handleOpenMemberDetail}
        />
      )}
      {view === 'gym' && (
        <GymScreen
          key={refreshKey}
          onLogout={onLogout}
          onNavigateTab={(tab) => navigateTo(tab)}
          onOpenManage={handleOpenManage}
          onOpenTeamMembers={() => navigateTo('teamMembers')}
          onOpenBusinessProfile={() => navigateTo('businessProfile')}
        />
      )}
      {view === 'addMember' && (
        <AddMemberScreen
          onBack={() => navigateTo(previousView)}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('members');
          }}
        />
      )}
      {view === 'recordAttendance' && (
        <RecordAttendanceScreen
          onBack={() => navigateTo('dashboard')}
          initialTab={attendanceInitialTab}
          onOpenMemberDetail={handleOpenMemberDetail}
        />
      )}
      {view === 'renewPlan' && renewingMember && (
        <RenewPlanScreen
          member={renewingMember}
          onBack={() => navigateTo(previousView)}
          onRenewed={() => {
            setRefreshKey((k) => k + 1);
            navigateTo(previousView);
          }}
        />
      )}
      {view === 'memberDetail' && viewingMember && (
        <MemberDetailScreen
          key={refreshKey}
          member={viewingMember}
          onBack={() => navigateTo(previousView)}
          onOpenRenewPlan={handleOpenRenewPlan}
          onNavigateGymServices={() => navigateTo('gymServices')}
          onNavigatePtPlans={() => navigateTo('ptPlans')}
          onNavigateBatches={() => navigateTo('batches')}
          onNavigateWorkoutPlans={() => navigateTo('workoutPlans')}
          onNavigateDietPlans={() => navigateTo('dietPlans')}
        />
      )}
      {view === 'businessProfile' && (
        <BusinessProfileScreen onBack={() => navigateTo('gym')} />
      )}
      {view === 'admissionReport' && (
        <AdmissionReportScreen
          onBack={() => navigateTo('dashboard')}
          initialFrom={filterFrom}
          initialTo={filterTo}
          periodLabel={filterPeriodLabel}
          onOpenMemberDetail={handleOpenMemberDetail}
        />
      )}
      {view === 'pendingPlanPayments' && (
        <PendingPlanPaymentsScreen
          onBack={() => navigateTo('dashboard')}
          isPT={isPTPending}
          initialFrom={filterFrom}
          initialTo={filterTo}
          periodLabel={filterPeriodLabel}
          onOpenMemberDetail={handleOpenMemberDetail}
        />
      )}
      {view === 'manageExpense' && (
        <ManageExpenseScreen
          onBack={() => navigateTo('dashboard')}
          initialFrom={filterFrom}
          initialTo={filterTo}
        />
      )}
      {view === 'serviceReport' && (
        <ServiceReportScreen
          onBack={() => navigateTo('dashboard')}
          initialType={serviceReportType}
          initialFrom={filterFrom}
          initialTo={filterTo}
          periodLabel={filterPeriodLabel}
          onOpenMemberDetail={handleOpenMemberDetail}
        />
      )}

      {/* Membership Plans */}
      {view === 'plans' && (
        <PlansScreen
          key={refreshKey}
          onBack={() => navigateTo('gym')}
          onAddPlan={() => {
            setEditingPlan(null);
            navigateTo('addPlan');
          }}
          onEditPlan={(plan) => {
            setEditingPlan(plan);
            navigateTo('addPlan');
          }}
        />
      )}
      {view === 'addPlan' && (
        <AddPlanScreen
          editingPlan={editingPlan}
          onBack={() => navigateTo('plans')}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('plans');
          }}
        />
      )}

      {/* PT Plans */}
      {view === 'ptPlans' && (
        <PTPlansScreen
          key={refreshKey}
          onBack={() => navigateTo('gym')}
          onAddPlan={() => {
            setEditingPTPlan(null);
            navigateTo('addPtPlan');
          }}
          onEditPlan={(plan) => {
            setEditingPTPlan(plan);
            navigateTo('addPtPlan');
          }}
        />
      )}
      {view === 'addPtPlan' && (
        <AddPTPlanScreen
          editingPlan={editingPTPlan}
          onBack={() => navigateTo('ptPlans')}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('ptPlans');
          }}
        />
      )}

      {/* Gym Services */}
      {view === 'gymServices' && (
        <GymServicesScreen
          key={refreshKey}
          onBack={() => navigateTo('gym')}
          onAddService={() => {
            setEditingServicePlan(null);
            navigateTo('addGymService');
          }}
          onEditService={(service) => {
            setEditingServicePlan(service);
            navigateTo('addGymService');
          }}
        />
      )}
      {view === 'addGymService' && (
        <AddGymServiceScreen
          editingService={editingServicePlan}
          onBack={() => navigateTo('gymServices')}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('gymServices');
          }}
        />
      )}

      {/* Batch Management */}
      {view === 'batches' && (
        <BatchesScreen
          key={refreshKey}
          onBack={() => navigateTo('gym')}
          onAddBatch={() => {
            setEditingBatch(null);
            navigateTo('addBatch');
          }}
          onEditBatch={(batch) => {
            setEditingBatch(batch);
            navigateTo('addBatch');
          }}
        />
      )}
      {view === 'addBatch' && (
        <AddBatchScreen
          editingBatch={editingBatch}
          onBack={() => navigateTo('batches')}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('batches');
          }}
        />
      )}

      {/* Workout Plans */}
      {view === 'workoutPlans' && (
        <WorkoutPlansScreen
          key={refreshKey}
          onBack={() => navigateTo('gym')}
          onAddPlan={() => {
            setEditingWorkoutPlan(null);
            navigateTo('addWorkoutPlan');
          }}
          onEditPlan={(plan) => {
            setEditingWorkoutPlan(plan);
            navigateTo('addWorkoutPlan');
          }}
        />
      )}
      {view === 'addWorkoutPlan' && (
        <AddWorkoutPlanScreen
          editingPlan={editingWorkoutPlan}
          onBack={() => navigateTo('workoutPlans')}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('workoutPlans');
          }}
        />
      )}

      {/* Diet Plans */}
      {view === 'dietPlans' && (
        <DietPlansScreen
          key={refreshKey}
          onBack={() => navigateTo('gym')}
          onAddPlan={() => {
            setEditingDietPlan(null);
            navigateTo('addDietPlan');
          }}
          onEditPlan={(plan) => {
            setEditingDietPlan(plan);
            navigateTo('addDietPlan');
          }}
        />
      )}
      {view === 'addDietPlan' && (
        <AddDietPlanScreen
          editingPlan={editingDietPlan}
          onBack={() => navigateTo('dietPlans')}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('dietPlans');
          }}
        />
      )}

      {/* Team Members */}
      {view === 'teamMembers' && (
        <TeamMembersScreen
          key={refreshKey}
          onBack={() => navigateTo('gym')}
          onAddTeamMember={() => {
            setEditingTeamMember(null);
            navigateTo('addTeamMember');
          }}
          onEditTeamMember={(member) => {
            setEditingTeamMember(member);
            navigateTo('addTeamMember');
          }}
        />
      )}
      {view === 'addTeamMember' && (
        <AddTeamMemberScreen
          editingMember={editingTeamMember}
          onBack={() => navigateTo('teamMembers')}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
            navigateTo('teamMembers');
          }}
        />
      )}
    </View>
  );
}
