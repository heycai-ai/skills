// Content rules shared by the HeyCAi skills and the .well-known catalog builder.

export const ENTITY_EN =
  "HeyCAi is an AI receptionist for health clinics: it answers calls and WhatsApp messages and books appointments in the clinic's practice software.";
export const ENTITY_ES =
  'HeyCAi es una recepcionista con IA para clínicas de salud: contesta las llamadas y los mensajes de WhatsApp y reserva las citas en el programa de gestión de la clínica.';

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;

// Reads a SKILL.md: one `key: value` line per frontmatter key, the value quoted or not.
export function parseSkill(markdown) {
  const match = FRONTMATTER.exec(markdown);
  if (!match) throw new Error('SKILL.md has no frontmatter');
  const fields = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([\w-]+):\s*(.*?)\s*$/.exec(line);
    if (!kv) continue;
    const quoted = /^(["'])(.*)\1$/.exec(kv[2]);
    fields[kv[1]] = quoted ? quoted[2] : kv[2];
  }
  for (const key of ['name', 'description']) {
    if (!fields[key]) throw new Error(`SKILL.md frontmatter is missing "${key}"`);
  }
  return {
    name: fields.name,
    description: fields.description,
    body: markdown.slice(match[0].length).replace(/^\n+/, ''),
  };
}

// The part skills.sh shows before "Show more": the body up to (not including) the first "\n## ".
export function leadOf(body) {
  const end = body.indexOf('\n## ');
  return end === -1 ? body : body.slice(0, end);
}

const CANONICAL_ORIGIN = 'https://www.heycai.ai';
// The install command of the website channel is not a link.
const INSTALL_COMMAND = /skills add https:\/\/heycai\.ai(?![\w/-])/g;
const QUIROADS_FIGURE = /\b70\s?\+|\b(?:more than|over|más de)\s+70\b|\b30[,.]000\b/i;

// Copied verbatim from DENYLIST in tests/dist/_claims.ts of the www repo (thekairoslabs/cai-website),
// so a skill breaks none of the site's hard rules. Like www, they read the text with whitespace squashed.
const SET_UP_FEE = [
  /(?:sin|no hay|cero|ninguna?)\s+(?:cuota|coste|costo|gastos?|tarifa|pago|comisi[oó]n)\s+(?:de\s+)?(?:alta|instalaci[oó]n|configuraci[oó]n|puesta en marcha|activaci[oó]n|integraci[oó]n|implantaci[oó]n|onboarding)/i,
  /cuota de alta|coste de alta|costo de alta|gastos de alta|matr[ií]cula/i,
  /(?:alta|configuraci[oó]n|instalaci[oó]n|puesta en marcha|integraci[oó]n|onboarding)\s+(?:es\s+|son\s+|totalmente\s+|100\s?%\s+)?(?:gratis|gratuit[ao]s?|sin coste|sin costo)/i,
  /(?:configuraci[oó]n|integraci[oó]n|puesta en marcha)[^.]{0,40}?\bincluid[ao]s?\s+en\s+(?:el|tu|su)\s+(?:plan|precio|cuota|suscripci[oó]n)/i,
  /(?:no|zero|without|free of|no extra)\s+(?:any\s+)?(?:set-?up|onboarding|installation|activation|implementation|integration|joining|sign-?up)\s+(?:fees?|costs?|charges?)/i,
  /\b(?:set-?up|onboarding|installation|activation|joining)\s+(?:fees?|charges?)\b/i,
  /\b(?:free|complimentary)\s+(?:set-?up|onboarding|installation|integration)\b|\b(?:set-?up|onboarding|installation|integration)\s+(?:is\s+)?(?:free|included in (?:the|your) (?:plan|price|subscription))/i,
];
const DATA_IN_THE_EU = [
  /\bdatos\s+(?:de\s+[\p{L}\s]{1,30}?\s+)?(?:se\s+)?(?:quedan|permanecen|residen|est[áa]n|se guardan|se almacenan|se alojan|se procesan|se tratan|alojados|almacenados|guardados)\s+(?:siempre\s+|solo\s+|s[óo]lo\s+|[úu]nicamente\s+|exclusivamente\s+)?(?:en|dentro de)\s+(?:la\s+|el\s+)?(?:UE|Uni[óo]n Europea|Europa|EEE|Espacio Econ[óo]mico Europeo|Espa[ñn]a)\b/iu,
  /\b(?:alojad|almacenad|hospedad|guardad)[oa]s?\s+(?:siempre\s+|solo\s+|s[óo]lo\s+|[úu]nicamente\s+|exclusivamente\s+)?(?:en|dentro de)\s+(?:la\s+|el\s+)?(?:UE|Uni[óo]n Europea|Europa|EEE)\b/iu,
  /\bservidor(?:es)?\s+(?:ubicados?\s+|alojados?\s+|situados?\s+)?(?:en|de|dentro de)\s+(?:la\s+)?(?:UE|Uni[óo]n Europea|Europa|Espa[ñn]a)\b|\bservidor(?:es)?\s+europeos?\b|\binfraestructura\s+(?:europea|en\s+(?:la\s+)?(?:UE|Europa))/iu,
  /\bnunca\s+(?:sale|salen|abandona|abandonan)\s+(?:de\s+)?(?:la\s+)?(?:UE|Uni[óo]n Europea|Europa|EEE)\b|\bno\s+(?:sale|salen)\s+(?:nunca\s+)?(?:de\s+)?(?:la\s+)?(?:UE|Uni[óo]n Europea|Europa|EEE)\b|\bsin\s+salir\s+de\s+(?:la\s+)?(?:UE|Uni[óo]n Europea|Europa|EEE)\b/iu,
  /\bsin\s+transferencias\s+(?:internacionales|fuera\s+de\s+(?:la\s+)?(?:UE|Uni[óo]n Europea|Europa|EEE))/iu,
  /\bdata\s+(?:(?:always|only|never)\s+)?(?:stays|remains|is stored|is kept|is hosted|is processed|resides|lives|sits)\s+(?:only\s+|entirely\s+|always\s+|exclusively\s+)?(?:in|within|inside)\s+(?:the\s+)?(?:EU|European Union|Europe|EEA|Spain)\b/i,
  /\b(?:hosted|stored|kept|housed|located)\s+(?:only\s+|entirely\s+|exclusively\s+|always\s+)?(?:in|within|inside)\s+(?:the\s+)?(?:EU|European Union|Europe|EEA|Spain)\b/i,
  /\b(?:EU|EU-based|European|Europe-based)\s+(?:servers?|data cent(?:re|er)s?|hosting|infrastructure)\b|\bservers?\s+(?:located\s+|based\s+|hosted\s+)?(?:in|within)\s+(?:the\s+)?(?:EU|European Union|Europe|Spain)\b/i,
  /\bnever\s+leaves?\s+(?:the\s+)?(?:EU|European Union|Europe|EEA)\b|\b(?:doesn[’']t|does not|won[’']t|will not|never)\s+leave\s+(?:the\s+)?(?:EU|European Union|Europe|EEA)\b|\bwithout\s+(?:ever\s+)?leaving\s+(?:the\s+)?(?:EU|European Union|Europe|EEA)\b|\bno\s+(?:international\s+)?(?:data\s+)?transfers?\s+outside\s+(?:the\s+)?(?:EU|European Union|Europe|EEA)\b/i,
];
const CHIROPRACTIC_ONLY = [
  /(?:afinad[ao]|ajustad[ao]|pensad[ao]|hech[ao]|diseñad[ao]|optimizad[ao]|especializad[ao])\s+(?:sobre todo\s+|solo\s+|únicamente\s+)?(?:para|en)\s+(?:la\s+)?quiropr[aá]ctic|sonar\s+a\s+quiropr[aá]ctic|(?:solo|sólo|únicamente|exclusivamente)\s+(?:para|en)\s+(?:centros\s+|clínicas\s+)?(?:de\s+)?quiropr[aá]ctic|si\s+(?:tu|mi)\s+clínica\s+no\s+es\s+(?:de\s+)?quiropr[aá]ctic/i,
  /(?:tuned|built|designed|made|optimi[sz]ed|geared|tailored)\s+(?:mainly\s+|only\s+|just\s+|primarily\s+)?(?:for|to)\s+chiropract|sound(?:s)?\s+(?:a\s+bit\s+)?chiropractic|(?:only|just|exclusively)\s+for\s+chiropract|clinic\s+isn[’']t\s+a\s+chiropractic|not\s+a\s+chiropractic\s+clinic/i,
];

const squash = (text) => text.replace(/\s+/g, ' ');
// A www rule is broken when any of its regexes matches the squashed text.
const breaksAny = (regexes) => (text) => regexes.some((re) => re.test(squash(text)));

const RULES = [
  [
    'precio de HeyCAi',
    (text) =>
      /(?:€|£)\s?(?:49|199|229|249|319)\b|\b(?:49|199|229|249|319)\s?(?:€|£|euros?\b)/i.test(text) ||
      /0[,.]15\s?€|€\s?0[,.]15/.test(text),
  ],
  ['cifra antigua', (text) => /\b2017\b|\b60\s?\+|\b(?:more than|over|más de)\s+60\b/i.test(text)],
  [
    'cifra de QuiroAds sin QuiroAds',
    (text) =>
      text
        .split(/(?<=[.!?])\s+|\n+/)
        .some((sentence) => QUIROADS_FIGURE.test(sentence) && !sentence.includes('QuiroAds')),
  ],
  [
    'AI Act',
    (text) => /AI Act[^.\n]{0,80}\b(?:complian|cumpl)\w*|\b(?:complian|cumpl)\w*[^.\n]{0,80}AI Act/i.test(text),
  ],
  ['UTM', (text) => /[?&]utm_/i.test(text)],
  [
    'enlace no canónico',
    (text) =>
      (text.replace(INSTALL_COMMAND, '').match(/\bhttps?:\/\/(?:[\w-]+\.)*heycai\.ai\b/gi) ?? []).some(
        (origin) => origin !== CANONICAL_ORIGIN,
      ),
  ],
  ['inglés británico', (text) => /\bdiary\b|\bacross the UK\b|\bUK clinics\b|\bfor UK\b/i.test(text)],
  ['español no neutro', (text) => /\bcog(?:er|e)\b|\btenéis\b|\bvosotros\b|\bhueco\b|\bmóvil\b/i.test(text)],
  ['cuota de alta', breaksAny(SET_UP_FEE)],
  ['datos en la UE', breaksAny(DATA_IN_THE_EU)],
  ['solo quiropráctica', breaksAny(CHIROPRACTIC_ONLY)],
];

// Names of the content rules the text breaks, in rule order; empty when it breaks none.
export function ruleViolations(text) {
  return RULES.filter(([, broken]) => broken(text)).map(([name]) => name);
}
