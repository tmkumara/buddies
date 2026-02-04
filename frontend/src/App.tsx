import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import RequireAuth from './components/RequireAuth';
import RequirePermission from './components/RequirePermission';
import LoginPage from './pages/LoginPage';
import MePage from './pages/MePage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage';
import DashboardHome from './pages/DashboardHome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="me" element={<MePage />} />
            <Route
              path="admin/users"
              element={
                <RequirePermission permission="USER_READ">
                  <AdminUsersPage />
                </RequirePermission>
              }
            />
            <Route
              path="admin/roles"
              element={
                <RequirePermission permission="ROLE_READ">
                  <AdminRolesPage />
                </RequirePermission>
              }
            />
            <Route
              path="admin/permissions"
              element={
                <RequirePermission permission="PERMISSION_READ">
                  <AdminPermissionsPage />
                </RequirePermission>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
