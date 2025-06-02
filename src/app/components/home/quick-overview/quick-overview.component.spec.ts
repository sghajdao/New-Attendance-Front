import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuickOverviewComponent } from './quick-overview.component';

describe('QuickOverviewComponent', () => {
  let component: QuickOverviewComponent;
  let fixture: ComponentFixture<QuickOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [QuickOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuickOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
