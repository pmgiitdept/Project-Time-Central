// pages/ViewerDashboard.jsx
import { useState } from "react";
import FileTable from "../components/FileTable";
import LogoutButton from "../components/LogoutButton";
import FileContent from "../components/FileContent";
import "./../components/styles/ViewerDashboard.css";

export default function ViewerDashboard() {
  // Store both ID and filename of the selected file
  const [selectedFile, setSelectedFile] = useState(null);

  // Set the role here: 'viewer' or 'admin'
  const role = "viewer";

  return (
    <div className="dashboard-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/src/pmgi.png" alt="Logo" className="navbar-logo" />
          <h1 className="navbar-title">Viewer Dashboard</h1>
        </div>
        <div className="navbar-right">
          <img src="/src/sgslogos.png" alt="Right Logo" className="navbar-logo" />
          <LogoutButton />
        </div>
      </nav>

      {/* Content Section */}
      <div className="content-section">
        {/* Pass role and setSelectedFile to FileTable */}
        <FileTable role={role} setSelectedFile={setSelectedFile} />

        {selectedFile && (
          <div className="file-content-card">
            <h2 className="file-content-title">
              File Preview: {selectedFile.name}
            </h2>
            {/* Pass role to FileContent */}
            <FileContent fileId={selectedFile.id} role={role} />
          </div>
        )}
      </div>
    </div>
  );
}
