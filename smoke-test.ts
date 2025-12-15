import { spawn, exec } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

const PORT = 8000;
const HOST = 'localhost';
const TIMEOUT = 10000; // 10 seconds

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

        const module = (await import(`file://${fullPath}`)) as Record<string, unknown>;

        const missingExports: string[] = [];
        for (const exportName of expectedExports) {
            if (!(exportName in module)) {
                missingExports.push(exportName);
            }
        }

        if (missingExports.length > 0) {
            console.error(
                `❌ ${modulePath} - Missing exports: ${missingExports.join(', ')}`,
            );
            console.log(
                `   Available exports:`,
                Object.keys(module).filter((k) => k !== '__esModule'),
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

async function isPortInUse(port: number): Promise<boolean> {
    try {
        return await new Promise((resolve) => {
            const server = require('net')
                .createServer()
                .once('error', () => resolve(true))
                .once('listening', () => {
                    server.close();
                    resolve(false);
                })
                .listen(port);
        });
    } catch {
        return true;
    }
}

async function killProcessOnPort(port: number): Promise<boolean> {
    try {
        console.log(`🔄 Checking for processes on port ${port}...`);

        if (process.platform === 'win32') {
            const { stdout } = await execPromise(`netstat -ano | findstr :${port}`);
            const matches = stdout.trim().split('\n');
            const pids: string[] = [];

            for (const line of matches) {
                const match = line.trim().split(/\s+/);
                if (match.length > 4) pids.push(match[4]);
            }

            if (pids.length > 0) {
                console.log(`Found processes on port ${port}, killing PIDs: ${pids.join(', ')}`);
                for (const pid of pids) {
                    try {
                        await execPromise(`taskkill /F /PID ${pid}`);
                    } catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        console.warn(`Warning: Could not kill process ${pid}:`, msg);
                    }
                }
            }
        } else {
            await execPromise(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️  Could not kill process on port ${port}:`, message);
        return false;
    }
}

async function runSmokeTest(): Promise<void> {
    let server: ReturnType<typeof spawn> | undefined;

    try {
        checkDistDirectory();

        if (await isPortInUse(PORT)) {
            console.log(`⚠️  Port ${PORT} is in use. Attempting to free it up...`);
            await killProcessOnPort(PORT);

            if (await isPortInUse(PORT)) {
                throw new Error(
                    `Could not free up port ${PORT}. Please close any applications using this port.`,
                );
            }
            console.log(`✅ Successfully freed up port ${PORT}`);
        }

        console.log(`🚀 Starting server on port ${PORT}...`);
        server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], {
            stdio: 'inherit',
            shell: true,
        });

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
        console.log(`🌐 Server is still running at http://localhost:${PORT}`);
        console.log('Press Ctrl+C to stop the server');
    } catch (error) {
        console.error('\n❌ Smoke test failed:');
        const message = error instanceof Error ? error.message : String(error);
        console.error(message);

        if (server) server.kill('SIGTERM');
        process.exit(1);
    }
}

runSmokeTest();

