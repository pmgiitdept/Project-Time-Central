// src/components/PasskeyModal.jsx
import React from "react";

function PasskeyModal({ roomName, setEnteredPasskey, error, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 className="modal-title">Enter Passkey for {roomName}</h2>

        <input
          type="password"
          placeholder="Enter passkey"
          onChange={(e) => setEnteredPasskey(e.target.value)}
          className="modal-input"
        />

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onConfirm}>
            Confirm
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default PasskeyModal;