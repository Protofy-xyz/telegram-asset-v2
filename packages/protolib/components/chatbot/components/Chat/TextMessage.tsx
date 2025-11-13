import { Check, Clipboard } from "lucide-react";
import { SyncLoader } from "react-spinners";
import useClipboard from "../../hooks/useClipboard";
import useBot from "../../hooks/useBot";
import { ChatMessageType } from "../../store/store";
import Markdown from "react-markdown";
import { API } from "protobase";
import CodeHighlight from "../CodeHighlight/CodeHighlight";
import { PromptAtom } from '../../../../context/PromptAtom';
import { useAtom } from "jotai";
import { InteractiveIcon } from "../../../InteractiveIcon";
import { Button, XStack, YStack, Text } from "tamagui";
import { useEffect, useState } from "react";

type Props = {
  index: number;
  chat: ChatMessageType;
};

export default function TextMessage({ index, chat }: Props) {
  const [promptChain] = useAtom(PromptAtom);
  const { copy, copied } = useClipboard();
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);

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

  // Check approval status from backend (so refresh reflects state)
  useEffect(() => {
    if (result && result.startsWith("approval_request")) {
      try {
        const approvalData = result.replace("approval_request", "");
        const parsed = JSON.parse(approvalData);
        const { boardId, action, id } = parsed || {};
        if (!boardId || !action || !id) return;
        (async () => {
          try {
            const resp: any = await API.get(`/api/core/v1/boards/${encodeURIComponent(boardId)}/actions/${encodeURIComponent(action)}/approvals/${encodeURIComponent(id)}/status`);
            const status = resp?.data?.status;
            if (status && status !== 'offered') {
              setApplied(true);
            }
          } catch (e) {
            console.error('Approval status fetch error', e);
          }
        })();
      } catch {}
    }
  }, [result]);

  // IMPORTANTE: mueve esta condición justo después del hook useBot
  if (isStreamCompleted && !result.trim()) {
    return null;
  }

  if (result && result.startsWith("approval_request")) {
    const approvalData = result.replace("approval_request", "");
    let parsedData = JSON.parse(approvalData);

    const onAccept = async (e) => {
      try {
        if (busy || applied) return;
        setBusy(true);
        const { boardId, action, id } = parsedData
        if (!boardId || !action || !id) return;
        await API.post(`/api/core/v1/boards/${encodeURIComponent(boardId)}/actions/${encodeURIComponent(action)}/approvals/${encodeURIComponent(id)}/accept`, {});
        setApplied(true);
      } catch (err) {
        console.error('Approval accept error', err);
      } finally {
        setBusy(false);
      }
    };

    const onCancel = async (e) => {
      try {
        if (busy || applied) return;
        setBusy(true);
        const { boardId, action, id } = parsedData
        if (!boardId || !action || !id) return;
        await API.post(`/api/core/v1/boards/${encodeURIComponent(boardId)}/actions/${encodeURIComponent(action)}/approvals/${encodeURIComponent(id)}/reject`, {});
        setApplied(true);
      } catch (err) {
        console.error('Approval cancel error', err);
      } finally {
        setBusy(false);
      }
    };

    return <YStack gap="$3" py="$3">
      <Text>{applied ? 'Request applied' : parsedData.message}</Text>
      {!applied && (
        <XStack gap={"$2"}>
          <Button themeInverse bc="$bgPanel" size="$3" onPress={onAccept} disabled={busy}>Accept</Button>
          <Button bc="$bgPanel" size="$3" onPress={onCancel} disabled={busy}>Cancel</Button>
        </XStack>
      )}
    </YStack>
  } else {
    return (
      <YStack jc="flex-start" >
        {!isStreamCompleted && !result && !error ? (
          <YStack py="$3" px="$4" jc="center" >
            <SyncLoader color="gray" size={8} speedMultiplier={0.5} />
          </YStack>
        ) : (
          <YStack>
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
          </YStack>
        )}
      </YStack>
    );
  }
}
