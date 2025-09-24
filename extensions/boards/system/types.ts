export const types = ["auto", "number", "string", "json", "array"]
export const TypeParser = {
    "auto": (v) => v,
    "number": (v, fallbackEnabled, fallbackValue) => {
        try {
            if (fallbackEnabled && fallbackValue) {
                return fallbackValue
            }

            return Number(v)
        } catch (err) {
            console.error("Cannot parse to type number the value: " + err)
            if (fallbackEnabled && fallbackValue) {
                return fallbackValue
            }
            return 0
        }
    },
    "string": (v, fallbackEnabled, fallbackValue) => {
        if (fallbackEnabled && fallbackValue) {
            return fallbackValue
        }

        return String(v)
    },
    "object": (v, fallbackEnabled, fallbackValue) => {
        if (v === null) return {}
        if (typeof v === "object" && !Array.isArray(v)) {
            return v
        } else {
            return {}
        }
    },
    "array": (v, fallbackEnabled, fallbackValue) => {
        if (Array.isArray(v)) {
            return v
        } else {
            return []
        }
    }
}
