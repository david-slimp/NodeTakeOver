import fs from 'fs';
import path from 'path';

function fixImportsInFile(filePath: string): void {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Fix import statements: append `.js` for relative module specifiers that don't already have it.
        // Example: `from './game'` -> `from './game.js'`
        content = content.replace(
            /(from\s+['"])(\.\.?\/[^'"\s]+)(?<!\.js)(['"])/g,
            '$1$2.js$3',
        );

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(
                `✅ Fixed imports in ${path.relative(process.cwd(), filePath)}`,
            );
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error processing ${filePath}:`, message);
    }
}

function processDirectory(directory: string): void {
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.name.endsWith('.js')) {
            fixImportsInFile(fullPath);
        }
    }
}

const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
    console.log('🔍 Fixing import paths in dist/ directory...');
    processDirectory(distPath);
    console.log('✅ Finished fixing import paths');
} else {
    console.error('❌ dist/ directory not found. Run `npm run build` first.');
    process.exit(1);
}

