#!/usr/bin/env node

import { spawn } from 'child_process';
import chalk from 'chalk';

function checkCommand(command) {
    return new Promise((resolve) => {
        const process = spawn(command, ['--version'], { stdio: 'pipe' });

        process.on('close', (code) => {
            resolve(code === 0);
        });

        process.on('error', () => {
            resolve(false);
        });
    });
}

async function checkPrerequisites() {
    console.log(chalk.blue('🔍 Checking prerequisites...\n'));

    // Check Bun
    const bunAvailable = await checkCommand('bun');
    console.log(chalk.blue('Bun.js:'), bunAvailable ? chalk.green('✅ Available') : chalk.red('❌ Not found'));

    // Check mongodump
    const mongodumpAvailable = await checkCommand('mongodump');
    console.log(chalk.blue('mongodump:'), mongodumpAvailable ? chalk.green('✅ Available') : chalk.red('❌ Not found'));

    // Check mongorestore
    const mongorestoreAvailable = await checkCommand('mongorestore');
    console.log(chalk.blue('mongorestore:'), mongorestoreAvailable ? chalk.green('✅ Available') : chalk.red('❌ Not found'));

    console.log('');

    if (!bunAvailable) {
        console.log(chalk.red('❌ Bun.js is required. Install from: https://bun.sh/'));
    }

    if (!mongodumpAvailable || !mongorestoreAvailable) {
        console.log(chalk.red('❌ MongoDB tools are required. Install MongoDB Database Tools:'));
        console.log(chalk.yellow('   https://www.mongodb.com/docs/database-tools/installation/'));
    }

    if (bunAvailable && mongodumpAvailable && mongorestoreAvailable) {
        console.log(chalk.green('✅ All prerequisites are available!'));
        console.log(chalk.blue('\nYou can now run the migration tool with:'));
        console.log(chalk.yellow('   bun run start'));
        return true;
    }

    return false;
}

checkPrerequisites();
