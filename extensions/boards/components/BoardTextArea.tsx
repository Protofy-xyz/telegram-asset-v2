import React, { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { TextArea } from '@my/ui'
import { XStack, YStack, Button, Spinner, Text } from '@my/ui'
import { Trash, Plus, Mic } from '@tamagui/lucide-icons'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useBoardActions, useBoardStates } from '@extensions/boards/store/boardStore'

const minHeight = 50;
const maxHeight = 200;

function renderHighlightedHTML(text: string) {
  // 1) escapar HTML
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const escaped = esc(text);

  const withTags = escaped.replace(
    /&lt;([^&][\s\S]*?)&gt;/g,
    (_m, inner) => {
      if (inner.startsWith("#")) {
        return `<span 
          style="
            background-color: var(--green10); 
            color: var(--gray3); 
            width: fit-content; 
            display: inline; 
            padding-block: 3px; 
            border-radius: 5px; 
          "><span style="color:transparent">&lt;</span>${inner ?? ""}<span style="color:transparent">&gt;</span></span>`
      } else if (inner.startsWith("@")) {
        return `<span 
          style="
            background-color: var(--blue10); 
            color: var(--gray3); 
            width: fit-content; 
            display: inline; 
            padding-block: 3px; 
            border-radius: 5px; 
          "><span style="color:transparent">&lt;</span>${inner ?? ""}<span style="color:transparent">&gt;</span></span>`
      }
    }
  );

  return withTags;
}


export const BoardTextArea = ({
  value,
  speechRecognition,
  onChange,
  onKeyDown,
  readOnly,
  placeholder,
  style,
  ...rest
}: any) => {
  let states = useBoardStates()
  let actions = useBoardActions()
  const dropDownActions = Object.keys(actions)
  const dropDownStates = Object.keys(states)
  const dropDown = {
    states: dropDownStates, actions: dropDownActions
  }
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
              setSelectedIndex(dropDownStates.length - 1)
            }
          }
          break;
        case 'ArrowDown':
          if (showDropdown) {
            if ((selectedIndex + 1) < dropDownStates.length) {
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
          onChange({
            target: {
              value: value.slice(0, inputInsertIndex - 1) + "<" + (tagsChars[showDropdown]) + (dropDown[showDropdown][selectedIndex] || "unknown state") + "> " + value.slice(inputInsertIndex + 1)
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
            const before = value.slice(0, start);
            const after = value.slice(start);

            const match = before.match(/<[@#][^>]+>$/);
            if (match) {
              e.preventDefault();

              const tokenStart = start - match[0].length;
              const newValue = value.slice(0, tokenStart) + after;
              onChange({ target: { value: newValue } })

              setTimeout(() => {
                // set the cursor after tag remove
                input.setSelectionRange(tokenStart, tokenStart);
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
  }, [inputInsertIndex]);

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
        showDropdown && <YStack
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
          dangerouslySetInnerHTML={{ __html: renderHighlightedHTML(value) }}
        />

        <textarea
          ref={ref}
          readOnly={readOnly}
          value={value}
          placeholder={placeholder}
          onChange={(prevText) => {
            if (prevText.target.value.endsWith(" #")) setShowDropdown("states");
            if (prevText.target.value.endsWith(" @")) setShowDropdown("actions");
            onChange(prevText);
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
            caretColor: 'black',  // this caret, has color, to use for the overlay text
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