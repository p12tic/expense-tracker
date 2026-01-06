import "./index.css";
import "./boot_override.scss";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import {AuthProvider} from "./utils/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </AuthProvider>,
);
