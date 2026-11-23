import { Injectable, signal } from '@angular/core';

export interface FavoritePoem {
  id: number;
  title: string;
  fullUrl: string;
  savedAt: number;
}

export interface ListeningHistoryEntry {
  id: number;
  title: string;
  fullUrl: string;
  recitationIndex: number;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: number;
}

const FAVORITES_KEY = 'molavi:favorites:v1';
const HISTORY_KEY = 'molavi:history:v1';
const MAX_HISTORY_ITEMS = 30;

@Injectable({ providedIn: 'root' })
export class PoetryLibraryService {
  readonly favorites = signal<FavoritePoem[]>(this.readStorage<FavoritePoem>(FAVORITES_KEY));
  readonly history = signal<ListeningHistoryEntry[]>(this.readStorage<ListeningHistoryEntry>(HISTORY_KEY));

  isFavorite(poemId: number): boolean {
    return this.favorites().some((poem) => poem.id === poemId);
  }

  toggleFavorite(poem: { id: number; title: string; fullUrl?: string }): boolean {
    if (!Number.isFinite(poem.id) || poem.id <= 0) {
      return false;
    }

    const exists = this.isFavorite(poem.id);
    const next = exists
      ? this.favorites().filter((item) => item.id !== poem.id)
      : [
          {
            id: poem.id,
            title: poem.title,
            fullUrl: poem.fullUrl ?? '',
            savedAt: Date.now(),
          },
          ...this.favorites(),
        ];

    this.favorites.set(next);
    this.writeStorage(FAVORITES_KEY, next);
    return !exists;
  }

  removeFavorite(poemId: number): void {
    const next = this.favorites().filter((poem) => poem.id !== poemId);
    this.favorites.set(next);
    this.writeStorage(FAVORITES_KEY, next);
  }

  recordListening(
    entry: Omit<ListeningHistoryEntry, 'updatedAt'>,
  ): void {
    if (!Number.isFinite(entry.id) || entry.id <= 0) {
      return;
    }

    const nextEntry: ListeningHistoryEntry = {
      ...entry,
      recitationIndex: Math.max(0, Math.floor(entry.recitationIndex || 0)),
      positionSeconds: Number.isFinite(entry.positionSeconds)
        ? Math.max(0, entry.positionSeconds)
        : 0,
      durationSeconds: Number.isFinite(entry.durationSeconds)
        ? Math.max(0, entry.durationSeconds)
        : 0,
      updatedAt: Date.now(),
    };

    const next = [
      nextEntry,
      ...this.history().filter((item) => item.id !== entry.id),
    ].slice(0, MAX_HISTORY_ITEMS);

    this.history.set(next);
    this.writeStorage(HISTORY_KEY, next);
  }

  clearHistory(): void {
    this.history.set([]);
    this.writeStorage(HISTORY_KEY, []);
  }

  private readStorage<T>(key: string): T[] {
    try {
      if (typeof localStorage === 'undefined') {
        return [];
      }
      const raw = localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private writeStorage<T>(key: string, value: T[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // Storage can be unavailable in private browsing or restricted contexts.
    }
  }
}
