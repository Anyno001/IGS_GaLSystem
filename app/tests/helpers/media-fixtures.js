import { createLocalImageCache } from '../../src/media/tavern-image-cache.js';
import { createAssetGenerationService as assetService } from '../../src/generated-images/illustration/asset-generation-service.js';
import { createAutoIllustrationService as illustrationService } from '../../src/generated-images/illustration/auto-illustration-service.js';
import { createItemImageService as itemService } from '../../src/generated-images/illustration/item-image-service.js';
import { createMessageImageCache as messageCache } from '../../src/media/message-image-cache.js';
import { createMemoryCgIndexStore as cgIndex } from '../../src/media/cg-index-store.js';
import { createMemoryAssetThumbStore as assetThumbs } from '../../src/media/asset-thumb-store.js';
import { createCgLibrary as cgLibrary } from '../../src/media/cg-library.js';
import { createCgLibraryView as cgView } from '../../src/visual/igs-ui/cg-library-view.js';
import { createReaderImageService as readerService } from '../../src/generated-images/reader-image-service.js';

export function fixtureMedia(options = {}) {
    return options.mediaCache || options.indexStore?.mediaCache || options.thumbStore?.mediaCache || createLocalImageCache(options.urlApi
        ? { URL: options.urlApi, Blob: options.Blob || Blob, atob, btoa } : {});
}
export const createAssetGenerationService = deps => assetService({ ...deps, mediaCache: fixtureMedia(deps) });
export const createAutoIllustrationService = deps => illustrationService({ ...deps, mediaCache: fixtureMedia(deps) });
export const createItemImageService = deps => itemService({ ...deps, mediaCache: fixtureMedia(deps) });
export const createMessageImageCache = (store, options = {}) => messageCache(store, { ...options, mediaCache: fixtureMedia(options) });
export const createMemoryCgIndexStore = (options = {}) => cgIndex({ mediaCache: fixtureMedia(options) });
export const createMemoryAssetThumbStore = (options = {}) => assetThumbs({ mediaCache: fixtureMedia(options) });
export const createCgLibrary = deps => cgLibrary({ ...deps, mediaCache: fixtureMedia(deps) });
export const createCgLibraryView = (library, options = {}) => cgView(library, { ...options, mediaCache: options.mediaCache || library?.mediaCache || fixtureMedia(options) });
export const createReaderImageService = (options = {}) => readerService({ ...options, mediaCache: fixtureMedia(options) });
