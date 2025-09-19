/* components/RoomList.jsx */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "../api";
import { PlusCircle, LogIn, LogOut, Trash2 } from "lucide-react"; 
import "./styles/RoomList.css";
import PasskeyModal from "../components/PasskeyModal";
import DeleteModal from "../components/DeleteModal";

export default function RoomList({ currentUser, onSelectRoom, isVisible }) {
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, roomId: null, roomName: "" });
  const [passkeyModal, setPasskeyModal] = useState({ open: false, roomId: null, roomName: "" });
  const [enteredPasskey, setEnteredPasskey] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [highlightedRoom, setHighlightedRoom] = useState(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api.get("/chat/rooms/");
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];
        setRooms(data);
        setJoinedRooms(data.filter((r) => r.is_joined).map((r) => r.name));
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
        setRooms([]);
      }
    };
    fetchRooms();
  }, []);

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const response = await api.post("/chat/rooms/", { name: newRoomName });
      const newRoom = {
        ...response.data,
        created_by: { username: currentUser?.username },
        is_joined: true,          
      };

      setRooms((prev) => [...prev, newRoom]);
      setJoinedRooms((prev) => [...prev, newRoom.name]);
      setHighlightedRoom(newRoom.id); 
      setNewRoomName("");
      setEnteredPasskey("");

      setTimeout(() => setHighlightedRoom(null), 2000);
    } catch (err) {
      console.error("Failed to create room:", err);
    }
  };

  const joinRoom = async (roomId, roomName, passkey) => {
    try {
      setPasskeyError(""); 
      await api.post(`/chat/rooms/${roomId}/join/`, { passkey });
      setJoinedRooms((prev) =>
        prev.includes(roomName) ? prev : [...prev, roomName]
      );
      const refreshed = await api.get("/chat/rooms/");
      setRooms(
        Array.isArray(refreshed.data)
          ? refreshed.data
          : refreshed.data.results || []
      );
      return true; 
    } catch (err) {
      console.error("Failed to join room:", err);
      setPasskeyError("Invalid passkey. Please try again.");
      return false;
    }
  };

  const leaveRoom = async (roomId, roomName) => {
    try {
      await api.post(`/chat/rooms/${roomId}/leave/`);
      setJoinedRooms((prev) => prev.filter((r) => r !== roomName));
      const refreshed = await api.get("/chat/rooms/");
      setRooms(
        Array.isArray(refreshed.data)
          ? refreshed.data
          : refreshed.data.results || []
      );
    } catch (err) {
      console.error("Failed to leave room:", err);
    }
  };

  const deleteRoom = async (roomId, roomName) => {
    try {
      await api.delete(`/chat/rooms/${roomId}/`);
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setJoinedRooms((prev) => prev.filter((r) => r !== roomName));
    } catch (err) {
      console.error("Failed to delete room:", err);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="room-list-wrapper">
      <h3 className="room-list-title">💬 Chat Rooms</h3>

      <div className="room-create">
        <input
          type="text"
          placeholder="Create a new room..."
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createRoom()}
        />
        <button onClick={createRoom} title="Create Room">
          <PlusCircle size={20} />
        </button>
      </div>

      <div className="room-list-items">
        {rooms.map((room) => {
          const isJoined = joinedRooms.includes(room.name);
          const isCreator = room.created_by_username === currentUser?.username;

          return (
            <div
              key={room.id}
              className={`room-item ${isJoined ? "joined" : ""} ${highlightedRoom === room.id ? "highlight" : ""}`}
              title={isCreator && room.passkey ? `Passkey: ${room.passkey}` : ""}
            >
              <span
                className="room-name"
                onClick={() => isJoined && onSelectRoom(room)}
              >
                # {room.name}
              </span>

              {isCreator && room.passkey && (
                <span className="room-passkey">Passkey: {room.passkey}</span>
              )}

              <div className="room-buttons">
                {isJoined ? (
                  <button
                    className="leave-btn"
                    onClick={() => leaveRoom(room.id, room.name)}
                    title="Leave Room"
                  >
                    <LogOut size={16} />
                  </button>
                ) : (
                  <button
                    className="join-btn"
                    onClick={() =>
                      setPasskeyModal({ open: true, roomId: room.id, roomName: room.name })
                    }
                    title="Join Room"
                  >
                    <LogIn size={16} />
                  </button>
                )}

                {isCreator && (
                  <button
                    className="leave-btn delete-btn"
                    onClick={() =>
                      setDeleteModal({ open: true, roomId: room.id, roomName: room.name })
                    }
                    title="Delete Room"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ✅ Delete Modal */}
      {deleteModal.open && (
        <DeleteModal
          roomName={deleteModal.roomName}
          onConfirm={() => {
            deleteRoom(deleteModal.roomId, deleteModal.roomName);
            setDeleteModal({ open: false, roomId: null, roomName: "" });
          }}
          onCancel={() => setDeleteModal({ open: false, roomId: null, roomName: "" })}
        />
      )}

      {/* ✅ Passkey Modal */}
      {passkeyModal.open && (
        <PasskeyModal
          roomName={passkeyModal.roomName}
          setEnteredPasskey={setEnteredPasskey}
          error={passkeyError}
          onConfirm={async () => {
            const success = await joinRoom(
              passkeyModal.roomId,
              passkeyModal.roomName,
              enteredPasskey
            );
            if (success) {
              setPasskeyModal({ open: false, roomId: null, roomName: "" });
              setEnteredPasskey("");
            }
          }}
          onCancel={() => {
            setPasskeyModal({ open: false, roomId: null, roomName: "" });
            setEnteredPasskey("");
            setPasskeyError(""); 
          }}
        />
      )}
    </div>
  );
}
