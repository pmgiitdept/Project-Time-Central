// pages/ClientDashboard.jsx
import { useState, useEffect, useContext, useRef } from "react";
import FileTable from "../components/FileTable";
import LogoutButton from "../components/LogoutButton";
import ChatSection from "../components/ChatSections"; 
import UserList from "../components/UserLists"; 
import RoomList from "../components/RoomList"; 
import DTRTable from "../components/DTRTable";
import UploadSection from "../components/UploadSection";
import "../components/styles/ClientDashboard.css";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserMinus, PlusCircle, MinusCircle } from "lucide-react";

export default function ClientDashboard() {
  const { currentUser, setCurrentUser } = useContext(AuthContext);
  const [refresh, setRefresh] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [showUserList, setShowUserList] = useState(false); 
  const [messages, setMessages] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [roomName, setRoomName] = useState("general");
  const [showRooms, setShowRooms] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joinedRooms, setJoinedRooms] = useState([]);

  const roomMessagesCache = useRef({});

  const role = currentUser?.role || "client";
  const refreshFiles = () => setRefresh(!refresh);

  useEffect(() => {
    const fetchRejectedFiles = async () => {
      try {
        const res = await api.get("/files/rejected");
        setNotifications(res.data);
      } catch (err) {
        console.error("Failed to fetch rejected files:", err);
      }
    };
    fetchRejectedFiles();
  }, [refresh]);

  useEffect(() => {
    if (!notifications.length) return;
    const timers = notifications.map(file =>
      setTimeout(() => setNotifications(prev => prev.filter(f => f.id !== file.id)), 5000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    api.get("/auth/me")
      .then(res => setCurrentUser({ ...res.data, token }))
      .catch(err => {
        console.error("Auth/me failed:", err);
        setCurrentUser(null);
      });
  }, [setCurrentUser]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/auth/users");
        setUsersList(res.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleNewMessage = (room, message) => {
    setMessages(prev => [...prev, message]);

    if (message.sender?.toLowerCase() === currentUser.username?.toLowerCase()) return;
    if (room !== "general") {
      setUnreadCounts(prev => ({
        ...prev,
        [room]: (prev[room] || 0) + 1,
      }));
      setHasUnread(true);
    }
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get("/chat/rooms"); 
        setJoinedRooms(res.data);
      } catch (err) {
        console.error("Failed to fetch rooms:", err);
      }
    };
    fetchRooms();
  }, []);

  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="dashboard-navbar">
        <div className="navbar-left">
          <img src="/src/pmgi.png" alt="Logo" className="navbar-logo" />
          <h1 className="dashboard-title">Client Dashboard</h1>
        </div>
        <div className="navbar-right">
          <img src="/src/sgslogos.png" alt="Right Logo" className="navbar-logo" />
          <LogoutButton />
        </div>
      </nav>

      <motion.div
        className="main-section center-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {/* Centered Left Panel */}
        <div className="left-panel">
          <UploadSection
            refreshFiles={refreshFiles}
            refreshDTR={() => setRefresh(!refresh)}
          />

          <FileTable role="client" key={refresh} />
          <DTRTable />
        </div>

        {/* Floating Chat + Users List */}
        <div className="chat-float">
              {/* Floating Chat Button */}
              <button
                className="chat-toggle-btn"
                onClick={() => {
                  setChatOpen(prev => !prev);
                  if (!chatOpen) setHasUnread(false);
                }}
              >
                💬
                {hasUnread && <span className="chat-notification-dot"></span>}
              </button>
        
              {/* Floating UserList + RoomList Toggles */}
              <AnimatePresence>
                {chatOpen && (
                  <>
                    <motion.button
                      key="userlist-toggle"
                      className="userlist-floating-toggle"
                      onClick={() => setShowUserList(prev => !prev)}
                      title={showUserList ? "Hide Users" : "Show Users"}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                    >
                      {showUserList ? (
                        <span className="icon-text">
                          <UserMinus size={18} /> Hide Users
                        </span>
                      ) : (
                        <span className="icon-text">
                          <UserPlus size={18} /> Show Users
                        </span>
                      )}
                    </motion.button>
        
                    <motion.button
                      key="roomlist-toggle"
                      className="roomlist-floating-toggle"
                      onClick={() => setShowRooms(prev => !prev)}
                      title={showRooms ? "Hide Rooms" : "Show Rooms"}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.3 }}
                    >
                      {showRooms ? (
                        <span className="icon-text">
                          <MinusCircle size={18} /> Hide Rooms
                        </span>
                      ) : (
                        <span className="icon-text">
                          <PlusCircle size={18} /> Show Rooms
                        </span>
                      )}
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
        
              {/* Chat Popup */}
              <AnimatePresence>
                {chatOpen && (
                  <motion.div
                    className={`chat-popup`}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="chat-container">
                      {/* RoomList */}
                      <AnimatePresence>
                        {showRooms && (
                          <motion.div
                            key="roomlist"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <RoomList
                              currentUser={currentUser}
                              onSelectRoom={(room) => {
                                setSelectedRoom(room);
                                setRoomName(room.name); 
                                if (roomMessagesCache.current[room.id]) {
                                  setMessages(roomMessagesCache.current[room.id]);
                                } else {
                                  setMessages([]);
                                }
                                setHasUnread(false);
                                setUnreadCounts(prev => {
                                  const updated = { ...prev };
                                  delete updated[room.name];
                                  return updated;
                                });
                              }}
                              joinedRooms={joinedRooms}
                              isVisible={true}
                            />
        
                          </motion.div>
                        )}
                      </AnimatePresence>
        
                      {/* UserList */}
                      <AnimatePresence>
                        {showUserList && (
                          <motion.div
                            key="userlist"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 50 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            <UserList
                              className={`user-list-wrapper`}
                              currentUser={currentUser}
                              unreadCounts={unreadCounts}
                              onSelectRoom={(room) => {
                                setSelectedRoom(room);
                                setRoomName(room.name);
                                if (roomMessagesCache.current[room.id]) {
                                  setMessages(roomMessagesCache.current[room.id]);
                                } else {
                                  setMessages([]); 
                                }
                                setHasUnread(false);
                                setUnreadCounts(prev => {
                                  const updated = { ...prev };
                                  delete updated[room.name];
                                  return updated;
                                });
                              }}
                              isVisible={true}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
        
                      <ChatSection
                        role={role}
                        currentUser={currentUser}
                        roomName={roomName}
                        roomId={selectedRoom?.id}
                        roomCreatorId={selectedRoom?.created_by?.id}
                        messages={messages}
                        setMessages={setMessages}
                        onNewMessage={handleNewMessage}
                        users={usersList}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
      </motion.div>
    </div>
  );
}
