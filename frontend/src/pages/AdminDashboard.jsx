// pages/AdminDashboard.jsx
import FileTable from "../components/FileTable";
import LogoutButton from "../components/LogoutButton";

export default function AdminDashboard() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Admin Dashboard</h1>
        <LogoutButton />
      </div>
      <FileTable role="admin" />
    </div>
  );
}
