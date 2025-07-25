import { spawn } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { MongoClient } from 'mongodb';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class MongoMigrationTool {
    constructor() {
        this.tempDir = path.join(process.cwd(), 'temp-migration');
        this.logger = new Logger();
        this.predefinedConnections = this.loadPredefinedConnections();
    }

    loadPredefinedConnections() {
        const connections = {};

        // Find all environment variables that match DB_*_URI pattern
        Object.keys(process.env).forEach(key => {
            if (key.startsWith('DB_') && key.endsWith('_URI')) {
                // Extract the name (e.g., DB_LOCAL_URI -> LOCAL)
                const name = key.replace('DB_', '').replace('_URI', '');
                const displayName = name.toLowerCase().replace(/_/g, '-');
                connections[displayName] = {
                    name: displayName,
                    uri: process.env[key]
                };
            }
        });

        return connections;
    }

    async run() {
        try {
            this.logger.info('🚀 MongoDB Migration Tool Started');

            // Get source and destination connection details
            const config = await this.getConnectionConfig();

            // Validate connections
            await this.validateConnections(config);

            // Get collections to migrate
            const collections = await this.selectCollections(config.source);
            this.logger.info('🎯 Collection selection completed, proceeding to confirmation...');

            // Confirm migration
            const confirmed = await this.confirmMigration(config, collections);
            if (!confirmed) {
                this.logger.warn('Migration cancelled by user');
                return;
            }
            this.logger.info('✅ Migration confirmed, starting migration process...');

            // Perform migration
            await this.performMigration(config, collections);

            this.logger.success('✅ Migration completed successfully!');

        } catch (error) {
            this.logger.error('❌ Migration failed:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    async getConnectionConfig() {
        this.logger.info('📋 Gathering connection information...');

        const predefinedCount = Object.keys(this.predefinedConnections).length;
        if (predefinedCount > 0) {
            this.logger.info(`📦 Found ${predefinedCount} predefined database connection(s)`);
        }

        // Get source configuration
        const sourceConfig = await this.getDbConfig('source');

        // Get destination configuration
        const destinationConfig = await this.getDbConfig('destination');

        // Get migration options
        const { dropTarget, parallelProcesses } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'dropTarget',
                message: 'Drop destination database before migration?',
                default: false
            },
            {
                type: 'number',
                name: 'parallelProcesses',
                message: 'Number of parallel processes for dump/restore operations:',
                default: 3,
                validate: (input) => {
                    const num = parseInt(input);
                    if (isNaN(num) || num < 1 || num > 10) {
                        return 'Please enter a number between 1 and 10';
                    }
                    return true;
                }
            }
        ]);

        return {
            source: sourceConfig,
            destination: destinationConfig,
            options: {
                dropTarget,
                parallelProcesses: parseInt(parallelProcesses)
            }
        };
    }

    async getDbConfig(type) {
        const predefinedConnections = Object.keys(this.predefinedConnections);
        const hasPredefines = predefinedConnections.length > 0;

        let connectionMethod;

        if (hasPredefines) {
            const { method } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'method',
                    message: `Select ${type} database connection method:`,
                    choices: [
                        { name: '📋 Use predefined connection', value: 'predefined' },
                        { name: '✏️ Enter connection manually', value: 'manual' }
                    ]
                }
            ]);
            connectionMethod = method;
        } else {
            connectionMethod = 'manual';
            this.logger.info(`No predefined connections found. Using manual entry for ${type} database.`);
        }

        if (connectionMethod === 'predefined') {
            return await this.selectPredefinedConnection(type);
        } else {
            return await this.getManualConnection(type);
        }
    }

    async selectPredefinedConnection(type) {
        const connections = Object.values(this.predefinedConnections);

        const choices = connections.map(conn => ({
            name: `🔗 ${conn.name} (${this.maskConnectionString(conn.uri)})`,
            value: conn.name
        }));

        const { selectedConnection, database } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedConnection',
                message: `Select ${type} database connection:`,
                choices
            },
            {
                type: 'input',
                name: 'database',
                message: `Enter ${type} database name:`,
                validate: (input) => input.trim() !== '' || 'Database name is required'
            }
        ]);

        const connection = this.predefinedConnections[selectedConnection];

        return {
            uri: connection.uri,
            database: database.trim(),
            connectionName: selectedConnection
        };
    }

    async getManualConnection(type) {
        const { uri, database } = await inquirer.prompt([
            {
                type: 'input',
                name: 'uri',
                message: `Enter ${type} MongoDB connection URI:`,
                validate: (input) => this.validateMongoUri(input)
            },
            {
                type: 'input',
                name: 'database',
                message: `Enter ${type} database name:`,
                validate: (input) => input.trim() !== '' || 'Database name is required'
            }
        ]);

        return {
            uri: uri.trim(),
            database: database.trim(),
            connectionName: 'manual'
        };
    }

    maskConnectionString(uri) {
        return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    }

    validateMongoUri(uri) {
        const mongoUriPattern = /^mongodb(\+srv)?:\/\//;
        return mongoUriPattern.test(uri) || 'Please enter a valid MongoDB URI (mongodb:// or mongodb+srv://)';
    }

    async validateConnections(config) {
        this.logger.info('🔍 Validating database connections...');

        const spinner = ora('Testing source connection...').start();

        try {
            // Test source connection
            const sourceClient = new MongoClient(config.source.uri);
            await sourceClient.connect();
            await sourceClient.db(config.source.database).admin().ping();
            await sourceClient.close();
            spinner.succeed('Source connection validated');

            // Test destination connection
            spinner.start('Testing destination connection...');
            const destClient = new MongoClient(config.destination.uri);
            await destClient.connect();
            await destClient.db(config.destination.database).admin().ping();
            await destClient.close();
            spinner.succeed('Destination connection validated');

        } catch (error) {
            spinner.fail('Connection validation failed');
            throw new Error(`Connection error: ${error.message}`);
        }
    }

    async selectCollections(sourceConfig) {
        this.logger.info('📦 Fetching available collections...');

        const spinner = ora('Loading collections...').start();

        try {
            const client = new MongoClient(sourceConfig.uri);
            await client.connect();

            const db = client.db(sourceConfig.database);
            const collections = await db.listCollections().toArray();

            // Filter out system collections that shouldn't be migrated
            const userCollections = collections.filter(col => {
                const name = col.name;
                return !name.startsWith('system.') &&
                    !name.startsWith('fs.') &&
                    name !== 'oplog.rs' &&
                    name !== '__schema' &&
                    col.type === 'collection'; // Only include actual collections, not views
            });

            // Log excluded collections for transparency
            const excludedCollections = collections.filter(col => {
                const name = col.name;
                return name.startsWith('system.') ||
                    name.startsWith('fs.') ||
                    name === 'oplog.rs' ||
                    name === '__schema' ||
                    col.type !== 'collection';
            });

            const collectionNames = userCollections.map(col => col.name).sort();

            await client.close();
            spinner.succeed(`Found ${collectionNames.length} user collections (${excludedCollections.length} system collections excluded)`);

            if (excludedCollections.length > 0) {
                this.logger.info(`📋 Excluded system collections: ${excludedCollections.map(col => col.name).join(', ')}`);
            }

            if (collectionNames.length === 0) {
                throw new Error('No user collections found in source database');
            }

            // Use enhanced collection selector with "a" key support
            const selectedCollections = await this.selectCollectionsWithToggle(collectionNames);

            this.logger.info(`✅ Selected ${selectedCollections.length} collections: ${selectedCollections.join(', ')}`);

            return selectedCollections;

        } catch (error) {
            spinner.fail('Failed to fetch collections');
            throw error;
        }
    }

    async selectCollectionsWithToggle(collectionNames) {
        return new Promise((resolve, reject) => {
            let selectedCollections = new Set();
            let currentIndex = 0;
            let scrollOffset = 0;
            const maxVisibleItems = 15; // Maximum number of collections to show at once

            const renderCollections = () => {
                console.clear();
                console.log(chalk.cyan('\n📦 Select collections to migrate:\n'));
                console.log(chalk.yellow('Controls:'));
                console.log(chalk.white('  ↑/↓  - Navigate'));
                console.log(chalk.white('  Space - Toggle selection'));
                console.log(chalk.white('  a     - Toggle all collections'));
                console.log(chalk.white('  Enter - Confirm selection'));
                console.log(chalk.white('  q     - Quit'));
                console.log('');

                // Calculate scroll window
                const totalItems = collectionNames.length;
                const startIndex = scrollOffset;
                const endIndex = Math.min(startIndex + maxVisibleItems, totalItems);

                // Show scroll indicators if needed
                if (totalItems > maxVisibleItems) {
                    const currentPage = Math.floor(currentIndex / maxVisibleItems) + 1;
                    const totalPages = Math.ceil(totalItems / maxVisibleItems);
                    console.log(chalk.gray(`Page ${currentPage}/${totalPages} (${currentIndex + 1}/${totalItems})`));

                    if (startIndex > 0) {
                        console.log(chalk.gray('  ↑ More items above...'));
                    }
                }

                // Display visible collections
                for (let i = startIndex; i < endIndex; i++) {
                    const collection = collectionNames[i];
                    const isSelected = selectedCollections.has(collection);
                    const isCurrent = i === currentIndex;
                    const checkbox = isSelected ? '☑️' : '☐';
                    const pointer = isCurrent ? '▶' : ' ';
                    const nameColor = isSelected ? chalk.green : chalk.white;

                    console.log(`${pointer} ${checkbox} ${nameColor(`📄 ${collection}`)}`);
                }

                // Show scroll indicator for items below
                if (totalItems > maxVisibleItems && endIndex < totalItems) {
                    console.log(chalk.gray('  ↓ More items below...'));
                }

                console.log('');
                console.log(chalk.blue(`Selected: ${selectedCollections.size}/${collectionNames.length} collections`));
                if (selectedCollections.size > 0) {
                    const selectedList = Array.from(selectedCollections);
                    const displayList = selectedList.length > 5
                        ? `${selectedList.slice(0, 5).join(', ')}... (+${selectedList.length - 5} more)`
                        : selectedList.join(', ');
                    console.log(chalk.gray(`[${displayList}]`));
                }
            };

            const updateScrollOffset = () => {
                // Keep current item in view
                if (currentIndex < scrollOffset) {
                    scrollOffset = currentIndex;
                } else if (currentIndex >= scrollOffset + maxVisibleItems) {
                    scrollOffset = currentIndex - maxVisibleItems + 1;
                }
                // Ensure scroll offset is within bounds
                scrollOffset = Math.max(0, Math.min(scrollOffset, collectionNames.length - maxVisibleItems));
            };

            const cleanup = () => {
                // Restore terminal to normal mode
                if (process.stdin.isTTY && process.stdin.setRawMode) {
                    process.stdin.setRawMode(false);
                }
                process.stdin.removeAllListeners('data');
                process.stdin.removeAllListeners('keypress');

                // Pause stdin to reset it completely
                process.stdin.pause();
            };

            const handleKeypress = (str) => {
                if (str === '\u0003') { // Ctrl+C
                    cleanup();
                    reject(new Error('Selection cancelled by user'));
                    return;
                }

                // Handle raw input
                if (str === '\u001b[A') { // Up arrow
                    currentIndex = Math.max(0, currentIndex - 1);
                    updateScrollOffset();
                    renderCollections();
                } else if (str === '\u001b[B') { // Down arrow
                    currentIndex = Math.min(collectionNames.length - 1, currentIndex + 1);
                    updateScrollOffset();
                    renderCollections();
                } else if (str === ' ') { // Space
                    const collection = collectionNames[currentIndex];
                    if (selectedCollections.has(collection)) {
                        selectedCollections.delete(collection);
                    } else {
                        selectedCollections.add(collection);
                    }
                    renderCollections();
                } else if (str === 'a' || str === 'A') { // Toggle all
                    if (selectedCollections.size === collectionNames.length) {
                        // Unselect all
                        selectedCollections.clear();
                    } else {
                        // Select all
                        collectionNames.forEach(col => selectedCollections.add(col));
                    }
                    renderCollections();
                } else if (str === '\r' || str === '\n') { // Enter
                    if (selectedCollections.size === 0) {
                        console.log(chalk.red('\n❌ Please select at least one collection'));
                        setTimeout(() => renderCollections(), 1500);
                        return;
                    }
                    cleanup();
                    // Longer delay to ensure terminal is fully restored
                    setTimeout(() => {
                        resolve(Array.from(selectedCollections));
                    }, 200);
                    return;
                } else if (str === 'q' || str === 'Q') { // Quit
                    cleanup();
                    setTimeout(() => {
                        reject(new Error('Selection cancelled by user'));
                    }, 200);
                    return;
                }
            };

            // Set up raw mode for keypress detection
            if (process.stdin.isTTY && process.stdin.setRawMode) {
                process.stdin.setRawMode(true);
            }
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', handleKeypress);

            // Start the interface
            renderCollections();
        });
    }

    async confirmMigration(config, collections) {
        this.logger.info('📋 Migration Summary:');

        const sourceDisplay = config.source.connectionName === 'manual'
            ? this.maskConnectionString(config.source.uri)
            : `${config.source.connectionName} (${this.maskConnectionString(config.source.uri)})`;

        const destDisplay = config.destination.connectionName === 'manual'
            ? this.maskConnectionString(config.destination.uri)
            : `${config.destination.connectionName} (${this.maskConnectionString(config.destination.uri)})`;

        console.log(chalk.blue('  Source:'), chalk.white(sourceDisplay));
        console.log(chalk.blue('  Source DB:'), chalk.white(config.source.database));
        console.log(chalk.blue('  Destination:'), chalk.white(destDisplay));
        console.log(chalk.blue('  Destination DB:'), chalk.white(config.destination.database));
        console.log(chalk.blue('  Collections:'), chalk.white(collections.join(', ')));
        console.log(chalk.blue('  Drop target:'), chalk.white(config.options.dropTarget ? 'Yes' : 'No'));
        console.log(chalk.blue('  Parallel processes:'), chalk.white(config.options.parallelProcesses));

        this.logger.info('🤔 Waiting for user confirmation...');

        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Proceed with migration?',
                default: false
            }
        ]);

        this.logger.info(`📝 User response: ${confirmed ? 'Confirmed' : 'Cancelled'}`);

        return confirmed;
    }

    async performMigration(config, collections) {
        this.logger.info('🔄 Starting migration process...');
        this.logger.info(`⚡ Using ${config.options.parallelProcesses} parallel processes`);

        // Create temp directory
        await this.ensureTempDir();

        try {
            // Step 1: Dump data
            await this.dumpData(config.source, collections, config.options.parallelProcesses);

            // Step 2: Drop destination if requested
            if (config.options.dropTarget) {
                await this.dropDestinationDatabase(config.destination);
            }

            // Step 3: Restore data
            await this.restoreData(config.destination, collections, config.options.parallelProcesses);

        } catch (error) {
            throw new Error(`Migration failed: ${error.message}`);
        }
    }

    async ensureTempDir() {
        try {
            await fs.access(this.tempDir);
            // Directory exists, clean it
            await fs.rm(this.tempDir, { recursive: true, force: true });
        } catch {
            // Directory doesn't exist, that's fine
        }

        await fs.mkdir(this.tempDir, { recursive: true });
        this.logger.info(`📁 Created temporary directory: ${this.tempDir}`);
    }

    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    distributeCollections(collections, numWorkers) {
        const workers = Array.from({ length: numWorkers }, () => []);
        collections.forEach((collection, index) => {
            workers[index % numWorkers].push(collection);
        });
        return workers.filter(worker => worker.length > 0);
    }

    async dumpData(sourceConfig, collections, parallelProcesses = 3) {
        this.logger.info('📤 Starting data dump...');
        this.logger.info(`📊 Processing ${collections.length} collections with ${parallelProcesses} parallel processes`);

        const dumpPath = path.join(this.tempDir, 'dump');

        // Distribute collections among workers
        const workerCollections = this.distributeCollections(collections, parallelProcesses);
        const results = { successful: [], failed: [] };

        this.logger.info(`👥 Starting ${workerCollections.length} workers:`);
        workerCollections.forEach((collections, index) => {
            this.logger.info(`   Worker ${index + 1}: ${collections.length} collections [${collections.join(', ')}]`);
        });

        // Process workers in parallel
        const workerPromises = workerCollections.map(async (workerCollections, workerIndex) => {
            const workerId = workerIndex + 1;
            this.logger.info(`🔄 Worker ${workerId} started processing ${workerCollections.length} collections`);

            for (const collection of workerCollections) {
                this.logger.info(`📦 Worker ${workerId}: Starting dump of collection '${collection}'`);

                try {
                    const args = [
                        '--uri', sourceConfig.uri,
                        '--db', sourceConfig.database,
                        '--collection', collection,
                        '--out', dumpPath
                    ];

                    await this.executeCommand('mongodump', args);

                    results.successful.push(collection);
                    this.logger.success(`✅ Worker ${workerId}: Successfully dumped collection '${collection}'`);

                } catch (error) {
                    results.failed.push({ collection, error: error.message, worker: workerId });
                    this.logger.error(`❌ Worker ${workerId}: Failed to dump collection '${collection}': ${error.message}`);
                }
            }

            this.logger.info(`🏁 Worker ${workerId} completed processing ${workerCollections.length} collections`);
        });

        // Wait for all workers to complete
        await Promise.all(workerPromises);

        // Report final results
        this.logger.info(`📊 Dump Summary: ${results.successful.length} successful, ${results.failed.length} failed`);

        if (results.failed.length > 0) {
            this.logger.warn('⚠️ Failed collections:');
            results.failed.forEach(({ collection, error, worker }) => {
                this.logger.warn(`  - Worker ${worker}: ${collection} - ${error}`);
            });
            throw new Error(`Failed to dump ${results.failed.length} collections`);
        }
    }

    async dropDestinationDatabase(destConfig) {
        this.logger.info('🗑️ Dropping destination database...');

        const spinner = ora('Dropping destination database...').start();

        try {
            const client = new MongoClient(destConfig.uri);
            await client.connect();
            await client.db(destConfig.database).dropDatabase();
            await client.close();

            spinner.succeed('Destination database dropped');
            this.logger.success('✅ Destination database dropped successfully');

        } catch (error) {
            spinner.fail('Failed to drop destination database');
            throw new Error(`Failed to drop destination database: ${error.message}`);
        }
    }

    async restoreData(destConfig, collections, parallelProcesses = 3) {
        this.logger.info('📥 Starting data restore...');
        this.logger.info(`📊 Processing ${collections.length} collections with ${parallelProcesses} parallel processes`);

        const dumpPath = path.join(this.tempDir, 'dump');

        // Find the source database directory in the dump
        const dumpContents = await fs.readdir(dumpPath);
        const sourceDumpDir = dumpContents.find(dir => dir !== '.DS_Store');

        if (!sourceDumpDir) {
            throw new Error(`No database dump directory found in ${dumpPath}`);
        }

        // Distribute collections among workers
        const workerCollections = this.distributeCollections(collections, parallelProcesses);
        const results = { successful: [], failed: [] };

        this.logger.info(`👥 Starting ${workerCollections.length} workers:`);
        workerCollections.forEach((collections, index) => {
            this.logger.info(`   Worker ${index + 1}: ${collections.length} collections [${collections.join(', ')}]`);
        });

        // Process workers in parallel
        const workerPromises = workerCollections.map(async (workerCollections, workerIndex) => {
            const workerId = workerIndex + 1;
            this.logger.info(`🔄 Worker ${workerId} started processing ${workerCollections.length} collections`);

            for (const collection of workerCollections) {
                this.logger.info(`📦 Worker ${workerId}: Starting restore of collection '${collection}'`);

                try {
                    const collectionDumpPath = path.join(dumpPath, sourceDumpDir, `${collection}.bson`);

                    // Check if dump file exists
                    try {
                        await fs.access(collectionDumpPath);
                    } catch {
                        throw new Error(`Dump file not found: ${collectionDumpPath}`);
                    }

                    const args = [
                        '--uri', destConfig.uri,
                        '--db', destConfig.database,
                        '--collection', collection,
                        collectionDumpPath
                    ];

                    await this.executeCommand('mongorestore', args);

                    results.successful.push(collection);
                    this.logger.success(`✅ Worker ${workerId}: Successfully restored collection '${collection}'`);

                } catch (error) {
                    results.failed.push({ collection, error: error.message, worker: workerId });
                    this.logger.error(`❌ Worker ${workerId}: Failed to restore collection '${collection}': ${error.message}`);
                }
            }

            this.logger.info(`🏁 Worker ${workerId} completed processing ${workerCollections.length} collections`);
        });

        // Wait for all workers to complete
        await Promise.all(workerPromises);

        // Report final results
        this.logger.info(`📊 Restore Summary: ${results.successful.length} successful, ${results.failed.length} failed`);

        if (results.failed.length > 0) {
            this.logger.warn('⚠️ Failed collections:');
            results.failed.forEach(({ collection, error, worker }) => {
                this.logger.warn(`  - Worker ${worker}: ${collection} - ${error}`);
            });
            throw new Error(`Failed to restore ${results.failed.length} collections`);
        }
    }

    async executeCommand(command, args) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
                this.logger.debug(`${command} stdout: ${data.toString().trim()}`);
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
                this.logger.debug(`${command} stderr: ${data.toString().trim()}`);
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`${command} exited with code ${code}: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`Failed to start ${command}: ${error.message}`));
            });
        });
    }

    async cleanup() {
        try {
            await fs.rm(this.tempDir, { recursive: true, force: true });
            this.logger.info('🧹 Cleaned up temporary files');
        } catch (error) {
            this.logger.warn('⚠️ Failed to clean up temporary files:', error.message);
        }
    }
}

class Logger {
    constructor() {
        this.logLevel = 'info'; // debug, info, warn, error
    }

    getTimestamp() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    debug(message, ...args) {
        if (this.logLevel === 'debug') {
            console.log(chalk.gray(`[DEBUG] ${this.getTimestamp()} - ${message}`), ...args);
        }
    }

    info(message, ...args) {
        console.log(chalk.cyan(`[INFO]  ${this.getTimestamp()} - ${message}`), ...args);
    }

    success(message, ...args) {
        console.log(chalk.green(`[SUCCESS] ${this.getTimestamp()} - ${message}`), ...args);
    }

    warn(message, ...args) {
        console.log(chalk.yellow(`[WARN]  ${this.getTimestamp()} - ${message}`), ...args);
    }

    error(message, ...args) {
        console.log(chalk.red(`[ERROR] ${this.getTimestamp()} - ${message}`), ...args);
    }
}

// Main execution
async function main() {
    const migrationTool = new MongoMigrationTool();

    try {
        await migrationTool.run();
    } catch (error) {
        console.log(chalk.red('\n💥 Migration failed with error:'));
        console.log(chalk.red(error.message));
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n⚠️ Migration interrupted by user'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n⚠️ Migration terminated'));
    process.exit(0);
});

if (import.meta.main) {
    main();
}
