export const SILHOUETTE = '#10151a';

const svg = (box, body) => `<svg viewBox="${box}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">${body}</svg>`;

export const LEAF_CLUSTER = svg('0 0 200 120',
    `<path fill="${SILHOUETTE}" d="M0 62 C28 40 62 42 96 66 C70 82 34 86 0 62Z"/>`
    + `<path fill="${SILHOUETTE}" d="M52 28 C84 4 126 8 152 40 C122 58 84 56 52 28Z"/>`
    + `<path fill="${SILHOUETTE}" d="M96 84 C128 62 170 70 200 104 C164 120 124 116 96 84Z"/>`
    + `<path fill="${SILHOUETTE}" d="M20 100 C44 84 72 92 90 112 C66 124 40 122 20 100Z"/>`
    + `<path stroke="${SILHOUETTE}" stroke-width="5" fill="none" d="M0 66 C60 70 120 74 200 58"/>`);

export const PASSER = svg('0 0 100 240',
    `<circle cx="50" cy="34" r="22" fill="${SILHOUETTE}"/>`
    + `<path fill="${SILHOUETTE}" d="M6 240 C4 150 14 82 50 70 C86 82 96 150 94 240Z"/>`);

export const PEEK_LEAF = svg('0 0 160 160',
    `<path fill="${SILHOUETTE}" d="M0 160 C0 90 30 34 96 10 C104 62 76 120 0 160Z"/>`
    + `<path fill="${SILHOUETTE}" d="M40 160 C48 100 90 60 160 56 C150 112 110 150 40 160Z"/>`
    + `<path fill="${SILHOUETTE}" d="M0 100 C20 60 56 40 84 44 C70 80 40 104 0 100Z"/>`);

export const FG_PARTS = Object.freeze({
    leaf: LEAF_CLUSTER,
    rail: '',
    pole: '',
    passer: PASSER,
});

export const BOKEH_SPOTS = Object.freeze([
    [14, 26, 7], [30, 62, 11], [52, 20, 6], [68, 54, 9], [84, 30, 8],
]);

export const DAPPLE_SPOTS = Object.freeze([
    [10, 20, 17], [28, 48, 13], [46, 14, 15], [62, 58, 12], [78, 26, 16], [90, 52, 10],
]);

export const STREAK_ROWS = Object.freeze([6, 12, 19, 27, 61, 69, 77, 84, 91, 96]);
