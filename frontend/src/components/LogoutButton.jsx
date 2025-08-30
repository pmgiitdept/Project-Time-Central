// components/LogoutButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/LogoutButton.css";

export default function LogoutButton() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <div style={{ display: "inline-block" }}>
      {/* Logout Button */}
      <button className="logout-btn" onClick={() => setShowConfirm(true)}>
        Logout
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Are you sure you want to log out?</h3>
            <div className="modal-actions">
              <button
                className="confirm-btn"
                onClick={handleLogout}
              >
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
