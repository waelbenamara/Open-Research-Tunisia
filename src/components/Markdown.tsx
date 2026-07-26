import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders user-authored Markdown as formatted, styled HTML.
 *
 * XSS-safe by construction: react-markdown escapes any raw HTML (we don't load
 * rehype-raw), and its default urlTransform strips dangerous schemes like
 * javascript:. Links open in a new tab and are nofollow. Works in both server
 * and client components.
 */
export function Markdown({ children }: { children: string | null | undefined }) {
  const text = (children ?? "").trim();
  if (!text) return null;
  return (
    <div className="prose-ort">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
