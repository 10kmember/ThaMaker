import { describe, expect, it } from 'vitest';
import { proposeFinalists, proposeWinner, type SelectionCandidate } from '@/domain/selection';

const candidate = (id: string, totals: number[], eligible = true): SelectionCandidate => ({
  candidacyId: id,
  creatorId: `creator-${id}`,
  totals,
  eligible,
});

describe('finalist selection', () => {
  it('proposes the top four eligible candidacies, in order', () => {
    const result = proposeFinalists([
      candidate('a', [40, 41, 42]),
      candidate('b', [30, 31, 32]),
      candidate('c', [45, 46, 47]),
      candidate('d', [20, 21, 22]),
      candidate('e', [10, 11, 12]),
    ]);

    expect(result.selected.map((entry) => entry.candidacyId)).toEqual(['c', 'a', 'b', 'd']);
    expect(result.selected[0]?.position).toBe(1);
  });

  it('excludes ineligible candidacies and says so', () => {
    const result = proposeFinalists([
      candidate('a', [48, 48, 48], false),
      candidate('b', [30, 31, 32]),
    ]);

    expect(result.selected.map((entry) => entry.candidacyId)).toEqual(['b']);
    expect(result.warnings.join(' ')).toContain('excluded as ineligible');
  });

  it('warns when candidacies are under-judged', () => {
    const result = proposeFinalists([candidate('a', [40]), candidate('b', [30, 31, 32])]);
    expect(result.warnings.join(' ')).toContain('fewer than 3 completed scores');
  });

  it('warns on a tie at the cut line', () => {
    const result = proposeFinalists(
      [
        candidate('a', [50, 50, 50]),
        candidate('b', [45, 45, 45]),
        candidate('c', [40, 40, 40]),
        candidate('d', [30, 30, 30]),
        candidate('e', [30, 30, 30]),
      ],
      4,
    );
    expect(result.warnings.join(' ')).toContain('tie exists at the finalist cut line');
  });
});

describe('winner selection', () => {
  it('proposes the highest-ranked eligible finalist', () => {
    const result = proposeWinner([candidate('a', [40, 41, 42]), candidate('b', [48, 47, 49])]);
    expect(result.selected[0]?.candidacyId).toBe('b');
    expect(result.warnings).toHaveLength(0);
  });

  it('refuses when no finalist is eligible', () => {
    const result = proposeWinner([candidate('a', [40, 41, 42], false)]);
    expect(result.selected).toHaveLength(0);
    expect(result.warnings.join(' ')).toContain('No eligible finalists');
  });

  it('flags a tie at the top for chair adjudication', () => {
    const result = proposeWinner([candidate('a', [40, 40, 40]), candidate('b', [40, 40, 40])]);
    expect(result.warnings.join(' ')).toContain('tied');
  });

  it('flags sharply divided panels', () => {
    const result = proposeWinner([candidate('a', [10, 30, 50])]);
    expect(result.warnings.join(' ')).toContain('disagree sharply');
  });
});
