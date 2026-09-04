async function inspectHtml() {
  const channels = ['vanek_nikolaev', 'ePPO_app', 'monitorwarr', 'kpszsu', 'operativnoZSU'];
  
  for (const ch of channels) {
    try {
      const res = await fetch(`https://t.me/s/${ch}`);
      const html = await res.text();
      console.log(`\n=== Channel @${ch} === HTML length: ${html.length}`);
      
      // Let's inspect raw widget blocks
      const widgetBlocks = html.split('<div class="tgme_widget_message_wrap');
      console.log(`Found ${widgetBlocks.length - 1} message wrap blocks`);

      for (let i = 1; i < Math.min(widgetBlocks.length, 5); i++) {
        const block = widgetBlocks[i];
        
        // Extract text
        const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
        const timeMatch = block.match(/<time datetime="([^"]+)"/);
        
        console.log(`  Block #${i}:`);
        console.log(`    Time: ${timeMatch ? timeMatch[1] : 'NO TIME MATCH'}`);
        console.log(`    Text: ${textMatch ? textMatch[1].slice(0, 70).replace(/\n/g, ' ') : 'NO TEXT MATCH (Media/Service)'}`);
      }
    } catch (e: any) {
      console.error(`Error fetching ${ch}:`, e.message);
    }
  }
}

inspectHtml().catch(console.error);
