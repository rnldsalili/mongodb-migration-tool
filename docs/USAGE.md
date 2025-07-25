# MongoDB Migration Tool - Usage Guide

## Quick### 5. Migration Confirmation
Review the migration summary:
- Source and destination details (credentials are masked)
- Selected collections
- Drop target setting
- Number of parallel processes

### 6. Migration Execution
The tool will:
1. Create temporary directory for dump files
2. Dump selected collections from source database (in parallel)
3. Optionally drop destination database
4. Restore collections to destination database (in parallel)
5. Clean up temporary files

## Advanced Features

### Parallel Processing
The tool supports 1-10 parallel workers for dump and restore operations:
- **Worker Distribution**: Collections are evenly distributed among workers
- **Real-time Logging**: Each worker reports its progress individually
- **Worker Identification**: All logs include worker ID for easy tracking
- **Error Handling**: Failed collections are reported per worker with details
- **Summary Reports**: Detailed success/failure counts after each phase

Example parallel processing log output:
```
[INFO]  2025-07-25 11:36:09 - 👥 Starting 3 workers:
[INFO]  2025-07-25 11:36:09 -    Worker 1: 2 collections [users, categories]
[INFO]  2025-07-25 11:36:09 -    Worker 2: 2 collections [products, reviews]
[INFO]  2025-07-25 11:36:09 -    Worker 3: 2 collections [orders, inventory]
[INFO]  2025-07-25 11:36:09 - 🔄 Worker 1 started processing 2 collections
[SUCCESS] 2025-07-25 11:36:10 - ✅ Worker 1: Successfully processed collection 'users'
```

### Performance Recommendations
- **Small Collections (< 1GB each)**: Use 5-8 parallel processes
- **Large Collections (> 1GB each)**: Use 2-3 parallel processes
- **Mixed Sizes**: Use default 3 parallel processes
- **Limited Resources**: Use 1-2 parallel processesCheck Prerequisites**
   ```bash
   bun run check
   ```

2. **Run Migration Tool**
   ```bash
   bun run start
   ```

## Step-by-Step Migration Process

### 1. Prerequisites Check
Before starting, ensure you have:
- Bun.js installed and working
- MongoDB Database Tools (`mongodump` and `mongorestore`)
- Network access to both source and destination databases

### 2. Connection Configuration
The tool supports two methods for database configuration:

#### Method 1: Predefined Connections (Recommended)
If you have set up a `.env` file with predefined connections:
- Select "Use predefined connection"
- Choose from your configured database connections
- Enter the database name

#### Method 2: Manual Entry
- Select "Enter connection manually"
- **MongoDB URI**: Full connection string (e.g., `mongodb://localhost:27017`)
- **Database Name**: Name of the database

For both source and destination databases, you can mix and match methods (e.g., predefined source, manual destination).

### 3. Performance Configuration
Configure parallel processing for optimal performance:
- **Parallel Processes**: Choose 1-10 parallel workers (default: 3)
  - More workers = faster processing for many small collections
  - Fewer workers = better for large collections or limited resources
  - Recommended: 3-5 for most scenarios

### 4. Collection Selection
Enhanced interactive selection interface:
- **Navigation**: Use ↑/↓ arrow keys to move between collections
- **Individual Selection**: Press Space to toggle individual collections
- **Select/Unselect All**: Press "a" to toggle all collections at once
- **Visual Feedback**: Selected collections are highlighted in green with ☑️
- **Selection Counter**: Shows current selection count (e.g., "Selected: 3/8 collections")
- **Preview**: View selected collection names at the bottom

#### Selection Controls:
- `↑/↓` - Navigate up/down through collections
- `Space` - Toggle selection of current collection  
- `a` - Toggle all collections (select all if none/some selected, unselect all if all selected)
- `Enter` - Confirm selection and proceed
- `q` - Quit/cancel selection

Example interface:
```
📦 Select collections to migrate:

Controls:
  ↑/↓  - Navigate
  Space - Toggle selection  
  a     - Toggle all collections
  Enter - Confirm selection
  q     - Quit

▶ ☑️ 📄 analytics
  ☐ 📄 categories
  ☑️ 📄 inventory
  ☐ 📄 logs
  ☑️ 📄 orders
  ☐ 📄 products
  ☐ 📄 reviews
  ☐ 📄 users

Selected: 3/8 collections
[analytics, inventory, orders]
```

### 5. Migration Confirmation
Review the migration summary:
- Source and destination details (credentials are masked)
- Selected collections
- Drop target setting

### 5. Migration Execution
The tool will:
1. Create temporary directory for dump files
2. Dump selected collections from source database
3. Optionally drop destination database
4. Restore collections to destination database
5. Clean up temporary files

## Advanced Features

### Logging Levels
The tool provides detailed logging:
- **INFO**: General progress updates
- **SUCCESS**: Successful operations
- **WARN**: Warning messages
- **ERROR**: Error messages and failures
- **DEBUG**: Detailed command output (for troubleshooting)

### Error Handling
- Connection validation before starting
- Graceful error recovery
- Automatic cleanup on failure
- Detailed error messages for troubleshooting

### Safety Features
- Confirmation required before starting migration
- Connection testing before proceeding
- Optional destination database drop (disabled by default)
- Masked credentials in output for security

## Common Use Cases

### 1. Local to Production Migration
```
Source: mongodb://localhost:27017 (local_app)
Destination: mongodb+srv://user:pass@cluster.mongodb.net (prod_app)
Collections: Select specific business-critical collections
```

### 2. Environment Synchronization
```
Source: mongodb://dev-server:27017 (dev_db)
Destination: mongodb://staging-server:27017 (staging_db)  
Collections: All collections
Options: Drop destination database = Yes
```

### 3. Database Backup/Restore
```
Source: mongodb://prod-server:27017 (production)
Destination: mongodb://backup-server:27017 (backup_20250725)
Collections: All collections
```

### 4. Database Rename
```
Source: mongodb://localhost:27017 (old_name)
Destination: mongodb://localhost:27017 (new_name)
Collections: All collections
```

## Troubleshooting

### Connection Issues
- Verify connection strings are correct
- Check network connectivity
- Ensure authentication credentials are valid
- Test connections manually with mongo shell

### Permission Issues
- Source database: Requires read permissions
- Destination database: Requires read/write permissions
- For dropping databases: Requires admin permissions

### MongoDB Tools Issues
- Ensure `mongodump` and `mongorestore` are in PATH
- Verify MongoDB tools version compatibility
- Check if tools support your MongoDB version

### Performance Issues
- Monitor disk space during migration
- Consider network bandwidth between databases
- For large datasets, run during off-peak hours
- Test with smaller collections first

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use read-only users** for source database when possible
3. **Test migrations** on non-production data first
4. **Monitor migration logs** for any sensitive data exposure
5. **Clean up temporary files** (done automatically)

## Exit Codes

- `0`: Successful migration
- `1`: Migration failed with error
- `130`: User interrupted migration (Ctrl+C)

## Support

For issues or questions:
1. Check the logs for detailed error messages
2. Verify prerequisites with `bun run check`
3. Test basic functionality with `bun run test`
4. Review this guide and examples in `EXAMPLES.md`
