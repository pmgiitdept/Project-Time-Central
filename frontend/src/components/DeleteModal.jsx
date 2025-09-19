// components/DeleteModal.jsx
import { createPortal } from "react-dom";

export default function DeleteModal({ roomName, onConfirm, onCancel }) {
  return createPortal(
    <div className="modal-overlay fade-in">
      <div className="modal-content">
        <h4>Delete Room</h4>
        <p>Are you sure you want to delete "{roomName}"?</p>
        <div className="modal-buttons">
          <button className="confirm-btn" onClick={onConfirm}>Delete</button>
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
