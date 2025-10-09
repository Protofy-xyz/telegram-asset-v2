import { atom, useAtom } from 'jotai'
import { useEffect, useState } from 'react'

export const highlightedCard = atom("")
export const boardVersion = atom(1)

export const useBoardVersion = () => {
    return useAtom(boardVersion)
} 

export const useHighlightedCard = () => {
    return useAtom(highlightedCard)
}

export const useIsHighlightedCard = (board, card: string) => {
    const [highlightedCard] = useHighlightedCard()
    return highlightedCard === board + '/' + card
}

export const useBoardStates = (boardName?: string) => {
    const [state, setState] = useState({})
    if (!boardName) {
        boardName = useBoardName()
    }

    useEffect(() => {
        if (window) {
            setState(window["protoStates"]?.["boards"]?.[boardName] ?? {})
        }
    }, [window["protoStates"], boardName])

    return state
}

export const useBoardActions = (boardName?: string) => {
    const [state, setState] = useState({})
    if (!boardName) {
        boardName = useBoardName()
    }

    useEffect(() => {
        if (window) {
            setState(window["protoActions"]?.["boards"]?.[boardName] ?? {})
        }
    }, [window["protoActions"], boardName])

    return state
}

export const useBoardName = () => {
    const [boardName, setBoardName] = useState(null)

    useEffect(() => {
        if (window) {
            setBoardName(window["protoBoardName"])
        }
    }, [window["protoBoardName"]])

    return boardName
}

export const executeAction = async (action, params = {}) => {
    if (!window || !window['executeAction']) {
        return
    }
    return window['executeAction'](action, params)
}