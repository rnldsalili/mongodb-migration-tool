# MongoDB Migration Tool - Usage Guide

## Quick Start

1. **Check Prerequisites**
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

### 3. Collection Selection
You can choose:
- **All collections**: Migrate everything in the database
- **Specific collections**: Select individual collections from a list

### 4. Migration Confirmation
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
