import {
    Router,
    Key,
    Cog,
    Database,
    Boxes,
    Box,
    LayoutDashboard,
    Zap,
    HelpingHand,
    Blocks,
    Palette
} from '@tamagui/lucide-icons'
import { MonitorCog as RawMonitorCog } from 'lucide-react'
import { styled } from 'tamagui'

const MonitorCog = styled(RawMonitorCog, {
    name: 'MonitorCog',
    size: '$true',
    color: 'currentColor',
})


const enableArduinos = false

export default ({ boards, objects }) => {
    const objectsWithPage = objects ? objects.filter(o => o?.features?.adminPage) : []

    const integrations = [
        { "name": "Assets", "icon": Blocks, "href": "/workspace/assets" },
        { "name": "Tasks", "icon": Zap, "href": "/workspace/tasks" },
        { "name": "Devices", "icon": Router, "href": "/workspace/devices" },
        { "name": "Events", "icon": "activity", "href": "/workspace/events" },
        { "name": "Files", "icon": "folder", "href": "/workspace/files?path=/", "path": "" },
        { "name": "Config", "icon": Cog, "href": "/workspace/config" }
    ]
    enableArduinos ? integrations.push({ "name": "Arduinos", "icon": Router, "href": "/workspace/arduinos" }) : null

    // const systemBoard = { "name": "System", "icon": LayoutDashboard, "href": "/workspace/dashboard" }
    const manageBoards = { "name": "Manage Boards", "icon": MonitorCog, "href": '/workspace/boards' }

    // const systemMenu = [
    //     { "name": "Users", "icon": "users", "href": "/workspace/users" },
    //     { "name": "Keys", "icon": Key, "href": "/workspace/keys" },
    //     // { "name": "Settings", "icon": Wrench, "href": "/workspace/settings" },
    //     { "name": "Services", "icon": HelpingHand, "href": "/workspace/services" },
    //     { "name": "Databases", "icon": Database, href: "/workspace/databases" },
    //     { "name": "Settings", "icon": Cog, "href": "/workspace/settings" },
    //     { "name": "Themes", "icon": Palette, "href": "/workspace/themes" }
    // ]

    const objectsMenu = objectsWithPage.length ? objectsWithPage.map((obj) => {
        return { "name": obj.name.charAt(0).toUpperCase() + obj.name.slice(1), "icon": Box, "href": ('/workspace/') + obj.features.adminPage }
    }) : [];

    objectsMenu.push({ "name": "Manage Storage", "icon": Boxes, "href": "/workspace/objects" })
    const initialData = {
        Boards: [],
        Storage: objectsMenu,
        Platform: integrations,
        // System: systemMenu
    }

    const boardsGroupByCategory = boards ? boards.reduce((acc, board) => {
        const category = board.category || 'Boards';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push({ "name": (board.displayName ?? board.name).charAt(0).toUpperCase() + (board.displayName ?? board.name).slice(1), "icon": board.icon ?? LayoutDashboard, "href": '/workspace/boards/view?board=' + (board.name) });
        return acc;
    }, initialData) : initialData;


    // boardsGroupByCategory['Boards'].unshift(systemBoard);
    boardsGroupByCategory['Boards'].push(manageBoards);


    return {
        "default": "/workspace/",
        "label": "Admin panel",
        "assistant": true,
        "logs": true,
        "menu": {
            ...boardsGroupByCategory,
        }
    }
}
