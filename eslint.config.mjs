// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from 'eslint-config-next';

export default [...nextConfig, {
  rules: {
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/static-components': 'warn',
    'react-hooks/use-memo': 'warn',
    'react-hooks/preserve-manual-memoization': 'warn',
    'react-hooks/immutability': 'warn',
    'react-hooks/globals': 'warn',
    'react-hooks/refs': 'warn',
    'react-hooks/error-boundaries': 'warn',
    'react-hooks/purity': 'warn',
    'react-hooks/set-state-in-render': 'warn',
    'react-hooks/config': 'warn',
    'react-hooks/gating': 'warn',
  },
}, ...storybook.configs["flat/recommended"]];
