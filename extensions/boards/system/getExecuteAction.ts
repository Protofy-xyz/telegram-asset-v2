import { getServiceToken } from "protonode";

export const getExecuteAction = (actions, board = '') => `
const actions = ${JSON.stringify(actions)}
async function execute_action(url_or_name, params={}) {
    console.log('Executing action from getExecuteAction.ts:', url_or_name, params);
    const action = actions.find(a => a.url === url_or_name || (a.name === url_or_name && a.path == '/boards/${board}/' + a.name));
    if (!action) {
        console.error('Action not found: ', url_or_name);
        return;
    }

    console.log('Action: ', action)

    if(action.receiveBoard) {
        params.board = '${board}'
    }
    //check if the action has configParams and if it does, check if the param is visible
    //if the param is not visible, hardcode the param value to the value in the configParams defaultValue
    if(action.configParams) {
        for(const param in action.configParams) {
            // if(action.configParams[param].visible === false && action.configParams[param].defaultValue != '') {
            //     params[param] = action.configParams[param].defaultValue
            // }
            if(action.configParams[param].defaultValue !== '') {
                // si el param empieza por board. lo sustituimos por el valor del context.boardId
                // compruba que el defaultValue es un string
                if(typeof action.configParams[param].defaultValue === 'string' && action.configParams[param].defaultValue.startsWith('board.')) {
                        const stateName = action.configParams[param].defaultValue.substring(6);
                        if(context.states[stateName] && context.states[stateName] !== undefined) {
                            params[param] = context.states[stateName];
                        } else {
                            console.warn('State ' + stateName + ' not found in board ' + context.boardId);
                        }
                } else {
                        params[param] = action.configParams[param].defaultValue;
                }
            }
        }
    }
    params._stackTrace = JSON.stringify(stackTrace);
    if (action.method === 'post') {
        let { token, ...data } = params;
        if(action.token) {
            token = action.token
        }
        const url = action.url+'?token='+(token ? token : '${getServiceToken()}')
        console.log('url: ', url)
        const response = await API.post(url, data);
        return response.data
    } else {
        const paramsStr = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
        //console.log('url: ', action.url+'?token='+token+'&'+paramsStr)
        const response = await API.get(action.url+'?token='+token+'&'+paramsStr);
        return response.data
    }
}
async function executeAction({name, params = {}}) {
    return execute_action(name, params);
}
`