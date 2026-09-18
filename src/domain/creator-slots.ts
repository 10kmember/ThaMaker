/**
 * The two slots a creator record always shows.
 *
 * Everything else a creator adds is freeform: a label and an address, in
 * whatever order they like. These two are different because they are the two
 * questions a reader arrives with — where do I watch, and where do I read —
 * and a record that answers them only for the creators who happened to fill
 * them in is a record that looks broken on everybody else.
 *
 * So both are always present. When a creator has given one it is a link; when
 * they have not, PALMA says so plainly, in its own voice, rather than leaving
 * a gap the reader has to interpret.
 */

export type CreatorSlot = {
  key: 'channel' | 'written';
  /** What the slot is called on the record. */
  label: string;
  /**
   * Labels a creator might have used for this slot, lower-cased. The match is
   * deliberately generous: creators write "Channel", "The series", "Videos",
   * and none of them is wrong.
   */
  aliases: string[];
  /** What PALMA says when the slot is empty. Light, never mocking. */
  empty: string;
};

export const CREATOR_SLOTS: readonly CreatorSlot[] = [
  {
    key: 'channel',
    label: 'Channel',
    aliases: ['channel', 'the series', 'video', 'videos', 'stream', 'watch', 'youtube'],
    empty: 'No channel on file. PALMA has looked, and found a very tidy nothing.',
  },
  {
    key: 'written',
    label: 'Written work',
    aliases: ['written work', 'writing', 'words', 'blog', 'newsletter', 'essays', 'portfolio'],
    empty: 'Nothing written here yet. The blank page is winning, as it usually does.',
  },
];

export type SlotLink = { label: string; url: string };

/**
 * Fill both slots from whatever the creator actually provided, and report the
 * links that belong to neither so the record can still show them.
 */
export function fillCreatorSlots(links: readonly SlotLink[]): {
  slots: { slot: CreatorSlot; link: SlotLink | null }[];
  rest: SlotLink[];
} {
  const claimed = new Set<string>();

  const slots = CREATOR_SLOTS.map((slot) => {
    const link =
      links.find(
        (entry) =>
          !claimed.has(entry.url) && slot.aliases.includes(entry.label.trim().toLowerCase()),
      ) ?? null;
    if (link) claimed.add(link.url);
    return { slot, link };
  });

  return { slots, rest: links.filter((entry) => !claimed.has(entry.url)) };
}
