import { Route } from '@angular/router';

export const BUDGET_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./components/plaid-link/plaid-link.component').then(
                m => m.PlaidLinkComponent,
            ),
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./components/budget-dashboard/budget-dashboard.component').then(
                m => m.BudgetDashboardComponent,
            ),
    },
    {
        path: '**',
        redirectTo: '',
    },
];

// If you're using this in your main app.routes.ts, you'd import it like this:
// import { BUDGET_ROUTES } from './budget/budget.routes';
//
// export const routes: Routes = [
//     { path: '', redirectTo: '/budget', pathMatch: 'full' },
//     { path: 'budget', children: BUDGET_ROUTES },
//     { path: '**', redirectTo: '/budget' }
// ];