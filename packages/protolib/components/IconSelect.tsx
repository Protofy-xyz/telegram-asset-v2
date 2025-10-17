import { useState } from 'react'
import Select, { components } from "react-select";
import { YStack, Text } from '@my/ui';

export const getIconUrl = (icon) => {
  return `/public/icons/${icon}.svg`;
}

export const PublicIcon = ({ size = 40, name, color = 'var(--color8)' }) => {
  return (
    <span
      aria-label={name}
      role="img"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        verticalAlign: 'middle',
        backgroundColor: color,
        mask: `url(${getIconUrl(name)}) no-repeat center / contain`,
        WebkitMask: `url(${getIconUrl(name)}) no-repeat center / contain`,
      }}
    />
  );

}

const IconOption = (props) => {
  return (
    <components.Option {...props}>
      <YStack style={{ display: "flex", alignItems: "center", gap: "8px", width: '95px', height: '95px', justifyContent: 'center' }}>
        <PublicIcon name={props.data.value} />
        <Text fos="$2" o={0.6} ta="center" height="30px">
          {props.data.value}
        </Text>
      </YStack>
    </components.Option>
  );
};

const IconSingleValue = ({ data, ...props }) => {
  return (
    <components.SingleValue {...props}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0px 4px",
        }}
      >
        <span
          aria-label={data.value}
          role="img"
          style={{
            display: 'inline-block',
            width: 24,
            height: 24,
            verticalAlign: 'middle',
            backgroundColor: 'var(--color8)',
            mask: `url(${getIconUrl(data.value)}) no-repeat center / contain`,
            WebkitMask: `url(${getIconUrl(data.value)}) no-repeat center / contain`,
          }}
        />
        <span style={{ color: "var(--color)" }}>{data.value}</span>
      </div>
    </components.SingleValue>
  );
};

export const IconSelect = ({ icons, onSelect, selected }) => {
  const [selectedIcon, setSelectedIcon] = useState(
    selected ? { value: selected, label: selected } : null
  );

  const [totalOptions, setTotalOptions] = useState(40);

  const options = icons.map((icon) => ({
    value: icon,
    label: icon,
  })).slice(0, totalOptions);

  const handleLoadMore = (state) => {
    setTotalOptions((prev) => prev + 40); // Incrementa en 40 (o lo que desees)
  };

  return (
    <div style={{ flex: 1 }}>
      <Select
        options={options}
        components={{
          SingleValue: IconSingleValue,
          Option: IconOption,
        }}
        onMenuScrollToBottom={handleLoadMore}
        onChange={(selectedOption) => {
          setSelectedIcon(selectedOption);
          onSelect?.(selectedOption.value);
        }}
        onInputChange={(inputValue) => {
          if (inputValue && inputValue.length > 0) {
            setTotalOptions(icons.length);
          } else {
            setTotalOptions(40);
          }
        }}
        value={selectedIcon}
        placeholder="Select an icon..."
        menuPlacement="auto"
        styles={{
          control: (provided, state) => ({
            ...provided,
            backgroundColor: "var(--bgPanel)",
            borderColor: "var(--gray6)",
            height: "44px",
            borderRadius: "9px",
            boxShadow: state.isFocused ? "0 0 3px var(--color6)" : "none",
          }),
          singleValue: (provided) => ({
            ...provided,
            color: "var(--color)",
          }),
          valueContainer: (provided) => ({
            ...provided,
            display: "flex",
            alignItems: "center",
            padding: "2px 8px",
          }),
          menu: (provided) => ({
            ...provided,
            backgroundColor: "var(--gray2)",
            borderRadius: "9px",
            zIndex: 99999,
            overflow: "hidden",
            padding: "8px",
          }),
          menuList: (provided) => ({
            ...provided,
            display: "flex",
            flexWrap: "wrap", // Activamos el wrap horizontal
            gap: "8px",      // Espacio entre elementos
            backgroundColor: "var(--gray2)",
          }),
          option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
              ? "var(--color6)"
              : state.isFocused
                ? "var(--color5)"
                : "var(--gray2)",
            color: "var(--color)",
            cursor: "pointer",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            width: "auto",    // Permitimos que cada opción ajuste su ancho
            minWidth: "80px", // Añade un ancho mínimo si lo deseas
            justifyContent: "center",
          }),
          indicatorSeparator: (provided) => ({
            ...provided,
            backgroundColor: "var(--color7)",
          }),
          dropdownIndicator: (provided) => ({
            ...provided,
            color: "var(--color7)",
          }),
        }}
        maxMenuHeight={300}
      />
    </div>
  );
};