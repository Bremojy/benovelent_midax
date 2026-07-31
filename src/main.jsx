import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import App from "./App.jsx";

import {
  SocketProvider,
} from "./context/SocketContext.jsx";

import {
  AuthProvider,
} from "./context/AuthContext.jsx";

import "./index.css";
import "./App.css";

createRoot(
  document.getElementById("root")
).render(

  <StrictMode>

    <AuthProvider>

      <SocketProvider>

        <App />

      </SocketProvider>

    </AuthProvider>

  </StrictMode>

);