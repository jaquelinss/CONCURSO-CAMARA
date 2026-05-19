const raw = `{\n  "key": "value",\n  "key2": "value2"\n}`;
const sanitizeJSON = (r) => r.replace(/[\u0000-\u0019]+/g, '');
const sanitized = sanitizeJSON(raw);
console.log(sanitized);
console.log(JSON.parse(sanitized));
