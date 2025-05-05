import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BudgetingService } from '../../services/budgeting.service';
import { environment } from '../../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface SpendingCategory {
    name: string;
    amount: number;
    budget: number;
    percentage: number;
    color: string;
}

interface ChartData {
    labels: string[];
    data: number[];
    backgroundColor: string[];
}

@Component({
    selector: 'app-budget-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="dashboard-container">
            <header class="dashboard-header">
                <h1>Budget Dashboard</h1>
                <button (click)="refreshData()" [disabled]="isLoading" class="refresh-button">
                    {{ isLoading ? 'Loading...' : 'Refresh Data' }}
                </button>
            </header>

            <!-- Account Overview -->
            <section class="accounts-overview" *ngIf="!isLoading">
                <h2>Accounts</h2>
                <div class="account-grid">
                    <div class="account-card" *ngFor="let account of accounts">
                        <h3>{{ account.name }}</h3>
                        <p class="account-type">{{ account.subtype }}</p>
                        <p class="balance">\${{ account.currentBalance | number:'1.2-2' }}</p>
                        <p class="available" *ngIf="account.availableBalance !== undefined && account.availableBalance !== null">
                            Available: \${{ account.availableBalance | number:'1.2-2' }}
                        </p>
                    </div>
                </div>
            </section>

            <!-- Cash Flow Summary -->
            <section class="cash-flow" *ngIf="!isLoading">
                <h2>Cash Flow ({{ currentMonth }})</h2>
                <div class="cash-flow-summary">
                    <div class="cash-flow-item income">
                        <h3>Income</h3>
                        <p>\${{ cashFlow?.income | number:'1.2-2' }}</p>
                    </div>
                    <div class="cash-flow-item expenses">
                        <h3>Expenses</h3>
                        <p>\${{ cashFlow?.expenses | number:'1.2-2' }}</p>
                    </div>
                    <div class="cash-flow-item net" [ngClass]="{'positive': cashFlow?.net > 0, 'negative': cashFlow?.net < 0}">
                        <h3>Net</h3>
                        <p>\${{ cashFlow?.net | number:'1.2-2' }}</p>
                    </div>
                </div>
            </section>

            <!-- Spending by Category -->
            <section class="spending-categories" *ngIf="!isLoading && spendingCategories.length > 0">
                <h2>Spending by Category</h2>
                <div class="category-list">
                    <div class="category-item" *ngFor="let category of spendingCategories">
                        <div class="category-header">
                            <span class="category-name">{{ category.name }}</span>
                            <span class="category-amount">\${{ category.amount | number:'1.2-2' }}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress" [style.width.%]="category.percentage" [style.background-color]="category.color"></div>
                        </div>
                        <div class="category-details">
                            <span>{{ category.percentage | number:'1.0-0' }}% of budget</span>
                            <span>\${{ category.budget - category.amount | number:'1.2-2' }} remaining</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Recurring Transactions -->
            <section class="recurring-transactions" *ngIf="!isLoading">
                <h2>Recurring Transactions</h2>
                <div class="recurring-grid">
                    <div class="recurring-column">
                        <h3>Recurring Income</h3>
                        <div class="recurring-item" *ngIf="recurringIncome.length > 0">
                            <div class="recurring-details" *ngFor="let item of recurringIncome">
                                <p class="recurring-name">{{ item.merchantName || item.category }}</p>
                                <p class="recurring-amount income">\${{ item.amount | number:'1.2-2' }}</p>
                            </div>
                            <div class="recurring-info">
                                <span class="frequency">{{ recurringIncome[0].frequency }}</span>
                                <span class="next-date">Next: {{ recurringIncome[0].nextDate | date }}</span>
                            </div>
                        </div>
                        <div *ngIf="recurringIncome.length === 0" class="empty-state">
                            No recurring income found
                        </div>
                    </div>
                    <div class="recurring-column">
                        <h3>Recurring Expenses</h3>
                        <div class="recurring-item" *ngFor="let item of recurringExpenses">
                            <div class="recurring-details">
                                <p class="recurring-name">{{ item.merchantName || item.category }}</p>
                                <p class="recurring-amount expense">\${{ item.amount | number:'1.2-2' }}</p>
                            </div>
                            <div class="recurring-info">
                                <span class="frequency">{{ item.frequency }}</span>
                                <span class="next-date">Next: {{ item.nextDate | date }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Recent Transactions -->
            <section class="recent-transactions" *ngIf="!isLoading">
                <h2>Recent Transactions</h2>
                <div class="transaction-list">
                    <div class="transaction-item" *ngFor="let transaction of recentTransactions">
                        <div class="transaction-details">
                            <p class="transaction-name">{{ transaction.description }}</p>
                            <p class="transaction-date">{{ transaction.date | date }}</p>
                        </div>
                        <div class="transaction-amount" [ngClass]="{'positive': transaction.amount < 0, 'negative': transaction.amount > 0}">
                            \${{ Math.abs(transaction.amount) | number:'1.2-2' }}
                        </div>
                    </div>
                </div>
            </section>

            <!-- Budget Progress Charts -->
            <section class="charts" *ngIf="!isLoading && topCategories.length > 0">
                <h2>Budget Progress</h2>
                <div class="chart-container">
                    <div class="bar-chart" *ngFor="let category of topCategories">
                        <div class="bar" [style.height.%]="category.percentage" [style.background-color]="category.color">
                            <div class="bar-label">{{ category.name }}</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `,
    styles: [`
        .dashboard-container {
            padding: 24px;
            max-width: 1400px;
            margin: 0 auto;
        }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
        }

        .dashboard-header h1 {
            font-size: 2.5rem;
            color: #333;
            margin: 0;
        }

        .refresh-button {
            padding: 8px 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
        }

        .refresh-button:disabled {
            background-color: #cccccc;
            cursor: not-allowed;
        }

        section {
            background: white;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        h2 {
            color: #333;
            margin-bottom: 16px;
            font-size: 1.75rem;
        }

        .account-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
        }

        .account-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
        }

        .account-card h3 {
            margin: 0 0 8px 0;
            color: #555;
        }

        .account-type {
            color: #666;
            font-size: 0.9rem;
            text-transform: capitalize;
        }

        .balance {
            font-size: 1.5rem;
            font-weight: bold;
            color: #2E7D32;
            margin: 8px 0;
        }

        .available {
            color: #666;
            font-size: 0.9rem;
        }

        .cash-flow-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .cash-flow-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }

        .cash-flow-item h3 {
            margin: 0 0 8px 0;
            color: #555;
        }

        .cash-flow-item p {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0;
        }

        .income {
            border-left: 4px solid #4CAF50;
        }

        .expenses {
            border-left: 4px solid #f44336;
        }

        .net.positive {
            border-left: 4px solid #4CAF50;
            color: #2E7D32;
        }

        .net.positive p {
            color: #2E7D32;
        }

        .net.negative {
            border-left: 4px solid #f44336;
            color: #c62828;
        }

        .net.negative p {
            color: #c62828;
        }

        .category-list {
            display: grid;
            gap: 16px;
        }

        .category-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 16px;
        }

        .category-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .category-name {
            font-weight: bold;
            color: #555;
        }

        .category-amount {
            font-weight: bold;
            color: #333;
        }

        .progress-bar {
            height: 10px;
            background: #e0e0e0;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 8px;
        }

        .progress {
            height: 100%;
            transition: width 0.5s ease-in-out;
        }

        .category-details {
            display: flex;
            justify-content: space-between;
            font-size: 0.9rem;
            color: #666;
        }

        .recurring-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }

        @media (max-width: 768px) {
            .recurring-grid {
                grid-template-columns: 1fr;
            }
        }

        .recurring-column h3 {
            color: #555;
            margin-bottom: 16px;
        }

        .recurring-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .recurring-details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .recurring-name {
            font-weight: bold;
            margin: 0;
        }

        .recurring-amount.income {
            color: #2E7D32;
            font-weight: bold;
        }

        .recurring-amount.expense {
            color: #c62828;
            font-weight: bold;
        }

        .recurring-info {
            display: flex;
            gap: 12px;
            font-size: 0.9rem;
            color: #666;
        }

        .frequency {
            text-transform: capitalize;
        }

        .transaction-list {
            display: grid;
            gap: 12px;
        }

        .transaction-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 12px;
        }

        .transaction-details {
            min-width: 0;
        }

        .transaction-name {
            font-weight: bold;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 300px;
        }

        .transaction-date {
            font-size: 0.9rem;
            color: #666;
            margin: 4px 0 0 0;
        }

        .transaction-amount {
            font-weight: bold;
            white-space: nowrap;
        }

        .transaction-amount.positive {
            color: #2E7D32;
        }

        .transaction-amount.negative {
            color: #c62828;
        }

        .chart-container {
            display: flex;
            align-items: flex-end;
            height: 300px;
            gap: 24px;
            padding: 16px;
            overflow-x: auto;
        }

        .bar-chart {
            flex: 1;
            min-width: 60px;
            position: relative;
        }

        .bar {
            width: 100%;
            background: #4CAF50;
            border-radius: 4px 4px 0 0;
            position: relative;
            transform-origin: bottom;
            transition: height 0.5s ease-in-out;
        }

        .bar-label {
            position: absolute;
            bottom: -24px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.9rem;
            white-space: nowrap;
            color: #555;
        }

        .Math {
            display: none;
        }

        .empty-state {
            padding: 16px;
            text-align: center;
            color: #666;
            background: #f8f9fa;
            border-radius: 8px;
        }
    `]
})
export class BudgetDashboardComponent implements OnInit {
    accounts: any[] = [];
    cashFlow: any = { income: 0, expenses: 0, net: 0 };
    spendingCategories: SpendingCategory[] = [];
    recurringIncome: any[] = [];
    recurringExpenses: any[] = [];
    recentTransactions: any[] = [];
    topCategories: any[] = [];
    currentMonth = '';
    isLoading = true;
    Math = Math;

    private accessToken = ''; // This should be stored securely in a real app

    constructor(
        private http: HttpClient,
        private budgetingService: BudgetingService
    ) {}

    ngOnInit() {
        this.currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        this.loadDashboardData();
    }

    async loadDashboardData() {
        try {
            this.isLoading = true;

            // Get access token from localStorage
            const accessToken = localStorage.getItem('plaid_access_token');
            if (!accessToken) {
                console.error('No access token found');
                return;
            }

            this.accessToken = accessToken;

            // Sync latest transactions first
            await this.syncTransactions();

            // Load account balances
            await this.loadAccountBalances();

            // Get current month's cash flow
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const startDate = firstDay.toISOString().split('T')[0];
            const endDate = lastDay.toISOString().split('T')[0];

            // Load cash flow data
            const cashFlowData = await this.loadCashFlow(startDate, endDate);
            if (cashFlowData) {
                this.cashFlow = {
                    income: cashFlowData.totalInflow || 0,
                    expenses: cashFlowData.totalOutflow || 0,
                    net: cashFlowData.netCashFlow || 0
                };
            }

            // Load spending by category
            this.spendingCategories = await this.loadSpendingCategories(startDate, endDate);

            // Load recurring transactions
            await this.loadRecurringTransactions();

            // Load recent transactions
            this.recentTransactions = await this.loadRecentTransactions();

            // Prepare chart data
            this.topCategories = this.prepareChartData();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async syncTransactions() {
        try {
            const cursor = this.budgetingService.getSyncCursor();
            const response = await firstValueFrom(
                this.http.post<any>(`${environment.apiBaseUrl}/plaid/transactions/sync`, {
                    accessToken: this.accessToken,
                    cursor: cursor || undefined
                })
            );

            const { syncResult } = response;

            // Update local database with new transactions
            if (syncResult.added && syncResult.added.length > 0) {
                await this.budgetingService.updateTransactions(syncResult.added);
            }

            // Update sync cursor
            if (syncResult.nextCursor) {
                this.budgetingService.updateSyncCursor(syncResult.nextCursor);
            }
        } catch (error) {
            console.error('Error syncing transactions:', error);
        }
    }

    async loadAccountBalances() {
        try {
            const response = await firstValueFrom(
                this.http.get<any>(`${environment.apiBaseUrl}/plaid/balances/${this.accessToken}`)
            );

            this.accounts = response.balances.accounts.map((account: any) => ({
                id: account.account_id,
                name: account.name,
                type: account.type,
                subtype: account.subtype,
                currentBalance: account.balances.current,
                availableBalance: account.balances.available,
                lastUpdated: new Date().toISOString()
            }));

            // Update local database
            await this.budgetingService.updateAccounts(this.accounts);
        } catch (error) {
            console.error('Error loading account balances:', error);
        }
    }

    async loadCashFlow(startDate: string, endDate: string) {
        try {
            const response = await firstValueFrom(
                this.http.get<any>(`${environment.apiBaseUrl}/plaid/cash-flow/${this.accessToken}`, {
                    params: { startDate, endDate }
                })
            );

            return {
                totalInflow: response.cashFlow.totalInflow || 0,
                totalOutflow: response.cashFlow.totalOutflow || 0,
                netCashFlow: response.cashFlow.netCashFlow || 0
            };
        } catch (error) {
            console.error('Error loading cash flow:', error);
            return null;
        }
    }

    async loadSpendingCategories(startDate: string, endDate: string): Promise<SpendingCategory[]> {
        try {
            const spending = await this.budgetingService.getSpendingByCategory(startDate, endDate);

            // Mock budget for each category (you can make this configurable)
            const mockBudget: { [key: string]: number } = {
                'FOOD_AND_DRINK': 500,
                'RENT_AND_UTILITIES': 1500,
                'TRANSPORTATION': 300,
                'SHOPPING': 400,
                'ENTERTAINMENT': 200,
                'GENERAL_MERCHANDISE': 300,
                'TRAVEL': 200,
                'DEFAULT': 200,
            };

            const colors = [
                '#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0',
                '#009688', '#795548', '#607D8B', '#FFC107', '#E91E63'
            ];

            const categories = Object.entries(spending)
                .map(([name, amount], index) => {
                    const budget = mockBudget[name] || mockBudget['DEFAULT'];
                    const percentage = Math.min(100, (amount / budget) * 100);
                    return {
                        name: name.replace(/_/g, ' ').toUpperCase(),
                        amount,
                        budget,
                        percentage,
                        color: colors[index % colors.length]
                    };
                })
                .sort((a, b) => b.amount - a.amount);

            return categories.filter(cat => cat.amount > 0);
        } catch (error) {
            console.error('Error loading spending categories:', error);
            return [];
        }
    }

    async loadRecurringTransactions() {
        try {
            const response = await firstValueFrom(
                this.http.get<any>(`${environment.apiBaseUrl}/plaid/recurring/${this.accessToken}`)
            );

            const { recurringData } = response;

            // Update local database
            await this.budgetingService.updateRecurringTransactions(
                recurringData.inflows || [],
                recurringData.outflows || []
            );

            this.recurringIncome = (recurringData.inflows || [])
                .filter((item: any) => item.is_active)
                .map((item: any) => ({
                    merchantName: item.merchant_name || '',
                    category: item.description || '',
                    amount: Math.abs(item.average_amount.amount) || 0,
                    frequency: item.frequency || '',
                    nextDate: item.predicted_next_date || ''
                }));

            this.recurringExpenses = (recurringData.outflows || [])
                .filter((item: any) => item.is_active)
                .map((item: any) => ({
                    merchantName: item.merchant_name || '',
                    category: item.description || '',
                    amount: item.average_amount.amount || 0,
                    frequency: item.frequency || '',
                    nextDate: item.predicted_next_date || ''
                }));
        } catch (error) {
            console.error('Error loading recurring transactions:', error);
        }
    }

    async loadRecentTransactions() {
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const startDateStr = startDate.toISOString().split('T')[0];

            const transactions = await this.budgetingService.getTransactionsByDateRange(
                startDateStr,
                endDate
            );

            return transactions.slice(0, 10); // Show last 10 transactions
        } catch (error) {
            console.error('Error loading recent transactions:', error);
            return [];
        }
    }

    prepareChartData() {
        return this.spendingCategories
            .slice(0, 5) // Top 5 categories
            .map(category => ({
                name: category.name,
                percentage: category.percentage,
                color: category.color
            }));
    }

    refreshData() {
        this.loadDashboardData();
    }
}