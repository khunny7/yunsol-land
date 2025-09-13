const aliases: Record<string, string> = {
  n: 'move', north: 'move',
  s: 'move', south: 'move',
  e: 'move', east: 'move',
  w: 'move', west: 'move',
  say: 'say'
};

export function parseCommand(raw: string) {
  const parts = raw.trim().split(/\s+/);
  const base = parts[0]?.toLowerCase() || '';
  const verb = aliases[base] || base;

  // Special case: if the base is a direction alias, treat it as a move command with the direction as the argument
  if (['n', 'north', 's', 'south', 'e', 'east', 'w', 'west'].includes(base)) {
    return { verb: 'move', args: [base], raw };
  }

  return { verb, args: parts.slice(1), raw };
}
