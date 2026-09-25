import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import AcademicYears from '../pages/masters/AcademicYears';
import { Grades, Sections } from '../pages/masters/GenericMasters';
import { FeeCategories, PaymentModes, LateFeeRules, DiscountTypes } from '../pages/masters/FinancialMasters';
import { ApplicationSettings, SchoolInformation } from '../pages/masters/SettingsMasters';
import StudentList from '../pages/students/StudentList';
import StudentAdmission from '../pages/students/StudentAdmission';
import StudentProfile from '../pages/students/StudentProfile';
import FeeAssignmentPage from '../pages/finance/FeeAssignmentPage';
import FeeCollectionPage from '../pages/finance/FeeCollectionPage';
import PaymentHistoryPage from '../pages/finance/PaymentHistoryPage';
import ReportsPage from '../pages/reports/ReportsPage';
import SettingsPage from '../pages/admin/SettingsPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';
import ProfilePage from '../pages/admin/ProfilePage';
import ArtifactsPage from '../pages/artifacts/ArtifactsPage';
import HallTicketPage from '../pages/hallTickets/HallTicketPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Master routes */}
          <Route path="/master/academic-years" element={<AcademicYears />} />
          <Route path="/master/grades" element={<Grades />} />
          <Route path="/master/sections" element={<Sections />} />
          <Route path="/master/fee-categories" element={<FeeCategories />} />
          <Route path="/master/payment-modes" element={<PaymentModes />} />
          <Route path="/master/late-fee-rules" element={<LateFeeRules />} />
          <Route path="/master/discount-types" element={<DiscountTypes />} />
          <Route path="/master/application-settings" element={<ApplicationSettings />} />
          <Route path="/master/school-information" element={<SchoolInformation />} />
          
          {/* Student routes */}
          <Route path="/students" element={<StudentList />} />
          <Route path="/students/new" element={<StudentAdmission />} />
          <Route path="/students/:id" element={<StudentProfile />} />
          
          {/* Finance routes */}
          <Route path="/finance/fee-assignments" element={<FeeAssignmentPage />} />
          <Route path="/finance/fee-collection" element={<FeeCollectionPage />} />
          <Route path="/finance/payment-history" element={<PaymentHistoryPage />} />
          
          {/* Reports route */}
          <Route path="/reports" element={<ReportsPage />} />
          
          {/* Artifacts & Documents route */}
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/hall-tickets" element={<HallTicketPage />} />
          
          {/* Admin routes */}
          <Route path="/admin/settings" element={<SettingsPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
