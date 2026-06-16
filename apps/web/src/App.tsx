import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginForm } from "@/components/login-form";
import AuthPage from "./pages/AuthPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/auth/login" />} />
        <Route
          path="/auth/login"
          element={
            <AuthPage>
              <LoginForm className="w-97/100 max-w-150" />
            </AuthPage>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
