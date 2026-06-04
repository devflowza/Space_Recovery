// Flags soft-deletable child *_items tables embedded in a PostgREST `.select()`
// template literal (e.g. `quote_items (*)`, `invoice_line_items (*)`).
//
// WHY: these item tables are SOFT-deleted (a `deleted_at` column; rows are never
// hard-removed — `updateQuote`/`updateInvoice` soft-delete the live set then
// re-insert). PostgREST embedded resources are NOT `deleted_at`-filtered anywhere
// in this codebase, so an embed resurrects soft-deleted rows as DUPLICATE document
// lines (e.g. a 1-item quote converting to a 2-line invoice). This recurred across
// convert / edit-prefill paths.
//
// FIX: read item rows in a SEPARATE query that filters them, e.g.
//   await supabase.from('quote_items').select('*').eq('quote_id', id)
//     .is('deleted_at', null).order('sort_order')
// or reuse a filtered service helper (`fetchQuoteById` / `fetchInvoiceById`).
//
// Scope: the financial document item tables. (onboarding_checklist_items /
// payroll_record_items use embeds too but are lower-impact HR data — tracked
// separately; not enforced here yet.)

const SOFT_DELETE_ITEM_TABLES = [
  'quote_items',
  'invoice_line_items',
  'purchase_order_items',
  'case_quote_items',
];

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow embedding soft-deletable *_items tables in select(); they resurface soft-deleted rows as duplicate lines. Use a separate query with .is(\'deleted_at\', null).',
    },
    schema: [],
    messages: {
      embed:
        'Soft-deletable "{{name}}" embedded in select() resurfaces deleted rows as duplicate document lines. Read it in a separate query with .is(\'deleted_at\', null) (see fetchQuoteById/fetchInvoiceById).',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee?.property?.name !== 'select') return;
        const arg = node.arguments[0];
        if (arg?.type !== 'TemplateLiteral') return;

        const source = arg.quasis.map(q => q.value.cooked).join('\n');
        const pattern = new RegExp('\\b(' + SOFT_DELETE_ITEM_TABLES.join('|') + ')\\s*[!(]', 'g');

        let match;
        while ((match = pattern.exec(source)) !== null) {
          context.report({ node: arg, messageId: 'embed', data: { name: match[1] } });
        }
      },
    };
  },
};
