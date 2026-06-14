import { useEffect } from 'react'

/** Set document.title for the lifetime of a page, restoring the default on unmount. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [title])
}
