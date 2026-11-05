// Les dates sont stockées en UTC, mais une journée de bourse se lit à l'heure de Paris.
const TIME_ZONE = "Europe/Paris";

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const time = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});
const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Clé AAAA-MM-JJ : se compare comme une chaîne et correspond aux champs date.
export function parisDay(date: string): string {
  return dayKey.format(new Date(date));
}

export function formatTime(date: string): string {
  return time.format(new Date(date));
}

export function formatDay(date: string): string {
  const label = dayLabel.format(new Date(date));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
