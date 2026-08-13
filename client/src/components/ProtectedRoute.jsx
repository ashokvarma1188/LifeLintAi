import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, getUser } from "../services/auth";

const normaliseRole = (role) => (role === "citizen" || !role ? "civilian" : role);

/**
 * Gates a route behind a stored token, remembering where the user was going.
 *
 * `roles` optionally restricts the route to specific roles; organisation
 * accounts must also be approved, otherwise they are sent back to the
 * dashboard where the pending banner explains why.
 */
function ProtectedRoute({ children, roles }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles) {
    const user = getUser() || {};

    if (!roles.includes(normaliseRole(user.role))) {
      return <Navigate to="/dashboard" replace />;
    }

    if ((user.roleStatus || "approved") !== "approved") {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
