import { TooltipSimple, XStack, YStack } from "@my/ui"
import { processActionBar } from "app/bundles/actionBar"
import { useRouter } from 'next/router'
import { useState } from "react"
import { ChevronDown, ChevronUp } from "@tamagui/lucide-icons"

export const ActionBarButton = ({ Icon, selected = false, disabled = false, ...props }) => {
  const size = 34;

  const handlePress = (e) => {
    if (disabled) {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      return;
    }
    props.onPress?.(e);
  };

  return (
    <TooltipSimple
      disabled={!(props.tooltipText)}
      placement="top"
      delay={{ open: 500, close: 0 }}
      restMs={0}
      label={props.tooltipText}
    >
      <YStack
        jc="center"
        ai="center"
        br="$4"
        cursor={disabled ? 'default' : 'pointer'}
        scaleIcon={1.8}
        w={size}
        h={size}
        hoverStyle={disabled ? undefined : { bg: '$gray2', scale: 1.05 }}
        {...props}
        onPress={handlePress}
        role="button"
        aria-disabled={disabled}
        opacity={disabled ? 0.5 : 1}
      >
        <Icon
          size={20}
          color={disabled ? 'var(--gray8)' : (selected ? 'var(--color8)' : 'var(--color)')}
          fill={props.fill ? 'var(--color)' : 'transparent'}
          {...props.iconProps}
        />
      </YStack>
    </TooltipSimple>
  );
};

export const useActionBar = (actionBar?, onActionBarEvent?) => {
  const router = useRouter()
  const [hidden, setHidden] = useState(false)
  const [hiddenHover, setHiddenHover] = useState(false)

  let currentBar

  if (actionBar?.content) {
    currentBar = actionBar
  } else {
    currentBar = processActionBar(router, actionBar, onActionBarEvent)
  }

  return currentBar && currentBar.content?.length > 0 && <>
    <XStack
      p="$2"
      als="center"
      pos="fixed"
      elevation={10}
      bw={1}
      ai="center"
      boc="var(--gray6)"
      animation="quick"
      bc="var(--bgPanel)"
      zi={99999}
      b={currentBar.visible === false || hidden ? -200 : (hiddenHover ? 20 : 16)}
      gap="$2.5"
      br="var(--radius-5)"
      opacity={hiddenHover ? 0.7 : 1}
      scale={hiddenHover ? 0.94 : 1}
      enterStyle={{ b: -200 }}
    >
      {
        currentBar.content?.map((item, index) => {
          return item
        })
      }
      {/* {!(currentBar.hideable == false) && <ActionBarButton
        tooltipText="Hide Action Bar"
        Icon={ArrowDown}
        onPress={() => setHidden(!hidden)}
      />} */}
    </XStack>
    <YStack
      cursor="pointer"
      onPress={() => setHidden(!hidden)}
      pos="absolute"
      jc="center"
      als="center"
      b={hidden ? 5 : 0}
      w={300}
      ai="center"
      zi={99999}
      enterStyle={{ b: -20 }}
      minHeight="18px"
      onHoverIn={() => setHiddenHover(true)}
      onHoverOut={() => setHiddenHover(false)}
    >
      <ChevronUp color="var(--gray12)" display={hidden ? 'block' : 'none'} />
      <ChevronDown size={20} color="var(--gray8)" display={!hidden && hiddenHover ? 'block' : 'none'} />
    </YStack>
  </>
}   