// pages/ClientDashboard.jsx
import { useState } from "react";
import FileTable from "../components/FileTable";
import FileUpload from "../components/FileUpload";
import LogoutButton from "../components/LogoutButton";

export default function ClientDashboard() {
  const [refresh, setRefresh] = useState(false);
  const refreshFiles = () => setRefresh(!refresh);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Client Dashboard</h1>
        <LogoutButton />
      </div>
      <div style={{ margin: "1rem 0" }}>
        <FileUpload refreshFiles={refreshFiles} />
      </div>
      <FileTable role="client" key={refresh} />
    </div>
  );
}
