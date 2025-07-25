import chalk from 'chalk';

// Test the improved parallel logging approach
class TestLogger {
    getTimestamp() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    info(message, ...args) {
        console.log(chalk.cyan(`[INFO]  ${this.getTimestamp()} - ${message}`), ...args);
    }

    success(message, ...args) {
        console.log(chalk.green(`[SUCCESS] ${this.getTimestamp()} - ${message}`), ...args);
    }

    error(message, ...args) {
        console.log(chalk.red(`[ERROR] ${this.getTimestamp()} - ${message}`), ...args);
    }
}

class TestMigration {
    constructor() {
        this.logger = new TestLogger();
    }

    distributeCollections(collections, numWorkers) {
        const workers = Array.from({ length: numWorkers }, () => []);
        collections.forEach((collection, index) => {
            workers[index % numWorkers].push(collection);
        });
        return workers.filter(worker => worker.length > 0);
    }

    async simulateWork(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    async testParallelLogging() {
        console.log(chalk.blue('🧪 Testing Parallel Worker Logging\n'));

        const collections = ['users', 'products', 'orders', 'categories', 'reviews', 'inventory'];
        const parallelProcesses = 3;

        this.logger.info('📤 Starting parallel processing simulation...');
        this.logger.info(`📊 Processing ${collections.length} collections with ${parallelProcesses} parallel processes`);

        // Distribute collections among workers
        const workerCollections = this.distributeCollections(collections, parallelProcesses);

        this.logger.info(`👥 Starting ${workerCollections.length} workers:`);
        workerCollections.forEach((collections, index) => {
            this.logger.info(`   Worker ${index + 1}: ${collections.length} collections [${collections.join(', ')}]`);
        });

        console.log(''); // Add spacing

        // Process workers in parallel
        const workerPromises = workerCollections.map(async (workerCollections, workerIndex) => {
            const workerId = workerIndex + 1;
            this.logger.info(`🔄 Worker ${workerId} started processing ${workerCollections.length} collections`);

            for (const collection of workerCollections) {
                this.logger.info(`📦 Worker ${workerId}: Starting processing of collection '${collection}'`);

                // Simulate work with random duration
                const duration = Math.random() * 1000 + 500; // 500-1500ms
                await this.simulateWork(duration);

                // Simulate occasional failure
                if (Math.random() < 0.1) { // 10% failure rate
                    this.logger.error(`❌ Worker ${workerId}: Failed to process collection '${collection}': Simulated error`);
                } else {
                    this.logger.success(`✅ Worker ${workerId}: Successfully processed collection '${collection}'`);
                }
            }

            this.logger.info(`🏁 Worker ${workerId} completed processing ${workerCollections.length} collections`);
        });

        // Wait for all workers to complete
        await Promise.all(workerPromises);

        console.log(''); // Add spacing
        this.logger.info('📊 All workers completed successfully!');
        console.log(chalk.green('\n✅ Parallel logging test completed!'));
    }
}

// Run test
const test = new TestMigration();
test.testParallelLogging();
