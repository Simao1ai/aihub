export function cronToHuman(cron: string | null | undefined): string {
  if (!cron) return 'On-demand only';
  
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  const days: Record<string, string> = {
    '0': 'Sunday', '1': 'Monday', '2': 'Tuesday',
    '3': 'Wednesday', '4': 'Thursday', '5': 'Friday', '6': 'Saturday',
  };

  const timeStr = () => {
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (dayOfWeek !== '*' && dayOfMonth === '*') {
    const dayName = days[dayOfWeek] ?? `Day ${dayOfWeek}`;
    return `Every ${dayName} at ${timeStr()}`;
  }

  if (dayOfMonth !== '*' && dayOfWeek === '*') {
    const suffix = ['th','st','nd','rd'][(parseInt(dayOfMonth,10) % 10)] ?? 'th';
    return `Monthly on the ${dayOfMonth}${suffix} at ${timeStr()}`;
  }

  if (dayOfMonth === '*' && dayOfWeek === '*') {
    return `Daily at ${timeStr()}`;
  }

  return cron;
}
