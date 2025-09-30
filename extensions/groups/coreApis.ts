import { GroupModel } from "./";
import { AutoAPI } from 'protonode'

const initialData = {
    admin: {"name": "admin", "workspaces": ["admin", "editor"], "admin": true},
    editor: {"name": "editor", "workspaces": ["editor"], "admin": true},
    // DISABLED for now, test back when enabled
    // user: {"name": "user", "workspaces": ["user"]}
}

const GroupsAutoAPI = AutoAPI({
    modelName: 'groups',
    modelType: GroupModel, 
    initialData: initialData,
    prefix: '/api/core/v1/',
    dbName: 'auth_groups',
    requiresAdmin: ['create', 'update']
})

export default (app, context) => {
    GroupsAutoAPI(app, context)
}