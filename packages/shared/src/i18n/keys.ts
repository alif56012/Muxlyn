import type { Locale } from '../types';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    'health.ok': 'Server is running',
    'health.ready': 'Service is ready',
    'health.live': 'Service is live',
    'auth.unauthorized': 'Not authenticated',
    'auth.session_expired': 'Session expired',
    'auth.oauth_error': 'Google authentication failed',
    'error.validation': 'Validation error',
    'error.not_found': 'Route not found',
    'error.service_unavailable': 'Database unavailable',
    'error.internal': 'Unexpected error',
  },
  th: {
    'health.ok': 'เซิร์ฟเวอร์ทำงานปกติ',
    'health.ready': 'บริการพร้อมใช้งาน',
    'health.live': 'บริการยังคงทำงาน',
    'auth.unauthorized': 'ไม่ได้เข้าสู่ระบบ',
    'auth.session_expired': 'เซสชันหมดอายุ',
    'auth.oauth_error': 'การยืนยันตัวตน Google ล้มเหลว',
    'error.validation': 'ข้อมูลไม่ถูกต้อง',
    'error.not_found': 'ไม่พบเส้นทางที่ระบุ',
    'error.service_unavailable': 'ฐานข้อมูลไม่พร้อมใช้งาน',
    'error.internal': 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
  },
};
