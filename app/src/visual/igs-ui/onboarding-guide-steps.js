// 新手配置引导的步骤数据。
// page 是设置器的页面 id（见 settings-pages.js），交给设置控制器切换视图，不写任何设置值。
// open 是要自动展开的折叠 key（data-advanced）；target 为候选选择器，取第一个可见的命中元素高亮，
// targetNarrow 只在窄屏（与设置外壳同一断点，宽度小于 900px）使用，全部不命中时卡片提示「这一项当前不可见」。
// requires：目标所在区域被隐藏时，先高亮 switch 对应的开关并提示 hint（素材模式没开就是这种情况）。
const SCENE_ASSET_REQUIRES = Object.freeze({
    content: '.igs-scene-settings-content',
    switch: 'bridge.sceneAssets.enabled',
    hint: '先开启「启用场景素材模式」',
});

export const ONBOARDING_STEPS = Object.freeze([
    Object.freeze({
        id: 'welcome', page: 'dash', target: [],
        title: '欢迎',
        body: '每一步都可跳过，随时按Esc暂停，之后从邀请条继续。',
    }),
    Object.freeze({
        id: 'quick', page: 'dash', target: ['.igs-perf-presets'], quiz: true,
        title: '快速配置演出',
        body: '回答几个问题，把演出调成合适的组合；暂不设置可跳过。',
    }),
    Object.freeze({
        id: 'sidebar', page: 'dash', target: ['.igs-settings-nav'], targetNarrow: ['.igs-settings-nav-toggle'],
        title: '设置分类',
        body: '设置按用途分类，仪表盘右侧能看到每类现状。',
    }),
    Object.freeze({
        id: 'preset', page: 'dash', target: ['.igs-perf-quality', '.igs-perf-preset-row'],
        title: '档位与省电',
        body: '不确定就选「推荐」；手机发热，把画质切到「省电模式」。',
    }),
    Object.freeze({
        id: 'perf', page: 'perf-text', target: ['.igs-perf-item:has([data-switch="readerSettings.typewriter.enabled"])', '.igs-perf-page .igs-perf-item', '.igs-perf-page'],
        title: '演出细项',
        body: '每项一个开关，点›看细项。',
    }),
    Object.freeze({
        id: 'style', page: 'style', target: ['[data-path="readerSettings.dialogSkin"]'],
        title: '对话框与文字',
        body: '在这里换对话框风格；字号、字体在「文字」。',
    }),
    Object.freeze({
        id: 'mode', page: 'ui-reader', target: ['.igs-key-block:has([data-segment-path="bridge.openMode"])', '[data-segment-path="bridge.openMode"]'],
        title: '打开方式',
        body: '可选电脑、窄屏模式、网页全屏、全屏、楼层内嵌，建议「楼层内嵌」。',
    }),
    Object.freeze({
        id: 'toolbar', page: 'ui-bar', target: ['[data-reader-pane="interface"] .igs-btn-mgr-list'],
        title: '工具栏',
        body: '目录、存档、CG库都在工具栏，可在这里隐藏或排序。',
    }),
    Object.freeze({
        id: 'assets', page: 'scenes', requires: SCENE_ASSET_REQUIRES, target: ['[data-add-menu="scenes"]', '.igs-page-tabs'],
        title: '场景与角色',
        body: '点「+」新增场景或下载默认素材，「多选」批量删除；立绘设置在「角色」页。',
    }),
    Object.freeze({
        id: 'image', page: 'source', target: ['[data-image-pane="source"] .igs-settings-field', '[data-image-pane="source"]'], optional: true,
        title: '自动插图',
        body: '填好图像来源即可自动生成插图；没配置也不影响阅读。',
    }),
    Object.freeze({
        id: 'search', page: 'dash', target: ['.igs-settings-search'],
        title: '找不到就搜',
        body: '搜「黑边」「卡顿」这类口语词即可跳转；「最近改过」在仪表盘。',
    }),
]);
