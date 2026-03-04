#!/usr/bin/env node
/**
 * 将「资产配置.xlsx」转为旭日图 JSON（无 shares，仅 name + percentage）
 * 用法: node scripts/xlsx-to-sunburst-json.js [输入.xlsx] [输出.json]
 * 默认: 桌面 资产配置.xlsx -> data/position_distribution.json
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const defaultInput = path.join(process.env.HOME || '', 'Desktop', '资产配置.xlsx');
const defaultOutput = path.join(process.cwd(), 'data', 'position_distribution.json');

const inputPath = process.argv[2] || defaultInput;
const outputPath = process.argv[3] || defaultOutput;

function parseCell(v) {
  if (typeof v !== 'string') return { name: String(v || '').trim(), percentage: '' };
  const parts = v.split(/\n/);
  const name = (parts[0] || '').trim();
  let pct = (parts[1] || '').trim();
  if (pct && !pct.endsWith('%')) pct = pct + '%';
  return { name, percentage: pct };
}

const wb = XLSX.readFile(inputPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const dataRows = rows.slice(1).filter((r) => r && (r[0] || r[1] || r[2]));
const tree = {};
for (const row of dataRows) {
  const l1 = parseCell(row[0]);
  const l2 = parseCell(row[1]);
  const l3 = parseCell(row[2]);
  const ratio = Number(row[3]);
  const pctStr = Number.isFinite(ratio) ? (ratio * 100).toFixed(2) + '%' : l3.percentage;
  if (!l1.name) continue;
  if (!tree[l1.name]) tree[l1.name] = { name: l1.name, percentage: l1.percentage, children: {} };
  if (!tree[l1.name].children[l2.name])
    tree[l1.name].children[l2.name] = { name: l2.name, percentage: l2.percentage, children: {} };
  const c = tree[l1.name].children[l2.name].children;
  if (!c[l3.name]) c[l3.name] = { name: l3.name, percentage: pctStr };
  else if (!c[l3.name].percentage) c[l3.name].percentage = pctStr;
}

function toArr(obj) {
  return Object.values(obj)
    .map((n) => ({
      name: n.name,
      percentage: n.percentage || undefined,
      children: n.children ? toArr(n.children) : undefined,
    }))
    .filter((n) => n.name);
}

const children = toArr(tree);
const out = {
  metadata: { chart_type: 'sunburst', version: '1.0' },
  name: '资产配置',
  date: new Date().toISOString().slice(0, 10),
  children,
};

const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Written to', outputPath, '(', children.length, 'top-level nodes)');
