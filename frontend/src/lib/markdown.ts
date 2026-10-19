import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
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

export function renderMarkdown(source: string): string {
    const html = marked.parse(source, { async: false });
    return sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "h3", "img"]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ["src", "alt"],
            a: ["href", "name", "target", "rel"],
            code: ["class"],
            span: ["class"],
            pre: ["class"]
        }
    });
}
