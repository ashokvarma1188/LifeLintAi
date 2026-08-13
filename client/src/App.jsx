import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./landing/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import FindHospitals from "./pages/FindHospitals";
import HealthRecords from "./pages/HealthRecords";
import AdminConsole from "./pages/AdminConsole";
import RoleSettings from "./pages/RoleSettings";
import HospitalPatients from "./pages/HospitalPatients";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Signed in, any role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/role"
            element={
              <ProtectedRoute>
                <RoleSettings />
              </ProtectedRoute>
            }
          />

          {/* Civilian features */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find-hospitals"
            element={
              <ProtectedRoute>
                <FindHospitals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health-records"
            element={
              <ProtectedRoute>
                <HealthRecords />
              </ProtectedRoute>
            }
          />

          {/* Role-restricted */}
          <Route
            path="/hospital/patients"
            element={
              <ProtectedRoute roles={["hospital"]}>
                <HospitalPatients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminConsole />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
