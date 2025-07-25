import chalk from 'chalk';

console.log(chalk.blue('🧪 MongoDB Migration Tool - Basic Test'));
console.log('');

// Test logging functionality
class TestLogger {
    info(message) {
        console.log(chalk.cyan(`[INFO] ${new Date().toISOString()} - ${message}`));
    }

    success(message) {
        console.log(chalk.green(`[SUCCESS] ${new Date().toISOString()} - ${message}`));
    }

    warn(message) {
        console.log(chalk.yellow(`[WARN] ${new Date().toISOString()} - ${message}`));
    }

    error(message) {
        console.log(chalk.red(`[ERROR] ${new Date().toISOString()} - ${message}`));
    }
}

const logger = new TestLogger();

console.log(chalk.blue('Testing logging functionality:'));
logger.info('This is an info message');
logger.success('This is a success message');
logger.warn('This is a warning message');
logger.error('This is an error message');

console.log('');
console.log(chalk.green('✅ Basic functionality test completed!'));
console.log(chalk.blue('Ready to run the migration tool with: bun run start'));
