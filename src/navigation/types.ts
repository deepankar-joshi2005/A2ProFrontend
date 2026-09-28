export type Tab = 'home' | 'profile';

export type Route =
  | { name: 'tab'; tab: Tab }
  | { name: 'login' }
  | { name: 'signup' };

export interface Nav {
  push: (route: Route) => void;
  pop: () => void;
  replace: (route: Route) => void;
  resetToTab: (tab: Tab) => void;
}

export function routeTab(route: Route): Tab | null {
  if (route.name === 'tab') return route.tab;
  return null;
}