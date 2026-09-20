import {
  LayoutDashboard,
  FileCheck,
  ShieldAlert,
  Flag,
  AlertTriangle,
  FileText,
  Clock,
  Info,
  ShieldOff,
  History,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, List, SectionHead, Label, Notice } from './surface';
import { Masthead, QueueRow, Panel, Stream, Dial } from './blocks';

/* ───────────────────────────────────────────────────────────────────────────
   The moderation desk

   One question: is anything waiting on a person? The masthead answers it with
   a dial, the queues say what and where, and the chronology shows what the
   desk has already settled.
   ─────────────────────────────────────────────────────────────────────────── */

const QUEUE_ICONS: Record<string, LucideIcon> = {
  '/portal/claims': FileCheck,
  '/portal/verification': ShieldAlert,
  '/portal/reports': Flag,
  '/portal/claims?filter=escalated': AlertTriangle,
  '/portal/creators?filter=unpublished': FileText,
};

export type PortalWorkItem = { href: string; label: string; count: number; note: string };
export type StreamEntry = { id: string; when: string; title: string; detail: string };

export function PortalOverview({
  greeting,
  firstName,
  work,
  activity,
}: {
  greeting: string;
  firstName: string;
  work: PortalWorkItem[];
  activity: StreamEntry[];
}) {
  const outstanding = work.reduce((sum, item) => sum + item.count, 0);
  const clear = work.filter((item) => item.count === 0).length;
  // Queues that need someone lead; cleared ones fall to the bottom rather than
  // being hidden, so the desk can still see that they are clear.
  const ordered = [...work].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-6">
      <Masthead
        eyebrow="Moderation"
        eyebrowIcon={LayoutDashboard}
        title={`${greeting}, ${firstName}.`}
        statement={
          outstanding === 0
            ? 'Your queues are clear. Nothing is waiting on a person.'
            : `${outstanding} item${outstanding === 1 ? '' : 's'} need a decision. Everything else is settled.`
        }
        figure={{ value: outstanding, caption: 'awaiting you' }}
        aside={
          work.length > 0 ? (
            <Dial
              value={clear}
              total={work.length}
              caption="queues clear"
              tone={clear === work.length ? 'positive' : 'accent'}
            />
          ) : undefined
        }
      >
        {outstanding === 0 ? (
          <span className="text-[0.8125rem] text-[color:var(--text-quiet)]">
            PALMA will write to you when something new arrives.
          </span>
        ) : null}
      </Masthead>

      <div data-lift="section">
        {outstanding > 0 ? (
          <Notice icon={Clock}>
            Each decision is recorded against the thing it concerns, with your name on it.
          </Notice>
        ) : (
          <Notice icon={CheckCircle2} tone="positive">
            Every queue on this desk is clear.
          </Notice>
        )}
      </div>

      <section data-lift="section">
        <SectionHead
          icon={Inbox}
          title="Needs attention"
          action={<Label>{work.length} queues</Label>}
        />
        <List className="glow" data-lift="list">
          {ordered.map((item) => (
            <QueueRow
              key={item.href}
              href={item.href}
              icon={QUEUE_ICONS[item.href] ?? FileText}
              label={item.label}
              note={item.note}
              count={item.count}
            />
          ))}
        </List>
      </section>

      <div className="grid gap-5 xl:grid-cols-12">
        <section className="min-w-0 xl:col-span-7" data-lift="section">
          <SectionHead icon={History} title="Recently recorded" />
          <Card className="glow">
            {activity.length === 0 ? (
              <p className="py-5 text-center text-sm text-[color:var(--text-quiet)]">
                Nothing has been recorded yet.
              </p>
            ) : (
              <Stream entries={activity} />
            )}
          </Card>
        </section>

        <aside className="flex min-w-0 flex-col gap-3.5 xl:col-span-5">
          <Panel icon={Info} title="What this desk decides">
            Whether a person should control a PALMA record, whether a creator has been verified as
            an adult, and whether something reported breaches the content policy.
          </Panel>

          <Panel icon={ShieldOff} title="What it never decides" tone="alert">
            An outcome. Selection, revocation and score correction are administrator actions.
            Moderation maintains the accuracy of the record and never its results.
          </Panel>
        </aside>
      </div>
    </div>
  );
}
