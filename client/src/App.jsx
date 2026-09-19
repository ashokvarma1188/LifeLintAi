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
import IncomingPatients from "./pages/IncomingPatients";
import HospitalBeds from "./pages/HospitalBeds";
import PoliceAlerts from "./pages/PoliceAlerts";
import FirestationAlerts from "./pages/FirestationAlerts";
import PharmacyStock from "./pages/PharmacyStock";
import AiAssistantWidget from "./components/AiAssistantWidget";
import { isAuthenticated } from "./services/auth";

/** Available to every signed-in role — first-aid guidance is useful for staff too, not just civilians. */
function SignedInAssistant() {
  if (!isAuthenticated()) return null;
  return <AiAssistantWidget />;
}

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
            path="/hospital/incoming"
            element={
              <ProtectedRoute roles={["hospital"]}>
                <IncomingPatients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hospital/beds"
            element={
              <ProtectedRoute roles={["hospital"]}>
                <HospitalBeds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/police/alerts"
            element={
              <ProtectedRoute roles={["police"]}>
                <PoliceAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/firestation/alerts"
            element={
              <ProtectedRoute roles={["firestation"]}>
                <FirestationAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy/stock"
            element={
              <ProtectedRoute roles={["pharmacy"]}>
                <PharmacyStock />
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
        <SignedInAssistant />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
