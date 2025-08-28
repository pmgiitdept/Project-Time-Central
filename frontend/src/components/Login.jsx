// components/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { toast } from "react-toastify";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Step 1: Log in and get JWT + role
      const res = await api.post("auth/login/", { username, password });

      // Step 2: Store tokens and role
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", res.data.username);

      toast.success(`Welcome ${res.data.username}!`);

      // Step 3: Redirect based on role
      if (res.data.role === "admin") navigate("/admin"); 
      else if (res.data.role === "client") navigate("/client");
      else navigate("/viewer");
      console.log("Login response:", res.data);

    } catch (err) {
      console.error(err);
      toast.error("Login failed. Check credentials.");
    }
  };

  return (
    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Login</button>
    </form>
  );
}
