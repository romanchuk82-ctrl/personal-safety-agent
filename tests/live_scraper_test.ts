import { MONITORED_CHANNELS, fetchChannelMessages, fetchAllTelegramFeeds } from '../lib/sources/telegramScraper';

async function testScraper() {
  console.log('Testing Telegram Scraper with priority for Kyiv Oblast...');
  const res = await fetchAllTelegramFeeds('Київська область', 12);
  console.log(`Total messages fetched: ${res.messages.length}`);
  console.log('Source status:');
  for (const [chan, status] of Object.entries(res.sourceStatus)) {
    console.log(`  @${chan}: ok=${status.ok}, count=${status.count}, error=${status.error || 'none'}`);
  }
  if (res.messages.length > 0) {
    console.log('\nTop 5 latest raw messages:');
    for (const m of res.messages.slice(0, 5)) {
      console.log(`  [${m.channel}] [${new Date(m.unixTimestamp).toLocaleTimeString()}]: ${m.text.slice(0, 80).replace(/\n/g, ' ')}`);
    }
  }
}

testScraper().catch(console.error);
