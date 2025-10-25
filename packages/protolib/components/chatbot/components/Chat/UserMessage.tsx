import { useState, useRef, useEffect } from "react";
import { PenIcon } from "lucide-react";
import { XStack, YStack, Button, TextArea } from "tamagui";
import useChat, { ChatMessageType } from "../../store/store";
import { Tinted } from "../../../../components/Tinted";

type Props = {
  chat: ChatMessageType;
  chatIndex: number;
};

export default function UserMessage({ chat, chatIndex }: Props) {
  const [edit, setEdit] = useState(false);
  const [updatedQuery, setUpdatedQuery] = useState(chat.content);
  const editTextareaRef = useRef<any>(null);
  const [editChatMessage, resetChatAt] = useChat((state) => [
    state.editChatMessage,
    state.resetChatAt,
  ]);

  function handleChatEdit() {
    editChatMessage(updatedQuery, chatIndex);
    resetChatAt(chatIndex + 1);
    setEdit(false);
  }
  useEffect(() => {
    if (edit && editTextareaRef.current) {
      editTextareaRef.current.style.height =
        editTextareaRef.current.scrollHeight + "px";
    }
  }, [edit]);

  return (
    <YStack p="$3" gap="$2" ai="flex-end">
      <XStack
        jc="flex-end"
        ai="center"
        w="100%"
        gap="$2"
      >
        {!edit && (
          <Button
            chromeless
            circular
            onPress={() => setEdit((prev) => !prev)}
            icon={PenIcon}
            size="$3"
          />
        )}
        {!edit ? (
          <YStack
            bg="$background"
            br="$6"
            px="$3"
            py="$2"
            maxWidth={620}
          >
            {chat.content}
          </YStack>
        ) : (
          <TextArea
            ref={editTextareaRef}
            value={updatedQuery}
            onChangeText={(val) => {
              setUpdatedQuery(val);
              const el = editTextareaRef.current;
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            autoFocus
            multiline
            rows={1}
            borderWidth={0}
            focusStyle={{ outlineWidth: 0 }}
            w="100%"
            minHeight={0}
            h="auto"
          />
        )}
      </XStack>
      {edit && (
        <XStack gap="$2">
          <Tinted>
            <Button onPress={handleChatEdit} hoverStyle={{ bg: "$teal11" }}>
              Save
            </Button>
          </Tinted>
          <Button chromeless theme="red" onPress={() => setEdit(false)}>
            Cancel
          </Button>
        </XStack>
      )}
    </YStack>
  );
}