import { WeekPlan, DayPlan, DAY_NAMES } from '../types';

export function parseWeekPlan(markdown: string, weekDate: string): WeekPlan {
  const overview = extractSection(markdown, '# Week Overview', /^# /m);
  const notes = extractSection(markdown, '# Notes', /^# /m);
  const days = parseDays(markdown);

  return { weekDate, overview, days, notes };
}

function extractSection(
  markdown: string,
  heading: string,
  nextHeadingPattern: RegExp,
): string {
  const headingIndex = markdown.indexOf(heading);
  if (headingIndex === -1) return '';

  const afterHeading = markdown.slice(headingIndex + heading.length);
  const lines = afterHeading.split('\n');
  // Skip the heading line itself (empty string after split)
  const contentLines: string[] = [];
  let started = false;

  for (const line of lines) {
    if (!started) {
      started = true;
      if (line.trim() === '') continue;
    }
    // Stop at the next top-level heading
    if (started && nextHeadingPattern.test(line) && line.startsWith('# ')) {
      break;
    }
    contentLines.push(line);
  }

  return contentLines.join('\n').trim();
}

function parseDays(markdown: string): DayPlan[] {
  const days: DayPlan[] = [];

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    const heading = `## ${dayName}`;
    const headingIndex = markdown.indexOf(heading);

    if (headingIndex === -1) {
      days.push({ dayName, content: `*No plan for ${dayName}.*` });
      continue;
    }

    const afterHeading = markdown.slice(headingIndex + heading.length);

    // Find the next ## heading or end of daily breakdown section
    const nextDayMatch = afterHeading.search(/^## /m);
    const nextTopMatch = afterHeading.search(/^# /m);

    let endIndex: number;
    if (nextDayMatch > 0 && (nextTopMatch === -1 || nextDayMatch < nextTopMatch)) {
      endIndex = nextDayMatch;
    } else if (nextTopMatch > 0) {
      endIndex = nextTopMatch;
    } else {
      endIndex = afterHeading.length;
    }

    const content = afterHeading.slice(0, endIndex).trim();
    days.push({ dayName, content });
  }

  return days;
}

export function formatWeekLabel(weekDate: string): string {
  const date = new Date(weekDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
