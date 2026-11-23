import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, from, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, mergeMap, tap } from 'rxjs/operators';

import { GanjoorService } from '../../core/ganjoor.service';
import { findVersePreview, normalizePersianText, VersePreview } from '../../core/search-text';
import { GanjoorApiError, PoemSummary, Verse } from '../../models';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';

const MIN_TERM_LENGTH = 2;
const MAX_TERM_LENGTH = 100;
const RESULTS_PER_STEP = 8;
const PREVIEW_CONCURRENCY = 2;

type PreviewState = 'idle' | 'loading' | 'ready' | 'unavailable';

interface SearchHit extends PoemSummary {
  preview: VersePreview | null;
  previewState: PreviewState;
}

@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ErrorStateComponent, LoadingIndicatorComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent implements OnInit, OnDestroy {
  @Input()
  set q(value: string | null | undefined) { this.term = value ?? ''; }

  term = '';
  readonly maxLength = MAX_TERM_LENGTH;
  readonly examples = ['بشنو از نی', 'از محبت', 'عشق'];
  results: SearchHit[] = [];
  visibleCount = RESULTS_PER_STEP;
  hasMore = false;
  loading = false;
  loadingMore = false;
  moreError = false;
  searched = false;
  error: GanjoorApiError | null = null;
  guidanceMessage = '';
  lastSearchedTerm = '';

  private currentPage = 0;
  private generation = 0;
  private inputChanges = new Subject<string>();
  private inputSubscription: Subscription | null = null;
  private searchSubscription: Subscription | null = null;
  private loadMoreSubscription: Subscription | null = null;
  private previewSubscription: Subscription | null = null;
  private readonly verseCache = new Map<number, Verse[]>();

  constructor(private readonly ganjoor: GanjoorService, private readonly cdr: ChangeDetectorRef) {}

  get visibleResults(): SearchHit[] { return this.results.slice(0, this.visibleCount); }

  ngOnInit(): void {
    this.inputSubscription = this.inputChanges.pipe(
      debounceTime(600),
      map((value) => normalizePersianText(value).slice(0, MAX_TERM_LENGTH)),
      distinctUntilChanged(),
    ).subscribe((value) => {
      if (value.length >= MIN_TERM_LENGTH) this.runSearch(value);
    });
    if (normalizePersianText(this.term).length >= MIN_TERM_LENGTH) this.onSubmit();
  }

  ngOnDestroy(): void {
    this.inputSubscription?.unsubscribe();
    this.inputChanges.complete();
    this.cancelRequests();
  }

  onTermChange(value: string): void {
    this.term = value;
    this.guidanceMessage = '';
    this.generation += 1;
    this.cancelRequests();
    this.loading = false;
    this.searched = false;
    this.error = null;
    this.results = [];
    this.hasMore = false;
    this.moreError = false;
    this.inputChanges.next(value);
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    const term = normalizePersianText(this.term).slice(0, MAX_TERM_LENGTH);
    this.inputChanges.next('');
    if (term.length < MIN_TERM_LENGTH) {
      this.guidanceMessage = 'برای پیدا کردن شعر، دست‌کم دو حرف بنویس.';
      this.searched = false;
      this.loading = false;
      this.error = null;
      this.results = [];
      this.cancelRequests();
      this.cdr.markForCheck();
      return;
    }
    this.guidanceMessage = '';
    this.runSearch(term, true);
  }

  useExample(example: string): void { this.term = example; this.onSubmit(); }

  clearQuery(): void {
    this.term = '';
    this.onTermChange('');
    this.lastSearchedTerm = '';
  }

  focusInput(): void {
    if (typeof document !== 'undefined') document.getElementById('molavi-search-input')?.focus();
  }

  onRetry(): void {
    if (this.lastSearchedTerm) this.runSearch(this.lastSearchedTerm, true);
  }

  showMore(): void {
    if (this.loading || this.loadingMore) return;
    if (this.visibleCount < this.results.length) {
      this.visibleCount = Math.min(this.visibleCount + RESULTS_PER_STEP, this.results.length);
      this.hydrateVisiblePreviews();
      this.cdr.markForCheck();
      return;
    }

    if (!this.hasMore) return;
    const generation = this.generation;
    this.loadingMore = true;
    this.moreError = false;
    this.loadMoreSubscription?.unsubscribe();
    this.loadMoreSubscription = this.ganjoor.searchPoems(this.lastSearchedTerm, this.currentPage + 1)
      .subscribe({
        next: (page) => {
          if (generation !== this.generation) return;
          const existing = new Set(this.results.map((item) => item.id));
          const incoming = page.results.filter((item) => !existing.has(item.id)).map((item) => this.toHit(item));
          this.results = [...this.results, ...incoming];
          this.currentPage = page.pageNumber;
          this.hasMore = page.hasMore;
          this.loadingMore = false;
          this.visibleCount = Math.min(this.visibleCount + RESULTS_PER_STEP, this.results.length);
          this.hydrateVisiblePreviews();
          this.cdr.markForCheck();
        },
        error: () => {
          if (generation !== this.generation) return;
          this.loadingMore = false;
          this.moreError = true;
          this.cdr.markForCheck();
        },
      });
  }

  private runSearch(term: string, force = false): void {
    if (!force && term === this.lastSearchedTerm && this.searched && !this.error) return;
    this.generation += 1;
    this.cancelRequests();
    this.lastSearchedTerm = term;
    this.loading = true;
    this.loadingMore = false;
    this.moreError = false;
    this.searched = true;
    this.error = null;
    this.results = [];
    this.visibleCount = RESULTS_PER_STEP;
    this.currentPage = 0;
    this.hasMore = false;
    const generation = this.generation;
    this.searchSubscription = this.ganjoor.searchPoems(term, 1).subscribe({
      next: (page) => {
        if (generation !== this.generation) return;
        this.results = page.results.map((item) => this.toHit(item));
        this.currentPage = page.pageNumber;
        this.hasMore = page.hasMore;
        this.loading = false;
        this.hydrateVisiblePreviews();
        this.cdr.markForCheck();
      },
      error: (err: GanjoorApiError) => {
        if (generation !== this.generation) return;
        this.error = err;
        this.loading = false;
        this.results = [];
        this.cdr.markForCheck();
      },
    });
    this.cdr.markForCheck();
  }

  private toHit(item: PoemSummary): SearchHit {
    return { ...item, preview: null, previewState: 'idle' };
  }

  private hydrateVisiblePreviews(): void {
    if (this.previewSubscription && !this.previewSubscription.closed) return;
    const pending = this.visibleResults.filter((item) => item.previewState === 'idle');
    if (!pending.length) return;
    pending.forEach((item) => (item.previewState = 'loading'));
    const generation = this.generation;
    const term = this.lastSearchedTerm;
    this.previewSubscription = from(pending).pipe(
      mergeMap((item) => {
        const cached = this.verseCache.get(item.id);
        const response = cached ? of(cached) : this.ganjoor.getPoemVerses(item.id).pipe(
          tap((verses) => {
            if (this.verseCache.size >= 60) {
              const first = this.verseCache.keys().next().value;
              if (first !== undefined) this.verseCache.delete(first);
            }
            this.verseCache.set(item.id, verses);
          }),
        );
        return response.pipe(
          map((verses) => ({ item, preview: findVersePreview(verses, term) })),
          catchError(() => of({ item, preview: null })),
        );
      }, PREVIEW_CONCURRENCY),
    ).subscribe({
      next: ({ item, preview }) => {
        if (generation !== this.generation) return;
        item.preview = preview;
        item.previewState = preview ? 'ready' : 'unavailable';
        this.cdr.markForCheck();
      },
      complete: () => {
        if (generation !== this.generation) return;
        this.previewSubscription = null;
        this.hydrateVisiblePreviews();
        this.cdr.markForCheck();
      },
    });
  }

  private cancelRequests(): void {
    this.searchSubscription?.unsubscribe();
    this.loadMoreSubscription?.unsubscribe();
    this.previewSubscription?.unsubscribe();
    this.searchSubscription = null;
    this.loadMoreSubscription = null;
    this.previewSubscription = null;
  }
}
