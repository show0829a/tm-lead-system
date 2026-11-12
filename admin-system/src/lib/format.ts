/**
 * Formats a phone number or masked phone number to standard Korean format.
 * Examples:
 *   '01033332222'     -> '010-3333-2222'
 *   '010-3333-2222'    -> '010-3333-2222'
 *   '010****2222'     -> '010-****-2222'
 *   '010-****-2222'   -> '010-****-2222'
 *   '0212345678'      -> '02-1234-5678'
 *   '021235678'       -> '02-123-5678'
 *   '0311234567'      -> '031-123-4567'
 *   '15881234'        -> '1588-1234'
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  // If already formatted properly with hyphens
  if (/^\d{2,4}-\d{3,4}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{2,4}-\*{3,4}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{4}$/.test(trimmed)) return trimmed;

  // Handle masked pattern like '010****1234'
  if (trimmed.includes('*')) {
    const clean = trimmed.replace(/[^0-9*]/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      if (clean.startsWith('02')) {
        return `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6)}`;
      }
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    return trimmed;
  }

  // Pure digits formatting
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  // If typing in progress (e.g. 4-7 digits)
  if (digits.length > 7 && digits.length < 11) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length > 3 && digits.length <= 7) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return digits;
}
