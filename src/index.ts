import type { Core } from '@strapi/strapi';

const PUBLIC_READ: Record<string, ('find' | 'findOne')[]> = {
  'account-tier': ['find', 'findOne'],
  faq: ['find', 'findOne'],
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
    await strapi.documents('api::faq.faq').create({
      data: faq,
      status: 'published',
    });
  }

  strapi.log.info(`[bootstrap] Seeded ${faqs.length} FAQs`);
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await setPublicReadPermissions(strapi);
    await seedAccountTiers(strapi);
    await seedFaqs(strapi);
  },
};
