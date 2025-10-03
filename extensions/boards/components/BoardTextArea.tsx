import React, { useRef, useState, useLayoutEffect, useEffect } from 'react'
import { TextArea } from '@my/ui'
import { XStack, YStack, Button, Spinner, Text } from '@my/ui'
import { Trash, Plus, Mic } from '@tamagui/lucide-icons'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useBoardStates } from '@extensions/boards/store/boardStore'

const minHeight = 50;
const maxHeight = 300;

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
  const dropDownStates = Object.keys(states)

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

  const [showStates, setShowStates] = useState(false)
  const [inputInsertIndex, setInputInsetIndex] = useState(0)
  const [selectedState, setSelectedState] = useState(0)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    if (!showStates) {
      setSelectedState(0)
      return
    }

    const el = itemRefs.current[selectedState];
    el?.scrollIntoView({ block: 'nearest' });


    const handleKeyDown = (e) => {
      e.stopPropagation()
      switch (e.key) {
        case 'ArrowUp':
          if (showStates) {
            if ((selectedState - 1) >= 0) {
              setSelectedState(prev => prev - 1)
            } else {
              setSelectedState(dropDownStates.length - 1)
            }
          }
          break;
        case 'ArrowDown':
          if (showStates) {
            if ((selectedState + 1) < dropDownStates.length) {
              setSelectedState(prev => prev + 1)
            } else {
              setSelectedState(0)
            }
          }
          break;
        case 'Escape':
          setShowStates(false)
          break;
        case 'Tab':
          let value = ref.current.value
          onChange({ target: { value: value.slice(0, inputInsertIndex - 1) + "<" + dropDownStates[selectedState] + ">" + value.slice(inputInsertIndex + 1) } })
          setShowStates(false)
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
  }, [showStates, selectedState]);

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
        showStates && <YStack
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
          <Text color="$gray9" pl="$2" fontSize={"$5"} >states</Text>
          {
            dropDownStates.length
              ? dropDownStates.map((s, i) => <button
                ref={el => (itemRefs.current[i] = el)}
                key={s}
                style={{
                  backgroundColor: i === selectedState ? "var(--gray6)" : "transparent",
                  paddingBlock: "5px",
                  paddingInline: "10px",
                  borderRadius: "5px",
                  scrollMarginTop: '40px',
                  scrollMarginBottom: '6px',
                }}
              >{s}</button>)
              : <div>no actions or states found</div>
          }
        </YStack>}
      <textarea
        ref={ref}
        readOnly={readOnly}
        value={value}
        placeholder={placeholder}
        onChange={(prevText) => {
          if (prevText.target.value.endsWith("#")) {
            setShowStates(false)
          }
          onChange(prevText)
        }}
        onKeyUp={(e) => {
          e.preventDefault()
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.stopPropagation()
            return
          }
          const index = e.currentTarget.selectionStart;
          if (e.currentTarget.value[index - 1] === "#") {
            setShowStates(true)
          } else {
            setShowStates(false)
          }
          setInputInsetIndex(index)
        }}
        onKeyDown={onKeyDown}
        spellCheck={false}
        style={{
          lineHeight: '1.4',
          width: '100%',
          resize: 'none',
          overflowY: 'hidden',
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
          boxSizing: 'border-box',
          border: '1px solid var(--color6)',
          borderRadius: '8px',
          padding: '10px',
          backgroundColor: 'var(--color3)',
          ...style,
        }}
        {...rest}
      />
      {speechRecognition && browserSupportsSpeechRecognition && <XStack cursor="pointer" onPress={() => {
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
      </XStack>}
    </XStack>
  );
};