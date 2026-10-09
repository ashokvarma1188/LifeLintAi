import { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import BloodDonation from "./pages/BloodDonation";
import FindPharmacies from "./pages/FindPharmacies";
import FindEmergencyServices from "./pages/FindEmergencyServices";
import EmergencyNumbers from "./pages/EmergencyNumbers";
import SosHistory from "./pages/SosHistory";
import MedicalId from "./pages/MedicalId";
import Privacy from "./landing/pages/Privacy";
import Terms from "./landing/pages/Terms";
import Cookies from "./landing/pages/Cookies";
import Faq from "./landing/pages/Faq";
import Organizations from "./landing/pages/Organizations";
import Contact from "./landing/pages/Contact";
import DownloadApp from "./landing/pages/DownloadApp";
import Safety from "./landing/pages/Safety";
import Status from "./landing/pages/Status";
import Features from "./landing/pages/Features";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import OrgProfile from "./pages/OrgProfile";
import Support from "./pages/Support";
import TrackSos from "./pages/TrackSos";
import AiAssistantWidget from "./components/AiAssistantWidget";
import FaqAssistantWidget from "./components/FaqAssistantWidget";
import { isAuthenticated } from "./services/auth";

const AUTH_PAGE_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/track/"];

/**
 * Available to every signed-in role — first-aid guidance is useful for staff
 * too, not just civilians. Hidden on the auth pages even if a stale token is
 * still in localStorage (e.g. someone navigated back to /login without
 * logging out) — those pages only show the theme toggle.
 */
function SignedInAssistant() {
  const { pathname } = useLocation();
  // Only one of the two floating chat panels can be open at a time — both are
  // bottom-right and would overlap otherwise.
  const [openWidget, setOpenWidget] = useState(null);

  if (AUTH_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!isAuthenticated()) return null;

  return (
    <>
      <AiAssistantWidget
        open={openWidget === "ai"}
        onToggle={() => setOpenWidget((w) => (w === "ai" ? null : "ai"))}
      />
      <FaqAssistantWidget
        open={openWidget === "faq"}
        onToggle={() => setOpenWidget((w) => (w === "faq" ? null : "faq"))}
      />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />

          {/* Public marketing pages */}
          <Route path="/features" element={<Features />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/download" element={<DownloadApp />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/status" element={<Status />} />

          {/* Public, token-protected page opened from a shared SOS link */}
          <Route path="/track/:token" element={<TrackSos />} />

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
            path="/support"
            element={
              <ProtectedRoute>
                <Support />
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
          <Route
            path="/blood-donation"
            element={
              <ProtectedRoute>
                <BloodDonation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find-pharmacies"
            element={
              <ProtectedRoute>
                <FindPharmacies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find-emergency-services"
            element={
              <ProtectedRoute>
                <FindEmergencyServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emergency-numbers"
            element={
              <ProtectedRoute>
                <EmergencyNumbers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sos-history"
            element={
              <ProtectedRoute>
                <SosHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medical-id"
            element={
              <ProtectedRoute>
                <MedicalId />
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
            path="/org-profile"
            element={
              <ProtectedRoute roles={["hospital", "police", "firestation", "pharmacy"]}>
                <OrgProfile />
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
