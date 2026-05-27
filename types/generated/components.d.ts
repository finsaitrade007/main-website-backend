import type { Schema, Struct } from '@strapi/strapi';

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
      'shared.feature': SharedFeature;
      'shared.feature-item': SharedFeatureItem;
      'shared.tagline': SharedTagline;
    }
  }
}
