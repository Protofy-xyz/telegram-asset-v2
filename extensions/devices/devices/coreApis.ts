import { API } from "protobase";
import { DevicesModel } from ".";
import { AutoAPI, handler, getServiceToken, getDeviceToken,getRoot } from 'protonode'
import { getDB } from '@my/config/dist/storageProviders';
import { getLogger, generateEvent } from 'protobase';
import moment from 'moment';
import fs from 'fs';
import path from 'path';
import { addAction } from "@extensions/actions/coreContext/addAction";
import { addCard } from "@extensions/cards/coreContext/addCard";
import { removeActions } from "@extensions/actions/coreContext/removeActions";
import { gridSizes as GRID } from 'protolib/lib/gridConfig';

const PER_PARAM_ROWS = 1; // tweak as needed (extra grid rows per visible param)
const PADDING_ICON = 6; // extra padding for icon

const computeCardSize = (paramsObj?: Record<string, any>) => {
    const baseWidth = 2
    const baseHeight = 6
    const paramCount = Object.keys(paramsObj ?? {}).length > 1
        ? Object.keys(paramsObj ?? {}).length
        : 0;

    const width = baseWidth;
    const height =
        paramCount > 0 ? baseHeight + paramCount * PER_PARAM_ROWS + PADDING_ICON : baseHeight;

    return { width, height };
};

// Accepts the stored card object so we can inspect src.id and defaults.name
const inferSubsystemFromId = (
    idOrName: string,                // what you're currently looping (e.g., 'leds_red')
    deviceName: string,
    src?: any                        // the stored card object
) => {
    const storedId: string | undefined = src?.id;              // where addCard's id should be
    const humanName: string | undefined = src?.defaults?.name; // e.g. 'asas leds red'

    //   console.log('[inferSubsystemFromId] INPUT', { idOrName, deviceName, storedId, humanName });

    // 1) Prefer the true stored ID if present (full prefix format)
    const pick = storedId || idOrName;

    // Fast-paths for full IDs
    const monPrefix = `devices_monitors_${deviceName}_`;
    if (pick.startsWith(monPrefix)) {
        const rest = pick.slice(monPrefix.length);
        // console.log('[inferSubsystemFromId] monitors fast-path', { pick, rest });
        return rest || 'misc';
    }

    const actPrefix = `devices_${deviceName}_`;
    if (pick.startsWith(actPrefix)) {
        const rest = pick.slice(actPrefix.length); // <subsystem>_<action...> OR just <subsystem>
        const firstUnderscore = rest.indexOf('_');
        const subsys = firstUnderscore >= 0 ? rest.slice(0, firstUnderscore) : rest;
        // console.log('[inferSubsystemFromId] actions fast-path', { pick, rest, subsys });
        if (subsys) return subsys;
    }

    // 2) Short-key heuristic (what your API is returning: 'leds_red', 'leds_off', etc.)
    //    Take the segment before the first underscore if it exists and is non-empty.
    if (idOrName.includes('_')) {
        const subsys = idOrName.split('_')[0] || '';
        if (subsys) {
            //   console.log('[inferSubsystemFromId] short-key heuristic', { idOrName, subsys });
            return subsys;
        }
    }

    // 3) Try to infer from defaults.name: usually "<deviceName> <subsystem> ..."
    if (humanName) {
        const prefix = `${deviceName} `;
        let tail = humanName.startsWith(prefix) ? humanName.slice(prefix.length) : humanName;
        // Split by space or underscore and grab first token that isn’t empty.
        const token = (tail.split(/[\s_]+/).find(Boolean) || '').trim();
        if (token) {
            //   console.log('[inferSubsystemFromId] humanName heuristic', { humanName, token });
            return token;
        }
    }

    // 4) Last fallback
    //   console.log('[inferSubsystemFromId] fallback -> misc', { idOrName, deviceName });
    return 'misc';
};



// Pack items left→right and wrap
const pack = (items: Array<{ i: string; w: number; h: number }>, cols: number) => {
    const out: any[] = [];
    let x = 0, y = 0, rowH = 0;
    for (const it of items) {
        const w = Math.min(it.w, cols);
        if (x + w > cols) { x = 0; y += rowH; rowH = 0; }
        out.push({ i: it.i, x, y, w, h: it.h, isResizable: true });
        x += w; rowH = Math.max(rowH, it.h);
    }
    return out;
};

// Shift a layout vertically by offsetY
const shiftY = (layout: any[], offsetY: number) =>
    layout.map(l => ({ ...l, y: l.y + offsetY }));

// Compute total height of a packed section (max y+h)
const sectionHeight = (layout: any[]) =>
    layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);

const SIZE = {
    value: {
        lg: { w: GRID.lg.normalW, h: GRID.lg.normalH },
        md: { w: GRID.md.normalW, h: GRID.md.normalH },
        sm: { w: GRID.sm.normalW, h: GRID.sm.normalH },
        xs: { w: GRID.xs.normalW, h: GRID.xs.normalH },
    },
    action: {
        lg: { w: GRID.lg.normalW, h: GRID.lg.normalH },
        md: { w: GRID.md.normalW, h: GRID.md.normalH },
        sm: { w: GRID.sm.normalW, h: GRID.sm.normalH },
        xs: { w: GRID.xs.normalW, h: GRID.xs.normalH },
    },
};

// --- Smarter board generator: groups by subsystem, uses gridSizes totals ---
const generateDeviceBoard = async (
  boardName: string = 'devices_all',
  deviceName?: string          // <- NEW
) => {
    const token = getServiceToken();

    const DEFAULT_HTML_VALUE = `//@card/react
function Widget(card) {
  const value = card.value;
  return (
    <Tinted>
      <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>
        <YStack f={1} height="100%" ai="center" jc="center" width="100%">
          {card.icon && card.displayIcon !== false && (
            <Icon name={card.icon} size={48} color={card.color}/>
          )}
          {card.displayResponse !== false && (
            <CardValue mode={card.markdownDisplay ? 'markdown' : card.htmlDisplay ? 'html' : 'normal'} value={value ?? "N/A"} />
          )}
        </YStack>
      </ProtoThemeProvider>
    </Tinted>
  );
}
`;

    const DEFAULT_HTML_ACTION = `//@card/react
function Widget(card) {
  const value = card.value;
  const content = <YStack f={1} ai="center" jc="center" width="100%">
    {card.icon && card.displayIcon !== false && (
      <Icon name={card.icon} size={48} color={card.color}/>
    )}
    {card.displayResponse !== false && (
      <CardValue mode={card.markdownDisplay ? 'markdown' : card.htmlDisplay ? 'html' : 'normal'} value={value ?? "N/A"} />
    )}
  </YStack>
  return (
    <Tinted>
      <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>
        <ActionCard data={card}>
          {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}
        </ActionCard>
      </ProtoThemeProvider>
    </Tinted>
  );
}
`;

    const makeKey = (s: string, kind: 'value' | 'action') =>
        `${kind}_${s.replace(/[^a-z0-9_]+/gi, '_').toLowerCase()}`;

    try {
        const treeResp = await API.get(`/api/core/v1/cards?token=${token}`);
        const allDevicesTree = treeResp?.data?.devices || {};
        const devicesTree = deviceName
            ? (allDevicesTree?.[deviceName] ? { [deviceName]: allDevicesTree[deviceName] } : {})
            : allDevicesTree;

        const cards: any[] = [];
        type Sized = { i: string; w: number; h: number; id: string; device: string; subsystem: string; };
        const buckets = {
            lg: new Map<string, Sized[]>(),
            md: new Map<string, Sized[]>(),
            sm: new Map<string, Sized[]>(),
            xs: new Map<string, Sized[]>(),
        };
        const ensureBucket = (bp: 'lg' | 'md' | 'sm' | 'xs', key: string) => {
            if (!buckets[bp].has(key)) buckets[bp].set(key, []);
            return buckets[bp].get(key)!;
        };

        for (const deviceName of Object.keys(devicesTree)) {
            const deviceCards = devicesTree[deviceName] || {};
            for (const id of Object.keys(deviceCards)) {
                if (id === 'devices_table') continue;
                const src = deviceCards[id] || {};
                const d = src.defaults || {};

                const type: 'value' | 'action' = (d.type === 'action') ? 'action' : 'value';
                const humanName = `${id}`;
                const key = makeKey(`${deviceName}__${id}`, type);
                const size = SIZE[type];

                const card: any = {
                    key,
                    name: humanName,
                    type: d.type || 'value',
                    icon: d.icon || '',
                    description: d.description || '',
                    width: d.width,
                    height: d.height,
                };

                if ('rulesCode' in d) card.rulesCode = d.rulesCode;
                if ('params' in d) card.params = d.params;
                if ('configParams' in d) card.configParams = d.configParams;
                if ('method' in d) card.method = d.method;
                if ('persistValue' in d) card.persistValue = d.persistValue;
                if ('buttonMode' in d) card.buttonMode = d.buttonMode;
                if ('buttonLabel' in d) card.buttonLabel = d.buttonLabel;
                if ('displayButton' in d) card.displayButton = d.displayButton;
                if ('displayButtonIcon' in d) card.displayButtonIcon = d.displayButtonIcon;
                if ('displayIcon' in d) card.displayIcon = d.displayIcon;
                if ('displayResponse' in d) card.displayResponse = d.displayResponse;
                if ('html' in d && d.html) card.html = d.html;
                if ('color' in d) card.color = d.color;

                if (!card.html) {
                    card.html = (type === 'action') ? DEFAULT_HTML_ACTION : DEFAULT_HTML_VALUE;
                }

                cards.push(card);

                const subsystem = inferSubsystemFromId(id, deviceName, src);
                if (subsystem === 'misc') {
                    console.log('🤖 ~ generateDeviceBoard ~ subsystem: misc', { deviceName, id, storedId: src?.id, humanName: d?.name });
                }
                const groupKey = `${deviceName}::${subsystem}`;
                // push sizes per breakpoint
                ensureBucket('lg', groupKey).push({ i: key, w: size.lg.w, h: size.lg.h, id, device: deviceName, subsystem });
                ensureBucket('md', groupKey).push({ i: key, w: size.md.w, h: size.md.h, id, device: deviceName, subsystem });
                ensureBucket('sm', groupKey).push({ i: key, w: size.sm.w, h: size.sm.h, id, device: deviceName, subsystem });
                ensureBucket('xs', groupKey).push({ i: key, w: size.xs.w, h: size.xs.h, id, device: deviceName, subsystem });
            }
        }
        // --- after you've finished filling `buckets` (lg/md/sm/xs) ---
        const groupWeights = new Map<string, number>();

        // Use lg bucket as canonical — membership is identical across breakpoints
        for (const [gk, items] of buckets.lg.entries()) {
            const weight = items.length; // monitors + actions -> #cards in group
            groupWeights.set(gk, weight);
        }

        // Pretty log of all weights once
        console.groupCollapsed('[devices_board] Subsystem weights');
        for (const [gk, weight] of groupWeights.entries()) {
            const [device, subsystem] = gk.split('::');
            console.log(`- ${device} :: ${subsystem} -> weight=${weight}`);
        }
        console.groupEnd();

        // helper: shift both axes
        const shiftXY = (layout: any[], dx: number, dy: number) =>
            layout.map(l => ({ ...l, x: l.x + dx, y: l.y + dy }));

        // compute width (in cols) a local packed group actually uses
        const groupWidth = (layout: any[]) =>
            layout.reduce((m, l) => Math.max(m, l.x + l.w), 0);

        // --- after computing groupWeights + the weights log ---
        const buildGroupedLayout = (bp: 'lg' | 'md' | 'sm' | 'xs', cols: number) => {
            const groupKeys = Array.from(buckets[bp].keys()).sort((a, b) => {
                const wa = groupWeights.get(a) ?? buckets[bp].get(a)?.length ?? 0;
                const wb = groupWeights.get(b) ?? buckets[bp].get(b)?.length ?? 0;
                if (wa !== wb) return wa - wb;
                const [da, sa] = a.split('::');
                const [db, sb] = b.split('::');
                return da === db ? sa.localeCompare(sb) : da.localeCompare(db);
            });

            // log final order
            console.groupCollapsed(`[devices_board] Order @ ${bp} (cols=${cols})`);
            groupKeys.forEach((gk, i) => {
                const [device, subsystem] = gk.split('::');
                const w = groupWeights.get(gk) ?? buckets[bp].get(gk)?.length ?? 0;
                console.log(`${i + 1}. ${device} :: ${subsystem} (weight=${w})`);
            });
            console.groupEnd();

            let curX = 0;      // current column
            let curY = 0;      // current row (y coord)
            let rowH = 0;      // tallest group height in the current row
            const result: any[] = [];

            for (const gk of groupKeys) {
                const items = buckets[bp].get(gk)!;

                // Pack this group's cards locally (origin at 0,0)
                const local = pack(items.map(({ i, w, h }) => ({ i, w, h })), cols);

                // Measure this group's footprint
                const gW = Math.min(groupWidth(local), cols);   // cols occupied
                const gH = sectionHeight(local);                // rows occupied

                // If it doesn't fit in the remaining columns, wrap to next row
                if (curX + gW > cols) {
                    curX = 0;
                    curY += rowH + 1;    // +1 row spacer between rows of groups
                    rowH = 0;
                }

                // Place this group at (curX, curY)
                const placed = shiftXY(local, curX, curY);
                result.push(...placed);

                // Advance cursor
                curX += gW;            // move to the right after the block
                rowH = Math.max(rowH, gH);
            }

            return result;
        };


        const layouts = {
            lg: buildGroupedLayout('lg', GRID.lg.totalCols),
            md: buildGroupedLayout('md', GRID.md.totalCols),
            sm: buildGroupedLayout('sm', GRID.sm.totalCols),
            xs: buildGroupedLayout('xs', GRID.xs.totalCols),
        };
        const emptyLayouts = {
            lg: [],
            md: [],
            sm: [],
            xs: [],
        }

        const payload = {
            name: boardName,
            version: Date.now(),
            layouts: emptyLayouts,
            cards,
            rules: [],
            autopilot: false,
            savedAt: Date.now()
        };

        try {
            await API.get(`/api/core/v1/boards/${encodeURIComponent(boardName)}/delete?token=${token}`);
            logger.info({ boardName }, 'Deleted existing board before re-creating');
        } catch (e: any) {
            const status = e?.response?.status || e?.status;
            if (status !== 404) {
                logger.warn({ boardName, err: e?.response?.data || e }, 'Delete board failed (non-404)');
            }
        }

        await API.post(`/api/core/v1/boards?token=${token}`, payload);
        logger.info({ boardName, count: cards.length }, 'Generated devices board with grouped subsystem layouts');
    } catch (err) {
        logger.error({ err }, 'Failed to generate devices board');
    }
};

const deleteDeviceCards = async (deviceName: string) => {
    try {
        const token = getServiceToken();
        // fetch the full cards tree
        const cardsTree = await API.get(`/api/core/v1/cards?token=${token}`);

        // cardsTree structure: { [group]: { [tag]: { [name]: {...} } } }
        const deviceCards = cardsTree?.data?.devices?.[deviceName] || {};
        const names = Object.keys(deviceCards);

        if (!names.length) return;

        // POST-based delete per card: /api/core/v1/cards/:group/:tag/:name/delete
        await Promise.all(
            names.map((name) =>
                API.post(
                    `/api/core/v1/cards/devices/${encodeURIComponent(
                        deviceName
                    )}/${encodeURIComponent(name)}/delete?token=${token}`,
                    {}
                ).catch((err) => {
                    logger.error({ deviceName, name, err }, 'Failed deleting device card');
                })
            )
        );

        logger.info({ deviceName, count: names.length }, 'Deleted device cards');
    } catch (err) {
        logger.error({ err }, 'Failed deleting cards for device');
    }
};
const deleteDeviceActions = async (deviceName: string) => {
    try {
        // remove actions (ProtoMemDB 'actions' chunk) + emit delete events
        await removeActions({
            chunk: 'actions',
            group: 'devices',
            tag: deviceName,
        });
        logger.info({ deviceName }, 'Deleted device actions');

        // also remove all cards belonging to this device
        await deleteDeviceCards(deviceName);
    } catch (err) {
        logger.error({ deviceName, err }, 'Failed deleting actions/cards for device');
    }
};

// iterate over all devices and register an action for each subsystem action
const registerActions = async () => {
    const db = getDB('devices')
    //db.iterator is yeilding
    for await (const [key, value] of db.iterator()) {
        // console.log('device: ', value)
        const deviceInfo = DevicesModel.load(JSON.parse(value))
        // 🔴 delete existing actions & cards for this device before adding new ones
        await deleteDeviceActions(deviceInfo.data.name)

        for (const subsystem of deviceInfo.data.subsystem) {
            // console.log('subsystem: ', subsystem)
            if (subsystem.name == "mqtt") continue
            for (const monitor of subsystem.monitors ?? []) {
                // console.log('monitor: ', monitor)
                const monitorModel = deviceInfo.getMonitorByEndpoint(monitor.endpoint)
                const stateName = deviceInfo.getStateNameByMonitor(monitorModel)
                const iconFromValue = monitor.cardProps?.icon ?? "scan-eye";
                const colorFromValue = monitor.cardProps?.color;
                const { width, height } = computeCardSize({});
                const cardWidth = monitor.cardProps?.width || width;
                const cardHeight = monitor.cardProps?.height || height;

                if (subsystem.monitors.length == 1) {

                    addCard({
                        group: 'devices',
                        tag: deviceInfo.data.name,
                        id: 'devices_monitors_' + deviceInfo.data.name + '_' + subsystem.name,
                        templateName: deviceInfo.data.name + ' ' + subsystem.name + ' device value',
                        name: subsystem.name,
                        defaults: {
                            name: deviceInfo.data.name + ' ' + subsystem.name,
                            description: monitor.description ?? "",
                            rulesCode: `return states['devices']['${deviceInfo.data.name}']['${stateName}']`,
                            type: 'value',
                            icon: iconFromValue,
                            ...(colorFromValue ? { color: colorFromValue } : {}),
                            width: cardWidth,
                            height: cardHeight
                        },
                        emitEvent: true
                    })
                } else {
                    addCard({
                        group: 'devices',
                        tag: deviceInfo.data.name,
                        id: 'devices_monitors_' + deviceInfo.data.name + '_' + monitor.name,
                        templateName: deviceInfo.data.name + ' ' + monitor.name + ' device value',
                        name: monitor.name,
                        defaults: {
                            name: deviceInfo.data.name + ' ' + monitor.name,
                            description: monitor.description ?? "",
                            rulesCode: `return states['devices']['${deviceInfo.data.name}']['${stateName}']`,
                            type: 'value',
                            icon: iconFromValue,
                            ...(colorFromValue ? { color: colorFromValue } : {}),
                            width: width,
                            height: height
                        },
                        emitEvent: true
                    })
                }
            }
            const formatParamsJson = (json) => {
                const parts = Object.entries(json).map(([key, value]) => {
                    return `${key} ${value}`;
                });

                if (parts.length === 0) {
                    return 'No constraints specified';
                }

                return `The value must have ${parts.join(', ')}`;
            }

            for (const action of subsystem.actions ?? []) {
                const url = `/api/core/v1/devices/${deviceInfo.data.name}/subsystems/${subsystem.name}/actions/${action.name}`;
                const isJsonSchema = action.payload?.type === "json-schema";

                const params = { 
                    value: {
                        description: action.description ?? "Value to send",
                    } 
                };
                if (isJsonSchema) {
                    delete params.value
                    const toParamType = (schemaType?: string) => {
                        switch (schemaType) {
                            case 'int':
                            case 'number':
                                return 'number';
                            case 'array':
                            case 'object':
                                return 'json';
                            case 'boolean':
                                return 'boolean';
                            default:
                                return 'string';
                        }
                    };
                    type JsonSchema = {
                        type?: 'string' | 'number' | 'int' | 'boolean' | 'object' | 'array';
                        default?: any;
                        enum?: any[];
                        minimum?: number;
                        properties?: Record<string, JsonSchema>;
                        required?: string[];
                        items?: JsonSchema;
                        description?: string;
                    };

                    const exampleForSchema = (field?: JsonSchema): any => {
                        if (!field || typeof field !== 'object') return null;

                        // If an explicit default is provided, prefer it
                        if (field.default !== undefined) return field.default;

                        switch (field.type) {
                            case 'object': {
                                const props = field.properties || {};
                                const keys = field.required?.length ? field.required : Object.keys(props);
                                const out: Record<string, any> = {};
                                for (const key of keys) {
                                    out[key] = exampleForSchema(props[key]);
                                }
                                return JSON.stringify(out, null, 2);
                            }
                            case 'array': {
                                // Build a one-element example array
                                const item = exampleForSchema(field.items || { type: 'string' });
                                return [item];
                            }
                            case 'string':
                                return Array.isArray(field.enum) && field.enum.length ? field.enum[0] : '';
                            case 'number':
                            case 'int':
                                return typeof field.minimum === 'number' ? field.minimum : 0;
                            case 'boolean':
                                return false;
                            default:
                                return null;
                        }
                    };

                    if (action.payload?.schema && typeof action.payload?.schema === "object") {
                        for (const [key, value] of Object.entries(action.payload.schema)) {
                            if (typeof value === "object" && !Array.isArray(value)) {
                                params[key] = {
                                    visible: true,
                                    description: value.description ?? formatParamsJson(value),
                                    defaultValue: exampleForSchema(value),
                                    type: toParamType(value.type)
                                }
                                if (value.enum) {
                                    params[key].description += ` Possible values: ${value.enum.join(", ")}`;
                                }
                            } else {
                                params[key] = {
                                    visible: true,
                                    description: '',
                                    defaultValue: '',
                                    type: 'string'
                                }
                            }
                        }
                    }


                }
                const rulesCode = isJsonSchema
                    ? `const value = { value: JSON.stringify(userParams) };\nreturn execute_action('${url}', value)`
                    : `return execute_action('${url}', userParams)`;
                const getParams = (params) => {
                    let actionParams = {}
                    for (const key in params) {
                        actionParams[key] = params[key].description || ''
                    }
                    return actionParams
                }
                addAction({
                    group: 'devices',
                    name: subsystem.name + '_' + action.name, //get last path element
                    url: `/api/core/v1/devices/${deviceInfo.data.name}/subsystems/${subsystem.name}/actions/${action.name}`,
                    tag: deviceInfo.data.name,
                    description: action.description ?? "",
                    ...!action.payload?.value ? { params } : {},
                    emitEvent: true
                })
                const iconFromAction = action.cardProps?.icon ?? "rocket";
                const colorFromAction = action.cardProps?.color;
                const { width, height } = computeCardSize(params); // use config params to size
                const cardWidth = action.cardProps?.width || width;
                const cardHeight = action.cardProps?.height || height;
                //http://localhost:8000/api/core/v1/cards to understand what this fills
                addCard({
                    group: 'devices',
                    tag: deviceInfo.data.name,
                    id: 'devices_' + deviceInfo.data.name + '_' + subsystem.name + '_' + action.name,
                    templateName: deviceInfo.data.name + ' ' + subsystem.name + ' ' + action.name + ' device action',
                    name: subsystem.name + '_' + action.name,
                    defaults: (() => {
                        const paramsForDefaults = action.payload?.value ? {} : getParams(params);

                        return {
                            width: cardWidth,
                            height: cardHeight,
                            icon: iconFromAction,
                            name: deviceInfo.data.name + ' ' + subsystem.name + ' ' + action.name,
                            description: action.description ?? '',
                            rulesCode,
                            params: paramsForDefaults,
                            configParams: params,
                            type: 'action',
                            ...(colorFromAction ? { color: colorFromAction } : {}),
                            displayResponse: false
                        };
                    })(),
                    emitEvent: true
                })
            }
        }
        if(deviceInfo.data.generateAssociatedBoard !== false){
            console.log("Generating associated board for device: ", deviceInfo.data.name)
            await generateDeviceBoard(`${deviceInfo.data.name}_device`, deviceInfo.data.name);
        }
    }
}

export const DevicesAutoAPI = AutoAPI({
    modelName: 'devices',
    modelType: DevicesModel,
    prefix: '/api/core/v1/',
    skipDatabaseIndexes: true,
    transformers:{
        generateDeviceCredentials: async (field, e, data) => {
            if(!data.credentials) data.credentials = {}
            data.credentials.mqtt = {username: data.name, password: getDeviceToken(data.name, false)}
            return data
        }

    },
    onBeforeDelete: async (data, session, req) => {
        console.log("🤖 ~ data:", data)
        if(typeof data === 'string') {
            try {
                data = JSON.parse(data)
            } catch (e) {
                console.log("🤖 ~ Failed to parse data:", e)
            }
        }
        // before deleting a device, remove all actions and cards associated with it
        await deleteDeviceActions(data.name)
        //also delete the folder in data/devices/[deviceName]
        const devicePath = path.join(process.cwd(), getRoot(req), "data", "devices", data.name)
        if(fs.existsSync(devicePath)){
            fs.rmSync(devicePath, { recursive: true, force: true });
            // console.log("🤖 ~ Deleted device path:", devicePath)
        }
        //delete associated board
        const token = getServiceToken();
        try {
            await API.get(`/api/core/v1/boards/${encodeURIComponent(data.name + "_device")}/delete?token=${token}`);
            logger.info({ boardName: data.name + "_device" }, 'Deleted associated device board');
        } catch (e: any) {
            const status = e?.response?.status || e?.status;
            if (status !== 404) {
                logger.warn({ boardName: data.name + "_device", err: e?.response?.data || e }, 'Delete associated device board failed (non-404)');
            }
        }
        return data;
    }

})

const logger = getLogger()


export default (app, context) => {
    const devicesPath = '../../data/devices/'
    const { topicSub, topicPub, mqtt } = context;
    DevicesAutoAPI(app, context)
    // Device topics: devices/[deviceName]/[endpoint], en caso de no tener endpoint: devices/[deviceName]
    /* examples
        devices/patata/switch/relay/actions/status
        devices/patata/button/relay/actions/status
        ...
    */


    registerActions()

    app.get('/api/core/v1/devices/registerActions', handler(async (req, res, session) => {
        if(!session || !session.user.admin) {
            res.status(401).send({error: "Unauthorized"})
            return
        }
        registerActions()
        res.send({message: 'Register actions started'})
    }))

    app.get('/api/core/v1/devices/path', handler(async (req, res, session) => {
        const devicesPath = path.join(process.cwd(), getRoot(req), "data", "devices")
        if(!session || !session.user.admin) {
            res.status(401).send({error: "Unauthorized"})
            return
        }

        if(!fs.existsSync(devicesPath)){
            console.log("Creating devices path: ", devicesPath)
            fs.mkdir(devicesPath, {recursive: true}, err => {
                if (err) {
                    console.error("Error creating devices path: ", err)
                    res.status(500).send({error: "Internal Server Error"})
                    return
                }else{
                    if(fs.existsSync(devicesPath)){
                        console.log("Devices path created successfully: ", devicesPath)
                        res.send({path: devicesPath})
                        return
                    }else{
                        res.status(404).send({error: "Not Found"})
                        return
                    }
                }
            })
        }else{
            res.send({path: devicesPath})
        }
        
    }))

    app.get('/api/core/v1/devices/:device/subsystems/:subsystem/actions/:action/:value?', handler(async (req, res, session) => {
        if(!session || !session.user.admin) {
            res.status(401).send({error: "Unauthorized"})
            return
        }
        console.log("action params: ",req.params)
        const value = req.params.value ?? req.query.value
        const db = getDB('devices')
        const deviceInfo = DevicesModel.load(JSON.parse(await db.get(req.params.device)), session)
        const subsystem = deviceInfo.getSubsystem(req.params.subsystem)
        if(!subsystem) {
            res.status(404).send(`Subsytem [${req.params.subsystem}] not found in device [${req.params.device}]`)
            return
        }
        
        const action = subsystem.getAction(req.params.action)
        if(!action) {
            res.status(404).send(`Action [${req.params.action}] not found in Subsytem [${req.params.subsystem}] for device [${req.params.device}]`)
            return
        }

        //console.log("action value: ",value == undefined ? action.data.payload?.type == "json" ? JSON.stringify(action.getValue()) : action.getValue() : value)
        topicPub(mqtt, action.getEndpoint(), value == undefined ? action.data.payload?.type == "json" ? JSON.stringify(action.getValue()) : action.getValue() : value)
        
        res.send({
            subsystem: req.params.subsystem,
            action: req.params.action,
            device: req.params.device,
            result: 'done'
        })
    }))

    app.get('/api/core/v1/devices/:device/subsystems/:subsystem/monitors/:monitor', handler(async (req, res, session) => {
        if(!session || !session.user.admin) {
            res.status(401).send({error: "Unauthorized"})
            return
        }

        const db = getDB('devices')
        const deviceInfo = DevicesModel.load(JSON.parse(await db.get(req.params.device)), session)
        const subsystem = deviceInfo.getSubsystem(req.params.subsystem)
        if(!subsystem) {
            res.status(404).send(`Subsytem [${req.params.subsystem}] not found in device [${req.params.device}]`)
            return
        }

        const monitor = subsystem.getMonitor(req.params.monitor)
        if(!monitor) {
            res.status(404).send(`Monitor [${req.params.monitor}] not found in Subsytem [${req.params.subsystem}] for device [${req.params.device}]`)
            return
        }
        
        //x=1 is a dummy param to allow the use of the & operator in the url
        const urlLastDeviceEvent = `/api/core/v1/events?x=1&filter[from]=device&filter[user]=${req.params.device}&filter[path]=${monitor.getEventPath()}&itemsPerPage=1&token=${session.token}&orderBy=created&orderDirection=desc`
        const data = await API.get(urlLastDeviceEvent)

        if(!data || !data.data ||  !data.data['items'] || !data.data['items'].length) {
            res.status(404).send({value:null})
            return
        }
        res.send({value: data.data['items'][0]?.payload?.message})
    }))

    app.post('/api/core/v1/devices/:device/subsystems/:subsystem/monitors/:monitor/ephemeral', handler(async (req, res, session) => {
        if(!session || !session.user.admin) {
            res.status(401).send({error: "Unauthorized"})
            return
        }

        const db = getDB('devices')
        const deviceInfo = DevicesModel.load(JSON.parse(await db.get(req.params.device)), session)
        const subsystem = deviceInfo.getSubsystem(req.params.subsystem)
        if(!subsystem) {
            res.status(404).send(`Subsytem [${req.params.subsystem}] not found in device [${req.params.device}]`)
            return
        }

        const monitor = subsystem.getMonitor(req.params.monitor)
        if(!monitor) {
            res.status(404).send(`Monitor [${req.params.monitor}] not found in Subsytem [${req.params.subsystem}] for device [${req.params.device}]`)
            return
        }
        let {value} = req.body
        if(value == "true"  || value == true) {
            value = true;
        }else{
            value = false;
        }
        const device = deviceInfo.setMonitorEphemeral(req.params.subsystem, req.params.monitor, value)
        if(device){
            await db.put(device.getId(), JSON.stringify(device.serialize(true)))
        }
        res.send({value})
    }))

    const processMessage = async (message: string, topic: string) => {
        const splitted = topic.split("/");
        const device = splitted[0];
        const deviceName = splitted[1];
        const endpoint = splitted.slice(2).join("/")
        let parsedMessage = message;
        try {
            parsedMessage = JSON.parse(message);
        } catch (err) { }
        if (endpoint == 'debug') {
            // logger.error({ from: device, deviceName, endpoint }, JSON.stringify({topic, message}))
        } else {
            const db = getDB('devices')
            let deviceInfo = undefined
            try {
                deviceInfo = DevicesModel.load(JSON.parse(await db.get(deviceName)))
            } catch (err) {
                logger.error({ from: device, deviceName, endpoint }, "Device not found: "+JSON.stringify({topic, message}))
                return
            }
            // console.log("deviceInfo: ", deviceInfo)
            // console.log("subsystems: ", deviceInfo.data.subsystem)
            // console.log("endpoint: ", endpoint)
            const monitor = deviceInfo?.getMonitorByEndpoint("/"+endpoint)
            // console.log("monitor: ", monitor)
            if(!monitor){
                // logger.error({ from: device, deviceName, endpoint }, "Device not found: "+JSON.stringify({topic, message}))
                return
            }
            // const subsystem = deviceInfo.getSubsystem(req.params.subsystem)
            const stateName = deviceInfo.getStateNameByMonitor(monitor)
            context.state.set({ group: 'devices', tag: deviceName, name: stateName, value: parsedMessage, emitEvent: true });
            generateEvent(
                {
                    ephemeral: monitor.data.ephemeral??false,
                    path: endpoint, 
                    from: "device",
                    user: deviceName,
                    payload: {
                        message: parsedMessage,
                        deviceName,
                        endpoint
                    }
                },
                getServiceToken()
            );
        }
    }

    topicSub(mqtt, 'devices/#', (message, topic) => processMessage(message, topic))

    addCard({
        group: 'devices',
        tag: "table",
        id: 'devices_table',
        templateName: "Interactive devices table",
        name: "devices_table",
        defaults: {
            width: 5, 
            height: 12,
            name: "Devices Table",
            icon: "router",
            description: "Interactive devices table",
            type: 'value',
            html: "\n//data contains: data.value, data.icon and data.color\nreturn card({\n    content: iframe({src:'/workspace/devices?mode=embed'}), mode: 'slim'\n});\n",
        },
        emitEvent: true
    })
}