import { useState } from "react";
import ChatSection from "./ChatSection";
import UserList from "./UserList";

export default function ChatContainer({ currentUser }) {
  const [roomName, setRoomName] = useState("general"); 

  return (
    <div className="flex h-full gap-4">
      <div className="w-1/4">
        <UserList currentUser={currentUser} onSelectRoom={setRoomName} />
      </div>
      <div className="w-3/4">
        <ChatSection currentUser={currentUser} roomName={roomName} />
      </div>
    </div>
  );
}
