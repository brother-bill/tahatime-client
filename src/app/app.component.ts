import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    template: `
        <div class="app-container">
            <nav class="app-header" *ngIf="shouldShowHeader()">
                <div class="logo">
                    💰 Time to Budget
                </div>
                <div class="nav-links">
                    <a routerLink="/budget/dashboard" class="nav-link">Dashboard</a>
                    <a routerLink="/budget/connect" class="nav-link">Connect Account</a>
                </div>
            </nav>
            
            <main class="app-content">
                <router-outlet></router-outlet>
            </main>
            
            <footer class="app-footer">
                <p>© {{ currentYear }} Time to Budget. All rights reserved.</p>
            </footer>
        </div>
    `,
    styles: [`
        .app-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .app-header {
            background-color: #4CAF50;
            color: white;
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .logo {
            font-size: 1.5rem;
            font-weight: bold;
        }

        .nav-links {
            display: flex;
            gap: 16px;
        }

        .nav-link {
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border-radius: 4px;
            transition: background-color 0.3s ease;
        }

        .nav-link:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .app-content {
            flex: 1;
            background-color: #f5f5f5;
        }

        .app-footer {
            background-color: #333;
            color: white;
            padding: 16px;
            text-align: center;
            font-size: 0.9rem;
        }
    `]
})
export class AppComponent {
    title = 'time-to-budget';
    currentYear = new Date().getFullYear();

    shouldShowHeader(): boolean {
        // You can add logic here to hide header on certain routes
        return true;
    }
}