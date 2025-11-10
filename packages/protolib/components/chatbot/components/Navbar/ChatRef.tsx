import { MessageSquare, Trash2, Pencil, Check, X } from "lucide-react";
import useChat, { isChatSelected } from "../../store/store";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { InteractiveIcon } from "../../../InteractiveIcon";
import { Input, XStack } from "tamagui";

export default function ChatRef({
  chat,
}: {
  chat: { id: string; title: string };
}) {
  const viewSelectedChat = useChat((state) => state.viewSelectedChat);
  const isSelected = useChat(isChatSelected(chat.id));
  const [deleteChat, editChatsTitle] = useChat((state) => [
    state.handleDeleteChats,
    state.editChatsTitle,
  ]);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const isTitleEditeble = isSelected && isEditingTitle;

  useEffect(() => {
    setIsEditingTitle(false);
  }, [isSelected]);

  function handleEditTitle(id: string, title: string) {
    if (title.trim() === "") {
      return;
    }
    setIsEditingTitle(false);
    setEditTitle(title);
    editChatsTitle(id, title);
  }

  return (
    <div
      className={classNames(
        "btn-wrap flex items-center w-full p-1 rounded-md text-xl font-bold  hover:bg-[var(--bgContent)] gap-2 mb-2",
        { "bg-[var(--bgContent)]": isSelected }
      )}
    >
      {!isTitleEditeble && (

        <button
          className="py-2 w-3/4 flex items-center flex-grow transition p-2"
          onClick={() => viewSelectedChat(chat.id)}
          title={chat.title}
        >
          <span className="mr-2 flex">
            <MessageSquare size={20} />
          </span>

          <span className="text-sm truncate capitalize">
            {editTitle ? editTitle : chat.title}
          </span>
        </button>
      )}
      {isTitleEditeble && (
        < Input
          bc="transparent"
          bw={0}
          width="100%"
          mr="2px"
          value={editTitle}
          onChangeText={setEditTitle}
          autoFocus
          focusStyle={{ borderWidth: 0 }}
        />
        // <input
        //   type="text"
        //   value={editTitle}
        //   className="bg-inherit border border-blue-400 w-4/5 ml-2 p-1 outline-none"
        //   autoFocus
        //   onChange={(e) => setEditTitle(e.target.value)}
        // />
      )}
      {isSelected && !isEditingTitle && (
        <XStack>
          <InteractiveIcon Icon={Pencil} onPress={() => setIsEditingTitle(true)} />
          <InteractiveIcon Icon={Trash2} onPress={() => deleteChat(chat.id)} />
        </XStack>
      )}
      {isSelected && isEditingTitle && (
        <XStack>
          <InteractiveIcon IconColor="var(--green9)" Icon={Check} onPress={() => handleEditTitle(chat.id, editTitle)} />
          <InteractiveIcon IconColor="var(--red9)" Icon={X} onPress={() => setIsEditingTitle(false)} />
        </XStack>
      )}
    </div>
  );
}
