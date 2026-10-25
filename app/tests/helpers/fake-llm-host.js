export function fakeLlmHost(overrides = {}) {
    return {
        SillyTavern: { getContext: () => ({
            getRequestHeaders: () => ({ 'Content-Type': 'application/json', 'X-CSRF-Token': 'fake-csrf' }),
        }) },
        ...overrides,
    };
}
