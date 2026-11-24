import { TestBed } from '@angular/core/testing';

import { OnboardingTourService, ONBOARDING_STORAGE_KEY } from './onboarding-tour.service';

describe('OnboardingTourService', () => {
  let tour: OnboardingTourService;

  beforeEach(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    TestBed.configureTestingModule({});
    tour = TestBed.inject(OnboardingTourService);
  });

  afterEach(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  });

  it('opens the introductory tour on the first visit without requiring a login', () => {
    tour.startIfFirstVisit();

    expect(tour.isOpen()).toBeTrue();
    expect(tour.stepIndex()).toBe(0);
    expect(tour.steps.length).toBe(5);
    expect(tour.currentStep().title).toContain('خوش آمدی');
  });

  it('moves next and back without exceeding the step boundaries', () => {
    tour.startIfFirstVisit();
    tour.back();
    expect(tour.stepIndex()).toBe(0);

    tour.next();
    expect(tour.stepIndex()).toBe(1);
    tour.back();
    expect(tour.stepIndex()).toBe(0);

    for (let i = 0; i < 9; i += 1) tour.next();
    expect(tour.isOpen()).toBeFalse();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('yes');
  });

  it('does not reopen automatically after skipping or finishing', () => {
    tour.startIfFirstVisit();
    tour.dismiss();
    expect(tour.isOpen()).toBeFalse();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('yes');

    tour.startIfFirstVisit();
    expect(tour.isOpen()).toBeFalse();

    const nextSession = new OnboardingTourService();
    nextSession.startIfFirstVisit();
    expect(nextSession.isOpen()).toBeFalse();
  });

  it('replays the complete tour on demand even after an earlier dismissal', () => {
    tour.startIfFirstVisit();
    tour.next();
    tour.dismiss();
    tour.replay();

    expect(tour.isOpen()).toBeTrue();
    expect(tour.stepIndex()).toBe(0);
    expect(tour.currentStep().title).toContain('خوش آمدی');
  });

  it('does not change poem favorites or browsing state when dismissed', () => {
    const existingFavorites = JSON.stringify([{ id: 8, title: 'غزل' }]);
    localStorage.setItem('molavi:favorites:v1', existingFavorites);
    tour.startIfFirstVisit();
    tour.dismiss();

    expect(localStorage.getItem('molavi:favorites:v1')).toBe(existingFavorites);
    localStorage.removeItem('molavi:favorites:v1');
  });
});
