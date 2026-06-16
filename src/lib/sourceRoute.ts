/**
 * Map a memory source type (the `sourceType` carried by RAG chunks / related items)
 * to the app route that best shows it. Most entity pages are list views, so a chip
 * navigates to the relevant section; notes/resources/rollups live under Memory.
 */
const ROUTE_BY_TYPE: Record<string, string> = {
  task: '/tasks',
  project: '/projects',
  goal: '/goals',
  area: '/areas',
  habit: '/habits',
  journal: '/journal',
  note: '/memory',
  rollup: '/memory',
  resource: '/memory',
  weekly_review: '/reflection',
  insight: '/reflection',
  briefing: '/today',
  reminder: '/today',
  tracked_item: '/today',
  budget: '/budget',
  email: '/email',
  whatsapp: '/whatsapp',
  event: '/calendar',
  ambient: '/ambient',
  skill: '/skills',
}

export function sourceRoute(sourceType: string): string {
  return ROUTE_BY_TYPE[sourceType] ?? '/memory'
}
