import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function Markdown({ children }: { children: string }) {
  if (!children) return null
  return (
    <div className="prose prose-stone max-w-none prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-a:text-brand prose-code:rounded-none prose-pre:rounded-none prose-pre:border prose-pre:bg-panel prose-pre:text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}
