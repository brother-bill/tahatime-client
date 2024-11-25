import { Route } from '@angular/router';

export const BUDGET_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./plaid/plaid-link.component').then(
                m => m.PlaidLinkComponent,
            ),
    },
];
