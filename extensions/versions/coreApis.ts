import { VersionModel } from ".";
import { AutoAPI, getRoot } from 'protonode'

const VersionsAutoAPI = AutoAPI({
    modelName: 'versions',
    modelType: VersionModel, 
    prefix: '/api/core/v1/',
    dbName: 'versions',
    requiresAdmin: ['*']
})

export default (app, context) => {
    VersionsAutoAPI(app, context)
}
