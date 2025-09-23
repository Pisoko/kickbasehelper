import pino from 'pino';

import type { Match, Player } from '../types';

const logger = pino({ name: 'KickbaseAdapter' });

interface KickbaseResponse<T> {
  data: T;
}

export class KickbaseAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      }
    });
    if (!res.ok) {
      logger.error({ status: res.status, url }, 'Kickbase Request fehlgeschlagen');
      throw new Error(`Kickbase Request fehlgeschlagen (${res.status})`);
    }
    const json = (await res.json()) as KickbaseResponse<T> | T;
    if ('data' in (json as KickbaseResponse<T>)) {
      return (json as KickbaseResponse<T>).data;
    }
    return json as T;
  }

  async getPlayers(spieltag: number): Promise<Player[]> {
    const data = await this.request<Player[]>(`/matchday/${spieltag}/players`);
    return data;
  }

  async getMatches(spieltag: number): Promise<Match[]> {
    const data = await this.request<Match[]>(`/matchday/${spieltag}/matches`);
    return data;
  }
}
