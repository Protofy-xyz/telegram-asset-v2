import { Protofy, Schema, BaseSchema, getLogger, ProtoModel, SessionDataType, z  } from 'protobase'

const logger = getLogger()
Protofy("features", {
    "adminPage": "/objects/view?object=storageyboardModel"
})

export const BaseStorageyboardSchema = Schema.object(Protofy("schema", {
}))

//check if any of the fields of the schema has set the id flag
const hasId = Object.keys(BaseStorageyboardSchema.shape).some(key => BaseStorageyboardSchema.shape[key]._def.id)

export const StorageyboardSchema = Schema.object({
    ...(!hasId? BaseSchema.shape : {}),
    ...BaseStorageyboardSchema.shape
});

export type StorageyboardType = z.infer<typeof StorageyboardSchema>;

export class StorageyboardModel extends ProtoModel<StorageyboardModel> {
    constructor(data: StorageyboardType, session?: SessionDataType, ) {
        super(data, StorageyboardSchema, session, "Storageyboard");
    }

    public static getApiOptions() {
        return Protofy("api", {
            "name": "storageyboard",
            "prefix": "/api/v1/"
        })
    }

    create(data?):StorageyboardModel {
        const result = super.create(data)
        return result
    }

    read(extraData?): StorageyboardType {
        const result = super.read(extraData)
        return result
    }

    update(updatedModel: StorageyboardModel, data?: StorageyboardType): StorageyboardModel {
        const result = super.update(updatedModel, data)
        return result
    }

	list(search?, session?, extraData?, params?, jsCode?): StorageyboardType[] {
        const result = super.list(search, session, extraData, params, jsCode)
        return result
    }

    delete(data?): StorageyboardModel {
        const result = super.delete(data)
        return result
    }

    protected static _newInstance(data: any, session?: SessionDataType): StorageyboardModel {
        return new StorageyboardModel(data, session);
    }

    static load(data: any, session?: SessionDataType): StorageyboardModel {
        return this._newInstance(data, session);
    }
}
