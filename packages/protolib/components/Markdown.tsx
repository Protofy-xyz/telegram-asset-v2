import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Tinted } from "./Tinted";
import { Pencil, Save, X } from "@tamagui/lucide-icons";
import { useEffect, useRef, useState } from "react";
import { Monaco } from "./Monaco";
import { useThemeSetting } from "@tamagui/next-theme";
import useKeypress from "react-use-keypress";
import { YStack } from "tamagui";

function escapeMarkdownForTemplate(md: string) {
  // return md.replace(/\\\\/g, "\\\\\\\\").replace(/\`/g, "\\\\\\`");
  return md;
}

export function Markdown({
  data,
  readOnly = false,
  setData = undefined,
}: {
  data: any;
  readOnly?: boolean;
  setData?: (val: string) => void;
}) {
  const text = data ? (typeof data === "string" ? data : String(data)) : "";
  const [editing, setEditing] = useState(false);
  const { resolvedTheme } = useThemeSetting();

  const code = useRef(text);
  const originalBeforeEdit = useRef(text);

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
      cancel(); // ahora Escape cancela (sale sin guardar)
      event.preventDefault();
    }
  });

  const normalizedText = text;
  console.log("Dev:::::::::", { normalizedText });

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
        {!editing ? (
          <Tinted>
          <YStack jc="center"
            ai="center"
            br="$4"
            cursor='pointer' onPress={() => {
              if (readOnly) return;
              originalBeforeEdit.current = code.current; // snapshot para cancelar
              setEditing(true);
            }}>
            <Pencil size={20} color="var(--color8)" style={{ marginLeft: 0, marginTop: 0 }} />
          </YStack>
          </Tinted>
        ) : (
          <>
          <Tinted>
          <YStack jc="center"
            ai="center"
            br="$4"
            cursor='pointer' onPress={() => {cancel()}}>
            <X size={20} color="var(--red9)" style={{ marginLeft: 0, marginTop: 0 }} />
          </YStack>
          <YStack jc="center"
            ai="center"
            br="$4"
            cursor='pointer' onPress={() => {save()}}>
            <Save size={20} color="var(--color8)" style={{ marginLeft: 0, marginTop: 0 }} />
          </YStack>
          </Tinted>
          </>
        )}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {editing ? (
          <Monaco
            height={"100%"}
            path={(data?.id ?? "markdown") + "_markdown.md"}
            darkMode={resolvedTheme === "dark"}
            sourceCode={code.current}
            onChange={(newCode) => {
              code.current = newCode;
            }}
            // Se quita onBlur para NO guardar automáticamente
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
            //         text: "  \n", // 2 espacios + nueva línea
            //         forceMoveMarkers: true,
            //       }))
            //     );
            //   });
            // }}
            onMount={(editor, monaco) => {
              editor.addCommand(monaco.KeyCode.Enter, () => {
                const model = editor.getModel(); if (!model) return; const selections = editor.getSelections() || []; editor.executeEdits("hard-break", selections.map(sel => ({
                  range: sel, text: " \n", // 2 espacios + nueva línea
                  forceMoveMarkers: true,
                })));
              })
            }}
          />
        ) : (
          <Tinted>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {normalizedText}
            </ReactMarkdown>
          </Tinted>
        )}
      </div>
    </div>
  );
}
