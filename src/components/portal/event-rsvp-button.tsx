import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { setRsvp } from "@/lib/forum.functions";
import { cn } from "@/lib/utils";

export function EventRsvpButton({
  postId,
  count,
  mine,
}: {
  postId: string;
  count: number;
  mine: boolean;
}) {
  const qc = useQueryClient();
  const fn = useServerFn(setRsvp);
  const mutation = useMutation({
    mutationFn: (going: boolean) => fn({ data: { postId, going } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rsvp-summary"] }),
  });

  return (
    <button
      onClick={() => mutation.mutate(!mine)}
      disabled={mutation.isPending}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-60",
        mine
          ? "bg-brand-green text-brand-paper"
          : "bg-white text-brand-ink/70 ring-1 ring-brand-ink/15 hover:ring-brand-green/40",
      )}
    >
      <Users className="w-3.5 h-3.5" />
      {mine ? "Going" : "I'm going"}
      {count > 0 && <span className="opacity-70">· {count}</span>}
    </button>
  );
}
