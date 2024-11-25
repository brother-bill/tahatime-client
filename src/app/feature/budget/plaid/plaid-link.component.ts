import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgxPlaidLinkModule } from 'ngx-plaid-link';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-plaid-link',
    standalone: true,
    imports: [NgxPlaidLinkModule, CommonModule],
    templateUrl: './plaid-link.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // styleUrl: ''
})
export class PlaidLinkComponent implements OnInit {
    public linkToken = '';
    public accessToken = '';
    public loading$ = new BehaviorSubject<boolean>(true);
    public plaidEnv = environment.plaidEnv;

    constructor(private http: HttpClient) {
        console.log('environment', environment);
    }

    ngOnInit() {
        const userId = environment.plaidUserId;
        this.http
            .get<{ linkToken: string }>(
                `${environment.apiBaseUrl}/plaid/link-token/${userId}`,
            )
            .subscribe({
                next: response => {
                    this.linkToken = response.linkToken;
                },
                error: error => {
                    console.error('Error fetching link token:', error);
                },
                complete: () => {
                    this.loading$.next(false);
                },
            });
    }

    onSuccess(event: any) {
        const publicToken = event.token;
        console.log('onSuccess', publicToken);
        this.http
            .post<{ accessToken: string }>(
                `${environment.apiBaseUrl}/plaid/exchange-token`,
                {
                    publicToken,
                },
            )
            .subscribe({
                next: response => {
                    this.accessToken = response.accessToken;
                    // Store the accessToken securely (e.g., in a secure storage)
                },
                error: error => {
                    console.error('Error exchanging public token:', error);
                },
            });
    }

    onExit(event: any) {
        console.log('Plaid Link exited:', event);
    }

    onLoad(event: any) {
        console.log('Plaid Link loaded:', event);
    }

    onEvent(event: any) {
        console.log('Plaid Link event:', event);
    }

    getTransactions() {
        this.http
            .get<{ transactions: any }>(
                `${environment.apiBaseUrl}/plaid/transactions/${this.accessToken}`,
            )
            .subscribe({
                next: response => {
                    console.log('transactions', response.transactions);
                    // Handle the transactions data
                },
                error: error => {
                    console.error('Error fetching transactions:', error);
                },
            });
    }

    public onClick($event: any) {
        console.log('Button clicked', $event);
    }
}
