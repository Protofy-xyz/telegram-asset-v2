import { getLogger } from "protobase";
import { getRoot } from "protonode";

const logger = getLogger()

export const getState = async(options: {
    board: any,
    type: string,
    key: string,
    done?: (result) => {},
    error?: (err) => {}
}) => {
    const { 
        board, 
        type, 
        key, 
        done = async (result) => result, 
        error = () => {} 
    } = options;

    const result = Object.keys(board).filter((k) => board[k] && board[k].type && board[k].type == type).map((k) => board[k][key]);
    return await done(result)
}

export default {
    getState
}