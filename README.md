# MongoDB Migration Tool

An interactive MongoDB migration tool built with Bun.js that uses `mongodump` and `mongorestore` to migrate data between databases with collection selection and comprehensive logging.

## Features

- 🔄 **Interactive CLI**: User-friendly prompts for configuration
- 🎯 **Selective Migration**: Choose specific collections or migrate all
- 🔗 **Flexible Connections**: Support for different source and destination connection strings
- ⚡ **Parallel Processing**: Configurable number of parallel dump/restore processes (1-10)
- 📊 **Detailed Logging**: Comprehensive progress tracking and error reporting
- 🛡️ **Connection Validation**: Verify connections before migration
- 🧹 **Automatic Cleanup**: Temporary files are cleaned up automatically
- 🚫 **Smart Filtering**: Automatically excludes system collections (system.*, fs.*, oplog.rs, etc.)
- ⚡ **Built with Bun.js**: Fast JavaScript runtime for optimal performance

## Prerequisites

- [Bun.js](https://bun.sh/) installed
- MongoDB tools (`mongodump` and `mongorestore`) installed and available in PATH
- Access to source and destination MongoDB instances

## Installation

1. Clone or download this project
2. Navigate to the project directory
3. Install dependencies:

```bash
bun install
```

4. **Set up predefined connections (optional):**
   - Copy `.env.example` to `.env`
   - Add your MongoDB connection strings following the pattern: `DB_<NAME>_URI=connection_string`

## Environment Configuration

You can define multiple database connections in a `.env` file for easy selection during migration. This eliminates the need to manually enter connection strings each time.

### Setting up .env file:

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your connections:
   ```env
   DB_LOCAL_URI=mongodb://localhost:27017
   DB_UAT_US_EAST_2_URI=mongodb://uat-user:uat-password@uat-server-us-east-2:27017
   DB_PROD_US_EAST_1_URI=mongodb+srv://prod-user:prod-password@prod-cluster-us-east-1.mongodb.net
   DB_PROD_US_WEST_2_URI=mongodb+srv://prod-user:prod-password@prod-cluster-us-west-2.mongodb.net
   ```

3. During migration, you can select from these predefined connections instead of typing them manually

### Available Environment Templates:
- **LOCAL**: Local development MongoDB instance
- **UAT-US-EAST-2**: User Acceptance Testing environment in US East 2 region
- **PROD-US-EAST-1**: Production environment in US East 1 region
- **PROD-US-WEST-2**: Production environment in US West 2 region

## Usage

Run the migration tool:

```bash
bun run start
```

Or:

```bash
bun run migrate
```

### Interactive Process

The tool will guide you through the migration process:

1. **Connection Configuration**
   - Source MongoDB URI or predefined connection
   - Source database name
   - Destination MongoDB URI or predefined connection
   - Destination database name
   - Option to drop destination database
   - Number of parallel processes (1-10, default: 3)

2. **Collection Selection**
   - View all available collections (sorted alphabetically)
   - Interactive selection with navigation (↑/↓)
   - Toggle individual collections (Space)
   - Toggle all collections at once (a key)
   - Visual indicators for selected collections

3. **Migration Confirmation**
   - Review migration summary including parallel processes
   - Confirm to proceed

4. **Migration Execution**
   - Parallel data dump from source
   - Optional destination database drop
   - Parallel data restore to destination
   - Progress tracking and logging with worker identification

## Connection String Examples

```
# Local MongoDB
mongodb://localhost:27017

# MongoDB with authentication
mongodb://username:password@localhost:27017

# MongoDB Atlas
mongodb+srv://username:password@cluster.mongodb.net

# MongoDB with specific options
mongodb://localhost:27017/?authSource=admin
```

## Logging

The tool provides comprehensive logging with different levels and parallel worker tracking:

- **DEBUG**: Detailed command output and execution info
- **INFO**: General progress information and worker status
- **SUCCESS**: Successful operation confirmations with worker identification
- **WARN**: Warning messages
- **ERROR**: Error messages and failures with worker identification

### Parallel Processing Logs
- **Worker Assignment**: Shows which collections are assigned to each worker
- **Worker Status**: Real-time updates from each worker
- **Progress Tracking**: Individual collection processing status per worker
- **Summary Reports**: Detailed success/failure counts after each phase

All logs include timestamps for precise tracking of migration progress.

## Documentation

Additional documentation is available in the `docs/` folder:

- [`docs/USAGE.md`](docs/USAGE.md) - Detailed usage instructions and examples
- [`docs/COLLECTION-SELECTOR.md`](docs/COLLECTION-SELECTOR.md) - Collection selection interface guide
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md) - Usage examples and common scenarios
- [`docs/PARALLEL-IMPROVEMENTS.md`](docs/PARALLEL-IMPROVEMENTS.md) - Parallel processing features

## Testing

Test files are available in the `tests/` folder:

```bash
# Run basic functionality test
bun run test

# Test parallel processing simulation
bun run test-parallel

# Test enhanced collection selector
bun run test-selector
```

## Error Handling

- Connection validation before migration starts
- Graceful error handling with detailed error messages
- Automatic cleanup of temporary files
- Support for interruption (Ctrl+C) with cleanup

## Temporary Files

The tool creates a temporary directory (`temp-migration`) for storing dump files during migration. This directory is automatically cleaned up after migration completion or failure.

## Safety Features

- Connection validation before proceeding
- Confirmation prompt before starting migration
- Optional destination database drop (disabled by default)
- Masked credentials in summary display
- **Smart collection filtering**: Automatically excludes system collections

### Excluded Collections

The tool automatically filters out system collections that shouldn't be migrated:

- **System collections**: `system.*` (system.views, system.users, etc.)
- **GridFS collections**: `fs.*` (fs.files, fs.chunks)
- **Replica set oplog**: `oplog.rs`
- **Schema collections**: `__schema`
- **Views**: Only actual collections are included, views are excluded

This prevents authorization errors and ensures only user data collections are migrated.

## Troubleshooting

### Common Issues

1. **MongoDB tools not found**
   - Ensure `mongodump` and `mongorestore` are installed
   - Add MongoDB tools to your system PATH

2. **Connection errors**
   - Verify connection strings are correct
   - Check network connectivity
   - Ensure authentication credentials are valid

3. **Permission errors**
   - Verify database user has necessary permissions
   - For source: read permissions
   - For destination: read/write permissions

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!
