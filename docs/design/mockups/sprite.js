/* Icon sprite. Injected by script so every screen shares one definition and
   the mockups still work from file:// (Chrome cannot <use> an external SVG). */
(function () {
  var icons = {
    home: '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1V9.5Z"/>',
    board: '<rect x="3" y="3" width="14" height="14" rx="1.5"/><path d="M7 13V9M10 13V7M13 13v-2"/>',
    cards: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
    ops: '<circle cx="10" cy="10" r="2.4"/><path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M14.6 5.4l-1.4 1.4M6.8 13.2l-1.4 1.4"/>',
    alert: '<path d="M10 3.5 2.8 16h14.4L10 3.5Z"/><path d="M10 8v3.4M10 13.6v.2"/>',
    letter: '<rect x="2.5" y="4.5" width="15" height="11" rx="1.5"/><path d="m3 6 7 5 7-5"/>',
    config: '<path d="M8.4 3h3.2l.4 2.1 1.6.9 2-.7 1.6 2.8-1.6 1.4v1.8l1.6 1.4-1.6 2.8-2-.7-1.6.9-.4 2.1H8.4L8 15.7l-1.6-.9-2 .7L2.8 12.7l1.6-1.4V9.5L2.8 8.1l1.6-2.8 2 .7L8 5.1 8.4 3Z"/><circle cx="10" cy="10" r="2"/>',
    kit: '<path d="M3 7.2 10 3.5l7 3.7-7 3.8-7-3.8Z"/><path d="M3 12.8 10 16.5l7-3.7M3 10l7 3.7L17 10"/>',
    source: '<ellipse cx="10" cy="5.4" rx="6" ry="2.4"/><path d="M4 5.4v9.2c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V5.4"/><path d="M4 10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4"/>',
    lineage: '<circle cx="4.5" cy="10" r="1.8"/><circle cx="15.5" cy="5.5" r="1.8"/><circle cx="15.5" cy="14.5" r="1.8"/><path d="M6.3 9.3 13.7 6.2M6.3 10.7l7.4 3.1"/>',
    palette: '<circle cx="10" cy="10" r="7"/><circle cx="7.4" cy="8.2" r="1"/><circle cx="12.6" cy="8.2" r="1"/><circle cx="10" cy="13" r="1"/>',
    search: '<circle cx="9" cy="9" r="5.2"/><path d="m12.8 12.8 4 4"/>',
    bell: '<path d="M6 8.6a4 4 0 0 1 8 0c0 3 1.2 4.4 1.2 4.4H4.8S6 11.6 6 8.6Z"/><path d="M8.6 15.4a1.6 1.6 0 0 0 2.8 0"/>',
    down: '<path d="m5.5 8 4.5 4.4L14.5 8"/>',
    right: '<path d="m8 5.5 4.4 4.5L8 14.5"/>',
    check: '<path d="m4.5 10.5 3.6 3.6 7.4-8.2"/>',
    x: '<path d="m5.5 5.5 9 9M14.5 5.5l-9 9"/>',
    clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4.3l3 1.7"/>',
    ext: '<path d="M11 4h5v5"/><path d="M16 4 9 11"/><path d="M14.5 12.5V15a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5h2.5"/>',
    filter: '<path d="M3.5 5h13l-5 5.6V16l-3-1.6v-3.8L3.5 5Z"/>',
    down_tray: '<path d="M10 3.5v8.5M6.6 9l3.4 3.4L13.4 9"/><path d="M4 15.5h12"/>',
    refresh: '<path d="M16 10a6 6 0 1 1-1.9-4.4"/><path d="M16.4 4v3.2h-3.2"/>',
    lock: '<rect x="4.5" y="9" width="11" height="7.5" rx="1.4"/><path d="M7.2 9V7a2.8 2.8 0 0 1 5.6 0v2"/>',
    user: '<circle cx="10" cy="7" r="3"/><path d="M4.5 16.5c.7-2.8 2.9-4.2 5.5-4.2s4.8 1.4 5.5 4.2"/>',
    shield: '<path d="M10 3.2 5 5v4.6c0 3.2 2 5.6 5 7.2 3-1.6 5-4 5-7.2V5l-5-1.8Z"/><path d="m7.8 10 1.7 1.7 3-3.4"/>',
    pin: '<path d="M10 17s5.5-5.2 5.5-9A5.5 5.5 0 0 0 4.5 8c0 3.8 5.5 9 5.5 9Z"/><circle cx="10" cy="8" r="1.9"/>',
    play: '<path d="M7 5.2 15 10l-8 4.8V5.2Z"/>',
    dots: '<circle cx="5" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="15" cy="10" r="1.2"/>',
    grid: '<rect x="3" y="4.5" width="14" height="11" rx="1.2"/><path d="M3 8.2h14M3 11.9h14M8 4.5v11M12.5 4.5v11"/>',
    signoff: '<path d="M4 14.5c2-3.6 3.4 1.2 5-1.6s2.6-6 3.4-6.4"/><path d="M13 16.5h3.5"/><path d="M13.6 6.6 15 5.2l1.6 1.6-1.4 1.4"/>',
    inbox: '<path d="M3 11.5 5.3 4.5h9.4L17 11.5v3A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-3Z"/><path d="M3 11.5h4l.8 1.8h4.4l.8-1.8h4"/>'
  };
  var out = '<svg class="sprite" aria-hidden="true">';
  for (var k in icons) {
    out += '<symbol id="i-' + k + '" viewBox="0 0 20 20">' + icons[k] + '</symbol>';
  }
  out += '</svg>';
  function inject() { document.body.insertAdjacentHTML('afterbegin', out); }
  if (document.body) { inject(); } else { document.addEventListener('DOMContentLoaded', inject); }
})();
