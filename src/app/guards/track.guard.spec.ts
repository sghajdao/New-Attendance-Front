import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { trackGuard } from './track.guard';

describe('trackGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => trackGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
