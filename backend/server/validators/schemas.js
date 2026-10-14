const { z } = require('zod');

// Standard 128-bit UUID format (8-4-4-4-12 hexadecimal)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Booking Creation Validation Schema
 * - room_id: valid UUID (8-4-4-4-12 hex)
 * - check_in_date: valid date string
 * - check_out_date: valid date string strictly after check_in_date
 * - payment_method: 'ONLINE' or 'PAY_AT_HOTEL'
 */
const createBookingSchema = z.object({
  room_id: z.string({ required_error: 'room_id is required' }).regex(UUID_REGEX, { message: 'room_id must be a valid UUID' }),
  check_in_date: z.string({ required_error: 'check_in_date is required' }).refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, { message: 'check_in_date must be a valid date string (YYYY-MM-DD)' }),
  check_out_date: z.string({ required_error: 'check_out_date is required' }).refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, { message: 'check_out_date must be a valid date string (YYYY-MM-DD)' }),
  payment_method: z.enum(['ONLINE', 'PAY_AT_HOTEL', 'KBZPAY', 'WAVEPAY', 'CARD', 'CB_PAY'], {
    errorMap: () => ({ message: "payment_method must be one of: 'ONLINE', 'PAY_AT_HOTEL', 'KBZPAY', 'WAVEPAY', 'CARD', 'CB_PAY'" })
  }).optional().default('ONLINE'),
  guest_name: z.string().min(1).optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  total_amount: z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).optional(),
  payment_status: z.enum(['PENDING', 'PAID', 'UNPAID']).optional()
}).refine((data) => {
  const checkIn = new Date(data.check_in_date);
  const checkOut = new Date(data.check_out_date);
  return checkOut.getTime() > checkIn.getTime();
}, {
  message: 'check_out_date must be strictly after check_in_date',
  path: ['check_out_date']
});

/**
 * Service Request Type Enum
 * Allowed types: TOWEL, TOWELS, CLEANING, MAINTENANCE, OTHER (with FOOD_BEVERAGE, AMENITIES supported)
 */
const serviceRequestTypeEnum = z.enum([
  'TOWEL',
  'TOWELS',
  'CLEANING',
  'MAINTENANCE',
  'OTHER',
  'FOOD_BEVERAGE',
  'AMENITIES'
], {
  errorMap: () => ({ message: "request_type must be one of: 'TOWEL', 'CLEANING', 'MAINTENANCE', 'OTHER'" })
});

/**
 * Service Request Creation Validation Schema
 * - room_id: valid UUID (or room_number: string)
 * - request_type: valid enum (TOWEL, CLEANING, MAINTENANCE, OTHER)
 */
const createServiceRequestSchema = z.object({
  room_id: z.string().regex(UUID_REGEX, { message: 'room_id must be a valid UUID' }).optional(),
  room_number: z.string().min(1).optional(),
  request_type: serviceRequestTypeEnum.optional(),
  category: serviceRequestTypeEnum.optional(),
  details: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'URGENT']).optional().default('NORMAL'),
  guest_name: z.string().optional(),
  booking_id: z.string().optional()
}).refine((data) => {
  return Boolean(data.room_id || data.room_number);
}, {
  message: 'Either room_id or room_number is required',
  path: ['room_id']
}).refine((data) => {
  return Boolean(data.request_type || data.category);
}, {
  message: 'request_type or category is required',
  path: ['request_type']
});

/**
 * Room Status Update Validation Schema
 * - status: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE'
 */
const updateRoomStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'], {
    errorMap: () => ({ message: "status must be one of: 'AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'" })
  })
});

/**
 * Service Request Status Progression Schema
 * - status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
 */
const updateServiceRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED'], {
    errorMap: () => ({ message: "status must be one of: 'PENDING', 'IN_PROGRESS', 'COMPLETED'" })
  }),
  assigned_to: z.string().nullable().optional()
});

/**
 * Payment Checkout Validation Schema
 */
const checkoutPaymentSchema = z.object({
  booking_id: z.string({ required_error: 'booking_id is required' }).min(1, { message: 'booking_id is required' }),
  provider: z.enum(['KBZPAY', 'VISA'], {
    errorMap: () => ({ message: "Invalid payment provider. Provider must be 'KBZPAY' or 'VISA'." })
  })
});

/**
 * QR Check-In Scan Validation Schema
 */
const scanQrCheckInSchema = z.object({
  qr_token: z.string({ required_error: 'QR token is required.' }).min(1, { message: 'QR token is required.' })
});

module.exports = {
  createBookingSchema,
  createServiceRequestSchema,
  updateRoomStatusSchema,
  updateServiceRequestStatusSchema,
  checkoutPaymentSchema,
  scanQrCheckInSchema,
  serviceRequestTypeEnum
};
