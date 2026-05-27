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
  const count = await strapi.documents('api::account-tier.account-tier').count({});
  if (count > 0) return;

  const tiers = [
    {
      name: 'Finsai Smart Choice',
      price: '$0',
      unit: 'Commission / $100k',
      featured: false,
      order: 1,
      ctaLabel: 'Open Account',
      ctaHref: '/register',
      features: [
        { label: 'Maximum Leverage', value: '1:400' },
        { label: 'Trading Instruments', value: '5000+' },
        { label: 'Spreads', value: 'competitive' },
        { label: 'Min. Deposit', value: '$100' },
      ],
    },
    {
      name: 'Finsai Smart Pro',
      price: '$0',
      unit: 'Commission / $100k',
      featured: true,
      order: 2,
      ctaLabel: 'Open Account',
      ctaHref: '/register',
      features: [
        { label: 'Maximum Leverage', value: '1:400' },
        { label: 'Trading Instruments', value: '5000+' },
        { label: 'Spreads', value: 'competitive' },
        { label: 'Minimum order size', value: '0.01' },
        { label: 'Min. Deposit', value: '$1000' },
        { label: 'Maximum Open', value: 'Unlimited' },
      ],
    },
    {
      name: 'Finsai Smart ECN',
      price: '$1.5',
      unit: 'Commission / $100k',
      featured: false,
      order: 3,
      ctaLabel: 'Open Account',
      ctaHref: '/register',
      features: [
        { label: 'Maximum Leverage', value: '1:400' },
        { label: 'Trading Instruments', value: '5000+' },
        { label: 'Spreads', value: 'competitive' },
        { label: 'Min. Deposit', value: '$5000' },
      ],
    },
  ];

  for (const tier of tiers) {
    await strapi.documents('api::account-tier.account-tier').create({
      data: tier,
      status: 'published',
    });
  }
  strapi.log.info(`[bootstrap] Seeded ${tiers.length} account tiers`);
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
    { title: 'MT5', size: 'small', row: 1, order: 1, mockup: 'platforms/mt-mockup.png', icon: null, description: "The industry's gold standard for multi-asset trading. Advanced charting, automated trading, real-time analysis, and multi-asset access." },
    { title: 'Finsai Web Terminal', size: 'large', row: 1, order: 2, mockup: 'platforms/web-terminal-mockup.png', icon: null, description: 'Designed for ease and speed, a browser-based solution that requires no downloads or installation. Perfect for traders who prefer accessibility and simplicity.' },
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
  },
};
