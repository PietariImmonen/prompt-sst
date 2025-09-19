type MonthFormat = "short" | "long";

export function nameOfMonth(
  locale: string | string[] | undefined,
  month: number,
  format: MonthFormat = "long",
) {
  return new Intl.DateTimeFormat(locale, { month: format }).format(
    new Date(1970, month - 1, 1),
  );
}
