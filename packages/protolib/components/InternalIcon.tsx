import type { ComponentType } from "react";
import { Bot } from "@tamagui/lucide-icons";

export const getIcon = (
  Icon: string | ComponentType<any> | null | undefined,
  opts: { color?: string; size?: number | string; opacity?: number; strokeWidth?: number } = {}
) => {
  const { color = "var(--gray9)", size = 20, opacity = 0.8, strokeWidth = 2 } = opts;

  if (!Icon) {
    return <Bot color={color} size={size} opacity={opacity} strokeWidth={strokeWidth} />;
  }

  if (typeof Icon === "string") {
    return <InternalIcon name={Icon} color={color} size={size} opacity={opacity} />;
  }

  const IconComp = Icon as ComponentType<any>;
  return <IconComp color={color} size={size} opacity={opacity} strokeWidth={strokeWidth} />;
};


export const InternalIcon = ({
  name,
  color = 'var(--gray9)',
  size = 20,
  opacity = 0.8,
}: {
  name: string;
  color?: string;
  size?: number | string;
  opacity?: number;
}) => (
  <div
    style={{
      opacity,
      width: size,
      height: size,
      backgroundColor: color,
      WebkitMask: `url('/public/icons/${name}.svg') center / contain no-repeat`,
      mask: `url('/public/icons/${name}.svg') center / contain no-repeat`,
    }}
  />
);