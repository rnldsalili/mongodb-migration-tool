# Example Configuration

This file shows examples of different MongoDB connection strings and configurations you might use with the migration tool.

## Connection String Examples

### Local MongoDB (no authentication)
```
mongodb://localhost:27017
```

### Local MongoDB with authentication
```
mongodb://username:password@localhost:27017
```

### MongoDB Atlas (Cloud)
```
mongodb+srv://username:password@cluster0.abcdef.mongodb.net
```

### MongoDB with specific authentication database
```
mongodb://username:password@localhost:27017/?authSource=admin
```

### MongoDB with SSL
```
mongodb://username:password@localhost:27017/?ssl=true
```

### MongoDB replica set
```
mongodb://username:password@host1:27017,host2:27017,host3:27017/?replicaSet=myReplicaSet
```

## Migration Scenarios

### Scenario 1: Local to UAT Migration
- **Source**: `local` (mongodb://localhost:27017) (database: `local_app`)
- **Destination**: `uat-us-east-2` (database: `uat_app`)
- **Collections**: Select specific collections like `users`, `products`, `orders`

### Scenario 2: UAT to Production Migration
- **Source**: `uat-us-east-2` (database: `uat_database`)
- **Destination**: `prod-us-east-1` (database: `prod_database`)
- **Collections**: All collections
- **Options**: Drop destination database before migration

### Scenario 3: Production Cross-Region Sync
- **Source**: `prod-us-east-1` (database: `main_app`)
- **Destination**: `prod-us-west-2` (database: `main_app`)
- **Collections**: All collections

### Scenario 4: Local Development Setup
- **Source**: `prod-us-east-1` (database: `production_app`)
- **Destination**: `local` (database: `dev_app`)
- **Collections**: Select specific collections for development

## Security Notes

- Never commit connection strings with credentials to version control
- Use environment variables for sensitive information
- Consider using MongoDB connection string with limited permissions for migration
- Always test migrations on non-production data first

## Performance Tips

- For large databases, consider migrating during off-peak hours
- Test migration speed with a subset of collections first
- Monitor disk space on both source and destination systems
- Consider network bandwidth between source and destination
