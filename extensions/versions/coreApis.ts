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

const indexByKey = (cards = []) =>
    Object.fromEntries(cards.map(c => [c.key, c]));

const getChange = (prevData = { cards: [] }, currData = { cards: [] }) => {
    const prev = indexByKey(prevData.cards ?? []);
    const curr = indexByKey(currData.cards ?? []);

    const prevKeys = Object.keys(prev);
    const currKeys = Object.keys(curr);

    const addedKey = currKeys.find(k => !prev[k]);
    if (addedKey) return { type: "Adds", card: curr[addedKey] };

    const removedKey = prevKeys.find(k => !curr[k]);
    if (removedKey) return { type: "Removes", card: prev[removedKey] };

    const editedKey = currKeys.find(k => prev[k] && JSON.stringify(prev[k]) !== JSON.stringify(curr[k]));
    if (editedKey) return { type: "Edits", card: curr[editedKey] };

    return { type: "No changes", card: null };
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

    // Get history
    app.get('/api/core/v1/boards/:boardId/history', requireAdmin(), async (req, res) => {
        try {
            const root = getRoot(req);
            const dir = fspath.join(VersionsBaseDir(root), req.params.boardId);
            if (!fsSync.existsSync(dir)) return res.send([]);
            const boardName = `${req.params.boardId}.json`;
            const entries = (await fs.readdir(dir))
                .filter(n => /^\d+$/.test(n))
                .map(Number)
                .sort((a, b) => a - b);

            const readJson = async p => JSON.parse(await fs.readFile(p, "utf8"));

            const versions = await Promise.all(entries.map(async version => {
                const filePath = fspath.join(dir, String(version), boardName);
                if (!fsSync.existsSync(filePath)) return null;
                const prevPath = fspath.join(dir, String(version - 1), boardName);
                const prevData = (version > 1 && fsSync.existsSync(prevPath))
                    ? await readJson(prevPath)
                    : { cards: [] };
                const currData = await readJson(filePath);
                const { type, card } = getChange(prevData, currData);
                const change = card ? {type: type, card: card.name} : {};

                return {
                    version: currData.version ?? version,
                    savedAt: currData.savedAt ?? null,
                    cards: (currData.cards ?? []).map(c => `${c.name}.card`),
                    change,
                };
            }));
            res.send(versions.filter(Boolean));
        } catch (err) {
            console.error(err);
            res.status(500).send({ error: 'Error reading versions' });
        }
    });


    // Save version
    app.post('/api/core/v1/boards/:boardId/version', requireAdmin(), async (req, res) => {
        const root = getRoot(req);
        const boardId = req.params.boardId;
        const jsonPath = fspath.join(BoardsDir(root), `${boardId}.json`);
        if (!fsSync.existsSync(jsonPath)) return res.status(404).send({ error: 'board not found' });
        const current = getCurrentVersionFromFS(root, boardId);
        await snapshotBoardFiles(root, boardId, current);
        res.send({ ok: true, version: current });
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
