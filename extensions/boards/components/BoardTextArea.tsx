import React, { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react'
import { TextArea } from '@my/ui'
import { XStack, YStack, Button, Spinner, Text } from '@my/ui'
import { Trash, Plus, Mic, Binary, ALargeSmall, Braces, ListTree, ArrowDown, ChevronDown, Zap } from '@tamagui/lucide-icons'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useBoardActions, useBoardStates } from '@extensions/boards/store/boardStore'
import { generateActionCode, generateStateCode } from '@extensions/boards/utils/ActionsAndStates';
import { isElectron } from 'protolib/lib/isElectron';

const minHeight = 50;
const maxHeight = 200;

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
    // key: await executeAction({....
    // value: <@card 3>
    dumped = dumped.replaceAll(key, value);
  }

  return dumped;
}

const dedump = (text, symbols = {}) => {
  let dedumped = text;
  for (const [key, value] of sortEntriesByKeyLengthDesc(symbols)) {
    // key: await executeAction({....
    // value: <@card 3>
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
  // update the text symbols
  let states = getSymbols(value, /\bboard(?:\?\.\[\s*"(?:[^"\\]|\\.)*"\s*\])+/g, (match) => {
    // get the property access strings in "board?.["card"]?.["test"]... -> ["card", "test"]
    let matches = [...match.matchAll(/\?\.\["([^"]+)"\]/g)]
    let properties = matches.map((m) => m[1]);
    return "<#" + properties.join(".") + ">"
  })
  let actions = getSymbols(value, /await\s+executeAction\(\{\s*name\s*:\s*"[^"]*"\s*\}\)/g, (match) => {
    const name = match.match(/name\s*:\s*["']([^"']+)["']/);
    return "<@" + name[1] + ">"
  })
  let _symbols = {
    ...states,
    ...actions
  }
  setSymbols(_symbols)
}

const removeUnknownTags = (value, symbols) => {
  // replace raw manually setted tags for "unknown"
  let cleanedText = value.replace(
    /<([^&][\s\S]*?)>/g,
    (_m, inner) => {
      console.log("symbols:::", symbols, _m, inner)
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
  value,
  speechRecognition,
  onChange,
  onEnter,
  onKeyDown,
  readOnly,
  placeholder,
  style,
  enableShortcuts = false,
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

  const ref = useRef(null);
  const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null)
  const [inputInsertIndex, setInputInsertIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const adjustHeight = () => {
    const textarea = ref.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };

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
      .slice(0, inputInsertIndex) // get the left side of the cursor
      .replace(/<[^>]*>/g, '') // remove tags to avoid collisions
      .match(/[@#]([^\s@#]+)(?!.*[@#][^\s@#]+)/)?.[1] // get the last #filter-string
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

  useEffect(() => {
    // clean unknown tags (manually setted) -> dedump → recalc symbols → dump with new symbols
    let cleaned = removeUnknownTags(value, symbols);
    const dedumped = dedump(cleaned, symbols);
    const nextSymbolsCollector = {};
    updateSymbols(dedumped, (s) => Object.assign(nextSymbolsCollector, s));
    const dumped = dump(dedumped, nextSymbolsCollector);

    setSymbols(nextSymbolsCollector);
    setDumpedValue(dumped);
  }, []);

  useEffect(() => {
    let cleaned = removeUnknownTags(value, symbols);
    const dedumped = dedump(cleaned, symbols);
    const nextSymbolsCollector = {};
    updateSymbols(dedumped, (s) => Object.assign(nextSymbolsCollector, s));

    setSymbols(nextSymbolsCollector);
    setDumpedValue(dump(value, nextSymbolsCollector));
  }, [value]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  // events with dropdown open
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex])

  useEffect(() => {
    if (showDropdown) {
      ref.current.focus()
    }
  }, [showDropdown, selectedIndex])

  // El hack: Espera a que se estabilice el DOM
  useEffect(() => {
    setTimeout(() => {
      adjustHeight();
    }, 0);
  }, []);

  useEffect(() => {
    if (speechRecognitionEnabled && transcript) {
      onChange({ target: { value: transcript } });
      adjustHeight();
    }
  }, [transcript, speechRecognitionEnabled]);

  const filteredOptions = useMemo(() => {
    if (!dropDown || !showDropdown) return []
    const dropdownFilter = dumpedValue
      .slice(0, inputInsertIndex) // get the left side of the cursor
      .replace(/<[^>]*>/g, '') // remove tags to avoid collisions
      .match(/[@#]([^\s@#]+)(?!.*[@#][^\s@#]+)/)?.[1] // get the last #filter-string
    if (!dropdownFilter) return dropDown[showDropdown]

    // set the index to 0 on each update, to avoid, hidden indexes in 
    // the dropdown
    return dropDown[showDropdown]
      .filter(key => {
        return key.toLowerCase().startsWith(dropdownFilter.toLowerCase())
      })
  }, [showDropdown, dumpedValue, inputInsertIndex]);

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredOptions])

  return (
    <XStack pos='relative' f={1} gap="$3" ai="flex-end">
      {
        enableShortcuts && showDropdown && <YStack
          style={{
            position: "absolute",
            width: "100%",
            bottom: "120%",
          }}
          maxHeight={"200px"}
          overflowBlock="scroll"
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
              style={{
                transition: "all ease-in-out 80ms"
              }}
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
              style={{
                transition: "all ease-in-out 80ms"
              }}
              onClick={() => { setShowDropdown("states"); setSelectedIndex(0) }}
            >states</Text>
          </XStack>
          {
            filteredOptions?.length
              ? filteredOptions.map((v, i) => <button
                ref={el => (itemRefs.current[i] = el)}
                key={v}
                onMouseEnter={(e) => {
                  setSelectedIndex(i)
                }}
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
                      setTimeout(() => {
                        ref.current.focus()
                      }, 50)
                    }} />
                    : <StateRow state={{ name: v, value: states[v], }} rowClick={(k = null) => {
                      let selection = getDropdownSelection()
                      // property access of object selection 
                      if (k !== null) {
                        selection = [selection, k]
                      }
                      selectDropdownOption(selection, dumpedValue)
                      setShowDropdown(null)
                      setTimeout(() => {
                        ref.current.focus()
                      }, 50)
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
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            wordBreak: 'normal',
            boxSizing: 'border-box',
            paddingTop: '14px',
            padding: '10px',
            borderRadius: '8px',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: 'inherit',
            overflow: 'auto',
            lineHeight: '1.4',
          }}
          dangerouslySetInnerHTML={{ __html: renderHighlightedHTML(dumpedValue) }}
        />

        <textarea
          ref={ref}
          readOnly={readOnly}
          value={dump(value, symbols)}
          placeholder={placeholder}
          onChange={(e) => {
            const index = e.currentTarget.selectionStart;
            setInputInsertIndex(index);
            // shortcut to trigger dropdown
            let end = e.currentTarget.value[index - 1];
            if (end === "#") {
              setShowDropdown("states");
            } else if (end === "@") {
              setShowDropdown("actions");
            } else if (end === " ") {
              setShowDropdown(null)
            }

            // dedump and set the new symbols
            let cleaned = removeUnknownTags(e.currentTarget.value, symbols);
            let dedumped = dedump(cleaned, symbols);
            updateSymbols(dedumped, setSymbols)

            // set the dumped
            onChange({ target: { value: dedumped } });
          }}
          onKeyUp={(e) => { }}
          onKeyDown={(e) => {
            if (showDropdown === null) { // text mode
              const input = e.currentTarget;
              switch (e.key) {
                case 'Backspace':
                case 'Delete':
                  const start = input.selectionStart;
                  const end = input.selectionEnd;

                  if (start === end) {
                    // check if a tag must be removed 
                    const before = dumpedValue.slice(0, start);
                    const after = dumpedValue.slice(start);

                    const match = before.match(/<[@#][^>]+>$/);
                    if (match) {
                      e.preventDefault();

                      const tokenStart = start - match[0].length;
                      const newValue = dumpedValue.slice(0, tokenStart) + after;
                      onChange({ target: { value: newValue } })

                      setTimeout(() => {
                        // set the cursor after tag remove
                        input?.setSelectionRange(tokenStart, tokenStart);
                      }, 0);
                    }
                  }
                  break;
                case 'Enter':
                  e.preventDefault();
                  // dedump and set the new symbols
                  let cleaned = removeUnknownTags(dumpedValue, symbols);
                  let dedumped = dedump(cleaned, symbols);
                  updateSymbols(dedumped, setSymbols)

                  // set the dumped
                  if (typeof onEnter === 'function') {
                    onEnter({ target: { value: dedumped } });
                  }
                  break;
              }
            } else { // dropdown mode
              // handle backspaces, without preventing default behaviour
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

              // custom key handle for dropdown navigation
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
                    ref.current.setSelectionRange(inputInsertIndex + selection.length + 3, inputInsertIndex + selection.length + 3)
                    ref.current.focus()
                  }, 1)
                  break;
                default:
                  break;
              }
              return
            }
          }}
          onScroll={(e) => {
            // sincroniza el scroll con la capa de resaltado
            if (overlayRef.current) {
              overlayRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
              overlayRef.current.scrollLeft = (e.target as HTMLTextAreaElement).scrollLeft;
            }
          }}
          spellCheck={false}
          style={{
            lineHeight: '1.4',
            width: '100%',
            resize: 'none',
            overflowY: 'auto',
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            boxSizing: 'border-box',
            border: '1px solid var(--color6)',
            borderRadius: '8px',
            paddingTop: "14px",
            padding: '10px',
            backgroundColor: 'var(--gray4)',
            color: 'transparent',
            caretColor: 'var(--color)',  // this caret, has color, to use for the overlay text
            fontSize: "inherit",
            ...style,
          }}
        />
      </YStack>
      {
        !isElectron() && speechRecognition && browserSupportsSpeechRecognition && <XStack cursor="pointer" onPress={() => {
          if (speechRecognitionEnabled) {
            setSpeechRecognitionEnabled(false);
            SpeechRecognition.stopListening();
            // Stop speech recognition logic here
          } else {
            resetTranscript();
            setSpeechRecognitionEnabled(true);
            SpeechRecognition.startListening({ continuous: true });
            // Start speech recognition logic here
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