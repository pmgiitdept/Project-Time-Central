/* components/ChatSections.jsx */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import api from "../api"; 
import "./styles/ChatSection.css"; 
import ManageUsersModal from "./ManageUsersModal";

export default function ChatSection({ currentUser, roomId, roomName, messages, setMessages, onNewMessage, users, roomCreatorId }) {
  const [newMessage, setNewMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);

  const [manageUsersModal, setManageUsersModal] = useState({ open: false });  
  const [participants, setParticipants] = useState([]);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  
  const getOtherUserId = (roomName) => {
    if (!currentUser || !roomName) return null;

    const parts = roomName.split("_");
    if (parts.length < 3) return null; 
    const id1 = parseInt(parts[1]);
    const id2 = parseInt(parts[2]);
    if (isNaN(id1) || isNaN(id2)) return null;

    return id1 === currentUser.id ? id2 : id1;
  };

  const otherUserId = getOtherUserId(roomName);
  const otherUser = otherUserId
    ? users.find((u) => u.id === otherUserId)
    : null;

  const headerName = otherUser ? otherUser.username : roomName;

  const scrollToBottom = (behavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const fetchHistory = async () => {
    if (!currentUser?.token) return;
    setLoading(true);
  
    try {
      let allMessages = [];
      let url = `/chat/messages/${roomName}/`;
  
      const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";
  
      while (url) {
        const res = await api.get(url, {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
  
        const data = res.data;
        allMessages = [...allMessages, ...data.results];
  
        // Fix: normalize next page URL
        url = data.next ? data.next.replace(API_BASE, "") : null;
      }
  
      allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
      console.log("Final merged history:", allMessages);
      setMessages(allMessages);
      localStorage.setItem(`chat-${roomName}`, JSON.stringify(allMessages));
      scrollToBottom("auto");
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.token) return;

    const cached = localStorage.getItem(`chat-${roomName}`);
    if (cached) {
      setMessages(JSON.parse(cached));
    }

    fetchHistory(); 
  }, [currentUser?.token, roomName]);

  useEffect(() => {
    if (!currentUser?.token || ws.current) return;
  
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost =
      import.meta.env.VITE_WS_URL || "127.0.0.1:8000";
  
    const wsUrl = `${wsScheme}://${wsHost}/ws/chat/${roomName}/?token=${currentUser.token}`;
  
    ws.current = new WebSocket(wsUrl);
  
    ws.current.onopen = () => {
      setConnected(true);
      console.log("✅ Connected to chat");
    };
  
    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setMessages((prev) => {
          const updated = [...prev, data];
          localStorage.setItem(`chat-${roomName}`, JSON.stringify(updated));
          return updated;
        });
        scrollToBottom("smooth");
      } catch (err) {
        console.error("Failed to parse WS message:", err);
      }
    };
  
    ws.current.onclose = () => setConnected(false);
    ws.current.onerror = (err) => console.error("WS Error:", err);
  
    return () => {
      ws.current?.close();
      ws.current = null;
    };
  }, [currentUser?.token, roomName]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom("auto");
    }
  }, [messages, loading]);

  const sendMessage = () => {
    if (!newMessage.trim() || !connected) return;

    ws.current.send(JSON.stringify({ message: newMessage }));
    setNewMessage("");
    setShowEmoji(false);
    scrollToBottom();
  };

  const getInitials = (name) => name?.charAt(0).toUpperCase() || "?";

  const handleFetchParticipants = async () => {
    if (!roomId) return alert("Room ID not available");
    try {
      const res = await api.get(`/chat/rooms/${roomId}/participants/`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      setParticipants(res.data);
      setManageUsersModal({ open: true });
    } catch (err) {
      console.error("Failed to fetch participants:", err);
      alert("Failed to load participants");
    }
  };

  return (
    <div className="chat-wrapper">
      {/* Header */}
      <div className="chat-header">
        <h2>💬 {headerName}</h2>
        { /* <span className={`status ${connected ? "online" : "offline"}`}>
          {connected ? "Online" : "Offline"}
        </span> */}
        {roomId && currentUser.id === roomCreatorId && (
          <button className="manage-users-btn" onClick={handleFetchParticipants}>
            <span className="icon">👥</span> Manage Users
          </button>
        )}

      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading && (
          <div className="loading-animation">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="no-messages-placeholder">
            💬 Send a message
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={msg.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`message-row ${
                msg.sender?.toLowerCase() === currentUser.username?.toLowerCase()
                  ? "self"
                  : "other"
              }`}
            >
              {msg.sender?.toLowerCase() !== currentUser.username?.toLowerCase() && (
                <div className="avatar">{getInitials(msg.sender)}</div>
              )}
              <div
                className={`bubble ${
                  msg.sender?.toLowerCase() === currentUser.username?.toLowerCase()
                    ? "self"
                    : "other"
                }`}
              >
                <div className="sender">{msg.sender}</div>
                <div className="text">{msg.message}</div>
                <div className="time">
                  {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input">
        <button
          onClick={() => setShowEmoji((prev) => !prev)}
          className="emoji-btn"
        >
          😊
        </button>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) {
                const { selectionStart, selectionEnd } = e.target;
                const newValue =
                  newMessage.slice(0, selectionStart) +
                  "\n" +
                  newMessage.slice(selectionEnd);
                setNewMessage(newValue);

                setTimeout(() => {
                  e.target.selectionStart = e.target.selectionEnd = selectionStart + 1;
                }, 0);
              } else {
                e.preventDefault();
                sendMessage();
              }
            }
          }}
          placeholder={connected ? "Type a message..." : "Connecting..."}
          disabled={!connected}
          rows={1}
          style={{ resize: "none" }}
          className="chat-textarea"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={sendMessage}
          disabled={!connected}
          className="send-btn"
        >
          ➤
        </motion.button>
        {showEmoji && (
          <div className="emoji-picker">
            <EmojiPicker
              onEmojiClick={(emojiData) =>
                setNewMessage((prev) => prev + emojiData.emoji)
              }
              theme="light"
            />
          </div>
        )}

        {/* ✅ Manage Users Modal */}
          {manageUsersModal.open && (
            <ManageUsersModal
              roomId={roomId} 
              roomCreatorId={roomCreatorId}
              currentUser={currentUser}
              participants={participants}
              onClose={() => setManageUsersModal({ open: false })}
              onRemoveUser={(userId) =>
                setParticipants((prev) => prev.filter((u) => u.id !== userId))
              }
            />
          )}
      </div>
    </div>
  );
}
