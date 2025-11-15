import { AutoAPI, getDBOptions, getServiceToken } from 'protonode'
import { connectDB, getDB } from '@my/config/dist/storageProviders';
import { API, EventModel } from 'protobase'
import { addCard } from "@extensions/cards/coreContext/addCard";

export default async (app, context) => {
    addCard({
        group: 'events',
        tag: 'emit',
        id: 'events_emit_event',
        templateName: 'Emit Event',
        name: 'event',
        defaults: {
            width: 2,
            height: 10,
            icon: "rocket",
            type: "action",
            name: "Emit Event",
            displayResponse: true,
            displayIcon: false,
            params: {
                path: "event path ex: auth/login/success boards/update/# ...",
                payload: "payload to send inside the emitted event",
                ephemeral: "if true, the event will not be persisted to retrieve it later"
            },
            configParams: {
                path: {
                    visible: true,
                    defaultValue: "example/event/path",
                    type: "string"
                },
                payload: {
                    visible: true,
                    defaultValue: "{\"test\": \"test\"}",
                    type: "json"
                },
                ephemeral: {
                    visible: true,
                    defaultValue: "true",
                    type: "boolean"
                }
            },
            description: "Emits events through the vento event system to notify other boards about something or to broadcast something",
            editRulesInNaturalLanguage: false,
            editRulesInLowCode: true,
            rulesCode: "return await context.events.emitEvent(\n  params.path,\n  boardName,\n  \"agent\",\n  params.payload,\n  params.ephemeral\n)\n",
            html: "//@card/react\n\nfunction Widget(card) {\n  const value = card.value;\n\n  const content = <YStack f={1} ai=\"center\" jc=\"center\" width=\"100%\">\n      {card.icon && card.displayIcon !== false && (\n          <Icon name={card.icon} size={48} color={card.color}/>\n      )}\n      {card.displayResponse !== false && (\n          <CardValue mode={card.markdownDisplay ? 'markdown' : card.htmlDisplay ? 'html' : 'normal'} value={value ?? \"N/A\"} />\n      )}\n  </YStack>\n\n  return (\n      <Tinted>\n        <ProtoThemeProvider forcedTheme={window.TamaguiTheme}>\n          <ActionCard data={card}>\n            {card.displayButton !== false ? <ParamsForm data={card}>{content}</ParamsForm> : card.displayResponse !== false && content}\n          </ActionCard>\n        </ProtoThemeProvider>\n      </Tinted>\n  );\n}\n"
        },
        emitEvent: true,
    })

    const EventAPI = AutoAPI({
        modelName: 'events',
        modelType: EventModel,
        prefix: '/api/core/v1/',
        skipStorage: async (data, session?, req?) => {
            if (data.ephemeral) {
                return true
            }
            return false
        },
        dbName: 'events',
        notify: (entityModel, action) => {
            context.mqtt.publish(entityModel.getNotificationsTopic(action), entityModel.getNotificationsPayload())
        },
        disableEvents: true,
        requiresAdmin: ['*'],
        itemsPerPage: 50,
        logLevel: "trace",
        defaultOrderBy: 'created',
        defaultOrderDirection: 'desc',
        dbOptions: {
            orderedInsert: true,
            maxEntries: parseInt(process.env.MAX_EVENTS, 10) || 100000
        }
    })
    EventAPI(app, context)
}
