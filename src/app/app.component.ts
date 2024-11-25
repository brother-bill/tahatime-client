import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DayNightToggleComponent } from './shared/ui/day-night-toggle/day-night-toggle.component';
import { AppTheme, themeKey, ThemeService } from './core/services/theme/theme.service';
import { distinctUntilChanged, map, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  standalone: true,
  imports: [RouterModule, DayNightToggleComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'tahatime-client';

  public readonly lightModeToggled$: Observable<boolean>;
  private readonly themeLinkId = '#app-theme';

  private destroy$ = new Subject<void>();

  constructor(
    private themeService: ThemeService,
    private renderer: Renderer2,
  ) {
    this.lightModeToggled$ = this.themeService.theme$.pipe(
      map(theme => theme === AppTheme.LIGHT),
    );
  }

  ngOnInit() {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$), distinctUntilChanged())
      .subscribe(theme => {
        this.applyTheme(theme);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  themeToggled($e?: Event): void {
    $e?.stopPropagation();
    this.themeService.toggleTheme();
  }

  private applyTheme(theme: AppTheme): void {
    const themeEl = this.renderer.selectRootElement(
      this.themeLinkId,
    ) as HTMLLinkElement;

    const themeFileName = `${theme}.css`;
    if (themeEl.getAttribute('href') !== themeFileName) {
      this.renderer.setAttribute(themeEl, 'href', themeFileName);
      localStorage.setItem(themeKey, theme);
    }
  }
}
