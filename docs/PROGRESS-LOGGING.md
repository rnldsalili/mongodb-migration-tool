# Progress Logging Features

The MongoDB Migration Tool now includes enhanced progress monitoring that captures and displays real-time progress information from `mongodump` and `mongorestore` operations.

## Enhanced Progress Features

### 📊 Document Count Tracking
Real-time tracking of processed documents:
```
[INFO]  2025-07-25 15:30:15 - 📊 Worker 1 (users): Processed 1000 documents
[INFO]  2025-07-25 15:30:20 - 📊 Worker 1 (users): Processed 2500 documents
[INFO]  2025-07-25 15:30:25 - 📊 Worker 1 (users): Processed 5000 documents
```

### 📈 Percentage Progress
Progress percentage updates (logged every 10% increment):
```
[INFO]  2025-07-25 15:30:15 - 📈 Worker 1 (users): Progress 10%
[INFO]  2025-07-25 15:30:30 - 📈 Worker 1 (users): Progress 25%
[INFO]  2025-07-25 15:30:45 - 📈 Worker 1 (users): Progress 50%
[INFO]  2025-07-25 15:31:00 - 📈 Worker 1 (users): Progress 75%
[INFO]  2025-07-25 15:31:15 - 📈 Worker 1 (users): Progress 100%
```

### ⏱️ Time-based Progress
Time estimates and progress indicators:
```
[INFO]  2025-07-25 15:30:15 - ⏱️ Worker 1 (users): [25%] progress
[INFO]  2025-07-25 15:30:30 - ⏱️ Worker 1 (users): [50%] progress
[INFO]  2025-07-25 15:30:45 - ⏱️ Worker 1 (users): [75%] progress
```

### ✅ Completion Status
Clear indication when operations complete:
```
[SUCCESS] 2025-07-25 15:31:20 - ✅ Worker 1 (users): Operation completed
[SUCCESS] 2025-07-25 15:31:20 - ✅ Worker 1: Successfully dumped collection 'users'
```

## Parallel Worker Progress

Each worker tracks progress independently:

```
[INFO]  2025-07-25 15:30:15 - 📊 Worker 1 (users): Processed 1000 documents
[INFO]  2025-07-25 15:30:15 - 📊 Worker 2 (orders): Processed 500 documents
[INFO]  2025-07-25 15:30:15 - 📊 Worker 3 (products): Processed 2000 documents
[INFO]  2025-07-25 15:30:20 - 📈 Worker 1 (users): Progress 25%
[INFO]  2025-07-25 15:30:22 - 📈 Worker 2 (orders): Progress 10%
[INFO]  2025-07-25 15:30:25 - 📈 Worker 3 (products): Progress 50%
```

## Benefits

1. **Real-time Feedback**: See exactly what's happening during long-running operations
2. **Progress Estimation**: Get a sense of how much work remains
3. **Worker Monitoring**: Track individual worker performance
4. **Issue Detection**: Quickly identify workers that may be stuck or slow
5. **Performance Insights**: Understand relative collection sizes and complexity

## Technical Implementation

- Progress is captured from MongoDB tool output (both stdout and stderr)
- Document counts are logged for every significant milestone
- Percentage progress is logged every 10% to avoid log spam
- Worker identification ensures clear attribution in parallel operations
- Verbose mode (`--verbose`) is automatically enabled for detailed progress

## Log Output Examples

### Dump Phase
```
[INFO]  2025-07-25 15:30:10 - 📤 Starting data dump...
[INFO]  2025-07-25 15:30:10 - 📊 Processing 5 collections with 3 parallel processes
[INFO]  2025-07-25 15:30:10 - 👥 Starting 3 workers:
[INFO]  2025-07-25 15:30:10 -    Worker 1: 2 collections [users, orders]
[INFO]  2025-07-25 15:30:10 -    Worker 2: 2 collections [products, categories]
[INFO]  2025-07-25 15:30:10 -    Worker 3: 1 collections [reviews]
[INFO]  2025-07-25 15:30:10 - 🔄 Worker 1 started processing 2 collections
[INFO]  2025-07-25 15:30:10 - 📦 Worker 1: Starting dump of collection 'users'
[INFO]  2025-07-25 15:30:15 - 📊 Worker 1 (users): Processed 1000 documents
[INFO]  2025-07-25 15:30:20 - 📈 Worker 1 (users): Progress 25%
[SUCCESS] 2025-07-25 15:30:45 - ✅ Worker 1 (users): Operation completed
[SUCCESS] 2025-07-25 15:30:45 - ✅ Worker 1: Successfully dumped collection 'users'
```

### Restore Phase
```
[INFO]  2025-07-25 15:31:00 - 📥 Starting data restore...
[INFO]  2025-07-25 15:31:00 - 📊 Processing 5 collections with 3 parallel processes
[INFO]  2025-07-25 15:31:05 - 📦 Worker 1: Starting restore of collection 'users'
[INFO]  2025-07-25 15:31:10 - 📊 Worker 1 (users): Processed 1000 documents
[INFO]  2025-07-25 15:31:15 - 📈 Worker 1 (users): Progress 50%
[SUCCESS] 2025-07-25 15:31:30 - ✅ Worker 1 (users): Operation completed
[SUCCESS] 2025-07-25 15:31:30 - ✅ Worker 1: Successfully restored collection 'users'
```
