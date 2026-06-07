import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SectionsList } from './pages/Sections/SectionsList';
import { SectionDetail } from './pages/Sections/SectionDetail';
import { TestsList } from './pages/Tests/TestsList';
import { TestPassing } from './pages/Tests/TestPassing';
import { ChecklistsList } from './pages/Checklists/ChecklistsList';
import { ChecklistDetail } from './pages/Checklists/ChecklistDetail';
import { FilesList } from './pages/Files/FilesList';
import { Logbook } from './pages/Logbook/Logbook';
import { AdminPanel } from './pages/Admin/AdminPanel';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { Layout } from './components/Layout/Layout';
import { useTheme } from './context/ThemeContext';
import { ChatWidget } from './components/Chat/ChatWidget';
import { Profile } from './pages/Profile/Profile';
import { ResetPassword } from './pages/ResetPassword';
import { FeedbackButton } from './components/Feedback/FeedbackButton';
import { PagedTestPassing } from './pages/Tests/PagedTestPassing';

const queryClient = new QueryClient();

// Компонент для кнопок (использует useLocation внутри Router)
function FloatingButtons() {
  const location = useLocation();
  const hideButtons = location.pathname === '/reset-password' || location.pathname === '/login';
  
  if (hideButtons) return null;
  
  return (
    <div className="fixed bottom-6 right-6 flex items-stretch gap-3 z-50">
      <ChatWidget />
      <FeedbackButton />
    </div>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <div className={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sections" element={<SectionsList />} />
                <Route path="/sections/:id" element={<SectionDetail />} />
                <Route path="/tests" element={<TestsList />} />
                <Route path="/tests/:id" element={<TestPassing />} />
                <Route path="/checklists" element={<ChecklistsList />} />
                <Route path="/checklists/:type" element={<ChecklistDetail />} />
                <Route path="/files" element={<FilesList />} />
                <Route path="/logbook" element={<Logbook />} />
                <Route path="/admin/*" element={<AdminPanel />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/tests/:id/paged" element={<PagedTestPassing />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          
          <FloatingButtons />
        </BrowserRouter>
      </QueryClientProvider>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
