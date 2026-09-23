import { resolvePartnerEmbedUrl } from '../lib/partnerEmbed.js';

export default function PartnerFrame({ url, context = {}, title = 'Partner screen', variant }) {
  const embed = resolvePartnerEmbedUrl(url);
  if (!embed) {
    return <p className="muted" style={{ margin: 0 }}>No embed URL on this kit.</p>;
  }
  const qs = new URLSearchParams();
  Object.entries(context).forEach(([k, v]) => {
    if (v != null && v !== '') qs.set(k, String(v));
  });
  const src = embed + (embed.includes('?') ? '&' : '?') + qs.toString();
  return (
    <div className={'partner-frame' + (variant === 'primary' ? ' primary' : '')}>
      <iframe title={title} src={src} />
    </div>
  );
}
