/**
 * آزمون شیت انتخاب شعر {@link PoemPickerComponent}:
 * - با باز شدن، سطح ریشه (آثار مولانا) را از getPoet بارگذاری می‌کند.
 * - ورود به یک دسته، getCategory را فراخوانی و زیردسته/شعرها را نشان می‌دهد.
 * - انتخاب یک شعر به /poem/:id/listen ناوبری می‌کند و شیت را می‌بندد.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { Category, Poet } from '../../models';
import { PoemPickerComponent } from './poem-picker.component';

function makePoet(): Poet {
  return {
    id: 5,
    name: 'مولوی',
    urlSlug: 'moulavi',
    rootCategory: {
      id: 100,
      title: 'آثار مولانا',
      fullUrl: '/moulavi',
      parentId: null,
      children: [
        { id: 101, title: 'مثنوی معنوی', fullUrl: '/moulavi/masnavi' },
      ],
      poems: [],
    },
  };
}

function makeCategory(): Category {
  return {
    id: 101,
    title: 'مثنوی معنوی',
    fullUrl: '/moulavi/masnavi',
    parentId: 100,
    children: [],
    poems: [
      { id: 3526, title: 'بخش ۱', fullUrl: '/moulavi/masnavi/daftar1/sh1' },
    ],
  };
}

describe('PoemPickerComponent', () => {
  let fixture: ComponentFixture<PoemPickerComponent>;
  let component: PoemPickerComponent;
  let ganjoorSpy: jasmine.SpyObj<GanjoorService>;

  beforeEach(async () => {
    ganjoorSpy = jasmine.createSpyObj<GanjoorService>('GanjoorService', [
      'getPoet',
      'getCategory',
    ]);

    await TestBed.configureTestingModule({
      imports: [PoemPickerComponent],
      providers: [
        provideRouter([]),
        { provide: GanjoorService, useValue: ganjoorSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PoemPickerComponent);
    component = fixture.componentInstance;
  });

  it('با باز شدن، آثار سطح ریشه را از getPoet بارگذاری می‌کند', () => {
    ganjoorSpy.getPoet.and.returnValue(of(makePoet()));

    component.open = true;
    fixture.detectChanges();

    expect(ganjoorSpy.getPoet).toHaveBeenCalledTimes(1);
    expect(component.categories.length).toBe(1);
    expect(component.categories[0].id).toBe(101);
  });

  it('ورود به یک دسته، getCategory را فراخوانی می‌کند و امکان بازگشت می‌دهد', () => {
    ganjoorSpy.getPoet.and.returnValue(of(makePoet()));
    ganjoorSpy.getCategory.and.returnValue(of(makeCategory()));

    component.open = true;
    fixture.detectChanges();

    component.openCategory(component.categories[0]);
    fixture.detectChanges();

    expect(ganjoorSpy.getCategory).toHaveBeenCalledWith(101);
    expect(component.poems.length).toBe(1);
    expect(component.poems[0].id).toBe(3526);
    expect(component.canGoBack).toBeTrue();

    component.goBack();
    expect(component.canGoBack).toBeFalse();
  });

  it('انتخاب یک شعر به /poem/:id/listen ناوبری می‌کند و شیت را می‌بندد', () => {
    ganjoorSpy.getPoet.and.returnValue(of(makePoet()));
    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);

    component.open = true;
    fixture.detectChanges();

    component.pick(3526);

    expect(navSpy).toHaveBeenCalledWith(['/poem', 3526, 'listen']);
    expect(component.open).toBeFalse();
    expect(closedSpy).toHaveBeenCalled();
  });
});
