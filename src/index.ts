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
  'rewards-page': ['find', 'findOne'],
  'tools-page': ['find', 'findOne'],
  'accounts-page': ['find', 'findOne'],
  'payments-page': ['find', 'findOne'],
  'services-page': ['find', 'findOne'],
  'partnerships-page': ['find', 'findOne'],
  'blogs-page': ['find', 'findOne'],
};

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
  // Build the 5-tier compare-table dataset.
  // Feature order is fixed across all tiers so the FE table aligns rows cleanly.
  const FEATURES: { label: string; values: [string, string, string, string, string] }[] = [
    { label: 'Target Clients',                       values: ['Beginners (first Trader)', 'New Retail Clients', 'Mid-Tier Traders', 'Advanced Traders', 'Passive Investors'] },
    { label: 'Min. Deposit',                         values: ['$10', '$100', '$1,000', '$5,000', '$10,000'] },
    { label: 'Fixed Tradeable Welcome Bonus',        values: ['100%', '80%', '40%', '20%', '5%'] },
    { label: 'Account Type',                         values: ['Client Account', 'Hedging Accounts', 'Hedging Accounts', 'Hedging/Netting Accounts', 'Hedging/Netting Accounts'] },
    { label: 'Spread Type',                          values: ['1.8 pips', '1.4 pips', '0.6 pips', '0.0 to 0.1 pips', '0.0 pips'] },
    { label: 'Markup Streams',                       values: ['Large', 'medium', 'Small', '0 & $10 Fixed Spread on gold', 'Zero'] },
    { label: 'Commissions',                          values: ['No commission', 'No commission', 'No commission', 'No commission', '$8 per million'] },
    { label: 'Swap Charges',                         values: ['Swap Free', 'SWAP Free', 'SWAP Free', 'SWAP Free', 'SWAP Free'] },
    { label: 'Deposit Fees',                         values: ['No Fees charged', 'NO Fees charged', 'NO Fees charged', 'NO Fees charged', 'NO Fees charged'] },
    { label: 'Withdrawal Fees',                      values: ['No Fees charged', 'No Fees charged', 'No Fees charged', 'No Fees charged', 'No Fees charged'] },
    { label: 'Leverage',                             values: ['1:1000', '1:1000', '1:1000', '1:500', '1:500'] },
    { label: 'Max. Lots',                            values: ['no restriction', 'no restriction', 'no restriction', 'Partial restriction', 'restriction'] },
    { label: 'News, Calendar & Technical Analysis',  values: ['Yes', 'Yes', 'Yes', 'Yes', 'Yes'] },
    { label: 'Social Trading',                       values: ['NO', 'NO', 'NO', 'Yes', 'Yes'] },
    { label: 'PAMM/MAM',                             values: ['NO', 'NO', 'NO', 'NO', 'Yes'] },
    { label: 'Algo/bot Trading Enable',              values: ['NO', 'NO', 'NO', 'Yes', 'NO'] },
    { label: 'Copy Trading',                         values: ['NO', 'NO', 'NO', 'Yes', 'Yes'] },
    { label: 'VPS Access',                           values: ['NO', 'NO', 'NO', 'Yes', 'Yes'] },
    { label: 'Verify Trader Access',                 values: ['NO', 'NO', 'NO', 'NO', 'Yes'] },
    { label: 'Dedicated Account Manager',            values: ['NO', 'NO', 'NO', 'NO', 'Yes'] },
  ];

  const TIER_META = [
    { name: 'Smart Start',  price: '$10',     unit: 'Min. Deposit', featured: false, order: 1, col: 0 },
    { name: 'Smart Choice', price: '$100',    unit: 'Min. Deposit', featured: false, order: 2, col: 1 },
    { name: 'Smart Pro',    price: '$1,000',  unit: 'Min. Deposit', featured: true,  order: 3, col: 2 },
    { name: 'Smart Elite',  price: '$5,000',  unit: 'Min. Deposit', featured: false, order: 4, col: 3 },
    { name: 'Smart Vip',    price: '$10,000', unit: 'Min. Deposit', featured: false, order: 5, col: 4 },
  ];

  const desired = TIER_META.map((t) => ({
    name: t.name,
    price: t.price,
    unit: t.unit,
    featured: t.featured,
    order: t.order,
    ctaLabel: 'Open Account',
    ctaHref: '/register',
    features: FEATURES.map((f) => ({ label: f.label, value: f.values[t.col] })),
  }));

  // One-shot migration: if the new tiers aren't present yet, wipe legacy
  // entries and seed the full 5-tier dataset. Idempotent: re-runs are
  // safe (early-exit once "Smart Start" exists).
  const existing = await strapi
    .documents('api::account-tier.account-tier')
    .findMany({ status: 'draft' });
  const alreadyMigrated = existing.some((t) => t.name === 'Smart Start');
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

  const faqs = [
    {
      question: 'What is Finsai Trade?',
      answer:
        'Finsai Trade is a multi-asset trading platform offering forex, CFDs, indices, commodities and crypto with competitive spreads and fast execution.',
      category: 'General',
      order: 1,
    },
    {
      question: 'How do I open a live trading account?',
      answer:
        'Pick a tier on the /account-pricing page, click Open Account, and complete the registration + KYC. Most accounts are approved within one business day.',
      category: 'Accounts',
      order: 2,
    },
    {
      question: 'What is the minimum deposit?',
      answer:
        'It depends on the tier — Smart Choice starts at $100, Smart Pro at $1,000, and Smart ECN at $5,000.',
      category: 'Accounts',
      order: 3,
    },
    {
      question: 'Which trading platforms are supported?',
      answer:
        'MetaTrader 5 (MT5) on desktop, web and mobile, plus our proprietary Finsai web terminal.',
      category: 'Platforms',
      order: 4,
    },
    {
      question: 'Is Finsai regulated?',
      answer:
        'Yes — Finsai Trade operates under regulated entities. Check the footer of the site for the regulator and license number applicable to your region.',
      category: 'Compliance',
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
      heroTitle: 'Trade Global Markets Without Limits',
      heroSubtitle:
        'The powerful multi-asset trading platform for modern traders — all in one unified ecosystem.',
      heroTaglines: [
        { label: 'Regulated Broker' },
        { label: 'MT5 Platform' },
        { label: 'Swap Free' },
        { label: 'Reliable Support' },
      ],
      heroCtaPrimaryLabel: 'Start Trading Now',
      heroCtaPrimaryHref: '/register',
      heroCtaSecondaryLabel: 'Try Demo',
      heroCtaSecondaryHref: '/demo',

      featuresBadge: 'Features of Finsai Trade',
      featuresTitle: 'Discover Why Traders Trust and Choose Finsai Trade',
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

      platformsBadge: 'Choose The Best - Platform',
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
      ctaButton1Href: '/register',
      ctaButton2Label: 'Try Demo',
      ctaButton2Href: '/demo',
      ctaButton3Label: 'Contact Us',
      ctaButton3Href: '/contact',
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
    { slug: 'forex', name: 'Forex', file: 'markets/forex.png', order: 1, description: 'Trade major, minor, and exotic forex pairs with deep liquidity, competitive spreads, and ultra-fast execution on the global foreign exchange market.' },
    { slug: 'crypto', name: 'Crypto', file: 'markets/crypto.png', order: 2, description: 'Access Bitcoin, Ethereum, and hundreds of altcoins. Trade crypto CFDs with leverage around the clock on a secure, regulated platform.' },
    { slug: 'indices', name: 'Indices', file: 'markets/indices.png', order: 3, description: 'Trade top global stock indices and capture price movements across major economies, including US, European, Asian, and international markets.' },
    { slug: 'metals', name: 'Metals', file: 'markets/metals.png', order: 4, description: 'Diversify your portfolio with gold, silver, crude oil, natural gas, and other high-demand commodities traded across global markets.' },
    { slug: 'stocks', name: 'Stocks', file: 'markets/stocks.png', order: 5, description: 'Invest and trade shares of leading international companies listed on major global stock exchanges through a professional online trading platform.' },
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

  const items = [
    { title: 'MT5', size: 'large', row: 1, order: 1, mockup: 'platforms/mt-mockup.png', icon: null, description: "The industry's gold standard for multi-asset trading. Advanced charting, automated trading, real-time analysis, and multi-asset access." },
    { title: 'Social Trading', size: 'large', row: 2, order: 3, mockup: null, icon: 'platforms/social-icon.png', description: 'Follow top-performing traders, mirror proven strategies in real time, and grow your portfolio with confidence — all from within the Finsai Trade platform.' },
    { title: 'App & More — Coming soon', size: 'small', row: 2, order: 4, mockup: null, icon: 'platforms/app-icon.png', description: 'Stay connected to the markets on the go with a fast, secure, and intuitive mobile trading experience.' },
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
    { number: 1, title: 'Register', description: 'Create your Finsai Trade account and access global multi-asset markets..', file: 'steps/register.png', order: 1 },
    { number: 2, title: 'Verify', description: 'Verify your identity securely to activate your trading account.', file: 'steps/verify.png', order: 2 },
    { number: 3, title: 'Start Trading', description: 'Trade crypto, forex, commodities, indices, and more.', file: 'steps/start-trading.png', order: 3 },
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

  const items = [
    { title: 'The Fastest Growing\nBroker 2024', file: 'awards/wld-fi-2024.png', order: 1 },
    { title: 'The Best IB\nProgram 2025', file: 'awards/world-forex-award.png', order: 2 },
    { title: 'The Fastest Growing\nBroker 2025', file: 'awards/wld-fi-2025.png', order: 3 },
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

  const items = [
    { label: 'Blogs', description: 'Explore professional insights on trading strategies, psychology, platform guides, and market trends.', linkLabel: 'Read Latest Articles', linkHref: '/blogs', row: 'row1' as const, size: 'small' as const, order: 1 },
    { label: 'Finsai Academy', description: 'Master trading with beginner-friendly lessons, advanced courses, and practical market education.', linkLabel: 'Start Learning Free', linkHref: '/academy', row: 'row1' as const, size: 'large' as const, order: 2 },
    { label: 'News & Analysis', description: 'Stay updated with real-time market news, economic events, and expert commentary.', linkLabel: 'Explore Now', linkHref: '/news', row: 'row2' as const, size: 'equal' as const, order: 3 },
    { label: 'Webinar', description: 'Join live sessions with market experts covering strategies, platform tips, and real-time market analysis.', linkLabel: 'Browse Webinars', linkHref: '/webinars', row: 'row2' as const, size: 'equal' as const, order: 4 },
    { label: 'Glossary', description: 'Master trading terms and concepts with our comprehensive glossary built to help you trade with clarity and confidence.', linkLabel: 'Explore Glossary', linkHref: '/glossary', row: 'row2' as const, size: 'equal' as const, order: 5 },
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
      heroTitle: 'Making Global\nTrading Accessible\nand Rewarding',
      heroDescription:
        'Helping traders access multiple asset classes while benefiting from educational resources, loyalty rewards, and partnership opportunities.',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: '/register',
      heroSecondaryCtaLabel: 'Explore Our Services',
      heroSecondaryCtaHref: '/services',

      recognitionTitlePrefix: 'Recognized for Elite Trading ',
      recognitionTitleAccent: 'Excellence',
      recognitionDescription:
        'Trade seamlessly on the go or from your desktop with our cutting-edge platforms.',
      recognitionStatPrimaryValue: '168M+',
      recognitionStatPrimaryLabel: 'Monthly Deals',
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
      growthTitle: 'We drive financial growth\nin the digital era.',
      growthDescription1:
        'By providing an integrated ecosystem that combines simplicity, innovation, and security, we aim to empower people to take charge of their financial future. Our goal is to create a financial environment where people can trade, invest, and bank with confidence by bridging the gap between conventional finance and technological breakthroughs.',
      growthDescription2:
        'By providing an integrated ecosystem that combines simplicity, innovation, and security, we aim to empower people to take charge of their financial future. Our goal is to create a financial environment where people can trade, invest, and bank with confidence by bridging the gap between conventional finance and technological breakthroughs.',
      growthCtaLabel: 'Contact Us',
      growthCtaHref: '/contact',
      growthStats: [
        { value: '4.8k', label: 'Traders' },
        { value: '12+', label: 'Industry Experience' },
        { value: '2.5k+', label: 'World wide clients' },
        { value: '120+', label: 'Won Awards' },
      ],

      ctaBadge: 'Get Started',
      ctaTitle: 'Ready to Start Trading with Finsai?',
      ctaDescription:
        'Open a live account or start with a demo account and explore global markets with Finsai Trade — at your pace, on your terms.',
      ctaPrimaryLabel: 'Open Live Account',
      ctaPrimaryHref: '/register',
      ctaSecondaryLabel: 'Try Demo',
      ctaSecondaryHref: '/demo',
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
        'Join a vibrant global team focused on fintech, trading technology, global markets, and customer growth. If you thrive on',
      heroPrimaryCtaLabel: 'View Open Roles →',
      heroPrimaryCtaHref: '#open-roles',
      heroSecondaryCtaLabel: 'Join Our Team →',
      heroSecondaryCtaHref: '#apply',

      workspaceTitle: 'More than just a work space',
      workspaceDescription:
        "Finsai Trade is engineered to deliver seamless execution, institutional-grade tools and reliable uptime — so you can stay in control wherever you trade. Whether you're a beginner or a pro, our platform helps you trade smarter and faster.",
      workspaceBenefits: [
        {
          title: 'Collaborate with top talents',
          description: 'Deep dive into market dynamics with institutional tools.',
        },
        {
          title: 'Innovate & Make an Impact',
          description: 'Real-time quotes and lightning-fast execution speed.',
        },
        {
          title: 'Growth & Development',
          description: 'Advanced calculators and margin alerts to stay safe.',
        },
        {
          title: 'Global & Inclusive Culture',
          description: 'Backtesting engines to refine your trading edge.',
        },
      ],

      formTitle: 'Apply Now',
      formSubmitLabel: 'Submit Application',
      formTermsText:
        'I have read and accepted the terms and conditions specified in the Privacy Policy and currently consent to the collecting, processing and disclosing of the personal data provided by me to fulfil the above-said purposes.',
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Careers Page single type');
}

async function seedRewardsPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::rewards-page.rewards-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::rewards-page.rewards-page').create({
    data: {
      heroBadge: 'Trading Rewards Hub',
      heroTitle: 'Rewards Built for\nActive Traders &\nPartners',
      heroDescription:
        'Earn more for trading and partnering with Finsai — across promotions, loyalty tiers and our global affiliate network.',
      heroPrimaryCtaLabel: 'Explore Rewards',
      heroPrimaryCtaHref: '#promotions',
      heroSecondaryCtaLabel: 'Become an Affiliate',
      heroSecondaryCtaHref: '/partnerships',

      promotionsTitle: 'Promotions',
      promotionsDescription:
        'Boost every deposit, every trade and every milestone. Browse all our live offers and grab the ones that fit your strategy.',
      promotionsCtaLabel: 'View All Promotions',
      promotionsCtaHref: '#',
      promotionCards: [
        {
          title: 'Bonuses',
          description:
            'Unlock deposit bonuses, signup credits and seasonal boosts as soon as you fund your account.',
          iconKey: 'percent',
        },
        {
          title: 'Risk-Free Trial Trades',
          description:
            'Test new strategies with protected positions — we cover the losses on qualifying trades.',
          iconKey: 'shield',
        },
        {
          title: 'Special Rewards',
          description:
            'Limited-time campaigns with cashback, free spreads and gear drops for active traders.',
          iconKey: 'gift',
        },
      ],

      loyaltyTitle: 'Loyalty Program\nOverview',
      loyaltyDescription:
        "Compounds the more you trade. Climb from Bronze to Diamond and unlock progressively better cashback, tighter spreads and exclusive events that money can't normally buy.",
      loyaltyCtaLabel: 'Track Your Loyalty Level',
      loyaltyCtaHref: '#',
      loyaltyTiers: [
        { title: 'Bronze', description: 'Onboarding', iconKey: 'bronze' },
        { title: 'Silver', description: 'Active traders', iconKey: 'silver' },
        { title: 'Gold', description: 'Loyal members', iconKey: 'gold' },
        { title: 'Platinum', description: 'Frequent traders', iconKey: 'platinum' },
        { title: 'Diamond', description: 'Top performers', iconKey: 'diamond' },
      ],
      loyaltyPerks: [
        { label: 'Cashbacks' },
        { label: 'Tradable Volume' },
        { label: 'Exclusive Events' },
        { label: 'Lifetime Perks' },
      ],

      ibTitle: 'IB Program',
      ibDescription:
        "Grow a global trading network with industry-leading payouts, deep sub-IB tools and a partner team that's actually responsive.",
      ibCtaLabel: 'View All Promotions',
      ibCtaHref: '/partnerships',
      ibFeatures: [
        {
          title: 'Multi Asset',
          description:
            'Refer clients trading FX, crypto, indices, metals and stocks — earn on all volumes.',
          iconKey: 'asset',
        },
        {
          title: 'Personalized Dashboard',
          description:
            'Real-time commission tracking, sub-IB hierarchy and payout history at a glance.',
          iconKey: 'dashboard',
        },
        {
          title: 'Performance Bonus',
          description:
            'Hit monthly volume tiers and unlock booster commissions on top of base CPA.',
          iconKey: 'trophy',
        },
        {
          title: 'Strategy Support',
          description:
            'Dedicated success manager, co-branded creatives and conversion playbooks included.',
          iconKey: 'support',
        },
      ],
      ibStats: [
        { value: '268', label: 'Total IB Partner' },
        { value: '$36,702.35', label: 'Total IB Earnings' },
        { value: '136', label: 'Active Network' },
      ],

      ctaTitle: 'Trade With the right tools at your side',
      ctaDescription:
        'Unlock cashbacks, exclusive promotions and partner payouts that scale with every trade you make on Finsai.',
      ctaPrimaryLabel: 'Open Live Account',
      ctaPrimaryHref: '/register',
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Rewards Page single type');
}

async function seedToolsPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::tools-page.tools-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::tools-page.tools-page').create({
    data: {
      heroBadge: 'Tools for Modern Traders',
      heroTitle: 'Professional Trading\nTools — All in One Place',
      heroDescription:
        'Charts, analytics, automation and risk management built to scale with your strategy.',
      heroProofText:
        'Used by 50,000+ active traders · Real-time market data · 80+ indicators',
      heroPrimaryCtaLabel: 'Explore Tools',
      heroPrimaryCtaHref: '#tools',
      heroSecondaryCtaLabel: 'Try Demo',
      heroSecondaryCtaHref: '/demo',

      builtForBadge: 'Built for every level',
      builtForTitle: 'Built for Every Type of Trader',
      builtForDescription:
        'Whether you scalp tick-by-tick or hold for weeks, every tool we ship is designed to disappear into your workflow.',
      builtForFeatures: [
        { title: 'Day Traders', description: 'Tick charts, hotkeys and one-click execution.', iconKey: 'flash' },
        { title: 'Swing Traders', description: 'Multi-timeframe analysis with saved templates.', iconKey: 'chart' },
        { title: 'Algo Traders', description: 'Backtesting, automation and webhook bridges.', iconKey: 'bot' },
      ],

      chartingTitle: 'Charting & Technical Analysis Tools',
      chartingDescription:
        'Trade with confidence using professional-grade charting that fits the way you work.',

      marketDataTitle: 'Market Data & Insights',
      marketDataDescription:
        'Stay ahead with real-time quotes, economic calendars and curated trade ideas.',

      riskTitle: 'Risk and Position Management Tools',
      riskDescription:
        'Cap drawdowns, ladder stops and watch margin like a desk-grade risk manager.',

      strategyTitle: 'Strategy and Automation Tools',
      strategyDescription:
        'Codify your edge, backtest it across years of data and deploy automated execution in minutes.',

      communityTitle: 'Community and Insight Tools',
      communityDescription:
        'Learn from leaders, share setups, and copy verified strategies with one click.',

      ctaTitle: 'Plug the Finsai toolset into your workflow',
      ctaDescription:
        'Spin up a demo or live account and connect every tool to a single, fast trading interface.',
      ctaPrimaryLabel: 'Open Live Account',
      ctaPrimaryHref: '/register',
      ctaSecondaryLabel: 'Try Demo',
      ctaSecondaryHref: '/demo',
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Tools Page single type');
}

async function seedAccountsPage(strapi: Core.Strapi) {
  const existing = await strapi.documents('api::accounts-page.accounts-page').findFirst({});
  if (existing) return;

  await strapi.documents('api::accounts-page.accounts-page').create({
    data: {
      heroBadge: 'Accounts Built for Every Trader',
      heroTitle: 'Choose the Account that\nFits Your Trading Style',
      heroDescription:
        'From beginners to seasoned professionals, Finsai Trade offers account types designed to match every level of experience and trading goal.',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: '/register',
      heroSecondaryCtaLabel: 'Try Demo',
      heroSecondaryCtaHref: '/demo',

      compareTitle: 'Compare Account Types',
      compareDescription:
        'Side-by-side view of spreads, leverage, deposit minimums and feature access for every Smart account tier.',

      whyBadge: 'Why Trade Finsai',
      whyTitle: 'Why Traders Choose Finsai',
      whyDescription:
        'Six reasons we are the platform of choice for serious traders worldwide.',
      whyFeatures: [
        { title: 'Transparent Pricing', description: 'No hidden fees — every cost is shown upfront.', iconKey: 'transparency' },
        { title: '1,000+ Assets', description: 'Forex, crypto, indices, metals and global equities.', iconKey: 'assets' },
        { title: 'Up to 1:1000 Leverage', description: 'Tiered leverage that scales with your strategy.', iconKey: 'leverage' },
        { title: 'Instant Deposits', description: 'Cards, UPI, crypto and bank transfer — settled fast.', iconKey: 'deposits' },
        { title: 'Live Learning', description: 'Webinars, courses and 1-on-1 mentoring inside.', iconKey: 'learning' },
        { title: 'Social Trading', description: 'Copy verified leaders directly inside your terminal.', iconKey: 'social' },
      ],

      onboardingBadge: 'Signup Procedure',
      onboardingTitle: 'Get Trading in 3 Simple Steps',
      onboardingDescription:
        'From signup to first trade in minutes — KYC is fast, deposits are instant, and our team is on hand 24/7.',

      benefitsBadge: 'Account Benefits',
      benefitsTitle: 'Pick the Account That Pays You Back',
      benefitsDescription:
        'Every Finsai tier ships with its own combination of bonus credit, support tier and platform perks.',
      benefitsCards: [
        {
          title: 'Smart Start',
          description: 'Best for new traders building their first portfolio.',
          iconKey: 'start',
          footer: 'From $10 minimum deposit',
          bullets: [
            { key: 'Welcome Bonus', value: '100%' },
            { key: 'Spread Type', value: '1.8 pips' },
            { key: 'Leverage', value: '1:1000' },
            { key: 'Support', value: '24/7 Email + Chat' },
          ],
        },
        {
          title: 'Smart Pro',
          description: 'For active traders who need tighter spreads and faster fills.',
          iconKey: 'pro',
          footer: 'From $1,000 minimum deposit',
          bullets: [
            { key: 'Welcome Bonus', value: '40%' },
            { key: 'Spread Type', value: '0.6 pips' },
            { key: 'Leverage', value: '1:1000' },
            { key: 'Support', value: 'Priority Live' },
          ],
        },
      ],
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
      heroBadge: 'Payments & Funding',
      heroTitle: 'Fund Your Account in Seconds',
      heroDescription:
        'Deposit and withdraw with cards, UPI, e-wallets, crypto and bank transfer — all secured with PCI DSS encryption.',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: '/register',
      heroSecondaryCtaLabel: 'View Methods',
      heroSecondaryCtaHref: '#methods',

      trustText:
        'PCI DSS Level 1 · 3D Secure · Two-Factor Authentication · 256-bit SSL',

      methodsBadge: 'Supported Methods',
      methodsTitle: 'Choose How You Want to Fund',
      methodsDescription:
        'All major regional methods are supported. Most deposits clear instantly, withdrawals processed within 24 hours.',
      methods: [
        { name: 'Credit / Debit Cards', description: 'Visa, MasterCard, RuPay accepted.', fee: '0%', processingTime: 'Instant' },
        { name: 'UPI', description: 'Pay direct from any UPI app.', fee: '0%', processingTime: 'Instant' },
        { name: 'Bank Transfer', description: 'IMPS, NEFT, SEPA and SWIFT.', fee: '0%', processingTime: '1–2 hrs' },
        { name: 'Crypto', description: 'BTC, ETH, USDT (ERC-20 & TRC-20).', fee: '0%', processingTime: 'On confirmation' },
      ],

      ctaBadge: 'Ready to fund?',
      ctaTitle: 'Deposit Once, Trade Anywhere',
      ctaDescription:
        'Top up your account and start trading on the most secure platform in minutes.',
      ctaPrimaryLabel: 'Open Live Account',
      ctaPrimaryHref: '/register',
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
      heroBadge: 'Services',
      heroTitle: 'Built to Power Every Type of Trader',
      heroDescription:
        'From copy trading to algo automation, Finsai Trade gives you the full service stack used by professional desks.',
      heroPrimaryCtaLabel: 'Open Live Account',
      heroPrimaryCtaHref: '/register',
      heroSecondaryCtaLabel: 'Try Demo',
      heroSecondaryCtaHref: '/demo',

      featuresBadge: 'Services Highlights',
      featuresTitle: 'Everything You Need in One Platform',
      featuresDescription:
        'A single account that unlocks every market, every tool and every service.',
      features: [
        { title: 'Multi-Asset Trading', description: 'Trade FX, crypto, stocks, indices, metals and more.', iconKey: 'assets' },
        { title: 'Copy Trading', description: 'Mirror top-performing traders in real-time.', iconKey: 'social' },
        { title: 'Algo & Bots', description: 'Deploy automated strategies via MT5 or API.', iconKey: 'leverage' },
        { title: 'VPS Hosting', description: 'Free VPS for qualifying accounts.', iconKey: 'deposits' },
        { title: 'Education', description: 'Webinars, courses and 1-on-1 mentoring.', iconKey: 'learning' },
        { title: 'Transparency', description: 'Tight spreads, no hidden fees, fast execution.', iconKey: 'transparency' },
      ],

      platformsBadge: 'Choose The Best - Platform',
      platformsTitle: 'Powerful Platforms for Every Trader',
      platformsDescription:
        'Trade with speed, stability, and total control from your desk or on the move.',

      suiteBadge: 'Service Suite',
      suiteTitle: 'A Complete Suite for Modern Trading',
      suiteDescription:
        'Combine the tools you need into a single, fast trading experience.',
      suiteItems: [
        { title: 'Risk Management', description: 'Smart stops, margin alerts and exposure dashboards.', iconKey: 'shield' },
        { title: 'Analytics', description: 'Deep performance breakdowns and tax-ready exports.', iconKey: 'chart' },
        { title: 'Partner Network', description: 'IB & affiliate programs with industry-leading payouts.', iconKey: 'percent' },
      ],
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
      heroTitle: 'Grow With Finsai Partnerships',
      heroDescription:
        'Industry-leading commissions, real-time dashboards and a partner team that actually picks up the phone.',
      heroPrimaryCtaLabel: 'Become a Partner',
      heroPrimaryCtaHref: '/register',
      heroSecondaryCtaLabel: 'View Calculator',
      heroSecondaryCtaHref: '#calculator',

      whyBadge: 'Why Finsai IB',
      whyTitle: 'Why Partner With Finsai',
      whyDescription:
        'Six reasons partners build their network on Finsai.',
      whyFeatures: [
        { title: 'High Payouts', description: 'Up to $15 per lot on FX majors.', iconKey: 'percent' },
        { title: 'Multi-Tier IB', description: 'Earn from sub-IBs and second-line affiliates.', iconKey: 'social' },
        { title: 'Marketing Toolkit', description: 'Banners, landing pages and creatives in 15+ languages.', iconKey: 'leverage' },
        { title: 'Dedicated Manager', description: 'A real human, not a chatbot.', iconKey: 'support' },
        { title: 'Real-Time Reports', description: 'See clicks, signups and commissions live.', iconKey: 'dashboard' },
        { title: 'Fast Payouts', description: 'Weekly settlements, no minimum thresholds.', iconKey: 'deposits' },
      ],

      calculatorBadge: 'Earnings Calculator',
      calculatorTitle: 'Estimate Your Monthly Payout',
      calculatorDescription:
        'Move the sliders to see what your IB network could earn at different volume tiers.',

      statsBadge: 'Numbers',
      statsTitle: 'Trusted by a Global Partner Network',
      statsDescription:
        'Partners across 70+ countries are earning with Finsai today.',
      stats: [
        { value: '70+', label: 'Countries' },
        { value: '12,000+', label: 'Active Partners' },
        { value: '$42M+', label: 'Paid Out 2024' },
      ],

      howToBadge: 'How It Works',
      howToTitle: 'Get Started in 3 Steps',
      howToDescription:
        'Onboarding is fully digital — most partners go live the same day.',
      howToSteps: [
        { title: 'Register', description: 'Sign up as an IB / Affiliate partner.', iconKey: 'pencil' },
        { title: 'Promote', description: 'Use creatives, links and landing pages to drive signups.', iconKey: 'rocket' },
        { title: 'Earn', description: 'Get paid weekly on every trade your network makes.', iconKey: 'money' },
      ],

      marketingBadge: 'Marketing Toolkit',
      marketingTitle: 'Everything You Need to Convert',
      marketingDescription:
        'High-converting marketing assets ready to go, no design team required.',
      marketingItems: [
        { title: 'Banners', description: 'Display-ready banners in 50+ sizes.', iconKey: 'flash' },
        { title: 'Landing Pages', description: 'High-converting localized landers.', iconKey: 'chart' },
        { title: 'Video Assets', description: 'Short-form explainers and tutorials.', iconKey: 'bot' },
      ],
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
      heroBadge: 'Blogs & News',
      heroTitle: 'Trade Smarter With Real Market Insight',
      heroDescription:
        'Expert analysis, platform updates and curated reads to sharpen every trade.',
      heroPrimaryCtaLabel: 'Read Latest',
      heroPrimaryCtaHref: '#latest',
      heroSecondaryCtaLabel: 'Subscribe',
      heroSecondaryCtaHref: '#subscribe',

      newsBadge: 'Latest News',
      newsTitle: 'Latest Articles & Market News',
      newsDescription:
        'Stay sharp with daily market briefs, technical setups and platform announcements.',
      newsArticles: [
        {
          title: 'Top 5 FX Pairs to Watch This Week',
          description: 'Catalyst-driven setups across EUR, JPY and GBP majors.',
          href: '/blogs/top-fx-pairs',
        },
        {
          title: 'How to Backtest Strategies in MT5',
          description: 'A step-by-step guide to validating your edge before going live.',
          href: '/blogs/backtest-mt5',
        },
        {
          title: 'Crypto Volatility Playbook',
          description: 'Position sizing, stops and hedging during major news prints.',
          href: '/blogs/crypto-volatility',
        },
      ],
    },
    status: 'published',
  });

  strapi.log.info('[bootstrap] Seeded Blogs Page single type');
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
    await seedRewardsPage(strapi);
    await seedToolsPage(strapi);
    await seedAccountsPage(strapi);
    await seedPaymentsPage(strapi);
    await seedServicesPage(strapi);
    await seedPartnershipsPage(strapi);
    await seedBlogsPage(strapi);
  },
};
