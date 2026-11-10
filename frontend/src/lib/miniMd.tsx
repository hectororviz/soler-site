import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Mini-markdown seguro: **negrita**, *itálica*, [texto](url) y listas con "- ". Sin HTML crudo. */

function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (h.startsWith('/') && !h.startsWith('//')) return true;
  if (h.startsWith('#')) return true;
  if (/^https?:\/\//i.test(h)) return true;
  if (/^(mailto:|tel:|https?:)/i.test(h)) return true;
  return false;
}

function renderInline(text: string, keyPrefix: string, linkClassName: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Links primero: [label](href)
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let chunk = 0;
  const pushFormatted = (segment: string, baseKey: string) => {
    // Negrita **...**
    const parts = segment.split(/\*\*(.+?)\*\*/g);
    parts.forEach((p, i) => {
      const key = `${baseKey}-b${i}`;
      if (i % 2 === 1) {
        out.push(<strong key={key} className="font-bold">{renderItalic(p, key, linkClassName)}</strong>);
      } else if (p) {
        renderItalicTo(p, key, linkClassName, out);
      }
    });
  };
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > last) pushFormatted(text.slice(last, m.index), `${keyPrefix}-c${chunk++}`);
    const label = m[1];
    const href = m[2].trim().replace(/^<|>$/g, '');
    if (isSafeHref(href)) {
      const internal = href.startsWith('/') && !href.startsWith('//');
      out.push(
        internal ? (
          <Link key={`${keyPrefix}-l${m.index}`} to={href} className={linkClassName}>{label}</Link>
        ) : (
          <a key={`${keyPrefix}-l${m.index}`} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} className={linkClassName}>{label}</a>
        ),
      );
    } else {
      out.push(<span key={`${keyPrefix}-lx${m.index}`}>{label}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) pushFormatted(text.slice(last), `${keyPrefix}-c${chunk++}`);
  return out;
}

function renderItalic(text: string, keyPrefix: string, linkClassName: string): ReactNode[] {
  void linkClassName;
  const tmp: ReactNode[] = [];
  renderItalicTo(text, keyPrefix, linkClassName, tmp);
  return tmp;
}

function renderItalicTo(text: string, keyPrefix: string, _linkClassName: string, out: ReactNode[]) {
  const parts = text.split(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g);
  parts.forEach((p, i) => {
    if (!p) return;
    if (i % 2 === 1) out.push(<em key={`${keyPrefix}-i${i}`}>{p}</em>);
    else out.push(<span key={`${keyPrefix}-t${i}`}>{p}</span>);
  });
}

export function MiniMd({
  text,
  className,
  linkClassName = 'font-semibold text-primary hover:underline',
}: {
  text: string;
  className?: string;
  linkClassName?: string;
}) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const nodes: ReactNode[] = [];
  blocks.forEach((block, bi) => {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const listItems = lines.filter((l) => /^\s*-\s+/.test(l));
    const isList = listItems.length > 0 && listItems.length === lines.filter((l) => l.trim() !== '').length;
    if (isList) {
      nodes.push(
        <ul key={bi} className="list-disc space-y-1 pl-5">
          {listItems.map((l, li) => (
            <li key={li}>{renderInline(l.replace(/^\s*-\s+/, ''), `b${bi}li${li}`, linkClassName)}</li>
          ))}
        </ul>,
      );
    } else if (block.trim() !== '') {
      const lineNodes: ReactNode[] = [];
      lines.forEach((l, li) => {
        if (li > 0) lineNodes.push(<br key={`br-${bi}-${li}`} />);
        lineNodes.push(...renderInline(l, `b${bi}l${li}`, linkClassName));
      });
      nodes.push(<p key={bi}>{lineNodes}</p>);
    }
  });
  return <div className={className ?? 'space-y-2 whitespace-pre-line text-[15px] leading-relaxed'}>{nodes}</div>;
}
