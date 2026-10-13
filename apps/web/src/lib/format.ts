const rupiahFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export function formatRupiah(value: number | null | undefined): string {
  return value == null ? '' : rupiahFormatter.format(value);
}

export function formatRupiahDisplay(value: number | null | undefined): string {
  return value == null || value === 0 ? '' : `Rp ${rupiahFormatter.format(value)}`;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  OPERATOR: 'Operator',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

const WIB_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** dd/MM/yy HH:mm:ss dalam zona Asia/Jakarta (WIB). */
export function formatDateTimeWib(value: string | Date): string {
  const parts = WIB_DATE_TIME_FORMATTER.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((piece) => piece.type === type)?.value ?? '00';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}:${part('second')}`;
}
