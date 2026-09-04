export interface TelegramMessage {
  id: string;
  channel: string;
  channelTitle: string;
  authorityWeight: number;
  text: string;
  timeIso: string;
  unixTimestamp: number;
}

interface ChannelConfig {
  username: string;
  title: string;
  weight: number;
}

export const MONITORED_CHANNELS: ChannelConfig[] = [
  { username: 'kpszsu', title: 'Повітряні Сили ЗСУ (Офіційно)', weight: 1.0 },
  { username: 'vanek_nikolaev', title: 'Николаевский Ванёк (Радар)', weight: 0.95 },
  { username: 'monitorwarr', title: 'Monitor (Оперативна обстановка)', weight: 0.90 },
];

interface ChannelCache {
  messages: TelegramMessage[];
  timestamp: number;
}

const telegramCache: Record<string, ChannelCache> = {};
const TG_CACHE_TTL_MS = 20000;

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#33;/g, '!')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

export async function fetchChannelMessages(channel: ChannelConfig): Promise<{ messages: TelegramMessage[]; error?: string }> {
  const now = Date.now();
  const cached = telegramCache[channel.username];

  if (cached && (now - cached.timestamp) < TG_CACHE_TTL_MS) {
    return { messages: cached.messages };
  }

  const targetUrl = `https://t.me/s/${channel.username}`;
  const fetchUrls = [
    targetUrl,
    `https://r.jina.ai/https://t.me/s/${channel.username}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
  ];

  for (const url of fetchUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const messages: TelegramMessage[] = [];

        // Support both Telegram HTML and Markdown from Jina
        const msgRegex = /<div class="tgme_widget_message_wrap[\s\S]*?<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time datetime="([^"]+)"/g;
        let match;

        while ((match = msgRegex.exec(html)) !== null) {
          const rawText = match[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();
          const decodedText = decodeHtmlEntities(rawText);
          const timeIso = match[2];
          const unixTimestamp = new Date(timeIso).getTime();

          const id = `${channel.username}_${unixTimestamp}_${decodedText.slice(0, 15).replace(/\s+/g, '_')}`;

          if (decodedText.length > 3) {
            messages.push({
              id,
              channel: channel.username,
              channelTitle: channel.title,
              authorityWeight: channel.weight,
              text: decodedText,
              timeIso,
              unixTimestamp: isNaN(unixTimestamp) ? Date.now() : unixTimestamp
            });
          }
        }

        // If markdown from proxy (no HTML tags)
        if (messages.length === 0 && html.length > 100) {
          const lines = html.split('\n').filter(l => l.trim().length > 10 && !l.startsWith('Title:') && !l.startsWith('URL:'));
          lines.slice(-10).forEach((line, i) => {
            const clean = line.replace(/^[*\s#->]+/, '').trim();
            if (clean.length > 5) {
              messages.push({
                id: `${channel.username}_${now}_${i}`,
                channel: channel.username,
                channelTitle: channel.title,
                authorityWeight: channel.weight,
                text: clean,
                timeIso: new Date().toISOString(),
                unixTimestamp: now - (i * 60000)
              });
            }
          });
        }

        if (messages.length > 0) {
          const recent = messages.slice(-15);
          telegramCache[channel.username] = {
            messages: recent,
            timestamp: now
          };
          return { messages: recent };
        }
      }
    } catch (err: any) {
      // Try next candidate
    }
  }

  if (cached) return { messages: cached.messages, error: 'Fallback to cache' };
  return { messages: [], error: 'Could not fetch channel' };
}

export async function fetchAllTelegramFeeds(): Promise<{ messages: TelegramMessage[]; sourceStatus: Record<string, { ok: boolean; count: number; error?: string }> }> {
  const allMessages: TelegramMessage[] = [];
  const sourceStatus: Record<string, { ok: boolean; count: number; error?: string }> = {};

  const results = await Promise.allSettled(
    MONITORED_CHANNELS.map(ch => fetchChannelMessages(ch))
  );

  results.forEach((res, idx) => {
    const ch = MONITORED_CHANNELS[idx];
    if (res.status === 'fulfilled') {
      const { messages, error } = res.value;
      allMessages.push(...messages);
      sourceStatus[ch.username] = {
        ok: messages.length > 0,
        count: messages.length,
        error
      };
    } else {
      sourceStatus[ch.username] = {
        ok: false,
        count: 0,
        error: res.reason?.message || 'Rejected'
      };
    }
  });

  allMessages.sort((a, b) => b.unixTimestamp - a.unixTimestamp);

  return { messages: allMessages, sourceStatus };
}
