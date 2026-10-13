import nextPlugin from '@next/eslint-plugin-next';

import base from '../../eslint.config.mjs';

export default [...base, nextPlugin.flatConfig.coreWebVitals];
