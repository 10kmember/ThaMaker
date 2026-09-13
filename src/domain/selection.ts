import { rank, type NominationScores } from './judging';

export const DEFAULT_FINALIST_COUNT = 4;
export const MIN_JUDGES_PER_NOMINATION = 3;

export type SelectionCandidate = NominationScores & {
  creatorId: string;
  eligible: boolean;
};

export type SelectionResult<T> = {
  selected: T[];
  warnings: string[];
};

/**
 * Finalist selection is a recommendation, never an automatic act: the ranking
 * is produced here and an administrator confirms it, which is what gets audited.
 */
export function proposeFinalists(
  candidates: SelectionCandidate[],
  count = DEFAULT_FINALIST_COUNT,
): SelectionResult<{ nominationId: string; creatorId: string; position: number }> {
  const warnings: string[] = [];
  const eligible = candidates.filter((candidate) => candidate.eligible);

  const ineligibleCount = candidates.length - eligible.length;
  if (ineligibleCount > 0) {
    warnings.push(`${ineligibleCount} nomination(s) excluded as ineligible.`);
  }

  const underJudged = eligible.filter(
    (candidate) => candidate.totals.length < MIN_JUDGES_PER_NOMINATION,
  );
  if (underJudged.length > 0) {
    warnings.push(
      `${underJudged.length} nomination(s) have fewer than ${MIN_JUDGES_PER_NOMINATION} completed scores.`,
    );
  }

  const byId = new Map(eligible.map((candidate) => [candidate.nominationId, candidate]));
  const ranked = rank(eligible.map(({ nominationId, totals }) => ({ nominationId, totals })));

  const selected = ranked.slice(0, count).map((entry, index) => ({
    nominationId: entry.nominationId,
    creatorId: byId.get(entry.nominationId)?.creatorId ?? '',
    position: index + 1,
  }));

  if (selected.length < count) {
    warnings.push(`Only ${selected.length} eligible nomination(s) available for ${count} places.`);
  }

  const tie = ranked[count - 1] && ranked[count] && ranked[count - 1]!.trimmedMean === ranked[count]!.trimmedMean;
  if (tie) {
    warnings.push('A tie exists at the finalist cut line — chair review required.');
  }

  return { selected, warnings };
}

export function proposeWinner(
  finalists: SelectionCandidate[],
): SelectionResult<{ nominationId: string; creatorId: string }> {
  const warnings: string[] = [];
  const eligible = finalists.filter((candidate) => candidate.eligible);

  if (eligible.length === 0) {
    return { selected: [], warnings: ['No eligible finalists.'] };
  }

  const ranked = rank(eligible.map(({ nominationId, totals }) => ({ nominationId, totals })));
  const top = ranked[0]!;
  const runnerUp = ranked[1];

  if (runnerUp && runnerUp.trimmedMean === top.trimmedMean) {
    warnings.push('The leading two finalists are tied — chair adjudication required.');
  }
  if (top.judgeCount < MIN_JUDGES_PER_NOMINATION) {
    warnings.push(`The leading finalist has only ${top.judgeCount} completed score(s).`);
  }
  if (top.spread >= 20) {
    warnings.push('Judges disagree sharply on the leading finalist — review before confirming.');
  }

  const byId = new Map(eligible.map((candidate) => [candidate.nominationId, candidate]));

  return {
    selected: [
      {
        nominationId: top.nominationId,
        creatorId: byId.get(top.nominationId)?.creatorId ?? '',
      },
    ],
    warnings,
  };
}
