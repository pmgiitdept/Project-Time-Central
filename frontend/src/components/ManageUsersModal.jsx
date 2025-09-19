/* components/ManageUsersModal.jsx */
import React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Check } from "lucide-react";
import api from "../api";
import "./styles/ManageUsersModal.css";

export default function ManageUsersModal({
  roomId,
  roomCreatorId, 
  currentUser,
  participants,
  onClose,
  onRemoveUser
}) {
    
  const [confirmRemove, setConfirmRemove] = useState(null);

  const handleRemove = async (userId) => {
    try {
      await api.post(
        `/chat/rooms/${roomId}/remove_user/`,
        { user_id: userId },
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      onRemoveUser(userId);
      setConfirmRemove(null);
    } catch (err) {
      console.error("Failed to remove user:", err);
      alert(err?.response?.data?.error || "Failed to remove user.");
      setConfirmRemove(null);
    }
  };

  {participants.map((user) => {
    console.log("user.id", user.id, "currentUser.id", currentUser.id, "roomCreatorId", roomCreatorId);
    return (
        <div key={user.id} className="participant-row">
        <span>{user.username}</span>
        {currentUser.id === roomCreatorId && user.id !== currentUser.id && (
            <button onClick={() => handleRemove(user.id)} className="remove-btn">
            <Trash2 size={12} />
            </button>
        )}
        </div>
    );
    })}

  const isCurrentUser = (user) => user.id === currentUser.id;

  return (
    <AnimatePresence>
      <motion.div
        className="manage-users-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
      >
        <motion.div
          className="manage-users-modal-content"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <div className="manage-users-modal-header">
            <h3>Manage Users</h3>
            <button onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="manage-users-modal-body">
            {participants.length === 0 && <p>No users in this room.</p>}

            {participants
                .filter((user) => !isCurrentUser(user)) 
                .map((user) => (
                <div
                    key={user.id}
                    className={`participant-row participant-color-${user.id % 5}`}
                >
                    <span>{user.username}</span>

                    {currentUser.id === roomCreatorId && (
                    <>
                        {confirmRemove === user.id ? (
                        <div className="confirm-remove">
                            <button
                            onClick={() => handleRemove(user.id)}
                            className="confirm-btn1"
                            title="Confirm remove"
                            >
                            <Check size={16} />
                            </button>
                            <button
                            onClick={() => setConfirmRemove(null)}
                            className="cancel-btn1"
                            title="Cancel"
                            >
                            <X size={16} />
                            </button>
                        </div>
                        ) : (
                        <button
                            onClick={() => setConfirmRemove(user.id)}
                            title="Remove User"
                            className="remove-btn1"
                        >
                            <Trash2 size={12} />
                        </button>
                        )}
                    </>
                    )}
                </div>
                ))}
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}