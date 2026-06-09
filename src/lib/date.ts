export function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function displayDate(value: string): string {
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

