import { memo } from 'react'

import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

/**
 * Renders assistant markdown safely. react-markdown emits React nodes (no
 * innerHTML), we do NOT use rehype-raw (so any literal HTML the local model
 * emits is escaped, not executed), and rehype-sanitize strips dangerous
 * nodes (script tags, on-event handlers, javascript: URLs) as
 * belt-and-suspenders. The schema only widens `className` on code/span
 * (for language hints) — no style or event attributes.
 */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
  },
}

const components: Components = {
  a(props) {
    const { node, ...rest } = props
    void node
    return <a {...rest} target="_blank" rel="noopener noreferrer nofollow" />
  },
}

function MarkdownInner({ source }: { source: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}

export const Markdown = memo(MarkdownInner)
