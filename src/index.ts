import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

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

const SITE_BASE = 'https://www.finsaitrade.com';

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

// ─── Media upload helper ─────────────────────────────────────────────

async function uploadFileFromSeed(
  strapi: Core.Strapi,
  relPath: string,
): Promise<{ id: number; url: string } | null> {
  const abs = path.join(strapi.dirs.app.root, 'seed-assets', relPath);

  if (!fs.existsSync(abs)) {
    strapi.log.warn(`[seed] missing asset: ${abs}`);
    return null;
  }

  const stats = fs.statSync(abs);
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  const filename = path.basename(abs);

  // Reuse if already uploaded (so re-running bootstrap doesn't duplicate)
  const existing = (await strapi.query('plugin::upload.file').findMany({
    where: { name: filename },
    limit: 1,
  })) as Array<{ id: number; url: string }>;
  if (existing.length > 0) return existing[0];

  const uploaded = (await strapi.plugin('upload').service('upload').upload({
    data: {},
    files: {
      filepath: abs,
      originalFilename: filename,
      mimetype: mime,
      size: stats.size,
    },
  })) as Array<{ id: number; url: string }>;

  strapi.log.info(`[seed] uploaded ${relPath} → id=${uploaded[0].id}`);
  return uploaded[0];
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
  const count = await strapi.documents('api::faq.faq').count({});
  if (count > 0) return;

  // Mirrors FALLBACK_FAQS in src/components/FAQSection.tsx so the FE renders
  // identically whether Strapi is connected or not.
  const faqs = [
    {
      question: 'What is Finsai Trade?',
      answer:
        'Finsai Trade is a multi-asset trading platform that provides access to forex, cryptocurrencies, global stocks, indices, commodities, and CFDs through one secure and professional trading ecosystem.',
      category: 'General',
      order: 1,
    },
    {
      question: 'What markets can I trade on Finsai Trade?',
      answer:
        'You can trade Forex, Cryptocurrencies, Indices, Metals, Stocks, and CFDs. We provide access to over 1,000+ trading instruments across all major global markets.',
      category: 'Markets',
      order: 2,
    },
    {
      question: 'Does Finsai Trade support MetaTrader 5 (MT5)?',
      answer:
        'Yes, Finsai Trade fully supports MetaTrader 5 (MT5), the industry-leading trading platform known for advanced charting, automated trading via Expert Advisors, and deep market analysis.',
      category: 'Platforms',
      order: 3,
    },
    {
      question: 'How do I open an account?',
      answer:
        "Simply click 'Start Trading', fill in your details, verify your identity with a government-issued ID, fund your account, and you're ready to trade — the entire process takes under 10 minutes.",
      category: 'Accounts',
      order: 4,
    },
    {
      question: 'What is the minimum deposit?',
      answer:
        'The minimum deposit varies by account type. Our Smart Choice account is designed for beginners with a low entry requirement. Contact our support team for the latest deposit requirements.',
      category: 'Accounts',
      order: 5,
    },
  ];

  for (const faq of faqs) {
    await strapi.documents('api::faq.faq').create({ data: faq, status: 'published' });
  }
  strapi.log.info(`[bootstrap] Seeded ${faqs.length} FAQs`);
}

// ─── Homepage single-type ────────────────────────────────────────────

async function seedHomepage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::homepage.homepage').findFirst({});
  if (existing) return;

  await strapi.documents('api::homepage.homepage').create({
    data: {
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
      heroCtaSecondaryLabel: 'Try Demo',
      heroCtaSecondaryHref: '/demo',

      featuresBadge: 'What Sets Us Apart ',
      featuresTitle: 'Why Top Traders Choose Finsai Trade',
      featuresDescription:
        'Trade securely across 1,000+ assets on a globally regulated platform with transparent pricing and 24/7 expert support.',
      featureItems: [
        { iconKey: 'transparency', title: 'No Hidden Fees,\nTransparent Trades' },
        { iconKey: 'assets', title: '1000+\nAssets' },
        { iconKey: 'leverage', title: 'Up to 500x\nLeverage' },
        { iconKey: 'deposits', title: 'Easy Deposits &\nWithdrawals' },
        { iconKey: 'learning', title: 'Live\nLearning' },
        { iconKey: 'social', title: 'Social\ntrading' },
      ],

      marketsBadge: 'Market You Can Trade',
      marketsTitlePrefix: 'Trade Every Market That ',
      marketsTitleAccent: 'Matters',
      marketsDescription:
        'Finsai Trade gives modern traders access to 5,000+ trading instruments across forex, crypto, global stocks, indices, commodities, and CFDs.',

      platformsBadge: 'Seamless Trading Experience',
      platformsTitle: 'Powerful Platforms for Every Trader',
      platformsDescription:
        'Trade with speed, stability, and total control from your desk or on the move. Finsai Trade delivers professional-grade platforms to match your trading needs.',

      accountsBadge: 'Finsai Trade Account Type',
      accountsTitle: 'Choose Your Account. Trade Your Way.',
      accountsDescription:
        'From beginners to seasoned professionals, Finsai Trade offers account types designed to match every level of experience and trading goal.',

      stepsBadge: 'Signup Procedure',
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
      ctaTitle: 'Ready to Start Trading with Finsai?',
      ctaDescription:
        'Open a live account or start with a demo account and explore global markets with Finsai Trade — at\nyour pace, on your terms.',
      ctaFooterText:
        'Trading Forex and CFDs involves significant risk and may not be suitable for all investors. Please\nensure you fully understand the risks involved.',
      ctaButton1Label: 'Start Trading',
      ctaButton1Href: 'https://fx.finsaitrade.com/auth/register',
      ctaButton2Label: 'Try Demo',
      ctaButton2Href: '/demo',
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Homepage single type');
}

// ─── Collection seeds (with image uploads) ───────────────────────────

async function seedMarkets(strapi: Core.Strapi) {
  const count = await strapi.documents('api::market.market').count({});
  if (count > 0) return;

  const items = [
    { slug: 'forex',   name: 'Forex',   file: 'markets/forex.png',   order: 1, description: 'Trade major, minor, and exotic forex pairs with deep liquidity, competitive spreads, and ultra-fast execution on the global foreign exchange market.' },
    { slug: 'crypto',  name: 'Crypto',  file: 'markets/crypto.png',  order: 2, description: 'Access Bitcoin, Ethereum, and hundreds of altcoins. Trade crypto CFDs with leverage around the clock on a secure, regulated platform.' },
    { slug: 'indices', name: 'Indices', file: 'markets/indices.png', order: 3, description: 'Trade top global stock indices and capture price movements across major economies, including US, European, Asian, and international markets.' },
    { slug: 'metals',  name: 'Metals',  file: 'markets/metals.png',  order: 4, description: 'Diversify your portfolio with gold, silver, crude oil, natural gas, and other high-demand commodities traded across global markets.' },
    { slug: 'stocks',  name: 'Stocks',  file: 'markets/stocks.png',  order: 5, description: 'Invest and trade shares of leading international companies listed on major global stock exchanges through a professional online trading platform.' },
  ];

  for (const m of items) {
    const img = await uploadFileFromSeed(strapi, m.file);
    await strapi.documents('api::market.market').create({
      data: { slug: m.slug, name: m.name, description: m.description, order: m.order, image: img?.id },
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} markets`);
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
      mockup: 'platforms/mt-mockup.png',
      icon: null,
      description:
        " Access 44+ advanced charting tools, 38 built-in indicators, and 2,000+ custom indicators for deeper market analysis. Monitor price action across 21 timeframes, create custom Expert Advisors (EAs) with MQL5, and test strategies faster with multi-threaded optimization.",
    },
    {
      title: 'Social Trading',
      size: 'large',
      row: 2,
      order: 3,
      mockup: null,
      icon: 'platforms/social-icon.png',
      description:
        'Follow top-performing traders, mirror proven strategies in real time, and grow your portfolio with confidence — all from within the Finsai Trade platform.',
    },
    {
      title: 'App & More — Coming soon',
      size: 'small',
      row: 2,
      order: 4,
      mockup: null,
      icon: 'platforms/app-icon.png',
      description:
        'Stay connected to the markets on the go with a fast, secure, and intuitive mobile trading experience.',
    },
  ];

  for (const p of items) {
    const mockup = p.mockup ? await uploadFileFromSeed(strapi, p.mockup) : null;
    const icon = p.icon ? await uploadFileFromSeed(strapi, p.icon) : null;
    await strapi.documents('api::platform.platform').create({
      data: {
        title: p.title,
        description: p.description,
        size: p.size as 'small' | 'large',
        row: p.row,
        order: p.order,
        mockupImage: mockup?.id,
        iconImage: icon?.id,
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
    { number: 1, title: 'Register',      description: 'Create your Finsai Trade account and access global multi-asset markets..', file: 'steps/register.png',      order: 1 },
    { number: 2, title: 'Verify',        description: 'Verify your identity securely to activate your trading account.',          file: 'steps/verify.png',        order: 2 },
    { number: 3, title: 'Start Trading', description: 'Trade crypto, forex, commodities, indices, and more.',                     file: 'steps/start-trading.png', order: 3 },
  ];

  for (const s of items) {
    const img = await uploadFileFromSeed(strapi, s.file);
    await strapi.documents('api::step.step').create({
      data: { number: s.number, title: s.title, description: s.description, order: s.order, image: img?.id },
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} steps`);
}

async function seedAwards(strapi: Core.Strapi) {
  const count = await strapi.documents('api::award.award').count({});
  if (count > 0) return;

  // Title/image pairing mirrors LOCAL_AWARD_IMAGES order in AwardsSection.tsx:
  // award #1 → wld-fi-2024, #2 → wld-fi-2025, #3 → world-forex-award, #4 → innovative-startup.
  const items = [
    { title: 'The Fastest Growing\nBroker 2024',         file: 'awards/wld-fi-2024.png',        order: 1 },
    { title: 'The Best IB\nProgram 2025',                file: 'awards/wld-fi-2025.png',        order: 2 },
    { title: 'The Fastest Growing\nBroker 2025',         file: 'awards/world-forex-award.png',  order: 3 },
    { title: 'Innovative Startup in\nFinance Award 2023', file: 'awards/innovative-startup.png', order: 4 },
  ];

  for (const a of items) {
    const img = await uploadFileFromSeed(strapi, a.file);
    await strapi.documents('api::award.award').create({
      data: { title: a.title, order: a.order, image: img?.id },
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} awards`);
}

async function seedTestimonials(strapi: Core.Strapi) {
  const count = await strapi.documents('api::testimonial.testimonial').count({});
  if (count > 0) return;

  const items = [
    {
      name: 'Jamson Holo',
      role: 'Client',
      initials: 'JH',
      quote:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed porta, ex at luctus commodo, metus erat dictum sapien, eget dictum turpis felis vitae ligula. Sed porta, ex at luctus commodo,',
      order: 1,
    },
    {
      name: 'Deepak Rana',
      role: 'Client',
      initials: 'DR',
      quote:
        'Good customer care. I got rapidly answered and have my problems solved. I am very thankful to finsai trading support team.',
      order: 2,
    },
    {
      name: 'Satish Kumar',
      role: 'Client',
      initials: 'SK',
      quote:
        'The withdrawal and trading experience was very good. The support was available all the time. I was fearing at first to use the platform as they are new, but their withdrawal process was very easy, hence I am giving 4 stars.',
      order: 3,
    },
  ];

  for (const t of items) {
    await strapi.documents('api::testimonial.testimonial').create({
      data: t,
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${items.length} testimonials`);
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
  const existing = await strapi.documents('api::about-page.about-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::about-page.about-page').create({
    data: {
      heroBadge: 'About Finsai Trade Ltd',
      heroTitle: 'Our Mission, Our Markets, Our Edge',
      heroDescription:
        'Helping traders access multiple asset classes while benefiting from educational resources, loyalty rewards, and partnership opportunities. ',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'Explore Our Services',
      heroSecondaryCtaHref: '/services',

      recognitionTitlePrefix: 'Recognized for Elite Trading ',
      recognitionTitleAccent: 'Excellence',
      recognitionDescription:
        ' Trusted by a growing community of traders for reliable execution, modern trading tools, and scalable partnership opportunities. ',
      recognitionStatPrimaryValue: '53k+',
      recognitionStatPrimaryLabel: 'Registered Users',
      recognitionStatSecondaryValue: '3M+',
      recognitionStatSecondaryLabel: 'Monthly Worldwide',

      builtBadge: 'Our Story',
      builtTitle: 'Built by Traders. Driven by Purpose',
      builtDescription:
        "Finsai Trade platforms are engineered to deliver seamless execution, institutional-level tools, and reliable uptime — so you stay in control, wherever you trade. Whether you're a beginner or a pro, our platforms help you trade smarter and faster.",
      builtPoints: [
        {
          title: 'The Problem',
          description:
            'Trade major, minor, and exotic forex pairs with deep liquidity, competitive spreads, and ultra-fast execution on the global foreign exchange market.',
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
      // growthDescription1 / growthDescription2 are retained in the schema
      // for backwards compatibility but the FinancialGrowth section no
      // longer renders them (features are hardcoded in the component).
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded About Page single type');
}

async function seedCareersPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::careers-page.careers-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::careers-page.careers-page').create({
    data: {
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Careers Page single type');
}

async function seedAccountsPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::accounts-page.accounts-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::accounts-page.accounts-page').create({
    data: {
      heroBadge: 'Multi-Asset Trading Accounts',
      heroTitle: 'Find the Right Account for Your Trading Style',
      heroDescription:
        'From first-time traders to advanced professionals, Finsai Trade offers flexible account types built for every stage of your trading journey.',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'Try Free Demo',
      heroSecondaryCtaHref: '/demo',

      // FE compare table is hardcoded; only title + description are still
      // sourced from Strapi.
      compareTitle: 'Account Type',
      compareDescription:
        'Trade with speed, stability, and total control from your desk or on the move. Finsai Trade delivers professional-grade platforms to match your trading needs',

      whyBadge: 'Why Trade Finsai',
      whyTitle: 'Why trade with Finsai',
      whyDescription:
        'Trade with speed, stability, and total control from your desk or on the move. Finsai Trade delivers professional-grade platforms to match your trading needs',
      whyFeatures: [
        { title: 'Ultra fast order execution',           description: 'Real-time quotes and lightning-fast execution.',                iconKey: 'runner' },
        { title: 'Raw spreads on ECN & Elite accounts',  description: 'Direct market pricing with no markup.',                          iconKey: 'users' },
        { title: 'No hidden fees, no requotes',          description: 'Transparent costs and consistent execution.',                    iconKey: 'eyeOff' },
        { title: 'Swap free account',                    description: 'No overnight financing on qualifying positions.',                iconKey: 'infinity' },
        { title: 'Access MT5 on mobile, desktop & web',  description: 'Trade anywhere with the world-class MetaTrader 5 platform.',     iconKey: 'headset' },
        { title: 'Priority support for smart elite traders', description: 'White-glove support for Elite & Smart ECN account holders.', iconKey: 'headphones' },
      ],

      onboardingBadge: 'Signup Procedure',
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Accounts Page single type');
}

async function seedPaymentsPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::payments-page.payments-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::payments-page.payments-page').create({
    data: {
      heroBadge: 'SECURE DEPOSITS & WITHDRAWALS',
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
      ctaTitle: 'Ready to Fund Your Account?',
      ctaDescription:
        'Deposit instantly with the method you prefer — your funds are protected end-to-end and available the moment they arrive.',
      ctaPrimaryLabel: 'Deposit Funds',
      ctaPrimaryHref: 'https://fx.finsaitrade.com/auth/register',

      seo: buildSeo({
        title: 'Payments — Secure Deposits & Withdrawals | Finsai Trade',
        description:
          'Fund your Finsai Trade account with cards, UPI, e-wallets, crypto, or bank transfer. Instant deposits, fast withdrawals, and PCI DSS-grade security.',
        path: '/payments',
        keywords:
          'finsai payments, deposit, withdrawal, crypto deposit, UPI deposit, secure payments, trading deposit',
      }),
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Payments Page single type');
}

async function seedServicesPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::services-page.services-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::services-page.services-page').create({
    data: {
      heroBadge: 'SIGN IN TO YOUR SECURE WALLET',
      heroTitle: 'Powerful Trading Platforms for Every Trader ',
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Services Page single type');
}

async function seedPartnershipsPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::partnerships-page.partnerships-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::partnerships-page.partnerships-page').create({
    data: {
      heroBadge: 'IB & Affiliate',
      heroTitle: 'Join Finsai Trade as an Introducing Broker',
      heroDescription:
        'Earn attractive commissions from every client trade with higher conversions and stronger client retention.',
      heroPrimaryCtaLabel: 'Become an IB',
      heroPrimaryCtaHref: 'https://fx.finsaitrade.com/auth/register',
      heroSecondaryCtaLabel: 'View Calculator',
      heroSecondaryCtaHref: '#calculator',

      whyBadge: 'Why Finsai IB',
      whyTitle: 'Why Top IBs Choose Finsai Trade',
      whyDescription:
        'Built for partners who want faster growth, stronger earnings, and long-term success',
      // IBWhyClient uses `iconKey` as the tab label. To match the FE
      // FALLBACK_TABS labels we set iconKey to the tab name.
      whyFeatures: [
        { title: 'Earn More from Every Active Client',     description: 'Competitive rebates designed to reward performance as your network grows.',     iconKey: 'Rebates' },
        { title: 'Track Every Result with Clarity',        description: 'Monitor referrals, trading activity, commissions, and payouts through detailed live reports.', iconKey: 'Detailed Reports' },
        { title: 'Scale Your Network More Efficiently',    description: 'Build and manage multi-level partner structures designed for long-term growth.', iconKey: 'Multi-Tier Mode' },
        { title: 'Trade with Confidence and Trust',        description: 'Partner with a secure and transparent trading environment built for modern traders.', iconKey: 'Regulated Broker' },
      ],

      calculatorBadge: 'Earnings Calculator',
      calculatorTitle: 'Unlock Your Earning Potential',
      calculatorDescription:
        'Specify the expected values of your partner network',

      statsBadge: 'Built for Ambitious IBs',
      statsTitle: 'Join The Fastest Growing Partner Program Now',
      statsDescription:
        'Partners across the globe are scaling their networks with Finsai today.',
      // Labels follow the `<prefix> <rest>` shape that IBStatsSection
      // splits on (e.g. "Join Companies helped" → prefix "Join", label
      // "Companies helped").
      stats: [
        { value: '20,000 +', label: 'Join Companies helped' },
        { value: '$10,000 +', label: 'Over Revenue generated' },
        { value: '330 +', label: 'Over Companies helped' },
        { value: '230 +', label: 'More than Revenue generated' },
      ],

      howToBadge: 'How It Works',
      howToTitle: ' How to Become a Successful Introducing Broker',
      howToDescription:
        'Start earning with an easy partner program built for long-term growth.',
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Partnerships Page single type');
}

async function seedBlogsPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::blogs-page.blogs-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::blogs-page.blogs-page').create({
    data: {
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Blogs Page single type');
}

async function seedContactusPage(strapi: Core.Strapi) {
  const existing = await strapi
    .documents('api::contactus-page.contactus-page')
    .findFirst({});
  if (existing) return;

  await strapi.documents('api::contactus-page.contactus-page').create({
    data: {
      heroBadge: 'CAREERS AT FINSAI TRADE',
      heroTitle: 'We Are  Here to help\nyou',
      heroDescription:
        'Join a vibrant global team focused on fintech, trading technology, global markets, and customer growth.',
      heroPrimaryCtaLabel: 'View Open Roles',
      heroPrimaryCtaHref: '#open-roles',
      heroSecondaryCtaLabel: 'Join Our Team  →',
      heroSecondaryCtaHref: '#contact-form',

      supportTitle: 'Global Support Availability',
      supportDescription:
        'Join a workplace focused on growth, flexibility, ownership, and meaningful impact across global fintech and trading markets.',
      supportBenefits: [
        { title: 'Quick Response',           description: 'We respond fast and value your time.' },
        { title: 'Transparency',             description: 'Clear communication at every step.' },
        { title: 'Dedicated Resolution',     description: 'We are committed to resolving your issues.' },
        { title: 'Multi- Language Support',  description: 'English, Hindi, and more.' },
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
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Contact Us Page single type');
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
