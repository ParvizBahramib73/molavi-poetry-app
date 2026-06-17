import { Routes } from '@angular/router';

/**
 * مسیرهای برنامه، هم‌تراز با ساختار URL گنجور.
 *
 * - `''`               → صفحهٔ اصلی = پخش‌کنندهٔ غوطه‌ور (Immersive_Player) با
 *   شعر پیش‌فرض «بشنو از نی». این صفحه همواره دیده می‌شود و تجربهٔ اصلی است.
 * - `poem/:id`         → نمای مطالعهٔ یک شعر (Reading_View) — روی دیسک نگه‌داشته
 *   می‌شود ولی در جریان اصلی UI سطح‌بالا نمایش داده نمی‌شود.
 * - `poem/:id/listen`  → پخش‌کنندهٔ غوطه‌ور برای شعری مشخص.
 * - `search`           → جست‌وجوی اشعار مولوی — برای سازگاری آزمون‌ها باقی است.
 *
 * Requirements: 7.1, 7.2
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'اشعار مولوی — شنیدن',
    loadComponent: () =>
      import('./features/player/immersive-player.component').then(
        (m) => m.ImmersivePlayerComponent,
      ),
  },
  {
    path: 'poem/:id',
    title: 'اشعار مولوی — مطالعهٔ شعر',
    loadComponent: () =>
      import('./features/reading/reading-view.component').then((m) => m.ReadingViewComponent),
  },
  {
    path: 'poem/:id/listen',
    title: 'اشعار مولوی — شنیدن شعر',
    loadComponent: () =>
      import('./features/player/immersive-player.component').then(
        (m) => m.ImmersivePlayerComponent,
      ),
  },
  {
    path: 'search',
    title: 'اشعار مولوی — جست‌وجو',
    loadComponent: () =>
      import('./features/search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
