import { Injectable, isDevMode } from '@angular/core';
import { createRxDatabase, RxDatabase, addRxPlugin, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { Transaction as PlaidTransaction } from 'plaid';

interface Transaction {
    id: string;
    accountId: string;
    amount: number;
    date: string;
    description: string;
    category: string;
    merchantName?: string;
    pending: boolean;
    paymentChannel: string;
    originalData: PlaidTransaction;
}

interface Account {
    id: string;
    name: string;
    type: string;
    subtype: string;
    currentBalance: number;
    availableBalance?: number;
    lastUpdated: string;
}

interface Budget {
    id: string;
    name: string;
    categories: BudgetCategory[];
    timeframe: 'weekly' | 'monthly' | 'yearly';
    active: boolean;
}

interface BudgetCategory {
    category: string;
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
}

interface RecurringTransaction {
    id: string;
    frequency: string;
    amount: number;
    category: string;
    merchantName?: string;
    nextDate: string;
    isActive: boolean;
    type: 'income' | 'expense';
}

interface DatabaseCollections {
    transactions: RxCollection<Transaction>;
    accounts: RxCollection<Account>;
    budgets: RxCollection<Budget>;
    recurringTransactions: RxCollection<RecurringTransaction>;
}

type MyDatabase = RxDatabase<DatabaseCollections>;

@Injectable({
    providedIn: 'root'
})
export class BudgetingService {
    private database: MyDatabase | null = null;
    private readonly DB_NAME = 'budgeting_db';
    private dbReady$ = new BehaviorSubject<boolean>(false);
    private syncCursor = '';

    constructor() {
        // Set up plugins immediately
        if (isDevMode()) {
            import('rxdb/plugins/dev-mode').then(module => {
                module.disableWarnings();
                addRxPlugin(module.RxDBDevModePlugin);
            });
        }
        addRxPlugin(RxDBMigrationSchemaPlugin);
        this.initDatabase();
    }

// In budgeting.service.ts
    async initDatabase() {
        try {
            this.database = await createRxDatabase<DatabaseCollections>({
                name: this.DB_NAME,
                storage: wrappedValidateAjvStorage({
                    storage: getRxStorageDexie(),
                }),
            });

            await this.database.addCollections({
                transactions: {
                    schema: {
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: { type: 'string', maxLength: 100 },
                            accountId: { type: 'string' },
                            amount: { type: 'number' },
                            date: { type: 'string' }, // Remove format: 'date'
                            description: { type: 'string' },
                            category: { type: 'string' },
                            merchantName: { type: 'string' },
                            pending: { type: 'boolean' },
                            paymentChannel: { type: 'string' },
                            originalData: { type: 'object' },
                        }
                    },
                    autoMigrate: false,
                },
                accounts: {
                    schema: {
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: { type: 'string', maxLength: 100 },
                            name: { type: 'string' },
                            type: { type: 'string' },
                            subtype: { type: 'string' },
                            currentBalance: { type: 'number' },
                            availableBalance: { type: 'number' },
                            lastUpdated: { type: 'string' }, // Remove format: 'date-time'
                        }
                    },
                    autoMigrate: false,
                },
                budgets: {
                    schema: {
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: { type: 'string', maxLength: 100 },
                            name: { type: 'string' },
                            categories: { type: 'array', items: { type: 'object' } },
                            timeframe: { type: 'string', enum: ['weekly', 'monthly', 'yearly'] },
                            active: { type: 'boolean' },
                        }
                    },
                    autoMigrate: false,
                },
                recurringTransactions: {
                    schema: {
                        version: 0,
                        primaryKey: 'id',
                        type: 'object',
                        properties: {
                            id: { type: 'string', maxLength: 100 },
                            frequency: { type: 'string' },
                            amount: { type: 'number' },
                            category: { type: 'string' },
                            merchantName: { type: 'string' },
                            nextDate: { type: 'string' }, // Remove format: 'date'
                            isActive: { type: 'boolean' },
                            type: { type: 'string', enum: ['income', 'expense'] },
                        }
                    },
                    autoMigrate: false,
                }
            });

            this.dbReady$.next(true);
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
    }

    // Transaction management
    async updateTransactions(plaidTransactions: PlaidTransaction[]) {
        if (!this.database) {
            throw new Error('Database not initialized');
        }

        const transactions: Transaction[] = plaidTransactions.map(t => ({
            id: t.transaction_id,
            accountId: t.account_id,
            amount: t.amount,
            date: t.date,
            description: t.name || t.merchant_name || '',
            category: t.personal_finance_category?.primary || 'Uncategorized',
            merchantName: t.merchant_name ?? undefined, // Convert null to undefined
            pending: t.pending,
            paymentChannel: t.payment_channel,
            originalData: t,
        }));

        await this.database.transactions.bulkUpsert(transactions);
    }

    async getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
        if (!this.database) {
            throw new Error('Database not initialized');
        }

        const docs = await this.database.transactions
            .find({
                selector: {
                    date: {
                        $gte: startDate,
                        $lte: endDate,
                    }
                },
                sort: [{ date: 'desc' }]
            })
            .exec();

        return docs.map(doc => doc.toMutableJSON());
    }

    // Account management
    async updateAccounts(accounts: Account[]) {
        if (!this.database) {
            throw new Error('Database not initialized');
        }

        await this.database.accounts.bulkUpsert(accounts);
    }

    getAccounts(): Observable<Account[]> {
        if (!this.database) {
            throw new Error('Database not initialized');
        }
        return this.database.accounts.find().$.pipe(
            map(docs => docs.map(doc => doc.toJSON()))
        );
    }

    // Budget management
    async createBudget(budget: Omit<Budget, 'id'>): Promise<string> {
        if (!this.database) {
            throw new Error('Database not initialized');
        }

        const id = `budget_${Date.now()}`;
        const newBudget: Budget = { ...budget, id };
        await this.database.budgets.insert(newBudget);
        return id;
    }

    // Recurring transaction management
    async updateRecurringTransactions(
        inflowStreams: any[],
        outflowStreams: any[]
    ) {
        if (!this.database) {
            throw new Error('Database not initialized');
        }

        const recurringTransactions: RecurringTransaction[] = [
            ...inflowStreams.map(stream => ({
                id: stream.stream_id,
                frequency: stream.frequency,
                amount: Math.abs(stream.average_amount.amount),
                category: stream.personal_finance_category?.primary || 'Uncategorized',
                merchantName: stream.merchant_name,
                nextDate: stream.predicted_next_date,
                isActive: stream.is_active,
                type: 'income' as const,
            })),
            ...outflowStreams.map(stream => ({
                id: stream.stream_id,
                frequency: stream.frequency,
                amount: stream.average_amount.amount,
                category: stream.personal_finance_category?.primary || 'Uncategorized',
                merchantName: stream.merchant_name,
                nextDate: stream.predicted_next_date,
                isActive: stream.is_active,
                type: 'expense' as const,
            })),
        ];

        await this.database.recurringTransactions.bulkUpsert(recurringTransactions);
    }

    getRecurringTransactions(): Observable<RecurringTransaction[]> {
        if (!this.database) {
            throw new Error('Database not initialized');
        }

        return this.database.recurringTransactions.find().$.pipe(
            map(docs => docs.map(doc => doc.toJSON()))
        );
    }

    // Analytics and insights
    async getSpendingByCategory(startDate: string, endDate: string): Promise<{ [key: string]: number }> {
        const transactions = await this.getTransactionsByDateRange(startDate, endDate);

        const spending: { [key: string]: number } = {};
        transactions.forEach(t => {
            if (t.amount > 0) { // Only count expenses
                spending[t.category] = (spending[t.category] || 0) + t.amount;
            }
        });

        return spending;
    }

    async getCashFlow(startDate: string, endDate: string): Promise<{
        income: number;
        expenses: number;
        net: number;
    }> {
        const transactions = await this.getTransactionsByDateRange(startDate, endDate);

        let income = 0;
        let expenses = 0;

        transactions.forEach(t => {
            if (t.amount < 0) {
                income += Math.abs(t.amount);
            } else {
                expenses += t.amount;
            }
        });

        return {
            income,
            expenses,
            net: income - expenses,
        };
    }

    // Sync management
    updateSyncCursor(cursor: string) {
        this.syncCursor = cursor;
        localStorage.setItem('plaid_sync_cursor', cursor);
    }

    getSyncCursor(): string {
        return this.syncCursor || localStorage.getItem('plaid_sync_cursor') || '';
    }

    isReady(): Observable<boolean> {
        return this.dbReady$.asObservable();
    }

    // Utility method for development
    async clearDatabase() {
        if (!isDevMode()) {
            throw new Error('Cannot clear database in production');
        }
        if (this.database) {
            await this.database.remove();
            console.log('Database cleared');
            await this.initDatabase();
        }
    }
}