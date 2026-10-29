/* ═══════════════════════════════════════════════════════════════════
   ThreatScan — application logic
   Everything runs locally: analysers are pure functions, nothing is
   uploaded, and history/checklist live in localStorage on this device.
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ── tiny helpers ─────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);

  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Yields to the UI so the loading state paints — but never hangs when the
  // tab is in the background (rAF is throttled there).
  const nextFrame = () => new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(finish);
    setTimeout(finish, 120);
  });

  const SAMPLE_QR = 'data:image/webp;base64,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';
  const RING_C = 326.73; // 2πr, r = 52

  const fmtBytes = (n) => {
    if (n <= 0) return '0 KB';
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const shorten = (str, max) => {
    const s = String(str);
    return s.length <= max ? s : s.slice(0, max - 1) + '…';
  };

  const formatList = (items) => {
    if (!items.length) return '';
    if (items.length === 1) return '“' + items[0] + '”';
    if (items.length === 2) return '“' + items[0] + '” and “' + items[1] + '”';
    return '“' + items.slice(0, -1).join('”, ') + '” and “' + items[items.length - 1] + '”';
  };

  function editDistance(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 99;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const row = [i];
      for (let j = 1; j <= n; j++) {
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = row;
    }
    return prev[n];
  }

  /* ── shared data ──────────────────────────────────────────────── */
  const BANDS = {
    low: {
      key: 'low', label: '1–20 · Low risk (likely safe)', verdict: 'No warning signs',
      summary: 'The checks found little of what is commonly used in scams. This is an assessment of the address and text you gave — it is not proof the page or sender is honest. Verify money and password matters through an official channel.',
      status: 'No Threat Detected', action: 'No warning signals found. Still confirm unexpected requests through the organisation’s own app or a phone number you already have before sharing OTPs, passwords, card details or money.'
    },
    suspicious: {
      key: 'suspicious', label: '21–49 · Suspicious', verdict: 'Worth a closer look',
      summary: 'Several warning signs showed up. Pause before clicking, paying or replying, and verify the claim through the organisation’s official app, website or a number you already trust.',
      status: 'Suspicious', action: 'Do not open the link or reply yet. Check the sender or company through its own app or a phone number you already have. If it proves genuine, continue; if anything feels off, delete or report it.'
    },
    high: {
      key: 'high', label: '50–79 · High risk', verdict: 'Strong warning signs',
      summary: 'Multiple signals commonly used in scams are present, but a live reputation service did not confirm them. Treat it as hostile and verify independently.',
      status: 'Suspicious', action: 'Do not open the link, answer the sender or install anything. If you already opened it, close the page, change any affected passwords from another device and contact your bank if money or cards were involved.'
    },
    critical: {
      key: 'critical', label: '80–100 · Critical risk', verdict: 'Treat as dangerous',
      summary: 'The evidence is heavy: either a live reputation service flagged this address, or the signals combine into near-certain fraud.',
      status: 'Confirmed Threat', action: 'Do not open. If you already did: disconnect from the internet, run a full antivirus scan, change passwords from a different clean device, and call your bank immediately if any money or card details were involved.'
    }
  };
  const bandFor = (score) => (score >= 80 ? BANDS.critical : score >= 50 ? BANDS.high : score >= 21 ? BANDS.suspicious : BANDS.low);

  // Detection status + confidence are separate from the risk score.
  const STATUSES = {
    CONFIRMED: 'Confirmed Threat',
    SUSPICIOUS: 'Suspicious',
    NONE: 'No Threat Detected',
    UNVERIFIED: 'Unable to Verify'
  };
  function assessResult(data) {
    const band = bandFor(data.score);
    data.bandName = band.label;
    data.status = data.unverifiable ? STATUSES.UNVERIFIED
      : data.intelConfirmed ? STATUSES.CONFIRMED
      : band.key === 'low' ? STATUSES.NONE
      : STATUSES.SUSPICIOUS;
    // Confidence: how solid the evidence is (never the same as risk).
    const positive = (data.reasons || []).filter((r) => r.weight >= 8);
    const categories = new Set(positive.map((r) => r.category));
    let confidence = categories.size >= 3 ? 'High' : categories.size >= 1 ? 'Medium' : 'Low';
    if (data.intelConfirmed || data.reputationClean) confidence = 'High';
    else if (data.reputationNoData && confidence === 'Low') confidence = 'Low';
    data.confidence = confidence;
    if (data.unverifiable) {
      data.action = data.kind === 'image'
        ? 'The scan could not read a QR code from this picture — sharp angles, blur, glare or cropping can all prevent decoding. Re-take a straight, well-lit close-up of just the code and scan again. Until you can read the destination yourself, do not treat it as trustworthy.'
        : 'The input could not be parsed, so the checks could not verify it. Double-check the address for typos or missing characters and scan again.';
    } else if (!data.action) data.action = band.action;
  }

  const CATEGORIES = {
    protocol: 'Protocol', host: 'Domain', brand: 'Brand imitation', transport: 'Connection',
    keyword: 'Address wording', links: 'Links & contacts', credential: 'Credential theft',
    payment: 'Payment pressure', pressure: 'Urgency & pressure', reward: 'Reward bait',
    remote: 'Remote access', impersonation: 'Impersonation', file: 'File checks',
    qr: 'QR content', style: 'Writing style', credibility: 'Credibility',
    reputation: 'Reputation evidence'
  };

  const SUSPICIOUS_TLDS = ['zip', 'mov', 'top', 'click', 'work', 'country', 'gq', 'tk', 'ml', 'cf', 'ga', 'buzz', 'cam', 'rest', 'sbs', 'cfd', 'lol', 'icu', 'cyou', 'monster', 'quest', 'bond'];
  const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc', 'ow.ly', 'buff.ly', 'rebrand.ly', 't.ly', 's.id', 'lnkd.in', 'goo.gl', 'bit.do', 'qr.ae'];
  const MULTI_PART_SUFFIXES = ['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.in', 'net.in', 'org.in', 'co.jp', 'ne.jp', 'co.nz', 'co.za', 'com.au', 'net.au', 'org.au', 'com.br', 'com.mx', 'com.sg', 'com.tr', 'com.pk', 'com.ng', 'co.id', 'co.kr', 'com.cn', 'com.hk'];

  const URL_KEYWORDS = ['login', 'log-in', 'signin', 'sign-in', 'verify', 'verification', 'secure', 'security', 'account', 'update', 'confirm', 'unlock', 'recover', 'billing', 'wallet', 'payment', 'kyc'];
  // Popular registration endings used heavily by disposable phishing sites
  // but also by some legitimate personal projects — priced as a caution.
  const SOFT_TLDS = ['xyz', 'online', 'site', 'shop', 'live', 'club', 'link', 'space', 'vip', 'one'];

  const BRANDS = [
    'paypal', 'google', 'microsoft', 'apple', 'amazon', 'facebook', 'instagram', 'whatsapp',
    'netflix', 'linkedin', 'icloud', 'dropbox', 'telegram', 'discord', 'steam', 'coinbase',
    'binance', 'sbi', 'hdfc', 'icici', 'axisbank', 'kotak', 'phonepe', 'paytm'
  ].map((base) => ({ base, domain: {
    sbi: 'sbi.co.in', kotak: 'kotak.com', icici: 'icicibank.com', axisbank: 'axisbank.com'
  }[base] || base + '.com' }));

  // Dimensions known to be legitimate for a very large share of web traffic.
  // Weak cosmetic heuristics (digits, hyphens, subdomain chains, path wording)
  // are relaxed on these registered domains — strong evidence still counts.
  const TRUSTED = [
    // global platforms
    'google.com', 'google.co.in', 'google.co.uk', 'googleapis.com', 'googleusercontent.com', 'gstatic.com',
    'youtube.com', 'android.com', 'microsoft.com', 'live.com', 'microsoftonline.com', 'office.com',
    'outlook.com', 'msn.com', 'bing.com', 'skype.com', 'apple.com', 'icloud.com', 'icloud-content.com',
    'amazon.com', 'amazon.in', 'amazon.co.uk', 'awsstatic.com', 'media-amazon.com', 'cloudfront.net',
    'cloudflare.com', 'akamaihd.net', 'fastly.net',
    'facebook.com', 'facebook.net', 'fbcdn.net', 'instagram.com', 'whatsapp.com', 'whatsapp.net',
    'x.com', 'twitter.com', 'twimg.com', 'netflix.com', 'linkedin.com', 'licdn.com', 'reddit.com',
    'wikipedia.org', 'wikimedia.org', 'github.com', 'githubusercontent.com', 'stackoverflow.com',
    'openai.com', 'chatgpt.com', 'anthropic.com', 'claude.ai', 'zoom.us', 'slack.com', 'discord.com',
    'spotify.com', 'telegram.org', 'dropbox.com', 'canva.com', 'notion.so', 'atlassian.com',
    'zendesk.com', 'adobe.com', 'medium.com', 'wordpress.com', 'blogspot.com', 'archive.org',
    'mozilla.org', 'w3schools.com', 'coursera.org', 'udemy.com', 'trustpilot.com', 'duolingo.com',
    // payments & finance
    'paypal.com', 'paypal.me', 'paypalobjects.com', 'visa.com', 'mastercard.com', 'stripe.com',
    'razorpay.com', 'sbi.co.in', 'onlinesbi.sbi', 'hdfcbank.com', 'icicibank.com', 'axisbank.com',
    'kotak.com', 'bankofbaroda.in', 'federalbank.co.in', 'canarabank.com', 'unionbankofindia.co.in',
    'rbi.org.in', 'phonepe.com', 'paytm.com', 'bhimupi.org.in',
    // Indian public services & major services
    'uidai.gov.in', 'incometax.gov.in', 'gst.gov.in', 'indiapost.gov.in', 'irctc.co.in',
    'flipkart.com', 'flipkart.net', 'myntra.com', 'snapdeal.com', 'nykaa.com', 'zomato.com',
    'swiggy.com', 'olacabs.com', 'uber.com', 'oyo.com', 'makemytrip.com', 'goibibo.com',
    // telecom & delivery
    'jio.com', 'airtel.in', 'vodafone.in', 'bluedart.com', 'delhivery.com', 'fedex.com',
    'dhl.com', 'ups.com', 'usps.com'
  ];

  function isTrustedDomain(reg, host) {
    return TRUSTED.some((d) => reg === d || reg.endsWith('.' + d) || host === d || host.endsWith('.' + d));
  }

  /* ═════════════════════════════════════════════════════════════════
     URL scanner
     ═════════════════════════════════════════════════════════════════ */
  function registrableDomain(host) {
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith('[')) return host;
    const labels = host.split('.').filter(Boolean);
    const len = labels.length;
    if (len <= 2) return host;
    const lastTwo = labels.slice(-2).join('.');
    if (MULTI_PART_SUFFIXES.includes(lastTwo)) return labels.slice(-3).join('.');
    return lastTwo;
  }

  // ── threat-intelligence client ────────────────────────────────────
  // Talks to the local companion service (dev-server.ps1) which holds the
  // real Safe Browsing / VirusTotal keys. Never runs from source files,
  // never exposes a key, and degrades to "unavailable" — never to "safe".
  const REP_CACHE = new Map();
  const REP_TTL = 30 * 60 * 1000;
  const INTEL_BASE = (() => {
    try { return location.origin.startsWith('http') ? location.origin : 'http://localhost:8399'; }
    catch (e) { return 'http://localhost:8399'; }
  })();

  async function fetchReputation(url) {
    const value = String(url || '').trim();
    if (!value) return { available: false, reason: 'no-input', services: [] };
    const cacheKey = value.toLowerCase();
    const hit = REP_CACHE.get(cacheKey);
    if (hit && Date.now() - hit.fetchedAt < REP_TTL) return hit;
    let result;
    try {
      const res = await fetch(INTEL_BASE + '/api/intel?url=' + encodeURIComponent(value), {
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('intel http ' + res.status);
      result = await res.json();
    } catch (e) {
      result = { available: false, reason: /abort|timeout/i.test(e && e.message) ? 'timeout' : 'service-unreachable', verdict: null, services: [] };
    }
    result.fetchedAt = Date.now();
    REP_CACHE.set(cacheKey, result);
    return result;
  }

  function reputationChecks(rep) {
    if (!rep || !rep.services || !rep.services.length) {
      return [{ name: 'Live reputation lookup', state: 'unavailable', detail: 'companion service not reachable — heuristic analysis only' }];
    }
    const failVerdicts = ['threat'];
    const warnVerdicts = ['negative', 'uncertain'];
    return rep.services.map((s) => ({
      name: s.service,
      state: s.state === 'ok' ? (failVerdicts.indexOf(rep.verdict) !== -1 ? 'fail' : warnVerdicts.indexOf(rep.verdict) !== -1 ? 'warn' : 'ok') : s.state,
      detail: s.detail
    }));
  }
  function appendReputation(rep) {
    return reputationChecks(rep);
  }

  // Pulls full http(s) URLs hidden inside percent-encoded queries / redirects.
  // A decoded blob often glues two addresses together (…?q=http://evil), so
  // each match is split at every scheme boundary and the destinations kept.
  function findEmbeddedURLs(value) {
    let text = value;
    for (let i = 0; i < 3 && text.includes('%'); i++) {
      try { text = decodeURIComponent(text); } catch (e) { break; }
    }
    const out = [];
    const re = /https?:\/\/[^\s"'<>()[\]]+/gi;
    let m;
    while ((m = re.exec(text)) !== null && out.length < 3) {
      let blob = m[0].replace(/[.,;:!)]+$/, '');
      const starts = [];
      const low = blob.toLowerCase();
      let idx = low.indexOf('http');
      while (idx !== -1) { starts.push(idx); idx = low.indexOf('http', idx + 4); }
      const pieces = starts.length >= 2
        ? starts.slice(1).map((s, i) => blob.slice(s, i + 1 < starts.length - 1 ? starts[i + 2] : undefined).replace(/[.,;:!)]+$/, ''))
        : [blob];
      for (const url of pieces) {
        if (url.length > 12 && url !== value.trim()) out.push(url);
      }
    }
    return [...new Set(out)];
  }

  function scanURL(raw, opts) {
    const reputation = opts && opts.reputation;
    const checks = [{ name: 'Validity & parsing', state: 'ok', detail: 'address format checked' }];
    const value = String(raw == null ? '' : raw).trim();
    if (!value) return { error: 'Enter a link to scan.' };
    if (value.length > 4096) return { error: 'That link is too long to check. Paste the start of the address instead.' };

    const schemeMatch = value.match(/^([a-z][a-z0-9+.-]*):/i);
    if (schemeMatch) {
      const scheme = schemeMatch[1].toLowerCase();
      if (scheme !== 'http' && scheme !== 'https') {
        return {
          kind: 'url', score: 88,
          reasons: [{ weight: 88, category: 'protocol', text: 'This uses the “' + scheme + ':” scheme instead of http or https. Addresses like this can run code or open local files — do not open it.' }],
          checks: [{ name: 'Validity & parsing', state: 'fail', detail: 'non-standard address scheme' }, ...appendReputation(reputation)],
          meta: { label: shorten(value, 64), host: '', url: value }
        };
      }
    }

    let u;
    try {
      u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : 'https://' + value);
    } catch (e) {
      return {
        kind: 'url', score: 34, unverifiable: true,
        reasons: [{ weight: 34, category: 'host', text: 'This does not parse as a web address. Check for typos, spaces or missing characters before opening it. It cannot be fully verified.' }],
        checks: [{ name: 'Validity & parsing', state: 'fail', detail: 'could not be parsed as a web address' }, ...appendReputation(reputation)],
        meta: { label: shorten(value, 48), host: '', url: value }
      };
    }

    const rawHostText = value.split(/[/?#]/)[0].split('@').pop() || '';
    const hasNonASCII = /[^\x00-\x7F]/.test(rawHostText);

    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    // A URL parser can "succeed" by encoding invalid characters (spaces etc.)
    // — an address that needed that rescue is not a real web address.
    if (/[\s\u0000-\u001f]/.test(u.hostname) || /%[0-9a-f]{2}/i.test(u.hostname)) {
      return {
        kind: 'url', score: 34, unverifiable: true,
        reasons: [{ weight: 34, category: 'host', text: 'This does not look like a real web address — it contains spaces or characters that should not appear in a domain name. Check for typos before opening it. It cannot be fully verified.' }],
        checks: [{ name: 'Validity & parsing', state: 'fail', detail: 'domain name contains invalid characters' }, ...appendReputation(reputation)],
        meta: { label: shorten(value, 48), host: '', url: value }
      };
    }
    if (!host) {
      return {
        kind: 'url', score: 30, unverifiable: true,
        reasons: [{ weight: 30, category: 'host', text: 'No domain name could be read from this address.' }],
        checks: [{ name: 'Validity & parsing', state: 'fail', detail: 'no domain name found' }, ...appendReputation(reputation)],
        meta: { label: shorten(value, 48), host: '', url: value }
      };
    }
    checks.push({
      name: 'Secure transport', state: u.protocol === 'http:' ? 'warn' : 'ok',
      detail: u.protocol === 'http:' ? 'plain HTTP — not encrypted' : 'HTTPS'
    });

    const labels = host.split('.').filter(Boolean);
    const tld = labels[labels.length - 1] || '';
    const reg = registrableDomain(host);
    const regBase = reg.split('.')[0] || reg;
    const subCount = labels.length - reg.split('.').length;
    const isTrusted = isTrustedDomain(reg, host);

    // addStrong = evidence that carries weight on its own (forgery, disguise,
    // destination tricks). addWeak = cosmetic heuristics that only count when
    // several appear together and never outweigh strong evidence.
    const reasons = [];
    const add = (weight, text, category) => reasons.push({ weight, text, category, tier: 'strong' });
    const addWeak = (weight, text, category) => { if (!isTrusted) reasons.push({ weight, text, category, tier: 'weak' }); };

    // Connection & disguise (strong)
    if (u.protocol === 'http:') add(8, 'The connection is plain HTTP instead of HTTPS, so it is not encrypted. Sites that handle logins or payments should never use it.', 'transport');
    if (u.username || u.password) add(28, 'The address contains text like “user:pass@” before the real domain, which can disguise the true destination. This is a known phishing trick.', 'protocol');
    if (u.port && u.port !== '80' && u.port !== '443') add(8, 'The address connects on an unusual port (' + u.port + ' instead of the normal 80/443).', 'transport');

    // Host evidence (strong forgery signals first)
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith('[')) add(14, 'This address uses an IP address instead of a domain name. Verify who operates it before proceeding.', 'host');
    if (host.indexOf('.') === -1) add(8, 'The address has no public domain extension (like .com). It will not open as a normal website.', 'host');
    if (host.startsWith('xn--') || labels.some((l) => l.startsWith('xn--'))) add(18, 'The domain uses punycode (encoded characters), which can imitate familiar names using lookalike letters.', 'host');
    if (hasNonASCII) add(12, 'The address contains non-English characters. Mixed-script lookalike domains (for example a Cyrillic “а” instead of “a”) can imitate trusted names.', 'host');

    // Cosmetic host heuristics (weak, skipped on trusted domains)
    if (subCount >= 3) addWeak(8, 'There are ' + subCount + ' subdomain levels — often used to push a trusted name in front of the real domain.', 'host');
    if ((regBase.match(/-/g) || []).length >= 2) addWeak(6, 'The registered domain name contains several hyphens. Legitimate banks and brands rarely pick hyphenated names.', 'host');
    if ((regBase.match(/\d/g) || []).length >= 4) addWeak(6, 'The registered domain name contains many digits, which is common in throwaway phishing domains.', 'host');
    if (host.length > 40) addWeak(5, 'The domain part is unusually long, making it easy to hide the real site name inside it.', 'host');

    // Scam wording inside the domain itself (sbi-kyc-pay, secure-login-relief…)
    if (!isTrusted) {
      const hostTokens = (regBase + ' ' + labels.join(' ')).toLowerCase().split(/[\s-_.]+/);
      const hostHints = [...new Set(URL_KEYWORDS.filter((k) => hostTokens.includes(k)))];
      if (hostHints.length) addWeak(Math.min(12, hostHints.length * 8), 'The domain name itself contains ' + formatList(hostHints.slice(0, 3)) + ' — banking and security wording inside a domain name is a common phishing pattern.', 'keyword');
    }

    // TLD & shorteners (strong destination clues)
    if (SHORTENERS.some((s) => host === s || host.endsWith('.' + s))) add(16, 'This is a link-shortening service, so the final destination is hidden until you open it.', 'host');
    if (SUSPICIOUS_TLDS.includes(tld)) add(16, 'The domain ends in “' + tld + '”, an ending frequently used by disposable or untrusted sites. The ending alone does not prove fraud.', 'host');
    else if (!isTrusted && SOFT_TLDS.includes(tld)) add(8, 'The domain ends in “' + tld + '”, an ending used both by cheap disposable sites and by some legitimate personal projects. On its own this is only a caution.', 'host');

    // Brand imitation
    if (!isTrusted) {
      const tokens = new Set([...labels, ...regBase.split('-')].filter((c) => c.length >= 4));
      const candidates = [...labels, ...regBase.split('-')].filter((c) => c.length >= 4);
      for (const brand of BRANDS) {
        if (host === brand.domain || host.endsWith('.' + brand.domain)) break;
        // exact brand token in the domain → strong imitation signal
        if (tokens.has(brand.base)) {
          add(22, 'The address uses the name “' + brand.base + '” but the real registered domain is “' + reg + '”, not “' + brand.domain + '”. Reputable companies use their own domain.', 'brand');
          break;
        }
        // domain merely builds on a brand word (icicibank…, amazonaws…) →
        // medium signal; many legitimate sites legitimately do this
        const builtOn = candidates.find((c) => c.length > brand.base.length + 2 && (c.startsWith(brand.base) || c.endsWith(brand.base)));
        if (builtOn) {
          add(14, 'The domain name is built on “' + brand.base + '” but is not on “' + brand.domain + '”. Some legitimate sites are named this way; scams abuse it a lot.', 'brand');
          break;
        }
        const dist = Math.min.apply(null, candidates.map((c) => editDistance(c, brand.base)));
        if (dist > 0 && dist <= 1) {
          add(24, '“' + regBase + '” is one character away from “' + brand.domain + '”. Lookalike spellings are a common phishing technique.', 'brand');
          break;
        }
      }
    }
    const pathBrandHit = !isTrusted && BRANDS.find((b) => u.pathname.toLowerCase().includes(b.base));
    if (pathBrandHit) reasons.push({ weight: 0, text: 'The brand name “' + pathBrandHit.base + '” appears in the page path. That is common on ordinary pages too (news, support, store sections) — only the domain above decides who runs this link.', category: 'brand' });

    // Path & query wording (weak — normal sites have login pages too)
    const haystack = (u.pathname + u.search).toLowerCase();
    const hits = URL_KEYWORDS.filter((k) => haystack.includes(k));
    if (hits.length) addWeak(Math.min(12, hits.length * 4), 'The page path includes ' + formatList(hits.slice(0, 4)) + '. Login, verification and payment wording is typical of phishing pages.', 'keyword');
    if (/\.(?:pdf|docx?|xlsx?|jpe?g|png|txt|html?)\.(?:exe|scr|js|bat|cmd|msi|apk|vbs)$/i.test(u.pathname)) add(28, 'The file at this address has a double extension (for example “invoice.pdf.exe”). This is a classic malware delivery trick.', 'file');
    const hostEncoded = (rawHostText.match(/%[0-9a-f]{2}/gi) || []).length;
    if (/%(?:00|0d|0a|2e%2e)/i.test(value) || hostEncoded >= 2) add(8, 'The address contains percent-encoded characters in the domain part or control characters, which can hide the real destination from you.', 'host');

    // Open-redirect chains: a trusted-looking address whose query carries the
    // real destination (google.com/url?q=…, drive links, mail-redirectors).
    if (isTrusted && !(opts && opts.embedded)) {
      for (const child of findEmbeddedURLs(value).slice(0, 2)) {
        const cr = scanURL(child, { embedded: true });
        if (!cr.error && cr.score >= 20) {
          add(Math.min(45, cr.score), 'This “' + reg + '” address forwards the visitor on to “' + ((cr.meta && cr.meta.host) || child) + '” once opened. The trusted name in the address bar does not vouch for that destination.', 'protocol');
          break;
        }
      }
    }

    // Threat-intelligence verdict (from the local key-protected service).
    // Verdicts: threat = a service flagged it (confirmed). negative/uncertain
    // = real negative evidence that is NOT proof of maliciousness, so it
    // raises the score without claiming a blocklist hit. clean = supporting
    // credibility only. Unavailable never substitutes for any of these.
    if (reputation) {
      checks.push(...reputationChecks(reputation));
      if (reputation.verdict === 'threat') {
        add(92, 'A live reputation service flags this address as unsafe: ' + (reputation.detail || 'reported threats').trim() + '. Do not open it.', 'protocol');
      } else if (reputation.verdict === 'negative') {
        add(24, (reputation.detail || 'A reputation service reports poor customer ratings for this domain.') + ' Poor reputation is real negative evidence — not proof of fraud by itself, but enough to treat the domain as suspicious until verified through an official channel.', 'reputation');
      } else if (reputation.verdict === 'uncertain') {
        const fs = Number(reputation.riskScore) || 60;
        add(Math.min(35, Math.round(fs * 0.5)), (reputation.detail || 'A reputation service reports elevated, non-conclusive risk for this domain.') + ' Elevated fraud-risk scores are not blocklist confirmations.', 'reputation');
      } else if (reputation.verdict === 'clean') {
        reasons.push({ weight: 0, text: 'Reputation lookup (' + reputation.services.filter((s) => s.state === 'ok').map((s) => s.service).join(', ') + '): this address is not on any unsafe list' + (reputation.detail ? ' — ' + reputation.detail : '') + '. Meaningful evidence, but brand-new or compromised sites can still be missing from such lists.', category: 'credibility' });
      }
    }

    // Credibility note for known-good domains
    if (isTrusted && !reasons.some((r) => r.weight > 0)) {
      reasons.push({ weight: 0, text: 'The registered domain “' + reg + '” is on this tool’s trusted-domain list, so cosmetic heuristics were not applied. That is still not a guarantee for the specific page you opened.', category: 'credibility' });
    }

    // Structure checks finish here — record what ran.
    checks.push({
      name: 'Structure heuristics', state: 'ok',
      detail: reasons.filter((r) => r.weight > 0).length + ' warning signal(s) found'
    });

    // Cosmetic pile-ups are capped: several weak signals together can never
    // outweigh one strong forgery signal.
    let weakSum = 0;
    reasons.forEach((r) => { if (r.tier === 'weak') weakSum += r.weight; });
    if (weakSum > 18) {
      const factor = 18 / weakSum;
      reasons.forEach((r) => { if (r.tier === 'weak') r.weight = Math.max(1, Math.round(r.weight * factor)); });
    }
    reasons.forEach((r) => { delete r.tier; });

    const score = Math.max(1, Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0)));
    return {
      kind: 'url', score, reasons, checks,
      intelConfirmed: !!(reputation && reputation.verdict === 'threat'),
      reputationClean: !!(reputation && reputation.verdict === 'clean'),
      meta: { label: host, host, registrable: reg, url: u.href }
    };
  }

  /* ═════════════════════════════════════════════════════════════════
     Message scanner
     ═════════════════════════════════════════════════════════════════ */
  const BARE_DOMAIN_RE = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|edu|gov|int|io|co|in|us|uk|ca|au|de|fr|es|it|nl|br|ru|cn|jp|kr|sg|hk|nz|za|ae|pk|bd|id|my|ph|th|vn|tr|pl|se|no|dk|fi|ch|ie|info|biz|xyz|top|shop|store|site|online|link|click|live|world|today|news|app|dev|tech|me|tv|cc|ws|ly|gl|to|gg|fm|is|st|pw|pro|mobi|asia|name|club|vip|icu|buzz|work|zip|mov|cam|rest|sbs|cfd|lol|monster|cyou|bond)\b(?:\/[^\s<>"'`)\]}]*)?/gi;

  function extractLinks(text) {
    const found = new Set();
    const push = (m) => {
      const cleaned = m.replace(/[.,;:!?…]+$/, '');
      if (cleaned.length > 3) found.add(cleaned);
    };
    const withScheme = text.match(/(?:https?:\/\/|www\.)[^\s<>"'`)\]}]+/gi) || [];
    withScheme.forEach(push);
    BARE_DOMAIN_RE.lastIndex = 0;
    let m;
    while ((m = BARE_DOMAIN_RE.exec(text)) !== null) {
      const before = text.charAt(m.index - 1);
      if (before === '@') continue;           // part of an email address
      push(m[0]);
    }
    BARE_DOMAIN_RE.lastIndex = 0;
    return [...found].slice(0, 8);
  }

  const MESSAGE_RULES = [
    { category: 'credential', points: 26, re: /\b(?:share|send|tell|give|provide|reply with|confirm|enter)\b[^.!?\n]{0,60}\b(?:otp|one[-\s]?time (?:password|code)|verification code|6[-\s]?\d?[-\s]?digit code)\b/i, text: 'Asks you to share an OTP or verification code. No real bank, delivery firm or support team will ever ask for one.' },
    { category: 'credential', points: 24, re: /\b(?:password|passcode|cvv|card number|bank details)\b[^.!?\n]{0,50}\b(?:send|share|confirm|provide|verify|enter|reply)\b/i, text: 'Requests a password, card number or other secret details by message. Share nothing through this channel.' },
    { category: 'credential', points: 24, re: /\b(?:send|share|confirm|provide|verify|tell)\b[^.!?\n]{0,50}\b(?:password|passcode|cvv|card number|bank details)\b/i, text: 'Asks you to send or confirm sensitive account or card details. Legitimate companies never collect these by message.' },
    { category: 'remote', points: 24, re: /\b(?:anydesk|teamviewer|quick support|remote access|screen shar(?:e|ing)|install (?:this|the) (?:apk|app))\b/i, text: 'Mentions remote-access apps or installing an unknown APK. Never grant a stranger access to your device.' },
    { category: 'impersonation', points: 16, re: /\b(?:your|the|my)\s+(?:account|card|parcel|delivery|shipment|wallet)\b[^.!?\n]{0,40}\b(?:blocked|suspended|frozen|on hold|failed|cancel(?:l)?ed|deactivated|paused)\b/i, text: 'Claims an account, card or delivery is blocked or on hold. Confirm this in the official app before doing anything.' },
    { category: 'impersonation', points: 12, re: /\b(?:this is|on behalf of|calling from|i am from)\b[^.!?\n]{0,40}\b(?:bank|support|fraud team|customs|police|government|tax department)\b/i, text: 'Pretends to be a bank, government agency or support team. Impersonation is the most common scam pattern.' },
    { category: 'pressure', points: 14, re: /\b(?:within|in)\s+\d+\s*(?:minute|minutes|hour|hours)\b|\b(?:right now|last warning|final notice|act immediately|urgent action required|expires? (?:today|tonight|soon))\b/i, text: 'Uses an artificial deadline or “act now” pressure. Legitimate organisations give you time to verify.' },
    { category: 'payment', points: 20, re: /\b(?:pay|send|transfer|deposit)\b[^.!?\n]{0,40}\b(?:money|cash|amount|gift card|bitcoin|crypto|upi)\b/i, text: 'Requests a payment or transfer. Confirm the recipient through a trusted channel before sending anything.' },
    { category: 'payment', points: 16, re: /\b(?:processing fee|clearance fee|release fee|advance fee|refundable fee|security deposit)\b/i, text: 'Mentions a fee that must be paid to release something. Advance-fee traps are a classic scam.' },
    { category: 'payment', points: 16, re: /\b(?:upi|gpay|google pay|phonepe|paytm)\b[^.!?\n]{0,40}\b(?:pin|request|collect|approve)\b/i, text: 'Mentions a UPI or wallet PIN, request or approval. Entering your PIN to “receive” money always sends money — this is how collect-request scams work.' },
    { category: 'reward', points: 16, re: /\b(?:you(?:'ve| have)?\s+won|winner|congratulations|claim (?:your|the) (?:prize|reward|gift)|prize money|lottery|free gift)\b/i, text: 'Promises a prize, cashback or reward. Real prizes never require payment or personal details to unlock.' },
    { category: 'reward', points: 14, re: /\b(?:double your money|guaranteed (?:profit|return)|zero risk|risk[- ]?free (?:investment|return)|earn \$?\d[\d,.]* per (?:day|hour)|be your own boss)\b/i, text: 'Offers guaranteed or fast profits. “Guaranteed investment returns” are a fraud signature.' },
    { category: 'remote', points: 14, re: /\b(?:download|install)\b[^.!?\n]{0,40}\b(?:attachment|update|security app|apk)\b/i, text: 'Encourages opening an attachment or installing an “update”. Unknown files and side-loaded apps carry real malware risk.' }
  ];

  const TERMS = [
    { word: 'urgent', points: 5, category: 'pressure' },
    { word: 'immediately', points: 5, category: 'pressure' },
    { word: 'verify now', points: 7, category: 'pressure' },
    { word: 'act now', points: 5, category: 'pressure' },
    { word: 'limited time', points: 5, category: 'pressure' },
    { word: 'account closure', points: 6, category: 'pressure' },
    { word: 'avoid suspension', points: 6, category: 'pressure' },
    { word: 'unusual login', points: 6, category: 'pressure' },
    { word: 'you won', points: 6, category: 'reward' },
    { word: 'winner', points: 5, category: 'reward' },
    { word: 'prize', points: 5, category: 'reward' },
    { word: 'claim your', points: 5, category: 'reward' },
    { word: 'cashback', points: 4, category: 'reward' },
    { word: 'free gift', points: 6, category: 'reward' },
    { word: 'otp', points: 6, category: 'credential' },
    { word: 'one time password', points: 6, category: 'credential' },
    { word: 'kyc', points: 5, category: 'credential' },
    { word: 'cvv', points: 6, category: 'credential' },
    { word: 'gift card', points: 7, category: 'payment' },
    { word: 'bitcoin', points: 5, category: 'payment' },
    { word: 'cryptocurrency', points: 5, category: 'payment' },
    { word: 'wire transfer', points: 6, category: 'payment' },
    { word: 'parcel', points: 4, category: 'impersonation' },
    { word: 'customs', points: 5, category: 'impersonation' },
    { word: 'customer care', points: 4, category: 'impersonation' },
    { word: 'fraud department', points: 4, category: 'impersonation' }
  ];
  const TERM_CAPS = { pressure: 14, reward: 12, credential: 12, payment: 12, impersonation: 9 };

  function scanMessage(raw, opts) {
    const value = String(raw == null ? '' : raw).trim();
    if (!value) return { error: 'Paste a message to scan.' };
    if (value.length > 20000) return { error: 'That message is very long. Paste the key part of it (under 20,000 characters).' };

    const text = value.toLowerCase();
    const reasons = [];
    const add = (weight, t, category) => reasons.push({ weight, text: t, category });

    // Structured scam patterns + weighted wording are pooled per category,
    // then capped: several signals from one category must not over-stack.
    const pending = [];
    let rulesFired = 0;
    for (const rule of MESSAGE_RULES) {
      if (rule.re.test(value)) { pending.push({ category: rule.category, points: rule.points, text: rule.text }); rulesFired++; }
    }
    // Courier/customs "small fee to release your parcel" pattern — needs a
    // fee request AND delivery wording together, so ordinary fee talk alone
    // is never flagged.
    if (/\b(?:pay|settle|complete|cover)\b[^.!?\n]{0,40}\b(?:the\s+)?(?:small\s+)?(?:customs|courier|shipment|processing|release|delivery)\s+fee\b|\b(?:customs|release|processing)\s+fee\b[^.!?\n]{0,60}\b(?:parcel|package|shipment|delivery|order)\b/i.test(value)) {
      pending.push({ category: 'payment', points: 14, text: 'The message asks you to pay a fee so a parcel, order or delivery can be released or processed. Real couriers bill through their official app or website — never by reply link in a text.' });
      rulesFired++;
    }

    const groupedTerms = {};
    for (const t of TERMS) {
      if (text.includes(t.word)) {
        (groupedTerms[t.category] = groupedTerms[t.category] || { words: new Set(), points: 0 });
        groupedTerms[t.category].points += t.points;
        groupedTerms[t.category].words.add(t.word);
      }
    }
    for (const cat of Object.keys(groupedTerms)) {
      const g = groupedTerms[cat];
      pending.push({
        category: cat,
        points: g.points,
        text: 'Contains wording often used in scams: ' + formatList([...g.words].slice(0, 6)) + '. Wording alone is not proof of a scam.'
      });
    }

    const CAT_CAPS = { credential: 40, remote: 26, payment: 28, pressure: 16, impersonation: 24, reward: 24 };
    const byCat = {};
    pending.forEach((p) => { (byCat[p.category] = byCat[p.category] || []).push(p); });
    for (const cat of Object.keys(byCat)) {
      const items = byCat[cat];
      const total = items.reduce((s, i) => s + i.points, 0);
      const cap = CAT_CAPS[cat];
      if (cap !== undefined && total > cap) {
        const factor = cap / total;
        items.forEach((i) => { i.points = Math.max(1, Math.round(i.points * factor)); });
      }
      items.forEach((i) => add(Math.min(cap !== undefined ? cap : i.points, i.points), i.text, i.category));
    }

    // Links inside the message get the full link treatment
    const links = extractLinks(value);
    // Live reputation was fetched (by runScan) only for the first link.
    const scanned = links.slice(0, 4).map((l, i) => scanURL(l, { embedded: true, reputation: opts && opts.reputation && i === 0 ? opts.reputation : null }));
    const worst = scanned.filter((r) => !r.error).reduce((m, r) => Math.max(m, r.score), 0);
    if (links.length) {
      if (worst > 0) {
        const strongest = scanned.flatMap((r) => r.reasons || []).filter((r) => r.weight > 0).sort((a, b) => b.weight - a.weight)[0];
        add(Math.min(35, worst), 'Contains ' + (links.length === 1 ? 'a link' : links.length + ' links') + ', and the link checks scored ' + worst + '/100.' + (strongest ? ' ' + strongest.text : ''), 'links');
      } else {
        add(4, 'Contains a link. The destination itself showed few warning signs, but only open links you were expecting.', 'links');
      }
    }

    // Phone number present
    const phoneMatch = value.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d[\d\s.-]{8,17}\d)/);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 10) add(5, 'Includes a phone number. If you act, use the number published on the official website instead.', 'contact');

    // Writing style
    const letters = value.match(/[a-z]/gi) || [];
    const caps = value.match(/[A-Z]/g) || [];
    if (letters.length > 30 && caps.length / letters.length > 0.6) add(3, 'But if most of the message is written in capital letters, that is a pressure style rather than a proof of fraud.', 'style');
    if ((value.match(/!/g) || []).length >= 4) add(2, 'Repeated exclamation marks create manufactured excitement — a common scam-writing habit.', 'style');

    // Credibility relief: markers of legitimate communication reduce the
    // score, but never below zero and never below the positive evidence.
    const BENIGN = [
      { re: /\bunsubscribe\b/i, weight: -4, text: 'Includes an unsubscribe option, which is typical of legitimate bulk email rather than a personal scam attempt.' },
      { re: /\b(?:the (?:official|bank'?s?) (?:app|website|site)|official (?:app|website|site))\b/i, weight: -5, text: 'Directs you to the official app or website rather than a link in the message.' },
      { re: /\b(?:we|our team)\b[^.!?\n]{0,30}\bwill never\b|\bwill never (?:ask|call|share|email you)\b/i, weight: -5, text: 'States a no-ask policy, phrasing typical of genuine institution notices.' }
    ];
    let reliefTotal = 0;
    const reliefHits = [];
    for (const b of BENIGN) {
      if (b.re.test(value)) { reliefTotal += b.weight; reliefHits.push(b); }
    }
    const positives = reasons.reduce((s, r) => s + Math.max(0, r.weight), 0);
    if (reliefHits.length && positives > 0) {
      const factor = Math.min(1, positives / Math.abs(reliefTotal));
      reliefHits.forEach((b) => {
        const w = Math.round(b.weight * factor);
        if (w < 0) add(w, b.text, 'credibility');
      });
    }

    if (!reasons.length) {
      add(0, 'No common scam-typical patterns, links or requests were found in this text. Remember that a clean scan is not proof that a sender is genuine.', 'credibility');
    }
    reasons.forEach((r) => { delete r.tier; });

    const score = Math.max(1, Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0)));
    const intelConfirmed = !!(opts && opts.reputation && opts.reputation.verdict === 'threat' && opts.reputation.available);
    const reputationClean = !!(opts && opts.reputation && opts.reputation.verdict === 'clean' && opts.reputation.available);
    const checks = [
      { name: 'Scam-pattern sweep', state: 'ok', detail: rulesFired + ' pattern rule(s) matched' },
      { name: 'Link & contact review', state: links.length ? 'ok' : 'na', detail: links.length ? links.length + ' link(s) analysed' : 'no links present' },
      { name: 'AI message classifier', state: 'unavailable', detail: 'not configured — explainable rule analysis only' }
    ];
    if (opts && opts.reputation) {
      checks.push(...reputationChecks(opts.reputation));
    } else {
      checks.push({
        name: 'Live reputation lookup', state: links.length === 1 ? 'unavailable' : 'na',
        detail: links.length === 1 ? 'companion service not reachable — heuristic analysis only' : 'reputation is looked up for single-link messages; ' + (links.length ? links.length + ' links present so heuristics only' : 'no link present')
      });
    }
    return {
      kind: 'message', score, reasons, checks,
      intelConfirmed, reputationClean,
      meta: { label: 'Message text', links: links.slice(0, 5), length: value.length }
    };
  }

  /* ═════════════════════════════════════════════════════════════════
     Image / QR scanner
     ═════════════════════════════════════════════════════════════════ */
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  async function sniffImage(file) {
    let bytes;
    try {
      bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    } catch (e) {
      return {};
    }
    const eq = (...sig) => sig.every((b, i) => bytes[i] === b);
    if (eq(0x4d, 0x5a)) return { executable: true };                       // Windows exe/dll
    if (eq(0x7f, 0x45, 0x4c, 0x46)) return { executable: true };           // Linux ELF
    if (eq(0x50, 0x4b, 0x03, 0x04)) return { archive: true };              // zip/apk/docx
    if (eq(0x52, 0x61, 0x72, 0x21)) return { archive: true };              // rar
    if (eq(0x25, 0x50, 0x44, 0x46)) return { pdf: true };                  // pdf
    if (eq(0x89, 0x50, 0x4e, 0x47)) return { image: true };
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { image: true };
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return { image: true };
    if (eq(0x52, 0x49, 0x46, 0x46) &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { image: true };
    if (eq(0x42, 0x4d)) return { image: true };                            // bitmap
    return { unknown: true };
  }

  const loadImageSrc = (src) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });

  async function bitmapFromObjectUrl(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageSrc(url);
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Otsu threshold: pick the black/white split that separates the image
  // best, so washed-out or low-contrast QRs get a second, harsher chance.
  function otsuThreshold(img) {
    const d = img.data;
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) {
      hist[((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000) | 0]++;
    }
    const total = d.length / 4;
    let sumAll = 0;
    for (let t = 0; t < 256; t++) sumAll += t * hist[t];
    let sumB = 0, wB = 0, best = -1, thr = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sumAll - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = t; }
    }
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      const v = lum > thr ? 255 : 0;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    return d;
  }

  // Local per-block thresholding (Bradley-style): handles shadows and light
  // gradients across a photo — global thresholds fail on those.
  function adaptiveThreshold(img) {
    const d = img.data, w = img.width, h = img.height, n = w * h;
    const gray = new Uint8ClampedArray(n);
    for (let p = 0; p < n; p++) {
      gray[p] = (d[p * 4] * 299 + d[p * 4 + 1] * 587 + d[p * 4 + 2] * 114) / 1000;
    }
    const bs = Math.max(8, Math.round(Math.max(w, h) / 48));
    const bx = Math.ceil(w / bs), by = Math.ceil(h / bs);
    const sums = new Uint32Array(bx * by), counts = new Uint32Array(bx * by);
    for (let y = 0; y < h; y++) {
      const row = ((y / bs) | 0) * bx;
      for (let x = 0; x < w; x++) {
        const bi = row + ((x / bs) | 0);
        sums[bi] += gray[y * w + x];
        counts[bi]++;
      }
    }
    for (let y = 0; y < h; y++) {
      const row = ((y / bs) | 0) * bx;
      for (let x = 0; x < w; x++) {
        const bi = row + ((x / bs) | 0);
        const t = (sums[bi] / Math.max(1, counts[bi])) * 0.85;
        const p = y * w + x;
        const v = gray[p] < t ? 0 : 255;
        d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = v;
      }
    }
    return d;
  }

  // Stretch the faintest/faintest contrast to full black/white range.
  function autoContrast(img) {
    const d = img.data;
    let lo = 255, hi = 0;
    for (let i = 0; i < d.length; i += 16) {
      const lum = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
      if (lum < lo) lo = lum;
      if (lum > hi) hi = lum;
    }
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) {
      const v = ((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 - lo) * 255 / range;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    return d;
  }

  // Native barcode API (Chrome/Edge) — perspective-tolerant and robust.
  // Returns the raw payload, or null when unavailable/unsuccessful.
  async function nativeDetect(bitmap) {
    if (typeof window.BarcodeDetector !== 'function') return null;
    try {
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      let hits = await det.detect(bitmap);
      if ((!hits || !hits.length) && Math.max(bitmap.width, bitmap.height) > 1200) {
        const shrink = 1100 / Math.max(bitmap.width, bitmap.height);
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(bitmap.width * shrink));
        c.height = Math.max(1, Math.round(bitmap.height * shrink));
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bitmap, 0, 0, c.width, c.height);
        hits = await det.detect(c);
      }
      if (hits && hits.length && hits[0].rawValue) return hits[0].rawValue;
      return null;
    } catch (e) {
      return null;
    }
  }

  async function decodeQr(file) {
    const jsqr = window.jsQR;
    if (typeof jsqr !== 'function') return { error: 'unsupported' };
    console.info('[ThreatScan] QR decoder available: jsQR ' + (jsqr && jsqr.VERSION ? 'v' + jsqr.VERSION : '(bundled)'));
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch (e) {
      console.warn('[ThreatScan] createImageBitmap failed, trying <img> fallback:', e && e.message);
      try { bitmap = await bitmapFromObjectUrl(file); }
      catch (e2) { console.error('[ThreatScan] image could not be decoded to pixels:', e2); return { error: 'decode' }; }
    }
    try {
      console.info('[ThreatScan] decoding pixels: ' + bitmap.width + 'x' + bitmap.height + ' px');
      // 1. Native detector first (when the browser provides one)
      const native = await nativeDetect(bitmap);
      if (native) { console.info('[ThreatScan] decoded via native BarcodeDetector'); return { data: native }; }

      const bw = bitmap.width, bh = bitmap.height;
      const maxDim = Math.max(bw, bh);
      // 2. jsQR ladder. Each "view" is a region drawn to canvas at a target
      // fit size, with a white quiet-zone border added so QRs that touch the
      // screenshot edge still decode.
      const views = [];
      views.push({ sx: 0, sy: 0, sw: bw, sh: bh, fit: Math.min(1400, maxDim), deep: true });
      if (maxDim > 700) views.push({ sx: 0, sy: 0, sw: bw, sh: bh, fit: Math.min(700, maxDim), deep: true });
      if (maxDim < 240) {
        // very small images gain resolution from upscaling
        views.push({ sx: 0, sy: 0, sw: bw, sh: bh, fit: maxDim * 3 });
        views.push({ sx: 0, sy: 0, sw: bw, sh: bh, fit: maxDim * 2 });
      } else if (bw * bh >= 900 * 900) {
        // large composite images (page screenshots, posters): scan windows
        // over the corners, edges and center — the QR sits in one region
        const crops = [
          [0, 0, 0.62, 0.62], [0.38, 0, 0.62, 0.62], [0, 0.38, 0.62, 0.62], [0.38, 0.38, 0.62, 0.62],
          [0.19, 0, 0.62, 0.62], [0.19, 0.38, 0.62, 0.62],
          [0, 0.19, 0.62, 0.62], [0.38, 0.19, 0.62, 0.62],
          [0.12, 0.12, 0.76, 0.76]
        ];
        for (const [x, y, fw, fh] of crops) {
          views.push({
            sx: Math.round(bw * x), sy: Math.round(bh * y),
            sw: Math.round(bw * fw), sh: Math.round(bh * fh),
            fit: Math.min(1100, Math.round(Math.max(bw * fw, bh * fh)))
          });
        }
      }
      for (const view of views) {
        await nextFrame();
        const scale = Math.min(view.fit / Math.max(view.sw, view.sh), 4);
        const w = Math.max(1, Math.round(view.sw * scale));
        const h = Math.max(1, Math.round(view.sh * scale));
        const pad = Math.max(8, Math.round(Math.max(w, h) * 0.08));
        const canvas = document.createElement('canvas');
        canvas.width = w + pad * 2; canvas.height = h + pad * 2;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) continue;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = scale <= 1;
        try { ctx.drawImage(bitmap, view.sx, view.sy, view.sw, view.sh, pad, pad, w, h); } catch (e) { continue; }
        let img;
        try { img = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (e) { continue; }
        // Hand jsQR only a well-formed RGBA buffer: correct data length for the
        // declared width/height, one byte per channel, never empty.
        if (!img || !img.data
          || img.data.length !== img.width * img.height * 4
          || img.width < 1 || img.height < 1) continue;
        let found = jsqr(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
        if (found && found.data) return { data: found.data };
        if (view.deep) {
          // Recovery passes on this view: low-contrast stretch, then local
          // shadow-tolerant threshold, then global Otsu threshold. Each pass
          // destroys its input buffer (they bake it to grayscale/binary), so
          // every pass starts from a pristine copy of the raw pixels — the
          // original image data is never overwritten and later passes always
          // see the untouched image, not a prior pass's leftovers.
          for (const pass of [autoContrast, adaptiveThreshold, otsuThreshold]) {
            found = jsqr(
              pass({ data: new Uint8ClampedArray(img.data), width: img.width, height: img.height }),
              img.width, img.height, { inversionAttempts: 'attemptBoth' }
            );
            if (found && found.data) return { data: found.data };
          }
        }
      }
      return {
        data: null,
        tried: views.length,
        width: bw, height: bh,
        nativeAvailable: typeof window.BarcodeDetector === 'function'
      };
    } finally {
      if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    }
  }

  // Classifies a decoded QR payload. URL payloads fully delegate to scanURL
  // and text payloads fully delegate to scanMessage, so the image tab reports
  // the dedicated scanner's own score/reasons/checks — never re-blended
  // copies. App schemes (wifi:, tel:, …) keep their own explainable rules.
  // Debug logs stay content-light: payload type and length only.
  async function classifyQrPayload(content, reputation) {
    const text = String(content || '').trim();
    if (!text) {
      return {
        kind: 'raw', score: 0, unverifiable: true, checks: [],
        reasons: [{ weight: 0, category: 'qr', text: 'The QR code decoded to empty content. Check the original sticker or surface before trusting it.' }]
      };
    }
    const looksLink = /^https?:\/\//i.test(text);
    const looksScheme = /^[a-z][a-z0-9+.-]*:/i.test(text);
    console.info('[ThreatScan] QR payload type: ' + (looksLink ? 'link' : looksScheme ? 'app-scheme' : 'text') + ', length ' + text.length);

    if (looksLink) {
      const link = scanURL(text, { reputation: reputation || null });
      if (link.error) {
        console.warn('[ThreatScan] URL scanner could not process the decoded link:', link.error);
        return {
          kind: 'raw', score: 15, unverifiable: true, checks: [],
          reasons: [{ weight: 15, category: 'qr', text: 'The QR contains a link that could not be analysed reliably (' + link.error + ').' }]
        };
      }
      return {
        kind: 'url', delegated: true, score: link.score, reasons: link.reasons, checks: link.checks || [],
        intelConfirmed: !!link.intelConfirmed, reputationClean: !!link.reputationClean, unverifiable: !!link.unverifiable
      };
    }

    if (looksScheme) {
      const scheme = text.slice(0, text.indexOf(':')).toLowerCase();
      let row;
      if (scheme === 'wifi') row = { weight: 18, category: 'qr', text: 'This QR makes your device join a Wi-Fi network. Only connect to networks you trust.' };
      else if (scheme === 'otpauth') row = { weight: 0, category: 'qr', text: 'This QR adds a two-factor code to an authenticator app. Only use it if you started the setup yourself.' };
      else if (['tel', 'sms', 'mailto', 'geo', 'vcard', 'mecard'].includes(scheme)) row = { weight: 5, category: 'qr', text: 'This QR starts a “' + scheme + ':” action instead of opening a website. Check its details before continuing.' };
      else row = { weight: 30, category: 'qr', text: 'This QR uses the “' + scheme + ':” app scheme, which can trigger a prepared action in another app. Only continue if you trust the source.' };
      return { kind: 'raw', score: row.weight, checks: [], reasons: [row] };
    }

    const msg = scanMessage(text);
    if (msg.error) {
      console.warn('[ThreatScan] message scanner could not process the decoded text:', msg.error);
      return {
        kind: 'raw', score: 5, unverifiable: true, checks: [],
        reasons: [{ weight: 5, category: 'qr', text: 'The QR contained text that could not be analysed (' + msg.error + '). Confirm who placed the code before acting on it.' }]
      };
    }
    return {
      kind: 'message', delegated: true, score: msg.score, reasons: msg.reasons, checks: msg.checks || [],
      intelConfirmed: !!msg.intelConfirmed, reputationClean: !!msg.reputationClean,
      meta: { label: msg.meta.label, links: msg.meta.links, length: msg.meta.length }
    };
  }

  async function scanImage(file) {
    if (!file) return { error: 'Choose an image first.' };
    if (file.size > MAX_IMAGE_BYTES) return { error: 'That image is larger than 10 MB. Try a smaller screenshot or export.' };

    console.info('[ThreatScan] image scan: name=' + (file.name || '(unnamed)') + ', type=' + (file.type || '(none)') + ', size=' + file.size);
    const checks = [{ name: 'File type inspection', state: 'ok', detail: 'contents compared against real image signatures' }];
    const name = (file.name || 'image').toLowerCase();
    const typeOk = ALLOWED_IMAGE_TYPES.includes(file.type);
    const extOk = /\.(?:png|jpe?g|webp|gif)$/i.test(name);
    if (!typeOk && !extOk) return { error: 'That file type is not supported yet. Choose a PNG, JPG, WEBP or GIF image.' };
    if (!file.size) {
      return {
        kind: 'image', score: 30, checks,
        reasons: [{ weight: 30, category: 'file', text: 'The file is empty and cannot be inspected.' }],
        meta: { label: file.name || 'Image' }
      };
    }
    checks.push({ name: 'File size', state: 'ok', detail: Math.max(1, Math.round(file.size / 1024)) + ' KB — inspected in memory, never opened externally' });

    const reasons = [];
    const add = (weight, text, category) => reasons.push({ weight, text, category });
    const meta = { label: file.name || 'Image', decoded: null, decodedType: null, decodedLink: null };

    if (!typeOk && extOk) add(4, 'The browser reported an unusual file type; the contents were checked directly instead.', 'file');

    const sig = await sniffImage(file);
    if (sig.executable) add(85, 'The file contents start like a program (EXE/ELF), not an image — malware is frequently disguised this way. Do not open it.', 'file');
    else if (sig.archive) add(55, 'The contents look like a ZIP/APK archive rather than an image. Do not install or open it.', 'file');
    else if (sig.pdf) add(40, 'This is actually a PDF, despite appearing as an image. Treat unexpected documents with caution.', 'file');
    else if (sig.unknown) {
      // Claims to be an image (extension/type) but matches no known image,
      // document or program signature — a validation failure, not a score.
      return { error: 'That file is not a valid image. Its contents do not match any supported image format (PNG, JPG, WEBP, GIF, BMP).' };
    }
    else if (!sig.image) add(30, 'The file contents could not be read for signature inspection. The preview may not be what the file claims to be.', 'file');
    checks.push({ name: 'Content signature', state: sig.image ? 'ok' : 'fail', detail: sig.image ? 'valid image data' : 'contents are not a standard image' });

    if ((name.match(/\./g) || []).length >= 2) add(12, 'The filename contains multiple extensions, a technique used to hide the real file type.', 'file');
    if (file.size > 8 * 1024 * 1024) add(4, 'The image is unusually large. Size alone does not make it unsafe.', 'file');

    let child = null;   // delegated scanURL / scanMessage result, or a 'raw' QR rule
    if (sig.image) {
      await nextFrame();
      let qr = null;
      try {
        qr = await decodeQr(file);
      } catch (err) {
        // The decoder threw instead of returning a result — surface it; never
        // let an exception become a low-risk "successful scan".
        console.error('[ThreatScan] QR decoding threw an error:', err);
        qr = { error: 'throw' };
      }
      // Debug aid: show the decoded QR text as soon as it is available,
      // before it is handed to the URL or message scanner (truncated).
      if (qr && qr.data !== null && qr.data) {
        const dbg = String(qr.data);
        console.info('[ThreatScan] QR decoded: "' + (dbg.length > 160 ? dbg.slice(0, 160) + '… (' + dbg.length + ' chars)' : dbg) + '"');
      }
      if (qr && qr.error === 'unsupported') {
        checks.push({ name: 'QR decode', state: 'unavailable', detail: 'QR decoder (jsQR) did not load in this browser' });
        add(0, 'The QR decoder did not load in this browser, so the QR content could not be checked. Only file-level checks were performed.', 'qr');
      } else if (qr && qr.error) {
        checks.push({ name: 'QR decode', state: 'fail', detail: 'decoder error while processing the image pixels' });
        add(0, 'The QR decoder hit an error while processing this image, so its content could not be checked. Only file-level checks were performed.', 'qr');
      } else if (qr && qr.data !== null) {
        checks.push({ name: 'QR decode', state: 'ok', detail: 'QR data extracted successfully' });
        // Live reputation for the decoded link (local key-protected service).
        let rep = null;
        if (/^https?:\/\//i.test(String(qr.data))) {
          rep = await fetchReputation(qr.data);
          checks.push(...appendReputation(rep));
        }
        child = await classifyQrPayload(qr.data, rep);
        // Fill the decoded-content display regardless of which path ran.
        const payload = String(qr.data || '').trim();
        meta.decoded = payload || '(empty)';
        if (/^https?:\/\//i.test(payload)) { meta.decodedType = 'link'; meta.decodedLink = payload; }
        else if (/^[a-z][a-z0-9+.-]*:/i.test(payload)) meta.decodedType = payload.slice(0, payload.indexOf(':')).toLowerCase();
        else meta.decodedType = payload ? 'text' : 'empty';
      } else {
        const dims = qr && qr.width ? qr.width + 'x' + qr.height : 'unknown size';
        const okNative = qr && qr.nativeAvailable;
        checks.push({
          name: 'QR decode', state: 'fail',
          detail: 'no readable QR code found after ' + ((qr && qr.tried) || 1) + ' scale/crop pass(es) on the '
            + dims + ' px image (' + (okNative ? 'native detector tried, jsQR ladder tried'
              : 'native detector unavailable in this browser, jsQR ladder tried')
            + ': full view, rescaling, quiet-zone padding, both colour inversions, contrast/threshold recovery)'
        });
        add(0, 'No QR code detected. Try a clearer or different image. Straight, well-lit, square close-ups of just the code work best; sharp angles, blur, glare or cropping can prevent decoding.', 'qr');
        add(0, 'Only QR decoding (and the file checks above) was attempted — the rest of the image was not security-verified, because the app does not interpret arbitrary photos.', 'file');
      }
    } else {
      checks.push({ name: 'QR decode', state: 'na', detail: 'skipped — file is not a confirmed image' });
      add(0, 'Because the file is not a confirmed image, QR decoding was skipped.', 'qr');
    }

    // ── result assembly ────────────────────────────────────────────────
    // URL/text QR payloads fully delegate to the dedicated scanners: their
    // score, reasons, checks and status pass through unchanged, prefixed by a
    // scope note. A decoded app-scheme/empty payload keeps its own rule score.
    // When no QR could be read there is no measurable content — the score
    // stays 0 and the status becomes "Unable to Verify" (never a fabricated
    // low-risk verdict).
    if (child && (child.kind === 'url' || child.kind === 'message')) {
      const scopeNote = child.kind === 'url'
        ? { weight: 0, category: 'credibility', text: 'This assessment is the URL scanner’s full result for the decoded link shown below, reported through the image scanner. Links are never opened automatically.' }
        : { weight: 0, category: 'credibility', text: 'This assessment is the message scanner’s full result for the decoded text, reported through the image scanner.' };
      // Reputation rows were already merged above; keep child-only checks.
      const seen = new Set(checks.map((c) => c.name));
      const extraChecks = (child.checks || []).filter((c) => !seen.has(c.name));
      return {
        kind: 'image', score: Math.max(1, Math.min(100, child.score)),
        reasons: [scopeNote].concat(child.reasons),
        checks: checks.concat(extraChecks),
        intelConfirmed: !!child.intelConfirmed,
        reputationClean: !!child.reputationClean,
        meta
      };
    }

    // File-level rows + (possibly) a raw QR child (app scheme / empty payload).
    if (child && child.reasons) reasons.push(...child.reasons);
    const positiveSignal = reasons.some((r) => (r.weight || 0) > 0);
    // No child at all means decoding failed or found nothing: the content is
    // unverifiable whenever there is no explicit file-level threat either.
    const unverifiable = child
      ? (!!child.unverifiable && !positiveSignal)
      : (sig.image && !positiveSignal);
    const score = unverifiable ? 0 : Math.max(1, Math.min(100, reasons.reduce((sum, r) => sum + r.weight, 0)));
    return {
      kind: 'image', score, reasons, checks, meta,
      intelConfirmed: false,
      reputationClean: false,
      unverifiable
    };
  }

  /* ═════════════════════════════════════════════════════════════════
     DOM references & state
     ═════════════════════════════════════════════════════════════════ */
  const urlInput = $('urlInput');
  const messageInput = $('messageInput');
  const imageInput = $('imageInput');
  const dropzone = $('dropzone');
  const filePreview = $('filePreview');
  const fileThumb = $('fileThumb');
  const fileName = $('fileName');
  const fileMeta = $('fileMeta');
  const clearFileBtn = $('clearFile');
  const scanError = $('scanError');
  const scanBtn = $('scanBtn');
  const scanBtnLabel = $('scanBtnLabel');
  const clearBtn = $('clearBtn');
  const consoleStatus = $('consoleStatus');
  const messageCount = $('messageCount');
  const resultEmpty = $('resultEmpty');
  const resultCard = $('resultCard');
  const ringValue = $('ringValue');
  const scoreNum = $('scoreNum');
  const bandPill = $('bandPill');
  const verdictEl = $('verdict');
  const resultSummary = $('resultSummary');
  const resultType = $('resultType');
  const resultLabelEl = $('resultLabel');
  const resultTime = $('resultTime');
  const copyResultBtn = $('copyResult');
  const breakdown = $('breakdown');
  const breakdownList = $('breakdownList');
  const reasonsEl = $('reasons');
  const reasonsEmpty = $('reasonsEmpty');
  const decodedBlock = $('decodedBlock');
  const decodedType = $('decodedType');
  const decodedText = $('decodedText');
  const copyDecodedBtn = $('copyDecoded');
  const assessmentRow = $('assessmentRow');
  const checksFold = $('checksFold');
  const checksList = $('checksList');
  const checksUnavailNote = $('checksUnavailNote');
  const actionBlock = $('actionBlock');
  const actionText = $('actionText');
  const scanDecodedBtn = $('scanDecoded');
  const historyList = $('historyList');
  const clearHistoryBtn = $('clearHistory');
  const chatLog = $('chatLog');
  const chatForm = $('chatForm');
  const chatInput = $('chatInput');
  const clearChatBtn = $('clearChat');
  const checklistList = $('checklistList');
  const checklistProgress = $('checklistProgress');
  const checklistCount = $('checklistCount');
  const checklistRing = $('checklistRing');
  const checklistBar = $('checklistBar');
  const themeToggle = $('themeToggle');
  const toastEl = $('toast');

  const tabButtons = [...document.querySelectorAll('.tab')];
  const tabs = ['url', 'message', 'image'];
  let activeTab = 'url';
  let lastResult = null;

  const hide = (el) => { if (el) el.hidden = true; };
  const show = (el) => { if (el) el.hidden = false; };

  /* ── toast ────────────────────────────────────────────────────── */
  let toastTimer = null;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    requestAnimationFrame(() => toastEl.classList.add('is-visible'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
      setTimeout(() => { toastEl.hidden = true; }, 300);
    }, 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  /* ── theme ────────────────────────────────────────────────────── */
  function syncTheme() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#070d0a' : '#f4f5f0');
  }
  themeToggle.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('threatscan.theme', theme); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  /* ── tabs ─────────────────────────────────────────────────────── */
  function setTab(tab, focusTab) {
    activeTab = tab;
    tabButtons.forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
      if (active && focusTab) btn.focus();
    });
    tabs.forEach((t) => { $('panel-' + t).hidden = t !== tab; });
    hideError();
  }
  tabButtons.forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  tabButtons.forEach((btn) => btn.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const idx = tabs.indexOf(activeTab);
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    setTab(tabs[next], true);
  }));

  /* ── scan errors & busy state ─────────────────────────────────── */
  function fail(message, el) {
    scanError.textContent = message;
    show(scanError);
    if (el) el.setAttribute('aria-invalid', 'true');
    if (el && typeof el.focus === 'function' && el.offsetParent) {
      el.focus({ preventScroll: true });
    } else {
      scanBtn.focus({ preventScroll: true });
    }
    scanError.scrollIntoView({ block: 'nearest', behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  }
  function hideError() {
    hide(scanError);
    [urlInput, messageInput, imageInput].forEach((el) => el.removeAttribute('aria-invalid'));
  }
  urlInput.addEventListener('input', hideError);
  messageInput.addEventListener('input', hideError);
  imageInput.addEventListener('change', hideError);

  let scanning = false;
  function setBusy(busy) {
    scanBtn.classList.toggle('is-loading', busy);
    scanBtn.disabled = busy;
    scanBtnLabel.textContent = busy ? 'Scanning…' : 'Scan now';
    consoleStatus.innerHTML = '<span class="dot" aria-hidden="true"></span> ' + (busy ? 'Scanning' : 'Ready');
    consoleStatus.classList.toggle('is-busy', busy);
  }

  /* ── history ──────────────────────────────────────────────────── */
  const HISTORY_KEY = 'threatscan.history.v1';
  const MAX_HISTORY = 20;
  function loadHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((x) => x && typeof x.label === 'string' && Number.isFinite(x.score)).slice(0, MAX_HISTORY);
    } catch (e) { return []; }
  }
  let history = loadHistory();
  function persistHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch (e) {}
  }
  function addHistory(data, band) {
    const item = { kind: data.kind, label: data.kind === 'message' ? 'Message scan' : (data.meta.label || 'Scan'), score: data.score, band: band.key, at: Date.now() };
    if (data.kind === 'url' && data.meta.host) item.host = data.meta.host;
    const prev = history[0];
    if (prev && prev.kind === item.kind && prev.label === item.label && prev.score === item.score && Date.now() - prev.at < 30000) {
      prev.at = item.at;
    } else {
      history.unshift(item);
    }
    history = history.slice(0, MAX_HISTORY);
    persistHistory();
    renderHistory();
  }
  function timeAgo(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return m + (m === 1 ? ' min ago' : ' min ago');
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    const d = Math.round(h / 24);
    if (d < 7) return d + ' d ago';
    return new Date(ts).toLocaleDateString();
  }

  const KIND_ICONS = {
    url: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2.4-2.4a5 5 0 0 0-7.1-7.1L11 4.9"/><path d="M14 11a5 5 0 0 0-7.1 0L4.5 13.4a5 5 0 0 0 7.1 7.1L13 19.1"/></svg>',
    message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17H9l-5 4V6.5A1.5 1.5 0 0 1 5 5Z"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5.5 17 4.5-4.5 3 3L17 8.5l3 3"/></svg>'
  };

  function renderHistory() {
    historyList.innerHTML = '';
    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><span>Nothing scanned yet. Your recent scans will be listed here.</span>';
      historyList.appendChild(empty);
      return;
    }
    history.slice(0, 8).forEach((item) => {
      const isUrl = item.kind === 'url' && item.host;
      const row = document.createElement(isUrl ? 'button' : 'div');
      row.className = 'history-item';
      row.dataset.band = ({ safe: 'low', dangerous: 'high' })[item.band] || item.band;
      if (isUrl) {
        row.type = 'button';
        row.title = 'Scan ' + item.host + ' again';
        row.setAttribute('aria-label', 'Scan ' + item.host + ' again');
        row.addEventListener('click', () => {
          setTab('url');
          urlInput.value = 'https://' + item.host;
          runScan();
        });
      }
      const icon = document.createElement('span');
      icon.className = 'history-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = KIND_ICONS[item.kind] || KIND_ICONS.url;   // static markup only
      const label = document.createElement('span');
      label.className = 'history-label';
      const strong = document.createElement('strong');
      strong.textContent = shorten(item.label, 60);
      const small = document.createElement('small');
      small.textContent = (item.kind === 'url' ? 'Link' : item.kind === 'message' ? 'Message' : 'Image') + ' · ' + timeAgo(item.at);
      label.append(strong, small);
      const score = document.createElement('span');
      score.className = 'history-score';
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.setAttribute('aria-hidden', 'true');
      score.append(dot);
      const num = document.createElement('b');
      num.textContent = item.score + '/100';
      score.append(dot, num);
      row.append(icon, label, score);
      historyList.appendChild(row);
    });
  }
  clearHistoryBtn.addEventListener('click', () => {
    history = [];
    persistHistory();
    renderHistory();
    toast('Scan history cleared');
  });

  /* ── file selection, drag & drop, paste ───────────────────────── */
  let selectedFile = null;
  let sampleFile = null;
  let thumbUrl = null;

  function renderFilePreview(file) {
    if (thumbUrl) { URL.revokeObjectURL(thumbUrl); thumbUrl = null; }
    if (!file) {
      filePreview.hidden = true;
      dropzone.classList.remove('has-file');
      fileThumb.removeAttribute('src');
      return;
    }
    fileName.textContent = shorten(file.name || 'Selected image', 42);
    fileMeta.textContent = fmtBytes(file.size) + ' · ' + (file.type || 'unknown type');
    filePreview.hidden = false;
    dropzone.classList.add('has-file');
    thumbUrl = URL.createObjectURL(file);
    fileThumb.src = thumbUrl;
    fileThumb.alt = 'Preview of the selected image';
  }

  function useFile(file) {
    selectedFile = file;
    sampleFile = null;
    renderFilePreview(file);
    hideError();
  }
  function clearFileSelection() {
    selectedFile = null;
    sampleFile = null;
    try { imageInput.value = ''; } catch (e) {}
    renderFilePreview(null);
  }
  imageInput.addEventListener('change', () => {
    const file = imageInput.files && imageInput.files[0];
    if (file) useFile(file);
  });
  clearFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearFileSelection();
    imageInput.focus();
  });

  dropzone.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('label')) return;
    if (!selectedFile) imageInput.click();
  });

  ['dragenter', 'dragover'].forEach((type) => dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragging');
  }));
  ['dragleave', 'drop'].forEach((type) => dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragging');
  }));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      useFile(file);
      toast('Image added — ready to scan');
    }
  });

  document.addEventListener('paste', (e) => {
    if (!e.clipboardData) return;
    const imgs = [...e.clipboardData.items].filter((i) => i.type.startsWith('image/'));
    if (!imgs.length) return;
    const file = imgs[0].getAsFile();
    if (!file) return;
    e.preventDefault();
    setTab('image');
    useFile(file);
    toast('Image pasted from clipboard');
  });

  async function loadSampleImage() {
    if (sampleFile) return sampleFile;
    const res = await fetch(SAMPLE_QR);
    const blob = await res.blob();
    sampleFile = new File([blob], 'sample-qr-code.webp', { type: blob.type || 'image/webp' });
    return sampleFile;
  }

  /* ── console input refs for clear/paste ───────────────────────── */
  $('pasteUrl').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        urlInput.focus();
        hideError();
      }
    } catch (err) {
      fail('Pasting was blocked by the browser. Use Ctrl+V in the field instead.', null);
    }
  });
  messageInput.addEventListener('input', () => {
    const n = messageInput.value.length;
    messageCount.textContent = n + (n === 1 ? ' character' : ' characters');
  });

  ['urlInput', 'messageInput'].forEach((id) => $(id).addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const isTextarea = e.target === messageInput;
    if (isTextarea && !e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    runScan();
  }));

  /* ── samples ──────────────────────────────────────────────────── */
  const SAMPLES = {
    url: 'https://paypa1-secure-login.top/verify/account?session=expired',
    message: 'URGENT: Your bank account will be blocked within 24 hours. Update your KYC now at http://sbi-kyc-verify.top/update and confirm your details. Do not ignore this final notice!'
  };
  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const kind = btn.dataset.sample;
      if (kind === 'url') {
        setTab('url');
        urlInput.value = SAMPLES.url;
        runScan();
      } else if (kind === 'message') {
        setTab('message');
        messageInput.value = SAMPLES.message;
        messageCount.textContent = SAMPLES.message.length + ' characters';
        runScan();
      } else {
        try {
          const file = await loadSampleImage();
          setTab('image');
          useFile(file);
          runScan();
        } catch (err) {
          fail('The sample image could not be loaded. Choose your own image instead.', null);
        }
      }
      resultCard.scrollIntoView({ block: 'start', behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
    });
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    messageInput.value = '';
    messageCount.textContent = '0 characters';
    clearFileSelection();
    hideError();
    resetResult();
    lastResult = null;
    if (activeTab === 'url') urlInput.focus();
    else if (activeTab === 'message') messageInput.focus();
  });

  /* ── result rendering ─────────────────────────────────────────── */
  let scoreAnim = null;
  let scoreAnimToken = 0;
  // Belt & braces: when the tab becomes visible again (or was never visible),
  // re-sync the score display from the last real result. Display state can
  // never drift away from the computed score.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && lastResult) scoreNum.textContent = String(lastResult.score);
  });

  function animateScore(target) {
    if (scoreAnim) cancelAnimationFrame(scoreAnim);
    const token = ++scoreAnimToken;
    // Land on the correct value immediately; the sweep below is cosmetic only.
    // (Timers and rAF are throttled in background tabs, so correct final text
    // must never depend on them completing.)
    scoreNum.textContent = String(target);
    if (REDUCE_MOTION || document.visibilityState !== 'visible') return;
    const start = performance.now();
    const dur = 700;
    const from = 0;
    const tick = (now) => {
      if (token !== scoreAnimToken) return;
      if (document.visibilityState !== 'visible') { scoreNum.textContent = String(target); return; }
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      scoreNum.textContent = String(Math.round(from + (target - from) * eased));
      if (p < 1) scoreAnim = requestAnimationFrame(tick);
    };
    scoreAnim = requestAnimationFrame(tick);
  }

  function resetResult() {
    hide(resultCard);
    show(resultEmpty);
    decodedText.textContent = '';
    reasonsEl.innerHTML = '';
    breakdownList.innerHTML = '';
    assessmentRow.innerHTML = '';
    checksFold.hidden = true;
    checksList.innerHTML = '';
    hide(actionBlock);
    hide(decodedBlock);
    lastResult = null;
  }

  function kindLabel(kind) {
    return kind === 'url' ? 'Link' : kind === 'message' ? 'Message' : 'Image';
  }

  function renderResult(data) {
    const band = bandFor(data.score);
    lastResult = { kind: data.kind, score: data.score, band: band.key, reasons: data.reasons, checks: data.checks, status: data.status, confidence: data.confidence, action: data.action, meta: data.meta, at: Date.now() };

    hide(resultEmpty);
    show(resultCard);
    resultCard.dataset.band = band.key;

    // ring
    ringValue.style.strokeDashoffset = String(RING_C);
    void ringValue.getBoundingClientRect();
    ringValue.style.strokeDashoffset = String(RING_C * (1 - data.score / 100));
    animateScore(data.score);

    bandPill.textContent = data.unverifiable ? 'Not assessable — no content to score' : band.label;
    verdictEl.textContent = data.unverifiable ? 'Content could not be verified' : band.verdict;
    resultSummary.textContent = band.summary;
    resultType.textContent = kindLabel(data.kind);
    resultLabelEl.textContent = data.meta && data.meta.label ? shorten(data.meta.label, 70) : '';
    resultLabelEl.hidden = !(data.meta && data.meta.label);
    resultTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Assessment row: detection status + confidence (independent of risk).
    assessmentRow.innerHTML = '';
    const statusChip = document.createElement('span');
    statusChip.className = 'status-chip';
    statusChip.dataset.level = data.unverifiable ? 'unverified' : data.intelConfirmed ? 'confirmed'
      : data.status === STATUSES.NONE ? 'none' : 'suspicious';
    statusChip.textContent = 'Status: ' + data.status;
    const confChip = document.createElement('span');
    confChip.className = 'conf-chip';
    confChip.dataset.level = String(data.confidence || 'Low').toLowerCase();
    confChip.textContent = 'Confidence: ' + (data.confidence || 'Low');
    assessmentRow.append(statusChip, confChip);

    // Checks performed — including the ones that could not run.
    const checks = data.checks || [];
    if (checks.length) {
      checksList.innerHTML = '';
      const ICON = { ok: '✓', fail: '✕', warn: '!', unavailable: '–', na: '·' };
      let unavailable = 0;
      checks.forEach((c) => {
        if (c.state === 'unavailable') unavailable++;
        const li = document.createElement('li');
        const mark = document.createElement('span');
        mark.className = 'check-mark';
        mark.dataset.state = c.state;
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = ICON[c.state] || '·';
        const name = document.createElement('span');
        name.className = 'check-name';
        name.textContent = c.name;
        const detail = document.createElement('span');
        detail.className = 'check-detail';
        detail.textContent = c.detail || '';
        li.append(mark, name, detail);
        checksList.append(li);
      });
      checksUnavailNote.textContent = unavailable
        ? unavailable + ' check' + (unavailable > 1 ? 's were' : ' was') + ' not available. Those checks are excluded from the score — the result reflects heuristics only and is never a full vetting.'
        : 'Every planned check ran with the configuration available on this device.';
      checksUnavailNote.hidden = false;
      checksFold.hidden = false;
      checksFold.open = false;
    } else {
      checksFold.hidden = true;
    }

    // Recommended next steps
    if (data.action) {
      actionText.textContent = data.action;
      show(actionBlock);
    } else hide(actionBlock);

    // reasons
    reasonsEl.innerHTML = '';
    const scored = data.reasons.filter((r) => r.weight > 0).sort((a, b) => b.weight - a.weight);
    const relief = data.reasons.filter((r) => r.weight < 0);
    const info = data.reasons.filter((r) => r.weight === 0);
    if (!scored.length && !relief.length && !info.length) show(reasonsEmpty); else hide(reasonsEmpty);
    [...scored, ...relief, ...info].forEach((r) => {
      const li = document.createElement('li');
      li.className = 'reason';
      li.dataset.severity = r.weight >= 20 ? 'danger' : r.weight >= 8 ? 'warn' : r.weight < 0 ? 'safe' : 'info';
      const mark = document.createElement('span');
      mark.className = 'reason-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = r.weight >= 20 ? '!' : r.weight >= 8 ? '•' : r.weight < 0 ? '✓' : 'i';
      const t = document.createElement('span');
      t.textContent = r.text;
      li.append(mark, t);
      if (r.weight !== 0) {
        const w = document.createElement('span');
        w.className = 'reason-weight';
        w.textContent = (r.weight > 0 ? '+' : '−') + Math.abs(r.weight);
        w.setAttribute('aria-label', (r.weight > 0 ? 'added ' : 'removed ') + Math.abs(r.weight) + ' points');
        li.append(w);
      }
      reasonsEl.append(li);
    });

    // breakdown
    const groups = {};
    data.reasons.forEach((r) => { groups[r.category] = (groups[r.category] || 0) + r.weight; });
    const entries = Object.entries(groups).filter(([, v]) => v !== 0).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    breakdown.hidden = entries.length === 0;
    breakdownList.innerHTML = '';
    const max = entries.length ? Math.max.apply(null, entries.map(([, v]) => Math.abs(v))) : 0;
    entries.forEach(([cat, weight]) => {
      const li = document.createElement('li');
      li.className = 'cat-row';
      const label = document.createElement('span');
      label.className = 'cat-label';
      label.textContent = CATEGORIES[cat] || cat;
      const bar = document.createElement('span');
      bar.className = 'cat-bar';
      const fill = document.createElement('span');
      fill.className = 'cat-fill';
      if (weight < 0) fill.style.background = 'var(--safe)';
      bar.append(fill);
      const val = document.createElement('span');
      val.className = 'cat-value';
      val.textContent = (weight > 0 ? '+' : '−') + Math.abs(weight);
      val.setAttribute('aria-label', Math.abs(weight) + ' of ' + data.score + ' points, ' + (weight > 0 ? 'negative' : 'helping'));
      li.append(label, bar, val);
      breakdownList.append(li);
      void fill.getBoundingClientRect();
      fill.style.width = max ? Math.max(8, Math.round((Math.abs(weight) / max) * 100)) + '%' : '0%';
    });

    // decoded content
    if (data.meta && data.meta.decoded) {
      decodedType.textContent = data.meta.decodedType || 'text';
      decodedText.textContent = data.meta.decoded;
      scanDecodedBtn.dataset.link = data.meta.decodedLink || '';
      scanDecodedBtn.hidden = !data.meta.decodedLink;
      show(decodedBlock);
    } else {
      hide(decodedBlock);
    }

    addHistory(data, band);

    const rect = resultCard.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.7) {
      resultCard.scrollIntoView({ block: 'start', behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
    }
  }

  function resultTextFor(data) {
    const band = bandFor(data.score);
    const lines = [
      'ThreatScan result — ' + data.score + '/100 (' + band.label + ')',
      'Status: ' + (data.status || 'not assessed') + ' · Confidence: ' + (data.confidence || 'Low'),
      kindLabel(data.kind) + (data.meta && data.meta.label ? ' · ' + data.meta.label : ''),
      '',
      band.summary
    ];
    if (data.action) lines.push('', 'Recommended: ' + data.action);
    const signals = data.reasons.filter((r) => r.weight !== 0);
    if (signals.length) {
      lines.push('', 'Signals:');
      signals.forEach((r) => lines.push((r.weight > 0 ? '+' : '−' ) + Math.abs(r.weight) + ' — ' + r.text));
    }
    const unavailable = (data.checks || []).filter((c) => c.state === 'unavailable');
    if (unavailable.length) {
      lines.push('', 'Checks not available (excluded from score):');
      unavailable.forEach((c) => lines.push('- ' + c.name));
    }
    if (data.meta && data.meta.decoded) lines.push('', 'Decoded QR content: ' + data.meta.decoded);
    return lines.join('\n');
  }

  copyResultBtn.addEventListener('click', async () => {
    if (!lastResult) return;
    const ok = await copyText(resultTextFor(lastResult));
    toast(ok ? 'Result copied to clipboard' : 'Copying is not available in this browser');
  });
  copyDecodedBtn.addEventListener('click', async () => {
    const ok = await copyText(decodedText.textContent || '');
    toast(ok ? 'Decoded content copied' : 'Copying is not available in this browser');
  });
  scanDecodedBtn.addEventListener('click', () => {
    setTab('url');
    urlInput.value = scanDecodedBtn.dataset.link || '';
    runScan();
    resultCard.scrollIntoView({ block: 'start', behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  });

  async function runScan() {
    if (scanning) return;
    hideError();
    const tab = activeTab;
    const input = tab === 'url' ? urlInput : tab === 'message' ? messageInput : imageInput;

    if (tab === 'url' && !urlInput.value.trim()) return fail('Enter a link to scan.', urlInput);
    if (tab === 'message' && !messageInput.value.trim()) return fail('Paste a message to scan.', messageInput);
    const file = selectedFile || sampleFile;
    if (tab === 'image' && !file) return fail('Choose an image to scan, or try the QR sample below.', null);

    scanning = true;
    setBusy(true);
    await nextFrame();
    let data;
    try {
      if (tab === 'url') {
        // Optional live reputation via the local key-protected companion
        // service; never blocks a heuristic-only result when unavailable.
        const reputation = await fetchReputation(urlInput.value.trim());
        data = scanURL(urlInput.value, { reputation });
      } else if (tab === 'message') {
        // Reputation lookups apply to a message's sole link; multiple links
        // stay heuristic and are labelled as such in the checks list.
        const links = extractLinks(messageInput.value);
        const reputation = links.length === 1 ? await fetchReputation(links[0]) : null;
        data = scanMessage(messageInput.value, { reputation });
      }
      else data = await scanImage(file);
    } catch (err) {
      console.error('scan failed', err);
      data = { error: 'The scan could not finish. Try again with different content.' };
    }
    scanning = false;
    setBusy(false);

    if (!data || data.error) {
      fail((data && data.error) || 'The scan could not finish. Try again with different content.', input);
      return;
    }
    assessResult(data);
    renderResult(data);
  }
  scanBtn.addEventListener('click', runScan);

  /* ── assistant ────────────────────────────────────────────────── */
  const GREETING = 'Hi — I’m the ThreatScan assistant. With an AI key configured (one free Google Gemini key is enough) I answer any kind of question through a real AI model; without one, my built-in offline safety guide takes over. Either way: I never open links, and I never call anything “safe” — I explain evidence and risk instead. Ask me anything, or tap a suggestion below.';

  const INTENTS = [
    { keys: ['otp', 'one time password', 'one-time password', 'verification code'], answer: 'Treat every OTP as money. No bank, delivery firm or support agent will ever ask you to read one out or type it into a chat. If someone asks, end the conversation. If you already shared one, open your official banking or account app immediately, secure the account and tell the provider — speed matters most in the first minutes.' },
    { keys: ['2fa', 'two factor', 'two-factor', 'authenticator app'], answer: 'Two-factor authentication stops most account takeovers. Prefer an authenticator app or a security key over SMS codes, save backup codes offline, and never approve a login prompt you did not start. If prompts appear unexpectedly, change your password immediately.' },
    { keys: ['phishing', 'fake email', 'spam mail'], answer: 'Phishing is an impostor message — it borrows a trusted name to push you toward a fake login page, a payment, or malware. Look past the branding: check the real sender address, the registered domain of any link, and whether you were actually expecting the message. When in doubt, open the official app or type the known address yourself.' },
    { keys: ['link', 'url', 'clicked', 'clicked it', 'already clicked'], answer: 'If you clicked a bad link but entered nothing, you are usually fine — close the tab and ignore any prompts it triggered. If you typed a password or card details, change the password immediately and watch your bank statement. Attackers need you to type, click through a window or allow something; a plain click rarely does damage by itself.' },
    { keys: ['fake website', 'shopping website', 'fake shop', 'fake site', 'shopping site', 'online shop', 'shop legit', 'website fake', 'website is fake', 'is this website', 'is this site', 'shop scam', 'online store', 'store fake'], answer: 'Fake shops are tempting copies. Check the registered domain (not the branding), look for working contact details and return information, and search the site name plus “scam”. Be suspicious of extreme discounts, or payment by gift card, crypto or personal transfer. The padlock icon only means the connection is encrypted — criminals use it too.' },
    { keys: ['password', 'account hacked', 'hacked', 'stolen'], answer: 'Change that password from the official website or app, not through any link someone sent you. Use a unique password everywhere, and check “recent sign-in activity”. Then turn on two-factor authentication and review recovery phone/email addresses — attackers often add their own.' },
    { keys: ['payment', 'paid', 'money sent', 'money transfer', 'refund', 'upi', 'bank'], answer: 'If you already paid someone, contact your bank or wallet provider immediately and ask for a dispute or recall — every minute improves the odds. Never let a “support agent” guide you through installing an app to help with refunds. Screenshots of “refund approvals” are faked routinely.' },
    { keys: ['delivery', 'parcel', 'courier', 'package shipment', 'packed'], answer: 'Genuine delivery firms put tracking links in the app you already use, and never charge small “customs” fees over SMS with a short link. Treat parcel texts with links as suspicious until checked — this is currently the most common scam format in many countries.' },
    { keys: ['job', 'vacancy', 'part time', 'work from home', 'salary'], answer: 'Real employers interview before money is involved and never ask for deposits, training kits or crypto top-ups. Check the company’s own careers page — not the chat you were contacted in. Guaranteed daily income for simple tasks is the signature of task-scam rings.' },
    { keys: ['investment', 'crypto', 'trading', 'forex', 'profit'], answer: 'No legitimate investment is promoted through a stranger’s chat, dashboard screenshots or a guaranteed return. Withdrawal requests that suddenly require a “tax” or “commission” payment are the classic ending of these scams. Assume anything promising double-digit monthly profit is fraud.' },
    { keys: ['qr code', 'qr'], answer: 'A QR code is just a link wearing a sticker: it can hide a payment request, a malicious app or a fake login. Check that the sticker is placed over the original, and read the URL before confirming. Unknown QR codes in emails are unnecessary risk — scan only QR codes you chose to use.' },
    { keys: ['report', 'cyber crime', 'police', 'complaint', 'helpline'], answer: 'Reporting quickly can protect others. Save the message, the sender’s details and any payment receipts, then report to your national cybercrime portal or local police. If a bank account was involved, tell your bank’s fraud line the same day and set an extra verification step on your accounts.' },
    { keys: ['remote access', 'anydesk', 'screen share'], answer: 'Any request to install a remote-access app (AnyDesk, TeamViewer, a “support tool”) from an inbound contact is a scam, full stop. Hanging up costs nothing; granting access could cost your savings. Real support never needs to watch your screen to fix a billing question.' },
    { keys: ['safe browsing', 'vpn', 'antivirus'], answer: 'An antivirus and a password manager earn their keep; a VPN mainly changes your visible location. The habits that prevent most losses: think before clicking, keep devices updated, use unique passwords with app-based two-factor, and verify any unexpected money or code request through a channel you choose yourself.' },
    { keys: ['is it a scam', 'is this a scam', 'is that a scam', 'scam or not', 'how do i know if scam', 'how to tell if scam', 'how do i know scam', 'is it a fraud', 'is this fraud', 'suspicious message', 'suspicious text', 'suspicious sms', 'suspicious email', 'weird message', 'weird text', 'strange message', 'strange text', 'strange sms', 'should i reply', 'unknown number texted', 'unknown number message', 'weird call', 'strange call'], answer: 'I cannot judge a message from a short description alone, and I won’t pretend otherwise. The red flags that matter: pressure to act right now; any request for an OTP, password or payment; a link whose domain is not the organisation’s official one; a prize, refund or job you never applied for; and contact that started with a stranger. If you have the actual link, text or screenshot, add it above and press “Scan now” — then ask me “Explain my last result”. Even then nothing is a blessing of safety: when money or logins are involved, verify through the official app or a phone number you already trust.' },
    { keys: ['i was scammed', 'got scammed', 'been scammed', 'scammed me', 'scammed out', 'lost money', 'i lost', 'friend got scammed', 'friend was scammed', 'victim of a scam', 'cheated', 'lost funds', 'sent money to'], answer: 'Assume it is urgent, not hopeless. 1) Stop all contact and pay nothing more — “recovery agents” who promise to win your money back for a fee are the second wave of the same scam. 2) Contact your bank or wallet provider immediately and ask about a recall or dispute; minutes matter. 3) Secure any accounts whose passwords or codes you shared: change them and turn on two-factor. 4) Save messages, numbers, receipts and screenshots as evidence. 5) Report to your national cybercrime portal or police, and report the account the scammer used on its platform. Being deceived does not mean being careless — these are professional operations.' },
    { keys: ['someone called', 'phone call', 'phonecall', 'they called', 'cold call', 'bank called', 'bank phoned', 'account frozen', 'frozen account', 'support agent called', 'customer care called', 'phone scam', 'call from bank', 'caller'], answer: 'Inbound calls manufacture urgency, which is exactly their tool. A real bank will never ask you to read out an OTP, never ask you to move money to a “safe account”, and never need remote-access software for a billing question. Anyone keeping you on the line while you pay or read codes is stealing from you. Hang up without explaining; find your bank’s number on your card or its official site and call that yourself. Caller ID proves nothing — name and number are faked routinely. If you already revealed details, call the real fraud line now and change any affected passwords.' },
    { keys: ['what can you do', 'who are you', 'are you ai', 'are you an ai', 'are you a bot', 'are you real', 'about yourself', 'your abilities', 'can you think'], answer: 'I am a built-in guide, not a thinking AI model — a fixed set of online-safety topics with honest answers, running entirely offline in this page. I can explain scam tactics (OTP codes, phishing, parcel texts, fake shops, job and investment hooks, remote-access tricks), interpret your last scan in plain words, and hand a pasted address to the URL scanner without ever opening it. I cannot browse the web, judge individuals, or see your data beyond this page — and I will not pretend to.' },
    { keys: ['what is scamming', 'what is scam', 'what is a scam', 'what does scamming mean', 'define scamming', 'define scam', 'scamming meaning', 'scam meaning', 'scam definition', 'meaning of scam', 'what is fraud', 'what is a fraud', 'what does scam mean'], answer: 'A scam is a planned deception used to take your money, accounts, codes, identity or trust away from you. Nobody has to break into anything: the victim is talked or lured into paying, logging in or sharing information. The core ingredients are always the same — a borrowed identity (bank, courier, police, friend), pressure or temptation, and a channel you did not choose (call, text, DM, popup). “Fraud” is the same act in legal language. Knowing that pattern is the most useful defence: a stranger creating urgency with money or codes is nearly always one.' },
    { keys: ['difference between scam and phishing', 'difference between phishing and scam', 'scam vs phishing', 'phishing vs scam', 'compare scam and phishing', 'difference of scam and phishing', 'diff between scam and phishing', 'difference btw scam and phishing', 'is phishing a scam', 'scam or phishing difference'], answer: 'Scam is the broad category, phishing is one technique inside it — so every phishing attempt is a scam, but most scams are not phishing. Phishing specifically impersonates a trusted service (a bank, a portal, a company login) to make you enter your password, card details or OTP on a fake page or fake mail. Other scam types bypass the fake-login step entirely: fake online shops take a payment, investment and “task” scams take deposits, romance scams take months of trust, remote-access scams take live control of your device, and OTP scams take instant access to your accounts with one code. Practical split: phishing talks about your *logins*, the other scams talk about your *money* — and a real message will never need an OTP from you for any reason.' },
    { keys: ['how can we prevent', 'how to prevent scam', 'how to prevent phishing', 'prevent scams', 'prevent scamming', 'prevent phishing', 'avoid scams', 'avoid phishing', 'stop scams', 'how do i protect myself', 'protect myself from scams', 'protect my money', 'how to be safe online', 'online safety', 'safety tips', 'how to stay safe', 'how to avoid being scammed'], answer: 'Prevention is layered habits, not one trick: 1) Never read out or type an OTP for anyone — a genuine organisation never needs it; treat it as money. 2) Choose the contact channel yourself: call the number on your card or open the official app — never a link, callback or contact that came to you. 3) Use a unique password everywhere and two-factor with an authenticator app or security key, and check recovery phone/email for additions. 4) Let pressure be your alert: urgent deadlines, “suspended accounts”, guaranteed profit, small customs fees are the standard scam climate. 5) Check the registered domain on any link you are about to open — not the brand words. 6) Keep devices and browsers updated, and pay in ways that can be reversed when possible. 7) Slow down before paying or logging in anywhere new: one honest pause defeats most of this — and scan anything doubtful here first.' },
    { keys: ['types of scams', 'ways scams are done', 'scams are done', 'how scams work', 'how are scams done', 'scam methods', 'common scams', 'how do scams happen', 'how do they scam', 'scam techniques', 'how do people scam', 'ways of scamming', 'how is scamming done', 'list of scams'], answer: 'The common formats, by how they attack: **Fake messages** — parcel/customs texts with tracking links, bank “suspicious activity” calls, KYC or account-freeze messages, jury-duty or police threats. **Fake money** — online shops with unreal discounts, advance-fee and prize claims, investment/crypto dashboards with guaranteed returns and withdrawal “taxes”, task/part-time jobs asking deposits, romance partners with emergencies. **Fake access** — OTP and “verify last transaction” scams, remote-access tools sold as bank support, QR stickers pasted over real ones, malicious payment QRs, KYC documents harvested via fake forms. **Fake people** — impersonation of police, banks, delivery staff or relatives on WhatsApp from a new number. The engine behind all of them is the same pair: a story that demands *urgency* and a channel you did not initiate. If someone rushes you towards money, codes or a link, walk away and verify independently.' },
    { keys: ['hello', 'hi', 'hey', 'help'], answer: 'Hello! I can explain scam tactics, review what a result means, or help you decide the next step. Try: “What is phishing?”, “Someone asked for my OTP”, “Is this delivery text a scam?” or “Explain my last result”.' },
    // "Is it safe"-style questions must never become a blessing of safety:
    // heuristics and reputation lookups give evidence, never proof. The answer
    // reflects the last scan when one exists (function answer, below).
    { keys: ['is it safe', 'is this safe', 'is that safe', 'safe to use', 'safe to open', 'is it legit', 'is this legit', 'is it genuine', 'is this genuine', 'trustworthy', 'is it real', 'is this real', 'is that real', 'is it dangerous', 'is this dangerous', 'is that dangerous', 'is it unsafe', 'is this unsafe', 'is that unsafe', 'website unsafe', 'not safe', 'unsafe'], answer: function () {
      if (!lastResult) {
        return 'Short answer: nothing can be blessed “safe” from the outside — not by a scanner, not by me. A clean-looking result only means no forgery signals and no availability of contradicting evidence, which is different from proof. Scan the link, message or image above, then ask me “Explain my last result” and I will walk you through what the evidence shows.';
      }
      const band = BANDS[lastResult.band] || bandFor(lastResult.score);
      const statusTxt = lastResult.status ? ' The scan’s detection status is “' + lastResult.status + '” at ' + (lastResult.confidence || 'Low').toLowerCase() + ' confidence.' : '';
      return 'I cannot certify anything as safe, and here is the honest position: your last scan scored ' + lastResult.score + '/100 (' + band.label.toLowerCase() + ').' + statusTxt + '\n\n' + band.summary +
        '\n\nA low score means the evidence checks found no fakes — not that the destination is guaranteed trustworthy. Verify anything that handles money or logins through the organisation’s official app or a phone number you already use.';
    } }
  ];

  function intentFor(q) {
    let best = null, bestScore = 0;
    for (const intent of INTENTS) {
      let score = 0;
      for (const key of intent.keys) {
        if (key.indexOf(' ') === -1) {
          // single words must match on word boundaries: "real" must never
          // fire inside "really" or "already", "hi" not inside "this".
          if (new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(q)) score += 2;
        } else {
          if (q.includes(key)) score += 1 + Math.min(3, key.split(' ').length - 1);
        }
      }
      if (score > bestScore) { best = intent; bestScore = score; }
    }
    return best;
  }

  function answerFor(question) {
    const q = question.toLowerCase();
    const urlMatch = question.match(/(?:https?:\/\/|www\.)[^\s<>"')\]]+/i);

    if (/\b(?:explain|interpret|help me with|summar?ise|summarize|review)\b.{0,24}\b(?:my|the|last|previous)?\s*(?:result|scan|score|verdict)\b|\b(?:what|how)\b.{0,14}\bscore\b/.test(q)) {
      if (!lastResult) {
        return { text: 'There is no scan to explain yet. Add a link, a message or an image above and press “Scan now” — then ask me again and I will walk you through the score.' };
      }
      const band = BANDS[lastResult.band] || bandFor(lastResult.score);
      const statusTxt = lastResult.status ? ' Its detection status is “' + lastResult.status + "”, with " + (lastResult.confidence || 'Low').toLowerCase() + ' confidence.' : '';
      const signals = lastResult.reasons.filter((r) => r.weight > 0).slice(0, 3).map((r) => '• +' + r.weight + ' — ' + r.text).join('\n');
      const text = 'Your last scan scored ' + lastResult.score + '/100 — ' + band.label.toLowerCase() + '.' + statusTxt + '\n\n' + band.summary +
        (signals ? '\n\nThe strongest signals were:\n' + signals : '\n\nNo individual warning signals contributed to the score.');
      return { text };
    }

    // Comparison questions ("difference between these two") get the contrast
    // answer when the recent chat or the question itself names a relevant
    // topic — otherwise they fall through honestly (no invented topic).
    const wantsCompare = /\b(?:difference|diff|vs\.?\b|versus|compare[ds]?|these two)\b/.test(q);
    if (wantsCompare) {
      const hist = chatContext.map((m) => String(m)).join(' ').toLowerCase();
      const relevant = /phishing|scam|fraud/.test(hist) || /phishing|scam|fraud/.test(q);
      if (relevant) {
        const diffIntent = INTENTS.find((i) => i.keys.indexOf('scam vs phishing') !== -1);
        if (diffIntent) return { text: diffIntent.answer };
      }
    }
    const intent = intentFor(q);
    let text = intent
      ? (typeof intent.answer === 'function' ? intent.answer() : intent.answer)
      : (urlMatch
        ? 'This assistant never opens links, and I cannot confirm an address’s trustworthiness from chat alone — but the offline URL checks can tell you a lot about its structure.'
        : 'Good question. This assistant gives general online-safety guidance offline — it cannot fetch live data or confirm whether a specific person is genuine. Don’t click, pay or share anything yet; verify through the organisation’s official app, website or a phone number you already trust.');

    const actions = [];
    if (urlMatch) {
      const link = urlMatch[0];
      text += '\n\nI can run the offline link checks on that address without opening it:';
      actions.push({
        label: 'Scan “' + shorten(link, 24) + '”',
        run: () => { setTab('url'); urlInput.value = link; runScan(); resultCard.scrollIntoView({ block: 'start', behavior: REDUCE_MOTION ? 'auto' : 'smooth' }); }
      });
    }
    return { text, actions };
  }

  let typingBubble = null;
  let chatTimer = null;
  function showTyping() {
    typingBubble = document.createElement('div');
    typingBubble.className = 'bubble bubble--bot typing';
    typingBubble.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      typingBubble.append(s);
    }
    chatLog.append(typingBubble);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function removeTyping() {
    if (typingBubble) { typingBubble.remove(); typingBubble = null; }
  }

  function addBubble(text, who, actions) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble bubble--' + who;
    const span = document.createElement('span');
    span.textContent = text;
    bubble.append(span);
    if (actions && actions.length) {
      const row = document.createElement('span');
      row.className = 'bubble-actions';
      actions.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'bubble-action';
        b.textContent = a.label;
        b.addEventListener('click', a.run);
        row.append(b);
      });
      bubble.append(row);
    }
    chatLog.append(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // Conversation memory (client-side, capped) so follow-up questions carry
  // context through to the AI model. Cleared with the Clear chat button.
  let chatHistory = [];
  // All turns (questions and answers, any mode) for the offline guide's
  // context-aware follow-ups, e.g. "difference between these two".
  let chatContext = [];

  // ---- in-app AI connection (key stays server-side) ----------------
  const aiStatusLine = $('aiStatusLine');
  const aiConnectBtn = $('aiConnectBtn');
  const aiPanel = $('aiPanel');
  const aiProviderSel = $('aiProviderSel');
  const aiKeyBox = $('aiKeyBox');
  const aiModelBox = $('aiModelBox');
  const aiSaveBtn = $('aiSaveBtn');
  const aiCancelBtn = $('aiCancelBtn');
  const aiClearKeyBtn = $('aiClearKeyBtn');
  const aiConfigNote = $('aiConfigNote');
  let lastAiStatus = { configured: false, provider: 'gemini', model: '' };

  async function fetchAiStatus() {
    try {
      const res = await fetch(INTEL_BASE + '/api/chatsetup', { signal: AbortSignal.timeout(5000), headers: { 'Accept': 'application/json' } });
      if (!res.ok) return { configured: false, unreachable: true };
      return await res.json();
    } catch (e) { return { configured: false, unreachable: true }; }
  }

  function applyAiStatus(st) {
    lastAiStatus = st;
    if (st && st.configured) {
      aiStatusLine.textContent = 'AI connected · ' + st.provider + (st.model ? ' · ' + st.model : '');
      aiConnectBtn.textContent = 'AI settings';
    } else {
      aiStatusLine.textContent = 'Offline guidance · built-in knowledge — connect an AI key for full answers';
      aiConnectBtn.textContent = 'Connect AI';
    }
  }

  function connectAction() {
    return {
      label: 'Connect AI…',
      run: () => {
        aiProviderSel.value = (lastAiStatus && lastAiStatus.provider) || 'gemini';
        aiModelBox.value = (lastAiStatus && lastAiStatus.model) || '';
        aiPanel.hidden = false;
        aiConfigNote.textContent = '';
        aiKeyBox.focus();
      }
    };
  }

  async function saveAiSetup(keyValue) {
    try {
      const res = await fetch(INTEL_BASE + '/api/chatsetup', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyValue, provider: aiProviderSel.value, model: aiModelBox.value.trim() }),
        signal: AbortSignal.timeout(10000)
      });
      return await res.json();
    } catch (e) { return { ok: false, detail: 'could not reach the local server' }; }
  }

  aiConnectBtn.addEventListener('click', connectAction().run);
  aiCancelBtn.addEventListener('click', () => { aiPanel.hidden = true; aiConfigNote.textContent = ''; aiKeyBox.value = ''; });
  aiSaveBtn.addEventListener('click', async () => {
    const keyValue = aiKeyBox.value.trim();
    if (keyValue && keyValue.length < 10) {
      aiConfigNote.textContent = 'That key looks too short to be valid.';
      return;
    }
    aiConfigNote.textContent = 'Saving…';
    const data = await saveAiSetup(keyValue);
    if (data && data.ok) {
      aiKeyBox.value = '';
      aiConfigNote.textContent = '';
      aiPanel.hidden = true;
      applyAiStatus({ configured: data.configured, provider: data.provider, model: data.model });
      addBubble(data.configured
        ? 'AI connected (' + data.provider + (data.model ? ' · ' + data.model : '') + '). Ask me anything — and scan features keep working offline either way.'
        : 'AI disconnected. My built-in offline guide will keep answering, and will say so.', 'bot');
    } else {
      aiConfigNote.textContent = 'Could not save: ' + ((data && data.detail) || 'unknown error');
    }
  });
  aiClearKeyBtn.addEventListener('click', async () => {
    aiConfigNote.textContent = 'Disconnecting…';
    const data = await saveAiSetup('');
    if (data && data.ok) {
      aiKeyBox.value = '';
      aiPanel.hidden = true;
      aiConfigNote.textContent = '';
      applyAiStatus({ configured: false, provider: data.provider, model: data.model });
      addBubble('AI disconnected. The built-in offline guide takes over again.', 'bot');
    } else {
      aiConfigNote.textContent = 'Could not disconnect: ' + ((data && data.detail) || 'unknown error');
    }
  });


  // Ask the AI through the local key-protected proxy. Always resolves with
  // { mode: 'ai' | 'offline', ... } - it never throws; network problems are
  // reported as offline mode so the built-in guide can take over.
   async function askAi(question) {
    const messages = chatHistory.concat([
      { role: 'user', content: question }
    ]).slice(-16);

    const payload = { messages };

    if (lastResult) {
      const band = BANDS[lastResult.band] || bandFor(lastResult.score);
      payload.context =
        'Last scan: score ' + lastResult.score +
        '/100 (' + band.label + '), status ' +
        (lastResult.status || 'unknown') + '.';
    }

    try {
      const res = await fetch(
        'https://threatscan-assistant.minecraftgun-30.workers.dev/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(45000)
        }
      );

      const data = await res.json();

      if (!res.ok) {
        return {
          mode: 'offline',
          detail: data.error || ('HTTP ' + res.status)
        };
      }

      const reply =
        data.reply ||
        data.response ||
        data.result?.response ||
        data.choices?.[0]?.message?.content;

      if (reply) {
        return { mode: 'ai', reply: String(reply) };
      }

      return {
        mode: 'offline',
        detail: data.error || 'Unexpected AI response format'
      };
    } catch (e) {
      return {
        mode: 'offline',
        detail: 'AI connection failed: ' + (e.message || 'network error')
      };
    }
  }
  function scanUrlAction(link) {
    return {
      label: 'Scan “' + shorten(link, 24) + '”',
      run: () => { setTab('url'); urlInput.value = link; runScan(); resultCard.scrollIntoView({ block: 'start', behavior: REDUCE_MOTION ? 'auto' : 'smooth' }); }
    };
  }

  function handleChat(question) {
    const q = question.trim();
    if (!q) return;
    addBubble(q, 'user');
    chatContext.push(q);
    if (chatContext.length > 12) chatContext = chatContext.slice(-12);
    clearTimeout(chatTimer);
    removeTyping();
    showTyping();
    const minDelay = new Promise((r) => { chatTimer = setTimeout(r, 500); });
    let aiPromise;
    try { aiPromise = askAi(q); } catch (err) { aiPromise = Promise.resolve({ mode: 'offline', detail: 'assistant request could not start' }); }
    Promise.all([aiPromise, minDelay]).then(([ai]) => {
      removeTyping();
      const urlMatch = q.match(/(?:https?:\/\/|www\.)[^\s<>"')\]]+/i);
      if (ai && ai.mode === 'ai' && ai.reply) {
        const answer = String(ai.reply);
        chatHistory.push({ role: 'user', content: q }, { role: 'assistant', content: answer });
        if (chatHistory.length > 24) chatHistory = chatHistory.slice(-24);
        chatContext.push(answer);
        if (chatContext.length > 12) chatContext = chatContext.slice(-12);
        addBubble(answer, 'bot', urlMatch ? [scanUrlAction(urlMatch[0])] : null);
        return;
      }
      // Offline fallback: the built-in rule-based guide, clearly labelled.
      const off = answerFor(q);
      let text = off.text;
      text += '\n\n— Answered by the built-in offline guide (no working AI connection' + (ai && ai.detail ? ': ' + ai.detail : '') + ').';
      const acts = [];
      if (off.actions && off.actions.length) acts.push(...off.actions);
      else if (urlMatch) acts.push(scanUrlAction(urlMatch[0]));
      if (ai && ai.detail && /no AI API key configured/.test(ai.detail)) acts.push(connectAction());
      chatContext.push(text);
      if (chatContext.length > 12) chatContext = chatContext.slice(-12);
      addBubble(text, 'bot', acts.length ? acts : null);
    }).catch(() => {
      removeTyping();
      const off = answerFor(q);
      addBubble(off.text + '\n\n— Answered by the built-in offline guide (AI request failed).', 'bot', off.actions);
    });
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = chatInput.value.trim();
    if (!q) return;
    chatInput.value = '';
    handleChat(q);
  });
  document.querySelectorAll('#chatSuggestions .chip').forEach((chip) => {
    chip.addEventListener('click', () => handleChat(chip.dataset.q));
  });
  clearChatBtn.addEventListener('click', () => {
    clearTimeout(chatTimer);
    removeTyping();
    chatLog.innerHTML = '';
    chatHistory = [];
    chatContext = [];
    addBubble(GREETING, 'bot');
    chatInput.focus();
  });
  addBubble(GREETING, 'bot');

  // Reflect the AI connection state at boot; prompt for a free key once.
  (async () => {
    const st = await fetchAiStatus();
    applyAiStatus(st);
    if (st.unreachable) return; // server down: status line already says offline
    if (st.configured) {
      addBubble('AI connected (' + st.provider + (st.model ? ' · ' + st.model : '') + '). Ask me anything.', 'bot');
    } else {
      addBubble('Tip: with one free AI key (aistudio.google.com/apikey) I can answer any kind of question, not just safety topics. The offline guide stays active until then and says when it is the one answering.', 'bot', [connectAction()]);
    }
  })();

  /* ── checklist ────────────────────────────────────────────────── */
  const CHECKLIST = [
    { id: 'otp', text: 'Never share an OTP, PIN or password — even with “support”.' },
    { id: '2fa', text: 'Turn on two-factor authentication for email and banking.' },
    { id: 'unique', text: 'Use a different password for every important account.' },
    { id: 'verify', text: 'Open official apps or type known addresses instead of tapping message links.' },
    { id: 'update', text: 'Keep your devices updated, and back up important files.' }
  ];
  const CHECK_KEY = 'threatscan.checklist.v1';
  function loadChecks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHECK_KEY) || '{}');
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) { return {}; }
  }
  let checks = loadChecks();

  function renderChecklist() {
    checklistList.innerHTML = '';
    CHECKLIST.forEach((item) => {
      const li = document.createElement('li');
      const label = document.createElement('label');
      label.className = 'check-item';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!checks[item.id];
      input.dataset.id = item.id;
      input.addEventListener('change', () => {
        checks[item.id] = input.checked;
        try { localStorage.setItem(CHECK_KEY, JSON.stringify(checks)); } catch (e) {}
        updateChecklistProgress();
      });
      const text = document.createElement('span');
      text.className = 'check-text';
      text.textContent = item.text;
      label.append(input, text);
      li.append(label);
      checklistList.append(li);
    });
    updateChecklistProgress();
  }
  function updateChecklistProgress() {
    const total = CHECKLIST.length;
    const done = CHECKLIST.filter((i) => checks[i.id]).length;
    checklistCount.textContent = String(done);
    checklistBar.style.width = Math.round((done / total) * 100) + '%';
    checklistRing.style.background =
      'radial-gradient(closest-side, var(--surface) 73%, transparent 74%), conic-gradient(var(--accent) ' +
      Math.round((done / total) * 360) + 'deg, var(--surface-3) 0deg)';
    checklistProgress.textContent = done === 0
      ? 'No habits ticked yet — start with two-factor'
      : done === total
        ? 'All ' + total + ' habits in place — keep at it'
        : done + ' of ' + total + ' habits in place';
  }

  /* ── boot ─────────────────────────────────────────────────────── */
  // The build tag is written here, by the script itself. If the page shows
  // "v2.4.5" without the checkmark, the HTML is fresh but a stale script is
  // still cached — hard-refresh (Ctrl+Shift+R) or close and reopen the tab.
  const buildTag = document.getElementById('buildTag');
  if (buildTag) buildTag.textContent = 'v2.4.5 ✓';

  renderHistory();
  renderChecklist();
})();
