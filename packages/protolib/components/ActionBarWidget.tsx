import { TooltipSimple, XStack, YStack } from "@my/ui"
import { processActionBar } from "app/bundles/actionBar"
import { useRouter } from 'next/router'
import { useState } from "react"
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp } from "@tamagui/lucide-icons"

export const ActionBarButton = ({ Icon, selected = false, ...props }) => {
  const size = 34
  return <TooltipSimple disabled={!(props.tooltipText)} placement="top" delay={{ open: 500, close: 0 }} restMs={0} label={props.tooltipText}>
    <YStack
      jc="center"
      ai="center"
      br="$4"
      cursor='pointer'
      scaleIcon={1.8}
      w={size}
      h={size}
      hoverStyle={{ bg: '$gray2', scale: 1.05 }}
      {...props}
    >
      <Icon size={20} color={selected ? "var(--color8)" : "var(--color)"} fill={props.fill ? "var(--color)" : "transparent"} {...props.iconProps} />
    </YStack>
  </TooltipSimple>
}

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