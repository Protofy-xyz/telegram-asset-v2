import React, { useRef, useState, useLayoutEffect, useEffect, useMemo, useCallback } from 'react'
import { TextArea } from '@my/ui'
import { XStack, YStack, Button, Spinner, Text } from '@my/ui'
import { Trash, Plus, Mic, Binary, ALargeSmall, Braces, ListTree, ArrowDown, ChevronDown, Zap } from '@tamagui/lucide-icons'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useBoardActions, useBoardStates } from '@extensions/boards/store/boardStore'
import { generateActionCode, generateStateCode } from '@extensions/boards/utils/ActionsAndStates';
import { isElectron } from 'protolib/lib/isElectron';

// ===================== NUEVO: utilidades selección de tokens =====================
const TOKEN_RE = /^<[@#][^>]+>$/;

function getTokenBoundsAt(text: string, index: number): { start: number; end: number } | null {
  const start = text.lastIndexOf('<', index);
  if (start === -1) return null;
  const end = text.indexOf('>', Math.max(index - 1, 0));
  if (end === -1) return null;
  const candidate = text.slice(start, end + 1);
  if (!TOKEN_RE.test(candidate)) return null;
  return { start, end: end + 1 }; // end exclusivo
}
// ================================================================================
function renderHighlightedHTML(text: string) {
  // scape html
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const escaped = esc(text);

  const tagged = escaped.replace(
    /&lt;([^&][\s\S]*?)&gt;/g,
    (_m, inner) => {
      if (inner.startsWith("#")) {
        return `<span 
          style="
            background-color: var(--green6); 
            color: var(--green11); 
            width: fit-content; 
            display: inline; 
            paddingBlock: 3px; 
            border-radius: 5px; 
          "><span style="color:transparent">&lt;</span>${inner ?? ""}<span style="color:transparent">&gt;</span></span>`
      } else if (inner.startsWith("@")) {
        return `<span 
          style="
            background-color: var(--blue6); 
            color: var(--blue11); 
            width: fit-content; 
            display: inline; 
            paddingBlock: 3px; 
            border-radius: 5px; 
          "><span style="color:transparent">&lt;</span>${inner ?? ""}<span style="color:transparent">&gt;</span></span>`
      }
    }
  );

  return tagged;
}

const sortEntriesByKeyLengthDesc = (obj: Record<string, string>) => Object.entries(obj).sort((a, b) => b[0].length - a[0].length);

const dump = (text, symbols = {}) => {
  let dumped = text;
  for (const [key, value] of sortEntriesByKeyLengthDesc(symbols)) {
    dumped = dumped.replaceAll(key, value);
  }
  return dumped;
}

const dedump = (text, symbols = {}) => {
  let dedumped = text;
  for (const [key, value] of sortEntriesByKeyLengthDesc(symbols)) {
    dedumped = dedumped.replaceAll(value, key);
  }
  return dedumped;
}

const getSymbols = (text, pattern: RegExp, matchCb = (match) => { }) => {
  const matches = [...text.matchAll(pattern)];
  const symbols = {};
  matches.forEach((match, i) => {
    const key = match[0];
    symbols[key] = matchCb(key) ?? "unknown";
  });
  return symbols;
};

const updateSymbols = (value, setSymbols) => {
  let states = getSymbols(value, /\bboard(?:\?\.\[\s*"(?:[^"\\]|\\.)*"\s*\])+/g, (match) => {
    let matches = [...match.matchAll(/\?\.\["([^"]+)"\]/g)]
    let properties = matches.map((m) => m[1]);
    return "<#" + properties.join(".") + ">"
  })
  let actions = getSymbols(
    value,
    /await\s+(?:\w+\.)?execute[_A-Za-z]*\(\{\s*name\s*:\s*["'][^"']+["'](?:\s*,[\s\S]*?)?\}\)/gs,
    (match) => {
      const name = match.match(/name\s*:\s*["']([^"']+)["']/);
      return "<@" + name[1] + ">";
    }
  );
  let _symbols = {
    ...states,
    ...actions
  }
  setSymbols(_symbols)
}

const removeUnknownTags = (value, symbols) => {
  let cleanedText = value.replace(
    /<([^&][\s\S]*?)>/g,
    (_m, inner) => {
      if (!Object.values(symbols).includes(_m)) {
        let prefix = ""
        if (inner.startsWith("@")) {
          prefix = "@"
        } else {
          prefix = "#"
        }
        return "<" + prefix + "unknown>"
      }
      return _m
    }
  );
  return cleanedText
}

const CARET_STYLE_PROPERTIES = [
  'box-sizing',
  'width',
  'height',
  'overflow-x',
  'overflow-y',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'font-style',
  'font-variant',
  'font-weight',
  'font-stretch',
  'font-size',
  'line-height',
  'font-family',
  'text-align',
  'text-transform',
  'text-indent',
  'text-decoration',
  'letter-spacing',
  'word-spacing',
  'tab-size',
  'direction'
];

const getCaretMetrics = (textarea: HTMLTextAreaElement, position: number) => {
  if (typeof window === 'undefined' || !textarea) return null;

  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');

  CARET_STYLE_PROPERTIES.forEach((prop) => {
    const value = computed.getPropertyValue(prop);
    if (value) {
      mirror.style.setProperty(prop, value);
    }
  });

  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.overflow = 'hidden';

  const value = textarea.value;
  mirror.textContent = value.slice(0, position);

  const marker = document.createElement('span');
  marker.textContent = value.slice(position) || '.';
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  const left = marker.offsetLeft;
  const lineHeight = parseFloat(computed.lineHeight || '') || parseFloat(computed.fontSize || '') || 16;
  const borderTop = parseFloat(computed.borderTopWidth || '') || 0;
  const borderLeft = parseFloat(computed.borderLeftWidth || '') || 0;
  document.body.removeChild(mirror);

  return {
    top,
    left,
    lineHeight,
    borderTop,
    borderLeft,
  };
};

const ActionRow = ({ action, rowClick }) => {
  return <XStack justifyContent="space-between" gap="$3" alignItems="center" onClick={rowClick}
  >
    <XStack justifyContent="flex-start" gap="$3" alignItems="center">
      <Zap
        style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }}
      />
      {action.name}
    </XStack>
    <Text color="$blue11">{(action?.description ?? "")?.length >= 30 ? (action?.description ?? "").slice(0, 30) + "..." : (action?.description ?? "")}</Text>
  </XStack>
}

const StateRow = ({ state, rowClick }) => {
  const type = typeof state.value
  const [showProperties, setShowProperties] = useState(false)

  if (type === "number") {
    return <XStack onClick={() => rowClick()} justifyContent="space-between" gap="$3" alignItems="center">
      <XStack justifyContent="flex-start" gap="$3" alignItems="center">
        <Binary
          style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }}
        />
        {state.name}
      </XStack>
      <Text color="$green11">{state.value}</Text>
    </XStack>
  }

  if (type === "string") {
    return <XStack onClick={() => rowClick()} justifyContent="space-between" gap="$3" alignItems="center">
      <XStack justifyContent="flex-start" gap="$3" alignItems="center">
        <ALargeSmall
          style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }}
        />
        {state.name}
      </XStack>
      <Text color="$green11" textAlign="right">{state.value.length > 30 ? state.value.slice(0, 30) + "..." : state.value}</Text>
    </XStack>
  }

  if (type === "object") {
    return <YStack onClick={() => setShowProperties(prev => !prev)} gap="$3">
      <XStack justifyContent="space-between" gap="$3" alignItems="center">
        <XStack justifyContent="flex-start" gap="$3" alignItems="center">
          <ListTree
            style={{ color: "var(--gray9)", stroke: "1px", height: "20px" }}
          />
          {state.name}
        </XStack>
        <YStack br="$2" hoverStyle={{ backgroundColor: "$gray8" }}
          onClick={(e) => {
            e.stopPropagation()
            setShowProperties(prev => !prev)
          }} >
          <ChevronDown
            height="20px"
            color="$gray9"
            rotate={showProperties ? "180deg" : "0deg"}
            style={{
              transition: "all ease-in-out 120ms"
            }}
          />
        </YStack>
      </XStack>
      {
        showProperties && <YStack px="$5" pb="$2">
          {Object.keys(state.value).map(key => {
            return <XStack gap="$3" br="$2" pl="$3" py="$1" hoverStyle={{ backgroundColor: "var(--gray8)" }} onClick={() => rowClick(key)}>
              <Text>{key}</Text>
              <Text color="$green11">{typeof state.value[key]}</Text>
            </XStack>
          })}
        </YStack>
      }
    </YStack>
  }

  return <XStack justifyContent="flex-start" gap="$3" alignItems="center">
    {state.name}
  </XStack>
}

export const BoardTextArea = ({
  value = "",
  speechRecognition,
  onChange,
  onEnter,
  onKeyDown,
  readOnly,
  placeholder,
  style,
  enableShortcuts = false,
  disabled = false,
  footer = null,
  ...rest
}: any) => {
  let states = useBoardStates()
  let actions = useBoardActions()
  const dropDownActions = Object.keys(actions)
  const dropDownStates = Object.keys(states)
  const dropDown = {
    states: dropDownStates, actions: dropDownActions
  }
  const [symbols, setSymbols] = useState({})
  const [dumpedValue, setDumpedValue] = useState(value)

  const textAreaPadding = "12px"
  const containerRef = useRef<HTMLElement | null>(null);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null)
  const [inputInsertIndex, setInputInsertIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dropdownRef = useRef<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const overlayContentRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 50, left: 0 });
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const updateDropdownPosition = useCallback(() => {
    if (!showDropdown) return;
    const textarea = ref.current;
    const container = containerRef.current;

    if (!textarea || !container) return;

    const selection = typeof textarea.selectionStart === 'number'
      ? textarea.selectionStart
      : inputInsertIndex;

    const caret = getCaretMetrics(textarea, selection ?? 0);
    if (!caret) return;

    const textareaRect = textarea.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const caretTop = textareaRect.top - containerRect.top + caret.top - textarea.scrollTop + caret.lineHeight + caret.borderTop;
    const caretLeft = textareaRect.left - containerRect.left + caret.left - textarea.scrollLeft + caret.borderLeft;
    const dropdownWidth = dropdownRef.current?.offsetWidth ?? 0;
    const estimatedWidth = dropdownWidth > 0 ? dropdownWidth : Math.min(containerRect.width, 320);
    const maxLeft = containerRect.width - estimatedWidth;
    const safeLeft = maxLeft <= 0 ? 0 : Math.min(caretLeft, maxLeft);
    const safeTop = Math.max(0, caretTop + 4);

    setDropdownPosition({
      top: safeTop,
      left: Math.max(0, safeLeft),
    });
  }, [showDropdown, inputInsertIndex]);

  const getDropdownSelection = () => {
    let selection = filteredOptions[selectedIndex]
    if (selection === undefined || selection === null) return
    return selection
  }

  const selectDropdownOption = (selection: String | String[], value: String) => {
    if (selection === undefined || selection === null) return
    let text = showDropdown === "actions"
      ? generateActionCode(selection)
      : generateStateCode(Array.isArray(selection) ? selection : [selection])

    const dropdownFilter = dumpedValue
      .slice(0, inputInsertIndex)
      .replace(/<[^>]*>/g, '')
      .match(/[@#]([^\s@#]+)(?!.*[@#][^\s@#]+)/)?.[1]
    if (!dropdownFilter) {
      onChange({
        target: {
          value: value.slice(0, inputInsertIndex - 1) + (text + " ") + value.slice(inputInsertIndex + 1)
        }
      })
    } else {
      onChange({
        target: {
          value: value.slice(0, inputInsertIndex - dropdownFilter.length - 1) + (text + " ") + value.slice(inputInsertIndex + 1)
        }
      })
    }
  }

  const handleInputIndexChange = (index, value) => {
    setInputInsertIndex(index);
    const leftText = value.slice(0, index);
    const splits = leftText.split(" ")
    const lastSegment = splits[splits.length - 1];
    const lastSegmentFirstChar = lastSegment[0];

    if (lastSegmentFirstChar === "#") {
      setShowDropdown("states");
    } else if (lastSegmentFirstChar === "@") {
      setShowDropdown("actions");
    } else if ((lastSegmentFirstChar != "@" && lastSegmentFirstChar != "#")) {
      setShowDropdown(null)
    }
  }

  useEffect(() => {
    // clean unknown tags (manualmente escritos) -> dedump → recalc symbols → dump con nuevos símbolos
    let cleaned = removeUnknownTags(value, symbols);
    const dedumped = dedump(cleaned, symbols);
    const nextSymbolsCollector = {};
    updateSymbols(dedumped, (s) => Object.assign(nextSymbolsCollector, s));

    setSymbols(nextSymbolsCollector);
    setDumpedValue(dump(value, nextSymbolsCollector));
  }, [value]);

  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex])

  useEffect(() => {
    if (showDropdown) {
      ref.current?.focus()
    }
  }, [showDropdown, selectedIndex])

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
    }
  }, [showDropdown, dumpedValue, inputInsertIndex, updateDropdownPosition]);

  useEffect(() => {
    if (speechRecognitionEnabled && transcript) {
      onChange({ target: { value: transcript } });
    }
  }, [transcript, speechRecognitionEnabled]);

  useLayoutEffect(() => {
    const ta = ref.current
    if (!ta || !overlayContentRef.current) return
    overlayContentRef.current.style.transform =
      `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`
  }, [dumpedValue])

  const filteredOptions = useMemo(() => {
    if (!dropDown || !showDropdown) return []
    const left = dumpedValue
      .slice(0, inputInsertIndex)
      .replace(/<[^>]*>/g, '');

    const dropdownFilter =
      /[@#]\s*$/.test(left)
        ? null
        : (() => {
          const all = [...left.matchAll(/[@#]([^\s@#]+)/g)];
          return all.length ? all[all.length - 1][1] : null; // último match
        })();

    if (!dropdownFilter) return dropDown[showDropdown];
    return dropDown[showDropdown]
      .filter(key => key.toLowerCase().startsWith(dropdownFilter.toLowerCase()))
  }, [showDropdown, dumpedValue, inputInsertIndex]);

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredOptions])

  // ===================== NUEVO: callback para seleccionar token entero =====================
  const selectWholeTokenIfAny = useCallback((ta: HTMLTextAreaElement | null) => {
    if (!ta) return false;
    if (showDropdown) return false; // no interferir con dropdown abierto
    const idx = ta.selectionStart ?? 0;
    const bounds = getTokenBoundsAt(dumpedValue, idx);
    if (!bounds) return false;
    ta.setSelectionRange(bounds.start, bounds.end);
    return true;
  }, [dumpedValue, showDropdown]);
  // =======================================================================

  return (
    <XStack
      ref={containerRef}
      position='relative'
      flex={1}
      gap="$3"
      height="100%"
      opacity={disabled ? 0.7 : 1}
      backgroundColor="$bgPanel"
      padding="$2"
      flexDirection='column'
    >
      {
        enableShortcuts && showDropdown && <YStack
          ref={dropdownRef}
          style={{
            position: "absolute",
            minWidth: "220px",
            maxWidth: "100%",
            width: "max-content",
            zIndex: 10,
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
          maxHeight={"200px"}
          overflowY="scroll"
          p="10px"
          br="$4"
          bg="$gray4"
          borderWidth="1px"
          borderColor={"$gray6"}
          gap="$2"
        >
          <XStack gap="$1">
            <Text
              color={showDropdown === "actions" ? "$blue11" : "$gray9"}
              bg={showDropdown === "actions" ? "$blue6" : "transparent"}
              px="$3"
              py="$1"
              br="$2"
              fontSize={"$5"}
              textAlign="center"
              alignSelf="center"
              cursor="pointer"
              onClick={() => { setShowDropdown("actions"); setSelectedIndex(0) }}
              style={{ transition: "all ease-in-out 80ms" }}
            >actions</Text>
            <Text
              color={showDropdown === "states" ? "$green11" : "$gray9"}
              bg={showDropdown === "states" ? "$green6" : "transparent"}
              px="$3"
              py="$1"
              br="$2"
              fontSize={"$5"}
              textAlign="center"
              alignSelf="center"
              cursor="pointer"
              style={{ transition: "all ease-in-out 80ms" }}
              onClick={() => { setShowDropdown("states"); setSelectedIndex(0) }}
            >states</Text>
          </XStack>
          {
            filteredOptions?.length
              ? filteredOptions.map((v, i) => <button
                ref={el => (itemRefs.current[i] = el)}
                key={v}
                onMouseEnter={(e) => { setSelectedIndex(i) }}
                style={{
                  backgroundColor: i === selectedIndex ? "var(--gray6)" : "transparent",
                  paddingBlock: "5px",
                  paddingInline: "10px",
                  borderRadius: "5px",
                  scrollMarginTop: '50px',
                  scrollMarginBottom: '6px',
                }}
              >{
                  showDropdown === "actions"
                    ? <ActionRow action={actions[v]} rowClick={() => {
                      selectDropdownOption(getDropdownSelection(), dumpedValue)
                      setShowDropdown(null)
                      setTimeout(() => { ref.current?.focus() }, 50)
                    }} />
                    : <StateRow state={{ name: v, value: states[v], }} rowClick={(k = null) => {
                      let selection = getDropdownSelection()
                      if (k !== null) {
                        selection = [selection, k]
                      }
                      selectDropdownOption(selection, dumpedValue)
                      setShowDropdown(null)
                      setTimeout(() => { ref.current?.focus() }, 50)
                    }}
                    />
                }</button>)
              : <div
                style={{
                  backgroundColor: "var(--gray6)",
                  paddingBlock: "5px",
                  paddingInline: "10px",
                  borderRadius: "5px",
                  scrollMarginTop: '40px',
                  scrollMarginBottom: '6px',
                }}
              >no {showDropdown} found</div>
          }
        </YStack>}
      <YStack pos="relative" f={1} w="100%">
        <YStack
          ref={overlayRef}
          display="block"
          aria-hidden
          pointerEvents="none"
          pos="absolute"
          t={0}
          l={0}
          r={0}
          b={0}
          style={{
            boxSizing: 'border-box',
            overflow: 'hidden',
            lineHeight: '1.4',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: 'inherit',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            wordBreak: 'normal',
          }}
        >
          <div
            ref={overlayContentRef}
            style={{
              willChange: 'transform',
              transform: 'translate(0,0)',
              padding: textAreaPadding
            }}
            dangerouslySetInnerHTML={{ __html: renderHighlightedHTML(dumpedValue) }}
          />
        </YStack>

        <textarea
          ref={ref}
          readOnly={readOnly}
          value={dump(value, symbols)}
          placeholder={placeholder}
          disabled={disabled}
          onBlur={rest.onBlur}
          onFocus={rest.onFocus}
          onMouseDown={(e) => {
            // Dejar que el navegador ponga el caret y luego expandir si procede
            requestAnimationFrame(() => {
              selectWholeTokenIfAny(e.currentTarget);
            });
          }}
          onClick={(e) => {
            selectWholeTokenIfAny(e.currentTarget);
          }}
          onDoubleClick={(e) => {
            if (selectWholeTokenIfAny(e.currentTarget)) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onSelect={(e) => {
            const index = e.currentTarget.selectionStart ?? 0;
            handleInputIndexChange(index, e.currentTarget.value);

            // Si el caret cae dentro de un token, expande a token completo
            if (e.currentTarget.selectionStart === e.currentTarget.selectionEnd) {
              selectWholeTokenIfAny(e.currentTarget);
            }

            if (showDropdown) {
              if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => updateDropdownPosition());
              } else {
                updateDropdownPosition();
              }
            }
          }}
          onChange={(e) => {
            const index = e.currentTarget.selectionStart ?? 0;
            handleInputIndexChange(index, e.currentTarget.value);

            let cleaned = removeUnknownTags(e.currentTarget.value, symbols);
            let dedumped = dedump(cleaned, symbols);
            updateSymbols(dedumped, setSymbols)

            onChange({ target: { value: dedumped } });
          }}
          onKeyUp={(e) => {
            const index = e.currentTarget.selectionStart ?? 0;
            setInputInsertIndex(index);
            if (showDropdown) {
              if (typeof window !== 'undefined') {
                window.requestAnimationFrame(() => updateDropdownPosition());
              } else {
                updateDropdownPosition();
              }
            }
          }}
          onKeyDown={(e) => {
            if (showDropdown === null) { // text mode
              const input = e.currentTarget;
              switch (e.key) {
                case 'Backspace':
                case 'Delete':
                  const start = input.selectionStart;
                  const end = input.selectionEnd;

                  if (start === end) {
                    const before = dumpedValue.slice(0, start);
                    const after = dumpedValue.slice(start);

                    const match = before.match(/<[@#][^>]+>$/);
                    if (match) {
                      e.preventDefault();

                      const tokenStart = start - match[0].length;
                      const newValue = dumpedValue.slice(0, tokenStart) + after;
                      onChange({ target: { value: newValue } })

                      setTimeout(() => {
                        input?.setSelectionRange(tokenStart, tokenStart);
                      }, 0);
                    }
                  }
                  break;
                case 'Enter':
                  if (e.shiftKey) return
                  e.preventDefault();
                  // dedump y símbolos actualizados
                  {
                    let cleaned = removeUnknownTags(dumpedValue, symbols);
                    let dedumped = dedump(cleaned, symbols);
                    updateSymbols(dedumped, setSymbols)
                    if (typeof onEnter === 'function') {
                      onEnter({ target: { value: dedumped } });
                    }
                  }
                  break;
              }
            } else { // dropdown mode
              if (e.key === "Backspace") {
                const input = e.currentTarget;
                const start = input.selectionStart;
                const end = input.selectionEnd;
                if (start === end) {
                  if (dumpedValue[start - 1] === "@" || dumpedValue[start - 1] === "#") {
                    setShowDropdown(null)
                  }
                }
                return
              }

              const triggerKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Enter", "Tab"]
              if (!triggerKeys.includes(e.key)) {
                return
              }

              e.preventDefault()
              e.stopPropagation()

              switch (e.key) {
                case 'ArrowLeft':
                  setShowDropdown("actions")
                  setSelectedIndex(0)
                  break;
                case 'ArrowRight':
                  setShowDropdown("states")
                  setSelectedIndex(0)
                  break;
                case 'ArrowUp':
                  if ((selectedIndex - 1) >= 0) {
                    setSelectedIndex(prev => prev - 1)
                  } else {
                    setSelectedIndex(filteredOptions.length - 1)
                  }
                  break;
                case 'ArrowDown':
                  if ((selectedIndex + 1) < filteredOptions.length) {
                    setSelectedIndex(prev => prev + 1)
                  } else {
                    setSelectedIndex(0)
                  }
                  break;
                case 'Escape':
                  setShowDropdown(null)
                  break;
                case 'Tab':
                case 'Enter':
                  e.preventDefault()
                  let selection = getDropdownSelection()
                  selectDropdownOption(selection, dumpedValue)
                  setShowDropdown(null)
                  setTimeout(() => {
                    if(!selection) return
                    const textarea = ref.current;
                    textarea?.setSelectionRange(inputInsertIndex + selection.length + 3, inputInsertIndex + selection.length + 3)
                    textarea?.focus()
                  }, 1)
                  break;
                default:
                  break;
              }
              return
            }
          }}
          onScroll={(e) => {
            const el = e.currentTarget
            const y = el.scrollTop
            const x = el.scrollLeft
            if (overlayContentRef.current) {
              overlayContentRef.current.style.transform = `translate(${-x}px, ${-y}px)`
            }
            if (showDropdown) {
              updateDropdownPosition();
            }
          }}
          spellCheck={false}
          style={{
            lineHeight: '1.4',
            width: '100%',
            resize: 'none',
            overflowY: 'auto',
            height: "100%",
            boxSizing: 'border-box',
            color: 'transparent',
            caretColor: 'var(--color)',
            fontSize: "inherit",
            padding: textAreaPadding,
            ...style,
          }}
        />
      </YStack>
      {footer}
      {
        !isElectron() && !footer && speechRecognition && browserSupportsSpeechRecognition && <XStack cursor="pointer" onPress={() => {
          if (speechRecognitionEnabled) {
            setSpeechRecognitionEnabled(false);
            SpeechRecognition.stopListening();
          } else {
            resetTranscript();
            setSpeechRecognitionEnabled(true);
            SpeechRecognition.startListening({ continuous: true });
          }
        }} gap="$2" h="fit-content" w="fit-content" backgroundColor={speechRecognitionEnabled ? "$red6" : "$gray4"} p="$3" jc="center"
          ai="center" hoverStyle={{ opacity: 0.9 }} pressStyle={{ opacity: 1.0 }}
          br="$3">
          <Mic size={"$1"} />
        </XStack>
      }
    </XStack >
  );
};
