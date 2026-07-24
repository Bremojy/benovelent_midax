import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";

import "./App.css";


// ========================================
// PROTECTED ADMIN ROUTE
// ========================================

function ProtectedAdmin({ children }) {

  const token =
    localStorage.getItem("adminToken");

  if (!token) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }

  return children;

}


// ========================================
// APP
// ========================================

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* PUBLIC WEBSITE */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* ADMIN LOGIN */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* ADMIN DASHBOARD */}

        <Route
          path="/admin"
          element={

            <ProtectedAdmin>

              <AdminDashboard />

            </ProtectedAdmin>

          }
        />


        {/* UNKNOWN PAGE */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;