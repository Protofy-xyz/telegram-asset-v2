import { BoardModel } from "./boardsSchemas";
import { ai, AutoAPI, getRoot, handler, resolveBoardParam } from 'protonode'
import { API, getLogger, ProtoMemDB, generateEvent } from 'protobase'
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as fspath from 'path';
import { getServiceToken, requireAdmin } from "protonode";
import { addAction } from '@extensions/actions/coreContext/addAction';
import { removeActions } from "@extensions/actions/coreContext/removeActions";
import { VersionsDir } from '@extensions/versions/versions'
import fileActions from "@extensions/files/fileActions";
import { Manager } from "./manager";
import { dbProvider, getDBOptions } from 'protonode';
import { acquireLock, releaseLock } from "./system/lock";
import { registerCards } from "./system/cards";
import { BoardsDir, getBoard, getBoards, cleanObsoleteCardFiles } from "./system/boards";

import { getActions, handleBoardAction } from "./system/actions";


const TemplatesDir = (root) => fspath.join(root, "/data/templates/boards/")

const BOARD_REFRESH_INTERVAL = 100 //in miliseconds
const defaultAIProvider = 'chatgpt'
const logger = getLogger()
const processTable = {}
const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
const memory = {}
let alreadyStarted = false

class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "HttpError";
    }
}

const getMetaCard = (card) => {
    const inputs = card.params ? Object.fromEntries(
        Object.entries(card.params).map(([key, description]) => {
            const config = card.configParams[key] || {};
            return [key, { ...config, description }];
        })
    ) : {};
    return {
        name: card.name,
        type: card.type,
        //description: card.description || '',
        //icon: card.icon || '',
        code: card.rulesCode,
        html: card.html,
        inputs: inputs,
        links: card.links,
        presets: card.presets || {},
        code_explanation: card.rules,
        enableAgentInputMode: card.enableAgentInputMode || false
    }
}
const processCards = async (boardId, cards, context, boardData?, regenerate?) => {
    const proxyDB = ProtoMemDB('proxy');

    const cardsMetaValue = cards.filter(c => c.type == 'value').map(card => {
        return getMetaCard(card);
    }).reduce((obj, card) => {
        obj[card.name] = card;
        delete card.name;
        delete card.type;
        return obj;
    }, {});

    const cardsMetaActions = cards.filter(c => c.type == 'action').map(card => {
        return getMetaCard(card);
    }).reduce((obj, card) => {
        obj[card.name] = card;
        delete card.name;
        delete card.type;
        return obj;
    }, {});

    context.state.set({ group: 'meta', tag: 'boardCards', name: boardId, value: { actionCards: cardsMetaActions, valueCards: cardsMetaValue }, emitEvent: true }) //set board meta info
    // console.log('|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||');
    // console.log('Setting board cards meta for board: ', boardId, { actionCards: cardsMetaActions, valueCards: cardsMetaValue });
    // console.log('|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||');
    context.state.set({ group: 'meta', tag: 'boards', name: boardId, value: boardData, emitEvent: true }) //set board meta info
    if (regenerate) {


        const newCardNames = cards.map(card => card.name);
        cleanObsoleteCardFiles(boardId, newCardNames);
        for (let i = 0; i < cards.length; i++) {
            //create a file for each card, in the board folder
            const card = cards[i];
            const code = card.rulesCode
            const html = card.html
            const cardFilePath = BoardsDir(getRoot()) + boardId + '/' + card.name + '.js'
            const cardHTMLFilePath = BoardsDir(getRoot()) + boardId + '/' + card.name + '_view.js'

            if (Object.prototype.hasOwnProperty.call(card, "rulesCode")) {
                if (code) {
                    await fs.writeFile(cardFilePath, code)
                } else {
                    try { await fs.unlink(cardFilePath) } catch (e) { }
                }
                delete card.rulesCode
            }

            if (Object.prototype.hasOwnProperty.call(card, "html")) {
                if (html) {
                    await fs.writeFile(cardHTMLFilePath, html)
                } else {
                    try { await fs.unlink(cardHTMLFilePath) } catch (e) { }
                }
                delete card.html
            }

        }
        proxyDB.clear('boards', boardId)
    }

    //iterate over cards
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (card.enableCustomPath && card.customPath) {
            const customPath = card.customPath;
            proxyDB.set('boards', boardId, card.name, {
                alias: customPath,
                target: '/api/core/v1/boards/' + boardId + '/cards/' + card.name
            });
        }

        if (card.enableCustomRunPath && card.customRunPath) {
            const customRunPath = card.customRunPath;
            proxyDB.set('boards', boardId, card.name, {
                alias: customRunPath,
                target: '/api/core/v1/boards/' + boardId + '/cards/' + card.name + '/run/raw'
            });
        }

        if (card.enableCustomRunPathInputParam && card.customRunPathInputParam && card.configParams[card.customRunPathInputParam]?.defaultValue) {
            const customRunPath = card.configParams[card.customRunPathInputParam]?.defaultValue;
            proxyDB.set('boards', boardId, card.name, {
                alias: customRunPath,
                target: '/api/core/v1/boards/' + boardId + '/cards/' + card.name + '/run/raw'
            });
        }

        if (card.enableAgentInputMode) {
            const customRunPath = '/api/agents/v1/' + boardId + '/' + card.name;
            proxyDB.set('boards', boardId, card.name, {
                alias: customRunPath,
                target: '/api/core/v1/boards/' + boardId + '/cards/' + card.name + '/run/raw'
            });
        }

        if (card.customCardViewPath) {
            proxyDB.set('boards', boardId, card.name + '_view', {
                alias: card.customCardViewPath,
                target: '/workspace/boards/card',
                query: 'card=' + encodeURIComponent(card.name) + '&board=' + encodeURIComponent(boardId)
            });
        }

        if (card.customCardRunViewPath) {
            proxyDB.set('boards', boardId, card.name + '_viewRun', {
                alias: card.customCardRunViewPath,
                query: 'card=' + encodeURIComponent(card.name) + '&board=' + encodeURIComponent(boardId) + '&mode=run'
            });
        }
    }

    const actionsCards = cards.filter(c => c && c.type === 'action')
    for (let i = 0; i < actionsCards.length; i++) {

        const card = actionsCards[i];
        //console.log("Adding action: ", JSON.stringify(card, null, 4))
        await addAction({
            method: card.method || 'get',
            group: 'boards',
            name: card.name,
            url: "/api/core/v1/boards/" + boardId + "/actions/" + card.name,
            tag: boardId,
            description: card.description ?? "",
            params: card.params ?? {},
            ...(card.configParams && { configParams: card.configParams }),
            emitEvent: true,
            persistValue: card.persistValue ?? false
        })



        // add preset actions if the card contains presets
        if (card.presets && Object.keys(card.presets).length > 0) {
            for (const presetName of Object.keys(card.presets)) {
                const preset = card.presets[presetName];
                if (preset && presetName) {
                    const mergedConfigParams = {
                        ...card.configParams
                    }
                    if (preset.configParams) {
                        for (const paramKey of Object.keys(preset.configParams)) {
                            mergedConfigParams[paramKey] = {
                                ...(mergedConfigParams[paramKey] || {}),
                                ...preset.configParams[paramKey]
                            }
                        }
                    }

                    await addAction({
                        method: card.method || 'get',
                        group: 'boards',
                        name: card.name + '.' + presetName,
                        url: "/api/core/v1/boards/" + boardId + "/actions/" + card.name,
                        tag: boardId,
                        description: (card.description ? card.description + ': ' : '') + (preset.description ?? ""),
                        params: { ...(card.params || {}), ...(preset.params || {}) },
                        configParams: mergedConfigParams,
                        emitEvent: true,
                        persistValue: preset.persistValue ?? false
                    })
                }
            }
        }

        if (!regenerate && card.persistValue && !card.autorun) {
            // if persistValue is true, save the board state
            const db = dbProvider.getDB('board_' + boardId);
            try {
                const content = await db.get(card.name);
                await context.state.set({ group: 'boards', tag: boardId, name: card.name, value: JSON.parse(content), emitEvent: true });
            } catch (error) {
                logger.info("No previous value in DB found for card: ", card.name);
            }
        }

        if (card.autorun) {
            setTimeout(async () => {
                await API.get('/api/core/v1/boards/' + boardId + '/actions/' + card.name + '?token=' + getServiceToken())
            }, regenerate ? 1 : 1000)
        }
    }
}

const getDB = (path, req, session, context?) => {
    const db = {
        async *iterator() {

            const boards = await getBoards()
            for (const boardId of boards) {
                const lockKey = BoardsDir(getRoot(req)) + boardId;
                await acquireLock(lockKey);
                try {
                    const filePath = `${BoardsDir(getRoot(req))}${boardId}.json`;
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const decodedContent = JSON.parse(fileContent);

                    const userType = session?.user?.type;
                    const isAllVisible = req.query.all === 'true';
                    const isSystem = !!decodedContent?.tags?.includes('system');
                    const usersList = Array.isArray(decodedContent?.users) ? decodedContent.users : null;

                    let allowed: boolean;

                    if (isSystem && !isAllVisible) {
                        // System boards: show ONLY if a whitelist exists and includes this user type
                        allowed = !!(usersList && userType && usersList.includes(userType));
                    } else {
                        // Non-system boards: if whitelist exists, enforce it; if not, allow
                        allowed = usersList ? !!(userType && usersList.includes(userType)) : true;
                    }

                    if (!allowed) continue;

                    yield [boardId, fileContent];
                } catch (_e) {
                    // ignore malformed/unreadable boards to keep behavior consistent
                } finally {
                    releaseLock(lockKey);
                }
            }
        },

        async del(key, value) {
            console.log("Deleting board: ", JSON.stringify({ key, value }))

            const base = BoardsDir(getRoot(req))
            const jsonPath = base + key + ".json"
            const logicPath = base + key + ".js"
            const uiPath = base + key + "_ui.js"
            const boardDir = base + key
            const boardVersionsDir = VersionsDir(getRoot(req)) + '/' + key

            try {
                await fs.unlink(jsonPath)
            } catch (error) {
                console.log("Error deleting file: " + jsonPath)
            }

            try {
                if (fsSync.existsSync(logicPath)) {
                    await fs.unlink(logicPath)
                }
            } catch (error) {
                console.log("Error deleting board automation file: " + logicPath)
            }

            try {
                if (fsSync.existsSync(uiPath)) {
                    await fs.unlink(uiPath)
                }
            } catch (error) {
                console.log("Error deleting board UI file: " + uiPath)
            }

            try {
                removeActions({ group: 'boards', tag: key })
            } catch (error) {
                console.log("Error removing actions for board: " + key)
            }

            try {
                if (fsSync.existsSync(boardDir)) {
                    await fs.rm(boardDir, { recursive: true, force: true })
                }
            } catch (error) {
                console.log("Error deleting board dir: " + boardDir)
            }

            try {
                if (fsSync.existsSync(boardVersionsDir)) {
                    await fs.rm(boardVersionsDir, { recursive: true, force: true })
                }
            } catch (error) {
                console.log("Error deleting versions dir: " + boardVersionsDir)
            }
        },

        async put(key, value) {
            // try to create the board file in the boards folder
            // console.log("Creating board: ", JSON.stringify({key,value}))
            value = JSON.parse(value)
            value.cards = (value.cards || []).map(card => {
                const { value, ...rest } = card;
                return rest;
            })

            const filePath = BoardsDir(getRoot(req)) + key + ".json"

            // --- versioning: read previous version (if any) ---
            let prevVersion = 0;
            try {
                const prev = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
                prevVersion = Number(prev.version || 0);
            } catch { /* first time, ignore */ }

            //check if the board automation file exists, if not, create it
            if (!fsSync.existsSync(BoardsDir(getRoot(req)) + key + '.js')) {
                const boardFileContent = `const { boardConnect } = require('protonode')
const { Protofy } = require('protobase')

const run = Protofy("code", async ({ context, states, board }) => {

})

boardConnect(run)`
                fsSync.writeFileSync(BoardsDir(getRoot(req)) + key + '.js', boardFileContent)
            }

            if (!fsSync.existsSync(BoardsDir(getRoot(req)) + key + '_ui.js')) {
                const boardUIFileContent = `//@card/react
//board is the board object
//state is the state of the board

function Widget({board, state}) {
    const cards = board.cards.reduce((total, card) => {
        return {
            ...total,
            [card.name]: card
        }
    }, {})


    return <XStack gap="$5" width="100%" f={1}>
        <YStack>
            {
                Object.keys(cards).map(card => {
                    return <YStack height="60px" jc="center" gap={"$4"}>
                        <div>{card}</div>
                    </YStack>
                })
            }
        </YStack>
        <YStack>
            {
                Object.keys(cards).map(card => {
                    return <XStack ai="center" height="60px" gap={"$4"}>
                        <div>{JSON.stringify(state?.[card])}</div>
                    </XStack>
                })
            }
        </YStack>
        <YStack>
            {
                Object.keys(cards).map(card => {
                    return <XStack ai="center" height="60px" gap={"$4"}>
                        {cards[card] && cards[card].type == 'action' ? <Button onPress={() => {
                            execute_action(card, {})
                        }}>Run</Button> : ''}
                    </XStack>
                })
            }
        </YStack>
    </XStack>
}
                `
                fsSync.writeFileSync(BoardsDir(getRoot(req)) + key + '_ui.js', boardUIFileContent)
            }


            //check if the board directory exists, if not, create it
            try {
                await fs.access(BoardsDir(getRoot(req)), fs.constants.F_OK)
            } catch (error) {
                console.log("Creating boards folder")
                await fs.mkdir(BoardsDir(getRoot(req)))
            }

            //check if the board directory inside boards exists, if not, create it
            try {
                await fs.access(BoardsDir(getRoot(req)) + key, fs.constants.F_OK)
            } catch (error) {
                console.log("Creating board folder: ", key)
                await fs.mkdir(BoardsDir(getRoot(req)) + key)
            }

            await acquireLock(filePath);
            removeActions({ group: 'boards', tag: key })
            let shouldSnapshot = false;
            try {
                //register actions for each card
                // console.log('cards: ', value.cards)
                if (value.cards && Array.isArray(value.cards)) {
                    await processCards(key, value.cards, context, value, true)
                }
                const statesDB = ProtoMemDB('states');
                const group = 'boards';
                const tag = key; // boardId
                try {
                    for (const card of (value.cards ?? [])) {
                        if (card.previousName && card.previousName !== card.name) {
                            const oldName = card.previousName;
                            const newName = card.name;

                            const oldVal = statesDB.get(group, tag, oldName);
                            if (oldVal !== undefined) {
                                statesDB.set(group, tag, newName, oldVal);
                                generateEvent({
                                    path: `states/${group}/${tag}/${newName}/update`,
                                    from: "states",
                                    user: 'system',
                                    payload: { value: oldVal },
                                    ephemeral: true
                                }, getServiceToken());
                            }

                            statesDB.remove(group, tag, oldName);

                            generateEvent({
                                path: `states/${group}/${tag}/${oldName}/delete`,
                                from: "states",
                                user: 'system',
                                payload: {},
                                ephemeral: true
                            }, getServiceToken());

                            delete card.previousName;

                            Manager.update(`../../data/boards/${tag}.js`, 'states', newName, oldVal);
                            Manager.update(`../../data/boards/${tag}.js`, 'states', oldName, undefined);
                        }
                    }
                } catch (e) {
                    console.log('State rename error for board', key, e);
                }
                // --- PRUNE: orphan states ---
                try {
                    const currentStates = statesDB.getByTag(group, tag) || {};
                    const validNames = new Set((value.cards ?? []).map(c => c.name));

                    for (const stateName of Object.keys(currentStates)) {
                        if (!validNames.has(stateName)) {
                            statesDB.remove(group, tag, stateName);
                            generateEvent({
                                path: `states/${group}/${tag}/${stateName}/delete`,
                                from: "states",
                                user: 'system',
                                payload: {},
                                ephemeral: true
                            }, getServiceToken());

                            Manager.update(`../../data/boards/${tag}.js`, 'states', stateName, undefined);
                        }
                    }
                } catch (e) {
                    console.log('Prune orphan states error for board', key, e);
                }
                await fs.writeFile(filePath, JSON.stringify(value, null, 4))

                // --- versioning: decide outside lock ---
                const newVersion = Number(value.version || 0);
                shouldSnapshot = newVersion > prevVersion; // <-- NEW (solo flag)
            } catch (error) {
                console.error("Error creating file: " + filePath, error, error.stack)
            } finally {
                releaseLock(filePath);
            }

            // --- versioning: trigger snapshot via API when version bumped (after releasing lock) ---
            if (shouldSnapshot) {
                const token = getServiceToken();
                try {
                    await API.post(`/api/core/v1/boards/${key}/version?token=${token}`, {});
                } catch (e) {
                    console.log("Error creating board snapshot:", e);
                }
            }
        },


        async get(key) {
            // try to get the board file from the boards folder
            // console.log("Get function: ",key)
            const filePath = BoardsDir(getRoot(req)) + key + ".json"
            await acquireLock(filePath);
            try {
                const fileContent = await fs.readFile(filePath, 'utf8')
                // console.log("fileContent: ", fileContent)
                // console.log("filePath: ", filePath)
                return fileContent
            } catch (error) {
                // console.log("Error reading file: " + filePath)
                throw new Error("File not found")
            } finally {
                releaseLock(filePath);
            }
        }
    };

    return db;
}

export default async (app, context) => {
    const BoardsAutoAPI = AutoAPI({
        modelName: 'boards',
        modelType: BoardModel,
        initialData: {},
        skipDatabaseIndexes: true,
        getDB: getDB,
        prefix: '/api/core/v1/',
        requiresAdmin: ['*'],
        onAfterUpdate: async (board) => {
            const actions = await context.state.get({ group: 'boards', tag: board.name, chunk: 'actions', defaultValue: {} });
            Manager.update('../../data/boards/' + board.name + '.js', 'actions', null, actions)
        }
    })

    const reloadBoard = async (boardId) => {
        // console.log('**************Reloading board: ', boardId)
        const states = (await context.state.getStateTree()) || {};
        const fileContent = await getBoard(boardId);

        if (!fileContent.cards || !Array.isArray(fileContent.cards)) {
            return fileContent;
        }

        // Iterate over cards to get the card content
        for (let i = 0; i < fileContent.cards.length; i++) {

            const card = fileContent.cards[i];
            if (!card) {
                continue;
            }

            try {
                if (card.type == 'value') {
                    // logger.info({ card }, "Evaluating rulesCode for card: " + card.key);
                    if (!memory[card.key]) {
                        memory[card.key] = {}
                    }

                    let rulesCode = card.rulesCode.trim();

                    if (rulesCode.startsWith('<')) {
                        rulesCode = 'return `' + rulesCode.replace(/`/g, '\\`') + '`';
                    } else if (rulesCode.split("\n").length == 1 && !rulesCode.startsWith('return ')) {
                        rulesCode = 'return ' + rulesCode;
                    }
                    const wrapper = new AsyncFunction('params', 'states', 'board', 'data', 'memory', `
                        ${rulesCode}
                    `);

                    const params = card.params || {};

                    for (const param in params) {
                        if (card.configParams && card.configParams[param]) {

                            params[param] = await resolveBoardParam({
                                states: await context.state.getStateTree(),
                                boardId,
                                defaultValue: card.configParams[param].defaultValue,
                                value: undefined,
                                type: card.configParams[param]?.type
                            });

                        }
                    }
                    let value = await wrapper(params, states, states?.boards?.[boardId] ?? {}, card, memory[card.key]);
                    // logger.info({ value }, "Value for card " + card.key);
                    // if (value !== states && value != states['boards'][boardId][card.name]) {
                    const prevValue = await context.state.get({ group: 'boards', tag: boardId, name: card.name, defaultValue: null });

                    if (prevValue != value) {
                        // logger.info({ card, value, prevValue }, "New value for card " + card.key + ' name: ' + card.name);
                        // logger.info({ card, value }, "New value for card " + card.key);
                        // logger.info({ newValue: value, oldValue: states['boards'][boardId] }, "Setting value for card " + card.key);
                        card.value = value;
                        context.state.set({ group: 'boards', tag: boardId, name: card.name, value: value, emitEvent: true });
                        Manager.update('../../data/boards/' + boardId + '.js', 'states', card.name, value);
                    }
                    // }
                }
            } catch (error) {
                // logger.error({ error }, "Error evaluating jsCode for card: " + card.key);
                card.value = 'error';
                card.error = error.message;
            }
        }

        return fileContent;
    };

    const cleanCode = (code) => {
        //remove ```(plus anything is not an space) from the beginning of the code
        //remove ``` from the end of the code
        let cleaned = code.replace(/^```[^\s]+/g, '').replace(/```/g, '').trim()
        //remove 'javascript' from the beginning of the code if it exists
        if (cleaned.startsWith('javascript')) {
            cleaned = cleaned.replace('javascript', '').trim()
        }
        return cleaned
    }

    const handleCallModel = async (res, prompt, options = {}) => {
        let reply = await ai.callModel(prompt)

        console.log('REPLY: ', reply)
        if (reply?.raw?.error) {
            logger.ui.error({ error: reply.raw.error }, "Error from AI model");
            res.status(500).send({ error: 'Error from AI model', message: reply.raw.error });
            return
        }
        if (!reply || !reply.choices || reply.choices.length === 0) {
            logger.ui.error({ reply }, 'No response from AI model or empty choices array');
            res.status(500).send({ error: 'No response from AI model', message: reply?.error })
        } else {
            const jsCode = reply.choices[0].message.content
            console.log("JS CODE: ", jsCode)
            res.send({ jsCode: cleanCode(jsCode) })
        }
    }

    BoardsAutoAPI(app, context)

    app.get('/api/core/v1/autopilot/actions', requireAdmin(), async (req, res) => {
        res.send(await getActions(context));
    });

    app.post('/api/core/v1/import/board', requireAdmin(), async (req, res) => {
        const token = getServiceToken()
        const { name, template } = req.body;
        console.log("Creating board:", name);
        console.log("Template: ", template);

        const boardTemplate = fsSync.readFileSync(TemplatesDir(getRoot()) + '/' + template.id + '/' + template.id + '.json', 'utf-8');
        const boardContent = JSON.parse(boardTemplate.replace(/{{{name}}}/g, name));


        //first create the board
        await API.post(`/api/core/v1/boards?token=` + token, boardContent);

        if (fsSync.existsSync(TemplatesDir(getRoot()) + '/' + template.id + '/' + template.id + '.js')) {
            //then save the rules
            const rulesCode = fsSync.readFileSync(TemplatesDir(getRoot()) + '/' + template.id + '/' + template.id + '.js', 'utf-8')
            await API.post(`/api/core/v1/boards/${name}/automation?token=` + token, { boardId: name, code: rulesCode });
        }
        if (fsSync.existsSync(TemplatesDir(getRoot()) + '/' + template.id + '/' + template.id + '_ui.js')) {
            //then save the UI
            const uiCode = fsSync.readFileSync(TemplatesDir(getRoot()) + '/' + template.id + '/' + template.id + '_ui.js', 'utf-8')
            await API.post(`/api/core/v1/boards/${name}/uiCode?token=` + token, { boardId: name, code: uiCode });
        }
        res.send({ success: true });
    });

    app.get('/api/core/v2/templates/boards', requireAdmin(), async (req, res) => {
        const templates = fsSync.readdirSync(TemplatesDir(getRoot())).filter(file => fsSync.statSync(TemplatesDir(getRoot()) + '/' + file).isDirectory()).map(dir => {
            const description = fsSync.readFileSync(TemplatesDir(getRoot()) + '/' + dir + '/README.md', 'utf-8') || ''
            const json = JSON.parse(fsSync.readFileSync(TemplatesDir(getRoot()) + '/' + dir + '/' + dir + '.json', 'utf-8'));
            return { id: dir, name: dir, description, icon: json.icon, disabled: json?.disabled };
        }).filter(tplJson => !tplJson.disabled);
        res.send(templates);
    });

    app.post('/api/core/v2/templates/boards', requireAdmin(), async (req, res) => {
        const { name, from, description } = req.body;
        console.log("Creating board template:", name);
        console.log("From: ", from);
        if (!fsSync.existsSync(TemplatesDir(getRoot()))) {
            fsSync.mkdirSync(TemplatesDir(getRoot()), { recursive: true });
        }
        if (fsSync.existsSync(TemplatesDir(getRoot()) + '/' + name)) {
            //remove directory recursively
            fsSync.rmSync(TemplatesDir(getRoot()) + '/' + name, { recursive: true, force: true });
        }
        fsSync.mkdirSync(TemplatesDir(getRoot()) + '/' + name, { recursive: true });

        //get full board
        const board = await getBoard(from)
        board.name = '{{{name}}}'
        delete board.version
        delete board.savedAt
        //fill uiCode and rulesCode



        //write board as {name}.json, uiCode as {name}_ui.js, rulesCode as {name}.js
        fsSync.writeFileSync(TemplatesDir(getRoot()) + '/' + name + '/' + name + '.json', JSON.stringify(board, null, 4));

        if (fsSync.existsSync(BoardsDir(getRoot()) + '/' + from + '_ui.js')) {
            const uiCode = fsSync.readFileSync(BoardsDir(getRoot()) + '/' + from + '_ui.js', 'utf-8')
            fsSync.writeFileSync(TemplatesDir(getRoot()) + '/' + name + '/' + name + '_ui.js', uiCode);
        }

        if (fsSync.existsSync(BoardsDir(getRoot()) + '/' + from + '.js')) {
            const rulesCode = fsSync.readFileSync(BoardsDir(getRoot()) + '/' + from + '.js', 'utf-8')
            fsSync.writeFileSync(TemplatesDir(getRoot()) + '/' + name + '/' + name + '.js', rulesCode);
        }
        fsSync.writeFileSync(TemplatesDir(getRoot()) + '/' + name + '/README.md', description);
        res.send({ board });
    });

    app.post('/api/core/v1/autopilot/getValueCode', requireAdmin(), async (req, res) => {
        const prompt = await context.autopilot.getPromptFromTemplate({ board: req.body.board, templateName: "valueRules", card: JSON.stringify(req.body.card, null, 4), states: JSON.stringify(req.body.states, null, 4), rules: JSON.stringify(req.body.rules, null, 4) });
        if (req.query.debug) {
            console.log("Prompt: ", prompt)
        }
        let reply = await ai.callModel(prompt)
        console.log('REPLY: ', reply)
        const jsCode = reply.choices[0].message.content
        res.send({ jsCode: cleanCode(jsCode) })
    })

    function safeDump(root, { maxDepth = 10, maxFuncChars = 50_000 } = {}) {
        const seen = new WeakMap(); // obj -> path
        function enc(val, path, depth) {
            if (val === null || typeof val === 'undefined') return val;
            const t = typeof val;

            if (t === 'function') {
                const name = val.name || null;
                let code = '';
                try { code = String(val); } catch { }
                if (maxFuncChars && code.length > maxFuncChars) {
                    code = code.slice(0, maxFuncChars) + `\n/* ...truncated (${code.length - maxFuncChars} more chars) */`;
                }
                return { __type: 'Function', name, code };
            }

            if (t === 'bigint') return { __type: 'BigInt', value: val.toString() };
            if (t === 'symbol') return { __type: 'Symbol', value: String(val) };
            if (t !== 'object') return val;

            // Circular refs
            const prevPath = seen.get(val);
            if (prevPath) return { __circular: prevPath };

            if (depth >= maxDepth) return { __truncated: true, __path: path };

            seen.set(val, path);

            // Built-ins
            if (val instanceof Date) return { __type: 'Date', value: val.toISOString() };
            if (val instanceof RegExp) return { __type: 'RegExp', value: val.toString() };
            if (val instanceof Error) {
                return {
                    __type: 'Error',
                    name: val.name,
                    message: val.message,
                    stack: val.stack
                };
            }
            if (typeof Buffer !== 'undefined' && Buffer.isBuffer(val)) {
                return { __type: 'Buffer', length: val.length, base64: val.toString('base64') };
            }
            if (val instanceof Map) {
                return { __type: 'Map', entries: Array.from(val, ([k, v], i) => [enc(k, `${path}.<key${i}>`, depth + 1), enc(v, `${path}.<val${i}>`, depth + 1)]) };
            }
            if (val instanceof Set) {
                return { __type: 'Set', values: Array.from(val, (v, i) => enc(v, `${path}[${i}]`, depth + 1)) };
            }
            if (Array.isArray(val)) {
                return val.map((v, i) => enc(v, `${path}[${i}]`, depth + 1));
            }

            // Objetos normales (incluye getters enumerables ya materializados)
            const out = {};
            for (const key of Reflect.ownKeys(val)) {
                // Propiedades no enumerables/símbolos también, si quieres limitar a enumerables, usa Object.keys
                try {
                    out[key] = enc(val[key], `${path}.${String(key)}`, depth + 1);
                } catch (e) {
                    out[key] = { __error: `Cannot serialize property: ${String(e)}` };
                }
            }
            return out;
        }

        const tree = enc(root, '$', 0);
        return JSON.stringify(tree, null, 2);
    }

    const filterContext = async (obj) => {
        // console.log("Filtering context")
        const settings = await API.get('/api/core/v1/settings?token=' + getServiceToken())
        // as html key it's very large remove it from context
        if (obj.html) {
            delete obj.html
        }
        return obj
    }

    app.get('/api/core/v1/autopilot/getContext', requireAdmin(), async (req, res) => {
        const { mqtt, ...cleanContext } = context;
        let serializedContext = safeDump(cleanContext);
        try {
            serializedContext = safeDump(await filterContext(JSON.parse(serializedContext)));
        } catch (e) {
            console.error("Error filtering context: ", e)
        }
        res.send(serializedContext);
    })

    app.post('/api/core/v1/autopilot/getActionCode', requireAdmin(), async (req, res) => {
        //build a textual representation of context
        try {
            const { mqtt, ...cleanContext } = context;
            cleanContext.mqtt = 'points to the active mqtt connection. Use context.mqtt if you need to pass a mqtt connection handler'
            const serializedContext = safeDump(cleanContext);

            delete req.body.actions[req.body.card.name]
            const prompt = await context.autopilot.getPromptFromTemplate({
                board: req.body.board,
                context: serializedContext,
                templateName: "actionRules",
                card: JSON.stringify(req.body.card, null, 4),
                states: JSON.stringify(req.body.states, null, 4),
                rules: JSON.stringify(req.body.rules, null, 4),
                previousRules: req.body.previousRules ? JSON.stringify(req.body.previousRules, null, 4) : undefined,
                actions: JSON.stringify(req.body.actions, null, 4),
                userParams: JSON.stringify(req.body.userParams, null, 4)
            });

            if (req.query.debug) {
                console.log("Prompt: ", prompt)
            }
            await handleCallModel(res, prompt)
        } catch (e) {
            console.error('Error getting action code: ', e)
            logger.ui.error('Error getting action code', e);
            res.status(500).send({ error: 'Internal Server Error', message: e.message })
        }
    })

    app.post('/api/core/v1/autopilot/getBoardCode', requireAdmin(), async (req, res) => {
        //we need to look for configParams in the action. If there is a config for the param, we need to check
        //if the param is visible. If its not visible, we should not include it in the params object
        Object.keys(req.body.actions).map(k => {
            const a = req.body.actions[k]
            if (a.configParams) {
                for (const param in a.configParams) {
                    if (a.configParams[param].visible === false) {
                        delete a.params[param]
                    }
                }
            }
        })

        const prompt = await context.autopilot.getPromptFromTemplate({
            templateName: "boardRules",
            states: JSON.stringify(req.body.states, null, 4),
            rules: JSON.stringify(req.body.rules, null, 4),
            previousRules: req.body.previousRules ? JSON.stringify(req.body.previousRules, null, 4) : undefined,
            actions: JSON.stringify(req.body.actions, null, 4)
        });
        if (req.query.debug) {
            console.log("Prompt: ", prompt)
        }
        await handleCallModel(res, prompt)
    })

    app.post('/api/core/v1/autopilot/getComponent', async (req, res) => {
        const prompt = await context.autopilot.getPromptFromTemplate({ templateName: "componentGenerator", sourceComponent: req.body.sourceComponent, request: req.body.request });
        if (req.query.debug) {
            console.log("Prompt: ", prompt)
        }
        let reply = await ai.callModel(prompt)
        console.log('REPLY: ', reply)
        const jsCode = reply.choices[0].message.content
        res.send({ jsCode: cleanCode(jsCode) })
    })



    app.get('/api/core/v1/boards/:boardId/uicode', requireAdmin(), async (req, res) => {
        try {
            const boardId = req.params.boardId;
            const filePath = BoardsDir(getRoot()) + boardId + '_ui.js';
            if (!fsSync.existsSync(filePath)) {
                res.send({ code: '' });
                return;
            }
            const fileContent = await fs.readFile(filePath, 'utf8');
            res.send({ code: fileContent });
        } catch (error) {
            logger.error({ error }, "Error getting board automation");
            res.status(500).send({ error: "Internal Server Error" });
        }
    })

    app.post('/api/core/v1/boards/:boardId/uicode', requireAdmin(), async (req, res) => {
        try {
            const boardId = req.params.boardId;
            const filePath = BoardsDir(getRoot()) + boardId + '_ui.js';
            try {
                await fs.writeFile(filePath, req.body.code);
                res.send({ message: "Board ui code updated successfully" });
            } catch (error) {
                logger.error({ error }, "Error writing board ui code file");
                res.status(500).send({ error: "Internal Server Error" });
            } finally {
                releaseLock(filePath);
            }
        } catch (error) {
            logger.error({ error }, "Error updating board ui code");
            res.status(500).send({ error: "Internal Server Error" });
        }
    })

    app.get('/api/core/v1/boards/:boardId/automation', requireAdmin(), async (req, res) => {
        try {
            const boardId = req.params.boardId;
            const filePath = BoardsDir(getRoot()) + boardId + '.js';
            if (!fsSync.existsSync(filePath)) {
                res.status(404).send({ error: "Board automation file not found" });
                return;
            }
            const fileContent = await fs.readFile(filePath, 'utf8');
            res.send({ code: fileContent });
        } catch (error) {
            logger.error({ error }, "Error getting board automation");
            res.status(500).send({ error: "Internal Server Error" });
        }
    })

    app.post('/api/core/v1/boards/:boardId/automation', requireAdmin(), async (req, res) => {
        try {
            const boardId = req.params.boardId;
            const filePath = BoardsDir(getRoot()) + boardId + '.js';
            try {
                await fs.writeFile(filePath, req.body.code);
                res.send({ message: "Board automation updated successfully" });
            } catch (error) {
                logger.error({ error }, "Error writing board automation file");
                res.status(500).send({ error: "Internal Server Error" });
            } finally {
                releaseLock(filePath);
            }
        } catch (error) {
            logger.error({ error }, "Error updating board automation");
            res.status(500).send({ error: "Internal Server Error" });
        }
    })

    // Aceptar GET
    app.get('/api/core/v1/boards/:boardId/actions/:action', requireAdmin(), (req, res) => {
        console.log('---------------------------------------------------------------------------')
        console.log('Handling action request for board:', req.params.boardId, ' action: ', req.params.action, ' query: ', req.query)
        handleBoardAction(context, Manager, req, req.params.boardId, req.params.action, res, req.query)
    })

    // Aceptar POST
    app.post('/api/core/v1/boards/:boardId/actions/:action', requireAdmin(), (req, res) => {
        handleBoardAction(context, Manager, req, req.params.boardId, req.params.action, res, req.body)
    })

    const hasAccessToken = async (tokenType, session, card, token) => {
        if (card.tokens && card.tokens[tokenType]) {
            const cardToken = card.tokens[tokenType];
            if (cardToken === token || (session && session.user.admin)) {
                return true;
            }
        } else {
            if (session && session.user.admin) {
                return true;
            }
        }
        return false;
    }

    const getCard = async (boardId, cardId) => {
        const board = await getBoard(boardId);
        if (!board.cards || !Array.isArray(board.cards)) {
            return false
        }
        const card = board.cards.find(c => c.name === cardId);
        if (!card) {
            return false;
        }
        return card;
    }

    app.get('/api/core/v1/boards/:boardId/cards/:cardId', handler(async (req, res, session, next) => {
        const card = await getCard(req.params.boardId, req.params.cardId);
        //get read token from card
        if (!card?.publicRead && !(await hasAccessToken('read', session, card, req.query.token))) {
            res.status(403).send({ error: "Forbidden: Invalid token" });
        } else {
            const value = ProtoMemDB('states').get('boards', req.params.boardId, req.params.cardId);
            res.send(value || null);
        }
    }))

    //get limited card info, get the last stored value
    app.get('/api/core/v1/boards/:boardId/cards/:cardId/info', handler(async (req, res, session, next) => {
        const card = await getCard(req.params.boardId, req.params.cardId);
        if (!card?.publicRead && !(await hasAccessToken('read', session, card, req.query.token))) {
            res.status(403).send({ error: "Forbidden: Invalid token" });
            return
        }
        const value = ProtoMemDB('states').get('boards', req.params.boardId, req.params.cardId);

        res.json({
            key: card.key,
            displayResponse: card.displayResponse,
            name: card.name,
            description: card.description,
            params: card.params,
            icon: card.icon,
            color: card.color,
            html: card.html,
            value: value,
            displayIcon: card.displayIcon,
            displayButton: card.displayButton,
            displayButtonIcon: card.displayButtonIcon,
            buttonMode: card.buttonMode,
            buttonLabel: card.buttonLabel,
            type: card.type
        })
    }))

    //get limited card info, but run the card to get the last value
    app.get('/api/core/v1/boards/:boardId/cards/:cardId/info/run', handler(async (req, res, session, next) => {
        const card = await getCard(req.params.boardId, req.params.cardId);

        if (!card?.publicRun && !(await hasAccessToken('run', session, card, req.query.token))) {
            res.status(403).send({ error: "Forbidden: Invalid token" });
            return
        }

        handleBoardAction(context, Manager, req, req.params.boardId, req.params.cardId, res, req.query, false, (value) => {
            res.json({
                key: card.key,
                displayResponse: card.displayResponse,
                name: card.name,
                description: card.description,
                params: card.params,
                icon: card.icon,
                color: card.color,
                html: card.html,
                value: value,
                displayIcon: card.displayIcon,
                displayButton: card.displayButton,
                displayButtonIcon: card.displayButtonIcon,
                buttonMode: card.buttonMode,
                buttonLabel: card.buttonLabel,
                type: card.type
            })
        });
    }))

    app.get('/api/core/v1/boards/:boardId/cards/:cardId/run', handler(async (req, res, session, next) => {
        const card = await getCard(req.params.boardId, req.params.cardId);
        //get read token from card
        if (!card?.publicRun && !(await hasAccessToken('run', session, card, req.query.token))) {
            res.status(403).send({ error: "Forbidden: Invalid token" });
        } else {
            if (card.manualAPIResponse) {
                handleBoardAction(context, Manager, req, req.params.boardId, req.params.cardId, res, req.query, false, (value) => { });
            } else {
                handleBoardAction(context, Manager, req, req.params.boardId, req.params.cardId, res, req.query);
            }
        }
    }))

    app.get('/api/core/v1/boards/:boardId/cards/:cardId/run/raw', handler(async (req, res, session, next) => {
        const card = await getCard(req.params.boardId, req.params.cardId);
        //get read token from card
        if (!card?.publicRun && !(await hasAccessToken('run', session, card, req.query.token))) {
            res.status(403).send({ error: "Forbidden: Invalid token" });
        } else {
            if (card.manualAPIResponse) {
                handleBoardAction(context, Manager, req, req.params.boardId, req.params.cardId, res, req.query, true, (value) => { });
            } else {
                handleBoardAction(context, Manager, req, req.params.boardId, req.params.cardId, res, req.query, true);
            }

        }
    }))

    app.post('/api/core/v1/boards/:boardId/cards/:cardId/run/raw', handler(async (req, res, session, next) => {
        const card = await getCard(req.params.boardId, req.params.cardId);
        //get read token from card
        if (!card?.publicRun && !(await hasAccessToken('run', session, card, req.query.token))) {
            res.status(403).send({ error: "Forbidden: Invalid token" });
        } else {
            console.log("DEV: card.manualAPIResponse: ", card.manualAPIResponse)
            if (card.manualAPIResponse) {
                handleBoardAction(context, Manager, req, req.params.boardId, req.params.cardId, res, req.body, true, (value) => { });
            } else {
                handleBoardAction(context, Manager, req, req.params.boardId, req.params.cardId, res, req.body, true);
            }

        }
    }))

    app.get('/api/core/v1/boards/:boardId', requireAdmin(), async (req, res) => {
        try {
            const values = ProtoMemDB('states').getByTag('boards', req.params.boardId);
            const board = await getBoard(req.params.boardId);
            if (!board.cards || !Array.isArray(board.cards)) {
                res.send(board);
                return;
            }

            //iterate over values keys, find the corresponding card and set the value (card.name == key)
            for (const key in values) {
                const card = board.cards.find(c => c.name === key);
                if (card) {
                    card.value = values[key];
                }
            }
            const filePath = '../../data/boards/' + req.params.boardId + '.js'
            const running = Manager.isRunning(filePath)
            board.autopilot = running
            res.send(board)
        } catch (error) {
            if (error instanceof HttpError) {
                res.status(error.status).send({ error: error.message });
            } else {
                res.status(500).send({ error: "Internal Server Error" });
            }
        }
    })

    const startAutoPilot = async (boardId, res?) => {
        const started = await Manager.start('../../data/boards/' + boardId + '.js', async () => {
            const states = await context.state.getStateTree();
            return {
                boardId: boardId,
                states: states.boards && states.boards[boardId] ? states.boards[boardId] : {},
                actions: await context.state.get({ group: 'boards', tag: boardId, chunk: 'actions', defaultValue: {} })
            }
        }, () => { })

        if (started) {
            logger.info(`Autopilot started for board: ${boardId}`);
            if (res) res.send({ result: 'started', message: "Board started", board: boardId });

        } else {
            logger.info(`Autopilot already running for board: ${boardId}`);
            if (res) res.send({ result: 'already_running', message: "Board already running", board: boardId });
        }

    }
    app.get('/api/core/v1/boards/:boardId/autopilot/on', requireAdmin(), async (req, res) => {
        const boardId = req.params.boardId;
        startAutoPilot(boardId, res);
    })

    app.get('/api/core/v1/viewLib', requireAdmin(), async (req, res) => {
        //iterate over all directories in ../../extensions and for each directory
        // check if it has a viewLib.js file
        // if it does, read the contents and concatenate them into a single string

        const extensionsPath = fspath.join(getRoot(), 'extensions')
        let viewLib = ''
        try {
            const files = await fs.readdir(extensionsPath)
            for (const file of files) {
                const filePath = fspath.join(extensionsPath, file, 'viewLib.js')
                if (fsSync.existsSync(filePath)) {
                    const fileContent = await fs.readFile(filePath, 'utf8')
                    viewLib += fileContent + '\n'
                }
            }
        } catch (error) {
            console.error("Error reading extensions folder: ", error)

            res.status(500).send({ error: "Error reading extensions folder" })
            return
        }

        res.send(viewLib)
    })

    app.get('/api/core/v1/boards/:boardId/autopilot/off', requireAdmin(), async (req, res) => {
        const boardId = req.params.boardId;
        const stopped = Manager.stop('../../data/boards/' + req.params.boardId + '.js');
        if (stopped) {
            logger.info(`Autopilot stopped for board: ${boardId}`);
            res.send({ result: 'stopped', message: "Board stopped", board: req.params.boardId });
        } else {
            logger.info(`Autopilot not running for board: ${boardId}`);
            res.send({ result: 'already_stopped', message: "Board already stopped or not running", board: req.params.boardId });
        }

    })

    app.get('/api/core/v1/board/cardresetgroup', requireAdmin(), async (req, res) => {
        if (!req.query.included) {
            res.status(400).send('Missing included parameter')
            return
        }

        if (!req.query.excluded) {
            res.status(400).send('Missing excluded parameter')
            return
        }

        if (!req.query.board) {
            res.status(400).send('Missing board parameter')
            return
        }

        const board = await getBoard(req.query.board);
        if (!board.cards || !Array.isArray(board.cards)) {
            res.send({ error: "No cards found" });
            return;
        }

        const cards = board.cards.filter(c => (req.query.included.includes('*') || req.query.included.includes(c.name)) && !req.query.excluded.includes(c.name));
        if (cards.length) {
            for (const card of cards) {
                await context.state.set({ group: 'boards', tag: req.query.board, name: card.name, value: card.initialValue ?? undefined, emitEvent: true });
                Manager.update('../../data/boards/' + req.query.board + '.js', 'states', card.name, null);
            }
        }
        res.json(cards.map(c => c.name));
    })

    app.get('/api/core/v1/board/cardreset', requireAdmin(), async (req, res) => {
        if (!req.query.name) {
            res.status(400).send('Missing name parameter')
            return
        }

        if (!req.query.board) {
            res.status(400).send('Missing board parameter')
            return
        }

        const board = await getBoard(req.query.board);
        if (!board.cards || !Array.isArray(board.cards)) {
            res.send({ error: "No cards found" });
            return;
        }

        const card = board.cards.find(c => c.name === req.query.name);
        if (!card) {
            res.send({ error: "Card not found" });
            return;
        }

        await context.state.set({ group: 'boards', tag: req.query.board, name: card.name, value: card.initialValue ?? undefined, emitEvent: true });

        Manager.update('../../data/boards/' + req.query.board + '.js', 'states', card.name, null);
        res.json(card.name);
    })

    setInterval(async () => {
        const boards = await getBoards()
        // console.log("Boards: ", boards)
        for (const board of boards) {
            if (processTable[board]) {
                console.log("Board already being processed: ", board)
                continue;
            }
            processTable[board] = true
            try {
                await reloadBoard(board)
            } catch (error) {
                console.error("Error reloading board: ", board, error)
            } finally {
                processTable[board] = false
            }
        }
    }, BOARD_REFRESH_INTERVAL)

    context.events.onEvent(
        context.mqtt,
        context,
        async (event) => {
            if (!alreadyStarted) {
                alreadyStarted = true;
                logger.info("API is ready, starting autopilot for all boards with autoplay enabled")
                const boards = await getBoards()
                for (const board of boards) {
                    const boardContent = await getBoard(board)
                    if (boardContent.settings?.autoplay) {
                        logger.info(`Autopilot enabled for board: ${board}, starting...`)
                        try {
                            await startAutoPilot(board);
                        } catch (error) {
                            logger.error(`Error starting autopilot for board: ${board}`, error);
                        }
                    }
                }
            }
        },
        "services/api/ready",
        "api"
    )

    app.get('/api/core/v1/reloadBoards', requireAdmin(), async (req, res) => {
        registerActions()
        res.send({ message: "Boards reloaded" })
    })

    const registerActions = async () => {
        //register actions for each board
        const boards = await getBoards()
        for (const board of boards) {
            const boardContent = await getBoard(board)
            if (boardContent.cards && Array.isArray(boardContent.cards)) {
                await processCards(boardContent.name, boardContent.cards, context, boardContent)
            }
        }
    }
    await registerCards()
    registerActions()
}