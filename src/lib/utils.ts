import { useStore, type UseStoreOptions } from "@nanostores/react";
import { type ClassValue, clsx } from "clsx";
import type { Store, StoreValue } from "nanostores";
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useAtom<SomeStore extends Store>(
  store: SomeStore,
  options?: UseStoreOptions<SomeStore>,
): [StoreValue<SomeStore>, Dispatch<SetStateAction<StoreValue<SomeStore>>>] {
  const value = useStore(store, options);
  const setValue = useCallback(
    (update: SetStateAction<StoreValue<SomeStore>>) => {
      if (typeof update === "function") {
        // @ts-ignore
        store.set(update(store.get()));
      } else {
        // @ts-ignore
        store.set(update);
      }
    },
    [store],
  );
  return [value, setValue];
}
