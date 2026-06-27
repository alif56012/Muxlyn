export function extractArgs(...templates: string[]): string[] {
  const args = new Set<string>();
  for (const t of templates) {
    for (const m of t.matchAll(/\{\{(\w+)\}\}/g)) {
      if (m[1] !== 'url') args.add(m[1]);
    }
  }
  return [...args];
}

export function resolveTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function tryFormatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
