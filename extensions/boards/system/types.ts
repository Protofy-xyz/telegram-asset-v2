export const TypeParser = {
    "auto": (v) => v,
    "number": (v) => {
        try {
            return Number(v)
        } catch (err) {
            console.error("Cannot parse to type number the value: " + err)
            return 0
        }
    },
    "string": (v) => String(v),
    "object": (v) => {
        if (v === null) return {}
        if (typeof v === "object" && !Array.isArray(v)) {
            return v
        } else {
            return {}
        }
    },
    "array": (v) => {
        if (Array.isArray(v)) {
            return v
        } else {
            return []
        }
    }
}
