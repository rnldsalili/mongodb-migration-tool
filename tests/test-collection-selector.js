import chalk from 'chalk';
import readline from 'readline';

// Test the enhanced collection selector
class TestCollectionSelector {
    constructor() {
        this.logger = new TestLogger();
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

                // Resume stdin for normal operation
                process.stdin.resume();
                process.stdin.setEncoding('utf8');
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
                    // Small delay to ensure terminal is ready
                    setTimeout(() => {
                        resolve(Array.from(selectedCollections));
                    }, 50);
                    return;
                } else if (str === 'q' || str === 'Q') { // Quit
                    cleanup();
                    setTimeout(() => {
                        reject(new Error('Selection cancelled by user'));
                    }, 50);
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
    } async testCollectionSelection() {
        console.log(chalk.blue('🧪 Testing Enhanced Collection Selection with Scrolling\n'));

        const mockCollections = [
            'analytics', 'audit_logs', 'categories', 'comments', 'configurations',
            'customers', 'departments', 'documents', 'employees', 'events',
            'feedback', 'histories', 'images', 'inventory', 'invoices',
            'jobs', 'logs', 'messages', 'notifications', 'orders',
            'payments', 'permissions', 'products', 'projects', 'reports',
            'reviews', 'sessions', 'settings', 'statistics', 'tasks',
            'templates', 'transactions', 'uploads', 'users', 'workflows'
        ].sort();

        try {
            console.log(chalk.cyan(`📋 Mock collections available (${mockCollections.length} total):`));
            console.log(chalk.gray('The interface will show 15 collections at a time for easier navigation.'));
            mockCollections.forEach((col, index) => {
                if (index < 10) {
                    console.log(`  📄 ${col}`);
                } else if (index === 10) {
                    console.log(`  📄 ${col}`);
                    console.log(chalk.gray(`  ... and ${mockCollections.length - 11} more collections`));
                    return false;
                }
            });
            console.log('');

            const selectedCollections = await this.selectCollectionsWithToggle(mockCollections);

            console.log(chalk.green('\n✅ Collection selection completed!'));
            console.log(chalk.blue('Selected collections:'));
            selectedCollections.forEach(col => console.log(`  📄 ${col}`));

        } catch (error) {
            console.log(chalk.red('\n❌ Selection cancelled or failed:'), error.message);
        }
    }
}

class TestLogger {
    getTimestamp() {
        return new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    info(message) {
        console.log(chalk.cyan(`[INFO]  ${this.getTimestamp()} - ${message}`));
    }
}

// Run test
const test = new TestCollectionSelector();
test.testCollectionSelection();
