import React, { useState } from "react"

export const Toggle = ({ checked = false, onChange }: { checked: boolean, onChange?: (val: boolean) => void }) => {
  const [on, setOn] = useState(checked)

  const toggle = () => {
    const newVal = !on
    setOn(newVal)
    onChange?.(newVal)
  }

  return (
    <div
      onClick={toggle}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "9999px",
        backgroundColor: on ? "#5FA778" : "#555",
        display: "flex",
        alignItems: "center",
        padding: "3px",
        cursor: "pointer",
        transition: "background-color 0.2s ease",
      }}
    >
      <div
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          backgroundColor: "white",
          transform: `translateX(${on ? "20px" : "0"})`,
          transition: "transform 0.2s ease",
        }}
      />
    </div>
  )
}
