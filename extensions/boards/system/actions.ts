import { getBoard } from "./boards";
import { getServiceToken, requireAdmin, resolveBoardParam } from "protonode";
import { API, generateEvent } from "protobase";
import { dbProvider, getDBOptions } from 'protonode';
import { getExecuteAction } from "./getExecuteAction";
import fetch from 'node-fetch';
import { getLogger } from 'protobase';
import { TypeParser } from "./types";

const getBoardCardActions = async (boardId) => {
    const board = await getBoard(boardId);
    if (!board.cards || !Array.isArray(board.cards)) {
        return [];
    }
    return board.cards.filter(c => c.type === 'action');
}
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
const token = getServiceToken()

//TODO: refactor to use only protomemdb (state.set) for card state persistance and updates on frontend  (now using .set for persist and state event for updates)
const updateActionStatus = async (context, boardId, actionId, status) => {
    const action = await context.state.get({ chunk: 'actions', group: 'boards', tag: boardId, name: actionId });
    await context.state.set({ chunk: 'actions', group: 'boards', tag: boardId, name: actionId, value: { ...action, status } });
};

export const getActions = async (context) => {
    const actions = await context.state.getStateTree({ chunk: 'actions' });
    const flatActions = []
    const flatten = (obj, path) => {
        if (obj.url) {
            flatActions.push({ ...obj, path: path })
        } else {
            for (const key in obj) {
                flatten(obj[key], path + '/' + key)
            }
        }
    }
    flatten(actions, '')
    return flatActions
}

export const handleBoardAction = async (context, Manager, req, boardId, action_or_card_id, res, rawParams, rawResponse = false, responseCb = undefined) => {
    const actions = await getBoardCardActions(boardId);
    const action = actions.find(a => a.name === action_or_card_id);
    const { _stackTrace, ...params } = rawParams;
    let stackTrace
    try {
        stackTrace = _stackTrace ? JSON.parse(_stackTrace) : [];
        if (!Array.isArray(stackTrace)) {
            stackTrace = [];
        }
    } catch (error) {
        stackTrace = [];
    }
    if (stackTrace.find((item) => item.name === action.name && item.board === boardId)) {
        await generateEvent({
            path: `actions/boards/${boardId}/${action_or_card_id}/code/error`,
            from: 'system',
            user: 'system',
            ephemeral: true,
            payload: {
                status: 'code_error',
                action: action_or_card_id,
                boardId: boardId,
                params,
                msg: "Recursive action call detected",
                stackTrace
            },
        }, getServiceToken());
        await updateActionStatus(context, boardId, action_or_card_id, 'error');

        getLogger({ module: 'boards', board: boardId, card: action.name }).error({ err: "Recursive action call detected" }, "Error executing card: ");
        res.status(500).send({ _err: "e_code", error: "Error executing action code", message: "Recursive action call detected" });
        return;
    } else {
        stackTrace = [{ name: action.name, board: boardId }, ...stackTrace];
    }

    if (!action) {
        res.send({ error: "Action not found" });
        return;
    }

    if (!action.rulesCode) {
        res.send({ error: "No code found for action" });
        return;
    }



    if (action.configParams) {
        for (const param in action.configParams) {
            params[param] = await resolveBoardParam({
                states: await context.state.getStateTree(),
                boardId,
                defaultValue: action.configParams[param].defaultValue,
                value: params[param],
                type: action.configParams[param]?.type
            });
        }
    }

    await generateEvent({
        path: `actions/boards/${boardId}/${action_or_card_id}/run`,
        from: 'system',
        user: 'system',
        ephemeral: true,
        payload: {
            status: 'running',
            action: action_or_card_id,
            boardId: boardId,
            params,
            stackTrace
        },
    }, getServiceToken());
    await updateActionStatus(context, boardId, action_or_card_id, 'running');

    const states = await context.state.getStateTree();
    let rulesCode = action.rulesCode.trim();

    if (rulesCode.startsWith('<')) {
        rulesCode = 'return `' + rulesCode.replace(/`/g, '\\`') + '`';
    }

    const wrapper = new AsyncFunction('req', 'res', 'boardName', 'name', 'states', 'boardActions', 'board', 'userParams', 'params', 'token', 'context', 'API', 'fetch', 'logger', 'stackTrace', `
        ${getExecuteAction(await getActions(context), boardId)}
        ${rulesCode}
    `);

    try {
        if (action.triggers && Array.isArray(action.triggers)) {
            const preTriggers = action.triggers.filter(t => t.type === 'pre' && t.name);
            for (const trigger of preTriggers) {
                //to call an action: /api/core/v1/boards/:boardId/actions/:action' using service token
                try {
                    await API.get(`/api/core/v1/boards/${boardId}/actions/${trigger.name}?token=${getServiceToken()}`);
                } catch (error) {
                    getLogger({ module: 'boards', board: boardId, card: action.name }).error({ err: error }, "Error calling pre trigger action: " + trigger.name);
                }

            }
        }
        let response = null;
        try {
            response = await wrapper(req, res, boardId, action_or_card_id, states, actions, states?.boards?.[boardId] ?? {}, params, params, token, context, API, fetch, getLogger({ module: 'boards', board: boardId, card: action.name }), stackTrace);
            response = action.returnType && typeof TypeParser?.[action.returnType] === "function"
                ? TypeParser?.[action.returnType](response, action.enableReturnCustomFallback, action.fallbackValue)
                : response
            getLogger({ module: 'boards', board: boardId, card: action.name }).info({ value: response, stackTrace }, "New value for card: " + action.name);
        } catch (err) {
            await generateEvent({
                path: `actions/boards/${boardId}/${action_or_card_id}/code/error`,
                from: 'system',
                user: 'system',
                ephemeral: true,
                payload: {
                    status: 'code_error',
                    action: action_or_card_id,
                    boardId: boardId,
                    params,
                    stack: err.stack,
                    message: err.message,
                    name: err.name,
                    code: err.code,
                    stackTrace
                },
            }, getServiceToken());
            await updateActionStatus(context, boardId, action_or_card_id, 'error');

            getLogger({ module: 'boards', board: boardId, card: action.name }).error({ err }, "Error executing card: ");
            res.status(500).send({ _err: "e_code", error: "Error executing action code", message: err.message, stack: err.stack, stackTrace, name: err.name, code: err.code });
            return;
        }

        if (action.responseKey && response && typeof response === 'object' && action.responseKey in response) {
            response = response[action.responseKey];
        }

        const prevValue = await context.state.get({ group: 'boards', tag: boardId, name: action.name });
        if (action?.alwaysReportValue || JSON.stringify(response) !== JSON.stringify(prevValue)) {
            await context.state.set({ group: 'boards', tag: boardId, name: action.name, value: response, emitEvent: true });
            Manager.update(`../../data/boards/${boardId}.js`, 'states', action.name, response);
        }

        if (responseCb) {
            responseCb(response);
        } else {
            if (rawResponse) {
                res.send(response);
            } else {
                res.json(response);
            }
        }


        await generateEvent({
            path: `actions/boards/${boardId}/${action_or_card_id}/done`,
            from: 'system',
            user: 'system',
            ephemeral: true,
            payload: {
                status: 'done',
                action: action_or_card_id,
                boardId: boardId,
                params,
                response,
                stackTrace
            },
        }, getServiceToken());
        await updateActionStatus(context, boardId, action_or_card_id, 'idle');

        // if persistValue is true
        if (action.persistValue) {
            const db = dbProvider.getDB('board_' + boardId);
            await db.put(action.name, response === undefined ? '' : JSON.stringify(response, null, 4));
        }


        if (action.triggers && Array.isArray(action.triggers)) {
            const postTriggers = action.triggers.filter(t => t.type === 'post' && t.name);
            for (const trigger of postTriggers) {
                //to call an action: /api/core/v1/boards/:boardId/actions/:action' using service token
                try {
                    await API.get(`/api/core/v1/boards/${boardId}/actions/${trigger.name}?token=${getServiceToken()}`);
                } catch (error) {
                    getLogger({ module: 'boards', board: boardId, card: action.name }).error({ err: error }, "Error calling post trigger action: " + trigger.name);
                }
            }
        }


    } catch (err) {
        await generateEvent({
            path: `actions/boards/${boardId}/${action_or_card_id}/error`,
            from: 'system',
            user: 'system',
            ephemeral: true,
            payload: {
                status: 'error',
                action: action_or_card_id,
                boardId: boardId,
                params,
                stack: err.stack,
                message: err.message,
                name: err.name,
                code: err.code,
                stackTrace
            },
        }, getServiceToken());
        await updateActionStatus(context, boardId, action_or_card_id, 'error');
        console.error("Error executing action: ", err);
        res.status(500).send({ _err: "e_general", error: "Error executing action", message: err.message, stack: err.stack, name: err.name, code: err.code });
    }
};