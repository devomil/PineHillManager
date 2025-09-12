/**
 * Comprehensive Zod validation schemas for payroll endpoints
 * Ensures all payroll operations are properly validated before processing
 */

import { z } from "zod";
import { payrollLogger } from "./secure-logger";

// Common validation patterns
const dateString = z.string().refine((date) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, { message: "Invalid date format" });

const positiveNumber = z.number().positive("Must be a positive number");
const nonNegativeNumber = z.number().min(0, "Must be non-negative");

// Payroll Period Schemas
export const createPayrollPeriodSchema = z.object({
  startDate: dateString,
  endDate: dateString,
  payPeriodType: z.enum(['weekly', 'bi-weekly', 'monthly', 'semi-monthly']),
  description: z.string().max(500, "Description too long").optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return start < end;
}, { message: "Start date must be before end date", path: ["endDate"] });

export const updatePayrollPeriodSchema = z.object({
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  payPeriodType: z.enum(['weekly', 'bi-weekly', 'monthly', 'semi-monthly']).optional(),
  description: z.string().max(500, "Description too long").optional(),
  status: z.enum(['draft', 'calculated', 'approved', 'processed', 'paid']).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start < end;
  }
  return true;
}, { message: "Start date must be before end date", path: ["endDate"] });

// Payroll Calculation Schemas
export const calculatePayrollSchema = z.object({
  startDate: dateString,
  endDate: dateString,
  userId: z.string().uuid().optional(),
  includeOvertime: z.boolean().default(true),
  includeBenefits: z.boolean().default(true),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
  return daysDiff <= 366; // Maximum 1 year range
}, { message: "Date range cannot exceed 1 year", path: ["endDate"] });

export const calculateEmployeePayrollSchema = z.object({
  startDate: dateString,
  endDate: dateString,
  userId: z.string().uuid(), // Required for employee-specific calculations
  includeOvertime: z.boolean().default(true),
  includeBenefits: z.boolean().default(true),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
  return daysDiff <= 366; // Maximum 1 year range
}, { message: "Date range cannot exceed 1 year", path: ["endDate"] });

// Payroll Entry Schemas
export const createPayrollEntrySchema = z.object({
  payrollPeriodId: z.number().int().positive(),
  userId: z.string().uuid(),
  regularHours: nonNegativeNumber.max(168, "Cannot exceed 168 hours per week"), // Max hours per week
  overtimeHours: nonNegativeNumber.max(80, "Overtime hours seem excessive"),
  holidayHours: nonNegativeNumber.max(40, "Holiday hours seem excessive"),
  sickHours: nonNegativeNumber.max(40, "Sick hours seem excessive"),
  vacationHours: nonNegativeNumber.max(40, "Vacation hours seem excessive"),
  regularPay: nonNegativeNumber,
  overtimePay: nonNegativeNumber,
  holidayPay: nonNegativeNumber,
  sickPay: nonNegativeNumber,
  vacationPay: nonNegativeNumber,
  bonuses: nonNegativeNumber.default(0),
  commissions: nonNegativeNumber.default(0),
  deductions: nonNegativeNumber.default(0),
  grossPay: positiveNumber,
  netPay: positiveNumber,
  federalTax: nonNegativeNumber.default(0),
  stateTax: nonNegativeNumber.default(0),
  socialSecurityTax: nonNegativeNumber.default(0),
  medicareTax: nonNegativeNumber.default(0),
  status: z.enum(['draft', 'calculated', 'approved', 'processed']).default('draft'),
}).refine((data) => {
  return data.netPay <= data.grossPay;
}, { message: "Net pay cannot exceed gross pay", path: ["netPay"] });

export const updatePayrollEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  payrollPeriodId: z.number().int().positive().optional(),
  userId: z.string().uuid().optional(),
  regularHours: nonNegativeNumber.max(168, "Cannot exceed 168 hours per week").optional(),
  overtimeHours: nonNegativeNumber.max(80, "Overtime hours seem excessive").optional(),
  holidayHours: nonNegativeNumber.max(40, "Holiday hours seem excessive").optional(),
  sickHours: nonNegativeNumber.max(40, "Sick hours seem excessive").optional(),
  vacationHours: nonNegativeNumber.max(40, "Vacation hours seem excessive").optional(),
  regularPay: nonNegativeNumber.optional(),
  overtimePay: nonNegativeNumber.optional(),
  holidayPay: nonNegativeNumber.optional(),
  sickPay: nonNegativeNumber.optional(),
  vacationPay: nonNegativeNumber.optional(),
  bonuses: nonNegativeNumber.optional(),
  commissions: nonNegativeNumber.optional(),
  deductions: nonNegativeNumber.optional(),
  grossPay: positiveNumber.optional(),
  netPay: positiveNumber.optional(),
  federalTax: nonNegativeNumber.optional(),
  stateTax: nonNegativeNumber.optional(),
  socialSecurityTax: nonNegativeNumber.optional(),
  medicareTax: nonNegativeNumber.optional(),
  status: z.enum(['draft', 'calculated', 'approved', 'processed']).optional(),
}).refine((data) => {
  if (data.netPay && data.grossPay) {
    return data.netPay <= data.grossPay;
  }
  return true;
}, { message: "Net pay cannot exceed gross pay", path: ["netPay"] });

// Time Entry Processing Schemas
export const processTimeEntriesSchema = z.object({
  timeEntryIds: z.array(z.number().int().positive()).min(1, "At least one time entry ID required"),
  payrollEntryId: z.number().int().positive(),
  forceOverride: z.boolean().default(false),
});

// Query Parameter Schemas
export const payrollPeriodsQuerySchema = z.object({
  status: z.enum(['draft', 'calculated', 'approved', 'processed', 'paid']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const payrollEntriesQuerySchema = z.object({
  payrollPeriodId: z.coerce.number().int().positive().optional(),
  userId: z.string().uuid().optional(),
  status: z.enum(['draft', 'calculated', 'approved', 'processed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const unprocessedTimeEntriesQuerySchema = z.object({
  startDate: dateString,
  endDate: dateString,
  userId: z.string().uuid().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
  return daysDiff <= 93; // Maximum 3 months
}, { message: "Date range cannot exceed 3 months", path: ["endDate"] });

export const employeePayHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
});

// Analytics Schemas
export const payrollAnalyticsQuerySchema = z.object({
  startDate: dateString,
  endDate: dateString,
  departmentId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
  return daysDiff <= 366; // Maximum 1 year
}, { message: "Date range cannot exceed 1 year", path: ["endDate"] });

// Authorization Helpers
export function validatePayrollAccess(userRole: string, userId: string, targetUserId?: string): {
  isAuthorized: boolean;
  reason?: string;
} {
  // Admin and managers have full access
  if (['admin', 'manager'].includes(userRole)) {
    return { isAuthorized: true };
  }

  // Regular users can only access their own payroll data
  if (targetUserId && userId === targetUserId) {
    return { isAuthorized: true };
  }

  // Deny access otherwise
  return { 
    isAuthorized: false, 
    reason: 'Insufficient permissions to access payroll data' 
  };
}

// Validation Middleware Factory
export function createPayrollValidation<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        payrollLogger.warn('Payroll validation failed', {
          path: req.path,
          method: req.method,
          errors: error.errors
        });
        
        return res.status(400).json({
          error: 'Invalid payroll data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      payrollLogger.error('Unexpected validation error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Validation error' });
    }
  };
}

// Query Parameter Validation Middleware Factory
export function createQueryValidation<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.validatedQuery = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        payrollLogger.warn('Query parameter validation failed', {
          path: req.path,
          method: req.method,
          errors: error.errors
        });
        
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      payrollLogger.error('Unexpected query validation error', error instanceof Error ? error : new Error(String(error)));
      return res.status(500).json({ error: 'Query validation error' });
    }
  };
}