import { spawn } from 'child_process';
import { promisify } from 'util';
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

            // Confirm migration
            const confirmed = await this.confirmMigration(config, collections);
            if (!confirmed) {
                this.logger.warn('Migration cancelled by user');
                return;
            }

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
        const { dropTarget } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'dropTarget',
                message: 'Drop destination database before migration?',
                default: false
            }
        ]);

        return {
            source: sourceConfig,
            destination: destinationConfig,
            options: {
                dropTarget
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
            const collectionNames = collections.map(col => col.name).sort();

            await client.close();
            spinner.succeed(`Found ${collectionNames.length} collections`);

            if (collectionNames.length === 0) {
                throw new Error('No collections found in source database');
            }

            const choices = [
                { name: '🔄 All collections', value: 'all' },
                new inquirer.Separator(),
                ...collectionNames.map(name => ({ name: `📄 ${name}`, value: name }))
            ];

            const { selectedCollections } = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'selectedCollections',
                    message: 'Select collections to migrate:',
                    choices,
                    validate: (input) => input.length > 0 || 'Please select at least one option'
                }
            ]);

            if (selectedCollections.includes('all')) {
                return collectionNames;
            }

            return selectedCollections;

        } catch (error) {
            spinner.fail('Failed to fetch collections');
            throw error;
        }
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

        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Proceed with migration?',
                default: false
            }
        ]);

        return confirmed;
    }

    async performMigration(config, collections) {
        this.logger.info('🔄 Starting migration process...');

        // Create temp directory
        await this.ensureTempDir();

        try {
            // Step 1: Dump data
            await this.dumpData(config.source, collections);

            // Step 2: Drop destination if requested
            if (config.options.dropTarget) {
                await this.dropDestinationDatabase(config.destination);
            }

            // Step 3: Restore data
            await this.restoreData(config.destination, collections);

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

    async dumpData(sourceConfig, collections) {
        this.logger.info('📤 Starting data dump...');

        const dumpPath = path.join(this.tempDir, 'dump');

        for (const collection of collections) {
            const spinner = ora(`Dumping collection: ${collection}`).start();

            try {
                const args = [
                    '--uri', sourceConfig.uri,
                    '--db', sourceConfig.database,
                    '--collection', collection,
                    '--out', dumpPath
                ];

                await this.executeCommand('mongodump', args);
                spinner.succeed(`Dumped: ${collection}`);

                this.logger.success(`✅ Successfully dumped collection: ${collection}`);

            } catch (error) {
                spinner.fail(`Failed to dump: ${collection}`);
                throw new Error(`Failed to dump collection ${collection}: ${error.message}`);
            }
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

    async restoreData(destConfig, collections) {
        this.logger.info('📥 Starting data restore...');

        const dumpPath = path.join(this.tempDir, 'dump');

        for (const collection of collections) {
            const spinner = ora(`Restoring collection: ${collection}`).start();

            try {
                // mongodump creates a directory structure: dump/<source_database_name>/<collection>.bson
                // We need to find the actual source database directory in the dump
                const dumpContents = await fs.readdir(dumpPath);
                const sourceDumpDir = dumpContents.find(dir => dir !== '.DS_Store'); // Get the first directory

                if (!sourceDumpDir) {
                    throw new Error(`No database dump directory found in ${dumpPath}`);
                }

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
                spinner.succeed(`Restored: ${collection}`);

                this.logger.success(`✅ Successfully restored collection: ${collection}`);

            } catch (error) {
                spinner.fail(`Failed to restore: ${collection}`);
                throw new Error(`Failed to restore collection ${collection}: ${error.message}`);
            }
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

    debug(message, ...args) {
        if (this.logLevel === 'debug') {
            console.log(chalk.gray(`[DEBUG] ${new Date().toISOString()} - ${message}`), ...args);
        }
    }

    info(message, ...args) {
        console.log(chalk.cyan(`[INFO] ${new Date().toISOString()} - ${message}`), ...args);
    }

    success(message, ...args) {
        console.log(chalk.green(`[SUCCESS] ${new Date().toISOString()} - ${message}`), ...args);
    }

    warn(message, ...args) {
        console.log(chalk.yellow(`[WARN] ${new Date().toISOString()} - ${message}`), ...args);
    }

    error(message, ...args) {
        console.log(chalk.red(`[ERROR] ${new Date().toISOString()} - ${message}`), ...args);
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
