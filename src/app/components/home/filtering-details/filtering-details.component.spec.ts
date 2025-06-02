import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilteringDetailsComponent } from './filtering-details.component';

describe('FilteringDetailsComponent', () => {
  let component: FilteringDetailsComponent;
  let fixture: ComponentFixture<FilteringDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FilteringDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteringDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
