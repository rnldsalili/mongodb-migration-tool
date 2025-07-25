import chalk from 'chalk';
import inquirer from 'inquirer';

async function testInquirer() {
    console.log(chalk.blue('🧪 Testing Inquirer Prompt After Manual Terminal Manipulation\n'));

    // Simulate what our collection selector does to stdin
    console.log(chalk.cyan('Setting up raw mode...'));

    if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    // Now clean up like our collection selector does
    console.log(chalk.cyan('Cleaning up terminal state...'));

    if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
    }
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('keypress');
    process.stdin.pause();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log(chalk.cyan('Testing inquirer prompt...'));

    try {
        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Can you see and interact with this prompt?',
                default: false
            }
        ]);

        if (confirmed) {
            console.log(chalk.green('✅ Inquirer is working correctly!'));
        } else {
            console.log(chalk.yellow('⚠️ Inquirer is working, but you answered no.'));
        }

    } catch (error) {
        console.log(chalk.red('❌ Inquirer failed:'), error.message);
    }
}

testInquirer();
