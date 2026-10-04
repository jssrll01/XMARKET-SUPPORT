export function replaceVariables(text, vars = {}) {
  if (!text) return '';
  return text.replace(/{{\s*(\w+)\s*}}/g, (_, key) => vars[key] ?? '');
}
