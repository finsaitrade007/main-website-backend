const VALID_SECTIONS = new Set([
  'homepage',
  'accounts',
  'platform',
  'payments',
  'partnerships',
  'social-trading',
]);

function assertSection(section: unknown) {
  if (typeof section !== 'string' || !VALID_SECTIONS.has(section)) {
    throw new Error(
      `section must be one of: ${[...VALID_SECTIONS].join(', ')}`,
    );
  }
}

export default {
  beforeCreate(event: { params: { data?: { section?: unknown } } }) {
    if (event.params.data?.section !== undefined) {
      assertSection(event.params.data.section);
    }
  },
  beforeUpdate(event: { params: { data?: { section?: unknown } } }) {
    if (event.params.data?.section !== undefined) {
      assertSection(event.params.data.section);
    }
  },
};
