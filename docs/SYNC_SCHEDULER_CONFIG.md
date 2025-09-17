# Sync Scheduler Configuration

## Overview

The Sync Scheduler provides automated background synchronization of Clover order data to keep your system up-to-date without manual intervention. It includes smart scheduling logic, business hours awareness, and comprehensive admin controls.

## Environment Variables

Configure the sync scheduler behavior using these environment variables in your `.env` file:

```bash
# Sync Scheduler Configuration
AUTO_SYNC_ENABLED=true                    # Enable/disable automatic syncing (default: false)
INCREMENTAL_SYNC_INTERVAL_MINUTES=15      # Minutes between incremental syncs (default: 15)
FULL_SYNC_HOUR=3                          # Hour for daily full sync, 24-hour format (default: 3 = 3 AM)
BUSINESS_START_HOUR=6                     # Business hours start, 24-hour format (default: 6 = 6 AM)
BUSINESS_END_HOUR=22                      # Business hours end, 24-hour format (default: 22 = 10 PM)
BUSINESS_TIMEZONE=America/Chicago         # Timezone for business hours (default: America/Chicago)
SKIP_WEEKEND_SYNC=false                   # Skip syncs on weekends (default: false)
```

## Scheduling Behavior

### Incremental Syncs
- **Frequency**: Every 15 minutes (configurable via `INCREMENTAL_SYNC_INTERVAL_MINUTES`)
- **When**: Only during business hours (6 AM - 10 PM CST by default)
- **Purpose**: Keep data current throughout the business day
- **Scope**: Syncs only recent changes since last sync

### Full Daily Syncs
- **Frequency**: Once per day
- **When**: 3 AM CST by default (configurable via `FULL_SYNC_HOUR`)
- **Purpose**: Comprehensive sync to catch any missed data
- **Scope**: Full data refresh for all merchants

### Smart Scheduling Rules
1. **Conflict Prevention**: Won't start if another sync is already running
2. **Business Hours**: Incremental syncs only during business hours
3. **Weekend Handling**: Optional weekend skip functionality
4. **Timezone Awareness**: All scheduling respects configured timezone

## Admin API Endpoints

All endpoints require admin authentication.

### Get Scheduler Status
```http
GET /api/sync/scheduler/status
```

**Response:**
```json
{
  "scheduler": {
    "isRunning": true,
    "config": {
      "enabled": true,
      "incrementalIntervalMinutes": 15,
      "fullSyncHour": 3,
      "businessStartHour": 6,
      "businessEndHour": 22,
      "timezone": "America/Chicago",
      "skipWeekends": false
    },
    "lastFullSyncDate": "2025-09-17",
    "cloverSyncRunning": false,
    "nextIncrementalSync": "2025-09-17T20:15:00.000Z",
    "businessHoursActive": true
  },
  "cloverSyncService": {
    "isRunning": false
  },
  "timestamp": "2025-09-17T20:00:00.000Z"
}
```

### Start Scheduler
```http
POST /api/sync/scheduler/start
```

### Stop Scheduler
```http
POST /api/sync/scheduler/stop
```

### Update Configuration
```http
PATCH /api/sync/scheduler/config
Content-Type: application/json

{
  "enabled": true,
  "incrementalIntervalMinutes": 20,
  "businessStartHour": 7,
  "businessEndHour": 21
}
```

### Manual Sync Trigger
```http
POST /api/sync/scheduler/trigger
Content-Type: application/json

{
  "type": "incremental"  // or "full"
}
```

## Logging

The scheduler provides detailed logging for monitoring and debugging:

### Startup Logs
```
🚀 Starting automatic sync scheduler
📋 Config: Incremental every 15min, Full sync at 3:00, Business hours: 6:00-22:00 America/Chicago
⏰ Scheduled incremental syncs every 15 minutes
⏰ Scheduled daily sync checks (full sync at 3:00)
```

### Sync Execution Logs
```
🔄 Starting scheduled incremental sync (incremental) at 9/17/2025, 2:30:00 PM America/Chicago
✅ Scheduled incremental sync completed: 45 orders processed across 5 merchants in 1250ms avg
📊 Sync Stats [incremental/incremental]: { merchants: 5, orders: 45, errors: 0, duration: "1250ms" }
```

### Skip Conditions
```
⏭️ Skipping incremental sync - another sync is already in progress
🕐 Skipping incremental sync - outside business hours (6:00-22:00 America/Chicago)
```

## Integration with Existing Systems

### Compatibility
- **Manual Syncs**: Background scheduler works alongside existing manual sync endpoints
- **Conflict Avoidance**: Uses `CloverSyncService.isRunningSync()` to prevent conflicts
- **Same Service**: Uses the same `CloverSyncService` as manual syncs for consistency

### Performance Considerations
- **Rate Limiting**: Built-in 100ms delays between API batches
- **Business Hours**: Reduces load during off-hours
- **Incremental Updates**: Only syncs recent changes during business hours

## Monitoring and Troubleshooting

### Health Checks
Use the status endpoint to monitor scheduler health:
- `isRunning`: Scheduler is actively running
- `cloverSyncRunning`: No sync conflict
- `businessHoursActive`: Within configured business hours
- `nextIncrementalSync`: When next sync is scheduled

### Common Issues
1. **Scheduler Not Starting**: Check `AUTO_SYNC_ENABLED=true` in environment
2. **No Syncs Running**: Verify business hours configuration
3. **Sync Conflicts**: Check if manual syncs are running via status endpoint
4. **Timezone Issues**: Verify `BUSINESS_TIMEZONE` matches your location

### Performance Monitoring
- Monitor sync completion times in logs
- Watch for error counts in sync statistics
- Use `/api/sync/clover/stats` for overall sync health

## Security

- All scheduler endpoints require admin authentication
- Environment variables should be kept secure
- Consider rotating API tokens regularly
- Monitor logs for unusual activity

## Best Practices

1. **Environment Configuration**: Always use environment variables for configuration
2. **Business Hours**: Set appropriate business hours for your timezone
3. **Monitoring**: Regularly check scheduler status and logs
4. **Maintenance Windows**: Use off-hours for full syncs
5. **Testing**: Test configuration changes in development first

## Migration from Manual Syncs

The scheduler is designed to coexist with existing manual sync processes:

1. Enable the scheduler: `AUTO_SYNC_ENABLED=true`
2. Configure appropriate intervals and business hours
3. Monitor initial performance
4. Gradually reduce manual sync frequency
5. Maintain manual sync capability for emergency use

## Support

For issues with the sync scheduler:
1. Check the scheduler status endpoint
2. Review application logs for error messages
3. Verify environment configuration
4. Test with manual sync endpoints to isolate issues