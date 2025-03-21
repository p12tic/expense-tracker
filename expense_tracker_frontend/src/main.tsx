import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import {AuthProvider} from "./utils/AuthContext";
import "./boot_override.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </AuthProvider>,
);
