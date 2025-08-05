const js = require('@eslint/js');
const prettierConfig = require('eslint-config-prettier');
const jsdoc = require('eslint-plugin-jsdoc');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');

// Base configuration for all files
const baseConfig = {
    languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: {
            browser: true,
            node: true,
            document: 'readonly',
            window: 'readonly',
            console: 'readonly',
            performance: 'readonly',
            requestAnimationFrame: 'readonly',
            cancelAnimationFrame: 'readonly',
            clearTimeout: 'readonly',
            setTimeout: 'readonly',
            setInterval: 'readonly',
            clearInterval: 'readonly',
            fetch: 'readonly',
            module: 'readonly',
            process: 'readonly',
        },
    },
};

// Test file configuration
const testConfig = {
    files: ['**/__tests__/**', '**/*.test.js', '**/*.test.ts'],
    languageOptions: {
        globals: {
            ...baseConfig.languageOptions.globals,
            jest: 'readonly',
            describe: 'readonly',
            it: 'readonly',
            test: 'readonly',
            expect: 'readonly',
            beforeEach: 'readonly',
            afterEach: 'readonly',
            beforeAll: 'readonly',
            afterAll: 'readonly',
        },
    },
};

module.exports = [
    js.configs.recommended,
    // Base TypeScript configuration
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            ...baseConfig.languageOptions,
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json',
            },
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
            jsdoc,
        },
        rules: {
            // Base rules - temporarily relaxed for migration
            'no-console': 'warn',
            'no-unused-vars': 'off', // Disabled in favor of @typescript-eslint/no-unused-vars
            'no-dupe-class-members': 'off', // Will be handled by TypeScript
            'no-unreachable': 'off', // Will be handled by TypeScript
            'no-undef': 'off', // Handled by TypeScript
            
            // TypeScript rules
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off', // Temporarily off for migration
            
            // JSDoc rules - temporarily disabled for migration
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/require-returns-description': 'off'
        },
    },
    
    // JavaScript configuration (exclude test files)
    {
        files: ['**/*.js', '!**/__tests__/**', '!**/*.test.js'],
        ...baseConfig,
        rules: {
            ...baseConfig.rules,
            'no-console': 'warn',
            'no-unused-vars': 'warn',
            'no-undef': 'error',
        },
    },
    
    // Test file configuration
    {
        ...testConfig,
        rules: {
            ...testConfig.rules,
            'no-console': 'off',
            'no-unused-vars': 'off',
            'no-undef': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
    prettierConfig,
];
