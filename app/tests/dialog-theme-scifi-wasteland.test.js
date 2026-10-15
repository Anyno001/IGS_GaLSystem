import test from 'node:test';
import assert from 'node:assert/strict';
import { DIALOG_SKIN_SCIFI_HOLO } from '../src/visual/igs-ui/dialog-theme-scifi.js';
import { DIALOG_SKIN_WASTELAND_RUST } from '../src/visual/igs-ui/dialog-theme-wasteland.js';
import { ILLUSTRATED_DIALOG_SKINS, normalizeDialogSkin } from '../src/visual/igs-ui/classic-dialog-skin.js';
import { dialogSkinLabel } from '../src/visual/igs-ui/dialog-skin-catalog.js';
import { worldviewDialogSkins } from '../src/visual/igs-ui/worldview-skins.js';
import { getReferenceDialogTypography } from '../src/visual/igs-ui/dialog-theme-typography.js';
import { getBattleTheme } from '../src/visual/igs-ui/fx-battle-themes.js';
import { CHAT_THEME_PALETTES, resolveChatTheme } from '../src/visual/igs-ui/chat-themes.js';
import { CLICK_WAIT_MARK_SKINS } from '../src/visual/igs-ui/click-wait-mark.js';
import { ITEM_FRAME_SKINS } from '../src/visual/igs-ui/dialog-theme-item-frames.js';
import { resolveUiSfxFamily } from '../src/visual/igs-ui/ui-sfx.js';

const SKINS = [
    { id: DIALOG_SKIN_SCIFI_HOLO, label: '全息投影', worldview: 'scifi', mark: 'reticle', sfx: 'digital' },
    { id: DIALOG_SKIN_WASTELAND_RUST, label: '废土锈铁', worldview: 'apocalypse', mark: 'hazard', sfx: 'metal' },
];

test('gate:igs-ui:scifi-and-wasteland-skins-fill-every-skin-table', () => {
    for (const skin of SKINS) {
        const { id } = skin;
        assert.equal(normalizeDialogSkin(id), id);
        assert.ok(ILLUSTRATED_DIALOG_SKINS.includes(id), id);
        assert.equal(dialogSkinLabel(id), skin.label);
        assert.equal(worldviewDialogSkins(skin.worldview)[0], id, `${skin.worldview} 默认用 ${id}`);
        assert.ok(getReferenceDialogTypography(id), `${id} typography`);
        assert.ok(getBattleTheme(id), `${id} battle theme`);
        assert.ok(Object.hasOwn(CHAT_THEME_PALETTES, id) && resolveChatTheme(id).key === id, `${id} chat`);
        assert.equal(CLICK_WAIT_MARK_SKINS[id].shape, skin.mark);
        assert.ok(ITEM_FRAME_SKINS.includes(id), `${id} item frame`);
        assert.equal(resolveUiSfxFamily(id), skin.sfx);
    }
});
