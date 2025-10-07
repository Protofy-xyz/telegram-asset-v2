import React, { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { TextArea } from '@my/ui'
import { XStack, YStack, Button, Spinner, Text } from '@my/ui'
import { Trash, Plus, Mic } from '@tamagui/lucide-icons'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useBoardActions, useBoardStates } from '@extensions/boards/store/boardStore'
import { generateActionCode, generateStateCode } from '@extensions/boards/utils/ActionsAndStates';

const minHeight = 50;
const maxHeight = 200;

function renderHighlightedHTML(text: string) {
  // 1) escapar HTML
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

export const BoardTextArea = ({
  value,
  speechRecognition,
  onChange,
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
  const tagsChars = {
    states: "#",
    actions: "@"
  }

  const ref = useRef(null);
  const [speechRecognitionEnabled, setSpeechRecognitionEnabled] = useState(false);
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

  const [showDropdown, setShowDropdown] = useState(null)
  const [inputInsertIndex, setInputInsetIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const overlayRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!showDropdown) {
      setSelectedIndex(0)
      return
    }

    if (!dropDown[showDropdown]?.length) return

    const el = itemRefs.current[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });


    const handleKeyDown = (e) => {
      e.stopPropagation()
      switch (e.key) {
        case 'ArrowUp':
          if (showDropdown) {
            if ((selectedIndex - 1) >= 0) {
              setSelectedIndex(prev => prev - 1)
            } else {
              setSelectedIndex(dropDown[showDropdown].length - 1)
            }
          }
          break;
        case 'ArrowDown':
          if (showDropdown) {
            if ((selectedIndex + 1) < dropDown[showDropdown].length) {
              setSelectedIndex(prev => prev + 1)
            } else {
              setSelectedIndex(0)
            }
          }
          break;
        case 'Escape':
          setShowDropdown(null)
          break;
        case 'Tab':
          let value = ref.current.value
          let selection = dropDown[showDropdown][selectedIndex]
          let text = showDropdown === "actions"
            ? generateActionCode(selection)
            : generateStateCode([selection])

          onChange({
            target: {
              value: value.slice(0, inputInsertIndex - 1) + (text + " ") + value.slice(inputInsertIndex + 1)
            }
          })
          setShowDropdown(null)
          break;
        default:
          break;
      }
      setTimeout(() => {
        ref.current.focus()
      }, 150)
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown, selectedIndex, inputInsertIndex]);

  // handle backspace
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.stopPropagation()
      }

      switch (e.key) {
        case 'Backspace':
        case 'Delete':
          const input = e.target;
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
                // set the cursor after tag remove
                input?.setSelectionRange(tokenStart, tokenStart);
              }, 0);
            }
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputInsertIndex, dumpedValue]);

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

  return (
    <XStack pos='relative' f={1} gap="$3" ai="flex-end">
      {
        enableShortcuts && showDropdown && <YStack
          style={{
            position: "absolute",
            width: "100%",
            bottom: "120%",
          }}
          maxHeight={"150px"}
          overflowBlock="scroll"
          p="10px"
          br="$4"
          bg="$gray4"
          borderWidth="1px"
          borderColor={"$gray6"}
          gap="$2"
        >
          <Text color="$gray9" pl="$2" fontSize={"$5"} >{showDropdown}</Text>
          {
            dropDown[showDropdown]?.length
              ? dropDown[showDropdown].map((s, i) => <button
                ref={el => (itemRefs.current[i] = el)}
                key={s}
                style={{
                  backgroundColor: i === selectedIndex ? "var(--gray6)" : "transparent",
                  paddingBlock: "5px",
                  paddingInline: "10px",
                  borderRadius: "5px",
                  scrollMarginTop: '40px',
                  scrollMarginBottom: '6px',
                }}
              >{s}</button>)
              : <div>no {showDropdown} found</div>
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
          value={dumpedValue}
          placeholder={placeholder}
          onChange={(prevText) => {
            if (prevText.target.value.endsWith(" #")) setShowDropdown("states");
            if (prevText.target.value.endsWith(" @")) setShowDropdown("actions");

            // dedump and set the new symbols
            let cleaned = removeUnknownTags(prevText.target.value, symbols);
            let dedumped = dedump(cleaned, symbols);
            updateSymbols(dedumped, setSymbols)

            // set the dumped
            onChange({ target: { value: dedumped } });
          }}
          onKeyUp={(e) => {
            e.preventDefault();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.stopPropagation();
              return;
            }
            const index = e.currentTarget.selectionStart;
            setInputInsetIndex(index);
            if (e.currentTarget.value[index - 1] === "#") {
              setShowDropdown("states");
            } else if (e.currentTarget.value[index - 1] === "@") {
              setShowDropdown("actions");
            } else {
              setShowDropdown(null)
            }
          }}
          onKeyDown={onKeyDown}
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
        speechRecognition && browserSupportsSpeechRecognition && <XStack cursor="pointer" onPress={() => {
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