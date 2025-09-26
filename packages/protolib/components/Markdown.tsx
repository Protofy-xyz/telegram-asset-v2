import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tinted } from "./Tinted";
import { Pencil, Save, X, Check, ClipboardPaste } from "@tamagui/lucide-icons";
import { useEffect, useRef, useState } from "react";
import { Monaco } from "./Monaco";
import { useThemeSetting } from "@tamagui/next-theme";
import useKeypress from "react-use-keypress";
import { YStack } from "tamagui";
import { v4 as uuid } from "uuid";

function escapeMarkdownForTemplate(md: string) {
  return md;
}

async function copyToClipboardSafe(text: string) {
  if (navigator?.clipboard && window?.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function Markdown({
  data,
  readOnly = false,
  copyToClipboardEnabled = true,
  setData = undefined,
}: {
  data: any;
  readOnly?: boolean;
  copyToClipboardEnabled?: boolean;
  setData?: (val: string) => void;
}) {
  const text = data ? (typeof data === "string" ? data : String(data)) : "";
  const [editing, setEditing] = useState(false);
  const { resolvedTheme } = useThemeSetting();
  const id = uuid();

  const code = useRef(text);
  const originalBeforeEdit = useRef(text);

  const [copied, setCopied] = useState(false);

  // detecta si está en HTTP y no es localhost
  const isHttp = window.location.protocol === "http:";
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const disableCopy = copyToClipboardEnabled ? isHttp && !isLocalhost: true;
  useEffect(() => {
    if (data) {
      code.current = escapeMarkdownForTemplate(data);
      if (!editing) originalBeforeEdit.current = code.current;
    }
  }, [data, editing]);

  const save = () => {
    if (setData) setData(escapeMarkdownForTemplate(code.current));
    setEditing(false);
  };

  const cancel = () => {
    code.current = originalBeforeEdit.current; // revertir cambios
    setEditing(false);
  };

  useKeypress(["Escape"], (event) => {
    if (editing) {
      cancel();
      event.preventDefault();
    }
  });

  const normalizedText = text;

  const handleCopy = async () => {
    const toCopy = editing ? code.current : normalizedText;
    const ok = await copyToClipboardSafe(toCopy);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div
      className="no-drag markdown-body"
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "1em",
        overflow: "hidden",
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "var(--color)",
        backgroundColor: "var(--bg-color)",
        gap: "0.5rem",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        {(!disableCopy && !editing) && (
          <Tinted>
            <YStack
              jc="center"
              ai="center"
              br="$4"
              cursor="pointer"
              onPress={handleCopy}
            >
              {copied ? (
                <Check size={20} color="var(--green9)" />
              ) : (
                <ClipboardPaste size={20} color="var(--color8)" />
              )}
            </YStack>
          </Tinted>
        )}

        {!editing ? (
          !readOnly ? (
            <Tinted>
              <YStack
                jc="center"
                ai="center"
                br="$4"
                cursor="pointer"
                onPress={() => {
                  if (readOnly) return;
                  originalBeforeEdit.current = code.current; // snapshot para cancelar
                  setEditing(true);
                }}
                title="Edit"
              >
                <Pencil size={20} color="var(--color8)" />
              </YStack>
            </Tinted>
          ) : null
        ) : (
          <>
            <Tinted>
              <YStack
                jc="center"
                ai="center"
                br="$4"
                cursor="pointer"
                onPress={cancel}
                title="Cancel"
              >
                <X size={20} color="var(--red9)" />
              </YStack>
            </Tinted>
            <Tinted>
              <YStack
                jc="center"
                ai="center"
                br="$4"
                cursor="pointer"
                onPress={save}
                title="Save"
              >
                <Save size={20} color="var(--color8)" />
              </YStack>
            </Tinted>
          </>
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {editing ? (
          <Monaco
            key={id}
            height={"100%"}
            path={id + "_markdown.md"}
            darkMode={resolvedTheme === "dark"}
            sourceCode={code.current}
            onChange={(newCode) => {
              code.current = newCode;
            }}
            autofocus={true}
            options={{
              folding: false,
              lineDecorationsWidth: 0,
              lineNumbersMinChars: 0,
              lineNumbers: false,
              minimap: { enabled: false },
              suggestOnTriggerCharacters: false,
              quickSuggestions: false,
              wordBasedSuggestions: false,
              parameterHints: { enabled: false },
              tabCompletion: "off",
            }}
            // onMount={(editor, monaco) => {
            //   editor.addCommand(monaco.KeyCode.Enter, () => {
            //     const model = editor.getModel();
            //     if (!model) return;
            //     const selections = editor.getSelections() || [];
            //     editor.executeEdits(
            //       "hard-break",
            //       selections.map((sel) => ({
            //         range: sel,
            //         text: "  \n",
            //         forceMoveMarkers: true,
            //       }))
            //     );
            //   });
            // }}
          />
        ) : (
          <Tinted>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => {
                  const target = props.target ?? "_blank";
                  const rel = target === "_blank" ? "noopener noreferrer" : undefined;
                  return (
                    <a {...props} target={target} rel={rel}>
                      {props.children}
                    </a>
                  );
                },
              }}
            >
              {normalizedText}
            </ReactMarkdown>
          </Tinted>
        )}
      </div>
    </div>
  );
}
