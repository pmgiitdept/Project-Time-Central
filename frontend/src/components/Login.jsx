// components/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";
import { MapPin, Phone, Globe, Instagram, Facebook } from "lucide-react";
import "./styles/Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("auth/login/", { username, password });

      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);

      toast.success(`Welcome ${res.data.username}!`);

      if (res.data.role === "admin") navigate("/admin");
      else if (res.data.role === "client") navigate("/client");
      else navigate("/viewer");
    } catch (err) {
      console.error(err);
      toast.error("Login failed. Check credentials.");
    }
  };

  return (
    <div className="login-container">
      {/* Navbar */}
      <nav className="login-navbar">
        <div className="navbar-left">
          <img src="/src/pmgi.png" alt="Logo" className="navbar-logo" />
          <div className="navbar-text">
            <h1>PROFESSIONAL MAINTENANCE GROUP, INC.</h1>
            <p><b>AN ISO 9001:2015 CERTIFIED COMPANY</b></p>
            <p>Certificate: PH18/818842652</p>
          </div>
        </div>
        <div className="navbar-right">
          <img src="/src/sgslogos.png" alt="Right Logo" className="navbar-logo" />
        </div>
      </nav>

      <img src="/src/ptc-logo.png" alt="App Logo" className="login-top-logo" />
      {/* Card */}
      <div className="login-card">
        {/* Keep the title here */}
        <h1 className="login-title">Welcome! Please log in</h1>

        <form onSubmit={handleLogin} className="login-form">
          {/* Username field */}
          <div className="input-group">
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="username">Username</label>
          </div>

          {/* Password field */}
          <div className="input-group">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="password">Password</label>
          </div>

          <button type="submit">Login</button>
        </form>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <div className="footer-left">
          <p><MapPin size={16} /> 2F 37 Bayanri Road Build., #37 Bayani Road AFPOVAI, Fort Bonifacio, Western Bicutan, Taguig City</p>
          <p><Phone size={16} /> 856-3553 | 808-9424 | 808-9282</p>
          <p><Globe size={16} /> www.pmgi.com.ph</p>
        </div>
        <div className="footer-right">
          <p><Instagram size={16} /> @pmgi_ph</p>
          <p><Facebook size={16} /> Professional Maintenance Group, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
