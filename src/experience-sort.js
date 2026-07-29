const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** Parse "February 2026", "Present", "3/2021", or "2021" into a sortable month/year. */
export function parseMonthYear(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^(present|current)$/i.test(text)) {
    return { year: 9999, month: 12, present: true };
  }

  const named = text.match(/^([A-Za-z]+)\.?\s+(\d{4})$/);
  if (named) {
    const month = MONTHS[named[1].toLowerCase()];
    if (month) return { year: Number(named[2]), month };
  }

  const slash = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return { year: Number(slash[2]), month: Number(slash[1]) };

  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) return { year: Number(yearOnly[1]), month: 12 };

  return null;
}

function experienceSortScore(entry) {
  const end = parseMonthYear(entry?.end) || parseMonthYear(entry?.start);
  const start = parseMonthYear(entry?.start) || end;
  if (!end && !start) return 0;
  const endScore = end ? end.year * 12 + end.month : 0;
  const startScore = start ? start.year * 12 + start.month : 0;
  return endScore * 1000 + startScore;
}

/** Reverse chronological order — most recent role first. */
export function sortExperienceChronologically(experience) {
  if (!Array.isArray(experience)) return experience;
  return [...experience].sort((a, b) => experienceSortScore(b) - experienceSortScore(a));
}
