import { Component } from '@angular/core';
import { AppShellComponent } from './app-shell/app-shell.component';

/**
 * کامپوننت ریشه؛ پوستهٔ برنامه (`AppShellComponent`) را رندر می‌کند که
 * چیدمان راست‌به‌چپ، سربرگ، نوار جست‌وجو، ناوبری و `<router-outlet>` را
 * فراهم می‌کند.
 */
@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  template: `<app-shell />`,
})
export class App {}
