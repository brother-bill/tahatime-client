import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    Output,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';

/**
 *
 */
@Component({
    selector: 'app-day-night-toggle',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './day-night-toggle.component.html',
    styleUrls: ['./day-night-toggle.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayNightToggleComponent implements OnDestroy {
    @ViewChild('toggleCheckbox', { static: true }) toggleCheckbox!: ElementRef;
    @Input() isChecked$: Observable<boolean> = new Observable();
    @Output() checked = new EventEmitter<boolean>();

    private destroy$ = new Subject<void>();

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    toggle($e?: Event): void {
        $e?.stopPropagation();
        this.checked.emit(this.toggleCheckbox.nativeElement.checked);
    }
}
