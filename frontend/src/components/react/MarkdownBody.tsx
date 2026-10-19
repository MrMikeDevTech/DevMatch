import { useEffect, useState } from "react";
import { marked } from "marked";
import { highlightCode } from "@/lib/highlight";

marked.setOptions({ breaks: true });
marked.use({
    renderer: {
        code({ text, lang }) {
            const { html, language } = highlightCode(text, lang);
            return `<pre><code class="hljs language-${language}">${html}</code></pre>`;
        }
    }
});

export default function MarkdownBody({ source, className }: { source: string; className?: string }) {
    const [html, setHtml] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        import("dompurify").then(({ default: DOMPurify }) => {
            if (cancelled) return;
            const parsed = marked.parse(source, { async: false }) as string;
            setHtml(DOMPurify.sanitize(parsed));
        });
        return () => {
            cancelled = true;
        };
    }, [source]);

    if (html === null) {
        return <p className={`whitespace-pre-wrap ${className ?? ""}`}>{source}</p>;
    }

    return (
        <div
            className={`prose prose-sm prose-invert max-w-none ${className ?? ""}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
