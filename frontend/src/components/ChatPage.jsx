// components/ChatPage.jsx
import { useState } from "react";
import ChatSection from "../components/ChatSection";
import UserList from "../components/UserLists";

export default function ChatPage({ currentUser }) {
  const [messagesByRoom, setMessagesByRoom] = useState({});
  const [activeRoom, setActiveRoom] = useState(null);

  const handleSelectRoom = (room) => {
    setActiveRoom(room);

    setMessagesByRoom((prev) => {
        if (prev[room.name]) {
        return prev;
        }
        return {
        ...prev,
        [room.name]: [],
        };
    });
    };

  return (
    <div className="chat-page">
      {/* Sidebar with users */}
      <UserList
        currentUser={currentUser}
        onSelectRoom={handleSelectRoom}
        isVisible={true}
      />

      {/* Active chat */}
      {activeRoom && (
        <ChatSection
          currentUser={currentUser}
          roomId={activeRoom.id}             
          roomName={activeRoom.name}         
          roomCreatorId={activeRoom.created_by?.id}
          users={[]}                        
          messages={messagesByRoom[activeRoom.name] || []}
          setMessages={(msgs) =>
            setMessagesByRoom((prev) => ({
              ...prev,
              [activeRoom.name]: msgs,
            }))
          }
        />
      )}
    </div>
  );
}