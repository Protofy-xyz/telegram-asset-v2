import * as fsSync from 'fs';
import * as fspath from 'path';
import { promises as fs } from 'fs';
import { snapshotBoardFiles, copyDirRecursive } from './versions';
import { BoardsDir } from "../../extensions/boards/system/boards";
import { API } from 'protobase'
import { getRoot, requireAdmin, getServiceToken } from 'protonode'

const VersionsBaseDir = (root: string) => fspath.join(root, 'data', 'versions');

export const getCurrentVersionFromFS = (root: string, boardId: string): number | null => {
    const jsonPath = fspath.join(BoardsDir(root), `${boardId}.json`);
    if (!fsSync.existsSync(jsonPath)) return null;

    try {
        const board = JSON.parse(fsSync.readFileSync(jsonPath, 'utf8'));
        const v = Number(board?.version);
        return Number.isFinite(v) ? v : null;
    } catch {
        return null;
    }
};

export default async (app, context) => {
    // Get current version
    app.get('/api/core/v1/boards/:boardId/version/current', requireAdmin(), (req, res) => {
        const root = getRoot(req);
        const { boardId } = req.params;
        const v = getCurrentVersionFromFS(root, boardId);
        if (v === null) return res.status(404).send({ error: 'board not found or invalid version' });
        return res.send({ version: v });
    });
    // List versions
    app.get('/api/core/v1/boards/:boardId/versions', requireAdmin(), async (req, res) => {
        const root = getRoot(req);
        const dir = fspath.join(VersionsBaseDir(root), req.params.boardId);
        if (!fsSync.existsSync(dir)) return res.send([]);
        const entries = (await fs.readdir(dir))
            .filter(n => /^\d+$/.test(n))
            .map(n => Number(n))
            .sort((a, b) => a - b);
        res.send(entries);
    });

    // Save version
    app.post('/api/core/v1/boards/:boardId/version', requireAdmin(), async (req, res) => {
        const root = getRoot(req);
        const boardId = req.params.boardId;
        const jsonPath = fspath.join(BoardsDir(root), `${boardId}.json`);
        if (!fsSync.existsSync(jsonPath)) return res.status(404).send({ error: 'board not found' });
        const current = getCurrentVersionFromFS(root, boardId);
        await snapshotBoardFiles(root, boardId, current);
        res.send({ ok: true, version: current});
    });

    // Restore version
    app.get('/api/core/v1/boards/:boardId/versions/:version/restore', requireAdmin(), async (req, res) => {
        const root = getRoot(req);
        const boardId = req.params.boardId;
        const version = req.params.version;
        const vdir = fspath.join(VersionsBaseDir(root), boardId, version);

        if (!fsSync.existsSync(vdir)) return res.status(404).send({ error: 'version not found' });

        // Restaura los 3 ficheros
        const base = BoardsDir(root);
        const sources = [
            [`${boardId}.json`, fspath.join(base, `${boardId}.json`)],
            [`${boardId}.js`, fspath.join(base, `${boardId}.js`)],
            [`${boardId}_ui.js`, fspath.join(base, `${boardId}_ui.js`)],
        ];

        for (const [name, dst] of sources) {
            const src = fspath.join(vdir, name);
            if (fsSync.existsSync(src)) {
                await fs.copyFile(src, dst);
            } else {
                // si no existía, borra destino si existe
                if (fsSync.existsSync(dst)) fsSync.unlinkSync(dst);
            }
        }

        // Restaura la carpeta del board
        const srcDir = fspath.join(vdir, boardId);
        const dstDir = fspath.join(base, boardId);
        if (fsSync.existsSync(dstDir)) fsSync.rmSync(dstDir, { recursive: true, force: true });
        if (fsSync.existsSync(srcDir)) {
            await copyDirRecursive(srcDir, dstDir);
        }
        // Re-registra acciones y estados derivados:
        await API.get("/api/core/v1/reloadBoards?token=" + getServiceToken())
        res.send({ ok: true, restored: { boardId, version } });
    });
};
