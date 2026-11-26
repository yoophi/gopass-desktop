import { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { yaml } from "@codemirror/lang-yaml";
import { detailFormat } from "./EntryDetails";

const languages = { JSON: json, YAML: yaml, Markdown: markdown, 텍스트: null };

/** Loaded lazily: CodeMirror is far larger than the rest of the entry modal. */
export default function DetailsEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const format = detailFormat(value);
  const extensions = useMemo(() => {
    const language = languages[format];
    return [EditorView.lineWrapping, EditorView.contentAttributes.of({ "aria-label": "추가 정보" }), ...(language ? [language()] : [])];
  }, [format]);
  // Tab keeps moving focus, and completion popups stay off so words from a secret are never suggested back.
  return <CodeMirror value={value} onChange={onChange} extensions={extensions} height="180px" indentWithTab={false}
    basicSetup={{ foldGutter: false, autocompletion: false }} className="overflow-hidden rounded-md border border-input text-sm" />;
}
