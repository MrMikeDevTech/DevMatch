import { highlightCode } from "@/lib/highlight";

type Props = {
    content: string;
    language: string;
    onContentChange: (value: string) => void;
    onLanguageChange: (value: string) => void;
};

const EDITOR_TEXT_CLASSES = "font-mono text-xs leading-5 whitespace-pre-wrap break-words p-3";

export default function CodeBlockEditor({ content, language, onContentChange, onLanguageChange }: Props) {
    const { html, language: detected } = highlightCode(content || " ", language);

    return (
        <div className="rounded-lg border border-border bg-bg">
            <input
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                placeholder="lenguaje (opcional)"
                className="w-full border-b border-border bg-transparent px-3 py-1.5 text-xs text-text-muted outline-none"
            />
            <div className="relative max-h-64 overflow-y-auto">
                <div className="relative min-h-[6rem]">
                    <pre className={`pointer-events-none m-0 ${EDITOR_TEXT_CLASSES}`} aria-hidden="true">
                        <code className={`hljs language-${detected}`} dangerouslySetInnerHTML={{ __html: html }} />
                    </pre>
                    <textarea
                        value={content}
                        onChange={(e) => onContentChange(e.target.value)}
                        placeholder="pega tu código..."
                        spellCheck={false}
                        className={`absolute inset-0 h-full w-full resize-none bg-transparent text-transparent caret-white outline-none selection:bg-primary/30 ${EDITOR_TEXT_CLASSES}`}
                    />
                </div>
            </div>
        </div>
    );
}
