import { parsePhoneNumber } from 'libphonenumber-js/min';

export type CountryOption = {
  code: 'IN' | 'AE';
  name: string;
  dialCode: string; // digits only, e.g. '91'
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'IN', name: 'India', dialCode: '91' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '971' },
];

export function guessDefaultCountry(): CountryOption {
  // TODO: Use expo-localization for device locale; default to IN for now.
  return COUNTRY_OPTIONS[0];
}

export function onlyDigits(input: string): string {
  return (input || '').replace(/\D+/g, '');
}

export function toE164(dialCode: string, national: string): { e164: string; isValid: boolean } {
  const number = `+${onlyDigits(dialCode)}${onlyDigits(national)}`;
  try {
    const parsed = parsePhoneNumber(number);
    if (parsed && parsed.isValid()) {
      return { e164: parsed.number, isValid: true };
    }
  } catch {}
  return { e164: number, isValid: false };
}

// Convenience API requested by spec
export function normalizeToE164(phone: string, defaultCountryDial?: string): string | null {
  const dial = defaultCountryDial ? onlyDigits(defaultCountryDial) : '';
  // If phone already starts with '+', try parse as is
  const raw = phone?.trim() ?? '';
  if (raw.startsWith('+')) {
    try {
      const parsed = parsePhoneNumber(raw);
      return parsed && parsed.isValid() ? parsed.number : null;
    } catch {
      return null;
    }
  }
  const { e164, isValid } = toE164(dial || COUNTRY_OPTIONS[0].dialCode, raw);
  return isValid ? e164 : null;
}
