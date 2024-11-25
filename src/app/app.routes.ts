import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'budget',
    loadChildren: () =>
      import('./feature/budget/budget.routes').then(m => m.BUDGET_ROUTES),
  },
  { // todo
    path: 'pmd-online/*',
    redirectTo: '/pmd-online',
    pathMatch: 'prefix'
  }
];
