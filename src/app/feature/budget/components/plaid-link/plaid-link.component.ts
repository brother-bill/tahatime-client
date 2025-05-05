import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxPlaidLinkModule } from 'ngx-plaid-link';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Router } from '@angular/router';
import { BudgetingService } from '../../services/budgeting.service';

@Component({
    selector: 'app-plaid-link',
    standalone: true,
    imports: [NgxPlaidLinkModule, CommonModule],
    template: `
        <div class="plaid-link-container">
            <div class="link-header">
                <h1>Connect Your Bank Account</h1>
                <p class="subtitle">Securely link your bank accounts to start budgeting</p>
            </div>

            <div class="link-content" *ngIf="(loading$ | async) === false">
                <button
                    class="connect-button"
                    ngxPlaidLink
                    [env]="plaidEnv"
                    [token]="linkToken"
                    (Success)="onSuccess($event)"
                    (Exit)="onExit($event)"
                    (Load)="onLoad($event)"
                    (Event)="onEvent($event)"
                    (Click)="onClick($event)">
                    <span class="button-icon">🔗</span>
                    Link Your Bank Account
                </button>

                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">🔒</div>
                        <h3>Secure Connection</h3>
                        <p>Bank-level security and encryption</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">⚡</div>
                        <h3>Real-time Updates</h3>
                        <p>Automatic transaction syncing</p>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">📊</div>
                        <h3>Smart Budgeting</h3>
                        <p>AI-powered spending insights</p>
                    </div>
                </div>
            </div>

            <div class="loading-state" *ngIf="(loading$ | async) === true">
                <div class="spinner"></div>
                <p>Preparing connection...</p>
            </div>

            <div class="error-state" *ngIf="errorMessage">
                <div class="error-icon">⚠️</div>
                <p class="error-text">{{ errorMessage }}</p>
                <button (click)="retryConnection()" class="retry-button">Try Again</button>
            </div>
        </div>
    `,
    styles: [`
        .plaid-link-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
            text-align: center;
        }

        .link-header {
            margin-bottom: 40px;
        }

        .link-header h1 {
            font-size: 2.5rem;
            color: #333;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 1.1rem;
        }

        .connect-button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 16px 32px;
            font-size: 1.1rem;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            transition: background-color 0.3s ease;
            margin-bottom: 40px;
        }

        .connect-button:hover {
            background-color: #45a049;
        }

        .button-icon {
            font-size: 1.3rem;
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 24px;
            margin-top: 40px;
        }

        .feature {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }

        .feature-icon {
            font-size: 2.5rem;
            margin-bottom: 12px;
        }

        .feature h3 {
            color: #333;
            margin-bottom: 8px;
            font-size: 1.1rem;
        }

        .feature p {
            color: #666;
            font-size: 0.9rem;
            margin: 0;
        }

        .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            color: #666;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .error-state {
            background: #fff3f3;
            border: 1px solid #ffcdd2;
            border-radius: 8px;
            padding: 24px;
            margin-top: 24px;
        }

        .error-icon {
            font-size: 2rem;
            margin-bottom: 12px;
        }

        .error-text {
            color: #c62828;
            margin-bottom: 16px;
        }

        .retry-button {
            background: none;
            border: 2px solid #c62828;
            color: #c62828;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
        }

        .retry-button:hover {
            background: #c62828;
            color: white;
        }
    `],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaidLinkComponent implements OnInit {
    public linkToken = '';
    public accessToken = '';
    public loading$ = new BehaviorSubject<boolean>(true);
    public plaidEnv = environment.plaidEnv;
    public errorMessage = '';

    constructor(
        private http: HttpClient,
        private router: Router,
        private budgetingService: BudgetingService
    ) {}

    ngOnInit() {
        this.setupLinkToken();
    }

    setupLinkToken() {
        if (!environment.plaidUserId) {
            console.error('Plaid userId is required');
            return;
        }

        const userId = environment.plaidUserId;
        this.loading$.next(true);
        this.errorMessage = '';

        this.http
            .get<{ linkToken: string }>(
                `${environment.apiBaseUrl}/plaid/link-token/${userId}`,
            )
            .subscribe({
                next: response => {
                    console.log('Link token received:', response); // Debug log
                    if (response.linkToken) {
                        this.linkToken = response.linkToken;
                        this.loading$.next(false);
                    } else {
                        this.errorMessage = 'No link token received';
                        this.loading$.next(false);
                    }
                },
                error: error => {
                    console.error('Error fetching link token:', error);
                    this.errorMessage = 'Failed to initialize bank connection. Please check if the backend server is running.';
                    this.loading$.next(false);
                },
            });
    }

    onSuccess(event: any) {
        const publicToken = event.token;
        console.log('Plaid Link successful:', publicToken);

        this.loading$.next(true);
        this.errorMessage = '';

        this.http
            .post<{ accessToken: string }>(
                `${environment.apiBaseUrl}/plaid/exchange-token`,
                {
                    publicToken,
                },
            )
            .subscribe({
                next: async response => {
                    this.accessToken = response.accessToken;

                    // Store the access token securely
                    localStorage.setItem('plaid_access_token', this.accessToken);

                    try {
                        // Initial sync to get accounts and recent transactions
                        const syncResponse = await this.http.post<any>(
                            `${environment.apiBaseUrl}/plaid/transactions/sync`,
                            { accessToken: this.accessToken }
                        ).toPromise();

                        if (syncResponse?.syncResult) {
                            // Update RxDB with initial data
                            await this.budgetingService.updateTransactions(syncResponse.syncResult.added);

                            // Update accounts
                            if (syncResponse.syncResult.accounts) {
                                const accounts = syncResponse.syncResult.accounts.map((account: any) => ({
                                    id: account.account_id,
                                    name: account.name,
                                    type: account.type,
                                    subtype: account.subtype,
                                    currentBalance: account.balances.current,
                                    availableBalance: account.balances.available,
                                    lastUpdated: new Date().toISOString()
                                }));
                                await this.budgetingService.updateAccounts(accounts);
                            }

                            // Save sync cursor
                            if (syncResponse.syncResult.nextCursor) {
                                this.budgetingService.updateSyncCursor(syncResponse.syncResult.nextCursor);
                            }
                        }

                        // Navigate to budget dashboard
                        this.router.navigate(['/budget/dashboard']);
                    } catch (error) {
                        console.error('Error initializing budget data:', error);
                        this.errorMessage = 'Failed to initialize budget data. Redirecting to dashboard...';

                        // Still navigate to dashboard after a short delay
                        setTimeout(() => {
                            this.router.navigate(['/budget/dashboard']);
                        }, 3000);
                    } finally {
                        this.loading$.next(false);
                    }
                },
                error: error => {
                    console.error('Error exchanging public token:', error);
                    this.errorMessage = 'Failed to complete bank connection. Please try again.';
                    this.loading$.next(false);
                },
            });
    }

    onExit(event: any) {
        console.log('Plaid Link exited:', event);
        if (event.error) {
            this.errorMessage = event.error.error_message || 'Connection cancelled.';
        }
    }

    onLoad(event: any) {
        console.log('Plaid Link loaded:', event);
    }

    onEvent(event: any) {
        console.log('Plaid Link event:', event);
    }

    onClick($event: any) {
        console.log('Button clicked', $event);
    }

    retryConnection() {
        this.setupLinkToken();
    }
}