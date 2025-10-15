import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/authStore";
import AppLayout from "./AppLayout";

export default function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

