/**
 * پوشش حالت سبک برای وضعیت بارگذاری/خطا/داده در UI.
 *
 * هر ویوی واکشی‌کننده با ViewState<T> سه وضعیت loading، error و data را
 * در اختیار قالب قرار می‌دهد (R6.3).
 *
 * Requirements: 6.1
 */

import { GanjoorApiError } from './errors';

/** وضعیت یک عملیات واکشی داده. */
export interface ViewState<T> {
  loading: boolean;
  error: GanjoorApiError | null;
  data: T | null;
}
