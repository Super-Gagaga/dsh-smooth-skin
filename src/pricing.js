/**
 * The live session's cost figure, read from the Host's token projection.
 *
 * DeepSeek publishes its list prices in CNY per million tokens, with a peak tier on
 * weekday mornings and afternoons (UTC) and an off-peak tier outside those windows.
 * Cache writes bill at the cache-hit rate, as the official page lists no write price.
 * The client projections carry token totals but no per-settlement times, so the whole
 * session is priced at the tier in force when the line renders; a session that spans a
 * tier boundary is an estimate. A model the table does not know gets no figure (the
 * row writes a dash) rather than a made-up one. Holidays are not modelled.
 *
 * Rates are per million tokens, so `tokens × rate` lands directly in millionths of a
 * yuan; the formatter turns that micro amount into the short currency string.
 */
const USAGE_PRICES = {
  'deepseek-flash': {
    offPeak: { hit: 0.02, miss: 1, out: 4 },
    peak: { hit: 0.04, miss: 2, out: 8 },
  },
  'deepseek-v4-pro': {
    offPeak: { hit: 0.15, miss: 4.5, out: 13.5 },
    peak: { hit: 0.3, miss: 9, out: 27 },
  },
};

/** Provider-prefixed and dated ids bill as the base model. */
const USAGE_ALIASES = {
  'deepseek-v4-flash': 'deepseek-flash',
  'deepseek-v4.1-flash': 'deepseek-flash',
  'deepseek-v4p1-flash': 'deepseek-flash',
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
  'deepseek-v4-pro': 'deepseek-v4-pro',
  'deepseek-v4p1-pro': 'deepseek-v4-pro',
};

/** The catalogue id the price table prices, or null when the model is not listed. */
function usagePriceModel(modelId) {
  const raw = String(modelId ?? '').trim().toLowerCase();
  if (!raw) return null;
  const bare = raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw;
  if (USAGE_PRICES[bare]) return bare;
  if (USAGE_ALIASES[bare]) return USAGE_ALIASES[bare];
  // Dated and variant suffixes (`-1017`, `-fast`, `:thinking`) still bill as the model
  // whose name they extend, so a prefix match covers the catalogue's long tail.
  for (const [alias, priced] of Object.entries(USAGE_ALIASES)) {
    if (bare.startsWith(alias)) return priced;
  }
  if (bare.includes('deepseek') && bare.includes('flash')) return 'deepseek-flash';
  if (bare.includes('deepseek') && bare.includes('pro')) return 'deepseek-v4-pro';
  return null;
}

/** Every prompt token the provider billed, cache reads and writes included. */
function usageInputTokens(usage) {
  const count = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);
  return count(usage?.uncachedInputTokens) + count(usage?.cacheReadTokens) + count(usage?.cacheWriteTokens);
}

/** The peak windows are UTC weekdays 01:00–04:00 and 06:00–10:00. */
function usagePeakAt(atMs) {
  const at = new Date(atMs);
  const weekday = at.getUTCDay();
  if (weekday < 1 || weekday > 5) return false;
  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes();
  return (minutes >= 60 && minutes < 240) || (minutes >= 360 && minutes < 600);
}

/** One session's cost in millionths of a yuan, or null when the model has no price. */
function usageCostMicro(usage, modelId, atMs = Date.now()) {
  const priced = usagePriceModel(modelId);
  if (priced === null) return null;
  const tier = usagePeakAt(atMs) ? USAGE_PRICES[priced].peak : USAGE_PRICES[priced].offPeak;
  const count = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);
  const cost = count(usage?.uncachedInputTokens) * tier.miss
    + count(usage?.cacheReadTokens) * tier.hit
    + count(usage?.cacheWriteTokens) * tier.hit
    + count(usage?.outputTokens) * tier.out;
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

/** Four significant digits, without an exponent once integer digits run past four. */
function usageSignificant(amount) {
  const text = amount.toPrecision(4);
  if (!text.includes('e')) return text;
  const scale = 10 ** (Math.floor(Math.log10(amount)) - 3);
  return String(Math.round(amount / scale) * scale);
}

/** A micro amount as `1.844`: the shorter of four significant digits and four decimals.
 * The currency is the row's money icon, so the figure itself carries no symbol. */
function usageCostText(micro) {
  const amount = Number.isFinite(micro) && micro > 0 ? micro / 1_000_000 : 0;
  const decimals = amount.toFixed(4);
  const significant = usageSignificant(amount);
  return significant.length < decimals.length ? significant : decimals;
}
