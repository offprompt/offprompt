const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escapes every character that could close an attribute or open a tag. */
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ENTITIES[character] ?? character)
