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
  // Page single types
  'about-page': ['find', 'findOne'],
  'careers-page': ['find', 'findOne'],
  'accounts-page': ['find', 'findOne'],
  'payments-page': ['find', 'findOne'],
  'platform-page': ['find', 'findOne'],
  'partnerships-page': ['find', 'findOne'],
  'blogs-page': ['find', 'findOne'],
  'contactus-page': ['find', 'findOne'],
  'social-trading-page': ['find', 'findOne'],
  'glossary-page': ['find', 'findOne'],
  'regulations-page': ['find', 'findOne'],
  'privacy-policy-page': ['find', 'findOne'],
  'terms-conditions-page': ['find', 'findOne'],
  'risk-disclosure-page': ['find', 'findOne'],
  'aml-policy-page': ['find', 'findOne'],
  'refund-policy-page': ['find', 'findOne'],
  'client-agreement-page': ['find', 'findOne'],
  'upfront-disclosure-page': ['find', 'findOne'],
  'complaints-management-page': ['find', 'findOne'],
  'conflicts-of-interest-policy-page': ['find', 'findOne'],
};


type SeoSeed = {
  metaTitle: string;
  metaDescription: string;
  keywords?: string;
  metaRobots?: string;
  canonicalURL?: string;
  metaViewport?: string;
  structuredData?: any;
  metaSocial?: {
    socialNetwork: 'Facebook' | 'Twitter' | 'LinkedIn';
    title: string;
    description: string;
  }[];
};

const SITE_BASE = 'https://finsaitrade.com';
const FINSAI_LICENSE_NO = 'GB25204899';

function buildSeo(args: {
  title: string;
  description: string;
  path: string;
  keywords?: string;
  type?: 'website' | 'article';
}): SeoSeed {
  const canonicalURL =
    args.path === '/' ? `${SITE_BASE}/` : `${SITE_BASE}${args.path}`;
  const metaTitle =
    args.title.length > 60 ? args.title.slice(0, 60) : args.title;
  const metaDescription =
    args.description.length > 160
      ? args.description.slice(0, 160)
      : args.description;
  const socialDescription =
    args.description.length > 200
      ? args.description.slice(0, 200)
      : args.description;

  return {
    metaTitle,
    metaDescription,
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
        title: metaTitle,
        description: socialDescription,
      },
      {
        socialNetwork: 'Twitter',
        title: metaTitle,
        description: socialDescription,
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

/** Seed a single-type only when it has no document yet. Never overwrites editor content. */
async function seedSingleType(
  strapi: Core.Strapi,
  uid: string,
  data: Record<string, unknown>,
  label: string,
) {
  const existing = (await strapi.documents(uid as never).findFirst({})) as {
    documentId: string;
  } | null;
  if (existing) {
    strapi.log.info(`[bootstrap] ${label} already exists — skipping seed`);
    return;
  }
  await strapi.documents(uid as never).create({ data, status: 'published' });
  strapi.log.info(`[bootstrap] Seeded ${label}`);
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

async function migrateFaqServicesSection(strapi: Core.Strapi) {
  const legacy = (await strapi.documents('api::faq.faq').findMany({
    filters: { section: { $eq: 'services' as never } },
  })) as Array<{ documentId: string }>;

  for (const row of legacy) {
    await strapi.documents('api::faq.faq').update({
      documentId: row.documentId,
      data: { section: 'platform' } as Record<string, unknown>,
      status: 'published',
    });
  }

  if (legacy.length > 0) {
    strapi.log.info(
      `[bootstrap] Migrated ${legacy.length} FAQs from services → platform`,
    );
  }
}

async function seedFaqs(strapi: Core.Strapi) {
  await migrateFaqServicesSection(strapi);

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
    // platform
    { section: 'platform', order: 1, question: 'Which trading platform is best for beginners?', answer: "If you're new to trading, the Finsai Trade App and Social Trading platform are great starting points. You can practice with demo accounts, copy experienced traders, and access user-friendly tools designed for beginners." },
    { section: 'platform', order: 2, question: 'What makes MetaTrader 5 (MT5) different from other platforms?', answer: "MT5 is one of the world's most advanced trading platforms, offering professional-grade charting, automated trading through Expert Advisors (EAs), multi-timeframe analysis, and advanced strategy testing tools." },
    { section: 'platform', order: 3, question: 'How does Social Trading work?', answer: 'Social Trading allows you to automatically copy trades from experienced traders in real time. You can review performance metrics, manage risk settings, and follow strategies that match your trading goals.' },
    { section: 'platform', order: 4, question: 'Can experienced traders earn through the platform?', answer: 'Absolutely. With Social Trading, experienced traders can become strategy providers, build followers, and earn rewards based on their trading performance and community growth.' },
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
  await seedSingleType(strapi, 'api::homepage.homepage', {
      heroTitle: 'Trade Global Markets on a Powerful Multi-Asset Trading Platform',
      heroSubtitle:
        'Finsai Trade is a secure online trading platform that gives modern traders access to forex, stocks, commodities, and indices through one advanced trading ecosystem.',
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
        ' Start trading online securely across 1,000+ assets on a globally regulated platform with transparent pricing and 24/7 expert support.',
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
        title: 'Multi-Asset Online Trading Platform | Finsai Trade',
        description:
          'Multi-asset online trading platform designed for forex trading, market analysis, copy trading, and advanced trading strategies.',
        path: '/',
        keywords:
          'finsai, finsai trade, online trading, forex, CFD, crypto trading, stocks, indices, MT5, MetaTrader 5, multi-asset broker',
      }),
  }, 'Homepage');
}

// ─── Collection seeds ────────────────────────────────────────────────

async function seedMarkets(strapi: Core.Strapi) {
  const items = [
    { slug: 'forex',   name: 'Forex',   order: 1, description: 'Trade the global forex market with a trusted forex broker, offering major, minor, and exotic currency pairs, deep liquidity, competitive spreads, and ultra-fast execution.' },
    { slug: 'crypto',  name: 'Crypto',  order: 2, description: 'Access leading cryptocurrency trading markets 24/7 with real-time pricing, advanced charting, and seamless execution on a professional trading platform.' },
    { slug: 'indices', name: 'Indices', order: 3, description: 'Trade major stock indices from the US, Europe, Asia, and global markets to capitalize on market movements through advanced indices trading tools.' },
    { slug: 'metals',  name: 'Metals',  order: 4, description: 'Explore commodity trading opportunities with gold, silver, crude oil, natural gas, and other globally traded commodities from a single platform.' },
    { slug: 'stocks',  name: 'Stocks',  order: 5, description: 'Experience online stock trading with access to leading international companies listed on major global stock exchanges through one professional trading platform.' },
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
        " Trade on MetaTrader 5 (MT5), the leading forex trading platform. Leverage 44+ charting tools, 38 built-in + 2,000+ custom indicators, and 21 timeframes for deeper analysis. Create expert advisors with MQL5 and optimize algorithmic trading strategies through multi-threaded testing.",
    },
    {
      title: 'Social Trading',
      size: 'large',
      row: 2,
      order: 3,
      description:
        "Follow top-performing traders and mirror proven strategies in real time with Finsai Trade's social trading and copy trading platform, grow your portfolio with confidence, all in one place.",
    },
    {
      title: 'App & More — Coming soon',
      size: 'small',
      row: 2,
      order: 4,
      description:
        'Stay connected to the markets on the go with the Finsai Trade mobile trading app fast, secure, and intuitive trading app experience.',
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

// ─── Page single types ───────────────────────────────────────────────

async function seedAboutPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::about-page.about-page', {
      heroBadge: 'Who We Are',
      heroTitle: 'Our Mission, Our Markets, Our Edge',
      heroDescription:
        'Helping traders access multiple asset classes while benefiting from educational resources, loyalty rewards, and partnership opportunities.\u00a0',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'Explore Our Platform',
      heroSecondaryCtaHref: '/platform',

      recognitionTitlePrefix: 'Recognized for Elite Trading ',
      recognitionTitleAccent: 'Excellence',
      recognitionDescription:
        ' Trusted by a growing community of traders for reliable execution, modern trading tools, and scalable partnership opportunities.\u00a0',
      recognitionStatPrimaryValue: '50k+',
      recognitionStatPrimaryLabel: 'Registered Users',

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
      growthFeatures: [
        { title: 'Transparent Trading', description: 'Clear pricing and straightforward trading conditions.' },
        { title: 'Trader-First Experience', description: 'Built to make trading simple, smooth, and accessible.' },
        { title: 'Reliable Technology', description: 'Fast execution with dependable platform performance.' },
        { title: 'Learn & Grow', description: 'Educational resources to help traders improve continuously.' },
      ],
      growthCtaLabel: 'Contact Us',
      growthCtaHref: '/contactus',
      growthStats: [
        { value: '50,000+', label: 'Traders' },
        { value: '20+',     label: 'Industry Experience' },
        { value: '120+',    label: 'World wide clients' },
        { value: '15+',     label: 'Industry Recognitions' },
      ],

      ctaTitle: 'Ready to Trade Smarter?',
      ctaDescription:
        'Join a platform built for active traders with multi-asset access, educational support, trading rewards, and scalable partner opportunities.',
      ctaPrimaryLabel: 'Get Started Today',
      ctaPrimaryHref: 'https://fx.finsaitrade.com/auth/register',

      seo: buildSeo({
        title: 'About Finsai Trade — Multi-Asset Broker & Trading Ecosystem',
        description:
          'Finsai Trade is a multi-asset broker built by traders. Discover our mission, vision, awards and the team driving financial growth in the digital era.',
        path: '/about',
        keywords:
          'about finsai trade, multi-asset broker, regulated broker, trading platform, online broker, finsai company',
      }),
  }, 'About Page');
}

async function seedCareersPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::careers-page.careers-page', {
      // Mirrors CareersHeroSection FALLBACK
      heroBadge: 'Careers at Finsai Trade',
      heroTitle: 'Build the Future of\nMulti-Asset Trading',
      heroDescription:
        'Join a vibrant global team focused on fintech, trading technology, global markets, and customer growth.',
      heroSecondaryCtaLabel: 'Join Our Team →',
      heroSecondaryCtaHref: '#apply',

      // Mirrors CareersWorkspaceFormSection FALLBACK
      workspaceTitle: 'Why Work With Finsai Trade',
      workspaceDescription:
        'Join a workplace focused on growth, flexibility, ownership, and meaningful impact across global fintech and trading markets.',
      workspaceBenefits: [
        {
          title: 'Growth That Moves Fast',
          description:
            'Learn quickly through high-impact projects and cross-functional collaboration.',
        },
        {
          title: 'Ownership & Autonomy',
          description: 'Take initiative, share ideas, and drive meaningful outcomes.',
        },
        {
          title: 'Flexible Team Culture',
          description:
            'Work in a transparent and collaborative environment built around flexibility.',
        },
        {
          title: 'Real Global Impact',
          description: 'Build products and experiences used by traders worldwide.',
        },
      ],

      formTitle: 'Apply Now',
      formSubmitLabel: 'MESSAGE US',
      formTermsText:
        'I have read and accepted the terms and conditions specified in the Privacy Policy and currently consent to the collecting, processing and disclosing of the personal data provided by me to fulfil the above-said purposes.',

      seo: buildSeo({
        title: 'Careers at Finsai Trade — Build the Future of Trading',
        description:
          'Join the Finsai Trade team and help build the future of multi-asset trading.',
        path: '/careers',
        keywords:
          'finsai careers, fintech jobs, trading platform jobs, work at finsai, open positions, careers',
      }),
  }, 'Careers Page');
}

async function seedAccountsPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::accounts-page.accounts-page', {
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

      onboardingTitle: 'Open Your Trading Account',
      onboardingSteps: [
        { title: 'Sign Up', description: 'Create your trading account in minutes.', iconKey: 'signup' },
        { title: 'Verify', description: 'Complete secure KYC verification.', iconKey: 'verify' },
        { title: 'Funds', description: 'Deposit using your preferred payment method.', iconKey: 'fund' },
        { title: 'Start Trading', description: 'Access markets instantly on MT5.', iconKey: 'trade' },
      ],
      onboardingCtaLabel: 'Open Live Account',
      onboardingCtaHref: 'https://fx.finsaitrade.com/auth/register',

      seo: buildSeo({
        title: 'Trading Accounts | Finsai Trade — Smart Choice, Pro & ECN',
        description:
          'Compare Finsai Trade account types and pick the one that fits your style — Smart Choice, Smart Pro, and Smart ECN.',
        path: '/accounts',
        keywords:
          'trading account, smart choice, smart pro, smart ECN, MT5 account, low spread, high leverage, swap free',
      }),
  }, 'Accounts Page');
}

async function seedPaymentsPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::payments-page.payments-page', {
      heroBadge: 'Payment Solutions',
      heroTitle: 'Fund Your Trading Account with Secure Payments',
      heroDescription:
        'Deposit and withdraw funds seamlessly using trusted, fast and secure options.',
      heroPrimaryCtaLabel: 'Deposit Funds',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',

      methodsTitle: 'Deposits & Withdrawals You Can Trust .',
      methodsDescription:
        'Deposits hit your account in seconds. Withdrawals are processed quickly, so your funds stay safe, accessible, and always within reach.',

      ctaTitle: ' Move Funds Faster. Trade Without Delays.',
      ctaDescription:
        'Add funds through trusted payment methods and stay focused on opportunities across forex, crypto, indices, and more.',
      ctaPrimaryLabel: 'Start Funding Now',
      ctaPrimaryHref: 'https://fx.finsaitrade.com/auth/register',

      seo: buildSeo({
        title: 'Payments — Secure Deposits & Withdrawals | Finsai Trade',
        description:
          'Fund your Finsai Trade account securely with cards, UPI, e-wallets, crypto, and bank transfer. Industry-leading PCI DSS encryption.',
        path: '/payments',
        keywords:
          'finsai payments, deposit, withdrawal, crypto deposit, UPI deposit, secure payments, trading deposit',
      }),
  }, 'Payments Page');
}

async function seedPlatformPage(strapi: Core.Strapi) {
  const data: Record<string, unknown> = {
    heroBadge: 'Professional Trading, Simplified\u00a0',
    heroTitle: 'Powerful Trading Platforms for Every Trader\u00a0',
    heroDescription:
      'Discover three powerful trading environments built for ambitious beginners, active traders, and professional market participants.',
    heroPrimaryCtaLabel: 'Start Trading →',
    heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',

    platformsBadge: 'Choose Your Platform',
    platformsTitle: 'Three Premium Platforms.\nUnlimited Trading Potential.',
    platformsDescription:
      'From advanced algorithmic trading to social copy trading, discover the ultimate platform for your trading style.',
    platforms: [
      {
        slug: 'mt5',
        title: 'MT5',
        subtitle: "The World's Most Powerful Trading Platform",
        description:
          'Experience MetaTrader 5 - the globally trusted trading platform known for lightning-fast execution, elite analysis tools, and unmatched flexibility.',
        features: [
          { text: '44+ advanced charting tools' },
          { text: '38 built-in indicators' },
          { text: '2,000+ custom indicators' },
          { text: 'Analyze markets across 21 timeframes' },
          { text: 'Build and automate strategies with Expert Advisors (EAs)' },
          { text: 'Advanced  Back-testing tools' },
        ],
        imagePath: '/service/mt5-platform.jpg',
        imageAlt: 'MetaTrader 5 platform',
        ctaLabel: 'Learn More About MT5',
        ctaHref: 'https://fx.finsaitrade.com/auth/register',
        showAppStores: false,
        reverse: false,
      },
      {
        slug: 'social',
        title: 'Social Trading',
        subtitle: 'Copy, Trade, or Earn with Social Trading',
        description:
          'Follow experienced traders or become a strategy provider. Copy expert trades live, or share your strategy and earn rewards.',
        features: [
          { text: 'Auto-Copy Execution' },
          { text: 'Strategy Monetization' },
          { text: 'Integrated Risk Controls' },
          { text: 'Verified Performance Metrics' },
        ],
        imagePath: '/service/social-trading.jpg',
        imageAlt: 'Social trading network',
        ctaLabel: 'Learn More About Social Trading',
        ctaHref: '/social-trading',
        showAppStores: false,
        reverse: true,
      },
      {
        slug: 'app',
        title: 'App (Coming Soon)',
        subtitle: 'Powerful Mobile Trading On The Go',
        description:
          'The Finsai Trade App puts fast, seamless multi-asset trading directly in your hands - anytime, anywhere.',
        features: [
          { text: '1,000+ Instruments, One Tap' },
          { text: 'Live News & Market Insights' },
          { text: 'Risk-Free Demo Trading' },
          { text: 'Copy Trading & Expert Signals' },
          { text: 'Multi-Currency, All-in-One' },
        ],
        imagePath: '/service/app-soon.png',
        imageAlt: 'Finsai Trade mobile app',
        showAppStores: true,
        reverse: false,
      },
    ],

    seo: buildSeo({
      title: 'Trading Platforms | Finsai Trade — MT5, Social & Mobile',
      description:
        'Three trading environments built for every level. Trade with MT5, copy top performers via social trading, or stay connected with our upcoming mobile app.',
      path: '/platform',
      keywords:
        'finsai platform, MT5 platform, social trading, copy trading, trading app, multi-asset broker',
    }),
  };

  const uid = 'api::platform-page.platform-page';
  const existing = (await strapi.documents(uid as never).findFirst({
    populate: ['platforms'],
  })) as { documentId: string; platforms?: unknown[] } | null;

  if (!existing) {
    await strapi.documents(uid as never).create({ data, status: 'published' });
    strapi.log.info('[bootstrap] Seeded Platform Page');
    return;
  }

  if (!existing.platforms?.length) {
    await strapi.documents(uid as never).update({
      documentId: existing.documentId,
      data,
      status: 'published',
    });
    strapi.log.info('[bootstrap] Migrated Platform Page to new schema');
    return;
  }

  strapi.log.info('[bootstrap] Platform Page already exists — skipping seed');
}

async function seedPartnershipsPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::partnerships-page.partnerships-page', {
      heroBadge: 'IB & Affiliate',
      heroTitle: 'Join Finsai Trade as an Introducing Broker',
      heroDescription:
        'Earn attractive commissions from every client trade with higher conversions and stronger client retention.',
      heroPrimaryCtaLabel: 'Become an IB',
      heroPrimaryCtaHref: 'https://portal.finsaitrade.com/partner/register',

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

      ctaBadge: 'Grow As An IB',
      ctaTitle: 'Start Earning as an Introducing Broker',
      ctaDescription:
        'Build a thriving partner business with smarter tools, seamless onboarding, and growth-focused\nrewards.',
      ctaFooterText:
        'Trading Forex and CFDs involves significant risk and may not be suitable for all investors. Please\nensure you fully understand the risks involved.',
      ctaButton1Label: 'Become an IB Partner',
      ctaButton1Href: 'https://portal.finsaitrade.com/partner/register',
      ctaButton2Label: 'Talk to Us',
      ctaButton2Href: '/contactus',
      ctaButton3Label: 'Start a Demo Account',
      ctaButton3Href: 'https://fx.finsaitrade.com/auth/register',

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
  await seedSingleType(strapi, 'api::blogs-page.blogs-page', {
      heroBadge: 'Trader Knowledge Hub',
      heroTitle: 'Market Insights & Education',
      heroDescription:
        'Sharp market insights, real trading education, and analysis you can actually act on.',
      heroPrimaryCtaLabel: 'Explore Insights',
      heroPrimaryCtaHref: '/blogs',

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
  await seedSingleType(strapi, 'api::contactus-page.contactus-page', {
      // Mirrors ContactUsHeroSection FALLBACK
      heroBadge: 'SUPPORT AT FINSAI TRADE',
      heroTitle: 'We Are  Here to help\nyou',
      heroDescription:
        'Join a vibrant global team focused on fintech, trading technology, global markets, and customer growth.',
      heroSecondaryCtaLabel: 'Reach Out to our Team',
      heroSecondaryCtaHref: '#contact-form',

      // Mirrors ContactSupportFormSection defaults (contactus/page.tsx)
      supportTitle: 'Global Support Availability',
      supportDescription:
        'Join a workplace focused on growth, flexibility, ownership, and meaningful impact across global fintech and trading markets.',
      supportBenefits: [
        {
          title: 'Quick Response',
          description: 'We respond fast and value your time.',
        },
        {
          title: 'Transparency',
          description: 'Clear communication at every step.',
        },
        {
          title: 'Dedicated Resolution',
          description: 'We are committed to resolving your issues.',
        },
        { title: 'Multi- Language Support', description: '' },
      ],

      formSubmitLabel: 'MESSAGE US',
      formTermsText:
        'I have read and accepted the terms and conditions specified in the Privacy Policy and currently consent to the collecting, processing and disclosing of the personal data provided by me to fulfil the above-said purposes.',

      seo: buildSeo({
        title: 'Contact Finsai Trade — Global Support Across Fintech',
        description:
          'Get in touch with the Finsai Trade team for support, partnerships, and inquiries.',
        path: '/contactus',
        keywords:
          'contact finsai, customer support, finsai help, partnership inquiry, broker support, contact us',
      }),
  }, 'Contact Us Page');
}

async function seedSocialTradingPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::social-trading-page.social-trading-page', {
      heroBadge: 'Social Trading · Now Live',
      heroTitle: 'Copy, Trade, or Earn\nwith Social Trading',
      heroDescription:
        'Follow experienced traders or become a strategy provider. Copy traders live, share your strategy, and earn rewards.',
      heroPrimaryCtaLabel: 'Become a Follower',
      heroPrimaryCtaHref:
        'https://social.finsaitrade.com/portal/registration/subscription?redirectUrl=%2F',
      heroSecondaryCtaLabel: 'Become a Provider',
      heroSecondaryCtaHref:
        'https://social.finsaitrade.com/portal/registration/provider?redirectUrl=%2F',
      heroStats: [
        { value: '10,000+', label: 'Active Investors' },
        { value: '150+', label: 'Strategy Providers' },
        { value: '$2.4M+', label: 'Volume Copied' },
      ],
      seo: buildSeo({
        title: 'Social Trading — Copy Top Traders | Finsai Trade',
        description:
          'Follow experienced traders or become a strategy provider. Copy trades live, share your strategy, and earn rewards with Finsai Trade Social Trading.',
        path: '/social-trading',
        keywords:
          'social trading, copy trading, strategy provider, finsai social, MT5 copy trading',
      }),
  }, 'Social Trading Page');
}

async function seedGlossaryPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::glossary-page.glossary-page', {
      heroBadge: 'Trading Dictionary',
      heroTitle: 'Trading Terms,\nExplained Clearly',
      heroDescription:
        'Your A-Z guide to every term in trading, forex, CFDs, indices, commodities, and crypto - written for traders who want clarity, not jargon.',
      seo: buildSeo({
        title: 'Trading Glossary - A-Z Guide to Trading Terms | Finsai Trade',
        description:
          'Clear, jargon-free definitions for every trading term - forex, CFDs, indices, commodities, crypto, MT5, leverage, spreads, and more. Search or browse A-Z.',
        path: '/glossary',
        keywords:
          'trading glossary, forex terms, CFD definitions, trading dictionary, finsai glossary',
      }),
  }, 'Glossary Page');
}

async function seedRegulationsPage(strapi: Core.Strapi) {
  await seedSingleType(strapi, 'api::regulations-page.regulations-page', {
      pageTitle: 'Regulations & Compliance — FINSAI TRADE LTD',
      seo: buildSeo({
        title: 'Finsai Trade Regulation & Compliance | Mauritius FSC Licensed',
        description: `Finsai Trade is regulated by the Financial Services Commission Mauritius (License ${FINSAI_LICENSE_NO}). Learn more about our legal framework and fund protection.`,
        path: '/regulations',
        keywords:
          'finsai regulation, FSC Mauritius, licensed broker, compliance, fund protection',
      }),
  }, 'Regulations Page');
}

type LegalPageSeed = {
  uid: string;
  label: string;
  pageTitle: string;
  title: string;
  description: string;
  path: string;
  keywords: string;
};

async function seedLegalPage(strapi: Core.Strapi, seed: LegalPageSeed) {
  await seedSingleType(strapi, seed.uid, {
    pageTitle: seed.pageTitle,
    seo: buildSeo({
      title: seed.title,
      description: seed.description,
      path: seed.path,
      keywords: seed.keywords,
    }),
  }, seed.label);
}

async function seedLegalPages(strapi: Core.Strapi) {
  const pages: LegalPageSeed[] = [
    {
      uid: 'api::privacy-policy-page.privacy-policy-page',
      label: 'Privacy Policy Page',
      pageTitle: 'Privacy Policy',
      title: 'Privacy Policy',
      description:
        'Finsai Trade Privacy Policy describing how we collect, use, store and share your personal information.',
      path: '/privacy-policy',
      keywords: 'privacy policy, finsai privacy, data protection, personal information',
    },
    {
      uid: 'api::terms-conditions-page.terms-conditions-page',
      label: 'Terms & Conditions Page',
      pageTitle: 'Terms & Conditions',
      title: 'Terms & Conditions',
      description:
        'Finsai Trade Terms & Conditions covering Welcome Bonus eligibility, usage, expiry and Trading Competition rules.',
      path: '/terms-conditions',
      keywords: 'terms and conditions, finsai terms, trading competition rules, welcome bonus',
    },
    {
      uid: 'api::risk-disclosure-page.risk-disclosure-page',
      label: 'Risk Disclosure Page',
      pageTitle: 'Risk Disclosure and Warnings Notice',
      title: 'Risk Disclosure and Warnings Notice',
      description:
        'Finsai Trade Risk Disclosure and Warnings Notice describing the risks associated with trading CFDs, foreign exchange, cryptocurrencies and other financial instruments.',
      path: '/risk-disclosure',
      keywords: 'risk disclosure, trading risks, CFD risks, forex warnings, finsai risk notice',
    },
    {
      uid: 'api::aml-policy-page.aml-policy-page',
      label: 'AML Policy Page',
      pageTitle: 'Anti-Money Laundering Policy',
      title: 'Anti-Money Laundering Policy',
      description:
        'Finsai Trade Anti-Money Laundering Policy describing our client due diligence, AML compliance program, training and reporting obligations.',
      path: '/aml-policy',
      keywords: 'AML policy, anti money laundering, KYC, client due diligence, finsai compliance',
    },
    {
      uid: 'api::refund-policy-page.refund-policy-page',
      label: 'Refund Policy Page',
      pageTitle: 'Refund Policy',
      title: 'Refund Policy',
      description:
        'Finsai Trade Refund Policy describing deposit, withdrawal, chargeback and cancellation procedures and the safeguarding of client funds.',
      path: '/refund-policy',
      keywords: 'refund policy, withdrawal policy, chargeback, client funds, finsai deposits',
    },
    {
      uid: 'api::client-agreement-page.client-agreement-page',
      label: 'Client Agreement Page',
      pageTitle: 'Client Agreement',
      title: 'Client Agreement',
      description:
        'Finsai Trade Client Agreement: the binding terms and conditions governing the use of our trading platform, services and the relationship between the Company and the Client.',
      path: '/client-agreement',
      keywords: 'client agreement, trading terms, finsai contract, platform terms',
    },
    {
      uid: 'api::upfront-disclosure-page.upfront-disclosure-page',
      label: 'Upfront Disclosure Page',
      pageTitle: 'Mauritius Upfront Disclosure Document',
      title: 'Upfront Disclosure',
      description:
        'Mauritius Upfront Disclosure Document for Finsai Trade Ltd, including legal status, key individuals, complaints handling and authorized financial products.',
      path: '/upfront-disclosure',
      keywords: 'upfront disclosure, Mauritius FSC, finsai disclosure, regulatory document',
    },
    {
      uid: 'api::complaints-management-page.complaints-management-page',
      label: 'Complaints Management Page',
      pageTitle: 'Complaints Management',
      title: 'Complaints Management',
      description:
        'Finsai Trade Complaints Management Framework: how to submit a complaint, internal review, escalation timelines and reporting to authorities.',
      path: '/complaints-management',
      keywords: 'complaints management, finsai complaints, dispute resolution, client complaints',
    },
    {
      uid: 'api::conflicts-of-interest-policy-page.conflicts-of-interest-policy-page',
      label: 'Conflicts of Interest Policy Page',
      pageTitle: 'Conflicts of Interest Policy',
      title: 'Conflicts of Interest Policy',
      description:
        'Finsai Trade Conflicts of Interest Policy outlining identification, management and mitigation of conflicts of interest.',
      path: '/conflicts-of-interest-policy',
      keywords: 'conflicts of interest, finsai policy, compliance, broker conduct',
    },
  ];

  for (const page of pages) {
    await seedLegalPage(strapi, page);
  }
}

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
    await seedAboutPage(strapi);
    await seedCareersPage(strapi);
    await seedAccountsPage(strapi);
    await seedPaymentsPage(strapi);
    await seedPlatformPage(strapi);
    await seedPartnershipsPage(strapi);
    await seedBlogsPage(strapi);
    await seedContactusPage(strapi);
    await seedSocialTradingPage(strapi);
    await seedGlossaryPage(strapi);
    await seedRegulationsPage(strapi);
    await seedLegalPages(strapi);
    strapi.log.info(
      '[bootstrap] Single-type seeds checked (existing editor content preserved)',
    );
  },
};
