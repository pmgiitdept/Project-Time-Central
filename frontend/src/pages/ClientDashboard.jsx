// pages/ClientDashboard.jsx
import { useState } from "react";
import FileTable from "../components/FileTable";
import FileUpload from "../components/FileUpload";
import LogoutButton from "../components/LogoutButton";
import "../components/styles/ClientDashboard.css"; 

export default function ClientDashboard() {
  const [refresh, setRefresh] = useState(false);
  const refreshFiles = () => setRefresh(!refresh);

  return (
    <div className="dashboard-container">
      {/* Navigation Bar */}
      <nav className="dashboard-navbar">
        <div className="navbar-left">
          <img src="/src/pmgi.png" alt="Left Logo" className="navbar-logo" />
          <h1 className="dashboard-title">Client Dashboard</h1>
        </div>
        <div className="navbar-right">
          <img src="/src/sgslogos.png" alt="Right Logo" className="navbar-logo" />
          <LogoutButton />
        </div>
      </nav>

      {/* Upload + Table side by side */}
      <div className="main-section">
        <div className="upload-section">
          <FileUpload refreshFiles={refreshFiles} />
        </div>

        <div className="table-section">
          <FileTable role="client" key={refresh} />
        </div>
      </div>
    </div>
  );
}
