import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rowsToCsv } from './csv.js';

test('rowsToCsv quotes per RFC 4180 with CRLF lines', () => {
  const csv = rowsToCsv([{ name: 'FOBO, EMEA', note: 'say "hi"', amount: 12.5 }]);
  assert.equal(csv, 'name,note,amount\r\n"FOBO, EMEA","say ""hi""",12.5\r\n');
});

test('rowsToCsv uses header labels and blanks missing cells', () => {
  const csv = rowsToCsv([{ a: 1 }, { a: null, b: { x: 1 } }], [{ key: 'a', label: 'Amount' }, { key: 'b', label: 'Meta' }]);
  assert.equal(csv, 'Amount,Meta\r\n1,\r\n,"{""x"":1}"\r\n');
});

test('rowsToCsv defuses spreadsheet formulas but keeps negative numbers', () => {
  const csv = rowsToCsv([{ v: '=HYPERLINK("x")' }, { v: '-42.5' }, { v: '@SUM(A1)' }, { v: new Date('2026-09-12T00:00:00Z') }]);
  assert.equal(csv, 'v\r\n"\'=HYPERLINK(""x"")"\r\n-42.5\r\n\'@SUM(A1)\r\n2026-09-12T00:00:00.000Z\r\n');
});
