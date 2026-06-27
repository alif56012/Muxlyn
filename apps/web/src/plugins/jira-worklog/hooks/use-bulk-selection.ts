import { useState, useCallback } from 'react';

export interface BulkSelection {
  selectedIds: Set<string>;
  count: number;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
  isAllSelected: (allIds: string[]) => boolean;
  isIndeterminate: (allIds: string[]) => boolean;
  clear: () => void;
}

export function useBulkSelection(): BulkSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      if (ids.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(ids);
    });
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const isAllSelected = useCallback(
    (allIds: string[]) =>
      allIds.length > 0 && allIds.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  const isIndeterminate = useCallback(
    (allIds: string[]) => {
      const someSelected = allIds.some((id) => selectedIds.has(id));
      return someSelected && !allIds.every((id) => selectedIds.has(id));
    },
    [selectedIds],
  );

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    count: selectedIds.size,
    toggle,
    toggleAll,
    isSelected,
    isAllSelected,
    isIndeterminate,
    clear,
  };
}
