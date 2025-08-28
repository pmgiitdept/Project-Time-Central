// pages/ViewerDashboard.jsx
import FileTable from "../components/FileTable";
import LogoutButton from "../components/LogoutButton";
import FileContent from "../components/FileContent";
import { useState } from "react";

export default function ViewerDashboard() {
     const [selectedFileId, setSelectedFileId] = useState(null);
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Viewer Dashboard</h1>
        <LogoutButton />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <FileTable role="viewer" setSelectedFileId={setSelectedFileId} />
        {selectedFileId && <FileContent fileId={selectedFileId} />}
      </div>
    </div>
  );
}
