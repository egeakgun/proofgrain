const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks.json'), 'utf8')).datasets[0];
const csv = name => fs.readFileSync(path.join(root, name), 'utf8').trim().split(/\r?\n/).map(line => line.split(','));

test('all 144 task scores reproduce every published model summary', () => {
  assert.equal(data.problems, 18);
  assert.equal(data.models.length, 8);
  assert.equal(data.attempts, 144);
  assert.equal(data.total_scored, 144);
  assert.equal(new Set(data.models.map(m => m.id)).size, 8);
  for (const m of data.models) {
    assert.equal(m.task_scores.length, 18);
    assert.ok(m.task_scores.every(n => Number.isInteger(n) && n >= 0 && n <= 7));
    assert.equal(m.scored, 18);
    assert.equal(m.assigned, 18);
    assert.equal(m.task_scores.reduce((a,b) => a+b,0)/18, m.mean_score);
    assert.deepEqual(Array.from({length:8}, (_,score) => m.task_scores.filter(n=>n===score).length), m.score_distribution);
    assert.equal(m.task_scores.filter(n=>n===7).length, m.full_credit);
    assert.ok(m.ci95.low <= m.mean_score && m.mean_score <= m.ci95.high);
  }
  assert.equal(data.models.reduce((n,m) => n+m.full_credit,0), data.total_full_credit);
});

test('downloadable task CSV contains the same 144 scores in the same task order', () => {
  const [header, ...rows] = csv('benchmark-task-scores.csv');
  assert.deepEqual(header, ['task', ...data.models.map(m=>m.id)]);
  assert.equal(rows.length, 18);
  rows.forEach((row,i) => assert.deepEqual(row.map(Number), [i+1, ...data.models.map(m=>m.task_scores[i])]));
});

test('aggregate CSV agrees with the displayed data', () => {
  const [header, ...rows] = csv('benchmark-results.csv');
  for (const row of rows) {
    const record = Object.fromEntries(header.map((key,i) => [key,row[i]]));
    const m = data.models.find(m => m.name === record.model);
    assert.ok(m, `Unknown model: ${record.model}`);
    assert.equal(Number(record.mean_score_out_of_7), m.mean_score);
    assert.equal(Number(record.scored_attempts), m.scored);
    assert.equal(Number(record.automated_valid_7_of_7), m.full_credit);
  }
});
