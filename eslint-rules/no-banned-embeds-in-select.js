import { BANNED_TABLES } from './banned-tables.js';

export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow legacy table names in PostgREST select() embeds' },
    schema: [],
    messages: {
      banned: 'Legacy table name "{{name}}" in select embed. Use prefixed name (catalog_*/master_*/geo_*).',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee?.property?.name !== 'select') return;
        const arg = node.arguments[0];
        if (arg?.type !== 'TemplateLiteral') return;

        const source = arg.quasis.map(q => q.value.cooked).join('\n');
        const pattern = new RegExp('\\b(' + BANNED_TABLES.join('|') + ')\\s*[!(]', 'g');

        let match;
        while ((match = pattern.exec(source)) !== null) {
          context.report({ node: arg, messageId: 'banned', data: { name: match[1] } });
        }
      },
    };
  },
};
