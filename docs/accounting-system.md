# Pine Hill Farm Accounting System Documentation

## Overview
The accounting dashboard provides comprehensive financial management and reporting for Pine Hill Farm, integrating real-time data from multiple revenue sources including Clover POS locations and Amazon Store API.

**Current Status: ✅ PRODUCTION READY**

## System Architecture

### Data Sources & Integrations

#### Live Revenue Integrations
1. **Clover POS Locations** (5 active)
   - Lake Geneva Retail
   - Pinehillfarm.co Online  
   - Watertown HSA
   - Watertown Retail
   - Additional location configurations available

2. **Amazon Store Integration**
   - Seller ID: ASJ637RVXQTVI
   - Uses Financial Events API for revenue tracking
   - Rate limiting implemented (429 error handling)

3. **Data Flow Architecture**
   - Real-time API calls to external services
   - COGS calculations: 40% of revenue (configurable)
   - Gross profit: Revenue - COGS
   - Multi-location aggregation with location breakdown

### API Endpoints

#### Working Endpoints (✅ Confirmed Operational)
- `/api/accounting/analytics/cogs` - Cost of Goods Sold data
- `/api/accounting/analytics/multi-location` - Revenue across locations
- `/api/accounting/reports/expenses` - Expense reporting
- `/api/accounting/accounts` - Chart of accounts

#### Data Source Preferences
- **Primary COGS Source**: `analytics/cogs` API (reliable, live data)
- **Revenue Source**: `multi-location` API (real transaction data)
- **Avoid**: `profit-loss` endpoint (unreliable for COGS calculations)

## Page Structure & Features

### Tab Navigation
1. **Overview** - Main dashboard with key metrics
2. **Chart of Accounts** - Account management
3. **Transactions** - Transaction history
4. **Reports** - Financial reporting dashboard
5. **Revenue Analytics** - Revenue insights
6. **Integrations** - External service connections

### Overview Section Features
- **Today's Metrics**: Real-time revenue, COGS, gross profit
- **Monthly Business Intelligence**: MTD performance, projections
- **Cost of Goods Sold Analysis**: Detailed COGS breakdown
- **Location Performance**: Multi-location revenue tracking
- **Financial Goals**: Goal setting and tracking

### Reports Section Features
- **Financial Reports Dashboard**: Period-based reporting
- **Report Types**: Profit & Loss, Expense Detail, Revenue Breakdown
- **Date Range Selection**: Current month, last month, quarters, custom
- **Summary Cards**: Revenue, COGS, Gross Profit, Margins
- **Detailed P&L Statement**: Complete income statement view

## Recent Fixes & Improvements

### September 3, 2025 Updates
✅ **COGS Data Source Fix**: Fixed Reports tab showing $0.00 for Cost of Goods Sold
- **Issue**: Reports using broken `profit-loss` endpoint for COGS
- **Solution**: Connected Reports to working `analytics/cogs` API (same as Overview)
- **Impact**: All financial calculations now display real transaction data

✅ **Calculation Corrections**: 
- Gross Profit: Now calculated from live Revenue - COGS data
- Gross Margin: Accurate percentage based on real financial metrics
- Summary cards: All displaying meaningful data instead of $0.00

### September 2, 2025 Updates  
✅ **Monthly Business Intelligence Fix**: Resolved $0.00 display issues
- Fixed data source connections to use working `monthlyCogsData`
- Corrected JavaScript initialization errors causing white screens
- Connected all BI sections to display consistent live financial data

## Technical Implementation

### Key React Components
- `AccountingDashboard` - Main container component
- `ProfitLossReport` - P&L statement rendering
- `ExpenseDetailReport` - Expense breakdown
- `RevenueBreakdownReport` - Revenue analysis

### Data Management
- **TanStack Query** for API data fetching and caching
- **Real-time Updates** via useQuery hooks
- **Error Handling** for API failures and rate limits
- **Loading States** for all financial data sections

### API Integration Patterns
```javascript
// COGS Data (Working Pattern)
const { data: reportsCogsData } = useQuery({
  queryKey: ['/api/accounting/analytics/cogs', startDateStr, endDateStr],
  queryFn: async () => {
    const response = await apiRequest('GET', `/api/accounting/analytics/cogs?startDate=${startDateStr}&endDate=${endDateStr}`);
    return await response.json();
  },
});

// Revenue Data (Multi-location)
const { data: revenueData } = useQuery({
  queryKey: ['/api/accounting/analytics/multi-location', startDateStr, endDateStr],
  queryFn: async () => {
    const response = await apiRequest('GET', `/api/accounting/analytics/multi-location?startDate=${startDateStr}&endDate=${endDateStr}`);
    return await response.json();
  },
});
```

## Current Live Metrics (as of Sept 3, 2025)
- **Today's Revenue**: $548.18
- **Month-to-Date**: $5,522.43
- **Estimated COGS**: $2,208.97
- **Gross Profit**: $3,313.46
- **Active Locations**: 6 integrations (5 Clover + 1 Amazon)

## Integration Status

### Clover POS Integration
- **Status**: ✅ Fully Operational
- **Authentication**: API tokens configured
- **Rate Limits**: Handled appropriately
- **Data Quality**: High reliability, real-time updates

### Amazon Store Integration  
- **Status**: ✅ Operational with Rate Limiting
- **API Access**: Financial Events API working
- **Known Issues**: 429 rate limit errors (expected behavior)
- **Fallback**: Cached data used during rate limits

## Configuration & Environment

### Required Environment Variables
- Clover API tokens for each merchant location
- Amazon Seller API credentials
- Database connection for account management

### COGS Calculation Rules
- **Default Rate**: 40% of revenue
- **Calculation**: `totalCogs = totalRevenue * 0.4`
- **Gross Profit**: `grossProfit = totalRevenue - totalCogs`
- **Gross Margin**: `grossMargin = (grossProfit / totalRevenue) * 100`

## Known Limitations & Considerations

### Rate Limiting
- Amazon API has strict rate limits (expect 429 errors)
- System handles gracefully with fallback to cached data
- Clover APIs generally more reliable

### Data Consistency
- Real-time data may have slight delays
- Multi-location aggregation depends on individual API response times
- COGS calculations are estimated (40% rule) until more precise tracking implemented

### Performance Considerations
- Some queries can be slow (>1000ms) due to external API calls
- React Query caching helps reduce unnecessary API calls
- Consider implementing background data refresh for heavy usage

## Future Enhancements

### Planned Improvements
1. **Enhanced COGS Tracking**: Move from 40% estimate to actual cost tracking
2. **Additional Integrations**: QuickBooks, HSA providers, Thrive inventory
3. **Advanced Analytics**: Trend analysis, forecasting
4. **Export Functionality**: PDF reports, CSV downloads
5. **Automated Reconciliation**: Bank account integration

### Technical Debt
1. **TypeScript Types**: Add proper typing for financial data structures
2. **Error Boundaries**: Improve error handling for financial calculations
3. **Performance Optimization**: Implement data virtualization for large datasets
4. **Testing**: Add comprehensive unit tests for financial calculations

## Troubleshooting Guide

### Common Issues

#### COGS Showing $0.00
- **Cause**: Using wrong API endpoint (`profit-loss` instead of `analytics/cogs`)
- **Solution**: Ensure components use `analytics/cogs` endpoint
- **Status**: ✅ Fixed in Reports section

#### Revenue Data Missing
- **Cause**: API integration failures or rate limiting
- **Check**: Network tab for API response codes
- **Solution**: Verify API credentials and rate limit handling

#### Calculation Errors
- **Cause**: Data type mismatches (string vs number)
- **Solution**: Use `parseFloat()` for all financial calculations
- **Pattern**: `const amount = parseFloat(data.value || '0')`

### Development Guidelines

#### Adding New Financial Metrics
1. Use `analytics/cogs` pattern for reliable data
2. Implement proper loading states
3. Add error handling for API failures
4. Include fallback values (`|| 0` or `|| '0.00'`)

#### API Integration Best Practices
1. Always use TanStack Query for data fetching
2. Implement proper cache invalidation
3. Handle rate limits gracefully
4. Log API calls for debugging

## File Locations

### Primary Components
- `client/src/pages/accounting-dashboard.tsx` - Main dashboard component
- `server/routes.ts` - API endpoint definitions
- `server/integrations/` - External service integrations

### Supporting Files
- `client/src/components/revenue-analytics.tsx` - Analytics components
- `shared/schema.ts` - Data type definitions
- `server/storage.ts` - Data persistence layer

---

**Last Updated**: September 3, 2025  
**System Status**: Production Ready  
**Next Review**: When adding new integrations or major features