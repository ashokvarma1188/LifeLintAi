import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import LanguageProvider from "./i18n/LanguageProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import FirstAidGuide from "./pages/FirstAidGuide";
import OfflineBanner from "./components/OfflineBanner";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";
import { isAuthenticated } from "./services/auth";

// Each page downloads only when it's opened, so the first visit is fast. The First-Aid Guide
// stays in the main bundle because it has to open with no internet.
const Landing = lazy(() => import("./landing/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const FindHospitals = lazy(() => import("./pages/FindHospitals"));
const HealthRecords = lazy(() => import("./pages/HealthRecords"));
const AdminConsole = lazy(() => import("./pages/AdminConsole"));
const RoleSettings = lazy(() => import("./pages/RoleSettings"));
const HospitalPatients = lazy(() => import("./pages/HospitalPatients"));
const IncomingPatients = lazy(() => import("./pages/IncomingPatients"));
const HospitalBeds = lazy(() => import("./pages/HospitalBeds"));
const PoliceAlerts = lazy(() => import("./pages/PoliceAlerts"));
const FirestationAlerts = lazy(() => import("./pages/FirestationAlerts"));
const PharmacyStock = lazy(() => import("./pages/PharmacyStock"));
const BloodDonation = lazy(() => import("./pages/BloodDonation"));
const FindPharmacies = lazy(() => import("./pages/FindPharmacies"));
const FindEmergencyServices = lazy(() => import("./pages/FindEmergencyServices"));
const EmergencyNumbers = lazy(() => import("./pages/EmergencyNumbers"));
const SosHistory = lazy(() => import("./pages/SosHistory"));
const Medicines = lazy(() => import("./pages/Medicines"));
const SafeWalk = lazy(() => import("./pages/SafeWalk"));
const WalkTrack = lazy(() => import("./pages/WalkTrack"));
const MedicalId = lazy(() => import("./pages/MedicalId"));
const Privacy = lazy(() => import("./landing/pages/Privacy"));
const Terms = lazy(() => import("./landing/pages/Terms"));
const Cookies = lazy(() => import("./landing/pages/Cookies"));
const Faq = lazy(() => import("./landing/pages/Faq"));
const Organizations = lazy(() => import("./landing/pages/Organizations"));
const Contact = lazy(() => import("./landing/pages/Contact"));
const DownloadApp = lazy(() => import("./landing/pages/DownloadApp"));
const Safety = lazy(() => import("./landing/pages/Safety"));
const Status = lazy(() => import("./landing/pages/Status"));
const Features = lazy(() => import("./landing/pages/Features"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const OrgProfile = lazy(() => import("./pages/OrgProfile"));
const Support = lazy(() => import("./pages/Support"));
const TrackSos = lazy(() => import("./pages/TrackSos"));
const PublicMedicalId = lazy(() => import("./pages/PublicMedicalId"));
const AiAssistantWidget = lazy(() => import("./components/AiAssistantWidget"));
const FaqAssistantWidget = lazy(() => import("./components/FaqAssistantWidget"));
const ReportReader = lazy(() => import("./pages/ReportReader"));
const SymptomChecker = lazy(() => import("./pages/SymptomChecker"));
const ControlRoom = lazy(() => import("./pages/ControlRoom"));
const HospitalCamps = lazy(() => import("./pages/HospitalCamps"));
const FirstAidCourse = lazy(() => import("./pages/FirstAidCourse"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AUTH_PAGE_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/track/", "/id/", "/walk-track/", "/verify/", "/control-room"];

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
    <Suspense fallback={null}>
      <AiAssistantWidget
        open={openWidget === "ai"}
        onToggle={() => setOpenWidget((w) => (w === "ai" ? null : "ai"))}
      />
      <FaqAssistantWidget
        open={openWidget === "faq"}
        onToggle={() => setOpenWidget((w) => (w === "faq" ? null : "faq"))}
      />
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
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

                {/* Public, token-protected pages opened from a shared SOS link / a scanned Medical ID QR code */}
                <Route path="/track/:token" element={<TrackSos />} />
                <Route path="/id/:token" element={<PublicMedicalId />} />
                <Route path="/walk-track/:token" element={<WalkTrack />} />
                <Route path="/verify/:code" element={<VerifyCertificate />} />

                {/* Public and offline-capable — bundled content, no API calls */}
                <Route path="/first-aid" element={<FirstAidGuide />} />

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
                  path="/walk"
                  element={
                    <ProtectedRoute>
                      <SafeWalk />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medicines"
                  element={
                    <ProtectedRoute>
                      <Medicines />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report-reader"
                  element={
                    <ProtectedRoute>
                      <ReportReader />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/symptom-checker"
                  element={
                    <ProtectedRoute>
                      <SymptomChecker />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/first-aid-course"
                  element={
                    <ProtectedRoute>
                      <FirstAidCourse />
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
                  path="/hospital/camps"
                  element={
                    <ProtectedRoute roles={["hospital"]}>
                      <HospitalCamps />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/control-room"
                  element={
                    <ProtectedRoute roles={["admin", "hospital", "police", "firestation"]}>
                      <ControlRoom />
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

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <SignedInAssistant />
            <OfflineBanner />
          </ErrorBoundary>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
