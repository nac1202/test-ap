import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MockLayout } from './components/layout/MockLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Redirect host.docker.internal to localhost (canonical URL)
if (
  typeof window !== 'undefined' &&
  window.location.hostname === 'host.docker.internal'
) {
  window.location.replace(
    window.location.href.replace('host.docker.internal', 'localhost')
  );
}

// Mock Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Notices from './pages/Notices';
import Notifications from './pages/Notifications';
import HotBiz from './pages/HotBiz';
import ChangePassword from './pages/ChangePassword';
import Users from './pages/settings/Users';
import Roles from './pages/settings/Roles';
import System from './pages/settings/System';
import Plugins from './pages/settings/Plugins';
import Audit from './pages/settings/Audit';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MockLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/hotbiz" element={<HotBiz />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/settings/users" element={<Users />} />
              <Route path="/settings/roles" element={<Roles />} />
              <Route path="/settings/system" element={<System />} />
              <Route path="/settings/plugins" element={<Plugins />} />
              <Route path="/settings/audit" element={<Audit />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
