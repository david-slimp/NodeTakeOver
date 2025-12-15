import puppeteer from 'puppeteer';
import http from 'http';
import { spawn, execSync } from 'child_process';

const PORT = 8000;
const HOST = 'localhost';
const GAME_URL = `http://${HOST}:${PORT}`;

let serverProcess: ReturnType<typeof spawn> | undefined;

function startServer(): Promise<void> {
    return new Promise((resolve) => {
        try {
            execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`);
        } catch {
            // No process to kill
        }

        console.log('🚀 Starting server...');
        serverProcess = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist/'], {
            stdio: 'inherit',
            shell: true,
        });

        const maxRetries = 10;
        let retries = 0;

        const retryOrFail = (err?: Error) => {
            retries++;
            if (retries < maxRetries) {
                console.log(`   Waiting for server to start... (${retries}/${maxRetries})`);
                setTimeout(checkServer, 1000);
            } else {
                console.error(
                    '❌ Failed to start server:',
                    err?.message || 'Server did not start in time',
                );
                process.exit(1);
            }
        };

        const checkServer = () => {
            http
                .get(GAME_URL, (res) => {
                    if (res.statusCode === 200) {
                        console.log(`✅ Server is running at ${GAME_URL}`);
                        resolve();
                    } else {
                        retryOrFail();
                    }
                })
                .on('error', (err) => {
                    retryOrFail(err);
                });
        };

        checkServer();
    });
}

async function runBrowserTest(): Promise<void> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
    try {
        await startServer();

        console.log('🌐 Launching browser...');
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        const errors: string[] = [];

        page.on('console', (msg) => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error') {
                const errorMessage = `Console error: ${text}`;
                console.error(`❌ ${errorMessage}`);
                errors.push(errorMessage);
            } else if (type === 'warn') {
                console.warn(`⚠️  Browser console warning: ${text}`);
            } else {
                console.log(`📝 Browser console.${type}: ${text}`);
            }
        });

        page.on('pageerror', (error) => {
            const errorMessage = `Page error: ${error.message}\n${error.stack}`;
            console.error(`❌ ${errorMessage}`);
            errors.push(errorMessage);
        });

        page.on('requestfailed', (request) => {
            const failure = request.failure();
            const errorMessage = `Request failed: ${request.url()} - ${failure?.errorText || 'unknown error'}`;
            console.error(`❌ ${errorMessage}`);
            errors.push(errorMessage);
        });

        console.log(`🌐 Navigating to ${GAME_URL}...`);
        const response = await page.goto(GAME_URL, {
            waitUntil: 'networkidle0',
            timeout: 30000,
        });

        if (!response || !response.ok()) {
            throw new Error(
                `Failed to load page: ${response ? `${response.status()} ${response.statusText()}` : 'no response'}`,
            );
        }

        if (errors.length > 0) {
            throw new Error(`Errors occurred during page load:\n${errors.join('\n')}`);
        }

        console.log('⏳ Waiting for game to initialize...');
        try {
            await page.waitForFunction('window.game !== undefined', {
                timeout: 10000,
                polling: 100,
            });
            console.log('✅ Game initialized');
        } catch (error) {
            const gameState = await page.evaluate(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const w = window as any;
                return {
                    gameDefined: typeof w.game !== 'undefined',
                };
            });
            console.error('Game initialization failed. Current state:', gameState);
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Game failed to initialize: ${message}`);
        }

        console.log('🖱️ Looking for player nodes...');
        const clickResult = await page.evaluate(async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const w = window as any;
                const nodes = w.game?.nodes || [];
                const playerNode = nodes.find((node: any) => node.owner === 'player');

                if (!playerNode) return { success: false, error: 'No player nodes found' };

                const canvas = document.querySelector('canvas');
                if (!canvas) return { success: false, error: 'Canvas not found' };

                const rect = canvas.getBoundingClientRect();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const c = canvas as any;
                const scaleX = c.width / rect.width;
                const scaleY = c.height / rect.height;

                const x = rect.left + playerNode.x * scaleX;
                const y = rect.top + playerNode.y * scaleY;

                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y,
                });

                canvas.dispatchEvent(clickEvent);

                return {
                    success: true,
                    node: {
                        id: playerNode.id,
                        x: playerNode.x,
                        y: playerNode.y,
                        units: playerNode.units,
                        owner: playerNode.owner,
                    },
                    clickPosition: { x, y },
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                return { success: false, error: message };
            }
        });

        if (!clickResult.success) {
            throw new Error(`Failed to click node: ${clickResult.error}`);
        }

        console.log(
            `✅ Successfully clicked player node at (${clickResult.node.x}, ${clickResult.node.y})`,
        );
        console.log('   Node details:', clickResult.node);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        const isNodeSelected = await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;
            return w.game && w.game.selectedNode !== null;
        });

        if (!isNodeSelected) {
            throw new Error('Failed to select node after click');
        }

        console.log('✅ Successfully selected player node');

        const nodeSelectionState = await page.evaluate(() => {
            const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;
            if (!canvas) return { success: false, error: 'Canvas not found' };

            const ctx = canvas.getContext('2d');
            const selectedNode = w.game.selectedNode;
            if (!ctx || !selectedNode) return { success: false, error: 'No selected node' };

            const pixelData = ctx.getImageData(selectedNode.x, selectedNode.y - 20, 5, 5).data;
            const hasColor = Array.from(pixelData).some((value) => value > 0);

            return {
                success: true,
                selectedNode: {
                    x: selectedNode.x,
                    y: selectedNode.y,
                    units: selectedNode.units,
                    owner: selectedNode.owner,
                    isHighlighted: hasColor,
                },
            };
        });

        console.log('Node selection state:', nodeSelectionState);

        const screenshotPath = 'test-screenshot.png';
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved to ${screenshotPath}`);

        console.log('\n🎉 Browser test completed successfully!');

        if (process.env.CLOSE_BROWSER !== 'false') {
            await browser.close();
            serverProcess?.kill();
            process.exit(0);
        } else {
            console.log('\nBrowser will stay open for manual testing.');
            console.log('Press Ctrl+C to exit.');
        }
    } catch (error) {
        console.error('❌ Browser test failed:', error);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        if (serverProcess) serverProcess.kill();
    }
}

runBrowserTest();
