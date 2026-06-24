import type { Core } from '@strapi/strapi';

// ─── Public read permissions ─────────────────────────────────────────

const PUBLIC_READ: Record<string, ('find' | 'findOne')[]> = {
  'account-tier': ['find', 'findOne'],
  faq: ['find', 'findOne'],
  homepage: ['find', 'findOne'],
  market: ['find', 'findOne'],
  platform: ['find', 'findOne'],
  step: ['find', 'findOne'],
  award: ['find', 'findOne'],
  testimonial: ['find', 'findOne'],
  'journey-card': ['find', 'findOne'],
  // Page single types
  'about-page': ['find', 'findOne'],
  'careers-page': ['find', 'findOne'],
  'accounts-page': ['find', 'findOne'],
  'payments-page': ['find', 'findOne'],
  'services-page': ['find', 'findOne'],
  'partnerships-page': ['find', 'findOne'],
  'blogs-page': ['find', 'findOne'],
  'contactus-page': ['find', 'findOne'],
};

// ─── SEO seed helper ─────────────────────────────────────────────────
//
// Standard, Strapi-SEO-plugin compatible shape so editors can manage every
// piece of per-page metadata (title, description, keywords, canonical,
// robots, structured data, social cards) from the admin UI.

type SeoSeed = {
  metaTitle: string;
  metaDescription: string;
  keywords?: string;
  metaRobots?: string;
  canonicalURL?: string;
  metaViewport?: string;
  // Strapi types `JSON` columns as a recursive `JSONValue` union — using
  // `any` here keeps the seed inputs ergonomic without forcing every
  // structuredData payload to satisfy that recursive type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structuredData?: any;
  metaSocial?: {
    socialNetwork: 'Facebook' | 'Twitter' | 'LinkedIn';
    title: string;
    description: string;
  }[];
};

const SITE_BASE = 'https://finsaitrade.com';

function buildSeo(args: {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  type?: 'website' | 'article';
}): SeoSeed {
  const canonicalURL = `${SITE_BASE}${args.path === '/' ? '' : args.path}`;
  return {
    metaTitle: args.title.length > 60 ? args.title.slice(0, 60) : args.title,
    metaDescription:
      args.description.length > 160
        ? args.description.slice(0, 160)
        : args.description,
    keywords: args.keywords,
    metaRobots: 'index, follow',
    canonicalURL,
    metaViewport: 'width=device-width, initial-scale=1',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': args.type === 'article' ? 'Article' : 'WebPage',
      name: args.title,
      description: args.description,
      url: canonicalURL,
      publisher: {
        '@type': 'Organization',
        name: 'Finsai Trade',
        url: SITE_BASE,
      },
    },
    metaSocial: [
      {
        socialNetwork: 'Facebook',
        title: args.title,
        description: args.description,
      },
      {
        socialNetwork: 'Twitter',
        title: args.title,
        description: args.description,
      },
    ],
  };
}

async function setPublicReadPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('[bootstrap] No public role found, skipping permissions');
    return;
  }

  for (const [api, actions] of Object.entries(PUBLIC_READ)) {
    for (const action of actions) {
      const actionKey = `api::${api}.${api}.${action}`;
      const existing = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: actionKey, role: publicRole.id } });

      if (!existing) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action: actionKey, role: publicRole.id },
        });
        strapi.log.info(`[bootstrap] Granted public ${action} on ${api}`);
      }
    }
  }
}

// ─── Seed helpers ────────────────────────────────────────────────────

async function syncSingleType(
  strapi: Core.Strapi,
  uid: string,
  data: Record<string, unknown>,
  label: string,
) {
  const existing = (await strapi.documents(uid as never).findFirst({})) as {
    documentId: string;
  } | null;
  if (existing) {
    await strapi.documents(uid as never).update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
    strapi.log.info(`[bootstrap] Synced ${label}`);
  } else {
    await strapi.documents(uid as never).create({ data, status: 'published' });
    strapi.log.info(`[bootstrap] Seeded ${label}`);
  }
}

async function replaceCollection(
  strapi: Core.Strapi,
  uid: string,
  items: Record<string, unknown>[],
  label: string,
  isCurrent: (existing: Array<Record<string, unknown>>) => boolean,
) {
  const existing = (await strapi.documents(uid as never).findMany({})) as Array<
    Record<string, unknown>
  >;
  if (existing.length > 0 && isCurrent(existing)) return;

  for (const row of existing) {
    await strapi.documents(uid as never).delete({
      documentId: row.documentId as string,
    });
  }
  for (const item of items) {
    await strapi.documents(uid as never).create({ data: item, status: 'published' });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} ${label}`);
}

// ─── Existing seeds (tiers, faqs) ────────────────────────────────────

async function seedAccountTiers(strapi: Core.Strapi) {
  // The FE AccountsCompareTable is now hardcoded with 3 tiers and 9 feature
  // rows. We seed the same data so when Strapi is wired up the rendered
  // table is identical to the FE fallback.
  const FEATURES: { label: string; values: [string, string, string] }[] = [
    { label: 'Target Clients',            values: ['New Retail Clients',  'Mid-Tier Traders',  'Advanced Traders'] },
    { label: 'Min. Deposit',              values: ['$100',                '$1,000',            '$5,000'] },
    { label: 'Account Type',              values: ['Hedging Accounts',    'Hedging Accounts',  'Hedging/Netting Accounts'] },
    { label: 'Spread Type',               values: ['1.4 pips',            '0.6 pips',          '0.0 to 0.1 pips'] },
    { label: 'Commissions',               values: ['No commission',       'No commission',     '0.03$'] },
    { label: 'Swap Charges',              values: ['SWAP Free',           'SWAP Free',         'SWAP Free'] },
    { label: 'Algo/bot Trading Enable',   values: ['Yes',                 'Yes',               'Yes'] },
    { label: 'VPS Access',                values: ['NO',                  'NO',                'Yes'] },
    { label: 'Dedicated Account Manager', values: ['NO',                  'NO',                'Yes'] },
  ];

  const TIER_META = [
    { name: 'Smart Choice', price: '$100',   unit: 'Min. Deposit', featured: false, order: 1, col: 0 },
    { name: 'Smart Pro',    price: '$1,000', unit: 'Min. Deposit', featured: true,  order: 2, col: 1 },
    { name: 'Smart ECN',    price: '$5,000', unit: 'Min. Deposit', featured: false, order: 3, col: 2 },
  ];

  const desired = TIER_META.map((t) => ({
    name: t.name,
    price: t.price,
    unit: t.unit,
    featured: t.featured,
    order: t.order,
    ctaLabel: 'Open Account',
    ctaHref: 'https://fx.finsaitrade.com/auth/register',
    features: FEATURES.map((f) => ({ label: f.label, value: f.values[t.col] })),
  }));

  // One-shot migration: if the new 3-tier dataset isn't present yet (e.g.
  // legacy "Smart Start" / "Smart Vip" rows from the old 5-tier seed), wipe
  // and reseed. Idempotent: re-runs are safe once the 3 tiers exist.
  const existing = await strapi
    .documents('api::account-tier.account-tier')
    .findMany({ status: 'draft' });
  const alreadyMigrated =
    existing.length === TIER_META.length &&
    TIER_META.every((t) => existing.some((e) => e.name === t.name));
  if (alreadyMigrated) return;

  if (existing.length > 0) {
    for (const t of existing) {
      await strapi
        .documents('api::account-tier.account-tier')
        .delete({ documentId: t.documentId });
    }
    strapi.log.info(`[bootstrap] Cleared ${existing.length} legacy account tiers`);
  }

  for (const tier of desired) {
    await strapi.documents('api::account-tier.account-tier').create({
      data: tier,
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${desired.length} account tiers (compare-table dataset)`);
}

async function seedFaqs(strapi: Core.Strapi) {
  // Mirrors src/lib/faq-fallbacks.ts — one row per page section.
  const faqs: Array<{
    section: string;
    order: number;
    question: string;
    answer: string;
  }> = [
    // homepage
    { section: 'homepage', order: 1, question: 'What is Finsai Trade?', answer: 'Finsai Trade is a multi-asset trading platform that gives traders access to global financial markets through a single account. Trade forex, stocks, cryptocurrencies, commodities, indices, and CFDs using the powerful MetaTrader 5 (MT5) platform, advanced trading tools, and fast order execution.' },
    { section: 'homepage', order: 2, question: 'Why choose Finsai Trade for online trading?', answer: "Finsai Trade combines a professional online trading platform with access to multiple asset classes, competitive trading conditions, fast execution, advanced charting tools, copy trading, and secure trading infrastructure. Whether you're a beginner or an experienced trader, you can access global markets through one integrated platform." },
    { section: 'homepage', order: 3, question: 'Does Finsai Trade use MetaTrader 5 (MT5)?', answer: "Yes. Finsai Trade is powered by MetaTrader 5 (MT5), one of the world's leading trading platforms. MT5 provides advanced charting, technical indicators, algorithmic trading, Expert Advisors (EAs), real-time market data, and multi-asset trading capabilities from a single platform." },
    { section: 'homepage', order: 4, question: 'What are the benefits of a multi-asset trading platform?', answer: 'A multi-asset trading platform lets you trade multiple financial markets from a single account. This simplifies portfolio management, improves diversification, and allows you to capitalize on opportunities across forex, stocks, commodities, cryptocurrencies, indices, and CFDs without switching between platforms.' },
    { section: 'homepage', order: 5, question: 'How do I open a trading account with Finsai Trade?', answer: "Opening a trading account with Finsai Trade is simple. Register online, complete identity verification, fund your account, and start trading global markets using MetaTrader 5 (MT5). If you're new to trading, you can begin with a demo trading account before transitioning to live trading." },
    // accounts
    { section: 'accounts', order: 1, question: 'Can I upgrade or switch my account type later?', answer: 'Yes. You can upgrade or switch your account type anytime as your trading needs evolve.' },
    { section: 'accounts', order: 2, question: 'Are there any deposit or withdrawal fees?', answer: 'Finsai Trade does not charge internal deposit or withdrawal fees. Third-party payment providers may apply transaction charges.' },
    { section: 'accounts', order: 3, question: 'What documents are required for account verification?', answer: "You'll need a valid government-issued ID and proof of address, such as a utility bill or bank statement." },
    { section: 'accounts', order: 4, question: "What's the difference between Smart Pro and Smart ECN?", answer: 'Smart ECN is designed for advanced traders, offering Raw spreads, enhanced execution conditions, VPS access, and support for advanced trading tools.' },
    // services
    { section: 'services', order: 1, question: 'Which trading platform is best for beginners?', answer: "If you're new to trading, the Finsai Trade App and Social Trading platform are great starting points. You can practice with demo accounts, copy experienced traders, and access user-friendly tools designed for beginners." },
    { section: 'services', order: 2, question: 'What makes MetaTrader 5 (MT5) different from other platforms?', answer: "MT5 is one of the world's most advanced trading platforms, offering professional-grade charting, automated trading through Expert Advisors (EAs), multi-timeframe analysis, and advanced strategy testing tools." },
    { section: 'services', order: 3, question: 'How does Social Trading work?', answer: 'Social Trading allows you to automatically copy trades from experienced traders in real time. You can review performance metrics, manage risk settings, and follow strategies that match your trading goals.' },
    { section: 'services', order: 4, question: 'Can experienced traders earn through the platform?', answer: 'Absolutely. With Social Trading, experienced traders can become strategy providers, build followers, and earn rewards based on their trading performance and community growth.' },
    // payments
    { section: 'payments', order: 1, question: 'What is the minimum deposit amount?', answer: 'The minimum deposit amount may vary depending on your account type and selected payment method. You can review the exact requirements before completing your deposit.' },
    { section: 'payments', order: 2, question: 'Are there any deposit or withdrawal fees?', answer: 'No. Finsai Trade charges no fees and only provides transparent funding.' },
    { section: 'payments', order: 3, question: 'How long do deposits take to process?', answer: 'Most deposits are processed quickly, with some payment methods offering near-instant funding. Processing times may vary depending on the selected provider and verification requirements.' },
    { section: 'payments', order: 4, question: 'Can I fund my account using crypto?', answer: 'Yes, Finsai Trade supports crypto payments, allowing traders to fund their accounts through supported digital assets in a secure and flexible way.' },
    { section: 'payments', order: 5, question: 'How do I withdraw my funds?', answer: 'You can request a withdrawal directly from your trading account dashboard. Simply choose your preferred withdrawal method, enter the amount, and follow the required verification steps.' },
    { section: 'payments', order: 6, question: 'Is my payment information secure?', answer: 'Yes. Finsai Trade uses secure payment infrastructure and advanced protection measures to help safeguard deposits, withdrawals, and sensitive payment details.' },
    // partnerships
    { section: 'partnerships', order: 1, question: 'What is the Finsai Trade Introducing Broker (IB) Program?', answer: "The Finsai Trade IB Program allows partners to earn commissions by referring traders to the platform. Whether you're an influencer, educator, affiliate, or trading community owner, you can build a recurring revenue stream by growing your client network with Finsai Trade." },
    { section: 'partnerships', order: 2, question: 'How do I earn commissions with Finsai Trade?', answer: 'As an IB partner, you earn commissions based on the trading activity of the clients you refer. Finsai Trade offers transparent tracking, competitive payouts, and performance-based rewards to help maximize your earning potential.' },
    { section: 'partnerships', order: 3, question: 'Do I need trading experience to join the Finsai Trade IB Program?', answer: "No. You don't need to be an experienced trader to become an IB partner. If you have an audience, network, or community interested in trading, you can start referring clients and earning commissions with Finsai Trade." },
    { section: 'partnerships', order: 4, question: 'What tools and support does Finsai Trade provide for IB partners?', answer: 'Finsai Trade provides IB partners with dedicated support, marketing materials, referral tracking tools, analytics dashboards, and prompt assistance to help you onboard clients and grow your business efficiently.' },
    // social-trading
    { section: 'social-trading', order: 1, question: 'What is Social Trading and how is it different from a managed account?', answer: 'Social Trading lets you copy the trades of a strategy provider in real time through your own MT5 account — you retain full ownership and control. Unlike a managed account, no one has direct access to your funds. You can stop copying at any time, no notice required.' },
    { section: 'social-trading', order: 2, question: 'Is my capital at risk?', answer: 'Yes. Trading financial instruments involves significant risk and is not suitable for all investors. You can lose some or all of your invested capital. Social Trading does not eliminate market risk. Please read our full risk disclosure before proceeding.' },
    { section: 'social-trading', order: 3, question: 'What is the minimum amount to start copying?', answer: 'The minimum allocation per copy relationship is $200. Each copied trade must be above the minimum lot size supported by your account type. Positions below this threshold will not be opened in your account.' },
    { section: 'social-trading', order: 4, question: "How is the provider's commission calculated?", answer: 'Providers earn a monthly performance-based commission set within a regulated range. The exact rate is disclosed on each provider\'s profile before you copy them. Commission is deducted from investor profits at the end of each billing cycle — providers only earn when you do.' },
    { section: 'social-trading', order: 5, question: 'Can I copy multiple providers at the same time?', answer: 'Yes. You can copy up to 10 strategy providers simultaneously from a single account, each with its own allocation and stop-loss configuration. This allows you to diversify across multiple strategies, instruments, and risk profiles.' },
    { section: 'social-trading', order: 6, question: 'How do I qualify to become a strategy provider?', answer: 'You need a live Finsai Trade MT5 account with at least 90 days of verified trading history, a minimum of 50 closed trades, and a risk score within our approved parameters. Apply through your client portal and our team will review your account within 5 business days.' },
    { section: 'social-trading', order: 7, question: 'How quickly are trades copied to my account?', answer: "Trades are typically executed in your account within milliseconds of the provider's original order. Execution speed depends on server latency and market conditions, but the system is built for near-instantaneous replication." },
  ];

  await replaceCollection(
    strapi,
    'api::faq.faq',
    faqs,
    'FAQs',
    (existing) =>
      existing.length === faqs.length &&
      existing.some((e) => e.section === 'homepage'),
  );
}

// ─── Homepage single-type ────────────────────────────────────────────

async function seedHomepage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::homepage.homepage', {
      heroTitle: 'Trade Global Markets on a Powerful Multi-Asset Trading Platform',
      heroSubtitle:
        'Finsai Trade is a secure trading platform that gives modern traders access to forex, stocks, commodities, and indices through one advanced trading ecosystem.',
      heroTaglines: [
        { label: 'Fast Execution' },
        { label: 'Advanced Trading Tools' },
        { label: 'Secure & Regulated Infrastructure' },
      ],
      heroCtaPrimaryLabel: 'Start Trading Now',
      heroCtaPrimaryHref: 'https://fx.finsaitrade.com/auth/register',
      heroCtaSecondaryLabel: 'Try Demo ->',
      heroCtaSecondaryHref: '/contactus',

      featuresBadge: 'What Sets Us Apart\u00a0',
      featuresTitle: 'Why Top Traders Choose Finsai Trade',
      featuresDescription:
        'Trade securely across 1,000+ assets on a globally regulated platform with transparent pricing and 24/7 expert support.',
      featureItems: [
        { iconKey: 'transparency', title: 'No Hidden Fees,\nTransparent Trades' },
        { iconKey: 'assets', title: '1000+\nAssets' },
        { iconKey: 'leverage', title: 'Up to 500x\nLeverage' },
        { iconKey: 'deposits', title: 'Instant Withdrawal \nand Deposits' },
        { iconKey: 'learning', title: 'Live\nLearning' },
        { iconKey: 'social', title: 'Social\ntrading' },
      ],

      marketsBadge: 'Trade Without Limits ',
      marketsTitlePrefix: 'Trade Every Market That Matters',
      marketsTitleAccent: '',
      marketsDescription:
        'Finsai Trade gives modern traders access to 5,000+ trading instruments across forex, crypto, global stocks, indices, commodities, and CFDs.',

      platformsBadge: 'Seamless Trading Experience',
      platformsTitle: 'Advanced Platforms for Every Trader',
      platformsDescription:
        'Trade with speed, stability, and total control from your desk or on the move. Finsai Trade delivers professional-grade platforms to match your trading needs.',

      accountsBadge: 'Find Your Fit',
      accountsTitle: 'Choose The Right Account For You.',
      accountsDescription:
        'Whether you’re just starting or trading at a higher level, find an account built to match your goals, experience, and trading style.',

      stepsBadge: 'Get Started',
      stepsTitle: 'Trade Global Markets in 3 Simple Steps',

      awardsBadge: 'Our Awards',
      awardsTitle: 'Recognized for Elite Trading Excellence',
      awardsDescription:
        'Trade seamlessly on the go or from your desktop with our cutting-edge platforms.',

      journeyBadge: 'Learn And Grow',
      journeyTitle: 'Your Trading Journey Starts Here',
      journeyDescription:
        'Trade seamlessly on the go or from your desktop with our cutting-edge platforms.',

      testimonialsBadge: 'Testimonials',
      testimonialsTitle: 'What Our Traders Say',

      ctaBadge: 'Get Started',
      ctaTitle: 'Ready to Explore Global Markets? ',
      ctaDescription:
        'Join active traders across 100+ global markets. Open a live account or try our demo of  powerful trading at your fingertips.',
      ctaFooterText:
        'Trading Forex and CFDs involves significant risk and may not be suitable for all investors. Please\nensure you fully understand the risks involved.',
      ctaButton1Label: 'Start Trading',
      ctaButton1Href: 'https://fx.finsaitrade.com/auth/register',
      ctaButton2Label: 'Try Demo',
      ctaButton2Href: 'https://fx.finsaitrade.com/auth/register',
      ctaButton3Label: 'Contact Us',
      ctaButton3Href: '/contactus',

      seo: buildSeo({
        title: 'Finsai Trade — Trade Global Markets Without Limits',
        description:
          'The powerful multi-asset trading platform for modern traders. Trade Forex, Crypto, Stocks, Indices, and Metals with tight spreads, up to 500x leverage, and 24/7 support.',
        path: '/',
        keywords:
          'finsai, finsai trade, online trading, forex, CFD, crypto trading, stocks, indices, MT5, multi-asset broker',
      }),
  }, 'Homepage');
}

// ─── Collection seeds ────────────────────────────────────────────────

async function seedMarkets(strapi: Core.Strapi) {
  const items = [
    { slug: 'forex',   name: 'Forex',   order: 1, description: 'Trade major, minor, and exotic forex pairs with deep liquidity, competitive spreads, and ultra-fast execution on the global foreign exchange market.' },
    { slug: 'crypto',  name: 'Crypto',  order: 2, description: 'Access leading cryptocurrencies and trade the digital asset market 24/7 with advanced charting tools, real-time pricing, and seamless execution.' },
    { slug: 'indices', name: 'Indices', order: 3, description: 'Trade top global stock indices and capture price movements across major economies, including US, European, Asian, and international markets.' },
    { slug: 'metals',  name: 'Metals',  order: 4, description: 'Diversify your portfolio with gold, silver, crude oil, natural gas, and other high-demand commodities traded across global markets.' },
    { slug: 'stocks',  name: 'Stocks',  order: 5, description: 'Invest and trade shares of leading international companies listed on major global stock exchanges through a professional online trading platform.' },
  ];

  await replaceCollection(
    strapi,
    'api::market.market',
    items,
    'markets',
    (existing) =>
      existing.length === items.length &&
      existing.some((m) => m.slug === 'crypto' && String(m.description).includes('seamless execution.')),
  );
}

async function seedPlatforms(strapi: Core.Strapi) {
  const count = await strapi.documents('api::platform.platform').count({});
  if (count > 0) return;

  // Mirrors FALLBACK_PLATFORMS in src/components/PlatformsSection.tsx so the
  // homepage rendering is identical whether Strapi is wired up or not.
  const items = [
    {
      title: 'MT5',
      size: 'large',
      row: 1,
      order: 1,
      description:
        " Access 44+ advanced charting tools, 38 built-in indicators, and 2,000+ custom indicators for deeper market analysis. Monitor price action across 21 timeframes, create custom Expert Advisors (EAs) with MQL5, and test strategies faster with multi-threaded optimization.",
    },
    {
      title: 'Social Trading',
      size: 'large',
      row: 2,
      order: 3,
      description:
        'Follow top-performing traders, mirror proven strategies in real time, and grow your portfolio with confidence — all from within the Finsai Trade platform.',
    },
    {
      title: 'App & More — Coming soon',
      size: 'small',
      row: 2,
      order: 4,
      description:
        'Stay connected to the markets on the go with a fast, secure, and intuitive mobile trading experience.',
    },
  ];

  for (const p of items) {
    await strapi.documents('api::platform.platform').create({
      data: {
        title: p.title,
        description: p.description,
        size: p.size as 'small' | 'large',
        row: p.row,
        order: p.order,
      },
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} platforms`);
}

async function seedSteps(strapi: Core.Strapi) {
  const count = await strapi.documents('api::step.step').count({});
  if (count > 0) return;

  const items = [
    { number: 1, title: 'Register',      description: 'Create your Finsai Trade account and access global multi-asset markets..', order: 1 },
    { number: 2, title: 'Verify',        description: 'Verify your identity securely to activate your trading account.',          order: 2 },
    { number: 3, title: 'Start Trading', description: 'Trade crypto, forex, commodities, indices, and more.',                     order: 3 },
  ];

  for (const s of items) {
    await strapi.documents('api::step.step').create({
      data: s,
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} steps`);
}

async function seedAwards(strapi: Core.Strapi) {
  const items = [
    { title: 'The Fastest Growing\nBroker 2024',         order: 1 },
    { title: 'The Fastest Growing\nBroker 2025',         order: 2 },
    { title: 'The Fastest Growing\nBroker 2025',         order: 3 },
    { title: 'Innovative Startup in\nFinance Award 2023', order: 4 },
  ];

  await replaceCollection(
    strapi,
    'api::award.award',
    items,
    'awards',
    (existing) =>
      existing.length === items.length &&
      existing.some((a) => a.order === 2 && a.title === items[1].title),
  );
}

async function seedTestimonials(strapi: Core.Strapi) {
  const items = [
    {
      name: 'David k',
      role: 'Client',
      initials: 'DK',
      quote:
        'Customer support actually listens and resolves issues quickly. It feels like a platform that really cares about its traders.',
      order: 1,
    },
    {
      name: 'Rohan M',
      role: 'Client',
      initials: 'RM',
      quote:
        'I’ve tried multiple trading platforms, but Finsai Trade feels different. The interface is clean and intuitive, making it so easy to track trades.',
      order: 2,
    },
    {
      name: 'Sarah L',
      role: 'Client',
      initials: 'SL',
      quote:
        'The webinars are incredibly valuable. I learned strategies in one session that I applied the very next day with great results.',
      order: 3,
    },
  ];

  await replaceCollection(
    strapi,
    'api::testimonial.testimonial',
    items,
    'testimonials',
    (existing) =>
      existing.length === items.length && existing[0]?.name === items[0].name,
  );
}

async function seedJourneyCards(strapi: Core.Strapi) {
  const count = await strapi.documents('api::journey-card.journey-card').count({});
  if (count > 0) return;

  // Mirrors FALLBACK_CARDS in src/components/JourneySection.tsx.
  const items = [
    { label: 'Blogs',           description: 'Explore professional insights on trading strategies, psychology, platform guides, and market trends.',                        linkLabel: 'Read Latest Articles', linkHref: '/blogs',                                  row: 'row1' as const, size: 'small' as const, order: 1 },
    { label: 'Finsai Academy',  description: 'Master trading with beginner-friendly lessons, advanced courses, and practical market education.',                            linkLabel: 'Start Learning Free',  linkHref: '/academy',                                row: 'row1' as const, size: 'large' as const, order: 2 },
    { label: 'News & Analysis', description: 'Stay updated with real-time market news, economic events, and expert commentary.',                                            linkLabel: 'Explore Now',          linkHref: '/news',                                   row: 'row2' as const, size: 'equal' as const, order: 3 },
    { label: 'Webinar',         description: 'Join live sessions with market experts covering strategies, platform tips, and real-time market analysis.',                   linkLabel: 'Browse Webinars',      linkHref: 'https://lms.finsaitrade.com/#webinars',   row: 'row2' as const, size: 'equal' as const, order: 4 },
    { label: 'Glossary',        description: 'Master trading terms and concepts with our comprehensive glossary built to help you trade with clarity and confidence.',      linkLabel: 'Explore Glossary',     linkHref: '/glossary',                               row: 'row2' as const, size: 'equal' as const, order: 5 },
  ];

  for (const j of items) {
    await strapi.documents('api::journey-card.journey-card').create({
      data: j,
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} journey cards`);
}

// ─── Page single types ───────────────────────────────────────────────

async function seedAboutPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::about-page.about-page', {
      heroBadge: 'Who We Are',
      heroTitle: 'Our Mission, Our Markets, Our Edge',
      heroDescription:
        'Helping traders access multiple asset classes while benefiting from educational resources, loyalty rewards, and partnership opportunities.\u00a0',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'Explore Our Services',
      heroSecondaryCtaHref: '/services',

      recognitionTitlePrefix: 'Recognized for Elite Trading ',
      recognitionTitleAccent: 'Excellence',
      recognitionDescription:
        ' Trusted by a growing community of traders for reliable execution, modern trading tools, and scalable partnership opportunities.\u00a0',
      recognitionStatPrimaryValue: '50k+',
      recognitionStatPrimaryLabel: 'Registered Users',
      recognitionStatSecondaryValue: '3M+',
      recognitionStatSecondaryLabel: 'Monthly Worldwide',

      builtBadge: 'Our Story',
      builtTitle: 'Built to Make Global Trading Simpler and More Accessible',
      builtDescription:
        'Founded by experienced traders and investors, Finsai Trade combines powerful market access, intuitive technology, and trader education into one seamless ecosystem.',
      builtPoints: [
        {
          title: 'Built By Traders',
          description:
            'Created by a team with deep experience across global markets, Finsai Trade was designed to solve the complexity traders face every day.',
        },
        {
          title: 'The Solutions',
          description:
            'Institutional-grade tools, transparent pricing and 24/7 multilingual support — engineered so every trader gets the same edge top desks have always enjoyed.',
        },
        {
          title: 'The Ecosystem',
          description:
            'From execution to insight, learning, automation and rewards — built end-to-end so nothing breaks at scale, no matter what market you trade.',
        },
      ],

      growthBadge: 'Our Principal',
      growthTitle: 'Your Trading Journey,\nStructured for Success.',
      growthDescription1:
        'By providing an integrated ecosystem that combines simplicity, innovation, and security, we aim to empower people to take charge of their financial future.',
      growthDescription2:
        'Our goal is to create a financial environment where people can trade, invest, and bank with confidence by bridging the gap between conventional finance and technological breakthroughs.',
      growthCtaLabel: 'Contact Us',
      growthCtaHref: '/contactus',
      growthStats: [
        { value: '50,000+', label: 'Traders' },
        { value: '20+',     label: 'Industry Experience' },
        { value: '120+',    label: 'World wide clients' },
        { value: '15+',     label: 'Industry Recognitions' },
      ],

      ctaBadge: 'Get Started',
      ctaTitle: 'Ready to Trade Smarter?',
      ctaDescription:
        'Join a platform built for active traders with multi-asset access, educational support, trading rewards, and scalable partner opportunities.',
      ctaPrimaryLabel: 'Get Started Today',
      ctaPrimaryHref: 'https://fx.finsaitrade.com/auth/register',
      ctaSecondaryLabel: 'Try Demo',
      ctaSecondaryHref: '/demo',

      seo: buildSeo({
        title: 'About Finsai Trade — Multi-Asset Broker & Trading Ecosystem',
        description:
          'Finsai Trade is a regulated multi-asset broker built by traders. Learn about our mission, recognition, and the integrated platform powering modern markets.',
        path: '/about',
        keywords:
          'about finsai trade, multi-asset broker, regulated broker, trading platform, online broker, finsai company',
      }),
  }, 'About Page');
}

async function seedCareersPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::careers-page.careers-page', {
      heroBadge: 'Careers at Finsai Trade',
      heroTitle: 'Build the Future of\nMulti-Asset Trading',
      heroDescription:
        'Join a vibrant global team focused on fintech, trading technology, global markets, and customer growth.',
      heroPrimaryCtaLabel: 'View Open Roles →',
      heroPrimaryCtaHref: '#open-roles',
      heroSecondaryCtaLabel: 'Join Our Team →',
      heroSecondaryCtaHref: '#apply',

      workspaceTitle: 'More than just a work space',
      workspaceDescription:
        "Finsai Trade is engineered to deliver seamless execution, institutional-grade tools and reliable uptime — so you can stay in control wherever you trade. Whether you're a beginner or a pro, our platform helps you trade smarter and faster.",
      workspaceBenefits: [
        { title: 'Collaborate with top talents', description: 'Deep dive into market dynamics with institutional tools.' },
        { title: 'Innovate & Make an Impact',    description: 'Real-time quotes and lightning-fast execution speed.' },
        { title: 'Growth & Development',         description: 'Advanced calculators and margin alerts to stay safe.' },
        { title: 'Global & Inclusive Culture',   description: 'Backtesting engines to refine your trading edge.' },
      ],

      formTitle: 'Apply Now',
      formSubmitLabel: 'MESSAGE US',
      formTermsText:
        'I have read and accepted the terms and conditions specified in the Privacy Policy and currently consent to the collecting, processing and disclosing of the personal data provided by me to fulfil the above-said purposes.',

      seo: buildSeo({
        title: 'Careers at Finsai Trade — Build the Future of Trading',
        description:
          'Join a global fintech team building the next generation of multi-asset trading. Open roles in engineering, trading, partnerships, and customer growth.',
        path: '/careers',
        keywords:
          'finsai careers, fintech jobs, trading platform jobs, work at finsai, open positions, careers',
      }),
  }, 'Careers Page');
}

async function seedAccountsPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::accounts-page.accounts-page', {
      heroBadge: 'Multi-Asset Trading Accounts',
      heroTitle: 'Find the Right Account for Your Trading Style',
      heroDescription:
        'From first-time traders to advanced professionals, Finsai Trade offers flexible account types built for every stage of your trading journey.',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'Try Free Demo',
      heroSecondaryCtaHref: 'https://fx.finsaitrade.com/auth/register',

      compareTitle: 'Which Account Fits You Best?',
      compareDescription:
        'Choose the trading conditions that match your goals, strategy, and experience level.',

      whyBadge: 'Why Trade Finsai',
      whyTitle: 'Everything You Need to Trade with Confidence',
      whyDescription:
        'Choose an account designed for your trading style with competitive pricing, fast execution, and flexible trading conditions.',
      whyFeatures: [
        { title: 'Tight spreads across\naccount types',        description: '', iconKey: 'chart' },
        { title: 'Fast and reliable trade\n execution',        description: '', iconKey: 'bolt' },
        { title: 'Flexible leverage\n options',               description: '', iconKey: 'scale' },
        { title: 'Swap-free accounts available',              description: '', iconKey: 'moon' },
        { title: 'MT5 access on desktop,\n web, and mobile', description: '', iconKey: 'devices' },
        { title: 'Dedicated multilingual\n support',           description: '', iconKey: 'globe' },
      ],

      onboardingBadge: 'Get Started',
      // FE component now only reads `onboardingTitle` ("Open Your Trading
      // Account" is the FE fallback).
      onboardingTitle: 'Open Your Trading Account',
      onboardingDescription:
        'From signup to first trade in minutes — KYC is fast, deposits are instant, and our team is on hand 24/7.',

      benefitsBadge: 'Account Benefits',
      benefitsTitle: 'Pick the Account That Pays You Back',
      benefitsDescription:
        'Every Finsai tier ships with its own combination of bonus credit, support tier and platform perks.',
      benefitsCards: [
        {
          title: 'Deposit & Withdrawal',
          description: 'Smooth, Secure, and fast Transactions',
          iconKey: 'wallet',
          footer: 'Note:',
          bullets: [
            { key: 'Deposit Method',         value: 'Crypto, E-wallets' },
            { key: 'Withdrawal Processing',  value: 'Within 24 business hours' },
            { key: 'Security Method',        value: 'Crypto, E-wallets' },
            { key: 'No Hidden Charges',      value: 'Transparent fee structure' },
          ],
        },
        {
          title: 'Smart Elite - Request Only  VIP Access',
          description: 'No downloads. Just log in and trade.',
          iconKey: 'vip',
          footer: 'Request Access',
          bullets: [
            { key: 'Deposit Method',         value: 'Crypto, E-wallets' },
            { key: 'Withdrawal Processing',  value: 'Within 24 business hours' },
            { key: 'Security Method',        value: 'Crypto, E-wallets' },
            { key: 'No Hidden Charges',      value: 'Transparent fee structure' },
          ],
        },
      ],

      seo: buildSeo({
        title: 'Trading Accounts | Finsai Trade — Smart Choice, Pro & ECN',
        description:
          'Compare Finsai Trade account types — Smart Choice, Smart Pro, and Smart ECN. Tight spreads, up to 1:500 leverage, MT5 across all devices, swap-free.',
        path: '/accounts',
        keywords:
          'trading account, smart choice, smart pro, smart ECN, MT5 account, low spread, high leverage, swap free',
      }),
  }, 'Accounts Page');
}

async function seedPaymentsPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::payments-page.payments-page', {
      heroBadge: 'Payment Solutions',
      heroTitle: 'Fund Your Trading Account with Secure Payments',
      heroDescription:
        'Deposit and withdraw funds seamlessly using trusted, fast and secure options.',
      heroPrimaryCtaLabel: 'Deposit Funds',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'View Methods',
      heroSecondaryCtaHref: '#methods',

      trustText:
        'Every transaction at Finsai Trade is protected by industry-leading security standards.',

      methodsBadge: 'Supported Methods',
      methodsTitle: 'Deposits & Withdrawals You Can Trust .',
      methodsDescription:
        'Deposits hit your account in seconds. Withdrawals are processed quickly, so your funds stay safe, accessible, and always within reach.',
      // The FE PaymentsMethodsSection is now fully hardcoded, but the schema
      // still exposes `methods` — keep a representative seed so the Strapi
      // admin UI isn't empty.
      methods: [
        { name: 'Payment Stack',        description: 'Choose from convenient funding and withdrawal options designed for global traders.', fee: '0%', processingTime: 'Instant' },
        { name: 'Fast Processing',      description: 'Fund your account instantly and access withdrawals without unnecessary delays.',     fee: '0%', processingTime: 'Instant' },
        { name: 'Secure Transactions',  description: 'Advanced security systems help protect every deposit and payout.',                   fee: '0%', processingTime: '100% secure' },
      ],

      ctaBadge: 'Ready to fund?',
      ctaTitle: ' Move Funds Faster. Trade Without Delays.',
      ctaDescription:
        'Add funds through trusted payment methods and stay focused on opportunities across forex, crypto, indices, and more.',
      ctaPrimaryLabel: 'Start Funding Now',
      ctaPrimaryHref: 'https://fx.finsaitrade.com/auth/register',

      seo: buildSeo({
        title: 'Payments — Secure Deposits & Withdrawals | Finsai Trade',
        description:
          'Fund your Finsai Trade account with cards, UPI, e-wallets, crypto, or bank transfer. Instant deposits, fast withdrawals, and PCI DSS-grade security.',
        path: '/payments',
        keywords:
          'finsai payments, deposit, withdrawal, crypto deposit, UPI deposit, secure payments, trading deposit',
      }),
  }, 'Payments Page');
}

async function seedServicesPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::services-page.services-page', {
      heroBadge: 'Professional Trading, Simplified\u00a0',
      heroTitle: 'Powerful Trading Platforms for Every Trader\u00a0',
      heroDescription:
        'Discover three powerful trading environments built for ambitious beginners, active traders, and professional market participants.',
      heroPrimaryCtaLabel: 'Start Trading →',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'Try Demo',
      heroSecondaryCtaHref: '/demo',

      featuresBadge: 'Features of Finsai Trade',
      featuresTitle: 'Built to Perform. Designed for You',
      featuresDescription:
        "Finsai Trade platforms are engineered to deliver seamless execution, institutional-level tools, and reliable uptime so you stay in control, wherever you trade. Whether you're a beginner or a pro, our platforms help you trade smarter and faster.",
      features: [
        { title: 'Lightning \n Fast Execution',     description: 'Microsecond order routing on every trade.',           iconKey: 'flash' },
        { title: 'Bank-Grade \n Security',          description: 'Funds segregated and protected by best-in-class encryption.', iconKey: 'shield' },
        { title: 'Multi-Device \n Compatibility',   description: 'Trade across desktop, web, and mobile seamlessly.',  iconKey: 'devices' },
        { title: 'Access Globally \n(India & UAE)', description: 'Regional coverage with localized payment rails.',    iconKey: 'globe' },
        { title: 'Advanced Charts \n& Tools',       description: '80+ indicators and pro charting on every screen.',   iconKey: 'chart' },
        { title: '24/7 Expert \n Support',          description: 'Live human support, 365 days a year.',               iconKey: 'support' },
      ],

      // FE platforms section is now three hardcoded stacked blocks (MT5,
      // Social Trading, App). Header copy isn't rendered, but we keep
      // sensible defaults for the Strapi admin UI.
      platformsBadge: 'Choose Your Platform',
      platformsTitle: 'Three Premium Platforms. Unlimited Trading Potential.',
      platformsDescription:
        'From advanced algorithmic trading to social copy trading, discover the ultimate platform for your trading style.',

      suiteBadge: 'Service Suite',
      suiteTitle: 'One platform suite\nEvery Trading Style',
      suiteDescription:
        "Finsai Trade platforms are engineered to deliver seamless execution, institutional-level tools, and reliable uptime — so you stay in control, wherever you trade. Whether you're a beginner or a pro, our platforms help you trade smarter and faster.",
      suiteItems: [
        { title: 'Beginner Mode',         description: 'Guided trades, tutorials & Simplified Workflows', iconKey: 'beginner' },
        { title: 'Pro Tools',             description: 'Guided trades, tutorials & Simplified Workflows', iconKey: 'pro' },
        { title: 'Seamless Switching',    description: 'Guided trades, tutorials & Simplified Workflows', iconKey: 'switch' },
        { title: 'Multi Lingual Support', description: 'Guided trades, tutorials & Simplified Workflows', iconKey: 'language' },
      ],

      seo: buildSeo({
        title: 'Trading Services | Finsai Trade — MT5, Social & Mobile',
        description:
          'Three trading environments built for every level. Trade with MT5, copy top performers via social trading, or stay connected with our upcoming mobile app.',
        path: '/services',
        keywords:
          'finsai services, MT5 platform, social trading, copy trading, trading app, multi-asset broker',
      }),
  }, 'Services Page');
}

async function seedPartnershipsPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::partnerships-page.partnerships-page', {
      heroBadge: 'IB & Affiliate',
      heroTitle: 'Join Finsai Trade as an Introducing Broker',
      heroDescription:
        'Earn attractive commissions from every client trade with higher conversions and stronger client retention.',
      heroPrimaryCtaLabel: 'Become an IB',
      heroPrimaryCtaHref: 'https://portal.finsaitrade.com/partner/register',
      heroSecondaryCtaLabel: 'View Calculator',
      heroSecondaryCtaHref: '#calculator',

      whyBadge: 'Why Finsai IB',
      whyTitle: 'Why Top IBs Choose Finsai Trade',
      whyDescription:
        'Built for partners who want faster growth, stronger earnings, and long-term success',
      whyCtaLabel: 'Start Earning Today →',
      whyCtaHref: 'https://fx.finsaitrade.com/auth/register',
      // IBWhyClient uses `iconKey` as the tab label. To match the FE
      // FALLBACK_TABS labels we set iconKey to the tab name.
      whyFeatures: [
        { title: 'Earn More from Every Active Client',     description: 'Competitive rebates designed to reward performance as your network grows.',     iconKey: 'Rebates' },
        { title: 'Track Every Result with Clarity',        description: 'Monitor referrals, trading activity, commissions, and payouts through detailed live reports.', iconKey: 'Detailed Reports' },
        { title: 'Scale Your Network More Efficiently',    description: 'Build and manage multi-level partner structures designed for long-term growth.', iconKey: 'Multi-Tier Mode' },
        { title: 'Trade with Confidence and Trust',        description: 'Partner with a secure and transparent trading environment built for modern traders.', iconKey: 'Regulated Broker' },
      ],

      calculatorBadge: 'Earnings Calculator',
      calculatorTitle: 'Calculate Your Earning Potential',
      calculatorDescription:
        'Adjust referrals and trade volume to estimate your monthly earnings instantly.',

      statsBadge: 'Built for Ambitious IBs',
      statsTitle: 'Join The Fastest Growing Partner Program Now',
      statsDescription:
        'Partners across the globe are scaling their networks with Finsai today.',
      statsCtaLabel: 'Be Our Partner →',
      statsCtaHref: 'https://fx.finsaitrade.com/auth/register',
      stats: [
        { value: '20,000 +', label: 'Trusted By Active Partners' },
        { value: '$10,000 +', label: 'Generated in Partner Revenue' },
        { value: '330 +', label: 'Explore Global Markets' },
        { value: '230 +', label: 'Reached  Partner Milestones' },
      ],

      howToBadge: 'How It Works',
      howToTitle: ' How to Become a Successful Introducing Broker',
      howToDescription:
        'Start earning with an easy partner program built for long-term growth.\u00a0',
      howToSteps: [
        { title: 'Sign Up',       description: 'Create your IB account and access your partner tools.', iconKey: 'pencil' },
        { title: 'Refer Clients', description: 'Share your referral link and grow your network.',       iconKey: 'rocket' },
        { title: 'Earn More',     description: 'Get rewarded from every eligible client trade.',        iconKey: 'money' },
      ],

      // FE has no marketing section anymore, but the schema still exposes
      // these fields — keep representative defaults.
      marketingBadge: 'Marketing Toolkit',
      marketingTitle: 'Everything You Need to Convert',
      marketingDescription:
        'High-converting marketing assets ready to go, no design team required.',
      marketingItems: [
        { title: 'Banners',        description: 'Display-ready banners in 50+ sizes.',           iconKey: 'flash' },
        { title: 'Landing Pages',  description: 'High-converting localized landers.',            iconKey: 'chart' },
        { title: 'Video Assets',   description: 'Short-form explainers and tutorials.',          iconKey: 'bot' },
      ],

      seo: buildSeo({
        title: 'IB & Affiliate Partnerships | Finsai Trade',
        description:
          'Earn industry-leading commissions with the Finsai Trade IB program. Multi-tier rebates, real-time reports, and fast payouts for partners worldwide.',
        path: '/partnerships',
        keywords:
          'introducing broker, IB program, affiliate, partner, finsai partnerships, broker commission, trading affiliate',
      }),
  }, 'Partnerships Page');
}

async function seedBlogsPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::blogs-page.blogs-page', {
      heroBadge: 'Trader Knowledge Hub',
      heroTitle: 'Market Insights & Education',
      heroDescription:
        'Sharp market insights, real trading education, and analysis you can actually act on.',
      heroPrimaryCtaLabel: 'Explore Insights',
      heroPrimaryCtaHref: '/blogs',
      heroSecondaryCtaLabel: 'Subscribe',
      heroSecondaryCtaHref: '#subscribe',

      newsBadge: 'Market News & Analysis ',
      newsTitle: 'Stay Ahead of Every Market Move',
      newsDescription:
        'Track market-moving events, technical setups, and macro trends shaping forex, crypto, commodities, and indices.',
      // BlogsNewsSection prepends Strapi articles and fills the rest from a
      // local fallback list. We seed 4 cards mirroring the FE fallback so
      // the rendered output is identical.
      newsArticles: [
        {
          title: 'News & Analysis',
          description: 'Stay updated with real-time market news, economic events, and expert commentary.',
          href: '/news',
        },
        {
          title: 'Webinar',
          description: 'Join live sessions with market experts covering strategies, platform tips, and real-time market analysis.',
          href: 'https://lms.finsaitrade.com/#webinars',
        },
        {
          title: 'News & Analysis',
          description: 'Stay updated with real-time market news, economic events, and expert commentary.',
          href: '/news',
        },
        {
          title: 'Webinar',
          description: 'Join live sessions with market experts covering strategies, platform tips, and real-time market analysis.',
          href: 'https://lms.finsaitrade.com/#webinars',
        },
      ],

      seo: buildSeo({
        title: 'Trader Knowledge Hub — Blogs & Market News | Finsai Trade',
        description:
          'Sharp market insights, trading education, and analysis you can act on. Track macro events, technical setups, and platform updates from Finsai Trade.',
        path: '/blogs',
        keywords:
          'finsai blogs, trading news, market analysis, trading education, finsai webinar, fintech blog',
      }),
  }, 'Blogs Page');
}

async function seedContactusPage(strapi: Core.Strapi) {
  await syncSingleType(strapi, 'api::contactus-page.contactus-page', {
      heroBadge: 'SUPPORT AT FINSAI TRADE',
      heroTitle: 'We Are  Here to help\nyou',
      heroDescription:
        'Join a vibrant global team focused on fintech, trading technology, global markets, and customer growth.',
      heroPrimaryCtaLabel: 'View Open Roles',
      heroPrimaryCtaHref: '#open-roles',
      heroSecondaryCtaLabel: 'Reach Out to our Team',
      heroSecondaryCtaHref: '#contact-form',

      supportTitle: 'Global Support Availability',
      supportDescription:
        'Join a workplace focused on growth, flexibility, ownership, and meaningful impact across global fintech and trading markets.',
      supportBenefits: [
        { title: 'Quick Response',           description: 'We respond fast and value your time.' },
        { title: 'Transparency',             description: 'Clear communication at every step.' },
        { title: 'Dedicated Resolution',     description: 'We are committed to resolving your issues.' },
        { title: 'Multi- Language Support',  description: '' },
      ],

      formSubmitLabel: 'MESSAGE US',
      formTermsText:
        'I have read and accepted the terms and conditions specified in the Privacy Policy and do here by consent to the collecting, processing and/or disclosing of the personal data provided by me to fulfil the above-said purposes.',

      seo: buildSeo({
        title: 'Contact Finsai Trade — Global Support Across Fintech',
        description:
          'Get in touch with Finsai Trade for support, partnerships, and inquiries. Multilingual support team available across global markets — fast and transparent.',
        path: '/contactus',
        keywords:
          'contact finsai, customer support, finsai help, partnership inquiry, broker support, contact us',
      }),
  }, 'Contact Us Page');
}

// ─── Lifecycle ───────────────────────────────────────────────────────

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicReadPermissions(strapi);
    await seedAccountTiers(strapi);
    await seedFaqs(strapi);
    await seedHomepage(strapi);
    await seedMarkets(strapi);
    await seedPlatforms(strapi);
    await seedSteps(strapi);
    await seedAwards(strapi);
    await seedTestimonials(strapi);
    await seedJourneyCards(strapi);
    await seedAboutPage(strapi);
    await seedCareersPage(strapi);
    await seedAccountsPage(strapi);
    await seedPaymentsPage(strapi);
    await seedServicesPage(strapi);
    await seedPartnershipsPage(strapi);
    await seedBlogsPage(strapi);
    await seedContactusPage(strapi);
  },
};
