import { DayNightToggleComponent } from './day-night-toggle.component';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('UiComponent', () => {
    let component: DayNightToggleComponent;
    let fixture: ComponentFixture<DayNightToggleComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DayNightToggleComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DayNightToggleComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
