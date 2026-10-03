import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { LiveProvider } from './context/LiveContext';
import { ThemeProvider } from './context/ThemeContext';

import RequireAuth from './components/RequireAuth';
import RequireOwner from './components/RequireOwner';
import RequireCapability from './components/RequireCapability';
import RequireCeo from './components/RequireCeo';
import RequireService from './components/RequireService';

import Layout from './components/Layout';

import Landing from './pages/Landing';
import About from './pages/About';
import Guide from './pages/Guide';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';

import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Service from './pages/Service';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Liabilities from './pages/Liabilities';
import Expenses from './pages/Expenses';
import Workers from './pages/Workers';
import Attendance from './pages/Attendance';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import BranchCreate from './pages/BranchCreate';
import ReceiptSetup from './pages/ReceiptSetup';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LiveProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              <Route
                path="/app"
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route index element={<Dashboard />} />

                <Route path="inventory" element={<Inventory />} />

                <Route
                  path="service"
                  element={
                    <RequireService>
                      <Service />
                    </RequireService>
                  }
                />

                <Route path="sales" element={<Sales />} />

                <Route
                  path="reports"
                  element={
                    <RequireCapability capability="view_financial_reports">
                      <Reports />
                    </RequireCapability>
                  }
                />

                <Route
                  path="liabilities"
                  element={
                    <RequireCapability capability="manage_liabilities">
                      <Liabilities />
                    </RequireCapability>
                  }
                />

                <Route
                  path="expenses"
                  element={
                    <RequireCapability capability="manage_expenses">
                      <Expenses />
                    </RequireCapability>
                  }
                />

                <Route
                  path="workers"
                  element={
                    <RequireOwner>
                      <Workers />
                    </RequireOwner>
                  }
                />

                <Route path="attendance" element={<Attendance />} />

                <Route
                  path="billing"
                  element={
                    <RequireCeo>
                      <Billing />
                    </RequireCeo>
                  }
                />

                <Route
                  path="settings"
                  element={
                    <RequireOwner>
                      <Settings />
                    </RequireOwner>
                  }
                />

                <Route
                  path="branches/new"
                  element={
                    <RequireCeo>
                      <BranchCreate />
                    </RequireCeo>
                  }
                />

                <Route
                  path="receipt-setup"
                  element={
                    <RequireCeo>
                      <ReceiptSetup />
                    </RequireCeo>
                  }
                />
              </Route>
            </Routes>
          </LiveProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
                }
