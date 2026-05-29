import type { Schema, Struct } from '@strapi/strapi';

export interface SharedBenefitCard extends Struct.ComponentSchema {
  collectionName: 'components_shared_benefit_cards';
  info: {
    description: 'Card with title, description, bullet points, and an optional footer.';
    displayName: 'Benefit Card';
    icon: 'list';
  };
  attributes: {
    bullets: Schema.Attribute.Component<'shared.bullet-point', true>;
    description: Schema.Attribute.Text;
    footer: Schema.Attribute.String;
    iconKey: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedBulletPoint extends Struct.ComponentSchema {
  collectionName: 'components_shared_bullet_points';
  info: {
    description: "Key-value bullet (e.g. 'Account: Smart Pro'). Used in benefits cards.";
    displayName: 'Bullet Point';
    icon: 'check';
  };
  attributes: {
    key: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedCtaButton extends Struct.ComponentSchema {
  collectionName: 'components_shared_cta_buttons';
  info: {
    description: 'A button with label + href, used in CTA rows.';
    displayName: 'CTA Button';
    icon: 'cursor';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedFeature extends Struct.ComponentSchema {
  collectionName: 'components_shared_features';
  info: {
    description: 'A single label/value row shown inside a tier card';
    displayName: 'Feature';
    icon: 'check';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedFeatureItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_feature_items';
  info: {
    description: 'Single feature row in the Features section (icon picked in code, title set here). Use \\n for line break.';
    displayName: 'Feature item';
    icon: 'star';
  };
  attributes: {
    iconKey: Schema.Attribute.Enumeration<
      ['transparency', 'assets', 'leverage', 'deposits', 'learning', 'social']
    > &
      Schema.Attribute.DefaultTo<'transparency'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedIconFeature extends Struct.ComponentSchema {
  collectionName: 'components_shared_icon_features';
  info: {
    description: 'Card-like feature with title, description, and icon key (icon resolved in frontend).';
    displayName: 'Icon Feature';
    icon: 'star';
  };
  attributes: {
    description: Schema.Attribute.Text;
    iconKey: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedImageCard extends Struct.ComponentSchema {
  collectionName: 'components_shared_image_cards';
  info: {
    description: 'Card with title, description, and an image. Used in tool grids, news lists, etc.';
    displayName: 'Image Card';
    icon: 'picture';
  };
  attributes: {
    description: Schema.Attribute.Text;
    href: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedPaymentMethod extends Struct.ComponentSchema {
  collectionName: 'components_shared_payment_methods';
  info: {
    description: 'Single payment method shown on the Payments page.';
    displayName: 'Payment Method';
    icon: 'credit-card';
  };
  attributes: {
    description: Schema.Attribute.Text;
    fee: Schema.Attribute.String;
    icon: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    processingTime: Schema.Attribute.String;
  };
}

export interface SharedPoint extends Struct.ComponentSchema {
  collectionName: 'components_shared_points';
  info: {
    description: 'Accordion / feature point with title + description.';
    displayName: 'Point';
    icon: 'bullhorn';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedStat extends Struct.ComponentSchema {
  collectionName: 'components_shared_stats';
  info: {
    description: 'Headline statistic (value + descriptive label) used in stat strips.';
    displayName: 'Stat';
    icon: 'chart-line';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedTagline extends Struct.ComponentSchema {
  collectionName: 'components_shared_taglines';
  info: {
    description: "Short text shown in hero subtitle line (e.g. 'Regulated Broker')";
    displayName: 'Tagline';
    icon: 'tag';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.benefit-card': SharedBenefitCard;
      'shared.bullet-point': SharedBulletPoint;
      'shared.cta-button': SharedCtaButton;
      'shared.feature': SharedFeature;
      'shared.feature-item': SharedFeatureItem;
      'shared.icon-feature': SharedIconFeature;
      'shared.image-card': SharedImageCard;
      'shared.payment-method': SharedPaymentMethod;
      'shared.point': SharedPoint;
      'shared.stat': SharedStat;
      'shared.tagline': SharedTagline;
    }
  }
}
