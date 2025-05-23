import { Inject, Injectable } from '@angular/core';
import {
    BehaviorSubject,
    distinctUntilChanged,
    map,
    Observable,
    takeUntil,
} from 'rxjs';
import { DOCUMENT } from '@angular/common';

export enum AppTheme {
    LIGHT = 'light',
    DARK = 'dark',
}
// this.lightModeToggled$ = this.themeService.theme$.pipe(
//     map(theme => theme === AppTheme.LIGHT),
// );
// this.themeService.theme$
//     .pipe(takeUntil(this.destroy$), distinctUntilChanged())
//     .subscribe(theme => {
//         this.applyTheme(theme);
//     });
export const themeKey = 'user-theme';

@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    private readonly theme$$: BehaviorSubject<AppTheme>;
    public readonly theme$: Observable<AppTheme>;

    constructor(@Inject(DOCUMENT) private document: Document) {
        this.theme$$ = new BehaviorSubject(this.getInitialTheme());
        this.theme$ = this.theme$$.asObservable();
    }

    public toggleTheme(): void {
        const newTheme =
            this.theme$$.value === AppTheme.LIGHT
                ? AppTheme.DARK
                : AppTheme.LIGHT;
        this.theme$$.next(newTheme);
    }

    private getInitialTheme(): AppTheme {
        const savedTheme = localStorage.getItem(themeKey);

        if (!savedTheme) {
            const prefersDark = this.document.defaultView?.matchMedia(
                '(prefers-color-scheme: dark)',
            ).matches;
            return prefersDark ? AppTheme.DARK : AppTheme.LIGHT;
        }

        return this.isValidTheme(savedTheme) ? savedTheme : AppTheme.DARK;
    }

    private isValidTheme(theme: string | null): theme is AppTheme {
        return Object.values(AppTheme).includes(theme as AppTheme);
    }
}
