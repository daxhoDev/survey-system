import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import AuthPage from "./pages/AuthPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "./pages/DashboardPage";
import { Toaster } from "sonner";
import Surveys from "./components/Surveys";
import SurveyAnsweringPage from "./pages/SurveyAnsweringPage";
import SurveyCreatePage from "./pages/SurveyCreatePage";
import SurveyDetailsPage from "./pages/SurveyDetailsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth/login" />} />
          <Route path="/auth" element={<AuthPage />}>
            <Route
              path="login"
              element={<LoginForm className="w-97/100 max-w-120" />}
            />
          </Route>
          <Route path="dashboard" element={<DashboardPage />}>
            <Route path="" element={<Surveys />} />
            <Route path="surveys/create" element={<SurveyCreatePage />} />
            <Route path="surveys/:slug" element={<SurveyDetailsPage />} />
          </Route>
          <Route path="surveys/:slug" element={<SurveyAnsweringPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
