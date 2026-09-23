import assert from 'node:assert/strict';
import { test } from 'node:test';
import { destUsesKitEmbed, resolvePartnerEmbedUrl } from './partnerEmbed.js';

test('resolvePartnerEmbedUrl maps helix.example placeholder to the same-origin stub', () => {
  assert.equal(resolvePartnerEmbedUrl('https://helix.example/fobo'), '/sim/screens/helix');
});

test('resolvePartnerEmbedUrl leaves relative and other hosts alone', () => {
  assert.equal(resolvePartnerEmbedUrl('/sim/screens/helix'), '/sim/screens/helix');
  assert.equal(resolvePartnerEmbedUrl('https://helix.prod.example.net/fobo'), 'https://helix.prod.example.net/fobo');
});

test('destUsesKitEmbed is true when surface is IFRAME', () => {
  assert.equal(destUsesKitEmbed({ destId: 'AXIOM', surface: 'IFRAME' }, { embedUrl: '/x' }), true);
});

test('destUsesKitEmbed is true when stale dest id prefixes the kit renderer', () => {
  assert.equal(destUsesKitEmbed(
    { destId: 'HELIX' },
    { renderer: 'HELIX_RECON', embedUrl: 'https://helix.example/fobo' },
  ), true);
});

test('destUsesKitEmbed is false for GRID dests and non-renderer dests', () => {
  assert.equal(destUsesKitEmbed({ destId: 'FAS_MOTIF', surface: 'GRID' }, { embedUrl: '/x', renderer: 'HELIX_RECON' }), false);
  assert.equal(destUsesKitEmbed({ destId: 'FAS_MOTIF' }, { embedUrl: '/x', renderer: 'HELIX_RECON' }), false);
});
