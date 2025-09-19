import React from "react";
import ReactDOM from "react-dom/client";
import './index.css';
import App from './App.jsx';
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  // <React.StrictMode>  <-- remove this in dev
    <AuthProvider>
      <App />
    </AuthProvider>
  // </React.StrictMode>
);
