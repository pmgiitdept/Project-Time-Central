/* components/UserLists.jsx */
import { useEffect, useState } from "react";
import api from "../api";
import "./styles/UserList.css";

export default function UserList({ currentUser, onSelectRoom, unreadCounts = {}, isVisible }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return; 
      try {
        const response = await api.get("/auth/users/");
        const filtered = response.data.filter(
          (user) => user.username !== currentUser.username
        );
        setUsers(filtered);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const getPrivateRoomName = (id1, id2) => `room_${[id1, id2].sort().join("_")}`;

  if (!isVisible) return null;

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const highlightMatch = (username) => {
    if (!searchTerm) return username;
    const regex = new RegExp(`(${searchTerm})`, "gi");
    return username.replace(regex, "<mark>$1</mark>");
  };

  return (
    <div className="user-list-wrapper">
      <h3 className="user-list-title">Users</h3>

      {/* Sticky Search Bar */}
      <div className="user-search-container">
        <input
          type="text"
          className="user-search-input"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="user-list-items">
        {filteredUsers.length === 0 ? (
          <div className="no-results">No users found</div>
        ) : (
          filteredUsers.map((user) => {
            const room = getPrivateRoomName(currentUser.id, user.id);
            return (
              <div
                key={user.id}
                className="user-item"
                onClick={() =>
                  onSelectRoom({
                    id: null, 
                    name: getPrivateRoomName(currentUser.id, user.id),  
                    created_by: user, 
                  })
                }
              >
                <div className="user-info">
                  <div className="user-avatar">
                    {user.username?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <span
                    className="user-name"
                    dangerouslySetInnerHTML={{ __html: highlightMatch(user.username) }}
                  ></span>
                </div>

                {/* Move status dot to the right */}
                <span className={`status-dot ${user.is_online ? "online" : "offline"}`}></span>

                {unreadCounts[room] > 0 && (
                  <span className="user-unread">{unreadCounts[room]}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}