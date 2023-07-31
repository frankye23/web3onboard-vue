import type { InitOptions, OnboardAPI } from '@onboard-dx/core';
import type { OnboardComposable } from './types.js';
declare const init: (options: InitOptions) => OnboardAPI;
declare const useOnboard: () => OnboardComposable;
export { init, useOnboard };
