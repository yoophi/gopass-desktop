import Markdown from "react-markdown";

type Format = "JSON" | "YAML" | "Markdown" | "텍스트";

const pair = /^[^\s:#-][^:]*:(\s+.*)?$/;

export function detailFormat(text: string): Format {
  const lines = text.split("\n").filter(line => line.trim());
  if (/^[[{]/.test(text.trim())) try { JSON.parse(text); return "JSON"; } catch { /* not JSON */ }
  if (pair.test(lines[0] ?? "") && lines.every(line => pair.test(line) || /^(\s+|- )/.test(line))) return "YAML";
  if (/^(#{1,6} |[-*+] |\d+\. |> |```)/m.test(text) || /\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]+\)/.test(text)) return "Markdown";
  return "텍스트";
}

// Re-indents without parsing values: JSON.parse would silently round long numbers such as account ids.
function reindent(json: string) {
  let out = "", depth = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (char === '"') {
      const end = /^"(?:[^"\\]|\\.)*"/.exec(json.slice(i))![0];
      out += end; i += end.length - 1;
    } else if (/\s/.test(char)) continue;
    else if (char === "{" || char === "[") {
      const empty = /^\s*[}\]]/.exec(json.slice(i + 1));
      if (empty) { out += char + empty[0].trim(); i += empty[0].length; }
      else out += char + "\n" + "  ".repeat(++depth);
    } else if (char === "}" || char === "]") out += "\n" + "  ".repeat(--depth) + char;
    else if (char === ",") out += ",\n" + "  ".repeat(depth);
    else if (char === ":") out += ": ";
    else out += char;
  }
  return out;
}

const code = "overflow-x-auto rounded-md bg-input/30 p-3 font-mono text-sm whitespace-pre";
const prose = "grid gap-2 text-sm break-words [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-input [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-input/40 [&_code]:px-1 [&_code]:font-mono [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-input/30 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-5";

/** Shows the lines after the password in the form that reads best for their format. */
export function EntryDetails({ text }: { text: string }) {
  const format = detailFormat(text);
  const lines = text.split("\n").filter(line => line.trim());
  const flat = format === "YAML" && lines.every(line => pair.test(line));
  return <div className="grid gap-2 rounded-lg border border-input p-4">
    <span className="text-sm font-medium">추가 정보 <span className="font-normal text-muted-foreground">· {format}</span></span>
    {format === "JSON" && <pre className={code}>{reindent(text.trim())}</pre>}
    {format === "YAML" && (flat
      ? <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">{lines.map((line, i) => {
          const at = line.indexOf(":");
          return <div key={i} className="contents"><dt className="font-medium text-muted-foreground">{line.slice(0, at)}</dt>
            <dd className="font-mono break-all">{line.slice(at + 1).trim()}</dd></div>;
        })}</dl>
      : <pre className={code}>{text}</pre>)}
    {/* A secret must not load remote images or navigate the app window, so both stay inert. */}
    {format === "Markdown" && <div className={prose}><Markdown disallowedElements={["img"]}
      components={{ a: ({ href, children }) => <span title={href} className="underline">{children}</span> }}>{text}</Markdown></div>}
    {format === "텍스트" && <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>}
  </div>;
}
