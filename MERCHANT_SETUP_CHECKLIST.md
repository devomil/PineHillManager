# Clover Merchant Setup Checklist

## Merchant Locations Status

### ✅ Lake Geneva Retail
- **Merchant ID**: 2DWZED6B4ZVF1
- **Status**: ✅ Configured and Testing
- **API Token**: Configured with full Read/Write permissions
- **Location**: 704 West Main St, Lake Geneva, WI
- **Phone**: 526-183-056880

### ⏳ Lake Geneva HSA
- **Merchant ID**: WXJBYH2QT1S1
- **Status**: ⏳ Pending Setup
- **Location**: 704 W Main St, Lake Geneva, WI
- **Phone**: 526-182-568885
- **Next Steps**: Create API token with same permissions as Lake Geneva Retail

### ⏳ Pine Hill Farm (Main)
- **Merchant ID**: ZZJWY4T13W3H8
- **Status**: ⏳ Pending Setup
- **Location**: TBD
- **Next Steps**: Create API token, configure integration

### ⏳ Watertown Retail
- **Merchant ID**: QGFXZQXYG8M31
- **Status**: ⏳ Pending Setup
- **Location**: 200 West Main St, Watertown, WI
- **Phone**: 526-140-028881
- **Next Steps**: Create API token with same permissions

### ⏳ Watertown HSA
- **Merchant ID**: SM917VYCVDZH1
- **Status**: ⏳ Pending Setup
- **Location**: 200 W Main St, Watertown, WI
- **Phone**: 526-110-953886
- **Next Steps**: Create API token, configure HSA-specific settings

### ⏳ Pinehillfarm.co Online
- **Merchant ID**: 5H4F64FPMCQF1
- **Status**: ⏳ Pending Setup
- **Location**: 200 West Main St, Watertown, WI
- **Phone**: 526-108-805882
- **Next Steps**: Create API token, configure e-commerce integration

## Setup Process for Each Merchant

1. **Access Clover Dashboard** for specific merchant
2. **Navigate** to Setup → API Tokens
3. **Create Token** with name pattern: `PHmanager_[location]`
4. **Enable Permissions**:
   - ☑️ Customers (Read + Write)
   - ☑️ Employees (Read + Write)
   - ☑️ Inventory (Read + Write)
   - ☑️ Merchant (Read + Write)
   - ☑️ Orders (Read + Write)
   - ☑️ Payments (Read + Write)
5. **Save Token** and copy immediately
6. **Configure in Pine Hill Farm** Admin → Accounting → Integrations
7. **Test Connection** to verify setup
8. **Run Initial Sync** for historical data

## Integration Priority

1. **Lake Geneva Retail** ✅ (Complete)
2. **Watertown Retail** (High Priority - Main retail location)
3. **Pine Hill Farm Main** (Medium Priority - Primary business)
4. **Lake Geneva HSA** (Medium Priority - HSA transactions)
5. **Watertown HSA** (Medium Priority - HSA transactions)
6. **Online Store** (Low Priority - E-commerce backup)

Last Updated: July 31, 2025