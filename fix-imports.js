const fs = require('fs');
const path = require('path');

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Fix import/require statements
    content = content.replace(
      /(from\s+['"])(\.\.?\/[^'"\s]+)(?<!\.js)(['"])/g, 
      '$1$2.js$3'
    );
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed imports in ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processDirectory(directory) {
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

// Start processing from the dist directory
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  console.log('🔍 Fixing import paths in dist/ directory...');
  processDirectory(distPath);
  console.log('✅ Finished fixing import paths');
} else {
  console.error('❌ dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}
