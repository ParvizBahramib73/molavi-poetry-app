import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { GanjoorService } from '../../core/ganjoor.service';
import { GanjoorApiError, Poem, Recitation, Verse } from '../../models';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';
import { PoemPickerComponent } from './poem-picker.component';
import {
  buildTimingsFromSync,
  computeVerseTimings,
  findCurrentVerseIndex,
  formatTime,
  hasUsableSync,
} from './verse-timing';

/** گزینه‌های سرعت پخش در دسترس. */
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

/** مسیر شعر پیش‌فرض صفحهٔ خانه: «بشنو از نی». */
const DEFAULT_POEM_URL = '/moulavi/masnavi/daftar1/sh1';

/** کمینهٔ جابه‌جایی افقی (پیکسل) برای تشخیص سوایپ بین اشعار. */
const SWIPE_THRESHOLD = 60;

/**
 * نمای «شنیدن همگام با متن» (Immersive_Player) — تجربهٔ اصلی و همیشه‌دیدهٔ برنامه.
 *
 * یک صفحهٔ غوطه‌ورِ تیره به‌سبک استوری اینستاگرام برای پخش خوانش صوتی شعر مولوی،
 * هم‌زمان با برجسته‌سازی و پیمایش خودکار بیت فعال. زمان‌بندی ابیات با منطق خالص
 * {@link computeVerseTimings} محاسبه و بیت فعال با {@link findCurrentVerseIndex}
 * تعیین می‌شود.
 *
 * قابلیت‌ها:
 * - منوی هنری بالا: بازگشت، عنوان + «مولانا جلال‌الدین رومی»، سوییچر خوانش،
 *   نشانک و دکمهٔ منو (باز کردن شیت انتخاب شعر).
 * - نوار پیشرفت باریک طلایی بالای صفحه (استوری‌وار).
 * - سوایپ افقی + شِوْرون‌های لبه برای رفتن به شعر بعدی/پیشین (بر پایهٔ مجاورت).
 * - سوییچر خوانش (تعویض صدای خواننده) با تعویض منبع صوت و بازنشانی زمان.
 * - شیت پایین‌کشِ انتخاب شعر (مرور آثار → دسته → شعر).
 *
 * با ورودی `id` (مسیر `poem/:id/listen`) همان شعر بارگذاری می‌شود؛ بدون id
 * (صفحهٔ خانه) شعر پیش‌فرض «بشنو از نی» با URL بارگذاری می‌گردد.
 */
@Component({
  selector: 'app-immersive-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LoadingIndicatorComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    PoemPickerComponent,
  ],
  template: `
    <section class="player" dir="rtl">
      <!-- نوار پیشرفت استوری‌وار (currentTime/duration) -->
      <div
        class="player__progress"
        role="progressbar"
        aria-label="پیشرفت پخش"
        [attr.aria-valuenow]="progressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span
          class="player__progress-fill"
          [style.width.%]="progressPercent"
        ></span>
      </div>

      <!-- لایهٔ گرد و غبار/ذرات شناور (صرفاً تزئینی) -->
      <div class="player__particles" aria-hidden="true">
        @for (p of particles; track p) {
          <span class="player__particle"></span>
        }
      </div>

      @if (loading) {
        <div class="player__center">
          <app-loading-indicator message="در حال آماده‌سازی شنیدن…" />
        </div>
      } @else if (error) {
        <div class="player__center">
          <app-error-state [message]="error.messageFa" (retry)="reload()" />
        </div>
      } @else if (poem) {
        <!-- منوی هنری بالا -->
        <header class="player__header">
          <a
            class="player__icon-btn player__back"
            [routerLink]="['/poem', poem.id]"
            aria-label="بازگشت به متن شعر"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>

          <div class="player__titles">
            <h1 class="player__title">{{ poem.title }}</h1>
            <p class="player__poet">مولانا جلال‌الدین رومی</p>
            @if (recitation) {
              <button
                type="button"
                class="player__reciter"
                [attr.aria-expanded]="recSheetOpen"
                aria-haspopup="menu"
                aria-label="تغییر خوانش (صدای خواننده)"
                (click)="toggleRecSheet()"
              >
                <span class="player__reciter-dot" aria-hidden="true"></span>
                <span class="player__reciter-name">{{
                  recitation.audioArtist || recitation.audioTitle || 'خوانش'
                }}</span>
                <span class="player__reciter-caret" aria-hidden="true">▾</span>
              </button>
            }
          </div>

          <div class="player__header-actions">
            <button
              type="button"
              class="player__icon-btn player__menu"
              aria-label="فهرست اشعار"
              (click)="openPicker()"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              class="player__icon-btn player__fullscreen"
              [attr.aria-label]="isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'"
              (click)="toggleFullscreen()"
            >
              @if (isFullscreen) {
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 4v4a1 1 0 0 1-1 1H4M15 4v4a1 1 0 0 0 1 1h4M9 20v-4a1 1 0 0 0-1-1H4M15 20v-4a1 1 0 0 1 1-1h4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              }
            </button>
          </div>
        </header>

        <!-- شِوْرون‌های لبه برای سوایپ بین اشعار -->
        @if (poem.prevPoem) {
          <button
            type="button"
            class="player__chevron player__chevron--prev"
            aria-label="شعر پیشین"
            (click)="goPrevPoem()"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        }
        @if (poem.nextPoem) {
          <button
            type="button"
            class="player__chevron player__chevron--next"
            aria-label="شعر بعدی"
            (click)="goNextPoem()"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        }

        <!-- سوییچر خوانش (روکش مودال با اسکرول داخلی) -->
        @if (recSheetOpen && poem.recitations.length > 0) {
          <div class="player__rec-overlay" (click)="closeRecSheet()">
            <div
              class="player__rec-sheet"
              role="menu"
              dir="rtl"
              (click)="$event.stopPropagation()"
            >
              <p class="player__rec-heading">انتخاب خوانش</p>
              <div class="player__rec-list">
                @for (rec of poem.recitations; track rec.id) {
                  <button
                    type="button"
                    class="player__rec-option"
                    role="menuitemradio"
                    [class.player__rec-option--active]="rec === recitation"
                    [attr.aria-checked]="rec === recitation"
                    (click)="selectRecitation(rec)"
                  >
                    <span class="player__rec-artist">{{
                      rec.audioArtist || 'خوانندهٔ نامشخص'
                    }}</span>
                    @if (rec.audioTitle) {
                      <span class="player__rec-title">{{ rec.audioTitle }}</span>
                    }
                  </button>
                }
              </div>
            </div>
          </div>
        }

        <!-- هنرِ دایره‌ای: نقش‌مایهٔ هندسی عرفانی با چرخش آرام -->
        <div class="player__hero" aria-hidden="true">
          <div class="player__rosette">
            <span class="player__glow"></span>
            <span class="player__ring player__ring--1"></span>
            <span class="player__ring player__ring--2"></span>
            <span class="player__ring player__ring--3"></span>
            <span class="player__core"></span>
          </div>
        </div>

        <!-- ستون متن همگام (کارائوکه‌وار: بیت فعال در نقطهٔ کانونی، بقیه محو) -->
        <div
          class="player__lyrics"
          #lyrics
          (pointerdown)="onPointerDown($event)"
          (pointerup)="onPointerUp($event)"
          (pointercancel)="onPointerCancel()"
        >
          <div class="player__lyrics-track">
            @for (verse of lyricVerses; track verse.vOrder; let i = $index) {
              <p
                class="player__verse"
                [class.player__verse--active]="i === currentVerseIndex"
                [class.player__verse--near]="isNear(i)"
                [class.player__verse--hidden]="!isVisible(i)"
                [style.opacity]="verseOpacity(i)"
                #verseEl
                (click)="seekToVerse(i)"
              >
                {{ verse.text }}
              </p>
            } @empty {
              <p class="player__verse">متن این شعر در دسترس نیست.</p>
            }
          </div>
        </div>

        @if (recitation) {
          <audio
            #audio
            [src]="recitation.mp3Url"
            preload="metadata"
            (loadedmetadata)="onLoadedMetadata()"
            (timeupdate)="onTimeUpdate()"
            (play)="onPlay()"
            (pause)="onPause()"
            (ended)="onEnded()"
          ></audio>

          <div class="player__bar">
            <div class="player__seek-row">
              <span class="player__time">{{ formatTime(currentTime) }}</span>
              <input
                type="range"
                class="player__seek"
                min="0"
                [max]="duration"
                step="0.1"
                [value]="currentTime"
                [disabled]="duration <= 0"
                aria-label="جابه‌جایی در زمان"
                (input)="onSeek($event)"
              />
              <span class="player__time">-{{ formatTime(remainingTime) }}</span>
            </div>

            <div class="player__controls">
              <!-- کنترل‌های انتقال (قبلی/پخش/بعدی) به‌صورت LTR و مرکزچین -->
              <div class="player__transport" dir="ltr">
                <button
                  type="button"
                  class="player__ctrl"
                  aria-label="بیت پیشین"
                  (click)="previousVerse()"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                      d="M7 6a1 1 0 0 1 2 0v12a1 1 0 0 1-2 0zM19 6.5v11a1 1 0 0 1-1.6.8l-7-5.5a1 1 0 0 1 0-1.6l7-5.5A1 1 0 0 1 19 6.5z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="player__ctrl player__ctrl--play"
                  [attr.aria-label]="playLabel"
                  (click)="togglePlay()"
                >
                  @if (hasEnded) {
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                      stroke="currentColor"
                      stroke-width="2.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M3 12a9 9 0 1 1 3 6.7" />
                      <path d="M3 21v-5h5" />
                    </svg>
                  } @else if (isPlaying) {
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <rect x="7" y="5" width="3.6" height="14" rx="1.1" />
                      <rect x="13.4" y="5" width="3.6" height="14" rx="1.1" />
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path
                        d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z"
                      />
                    </svg>
                  }
                </button>
                <button
                  type="button"
                  class="player__ctrl"
                  aria-label="بیت بعدی"
                  (click)="nextVerse()"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                      d="M17 6a1 1 0 0 1 2 0v12a1 1 0 0 1-2 0zM5 6.5v11a1 1 0 0 0 1.6.8l7-5.5a1 1 0 0 0 0-1.6l-7-5.5A1 1 0 0 0 5 6.5z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        } @else {
          <div class="player__no-audio">
            <app-empty-state
              message="خوانش صوتی برای این شعر موجود نیست"
            />
            <a class="player__back-link" [routerLink]="['/poem', poem.id]">
              بازگشت به متن شعر
            </a>
          </div>
        }
      }
    </section>

    <!-- شیت پایین‌کشِ انتخاب شعر -->
    <app-poem-picker [open]="pickerOpen" (closed)="closePicker()" />
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        flex: 1 1 auto;
        min-height: 0;
      }

      /* تم تیره مستقل از تم روشن برنامه */
      .player {
        position: relative;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1rem 7rem;
        overflow: hidden;
        color: #f8f5ec;
        background-color: #0f172a;
        background-image: radial-gradient(
            55% 42% at 50% 0%,
            rgba(212, 175, 55, 0.12),
            transparent 70%
          ),
          radial-gradient(
            95% 45% at 50% 116%,
            rgba(56, 60, 110, 0.22),
            transparent 72%
          );
        font-family: Vazirmatn, system-ui, sans-serif;
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }

      /* ---- نوار پیشرفت استوری‌وار ---- */
      .player__progress {
        position: sticky;
        top: 0;
        z-index: 4;
        width: 100%;
        max-width: 38rem;
        height: 3px;
        border-radius: 999px;
        background: rgba(248, 245, 236, 0.16);
        overflow: hidden;
      }

      .player__progress-fill {
        display: block;
        height: 100%;
        width: 0;
        border-radius: 999px;
        background: linear-gradient(90deg, #e3c75a, #d4af37);
        box-shadow: 0 0 10px rgba(212, 175, 55, 0.7);
        transition: width 200ms linear;
      }

      .player__center {
        margin: auto;
        width: 100%;
        max-width: 38rem;
      }

      /* ---- سربرگ/منوی هنری ---- */
      .player__header {
        position: relative;
        z-index: 2;
        width: 100%;
        max-width: 38rem;
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: start;
        gap: 0.5rem;
      }

      .player__back {
        grid-column: 1;
        justify-self: start;
      }

      .player__header-actions {
        grid-column: 3;
        justify-self: end;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .player__titles {
        grid-column: 2;
        min-width: 0;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.2rem;
      }

      .player__title {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        line-height: 1.6;
        color: #f8f5ec;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .player__poet {
        margin: 0;
        font-size: 0.82rem;
        color: rgba(212, 175, 55, 0.85);
      }

      .player__reciter {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        margin-top: 0.15rem;
        max-width: 100%;
        padding: 0.2rem 0.7rem;
        font: inherit;
        font-size: 0.74rem;
        color: #f8f5ec;
        background: rgba(248, 245, 236, 0.06);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 999px;
        cursor: pointer;
        transition: background 150ms ease;
      }

      .player__reciter:hover {
        background: rgba(212, 175, 55, 0.16);
      }

      .player__reciter-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #d4af37;
        box-shadow: 0 0 6px rgba(212, 175, 55, 0.8);
      }

      .player__reciter-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .player__reciter-caret {
        font-size: 0.6rem;
        color: rgba(212, 175, 55, 0.85);
      }

      .player__icon-btn {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        font-size: 1.4rem;
        line-height: 1;
        text-decoration: none;
        color: #f8f5ec;
        background: rgba(248, 245, 236, 0.06);
        border: 1px solid rgba(212, 175, 55, 0.25);
        border-radius: 999px;
        cursor: pointer;
        transition: background 150ms ease, transform 150ms ease;
      }

      .player__icon-btn:hover {
        background: rgba(212, 175, 55, 0.16);
        transform: translateY(-1px);
      }

      .player__icon-btn:active {
        transform: scale(0.92);
      }

      .player__menu {
        font-size: 1.2rem;
      }

      /* آیکون‌های SVG دقیقاً وسطِ دایره می‌نشینند. */
      .player__icon-btn svg,
      .player__chevron svg,
      .player__ctrl svg {
        width: 1.25rem;
        height: 1.25rem;
        display: block;
      }

      .player__ctrl--play svg {
        width: 1.6rem;
        height: 1.6rem;
      }

      /* ---- شِوْرون‌های سوایپ بین اشعار ---- */
      .player__chevron {
        position: fixed;
        top: 50%;
        transform: translateY(-50%);
        z-index: 3;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.4rem;
        height: 2.4rem;
        font-size: 1.5rem;
        color: rgba(248, 245, 236, 0.75);
        background: rgba(15, 23, 42, 0.55);
        border: 1px solid rgba(212, 175, 55, 0.25);
        border-radius: 999px;
        cursor: pointer;
        backdrop-filter: blur(4px);
        transition: background 150ms ease, color 150ms ease;
      }

      .player__chevron:hover {
        background: rgba(212, 175, 55, 0.2);
        color: #fffdf5;
      }

      /* در RTL، «بعدی» سمت چپ و «پیشین» سمت راست قرار می‌گیرد. */
      .player__chevron--prev {
        inset-inline-end: 0.4rem;
      }

      .player__chevron--next {
        inset-inline-start: 0.4rem;
      }

      /* ---- شیت سوییچر خوانش (روکش مودال + اسکرول داخلی) ---- */
      .player__rec-overlay {
        position: absolute;
        inset: 0;
        z-index: 30;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 5rem 1rem 1.25rem;
        background: rgba(5, 7, 15, 0.55);
        backdrop-filter: blur(3px);
        animation: recFade 160ms ease both;
      }

      .player__rec-sheet {
        width: min(22rem, 100%);
        max-height: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.85rem;
        background: linear-gradient(180deg, #131c33, #0f172a);
        border: 1px solid rgba(212, 175, 55, 0.3);
        border-radius: 18px;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
      }

      .player__rec-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .player__rec-heading {
        margin: 0 0 0.2rem;
        font-size: 0.78rem;
        color: rgba(212, 175, 55, 0.9);
        text-align: center;
      }

      .player__rec-option {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        padding: 0.6rem 0.8rem;
        font: inherit;
        text-align: start;
        color: #f8f5ec;
        background: rgba(248, 245, 236, 0.04);
        border: 1px solid rgba(212, 175, 55, 0.14);
        border-radius: 12px;
        cursor: pointer;
        transition: background 150ms ease, border-color 150ms ease;
      }

      .player__rec-option:hover {
        background: rgba(212, 175, 55, 0.12);
      }

      .player__rec-option--active {
        border-color: #d4af37;
        box-shadow: 0 0 12px rgba(212, 175, 55, 0.3);
      }

      .player__rec-artist {
        font-weight: 700;
        font-size: 0.9rem;
      }

      .player__rec-title {
        font-size: 0.74rem;
        color: rgba(248, 245, 236, 0.65);
      }

      /* ---- هنرِ دایره‌ای (نقش‌مایهٔ عرفانی) ---- */
      .player__hero {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0.25rem 0;
      }

      .player__rosette {
        position: relative;
        width: 7rem;
        height: 7rem;
        max-width: 34vw;
        max-height: 34vw;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: rosetteSpin 60s linear infinite;
      }

      .player__glow {
        position: absolute;
        inset: -12%;
        border-radius: 50%;
        background: radial-gradient(
          circle,
          rgba(212, 175, 55, 0.32),
          transparent 65%
        );
        filter: blur(6px);
        animation: glowPulse 6s ease-in-out infinite;
      }

      .player__ring {
        position: absolute;
        border-radius: 50%;
        border: 1px solid rgba(212, 175, 55, 0.45);
      }

      .player__ring--1 {
        inset: 0;
        background: conic-gradient(
          from 0deg,
          rgba(212, 175, 55, 0.18),
          rgba(56, 60, 110, 0.18),
          rgba(212, 175, 55, 0.18)
        );
      }

      .player__ring--2 {
        inset: 18%;
        border-style: dashed;
        border-color: rgba(212, 175, 55, 0.55);
      }

      .player__ring--3 {
        inset: 34%;
        border-color: rgba(248, 245, 236, 0.35);
        background: radial-gradient(
          circle,
          rgba(248, 245, 236, 0.08),
          transparent 70%
        );
      }

      .player__core {
        position: absolute;
        inset: 44%;
        border-radius: 50%;
        background: radial-gradient(circle, #f8f5ec, #d4af37 70%);
        box-shadow: 0 0 22px rgba(212, 175, 55, 0.6);
      }

      /* ---- ستون متن همگام (کارائوکه‌وار) ---- */
      .player__lyrics {
        position: relative;
        z-index: 2;
        width: 100%;
        max-width: 38rem;
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        /* همهٔ ژست‌های لمسی این ناحیه در کنترل ماست (جابه‌جایی بیت با کشیدن) */
        touch-action: none;
      }

      /* فقط سه بیتِ نمایان (قبلی/جاری/بعدی) به‌صورت مرکزچین. */
      .player__lyrics-track {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.9rem;
        width: 100%;
        text-align: center;
        padding: 0 0.5rem;
      }

      .player__verse--hidden {
        display: none;
      }

      .player__verse {
        margin: 0;
        padding: 0.3rem 0.6rem;
        font-size: 1.28rem;
        line-height: 1.9;
        font-weight: 600;
        color: #f8f5ec;
        /* همه با اندازهٔ «بزرگ» چیده می‌شوند؛ همسایه‌ها کوچک‌نمایی می‌شوند
           (scale<1 هرگز کناره‌ها را نمی‌بُرد) و بیت فعال در اندازهٔ طبیعی
           (scale 1) است؛ چون font-size ثابت است نه پرش رخ می‌دهد نه برش. */
        transform: scale(0.82);
        transform-origin: center;
        cursor: pointer;
        transition: opacity 400ms ease, transform 400ms ease, color 400ms ease,
          text-shadow 400ms ease;
        will-change: transform;
      }

      .player__verse--near {
        color: #f3ead2;
      }

      .player__verse--active {
        transform: scale(1);
        color: #fffdf5;
        text-shadow: 0 0 18px rgba(212, 175, 55, 0.6),
          0 0 6px rgba(212, 175, 55, 0.45);
      }

      /* ---- نوار کنترل پایین (فیکس در پایین صفحه، هم‌عرض قاب گوشی) ---- */
      .player__bar {
        position: absolute;
        z-index: 20;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        padding: 0.9rem 1rem calc(0.9rem + env(safe-area-inset-bottom));
        background: linear-gradient(
          to top,
          #0f172a 0%,
          #0f172a 65%,
          rgba(15, 23, 42, 0.94) 100%
        );
        border-top: 1px solid rgba(212, 175, 55, 0.22);
      }

      .player__seek-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .player__time {
        flex: 0 0 auto;
        font-size: 0.78rem;
        font-variant-numeric: tabular-nums;
        color: rgba(248, 245, 236, 0.7);
      }

      .player__seek {
        flex: 1 1 auto;
        min-width: 0;
        direction: ltr;
        -webkit-appearance: none;
        appearance: none;
        height: 5px;
        border-radius: 999px;
        background: rgba(248, 245, 236, 0.18);
        cursor: pointer;
      }

      .player__seek::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #d4af37;
        box-shadow: 0 0 8px rgba(212, 175, 55, 0.6);
      }

      .player__seek::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border: none;
        border-radius: 50%;
        background: #d4af37;
      }

      .player__controls {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* گروهِ انتقال (قبلی/پخش/بعدی) مرکزچین، LTR برای ترتیب استاندارد. */
      .player__transport {
        display: flex;
        align-items: center;
        gap: 1.1rem;
      }

      .player__ctrl {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.7rem;
        height: 2.7rem;
        font-size: 1.05rem;
        color: #f8f5ec;
        background: rgba(248, 245, 236, 0.07);
        border: 1px solid rgba(212, 175, 55, 0.28);
        border-radius: 999px;
        cursor: pointer;
        transition: background 150ms ease, transform 120ms ease,
          border-color 150ms ease;
      }

      .player__ctrl:hover {
        background: rgba(212, 175, 55, 0.18);
        border-color: rgba(212, 175, 55, 0.5);
      }

      .player__ctrl:active {
        transform: scale(0.92);
      }

      .player__ctrl--play {
        width: 3.5rem;
        height: 3.5rem;
        font-size: 1.5rem;
        color: #0f172a;
        background: linear-gradient(135deg, #e3c75a, #d4af37);
        border-color: transparent;
        box-shadow: 0 6px 20px rgba(212, 175, 55, 0.45);
      }

      .player__ctrl--play:hover {
        background: linear-gradient(135deg, #ecd16a, #d9b53a);
        transform: translateY(-1px);
      }

      /* ---- نبودِ خوانش صوتی ---- */
      .player__no-audio {
        position: relative;
        z-index: 2;
        width: 100%;
        max-width: 38rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.85rem;
      }

      .player__back-link {
        color: #d4af37;
        text-decoration: none;
        font-weight: 700;
        border-bottom: 1px solid rgba(212, 175, 55, 0.5);
      }

      /* ---- ذرات شناور ---- */
      .player__particles {
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
      }

      .player__particle {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: rgba(212, 175, 55, 0.7);
        box-shadow: 0 0 6px rgba(212, 175, 55, 0.7);
        animation: drift 14s ease-in-out infinite;
      }

      .player__particle:nth-child(1) { left: 8%; top: 20%; animation-delay: 0s; }
      .player__particle:nth-child(2) { left: 22%; top: 70%; animation-delay: 1.5s; }
      .player__particle:nth-child(3) { left: 35%; top: 35%; animation-delay: 3s; }
      .player__particle:nth-child(4) { left: 48%; top: 80%; animation-delay: 4.5s; }
      .player__particle:nth-child(5) { left: 60%; top: 15%; animation-delay: 1s; }
      .player__particle:nth-child(6) { left: 72%; top: 60%; animation-delay: 2.5s; }
      .player__particle:nth-child(7) { left: 85%; top: 30%; animation-delay: 4s; }
      .player__particle:nth-child(8) { left: 15%; top: 50%; animation-delay: 5.5s; }
      .player__particle:nth-child(9) { left: 90%; top: 75%; animation-delay: 0.5s; }
      .player__particle:nth-child(10) { left: 55%; top: 45%; animation-delay: 6s; }
      .player__particle:nth-child(11) { left: 30%; top: 88%; animation-delay: 2s; }
      .player__particle:nth-child(12) { left: 78%; top: 88%; animation-delay: 3.5s; }

      @keyframes drift {
        0%,
        100% {
          transform: translateY(0) translateX(0);
          opacity: 0.2;
        }
        50% {
          transform: translateY(-22px) translateX(10px);
          opacity: 0.9;
        }
      }

      @keyframes rosetteSpin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes glowPulse {
        0%,
        100% {
          opacity: 0.5;
          transform: scale(1);
        }
        50% {
          opacity: 0.9;
          transform: scale(1.06);
        }
      }

      @keyframes recFade {
        from {
          opacity: 0;
          transform: translateY(-6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* احترام به ترجیح کاهش حرکت */
      @media (prefers-reduced-motion: reduce) {
        .player__rosette,
        .player__glow,
        .player__particle {
          animation: none !important;
        }
        .player__verse,
        .player__lyrics-track,
        .player__progress-fill,
        .player__rec-sheet {
          transition: none !important;
          animation: none !important;
        }
      }

      @media (min-width: 48rem) {
        .player__title {
          font-size: 1.35rem;
        }
        .player__rosette {
          width: 8.5rem;
          height: 8.5rem;
        }
      }
    `,
  ],
})
export class ImmersivePlayerComponent implements OnInit {
  /** شعر واکشی‌شدهٔ جاری. */
  poem: Poem | null = null;

  /** ابیات غیرخالی برای زمان‌بندی و برجسته‌سازی. */
  lyricVerses: Verse[] = [];

  /** وضعیت بارگذاری. */
  loading = false;

  /** خطای جاری در صورت شکست واکشی. */
  error: GanjoorApiError | null = null;

  /** خوانش صوتی فعال (یا null اگر شعر خوانشی نداشته باشد). */
  recitation: Recitation | null = null;

  /** زمان‌بندی شروع هر بیت (ثانیه). */
  timings: number[] = [];

  /** اندیس بیت فعال جاری. */
  currentVerseIndex = 0;

  /** جابه‌جایی عمودی ریل ابیات (px) برای نشاندن بیت فعال روی نقطهٔ کانونی. */
  trackOffset = 0;

  /** آیا زمان‌بندیِ جاری از داده‌ی دقیقِ همگام‌سازیِ گنجور آمده است. */
  exactSync = false;

  /** زمان جاری پخش (ثانیه). */
  currentTime = 0;

  /** مدت‌زمان کل خوانش (ثانیه). */
  duration = 0;

  /** آیا صوت در حال پخش است. */
  isPlaying = false;

  /** آیا پخش تا انتها رسیده است (برای نمایش آیکونِ «پخش از ابتدا»). */
  hasEnded = false;

  /** سرعت پخش جاری. */
  playbackRate = 1;

  /** وضعیت تمام‌صفحه (Fullscreen). */
  isFullscreen = false;

  /** آیا شیت سوییچر خوانش باز است. */
  recSheetOpen = false;

  /** آیا شیت انتخاب شعر باز است. */
  pickerOpen = false;

  /** گزینه‌های سرعت پخش. */
  readonly speedOptions = SPEED_OPTIONS;

  /** ذرات تزئینی شناور (سبک، حداکثر ۱۲ عدد). */
  readonly particles = Array.from({ length: 12 }, (_, i) => i);

  /** اندیس خوانش انتخابی (از ورودی اختیاری مسیر). */
  private recIndex = 0;

  /** شناسهٔ عددی شعر جاری برای تلاش مجدد (null یعنی شعر پیش‌فرض خانه). */
  private currentPoemId: number | null = null;

  /** مختصات افقی آغاز سوایپ. */
  private pointerStartX: number | null = null;

  /** مختصات عمودی آغاز سوایپ. */
  private pointerStartY = 0;

  /** اشتراک جاریِ دریافت داده‌ی همگام‌سازی (برای لغو هنگام تعویض خوانش/شعر). */
  private syncSub?: { unsubscribe(): void };

  @ViewChild('audio') audioRef?: ElementRef<HTMLAudioElement>;
  @ViewChild('lyrics') lyricsRef?: ElementRef<HTMLElement>;
  @ViewChildren('verseEl') verseEls?: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private readonly ganjoor: GanjoorService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /** شناسهٔ شعر از پارامتر مسیر `poem/:id/listen`. */
  @Input()
  set id(value: string | null) {
    const parsed = value !== null ? Number(value) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.currentPoemId = null;
      return;
    }
    this.currentPoemId = parsed;
    this.fetchPoem(parsed);
  }

  /** اندیس خوانش انتخابی (اختیاری، پیش‌فرض ۰). */
  @Input()
  set rec(value: string | number | null) {
    const parsed = value !== null && value !== undefined ? Number(value) : 0;
    this.recIndex = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  /**
   * اگر هیچ شناسه‌ای از مسیر تنظیم نشده باشد (صفحهٔ خانه)، شعر پیش‌فرض
   * «بشنو از نی» را با URL بارگذاری می‌کند.
   */
  ngOnInit(): void {
    if (this.currentPoemId === null && !this.poem) {
      this.fetchDefaultPoem();
    }
  }

  /** زمان باقیمانده تا پایان خوانش. */
  get remainingTime(): number {
    return Math.max(0, this.duration - this.currentTime);
  }

  /** درصد پیشرفت پخش (۰ تا ۱۰۰) برای نوار استوری‌وار. */
  get progressPercent(): number {
    if (!(this.duration > 0)) {
      return 0;
    }
    const pct = (this.currentTime / this.duration) * 100;
    return Math.min(100, Math.max(0, pct));
  }

  /** آیکون دکمهٔ پخش: پخش/توقف/پخش از ابتدا. */
  get playIcon(): string {
    if (this.hasEnded) {
      return '↻';
    }
    return this.isPlaying ? '⏸' : '▶';
  }

  /** برچسب دسترس‌پذیریِ دکمهٔ پخش. */
  get playLabel(): string {
    if (this.hasEnded) {
      return 'پخش از ابتدا';
    }
    return this.isPlaying ? 'توقف' : 'پخش';
  }

  /** تلاش مجدد واکشی شعر جاری (یا شعر پیش‌فرض خانه). */
  reload(): void {
    if (this.currentPoemId !== null) {
      this.fetchPoem(this.currentPoemId);
    } else {
      this.fetchDefaultPoem();
    }
  }

  // -------------------------------------------------------------------------
  // ناوبری استوری‌وار بین اشعار
  // -------------------------------------------------------------------------

  /** رفتن به شعر بعدی (در صورت وجود مجاورت). */
  goNextPoem(): void {
    const next = this.poem?.nextPoem;
    if (next && next.id > 0) {
      void this.router.navigate(['/poem', next.id, 'listen']);
    }
  }

  /** رفتن به شعر پیشین (در صورت وجود مجاورت). */
  goPrevPoem(): void {
    const prev = this.poem?.prevPoem;
    if (prev && prev.id > 0) {
      void this.router.navigate(['/poem', prev.id, 'listen']);
    }
  }

  /** آغاز ردیابی سوایپ. */
  onPointerDown(event: PointerEvent): void {
    // روی کنترل‌ها (نوار پخش، دکمه‌ها، اسلایدر، پیوندها) ژست را نادیده بگیر
    // تا کشیدن اسلایدر یا لمس دکمه‌ها به‌اشتباه شعر/بیت را عوض نکند.
    const el = event.target as HTMLElement | null;
    if (el && typeof el.closest === 'function') {
      if (el.closest('.player__bar, button, a, input, select')) {
        this.pointerStartX = null;
        return;
      }
    }
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
  }

  /**
   * پایان ژست:
   * - سوایپ افقی (غالب) → رفتن به شعر بعدی/پیشین.
   * - کشیدن عمودی (غالب) → جابه‌جایی بین ابیات، مانند اسکرول دستی.
   */
  onPointerUp(event: PointerEvent): void {
    if (this.pointerStartX === null) {
      return;
    }
    const dx = event.clientX - this.pointerStartX;
    const dy = event.clientY - this.pointerStartY;
    this.pointerStartX = null;

    const horizontal = Math.abs(dx) > Math.abs(dy);

    if (horizontal) {
      if (Math.abs(dx) < SWIPE_THRESHOLD) {
        return;
      }
      // سوایپ به چپ → شعر بعدی؛ سوایپ به راست → شعر پیشین.
      if (dx < 0) {
        this.goNextPoem();
      } else {
        this.goPrevPoem();
      }
      return;
    }

    // کشیدن عمودی → حرکت بین ابیات (همان رفتار اسکرول).
    if (Math.abs(dy) < SWIPE_THRESHOLD) {
      return;
    }
    if (dy < 0) {
      // کشیدن به بالا → بیت بعدی.
      this.stepVerse(1);
    } else {
      // کشیدن به پایین → بیت پیشین.
      this.stepVerse(-1);
    }
  }

  /** لغو ژست (مثلاً وقتی سیستم لمس را قطع می‌کند). */
  onPointerCancel(): void {
    this.pointerStartX = null;
  }

  /**
   * جابه‌جایی دستی بین ابیات. اگر زمان‌بندی موجود باشد به شروع بیت پرش می‌کند،
   * در غیر این صورت تنها بیت فعال و نقطهٔ کانونی را جابه‌جا می‌کند.
   */
  private stepVerse(delta: number): void {
    const last = Math.max(0, this.lyricVerses.length - 1);
    const target = Math.min(Math.max(this.currentVerseIndex + delta, 0), last);
    if (target === this.currentVerseIndex) {
      return;
    }
    if (target < this.timings.length) {
      this.seekToVerse(target);
    } else {
      this.currentVerseIndex = target;
      this.scheduleFocal();
      this.cdr.markForCheck();
    }
  }

  // -------------------------------------------------------------------------
  // سوییچر خوانش
  // -------------------------------------------------------------------------

  /** باز/بستن شیت سوییچر خوانش. */
  toggleRecSheet(): void {
    this.recSheetOpen = !this.recSheetOpen;
    this.cdr.markForCheck();
  }

  /** بستن شیت سوییچر خوانش (با کلیک روی پس‌زمینه). */
  closeRecSheet(): void {
    this.recSheetOpen = false;
    this.cdr.markForCheck();
  }

  /**
   * انتخاب یک خوانش: تعویض خوانش فعال، تعویض منبع صوت، بازنشانی زمان به صفر و
   * محاسبهٔ مجدد زمان‌بندی در نخستین `loadedmetadata` بعدی.
   */
  selectRecitation(rec: Recitation): void {
    const list = this.poem?.recitations ?? [];
    const index = list.indexOf(rec);
    this.recIndex = index >= 0 ? index : 0;
    this.recitation = rec;
    this.recSheetOpen = false;

    // بازنشانی وضعیت پخش برای خوانش جدید.
    this.timings = [];
    this.exactSync = false;
    this.currentVerseIndex = 0;
    this.currentTime = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.hasEnded = false;

    // تعویض منبع و بازنشانی عنصر صوت. اتصال [src] منبع را به‌روزرسانی می‌کند؛
    // load() اطمینان می‌دهد متادیتای جدید دوباره خوانده شود.
    const el = this.audioRef?.nativeElement;
    if (el) {
      el.currentTime = 0;
      if (typeof el.load === 'function') {
        el.load();
      }
    }
    // دریافت زمان‌بندیِ دقیقِ خوانشِ جدید.
    this.loadSync();
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------------
  // شیت انتخاب شعر
  // -------------------------------------------------------------------------

  /** باز کردن شیت انتخاب شعر. */
  openPicker(): void {
    this.pickerOpen = true;
    this.cdr.markForCheck();
  }

  /** بستن شیت انتخاب شعر. */
  closePicker(): void {
    this.pickerOpen = false;
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------------
  // رویدادهای عنصر <audio>
  // -------------------------------------------------------------------------

  /** با دریافت متادیتا، مدت‌زمان ثبت و زمان‌بندی ابیات محاسبه می‌شود. */
  onLoadedMetadata(): void {
    const el = this.audioRef?.nativeElement;
    this.duration = el && Number.isFinite(el.duration) ? el.duration : 0;
    // اگر زمان‌بندیِ دقیقِ گنجور موجود است، آن را حفظ کن؛ وگرنه تخمین بزن.
    if (!this.exactSync) {
      this.timings = computeVerseTimings(this.lyricVerses, this.duration);
    }
    // اعمال سرعت پخش انتخابی بر عنصر صوت.
    if (el) {
      el.playbackRate = this.playbackRate;
    }
    this.scheduleFocal();
    this.cdr.markForCheck();
  }

  /** در هر به‌روزرسانی زمان، بیت فعال محاسبه و به مرکز پیمایش می‌شود. */
  onTimeUpdate(): void {
    const el = this.audioRef?.nativeElement;
    if (el) {
      this.currentTime = el.currentTime;
    }
    const index = findCurrentVerseIndex(this.timings, this.currentTime);
    if (index >= 0 && index !== this.currentVerseIndex) {
      this.currentVerseIndex = index;
      this.scheduleFocal();
    } else {
      this.currentVerseIndex = Math.max(0, index);
    }
    this.cdr.markForCheck();
  }

  onPlay(): void {
    this.isPlaying = true;
    this.hasEnded = false;
    this.cdr.markForCheck();
  }

  onPause(): void {
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  onEnded(): void {
    this.isPlaying = false;
    this.hasEnded = true;
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------------
  // کنترل‌های کاربر
  // -------------------------------------------------------------------------

  /** پخش/توقف خوانش. */
  /** پخش/توقف خوانش (و پخش از ابتدا اگر به انتها رسیده باشد). */
  togglePlay(): void {
    const el = this.audioRef?.nativeElement;
    if (!el) {
      return;
    }
    if (el.paused) {
      // اگر پخش تمام شده، از ابتدا آغاز کن.
      if (this.hasEnded || el.ended) {
        el.currentTime = 0;
        this.currentTime = 0;
        this.currentVerseIndex = 0;
        this.hasEnded = false;
      }
      void el.play().catch(() => {
        /* نادیده گرفتن خطای پخش */
      });
    } else {
      el.pause();
    }
  }

  /** پرش به شروع بیت پیشین. */
  previousVerse(): void {
    const target = Math.max(0, this.currentVerseIndex - 1);
    this.seekToVerse(target);
  }

  /** پرش به شروع بیت بعدی. */
  nextVerse(): void {
    const target = Math.min(
      this.lyricVerses.length - 1,
      this.currentVerseIndex + 1,
    );
    this.seekToVerse(target);
  }

  /** پرش به زمان شروع بیتِ مشخص‌شده. */
  seekToVerse(index: number): void {
    if (index < 0 || index >= this.timings.length) {
      return;
    }
    const time = this.timings[index];
    this.applySeek(time);
  }

  /** اعمال جابه‌جایی از نوار پیشرفت با محدودسازی به [0, duration]. */
  onSeek(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    this.applySeek(raw);
  }

  /** تغییر سرعت پخش و اعمال آن بر عنصر صوت. */
  onSpeedChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.setSpeed(Number.isFinite(value) && value > 0 ? value : 1);
  }

  /** تنظیم سرعت پخش. */
  setSpeed(rate: number): void {
    this.playbackRate = rate;
    const el = this.audioRef?.nativeElement;
    if (el) {
      el.playbackRate = rate;
    }
    this.cdr.markForCheck();
  }

  /**
   * ورود/خروج از حالت تمام‌صفحه با Fullscreen API (با پشتیبانی از پیشوند webkit).
   * در محیط‌هایی که پشتیبانی نمی‌شود (مثل برخی مرورگرهای iOS) بی‌صدا نادیده
   * گرفته می‌شود؛ در آن موارد «افزودن به صفحهٔ اصلی» تجربهٔ تمام‌صفحه می‌دهد.
   */
  toggleFullscreen(): void {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => void;
    };
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    const active = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;

    if (!active) {
      const request =
        el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      if (request) {
        try {
          void request();
        } catch {
          /* نادیده گرفتن خطای عدم پشتیبانی */
        }
      }
      this.isFullscreen = true;
    } else {
      const exit =
        doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
      if (exit) {
        try {
          void exit();
        } catch {
          /* نادیده گرفتن خطا */
        }
      }
      this.isFullscreen = false;
    }
    this.cdr.markForCheck();
  }

  /** قالب‌بندی زمان به mm:ss. */
  formatTime(seconds: number): string {
    return formatTime(seconds);
  }

  /** کلید ردیابی برای *ngFor/@for ابیات. */
  trackByVOrder(_index: number, verse: Verse): number {
    return verse.vOrder;
  }

  /** آیا این بیت بلافاصله مجاور بیت فعال است (کمی روشن‌تر نمایش داده می‌شود). */
  isNear(index: number): boolean {
    return Math.abs(index - this.currentVerseIndex) === 1;
  }

  /** آیا این بیت باید نمایش داده شود: تنها بیت جاری و یک بیت قبل/بعد. */
  isVisible(index: number): boolean {
    return Math.abs(index - this.currentVerseIndex) <= 1;
  }

  /** شفافیت هر بیت: فقط بیت جاری و یک بیت قبل/بعد دیده می‌شوند؛ بقیه پنهان. */
  verseOpacity(index: number): number {
    const d = Math.abs(index - this.currentVerseIndex);
    if (d === 0) return 1;
    if (d === 1) return 0.4;
    return 0;
  }

  // -------------------------------------------------------------------------
  // کمکی‌ها
  // -------------------------------------------------------------------------

  /** اعمال زمان جدید بر عنصر صوت و وضعیت با محدودسازی. */
  private applySeek(time: number): void {
    const max = this.duration > 0 ? this.duration : Number.POSITIVE_INFINITY;
    const clamped = Math.min(Math.max(time, 0), max);
    const el = this.audioRef?.nativeElement;
    if (el) {
      el.currentTime = clamped;
    }
    this.currentTime = clamped;
    this.hasEnded = false;
    this.currentVerseIndex = Math.max(
      0,
      findCurrentVerseIndex(this.timings, clamped),
    );
    this.scheduleFocal();
    this.cdr.markForCheck();
  }

  /** زمان‌بندی به‌روزرسانی نقطهٔ کانونی پس از چیدمان DOM. */
  private scheduleFocal(): void {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.updateFocalPosition());
    } else {
      this.updateFocalPosition();
    }
  }

  /**
   * نقطهٔ کانونی: ریل ابیات را چنان جابه‌جا می‌کند که مرکزِ بیت فعال روی
   * نقطهٔ کانونی (حدود ۴۲٪ ارتفاع نمابر) بنشیند؛ بدون نیاز به اسکرول کاربر.
   * در نتیجه ابیات گذشته به بالا می‌روند و محو می‌شوند و ابیات بعدی از پایین
   * نمایان می‌گردند.
   */
  private updateFocalPosition(): void {
    const viewport = this.lyricsRef?.nativeElement;
    const els = this.verseEls?.toArray();
    const active = els?.[this.currentVerseIndex]?.nativeElement;
    if (!viewport || !active) {
      return;
    }
    const focal = viewport.clientHeight * 0.42;
    const activeCenter = active.offsetTop + active.offsetHeight / 2;
    this.trackOffset = Math.round(focal - activeCenter);
    this.cdr.markForCheck();
  }

  /** واکشی شعر بر اساس شناسهٔ عددی. */
  private fetchPoem(poemId: number): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.ganjoor.getPoem(poemId).subscribe({
      next: (poem) => this.applyPoem(poem),
      error: (err: GanjoorApiError) => this.applyError(err),
    });
  }

  /** واکشی شعر پیش‌فرض خانه («بشنو از نی») بر اساس URL. */
  private fetchDefaultPoem(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.ganjoor.getPoemByUrl(DEFAULT_POEM_URL).subscribe({
      next: (poem) => this.applyPoem(poem),
      error: (err: GanjoorApiError) => this.applyError(err),
    });
  }

  /** اعمال شعر دریافت‌شده و بازنشانی وضعیت پخش. */
  private applyPoem(poem: Poem): void {
    this.poem = poem;
    this.lyricVerses = poem.verses.filter(
      (v) => (v.text ?? '').trim().length > 0,
    );
    this.recitation = this.pickRecitation(poem.recitations);
    // بازنشانی وضعیت پخش برای شعر جدید.
    this.timings = [];
    this.exactSync = false;
    this.currentVerseIndex = 0;
    this.currentTime = 0;
    this.duration = 0;
    this.isPlaying = false;
    this.recSheetOpen = false;
    this.trackOffset = 0;
    this.hasEnded = false;
    this.loading = false;
    this.error = null;
    this.cdr.markForCheck();
    this.scheduleFocal();
    // تلاش برای دریافت زمان‌بندیِ دقیقِ همگام‌سازی از گنجور.
    this.loadSync();
  }

  /** اعمال خطای واکشی. */
  private applyError(err: GanjoorApiError): void {
    this.error = err;
    this.loading = false;
    this.cdr.markForCheck();
  }

  /** انتخاب خوانش: اندیس درخواستی در صورت اعتبار، وگرنه نخستین خوانش معتبر. */
  private pickRecitation(recitations: Recitation[]): Recitation | null {
    if (!recitations || recitations.length === 0) {
      return null;
    }
    if (this.recIndex < recitations.length) {
      return recitations[this.recIndex];
    }
    return recitations[0];
  }

  /**
   * تلاش برای دریافت زمان‌بندیِ دقیقِ همگام‌سازی از گنجور
   * (`GET /api/audio/verses/{id}`). اگر داده‌ی معتبر بود، زمان‌بندیِ تخمینی با
   * زمان‌بندیِ دقیق جایگزین می‌شود؛ در غیر این صورت تخمین (که در
   * {@link onLoadedMetadata} محاسبه می‌شود) باقی می‌ماند. خطاها بی‌صدا نادیده
   * گرفته می‌شوند تا تجربهٔ پخش مختل نشود.
   */
  private loadSync(): void {
    this.exactSync = false;
    const rec = this.recitation;
    if (!rec) {
      return;
    }
    this.syncSub?.unsubscribe();
    this.syncSub = this.ganjoor.getRecitationSync(rec.id).subscribe({
      next: (sync) => {
        if (hasUsableSync(sync)) {
          this.timings = buildTimingsFromSync(this.lyricVerses, sync);
          this.exactSync = true;
          this.currentVerseIndex = Math.max(
            0,
            findCurrentVerseIndex(this.timings, this.currentTime),
          );
          this.scheduleFocal();
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.exactSync = false;
      },
    });
  }
}
