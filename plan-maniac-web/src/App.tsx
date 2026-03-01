import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AppProvider, useApp } from './stores/AppContext';
import AppLayout from './components/Layout/AppLayout';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import Today from './pages/Today/Today';
import PlanChat from './pages/PlanChat/PlanChat';
import Chat from './pages/Chat/Chat';
import Profile from './pages/Profile/Profile';
import DayDetail from './pages/DayDetail/DayDetail';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useApp();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isLoggedIn } = useApp();

  return (
    <Routes>
      {/* Landing page - public */}
      <Route
        path="/"
        element={isLoggedIn ? <Navigate to="/home" replace /> : <Landing />}
      />

      {/* Login page - public */}
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/home" replace /> : <Login />}
      />

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<Home />} />
        <Route path="/day/:date" element={<DayDetail />} />
        <Route path="/today" element={<Today />} />
        <Route path="/plan-chat" element={<PlanChat />} />
        <Route path="/chat/:category" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
      }}
    >
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ConfigProvider>
  );
}

export default App;
