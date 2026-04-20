/**
 * useSaveEntity — shared save/unsave hook used by EntityDetail, Catalog,
 * and any other surface that lets the user bookmark a catalog entity.
 *
 * Wraps `trpc.grants.toggleSave` with an optimistic update on
 * `trpc.grants.savedList`. Pass `showErrorToast: true` if the caller
 * wants a user-visible toast when the mutation fails (GrantDetail does,
 * Catalog does not — matches pre-R3 behaviour).
 */
import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export function useSaveEntity(options: { showErrorToast?: boolean } = {}) {
  const { showErrorToast = false } = options;
  const { t } = useLanguage();
  const utils = trpc.useUtils();

  const mutation = trpc.grants.toggleSave.useMutation({
    onMutate: async ({ grantId }) => {
      await utils.grants.savedList.cancel();
      const prev = utils.grants.savedList.getData();
      utils.grants.savedList.setData(undefined, (old) => {
        if (!old) return { grantIds: [grantId] };
        const ids = old.grantIds.includes(grantId)
          ? old.grantIds.filter((id) => id !== grantId)
          : [...old.grantIds, grantId];
        return { grantIds: ids };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      const context = ctx as { prev?: { grantIds: string[] } } | undefined;
      if (context?.prev) utils.grants.savedList.setData(undefined, context.prev);
      if (showErrorToast) toast.error(t.grantDetail.failedToSave);
    },
    onSettled: () => {
      utils.grants.savedList.invalidate();
    },
  });

  const toggleSave = useCallback(
    (grantId: string) => mutation.mutate({ grantId }),
    [mutation]
  );

  return { toggleSave, isSaving: mutation.isPending };
}
