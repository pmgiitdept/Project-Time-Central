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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
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
  const [fileStats, setFileStats] = useState([]); 
  const [userStats, setUserStats] = useState([]); 
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({ maxFileSize: 50, allowedTypes: ["pdf", "docx"] });

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);

  const [fileTimeFilter, setFileTimeFilter] = useState("day");
  const [userTimeFilter, setUserTimeFilter] = useState("day");

  const role = "admin";

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { key: "files", label: "Files", icon: <FaFileAlt /> },
    { key: "users", label: "Users", icon: <FaUsers /> },
    { key: "audit", label: "Audit Logs", icon: <FaClipboardList /> },
    { key: "reports", label: "Reports", icon: <FaChartBar /> },
    { key: "settings", label: "Settings", icon: <FaCog /> },
  ];
  
  const [timeFilter, setTimeFilter] = useState("monthly");

  const fetchFileStats = async (period = "day") => {
    try {
      const response = await api.get(`/file-stats/?period=${period}`);
      const formatted = response.data.map(item => ({
        ...item,
        period: new Date(item.period).toLocaleDateString(), 
      }));
      setFileStats(formatted);
    } catch (error) {
      console.error("Error fetching file stats:", error);
    }
  };

  const fetchUserStats = async (period = "day") => {
    try {
      const response = await api.get(`/user-stats/?period=${period}`);
      const formatted = response.data.map(item => ({
        ...item,
        period: new Date(item.period).toLocaleDateString(), 
      }));
      setUserStats(formatted);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

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
      const sortedUsers = response.data.sort((a, b) => {
        if (!a.last_login) return 1;  
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
    fetchFileStats("day");
  }, []);

  useEffect(() => {
    fetchUserStats(timeFilter);
    if (timeFilter === "daily") fetchFileStats("day");
    if (timeFilter === "weekly") fetchFileStats("week");
    if (timeFilter === "monthly") fetchFileStats("month");
  }, [timeFilter]);

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

  const updateSettings = () => {
    api.put("/files/settings/", settings)
      .then(() => alert("Settings updated successfully."))
      .catch(err => console.error("Error updating settings:", err));
  };

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
            <div className="dashboard-overview space-y-6">
              <h2 className="text-2xl font-bold">Overview</h2>

              {/* Top Cards */}
              <div className="cards grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-4 rounded-2xl shadow bg-white flex items-center">
                  <div className="card-icon text-orange-400 text-3xl"><FaFileAlt /></div>
                  <div className="card-info ml-3">
                    <h3 className="text-lg font-semibold">Files Pending</h3>
                    <p className="text-xl">{stats.filesPending || 0}</p>
                  </div>
                </div>

                <div className="card p-4 rounded-2xl shadow bg-white flex items-center">
                  <div className="card-icon text-green-500 text-3xl"><FaCheckCircle /></div>
                  <div className="card-info ml-3">
                    <h3 className="text-lg font-semibold">Files Verified</h3>
                    <p className="text-xl">{stats.filesApproved || 0}</p>
                  </div>
                </div>

                <div className="card p-4 rounded-2xl shadow bg-white flex items-center">
                  <div className="card-icon text-blue-500 text-3xl"><FaUsers /></div>
                  <div className="card-info ml-3">
                    <h3 className="text-lg font-semibold">Users</h3>
                    <p className="text-xl">{users.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="charts-section">
                {/* Files Overview Chart */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Files Overview</h3>
                    <div className="filters">
                      <label className="filters-label">View By:</label>
                      <select
                        value={fileTimeFilter}
                        onChange={(e) => {
                          setFileTimeFilter(e.target.value);
                          fetchFileStats(e.target.value);
                        }}
                        className="filters-select"
                      >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={fileStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="pending" stroke="#f6ad55" />
                      <Line type="monotone" dataKey="verified" stroke="#48bb78" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Users Overview Chart */}
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Users Overview</h3>
                    <div className="filters">
                      <label className="filters-label">View By:</label>
                      <select
                        value={userTimeFilter}
                        onChange={(e) => {
                          setUserTimeFilter(e.target.value);
                          fetchUserStats(e.target.value); 
                        }}
                        className="filters-select"
                      >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="active" fill="#4299e1" />
                    </BarChart>
                  </ResponsiveContainer>
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
                              user.role === "admin" ? "blue" :
                              user.role === "client" ? "green" :
                              user.role === "viewer" ? "orange" : "#ccc",
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