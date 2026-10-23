import { useEffect, useState } from "react";
import { readJobAccessRecords } from "../api/tokens";
import { LOCAL_RECORDS_CHANGED, TASK_STORAGE_KEYS } from "../storage";

/** One notification contract for submission, recovery and local-record clearing. */
export function useJobAccessRecords() {
  const [records, setRecords] = useState(readJobAccessRecords);
  useEffect(() => {
    const refresh = () => setRecords(readJobAccessRecords());
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || (TASK_STORAGE_KEYS as readonly string[]).includes(event.key)) refresh();
    };
    window.addEventListener(LOCAL_RECORDS_CHANGED, refresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    refresh();
    return () => {
      window.removeEventListener(LOCAL_RECORDS_CHANGED, refresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return records;
}
