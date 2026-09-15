/** Dashboard tokens for live Mermaid on Architecture. Matches `styles.css` dark/light. */

export function themeTokens(dark) {
  if (dark) {
    return {
      canvas: '#0b1220',
      canvas2: '#101a28',
      surface: '#152033',
      raised: '#1c2b40',
      stroke: '#2a3d55',
      stroke2: '#3d5673',
      ink: '#eef3f8',
      muted: '#93a6bb',
      faint: '#6e849b',
      accent: '#00aeef',
      cyan: '#38bdf8',
      ok: '#22c55e',
      warn: '#f59e0b',
      fail: '#ef4444',
      bo: '#a78bfa',
    };
  }
  return {
    canvas: '#eef1f6',
    canvas2: '#e6ebf2',
    surface: '#ffffff',
    raised: '#f4f7fb',
    stroke: '#d5dee8',
    stroke2: '#b9c7d6',
    ink: '#102033',
    muted: '#4d6278',
    faint: '#7a8fa3',
    accent: '#0284c7',
    cyan: '#0369a1',
    ok: '#15803d',
    warn: '#b45309',
    fail: '#dc2626',
    bo: '#6d28d9',
  };
}

export function mermaidConfig(dark) {
  const t = themeTokens(dark);
  return {
    startOnLoad: false,
    securityLevel: 'loose',
    darkMode: dark,
    theme: 'base',
    fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    themeVariables: {
      darkMode: dark,
      background: t.surface,
      fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
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

/** Drop hardcoded pastel classDef from the .mmd and restyle to the active dashboard theme. */
export function themedSource(source, dark) {
  const stripped = source.replace(/^[ \t]*classDef .+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  return `${stripped}\n\n${classDefs(dark)}\n`;
}
