import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                browser: true,
                node: true
            }
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': 'warn'
        }
    },
    prettierConfig
];
