import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired or tampered token should not leave the app in a half-signed-in
    // state — clear it and send the user back to the login form.
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Turns any axios failure into a sentence worth showing a user.
 * Network errors are the common case in local dev (server not started), so they
 * get a specific hint rather than "Network Error".
 */
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error.response) {
    return error.response.data?.message || fallback;
  }
  if (error.request) {
    return "Cannot reach the server. Make sure it is running on port 5000.";
  }
  return error.message || fallback;
}

export default api;
