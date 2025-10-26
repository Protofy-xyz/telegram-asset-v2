import { Button, View, Text } from "@my/ui";
import { Tinted } from "./Tinted";
import { useEffect, useState } from "react";

export const InteractiveGrid = ({ data = [], onChange = (data) => {} }) => {
  const [grid, setGrid] = useState(data);

  const changeCell = (row: number, col: number) => {
    const newGrid = grid.map((r, rI) =>
      r.map((c, cI) =>
        rI === row && cI === col
          ? { ...c, value: c.value === "true" ? "false" : "true" }
          : c
      )
    );
    setGrid(newGrid);
    onChange(newGrid);
  };

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      setGrid(data);
    }
  }, [data]);

  return (
    <Tinted>
      <View
        style={{
          gap: 10,
          justifyContent: "space-between",
          alignItems: "center",
          height: "100%",
          width: "100%",
          padding: 10,
        }}
        className="no-drag"
      >
        {grid.length ? (
          grid.map((row, rowI) => (
            <View
              key={rowI}
              style={{
                gap: 10,
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
                flex: 1,
              }}
            >
              {row.map((column, columnI) => (
                <Button
                  key={`${rowI}-${columnI}`}
                  onPress={() => changeCell(rowI, columnI)}
                  bc={column.value === "true" ? "$color8" : "$gray2"}
                  style={{ flex: 1, height: "100%" }}
                />
              ))}
            </View>
          ))
        ) : (
          <View
            style={{
              height: "100%",
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 30, fontWeight: "bold" }}>
              No data available
            </Text>
          </View>
        )}
      </View>
    </Tinted>
  );
};
