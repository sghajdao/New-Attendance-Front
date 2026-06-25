import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { dsaGuard } from './dsa.guard';

describe('dsaGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => dsaGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
