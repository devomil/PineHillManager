# Clover POS Integration Setup Guide

## Overview
This guide covers how to set up Clover POS API integration for multiple merchant locations. Pine Hill Farm currently has 6 merchant accounts across different locations.

## Current Merchant IDs

| Location | Merchant ID | Status |
|----------|-------------|---------|
| Lake Geneva Retail | 2DWZED6B4ZVF1 | ✅ Configured |
| Lake Geneva HSA | WXJBYH2QT1S1 | ⏳ Pending |
| Pine Hill Farm (Main) | ZZJWY4T13W3H8 | ⏳ Pending |
| Watertown Retail | QGFXZQXYG8M31 | ⏳ Pending |
| Watertown HSA | SM917VYCVDZH1 | ⏳ Pending |
| Pinehillfarm.co Online | 5H4F64FPMCQF1 | ⏳ Pending |

## API Token Setup Process

### For Each Merchant Account:

1. **Access Clover Dashboard**
   - Log into your Clover account
   - Select the specific merchant from the dropdown (e.g., "Lake Geneva Retail")
   - Navigate to Setup → API Tokens

2. **Create New API Token**
   - Click "Create new token"
   - Token name: Use format `PHmanager_[location]` (e.g., `PHmanager_lg`, `PHmanager_wt`)
   - Integration type: REST API

3. **Configure Permissions**
   Enable both **Read** AND **Write** permissions for:
   - ☑️ **Customers** (Read + Write)
   - ☑️ **Employees** (Read + Write)
   - ☑️ **Inventory** (Read + Write)
   - ☑️ **Merchant** (Read + Write)
   - ☑️ **Orders** (Read + Write)
   - ☑️ **Payments** (Read + Write)

4. **Save and Copy Token**
   - Click "Save" to generate the token
   - Copy the token immediately (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - Store securely - tokens cannot be viewed again after creation

## Integration Configuration

### In Pine Hill Farm Admin Panel:

1. **Navigate to Integrations**
   - Admin Dashboard → Accounting → Integrations
   - Select "Clover POS Integration"

2. **Configure Each Location**
   ```
   Environment: Production
   API URL: https://api.clover.com
   Merchant ID: [13-character merchant ID]
   API Token: [Token from Clover dashboard]
   ```

3. **Test Connection**
   - Click "Test Connection" to verify authentication
   - Should return merchant name and status

4. **Sync Sales Data**
   - Click "Sync Today's Sales" to pull transaction data
   - Data appears in Accounting Dashboard

## API Environment Details

### Production Environment (Current Setup)
- **API URL**: `https://api.clover.com`
- **Purpose**: Live business transactions
- **Data**: Real customer orders, payments, inventory
- **Recommended**: For operational business use

### Sandbox Environment (Development Only)
- **API URL**: `https://sandbox.dev.clover.com`
- **Purpose**: Testing and development
- **Data**: Mock transactions for testing
- **When to use**: Only during development phases

## Troubleshooting

### Common Issues:

1. **401 Unauthorized Error**
   - Check merchant ID matches token's merchant
   - Verify both Read AND Write permissions enabled
   - Confirm token hasn't expired

2. **403 Forbidden Error**
   - Missing required permissions
   - Re-check permission settings in Clover dashboard

3. **Empty Sales Data**
   - No transactions for selected date range
   - Check timezone settings (CST/CDT)
   - Verify merchant has processed sales

### Verification Steps:

1. **Test API Token**
   ```bash
   curl -X GET "https://api.clover.com/v3/merchants/[MERCHANT_ID]" \
        -H "Authorization: Bearer [API_TOKEN]" \
        -H "Accept: application/json"
   ```

2. **Expected Response**
   ```json
   {
     "id": "2DWZED6B4ZVF1",
     "name": "Lake Geneva- Retail",
     "href": "https://www.clover.com/v3/merchants/2DWZED6B4ZVF1"
   }
   ```

## Security Notes

- **Never share API tokens** with unauthorized parties
- **Regenerate tokens** if compromised
- **Use unique tokens** for each merchant location
- **Monitor token usage** through Clover dashboard

## Next Steps

1. Set up remaining 5 merchant locations using this process
2. Configure automatic daily sync schedules
3. Set up inventory tracking for each location
4. Enable customer data synchronization

## Support

For Clover API issues:
- Clover Developer Documentation: https://docs.clover.com/
- Pine Hill Farm IT Support: Contact Ryan

Last Updated: July 31, 2025