#!/usr/bin/env node

/**
 * Script to ensure port 8000 is available before starting the development server.
 * If port 8000 is in use, it will attempt to free it up.
 */

import net from 'net';
import readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const PORT = 8000;

/**
 * Check if a port is in use.
 */
async function isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net
            .createServer()
            .once('error', () => resolve(true))
            .once('listening', () => {
                server.close();
                resolve(false);
            })
            .listen(port);
    });
}

/**
 * Get the process ID using port 8000.
 */
async function getProcessUsingPort(): Promise<string | null> {
    try {
        // Linux/MacOS
        const { stdout } = await execPromise(`lsof -ti:${PORT} -sTCP:LISTEN`);
        const pid = stdout.trim();
        return pid ? pid : null;
    } catch (error) {
        const maybeCode = (error as { code?: number }).code;
        if (maybeCode === 1) {
            // No process found
            return null;
        }
        // Windows fallback
        try {
            const { stdout } = await execPromise(`netstat -ano | findstr :${PORT}`);
            const match = stdout.match(/\s+(\d+)$/);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }
}

/**
 * Kill a process by PID.
 */
async function killProcess(pid: string): Promise<boolean> {
    try {
        if (process.platform === 'win32') {
            await execPromise(`taskkill /F /PID ${pid}`);
        } else {
            await execPromise(`kill -9 ${pid}`);
        }
        console.log(`✅ Killed process ${pid} using port ${PORT}`);
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to kill process ${pid}:`, message);
        return false;
    }
}

async function main(): Promise<void> {
    const portInUse = await isPortInUse(PORT);

    if (!portInUse) {
        console.log(`✅ Port ${PORT} is available`);
        process.exit(0);
    }

    console.log(`⚠️  Port ${PORT} is in use. Attempting to free it up...`);

    const pid = await getProcessUsingPort();
    if (!pid) {
        console.log(
            `❌ Could not identify process using port ${PORT}. Please free it up manually.`,
        );
        process.exit(1);
    }

    console.log(`Found process ${pid} using port ${PORT}`);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question(`Do you want to kill process ${pid}? (y/N) `, async (answer) => {
        try {
            if (answer.toLowerCase() === 'y') {
                const success = await killProcess(pid);
                process.exit(success ? 0 : 1);
            } else {
                console.log(
                    'Operation cancelled. Please free up port 8000 manually and try again.',
                );
                process.exit(1);
            }
        } finally {
            rl.close();
        }
    });
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
    process.exit(1);
});

