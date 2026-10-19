import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import go from "highlight.js/lib/languages/go";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import markdown from "highlight.js/lib/languages/markdown";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("go", go);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("json", json);

export function highlightCode(code: string, lang?: string): { html: string; language: string } {
    const normalized = lang?.toLowerCase().trim();
    if (normalized && hljs.getLanguage(normalized)) {
        const result = hljs.highlight(code, { language: normalized });
        return { html: result.value, language: normalized };
    }

    const auto = hljs.highlightAuto(code);
    return { html: auto.value, language: auto.language ?? "plaintext" };
}
