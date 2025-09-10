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
  FaUserClock,
  FaUserShield, 
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import FileTable from "../components/FileTable";
import FileContent from "../components/FileContent";
import LogoutButton from "../components/LogoutButton";
import "../components/styles/AdminDashboard.css"; 
import api from "../api";
import jsPDF from "jspdf";
import "jspdf-autotable";

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
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [originalSettings, setOriginalSettings] = useState({});

  const [settingsId, setSettingsId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;
  const [fileTimeFilter, setFileTimeFilter] = useState("day");
  const [userTimeFilter, setUserTimeFilter] = useState("day");
  const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });

  const role = "admin";

  const activeThisWeek = users.filter(u => u.is_active).length;
  const inactiveUsers = users.filter(u => !u.is_active);
  const rolesData = [
    { name: "Admin", value: users.filter(u => u.role === "admin").length },
    { name: "Client", value: users.filter(u => u.role === "client").length },
    { name: "Viewer", value: users.filter(u => u.role === "viewer").length },
  ];
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { key: "files", label: "Files", icon: <FaFileAlt /> },
    { key: "users", label: "Users", icon: <FaUsers /> },
    { key: "audit", label: "Audit Logs", icon: <FaClipboardList /> },
    { key: "reports", label: "Reports", icon: <FaChartBar /> },
    { key: "settings", label: "Settings", icon: <FaCog /> },
  ];
  
  const sortedLogs = [...auditLogs].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];

    if (sortConfig.key === "timestamp") {
      return sortConfig.direction === "asc"
        ? new Date(valA) - new Date(valB)
        : new Date(valB) - new Date(valA);
    }

    if (typeof valA === "string" && typeof valB === "string") {
      return sortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const [timeFilter, setTimeFilter] = useState("monthly");
  
  const handleDownloadLogs = () => {
    const filteredLogs = sortedLogs.filter((log) => {
      const matchesSearch =
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = actionFilter ? log.action === actionFilter : true;
      const matchesRole = roleFilter ? log.role === roleFilter : true;
      const matchesStatus = statusFilter ? (log.status || "success") === statusFilter : true;

      const logDate = new Date(log.timestamp);
      const matchesDate =
        (!startDate || logDate >= new Date(startDate)) &&
        (!endDate || logDate <= new Date(endDate));

      return matchesSearch && matchesAction && matchesRole && matchesStatus && matchesDate;
    });

    const headers = ["User", "Role", "Action", "Status", "IP", "Timestamp"];
    const rows = filteredLogs.map((log) => [
      log.user,
      log.role || "-",
      log.action,
      log.status || "success",
      log.ip_address || "N/A",
      new Date(log.timestamp).toLocaleString(),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    const response = await api.get("/settings/"); 
    if (response.data.length) {
      const s = response.data[0];
      setSettings({
        siteName: s.site_name,
        maxFileSize: s.max_file_size,
        allowedTypes: s.allowed_types,
        retentionDays: s.retention_days || 30,
        requireVerification: s.require_verification || false,
        autoArchive: s.auto_archive || false,
        defaultRole: s.default_role || "client",
        requirePasswordReset: s.require_password_reset || false,
        autoDisableInactive: s.auto_disable_inactive || 0,
        logDownloads: s.log_downloads || false,
        maxLoginAttempts: s.max_login_attempts || 5,
        enable2FA: s.enable_2fa || false
      });
      setSettingsId(s.id);
    } else {
      const defaultSettings = {
        site_name: "Project Time Central",
        max_file_size: 50,
        allowed_types: ["pdf", "docx"],
        retention_days: 30,
        require_verification: false,
        auto_archive: false,
        default_role: "client",
        require_password_reset: false,
        auto_disable_inactive: 0,
        log_downloads: false,
        max_login_attempts: 5,
        enable_2fa: false
      };
      const createResp = await api.post("/settings/", defaultSettings);
      const s = createResp.data;
      setSettings({
        siteName: s.site_name,
        maxFileSize: s.max_file_size,
        allowedTypes: s.allowed_types,
        retentionDays: s.retention_days,
        requireVerification: s.require_verification,
        autoArchive: s.auto_archive,
        defaultRole: s.default_role,
        requirePasswordReset: s.require_password_reset,
        autoDisableInactive: s.auto_disable_inactive,
        logDownloads: s.log_downloads,
        maxLoginAttempts: s.max_login_attempts,
        enable2FA: s.enable_2fa
      });
      setSettingsId(s.id);
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
  }
};

  const updateSettings = async () => {
    if (!settingsId) return alert("Settings ID not found.");

    try {
      const payload = {
        site_name: settings.siteName,
        max_file_size: settings.maxFileSize,
        allowed_types: settings.allowedTypes,
        retention_days: settings.retentionDays,
        require_verification: settings.requireVerification,
        auto_archive: settings.autoArchive,
        default_role: settings.defaultRole,
        require_password_reset: settings.requirePasswordReset,
        auto_disable_inactive: settings.autoDisableInactive,
        log_downloads: settings.logDownloads,
        max_login_attempts: settings.maxLoginAttempts,
        enable_2fa: settings.enable2FA
      };

      await api.put(`/files/settings/${settingsId}/`, payload);
      alert("Settings updated successfully!");
    } catch (err) {
      console.error("Error updating settings:", err.response?.data || err);
      alert("Failed to update settings. See console for details.");
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get("/audit-logs/");

      console.log("Audit logs fetched:", response.data);

      const logs = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data.results)
        ? response.data.results
        : [];

      const normalizedLogs = logs.map((log) => ({
        user: log.user || "Unknown",
        role: log.role || "-",
        action: log.action || "-",
        status: log.status || "success",
        ip_address: log.ip_address || "N/A",
        timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
      }));

      setAuditLogs(normalizedLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error.response?.data || error);
      setAuditLogs([]);
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
      await api.post("/auth/register/", { ...userData, password2: userData.password });
      fetchUsers();
      setShowAddUser(false);
    } catch (err) {
      console.error("Error adding user:", err.response?.data || err);
      alert("Error adding user: " + JSON.stringify(err.response?.data));
    }
  };

  const exportCSV = () => {
    if (!fileStats.length) return alert("No data to export");

    const headers = ["Date", "Pending Files", "Verified Files"];
    const rows = fileStats.map(item => [
      item.period,
      item.pending,
      item.verified
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "files_report.csv");
    link.click();
  };

  const exportPDF = () => {
    if (!fileStats.length) return alert("No data to export");

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Files Report", 14, 22);

    const tableColumn = ["Date", "Pending Files", "Verified Files"];
    const tableRows = fileStats.map(item => [
      item.period,
      item.pending,
      item.verified
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save("files_report.pdf");
  };

  const AddUserModal = ({ onClose, onCreate }) => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("client"); 

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!username || !email || !password) {
        alert("All fields are required");
        return;
      }
      if (!["admin","client","viewer"].includes(role)) {
        alert("Invalid role selected");
        return;
      }
      onCreate({ username, email, password, password2: password, role });
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
                    <button className="btn-secondary" onClick={refreshLastLogin}>⟳ Refresh</button>
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
                    <option value="client">Client</option>
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
                                  user.role === "admin" ? "#1488FF" :
                                  user.role === "client" ? "#7e8d2a" :
                                  user.role === "viewer" ? "#1a18b3" : "#B0B0B0",
                                color: "#FFFFFF",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontWeight: "bold",
                                fontSize: "0.9rem",
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
                {/* Flexible Additional Container */}
                <div className="user-cards-container" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", marginTop: "1.5rem", flexWrap: "wrap", justifyContent: "center" }}>
                  {/* Active Users Card */}
                  <div className="card p-4 rounded-2xl shadow bg-white flex flex-col items-center" style={{ minWidth: "200px" }}>
                    <FaUserClock size={32} className="text-blue-500 mb-2" />
                    <h3 className="text-lg font-semibold">Active Users (Week)</h3>
                    <p className="text-xl font-bold">{activeThisWeek}</p>
                  </div>

                  {/* Pending Users Card */}
                  <div className="card p-4 rounded-2xl shadow bg-white flex flex-col items-center" style={{ minWidth: "200px" }}>
                    <FaUsers size={32} className="text-orange-400 mb-2" />
                    <h3 className="text-lg font-semibold">Inactive Users</h3>
                    <p className="text-xl font-bold">{inactiveUsers.length}</p>
                  </div>

                  {/* Role Distribution Card */}
                  <div className="card p-4 rounded-2xl shadow bg-white flex flex-col items-center" style={{ minWidth: "200px" }}>
                    <FaUserShield size={32} className="text-green-500 mb-2" />
                    <h3 className="text-lg font-semibold">Roles Distribution</h3>
                    <div style={{ width: "100%", height: 120 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={rolesData} dataKey="value" nameKey="name" innerRadius={25} outerRadius={35} paddingAngle={3}>
                            {rolesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
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

              {/* Stats Cards */}
              <div className="audit-cards grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4 rounded-2xl shadow bg-white">
                  <h3 className="text-lg font-semibold">Total Logs</h3>
                  <p className="text-xl font-bold">{auditLogs.length}</p>
                </div>
                <div className="card p-4 rounded-2xl shadow bg-white">
                  <h3 className="text-lg font-semibold">Logins Today</h3>
                  <p className="text-xl font-bold">
                    {auditLogs.filter(log =>
                      log.action === "login" &&
                      new Date(log.timestamp).toDateString() === new Date().toDateString()
                    ).length}
                  </p>
                </div>
                <div className="card p-4 rounded-2xl shadow bg-white">
                  <h3 className="text-lg font-semibold">File Actions</h3>
                  <p className="text-xl font-bold">
                    {auditLogs.filter(log =>
                      ["upload","delete","update"].includes(log.action)
                    ).length}
                  </p>
                </div>
                <div className="card p-4 rounded-2xl shadow bg-white">
                  <h3 className="text-lg font-semibold">Errors</h3>
                  <p className="text-xl font-bold text-red-500">
                    {auditLogs.filter(log => log.status === "failed").length}
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="audit-filters flex flex-wrap gap-3 mb-4 items-center">
                <input
                  type="text"
                  placeholder="Search by user or action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="p-2 flex-1 border rounded"
                />

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">All Actions</option>
                  <option value="login">Login</option>
                  <option value="upload">File Upload</option>
                  <option value="delete">File Delete</option>
                  <option value="update">Update</option>
                </select>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                  <option value="viewer">Viewer</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>

                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />

                <button
                  onClick={handleDownloadLogs}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <FaDownload className="inline mr-2" /> Download CSV
                </button>
              </div>

              {/* Audit Logs Chart */}
              <div className="chart-card mb-6">
                <h3 className="mb-2 font-semibold">Logs Activity</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={Object.values(
                      auditLogs.reduce((acc, log) => {
                        const date = new Date(log.timestamp).toLocaleDateString();
                        if (!acc[date]) acc[date] = { date, count: 0 };
                        acc[date].count += 1;
                        return acc;
                      }, {})
                    )}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3182ce" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Logs Table */}
              <div className="audit-table-wrapper">
                <table className="audit-table w-full border-collapse">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("user")}>User</th>
                      <th onClick={() => handleSort("role")}>Role</th>
                      <th onClick={() => handleSort("action")}>Action</th>
                      <th onClick={() => handleSort("status")}>Status</th>
                      <th onClick={() => handleSort("ip_address")}>IP</th>
                      <th onClick={() => handleSort("timestamp")}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLogs
                      .filter((log) => {
                        const matchesSearch =
                          log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchQuery.toLowerCase());

                        const matchesAction = actionFilter ? log.action === actionFilter : true;
                        const matchesRole = roleFilter ? log.role === roleFilter : true;
                        const matchesStatus = statusFilter ? (log.status || "success") === statusFilter : true;

                        const logDate = new Date(log.timestamp);
                        const matchesDate =
                          (!startDate || logDate >= new Date(startDate)) &&
                          (!endDate || logDate <= new Date(endDate));

                        return matchesSearch && matchesAction && matchesRole && matchesStatus && matchesDate;
                      })
                      .slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage)
                      .map((log, idx) => (
                        <tr key={idx}>
                          <td>{log.user}</td>
                          <td>
                            <span
                              className={`role-badge ${
                                log.role === "admin"
                                  ? "admin"
                                  : log.role === "client"
                                  ? "client"
                                  : "viewer"
                              }`}
                            >
                              {log.role || "-"}
                            </span>
                          </td>
                          <td>{log.action}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                (log.status || "success") === "failed"
                                  ? "inactive"
                                  : "active"
                              }`}
                            >
                              {log.status || "success"}
                            </span>
                          </td>
                          <td>
                            <span className="ip-badge">{log.ip_address || "N/A"}</span>
                          </td>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="pagination-controls flex justify-center mt-4 gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </button>
                <span>Page {currentPage}</span>
                <button
                  className="btn-secondary"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      prev * logsPerPage < auditLogs.length ? prev + 1 : prev
                    )
                  }
                  disabled={currentPage * logsPerPage >= auditLogs.length}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Reports Section */}
          {activeSection === "reports" && (
            <div className="reports">
              <h2>Reports</h2>

              <div className="report-filters mb-4 flex gap-2">
                <label>Period:</label>
                <select
                  value={fileTimeFilter}
                  onChange={(e) => setFileTimeFilter(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>

              <button className="report-btn" onClick={() => exportCSV}>
                <FaDownload /> Export CSV
              </button>
              <button className="report-btn" onClick={() => exportPDF}>
                <FaDownload /> Export PDF
              </button>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === "settings" && (
            <div className="settings-wrapper">
              <div className="settings-container p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Upload Settings Card */}
                <div className="settings-card p-4 rounded-2xl shadow bg-white">
                  <h3 className="text-lg font-semibold mb-4">File Upload Settings</h3>
                  <div className="flex flex-col gap-3">
                    <label>
                      Max file size (MB):
                      <input
                        type="number"
                        value={settings.maxFileSize || 50}
                        onChange={e => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) || 0 })}
                        className="ml-2 border rounded px-2 py-1 w-full"
                      />
                    </label>

                    <label>
                      Allowed file types (comma separated):
                      <input
                        type="text"
                        value={settings.allowedTypes ? settings.allowedTypes.join(",") : ""}
                        onChange={e => setSettings({ ...settings, allowedTypes: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                        className="ml-2 border rounded px-2 py-1 w-full"
                      />
                    </label>

                    <label>
                      File retention period (days):
                      <input
                        type="number"
                        value={settings.retentionDays || 30}
                        onChange={e => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 0 })}
                        className="ml-2 border rounded px-2 py-1 w-full"
                      />
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.requireVerification || false}
                        onChange={e => setSettings({ ...settings, requireVerification: e.target.checked })}
                      />
                      Require verification before download
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.autoArchive || false}
                        onChange={e => setSettings({ ...settings, autoArchive: e.target.checked })}
                      />
                      Auto-archive verified files
                    </label>
                  </div>
                </div>

                {/* User Management Settings Card */}
                <div className="settings-card p-4 rounded-2xl shadow bg-white">
                  <h3 className="text-lg font-semibold mb-4">User Management</h3>
                  <div className="flex flex-col gap-3">
                    <label>
                      Default role for new users:
                      <select
                        value={settings.defaultRole || "client"}
                        onChange={e => setSettings({ ...settings, defaultRole: e.target.value })}
                        className="ml-2 border rounded px-2 py-1 w-full"
                      >
                        <option value="admin">Admin</option>
                        <option value="client">Client</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.requirePasswordReset || false}
                        onChange={e => setSettings({ ...settings, requirePasswordReset: e.target.checked })}
                      />
                      Require password reset on first login
                    </label>

                    <label>
                      Auto-disable inactive users (days):
                      <input
                        type="number"
                        value={settings.autoDisableInactive || 0}
                        onChange={e => setSettings({ ...settings, autoDisableInactive: parseInt(e.target.value) || 0 })}
                        className="ml-2 border rounded px-2 py-1 w-full"
                      />
                    </label>
                  </div>
                </div>

                {/* Audit & Security Settings Card */}
                <div className="settings-card p-4 rounded-2xl shadow bg-white md:col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Audit & Security</h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.logDownloads || false}
                        onChange={e => setSettings({ ...settings, logDownloads: e.target.checked })}
                      />
                      Log file downloads
                    </label>

                    <label>
                      Max login attempts:
                      <input
                        type="number"
                        value={settings.maxLoginAttempts || 5}
                        onChange={e => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 0 })}
                        className="ml-2 border rounded px-2 py-1 w-full"
                      />
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.enable2FA || false}
                        onChange={e => setSettings({ ...settings, enable2FA: e.target.checked })}
                      />
                      Enable 2FA for admin users
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <div className="md:col-span-2 flex justify-end">
                  <button
                    onClick={updateSettings}
                    className="btn-primary px-6 py-2 rounded-lg"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}