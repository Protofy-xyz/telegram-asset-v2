import classNames from "classnames";
import Avatar from "../Avatar/Avatar";
import { Check, Clipboard } from "lucide-react";
import { SyncLoader } from "react-spinners";
import useClipboard from "../../hooks/useClipboard";
import useBot from "../../hooks/useBot";
import { ChatMessageType } from "../../store/store";
import Markdown from "react-markdown";
import CodeHighlight from "../CodeHighlight/CodeHighlight";
import { PromptAtom } from '../../../../context/PromptAtom';
import { useAtom } from "jotai";
import { InteractiveIcon } from "../../../InteractiveIcon";
import { XStack } from "tamagui";

type Props = {
  index: number;
  chat: ChatMessageType;
};

export default function TextMessage({ index, chat }: Props) {
  const [promptChain] = useAtom(PromptAtom);
  const { copy, copied } = useClipboard();

  const prompt: any = promptChain.reduce((total, current) => {
    return total + current.generate();
  }, '') + `
    reply directly to the user, acting as the assistant.
  `;
  const { result, error, isStreamCompleted, cursorRef } = useBot({
    index,
    chat,
    prompt
  });

  // IMPORTANTE: mueve esta condición justo después del hook useBot
  if (isStreamCompleted && !result.trim()) {
    return null;
  }

  return (
    <div>
      <div className="flex items-start w-full">
        {/* Loader solo aparece si todavía está cargando y no hay error */}
        {!isStreamCompleted && !result && !error ? (
          <div className="self-center">
            <SyncLoader color="gray" size={8} speedMultiplier={0.5} />
          </div>
        ) : (
          <div
            className={classNames(
              "animate-preulse overflow-x-hidden whitespace-pre-wrap",
              { "text-red-500": error, "dark:text-gray-300": !error }
            )}
          >
            <Markdown
              children={result}
              components={{
                code(props) {
                  const { children, className, node, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <CodeHighlight language={match[1]}>
                      {String(children).replace(/\n$/, "")}
                    </CodeHighlight>
                  ) : (
                    <code {...rest} className={className?.concat("language")}>
                      {children}
                    </code>
                  );
                },
              }}
            />

            {!isStreamCompleted && !chat.content && (
              <span
                className="ml-1 blink bg-gray-500 dark:bg-gray-200 h-4 w-1 inline-block"
                ref={cursorRef}
              ></span>
            )}
            <XStack>
              {!copied ? (
                <InteractiveIcon
                  Icon={Clipboard}
                  onPress={() => copy(result)}
                />
              ) : (
                <InteractiveIcon
                  Icon={Check}
                  onPress={() => copy(result)}
                />
              )}
            </XStack>
          </div>
        )}
      </div>
    </div>
  );
}