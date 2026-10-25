"use client";

import { Panel, EmptyState } from "@/components/panel";
import { usePolling } from "@/components/use-polling";
import type { TaskDto, TasksDto } from "@/lib/dto";
import { formatDay } from "@/lib/format";

const PRIORITY_DOT = { High: "bg-red-500", Normal: "bg-zinc-400", Low: "bg-zinc-300 dark:bg-zinc-600" } as const;

/** The signed-in user's own Salesforce tasks. Loads separately from Reception: it is per user, the rest is per building. */
export function TasksPanel({ locationSlug }: { locationSlug: string }) {
  const { data, error } = usePolling<TasksDto>(`/api/tasks?location=${locationSlug}`, 60_000);
  const overdue = data?.tasks.filter((t) => t.overdue).length ?? 0;

  return (
    <Panel title="My today & overdue tasks" aside={data && `${overdue} overdue · ${data.tasks.length - overdue} today`}>
      {error && (
        <p role="alert" className="mb-2 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Couldn&apos;t refresh tasks ({error}). {data ? "Showing the last list." : ""}
        </p>
      )}
      {!data ? (
        !error && <EmptyState>Loading…</EmptyState>
      ) : data.tasks.length === 0 ? (
        <EmptyState>Nothing due today — you&apos;re all caught up</EmptyState>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {data.tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TaskRow({ task }: { task: TaskDto }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} title={`${task.priority} priority`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{task.subject}</p>
        <p className="text-xs text-zinc-500">
          {task.related && `${task.related} · `}
          {task.overdue ? <span className="font-medium text-red-600 dark:text-red-400">Overdue since {formatDay(task.dueDate)}</span> : "Due today"}
        </p>
      </div>
      {task.url && (
        <a
          href={task.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open task "${task.subject}" in Salesforce`}
          title="Open in Salesforce"
          className="shrink-0 rounded border border-zinc-300 px-2 py-0.5 text-xs hover:border-zinc-500 dark:border-zinc-700"
        >
          Open ↗
        </a>
      )}
    </li>
  );
}
