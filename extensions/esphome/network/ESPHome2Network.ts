const yaml = require("js-yaml");



const parseYaml = (yamlText: any) => {
    let config;
    try {
     config = yaml.load(yamlText);
    } catch (e) {
        console.error("Error parsing YAML:", e);
        return null;
    }
    // -----------------------------
    // ESP32 pinout definition
    // -----------------------------
    const esp32Pins = {
        left: [
            "3V3", "GND", "EN",
            "GPIO36", "GPIO39", "GPIO34", "GPIO35",
            "GPIO32", "GPIO33", "GPIO25", "GPIO26"
        ],
        right: [
            "GPIO27", "GPIO14", "GPIO12", "GPIO13",
            "GPIO23", "GPIO22", "GPIO1_TX", "GPIO3_RX",
            "GPIO21_SDA", "GPIO22_SCL"
        ]
    };

    const mapPins = arr => arr.map(name => ({
        name,
        type: name.startsWith("GPIO") ? "gpio" : "power"
    }));

    // ----------------------------------
    // Start building schematic
    // ----------------------------------
    let components = [];

    // ESP32 Component
    components.push({
        type: "device",
        id: "ESP32",
        label: "ESP32-WROOM-32",
        center: true,
        pins: {
            left: mapPins(esp32Pins.left),
            right: mapPins(esp32Pins.right)
        }
    });

    // ----------------------------------
    // SWITCH → RELAY
    // ----------------------------------
    if (config.switch) {
        const switches = Array.isArray(config.switch)
            ? config.switch
            : [config.switch];

        switches.forEach((sw, idx) => {
            if (sw.platform === "gpio") {
                components.push({
                    id: `Relay${idx + 1}`,
                    type: "device",
                    label: `Relay ${idx + 1}`,
                    editableProps: {
                        alwaysOn: {
                            type: "boolean",
                            label: "Always On",
                            description: "If enabled, the relay reset state will be always on.",
                            default: sw.restore_mode === "ALWAYS_ON"
                        }
                    },
                    pins: {
                        left: [{
                            name: "control",
                            description: "Control pin to activate the relay",
                            connectedTo: `GPIO${sw.pin}`,
                            type: "input"
                        }],
                        right: []
                    }
                });
            }
        });
    }

    // ----------------------------------
    // UART support
    // ----------------------------------
    if (config.uart) {
        const uartConfigs = Array.isArray(config.uart)
            ? config.uart
            : [config.uart];

        uartConfigs.forEach((uart, idx) => {
            const uartId = uart.id || `UART${idx}`;

            components.push({
                id: uartId,
                type: "device",
                label: `UART ${idx}`,
                editableProps: {
                    baud: {
                        type: "number",
                        label: "Baud Rate",
                        description: "Baud rate for UART communication",
                        default: uart.baud_rate || 115200
                    }
                },
                pins: {
                    left: [
                        {
                            name: "tx",
                            description: "tx pin of UART bus",
                            connectedTo: `GPIO${uart.tx_pin}`,
                            type: "input"
                        },
                        {
                            name: "rx",
                            description: "rx pin of UART bus",
                            connectedTo: `GPIO${uart.rx_pin}`,
                            type: "input"
                        }
                    ],
                    right: [
                        {
                            name: "uart_bus",
                            description: "UART bus",
                            connectedTo: null,
                            type: "output"
                        }
                    ]
                }
            });
        });
    }

    // ----------------------------------
    // I2C support
    // ----------------------------------
    let i2cBuses = [];

    if (config.i2c) {
        const i2cConfigs = Array.isArray(config.i2c)
            ? config.i2c
            : [config.i2c];

        i2cConfigs.forEach((bus, idx) => {
            const busId = bus.id || `i2c_bus${idx === 0 ? "" : idx + 1}`;

            i2cBuses.push(busId);

            components.push({
                id: `I2C-Bus${idx === 0 ? "" : idx + 1}`,
                type: "device",
                label: `I2C Bus${idx === 0 ? "" : " " + (idx + 1)}`,
                pins: {
                    left: [
                        {
                            name: "SDA",
                            description: "SDA pin of I2C bus",
                            connectedTo: `GPIO${bus.sda}`,
                            type: "input"
                        },
                        {
                            name: "SCL",
                            description: "SCL pin of I2C bus",
                            connectedTo: `GPIO${bus.scl}`,
                            type: "input"
                        }
                    ],
                    right: [
                        {
                            name: busId,
                            description: "I2C bus",
                            connectedTo: null,
                            type: "output"
                        }
                    ]
                }
            });
        });
    }

    // ----------------------------------
    // ADXL SUPPORT (i2c-based sensors)
    // ----------------------------------
    if (config.adxl345) {
        const sensors = Array.isArray(config.adxl345)
            ? config.adxl345
            : [config.adxl345];

        sensors.forEach((sensor, idx) => {
            const busUsed = sensor.i2c_id || i2cBuses[0] || "i2c_bus";

            components.push({
                id: `ADXL${idx === 0 ? "" : idx + 1}`,
                type: "device",
                label: `Accelerometer ADXL${idx === 0 ? "" : idx + 1}`,
                pins: {
                    left: [{
                        name: "i2c_bus",
                        description: "I2C bus",
                        connectedTo: busUsed
                    }],
                    right: []
                }
            });
        });
    }

    // ----------------------------------
    // ADS1115 SUPPORT (i2c-based sensors)
    // ----------------------------------
    if (config.ads1115) {
        const sensors = Array.isArray(config.ads1115)
            ? config.ads1115
            : [config.ads1115];
        sensors.forEach((sensor, idx) => {
            const busUsed = sensor.i2c_id || i2cBuses[0] || "i2c_bus";
            components.push({
                id: `ADS1115_${idx === 0 ? "" : idx + 1}`,
                type: "device",
                label: `ADC ADS1115${idx === 0 ? "" : idx + 1}`,
                pins: {
                    left: [{
                        name: "i2c_bus",
                        description: "I2C bus",

                        connectedTo: busUsed
                    }],
                    right: []
                }
            });
        });
    }

    // generic crida la IA perque em faci el no ho intenti

    const schematic = { components };

    // Output result
    console.log(JSON.stringify(schematic, null, 4));
    return schematic
}

const dumpYaml = (schematic: any) => {
}
// export functions as an object
export  {
    parseYaml,
    dumpYaml
};