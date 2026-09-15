/** Dashboard tokens for live Mermaid on Architecture. Matches `styles.css` dark/light. */

const FONT = '"Inter", system-ui, -apple-system, sans-serif';

export function themeTokens(dark) {
  if (dark) {
    return {
      canvas: '#090d1c',
      canvas2: '#0b1020',
      surface: '#161d33',
      raised: '#1d2540',
      stroke: '#232b48',
      stroke2: '#2e3958',
      ink: '#e6e8ee',
      muted: '#c7cad6',
      faint: '#7e85a3',
      accent: '#818cf8',
      cyan: '#a5b4fc',
      ok: '#34d399',
      warn: '#fbbf24',
      fail: '#f87171',
      bo: '#a78bfa',
    };
  }
  return {
    canvas: '#f5f6fb',
    canvas2: '#f8fafc',
    surface: '#ffffff',
    raised: '#f1f5f9',
    stroke: '#e2e8f0',
    stroke2: '#cbd5e1',
    ink: '#0f172a',
    muted: '#475569',
    faint: '#94a3b8',
    accent: '#6366f1',
    cyan: '#4f46e5',
    ok: '#059669',
    warn: '#d97706',
    fail: '#dc2626',
    bo: '#7c3aed',
  };
}

export function mermaidConfig(dark) {
  const t = themeTokens(dark);
  return {
    startOnLoad: false,
    securityLevel: 'loose',
    suppressErrorRendering: true,
    darkMode: dark,
    theme: 'base',
    fontFamily: FONT,
    themeVariables: {
      darkMode: dark,
      background: t.surface,
      fontFamily: FONT,
      fontSize: '14px',
      primaryColor: t.raised,
      primaryTextColor: t.ink,
      primaryBorderColor: t.accent,
      secondaryColor: t.canvas2,
      secondaryTextColor: t.ink,
      secondaryBorderColor: t.stroke2,
      tertiaryColor: t.surface,
      tertiaryTextColor: t.ink,
      tertiaryBorderColor: t.stroke,
      lineColor: t.stroke2,
      textColor: t.ink,
      mainBkg: t.raised,
      nodeBkg: t.raised,
      nodeBorder: t.stroke2,
      clusterBkg: t.canvas2,
      clusterBorder: t.stroke,
      titleColor: t.ink,
      edgeLabelBackground: t.surface,
      defaultLinkColor: t.muted,
      errorBkgColor: t.fail,
      errorTextColor: t.ink,
      noteBkgColor: t.raised,
      noteTextColor: t.ink,
      noteBorderColor: t.stroke2,
      actorBkg: t.raised,
      actorBorder: t.accent,
      actorTextColor: t.ink,
      actorLineColor: t.stroke2,
      signalColor: t.muted,
      signalTextColor: t.ink,
      labelBoxBkgColor: t.raised,
      labelBoxBorderColor: t.accent,
      labelTextColor: t.ink,
      loopTextColor: t.ink,
      activationBkgColor: t.canvas2,
      activationBorderColor: t.accent,
      sequenceNumberColor: t.canvas,
      sectionBkgColor: t.canvas2,
      altSectionBkgColor: t.raised,
      sectionBkgColor2: t.surface,
      attributeBackgroundColorOdd: t.raised,
      attributeBackgroundColorEven: t.canvas2,
      relationColor: t.stroke2,
      relationLabelBackground: t.surface,
      labelBackgroundColor: t.surface,
      altBackground: t.canvas2,
      compositeBackground: t.surface,
      compositeTitleBackground: t.raised,
      specialStateColor: t.accent,
    },
    flowchart: {
      curve: 'basis',
      htmlLabels: true,
      padding: 12,
      nodeSpacing: 28,
      rankSpacing: 36,
      useMaxWidth: true,
    },
    sequence: {
      actorMargin: 28,
      mirrorActors: false,
      useMaxWidth: true,
      messageAlign: 'center',
    },
    er: { useMaxWidth: true },
    state: { useMaxWidth: true },
  };
}

function classDefs(dark) {
  const t = themeTokens(dark);
  const line = (name, fill, stroke) =>
    `classDef ${name} fill:${fill},stroke:${stroke},color:${t.ink},stroke-width:1.5px`;
  return [
    line('sor', t.raised, t.stroke2),
    line('edge', t.raised, t.warn),
    line('run', t.raised, t.accent),
    line('store', t.raised, t.ok),
    line('down', t.raised, t.ok),
    line('ux', t.raised, t.bo),
    line('ctrl', t.raised, t.cyan),
    line('app', t.raised, t.accent),
    line('web', t.raised, t.bo),
    line('sim', t.raised, t.warn),
  ].join('\n');
}

/** Drop hardcoded pastel classDef from flowcharts and restyle to the active dashboard theme.
 * Sequence, ER, and state diagrams have no classDef — themeVariables cover them. */
export function themedSource(source, dark) {
  const stripped = source.replace(/^[ \t]*classDef .+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!/^\s*flowchart\b/m.test(source)) return stripped;
  return `${stripped}\n\n${classDefs(dark)}\n`;
}
