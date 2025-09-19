// components/LogoutButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import api from "../api"; 
import useHeartbeat from "../hooks/useHeartBeat";
import "./styles/LogoutButton.css";

export default function LogoutButton() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const { stopHeartbeat } = useHeartbeat();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout/");
    } catch (err) {
      console.error("Failed to log out on server:", err);
    } finally {
      stopHeartbeat();

      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");

      navigate("/login");
    }
  };

  return (
    <div style={{ display: "inline-block" }}>
      {/* Logout Icon Button */}
      <button
        className="logout-icon-btn"
        onClick={() => setShowConfirm(true)}
        aria-label="Logout"
      >
        <FaSignOutAlt />
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="warning-icon">⚠️</div>
            <h3>Are you sure you want to log out?</h3>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={handleLogout}>
                Yes, Logout
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}