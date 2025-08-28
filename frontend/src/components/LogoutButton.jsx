// components/LogoutButton.jsx
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    // Redirect to login
    navigate("/login");
  };

  return <button onClick={handleLogout}>Logout</button>;
}
