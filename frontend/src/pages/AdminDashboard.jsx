// pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { 
  FaTachometerAlt, 
  FaFileAlt, 
  FaUsers, 
  FaClipboardList, 
  FaChartBar, 
  FaCog, 
  FaCheckCircle, 
  FaTrash, 
  FaDownload 
} from "react-icons/fa";
import FileTable from "../components/FileTable";
import FileContent from "../components/FileContent";
import LogoutButton from "../components/LogoutButton";
import "../components/styles/AdminDashboard.css"; 
import api from "../api";

export default function AdminDashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({ maxFileSize: 50, allowedTypes: ["pdf", "docx"] });

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);

  const role = "admin";

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { key: "files", label: "Files", icon: <FaFileAlt /> },
    { key: "users", label: "Users", icon: <FaUsers /> },
    { key: "audit", label: "Audit Logs", icon: <FaClipboardList /> },
    { key: "reports", label: "Reports", icon: <FaChartBar /> },
    { key: "settings", label: "Settings", icon: <FaCog /> },
  ];

  const refreshLastLogin = () => {
    fetchUsers();
  };

  const handleRoleChange = (id, newRole) => {
    setUsers(prev =>
      prev.map(user => user.id === id ? { ...user, role: newRole } : user)
    );

    api.patch(`/auth/users/${id}/`, { role: newRole })
      .then(() => console.log("Role updated"))
      .catch(err => console.error("Error updating role:", err));
  };

  const handleStatusChange = (id, newStatus) => {
    const isActive = newStatus === "active";
    setUsers(prev =>
      prev.map(user => user.id === id ? { ...user, is_active: isActive } : user)
    );

    api.patch(`/auth/users/${id}/`, { is_active: isActive })
      .then(() => console.log("Status updated"))
      .catch(err => console.error("Error updating status:", err));
  };

  // Fetch functions
  const fetchDashboardStats = async () => {
    try {
      const response = await api.get("/dashboard-stats/");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/auth/users/");
      // Sort users by last_login descending
      const sortedUsers = response.data.sort((a, b) => {
        if (!a.last_login) return 1;  // no last_login goes last
        if (!b.last_login) return -1;
        return new Date(b.last_login) - new Date(a.last_login);
      });
      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get("settings/");
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get("audit-logs/");
      setAuditLogs(response.data);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchUsers();
    fetchSettings();
    fetchAuditLogs();
  }, []);

  // Users actions
  const deleteUser = (id) => {
    if (confirm("Are you sure you want to delete this user?")) {
      api.delete(`/auth/users/${id}/`)
        .then(() => setUsers(users.filter(u => u.id !== id)))
        .catch(err => console.error("Error deleting user:", err));
    }
  };

  const resetPassword = (id) => {
    api.post(`/auth/users/${id}/reset-password/`)
      .then(() => alert("Password reset successfully."))
      .catch(err => console.error("Error resetting password:", err));
  };

  const addUser = async (userData) => {
    try {
      await api.post("/auth/register/", userData);
      fetchUsers();
      setShowAddUser(false);
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  // Settings actions
  const updateSettings = () => {
    api.put("/files/settings/", settings)
      .then(() => alert("Settings updated successfully."))
      .catch(err => console.error("Error updating settings:", err));
  };

  // Reports
  const exportCSV = () => {
    api.get("/files-report/", { responseType: "blob", params: { format: "csv" } })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = "files_report.csv";
        a.click();
      })
      .catch(err => console.error("Error exporting CSV:", err));
  };

  const exportPDF = () => {
    api.get("/files-report/?format=pdf", { responseType: "blob" })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = "files_report.pdf";
        a.click();
      })
      .catch(err => console.error("Error exporting PDF:", err));
  };

  // Add User Modal component
  const AddUserModal = ({ onClose, onCreate }) => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("user");

    const handleSubmit = (e) => {
      e.preventDefault();
      onCreate({ username, email, password, role });
    };

    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Add New User</h3>
          <form onSubmit={handleSubmit} className="add-user-form">
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                placeholder="Enter username"
                required 
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Enter email"
                required 
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter password"
                required 
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="client">Client</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div className="modal-actions">
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/src/pmgi.png" alt="Logo Left" className="navbar-logo" />
          <h1 className="navbar-title">Admin Dashboard</h1>
        </div>
        <div className="navbar-right">
          <img src="/src/sgslogos.png" alt="Logo Right" className="navbar-logo" />
          <LogoutButton />
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Sidebar */}
        <div className={`sidebar ${sidebarOpen ? "" : "closed"}`}>
          <h3>Admin Menu</h3>
          <div className="sidebar-buttons">
            {sidebarItems.map(item => (
              <button
                key={item.key}
                className={`sidebar-btn ${activeSection === item.key ? "active" : ""}`}
                onClick={() => setActiveSection(item.key)}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar toggle */}
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(prev => !prev)}>➤</button>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Dashboard Overview */}
          {activeSection === "dashboard" && (
            <div className="dashboard-overview">
              <h2>Overview</h2>
              <div className="cards">
                <div className="card">
                  <div className="card-icon"><FaFileAlt /></div>
                  <div className="card-info">
                    <h3>Files Pending</h3>
                    <p>{stats.filesPending || 0}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon"><FaCheckCircle /></div>
                  <div className="card-info">
                    <h3>Files Verified</h3>
                    <p>{stats.filesApproved || 0}</p>
                  </div>
                </div>
                <div className="card">
                  <div className="card-icon"><FaUsers /></div>
                  <div className="card-info">
                    <h3>Users</h3>
                    <p>{users.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Files Section */}
          {activeSection === "files" && (
            <div className="tables-wrapper">
              <FileTable role={role} setSelectedFile={setSelectedFile} />
              {selectedFile && <FileContent fileId={selectedFile.id} role={role} />}
            </div>
          )}

          {/* Users Section */}
          {activeSection === "users" && (
          <div className="users-card">
            <div className="users-section">
              <div className="users-header">
                <h2>Users Management</h2>
                <div className="header-buttons">
                  <button className="btn-primary" onClick={() => setShowAddUser(true)}>+ Add User</button>
                  <button className="btn-secondary" onClick={refreshLastLogin}>⟳ Refresh Last Login</button>
                </div>
              </div>

              {/* Search & Filter */}
              <div className="users-search">
                <input
                  type="text"
                  placeholder="Search by name, email or role..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id} className="user-row">
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <select
                            className={`role-badge ${user.role.toLowerCase()}`}
                            style={{
                            backgroundColor:
                              user.role === "admin" ? "#1554db" :
                              user.role === "client" ? "#1d883d" :
                              user.role === "viewer" ? "#8fa831" : "#ccc",
                            color: "#fff"
                          }}
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="client">Client</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className={`status-badge ${user.is_active ? "active" : "inactive"}`}
                            value={user.is_active ? "active" : "inactive"}
                            onChange={(e) => handleStatusChange(user.id, e.target.value)}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td>{user.last_login ? new Date(user.last_login).toLocaleString() : "-"}</td>
                        <td className="actions-cell">
                          <button className="btn-secondary" onClick={() => resetPassword(user.id)}>Reset</button>
                          <button className="btn-danger" onClick={() => deleteUser(user.id)}><FaTrash /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {showAddUser && (
                <AddUserModal onClose={() => setShowAddUser(false)} onCreate={addUser} />
              )}
            </div>
          </div>
        )}

          {/* Audit Logs Section */}
          {activeSection === "audit" && (
            <div className="audit-logs">
              <h2>Audit Logs</h2>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.user}</td>
                      <td>{log.action}</td>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reports Section */}
          {activeSection === "reports" && (
            <div className="reports">
              <h2>Reports</h2>
              <button className="report-btn" onClick={exportCSV}><FaDownload /> Export CSV</button>
              <button className="report-btn" onClick={exportPDF}><FaDownload /> Export PDF</button>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === "settings" && (
            <div className="settings">
              <h2>Settings</h2>
              <div>
                <label>
                  Max file size (MB):
                  <input
                    type="number"
                    value={settings.maxFileSize}
                    onChange={e => setSettings({...settings, maxFileSize: e.target.value})}
                  />
                </label>
              </div>
              <div>
                <label>
                  Allowed file types (comma separated):
                  <input
                    type="text"
                    value={settings.allowedTypes.join(",")}
                    onChange={e => setSettings({...settings, allowedTypes: e.target.value.split(",")})}
                  />
                </label>
              </div>
              <button onClick={updateSettings}>Save Settings</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
