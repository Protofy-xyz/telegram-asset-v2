import { API, getLogger, ProtoMemDB, generateEvent } from 'protobase';
import { getServiceToken } from 'protonode';

const logger = getLogger();

export const deleteCard = async (options: {
    group?: string;
    tag: string;
    name: string;
    emitEvent?: boolean;
    token?: string;
}) => {
    const group = options.group || 'system';
    const { tag, name } = options;

    if (!name) {
        logger.error({}, 'Card name is required');
        return;
    }
    if (!tag) {
        logger.error({}, 'Card tag is required');
        return;
    }

    if (options.token) {
        return await API.post(
            `/api/core/v1/cards/${group}/${tag}/${encodeURIComponent(name)}/delete?token=${options.token}`,
            {}
        );
    } else {
        ProtoMemDB('cards').remove(group, tag, name);

        if (options.emitEvent) {
            generateEvent(
                {
                    path: `cards/${group}/${tag}/${name}/delete`,
                    from: 'states',
                    user: 'system',
                    payload: { group, tag, name },
                    ephemeral: true,
                },
                getServiceToken()
            );
        }
    }
};
