import { spawn, exec } from 'child_process';
import http from 'http';
import fs from 'fs';
import net from 'net';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

const PORT = Number.parseInt(process.env.PORT ?? '8000', 10);
const HOST = 'localhost';
const TIMEOUT = 10000; // 10 seconds
const KEEP_SERVER = process.argv.includes('--keep-server');

// Files that should exist in dist/
const REQUIRED_FILES = [
    'index.html',
    'main.js',
    'game.js',
    'config.js',
    'node.js',
    'wall.js',
    'style.css',
];

const distPath = path.resolve(process.cwd(), 'dist');

function checkDistDirectory(): true {
    console.log('🔍 Checking dist directory...');

    if (!fs.existsSync(distPath)) {
        throw new Error('❌ dist/ directory does not exist. Run `npm run build` first.');
    }

    const missingFiles = REQUIRED_FILES.filter((file) =>
        fs.existsSync(path.join(distPath, file)) ? false : true,
    );

    if (missingFiles.length > 0) {
        console.warn(
            '⚠️  Missing files in dist/ directory:',
            missingFiles.join(', '),
        );
    } else {
        console.log('✅ All required files found in dist/');
    }

    return true;
}

function checkServer(): Promise<void> {
    console.log('🌐 Checking server...');

    return new Promise((resolve, reject) => {
        const req = http.get(`http://${HOST}:${PORT}`, (res) => {
            if (res.statusCode === 200) {
                console.log(`✅ Server is running at http://${HOST}:${PORT}`);
                resolve();
            } else {
                reject(new Error(`Server returned status code: ${res.statusCode}`));
            }
        });

        req.on('error', (e) => {
            reject(new Error(`Server connection failed: ${e.message}`));
        });

        req.setTimeout(TIMEOUT, () => {
            req.destroy();
            reject(new Error(`Server check timed out after ${TIMEOUT}ms`));
        });
    });
}

function httpGetText(urlPath: string): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://${HOST}:${PORT}${urlPath}`, (res) => {
            const statusCode = res.statusCode ?? 0;
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => resolve({ statusCode, body }));
        });

        req.on('error', (e) => reject(e));

        req.setTimeout(TIMEOUT, () => {
            req.destroy();
            reject(new Error(`GET ${urlPath} timed out after ${TIMEOUT}ms`));
        });
    });
}

async function isLikelyNodeTakeOverServer(): Promise<boolean> {
    try {
        const indexRes = await httpGetText('/');
        if (indexRes.statusCode !== 200) return false;

        const hasCanvas = indexRes.body.includes('id="gameCanvas"');
        const hasMainScript = indexRes.body.includes('src="main.js"');
        if (!hasCanvas || !hasMainScript) return false;

        const mainRes = await httpGetText('/main.js');
        if (mainRes.statusCode !== 200) return false;

        // Basic fingerprint: our entrypoint references the game canvas.
        if (!mainRes.body.includes('gameCanvas')) return false;

        return true;
    } catch {
        return false;
    }
}

function checkUrl(urlPath: string): Promise<void> {
    return new Promise((resolve) => {
        const req = http.get(`http://${HOST}:${PORT}${urlPath}`, (res) => {
            if (res.statusCode === 200) {
                console.log(`✅ ${urlPath} - ${res.statusCode}`);
            } else {
                console.warn(`⚠️  ${urlPath} - ${res.statusCode}`);
            }
            resolve();
        });

        req.on('error', (e) => {
            console.error(`❌ ${urlPath} - Error: ${e.message}`);
            resolve();
        });
    });
}

async function checkModuleExports(
    modulePath: string,
    expectedExports: string[],
): Promise<boolean> {
    try {
        const fullPath = path.join(distPath, modulePath);

        if (!fs.existsSync(fullPath)) {
            console.log(`ℹ️  ${modulePath} - Not found, skipping export check`);
            return true;
        }

        const missingExports: string[] = [];
        const source = fs.readFileSync(fullPath, 'utf8');

        for (const exportName of expectedExports) {
            const namedExportRe = new RegExp(
                String.raw`\bexport\s+(?:class|function|const|let|var)\s+${exportName}\b`,
            );
            const exportListRe = new RegExp(
                String.raw`\bexport\s*\{[^}]*\b${exportName}\b[^}]*\}`,
            );

            if (!namedExportRe.test(source) && !exportListRe.test(source)) {
                missingExports.push(exportName);
            }
        }

        if (missingExports.length > 0) {
            console.error(
                `❌ ${modulePath} - Missing exports: ${missingExports.join(', ')}`,
            );
            return false;
        }

        console.log(`✅ ${modulePath} - All expected exports found`);
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ ${modulePath} - Error checking exports: ${message}`);
        return false;
    }
}

type PortStatus = 'available' | 'in_use' | 'permission_denied';

async function getPortStatus(port: number): Promise<PortStatus> {
    return await new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') return resolve('in_use');
            if (err.code === 'EACCES' || err.code === 'EPERM') {
                return resolve('permission_denied');
            }
            // Default to "in_use" for unknown bind errors to avoid false "available".
            return resolve('in_use');
        });

        server.once('listening', () => {
            server.close(() => resolve('available'));
        });

        server.listen(port, HOST);
    });
}

async function runSmokeTest(): Promise<void> {
    let server: ReturnType<typeof spawn> | undefined;
    let startedServer = false;

    try {
        checkDistDirectory();

        const portStatus = await getPortStatus(PORT);
        if (portStatus === 'permission_denied') {
            const isNodeTakeOver = await isLikelyNodeTakeOverServer();
            if (isNodeTakeOver) {
                console.log(
                    `ℹ️  Port ${PORT} is already serving NodeTakeOver; reusing existing server.`,
                );
            } else {
                throw new Error(
                    `Cannot bind to port ${PORT} due to insufficient permissions (EACCES/EPERM). ` +
                        `If you have a NodeTakeOver dev server already running, keep it running and re-run; ` +
                        `otherwise run with elevated permissions or set PORT to an available port.`,
                );
            }
        } else if (portStatus === 'in_use') {
            const isNodeTakeOver = await isLikelyNodeTakeOverServer();
            if (!isNodeTakeOver) {
                throw new Error(
                    `Port ${PORT} is already in use by a server that does not look like NodeTakeOver. ` +
                        `Stop the process using port ${PORT} and re-run, or set PORT to an available port.`,
                );
            }
            console.log(
                `ℹ️  Port ${PORT} is already serving NodeTakeOver; reusing existing server.`,
            );
        } else {
            console.log(`🚀 Starting server on port ${PORT}...`);
            server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], {
                stdio: 'inherit',
                shell: true,
            });
            startedServer = true;
        }

        const maxRetries = 5;
        let retryCount = 0;
        let serverReady = false;

        while (retryCount < maxRetries && !serverReady) {
            try {
                await checkServer();
                serverReady = true;
            } catch (error) {
                retryCount++;
                if (retryCount >= maxRetries) throw error;
                console.log(
                    `⏳ Waiting for server to start (attempt ${retryCount + 1}/${maxRetries})...`,
                );
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        await checkServer();

        console.log('🔗 Checking URLs...');
        await checkUrl('/');
        await checkUrl('/main.js');
        await checkUrl('/game.js');
        await checkUrl('/config.js');
        await checkUrl('/node.js');
        await checkUrl('/wall.js');
        await checkUrl('/style.css');

        console.log('\n🔍 Checking module exports...');
        const exportChecks = [
            { path: 'node.js', exports: ['Node'] },
            { path: 'game.js', exports: ['Game'] },
            { path: 'config.js', exports: ['cfg', 'rngInstance', 'seededRandomGenerator'] },
            { path: 'wall.js', exports: ['Wall'] },
        ];

        let allExportsValid = true;
        for (const check of exportChecks) {
            const result = await checkModuleExports(check.path, check.exports);
            if (!result) allExportsValid = false;
        }

        if (!allExportsValid) {
            throw new Error('Some modules are missing expected exports');
        }

        console.log('\n🎉 Smoke test completed successfully!');
        console.log(`🌐 Verified at http://localhost:${PORT}`);

        if (startedServer && server && !KEEP_SERVER) {
            console.log('🧹 Stopping smoke-test server...');
            server.kill('SIGTERM');
            await new Promise<void>((resolve) => {
                server?.once('exit', () => resolve());
                setTimeout(() => resolve(), 2000);
            });
        } else if (startedServer && KEEP_SERVER) {
            console.log(
                `ℹ️  Server started by smoke-test left running due to --keep-server.`,
            );
        } else {
            console.log(`ℹ️  Existing server was reused and left running.`);
        }
    } catch (error) {
        console.error('\n❌ Smoke test failed:');
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);

        if (startedServer && server) server.kill('SIGTERM');
        process.exit(1);
    }
}

runSmokeTest();
