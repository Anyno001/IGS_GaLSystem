import { createFakeIndexedDB } from './fake-idb.js';

export class MediaStorage {
    constructor() { this.values = new Map(); }
    get length() { return this.values.size; }
    key(index) { return [...this.values.keys()][index] || null; }
    getItem(key) { return this.values.get(key) ?? null; }
    setItem(key, value) { this.values.set(key, String(value)); }
    removeItem(key) { this.values.delete(key); }
}

export function fakeMediaServer() {
    const server = { files: new Map(), images: new Map(), uploads: [], deletions: [], downloads: [], failDelete: false, failUpload: false, failBackup: false, failRead: false, gateRead: null };
    server.host = (indexedDB = createFakeIndexedDB()) => ({
        indexedDB, localStorage: new MediaStorage(), setTimeout, clearTimeout, AbortController, btoa, atob,
        SillyTavern: { getContext: () => ({ getRequestHeaders: () => ({ 'Content-Type': 'application/json' }) }) },
        FileReader: class {
            readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`; this.onload?.(); }); }
        },
        async fetch(url, options = {}) {
            const body = options.body ? JSON.parse(options.body) : {};
            if (String(url).startsWith('/user/files/')) {
                if (server.gateRead) await server.gateRead;
                if (server.failRead) throw new Error('network-offline');
                const name = String(url).slice(12).split('?')[0], value = server.files.get(name);
                return value ? { ok: true, status: 200, json: async () => structuredClone(value) } : { ok: false, status: 404 };
            }
            if (url === '/api/files/upload') {
                if (server.failBackup) return { ok: false, status: 500 };
                server.files.set(body.name, JSON.parse(Buffer.from(body.data, 'base64').toString('utf8')));
                server.uploads.push(body.name); return { ok: true, status: 200 };
            }
            if (url === '/api/images/upload') {
                if (server.failUpload) return { ok: false, status: 500 };
                const path = `user/images/${body.ch_name}/${body.filename}.${body.format}`;
                server.images.set(path, `data:image/${body.format === 'jpg' ? 'jpeg' : body.format};base64,${body.image}`);
                return { ok: true, status: 200, json: async () => ({ path }) };
            }
            if (url === '/api/images/delete') {
                if (server.failDelete) return { ok: false, status: 500 };
                server.deletions.push(body.path); server.images.delete(body.path); return { ok: true, status: 200 };
            }
            if (url === '/api/images/list') return { ok: true, status: 200, json: async () => [...server.images.keys()].filter(path => path.startsWith(`user/images/${body.folder}/`)).map(path => path.split('/').pop()) };
            if (String(url).startsWith('/user/images/')) {
                const path = String(url).slice(1), dataUrl = server.images.get(path);
                server.downloads.push(path);
                if (!dataUrl) return { ok: false, status: 404 };
                const [head, data] = dataUrl.split(',');
                return { ok: true, status: 200, blob: async () => new Blob([Buffer.from(data, 'base64')], { type: head.slice(5).split(';')[0] }) };
            }
            return { ok: false, status: 404 };
        },
    });
    return server;
}
export const pixel = value => `data:image/png;base64,${Buffer.from(String(value)).toString('base64')}`;
export const settleMedia = async () => { for (let i = 0; i < 5; i += 1) await new Promise(resolve => setTimeout(resolve, 0)); };
