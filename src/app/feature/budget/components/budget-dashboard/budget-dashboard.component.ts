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

interface MonthlyData {
    month: string;
    income: number;
    expenses: number;
    net: number;
    categories: { [key: string]: number };
}

@Component({
    selector: 'app-budget-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="dashboard-container">
            <header class="dashboard-header">
                <h1>Budget Dashboard</h1>
                <div class="header-controls">
                    <button (click)="refreshData()" [disabled]="isLoading" class="refresh-button">
                        {{ isLoading ? 'Loading...' : 'Refresh Data' }}
                    </button>
                </div>
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

            <!-- 6-Month Overview -->
            <section class="overview-section" *ngIf="!isLoading">
                <h2>Last 6 Months Overview</h2>
                <div class="aggregate-summary">
                    <div class="summary-card income">
                        <h3>Total Income</h3>
                        <p>\${{ totalCashFlow?.income | number:'1.2-2' }}</p>
                    </div>
                    <div class="summary-card expenses">
                        <h3>Total Expenses</h3>
                        <p>\${{ totalCashFlow?.expenses | number:'1.2-2' }}</p>
                    </div>
                    <div class="summary-card net" [ngClass]="{'positive': totalCashFlow?.net > 0, 'negative': totalCashFlow?.net < 0}">
                        <h3>Net Cash Flow</h3>
                        <p>\${{ totalCashFlow?.net | number:'1.2-2' }}</p>
                    </div>
                    <div class="summary-card average">
                        <h3>Monthly Average Spending</h3>
                        <p>\${{ monthlyAverageSpending | number:'1.2-2' }}</p>
                    </div>
                </div>
            </section>

            <!-- Monthly Breakdown -->
            <section class="monthly-breakdown" *ngIf="!isLoading">
                <h2>Monthly Breakdown</h2>
                <div class="month-tabs">
                    <button
                        *ngFor="let month of monthlyData"
                        (click)="selectMonth(month)"
                        [ngClass]="{'active': selectedMonth?.month === month.month}"
                        class="month-tab">
                        {{ month.month }}
                    </button>
                </div>

                <div class="month-details" *ngIf="selectedMonth">
                    <div class="cash-flow-summary">
                        <div class="cash-flow-item income">
                            <h3>Income</h3>
                            <p>\${{ selectedMonth.income | number:'1.2-2' }}</p>
                        </div>
                        <div class="cash-flow-item expenses">
                            <h3>Expenses</h3>
                            <p>\${{ selectedMonth.expenses | number:'1.2-2' }}</p>
                        </div>
                        <div class="cash-flow-item net" [ngClass]="{'positive': selectedMonth.net > 0, 'negative': selectedMonth.net < 0}">
                            <h3>Net</h3>
                            <p>\${{ selectedMonth.net | number:'1.2-2' }}</p>
                        </div>
                    </div>

                    <div class="category-breakdown">
                        <h3>Spending by Category</h3>
                        <div class="category-list">
                            <div class="category-row" *ngFor="let category of getCategoriesForMonth(selectedMonth)">
                                <span class="category-name">{{ category.name }}</span>
                                <span class="category-amount">\${{ category.amount | number:'1.2-2' }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Spending Trends Chart -->
            <section class="spending-trends" *ngIf="!isLoading">
                <h2>6-Month Spending Trend</h2>
                <div class="trend-chart">
                    <div class="trend-bar" *ngFor="let month of monthlyData">
                        <div class="bar-group">
                            <div class="bar income" [style.height.px]="getBarHeight(month.income)">
                                <div class="bar-label">\${{ formatMoney(month.income) }}</div>
                            </div>
                            <div class="bar expenses" [style.height.px]="getBarHeight(month.expenses)">
                                <div class="bar-label">\${{ formatMoney(month.expenses) }}</div>
                            </div>
                        </div>
                        <div class="bar-month">{{ month.month }}</div>
                    </div>
                </div>
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-color income"></div>
                        <span>Income</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color expenses"></div>
                        <span>Expenses</span>
                    </div>
                </div>
            </section>

            <!-- Recurring Transactions -->
            <section class="recurring-transactions" *ngIf="!isLoading">
                <h2>Recurring Transactions</h2>
                <div class="recurring-grid">
                    <div class="recurring-column">
                        <h3>Recurring Income</h3>
                        <div class="recurring-item" *ngFor="let item of recurringIncome">
                            <div class="recurring-details">
                                <p class="recurring-name">{{ item.merchantName || item.category }}</p>
                                <p class="recurring-amount income">\${{ item.amount | number:'1.2-2' }}</p>
                            </div>
                            <div class="recurring-info">
                                <span class="frequency">{{ item.frequency }}</span>
                                <span class="next-date">Next: {{ item.nextDate | date }}</span>
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

            <!-- Top Spending Categories (6-month aggregate) -->
            <section class="spending-categories" *ngIf="!isLoading && spendingCategories.length > 0">
                <h2>Top Spending Categories (6 Months)</h2>
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
        .aggregate-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin-bottom: 32px;
        }
        .summary-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 12px 0;
            color: #555;
            font-size: 1.1rem;
        }
        .summary-card p {
            font-size: 1.8rem;
            font-weight: bold;
            margin: 0;
        }
        .summary-card.income {
            border-left: 4px solid #4CAF50;
        }
        .summary-card.expenses {
            border-left: 4px solid #f44336;
        }
        .summary-card.net.positive p {
            color: #2E7D32;
        }
        .summary-card.net.negative p {
            color: #c62828;
        }
        .summary-card.average {
            border-left: 4px solid #2196F3;
        }
        .month-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 24px;
            overflow-x: auto;
            padding-bottom: 8px;
        }
        .month-tab {
            padding: 8px 16px;
            border: 1px solid #ccc;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
        }
        .month-tab.active {
            background: #4CAF50;
            color: white;
            border-color: #4CAF50;
        }
        .cash-flow-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
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
        .category-breakdown h3 {
            color: #555;
            margin-bottom: 12px;
        }
        .category-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .category-row:last-child {
            border-bottom: none;
        }
        .category-name {
            color: #444;
        }
        .category-amount {
            font-weight: bold;
            color: #c62828;
        }
        .trend-chart {
            display: flex;
            align-items: flex-end;
            height: 300px;
            gap: 16px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            overflow-x: auto;
            margin-bottom: 16px;
        }
        .trend-bar {
            flex: 1;
            min-width: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .bar-group {
            display: flex;
            gap: 4px;
            align-items: flex-end;
            margin-bottom: 8px;
        }
        .bar {
            width: 30px;
            position: relative;
            border-radius: 4px 4px 0 0;
            transition: height 0.3s ease;
        }
        .bar.income {
            background: #4CAF50;
        }
        .bar.expenses {
            background: #f44336;
        }
        .bar-label {
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.8rem;
            white-space: nowrap;
            margin-bottom: 4px;
            color: #555;
        }
        .bar-month {
            font-size: 0.9rem;
            color: #666;
        }
        .legend {
            display: flex;
            gap: 24px;
            justify-content: center;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
        }
        .legend-color.income {
            background: #4CAF50;
        }
        .legend-color.expenses {
            background: #f44336;
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
        .empty-state {
            padding: 16px;
            text-align: center;
            color: #666;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .header-controls {
            display: flex;
            align-items: center;
            gap: 16px;
        }
    `]
})
export class BudgetDashboardComponent implements OnInit {
    accounts: any[] = [];
    totalCashFlow: any = { income: 0, expenses: 0, net: 0 };
    monthlyAverageSpending = 0;
    spendingCategories: SpendingCategory[] = [];
    recurringIncome: any[] = [];
    recurringExpenses: any[] = [];
    recentTransactions: any[] = [];
    topCategories: any[] = [];
    monthlyData: MonthlyData[] = [];
    selectedMonth: MonthlyData | null = null;
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

            // Get 6 months of data
            const now = new Date();
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(now.getMonth() - 6);

            const startDate = sixMonthsAgo.toISOString().split('T')[0];
            const endDate = now.toISOString().split('T')[0];

            // Load all transactions for 6 months
            const allTransactions = await this.budgetingService.getTransactionsByDateRange(startDate, endDate);

            // Process monthly breakdown
            this.monthlyData = this.processMonthlyData(allTransactions);
            this.selectedMonth = this.monthlyData[this.monthlyData.length - 1]; // Most recent month

            // Load overall 6-month cash flow
            const cashFlowData = await this.loadCashFlow(startDate, endDate);
            if (cashFlowData) {
                this.totalCashFlow = {
                    income: cashFlowData.totalInflow || 0,
                    expenses: cashFlowData.totalOutflow || 0,
                    net: cashFlowData.netCashFlow || 0
                };
                this.monthlyAverageSpending = this.totalCashFlow.expenses / 6;
            }

            // Load spending by category (6-month aggregate)
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

    processMonthlyData(transactions: any[]): MonthlyData[] {
        const monthlyMap = new Map<string, {
            income: number,
            expenses: number,
            categories: { [key: string]: number }
        }>();

        // Process transactions by month
        transactions.forEach(transaction => {
            const date = new Date(transaction.date);
            const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' });

            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, {
                    income: 0,
                    expenses: 0,
                    categories: {}
                });
            }

            const monthData = monthlyMap.get(monthKey)!;

            if (transaction.amount < 0) {
                monthData.income += Math.abs(transaction.amount);
            } else {
                monthData.expenses += transaction.amount;

                // Categorize expenses
                const category = transaction.category || 'Uncategorized';
                monthData.categories[category] = (monthData.categories[category] || 0) + transaction.amount;
            }
        });

        // Convert to array and calculate net
        const result: MonthlyData[] = [];
        monthlyMap.forEach((data, month) => {
            result.push({
                month,
                income: data.income,
                expenses: data.expenses,
                net: data.income - data.expenses,
                categories: data.categories
            });
        });

        // Fix: Convert to timestamp before subtraction
        return result.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    }

    selectMonth(month: MonthlyData) {
        this.selectedMonth = month;
    }

    getCategoriesForMonth(month: MonthlyData): Array<{ name: string, amount: number }> {
        return Object.entries(month.categories)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount);
    }

    getBarHeight(value: number): number {
        const maxValue = Math.max(...this.monthlyData.map(m => Math.max(m.income, m.expenses)));
        return (value / maxValue) * 250; // Max height of 250px
    }

    formatMoney(value: number): string {
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
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