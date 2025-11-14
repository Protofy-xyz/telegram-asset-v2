import { useEffect, useRef } from "react";
import useChat from "../../store/store";
import BotMessage from "./BotMessage";
import UserMessage from "./UserMessage";
import { useEventEffect } from "@extensions/events/hooks";
import { createMessage } from "../../utils/createMessage";
import { YStack } from "tamagui";

export default function Chats() {
  const chats = useChat((state) => state.chats);
  const addChat = useChat((state) => state.addChat);
  const messagesEndRef = useRef(null);

  useEventEffect((payload, msg) => {
    try {
      const parsedMessage = JSON.parse(msg.message);
      const payload = parsedMessage.payload.message
      addChat(createMessage("assistant", payload, "text"));
    } catch (e) {
      console.error(e);
    }
  }, { path: "chat/notifications/#" });

  // Subscribe to approval offers and show in chat with Accept link
  useEventEffect((payload, msg) => {
    try {
      const parsed = JSON.parse(msg.message);
      const payload = parsed?.payload || {};
      if (payload?.status !== 'offered' || !payload?.boardId || !payload?.action || !payload?.approvalId) return;
      const boardId = payload.boardId;
      const action = payload.action;
      const id = payload.approvalId;
      const newMessage = {
        message: payload.message ?? `The action "${action}" requests approval.`,
        boardId,
        action,
        id
      }
      addChat(createMessage("assistant", "approval_request" + JSON.stringify(newMessage), "text"));
    } catch (e) {
      console.error(e);
    }
  }, { path: 'actions/approval/#' });

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  return (
    <YStack f={1} overflow="hidden">
      {chats.map((chat, index) =>
        chat.role === "assistant" ? (
          <BotMessage index={index} key={chat.id} chat={chat} />
        ) : (
          <UserMessage chat={chat} chatIndex={index} key={chat.id} />
        )
      )}
      <div ref={messagesEndRef} />
   </YStack>
  );
}
