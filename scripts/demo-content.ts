import { mkdir, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stringify } from 'yaml';
import { collectionSchemas, homeHeroSchema } from '../src/lib/schemas.ts';

export const demoCollections = ['events', 'news', 'resources', 'areas', 'achievements', 'supporters'] as const;
export const demoHomeHeroPath = 'content/pages/demo-home-hero.demo.json';
export const demoHomeHero = homeHeroSchema.parse({ enabled: true, image: '/media/demo-content/demo-scene-01.demo.svg', alt: 'Fictional demo illustration of a shared community studio, with a welcome table and people making things together.', focusX: 50, focusY: 50 });
type Collection = typeof demoCollections[number];
interface DemoEntry { collection: Collection; filename: string; data: Record<string, unknown>; body: string; }
const day = 24 * 60 * 60 * 1000;
const mediaBase = '/media/demo-content/';
const sampleNote = '*Fictional demo content for a populated local website preview.*';
const iso = (value: number) => new Date(value).toISOString().replace('.000Z', 'Z');
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function poster(label: string, index: number): string {
  const colors = ['#d36b9b', '#7568bd', '#479582', '#d59c47', '#668bb6', '#c67260'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="#f1e9dc"/>
  <rect x="40" y="40" width="1120" height="640" rx="48" fill="${colors[index % colors.length]}"/>
  <circle cx="930" cy="250" r="150" fill="#ffffff" opacity=".3"/>
  <path d="M100 540 Q340 280 590 540 T1080 500" fill="none" stroke="#fff9ee" stroke-width="70" stroke-linecap="round"/>
  <text x="100" y="155" fill="#171717" font-family="sans-serif" font-size="28" font-weight="700">LOCAL DEMO · COLLETTIVO ALAN TURING</text>
  <text x="100" y="325" fill="#171717" font-family="sans-serif" font-size="76" font-weight="700">${xml(label)}</text>
  <text x="100" y="625" fill="#171717" font-family="sans-serif" font-size="24">Illustration ${String(index + 1).padStart(2, '0')} · fictional preview artwork</text>
</svg>`;
}

function scene(index: number): string {
  const palettes = [['#dfcde7', '#7668b9'], ['#cce6df', '#338d78'], ['#f2dfbc', '#b58030'], ['#cadfea', '#467fb7']];
  const [background, accent] = palettes[index % palettes.length];
  const labels = ['A shared studio', 'The reading table', 'An outdoor gathering', 'A creative workshop', 'The welcome corner', 'A quiet conversation', 'A community exhibition', 'The planning room'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="${background}"/>
  <rect x="80" y="65" width="330" height="270" rx="12" fill="#fff9ee"/>
  <path d="M80 250Q190 105 300 250T410 230V335H80Z" fill="${accent}" opacity=".6"/>
  <path d="M80 200H410M245 65V335" stroke="${background}" stroke-width="14"/>
  <rect x="730" y="105" width="280" height="175" rx="12" fill="${accent}" opacity=".35"/>
  <rect x="250" y="420" width="690" height="48" rx="24" fill="${accent}"/>
  <path d="M300 465V670M875 465V670" stroke="${accent}" stroke-width="24"/>
  <g fill="#fff9ee"><rect x="400" y="375" width="100" height="35" rx="5"/><rect x="625" y="365" width="90" height="50" rx="5"/></g>
  <g fill="${accent}"><circle cx="555" cy="285" r="48"/><path d="M490 410V355Q555 300 620 355V410Z"/><circle cx="800" cy="320" r="42"/><path d="M745 415V380Q800 335 855 380V415Z"/></g>
  <text x="70" y="590" font-family="sans-serif" font-size="44" font-weight="700" fill="#171717">${labels[index % labels.length]}</text>
  <text x="70" y="645" font-family="sans-serif" font-size="24" fill="#171717">DEMO IMAGE ${index + 1} · fictional illustrated scene</text>
  </svg>`;
}

function supporterArtwork(name: string, index: number): string {
  const color = ['#ad4277', '#7668b9', '#338d78', '#b58030', '#467fb7', '#b76156'][index % 6];
  const words = name.split(' '), last = words.pop()!, first = words.join(' ');
  const marks = [
    '<path d="M90 20 110 65 160 45 138 92 180 120 130 137 136 190 90 163 44 190 50 137 0 120 42 92 20 45 70 65Z"/>',
    '<path d="M90 185C68 167 15 124 15 77C15 30 65 23 90 59C115 23 165 30 165 77C165 124 112 167 90 185Z"/>',
    '<circle cx="90" cy="100" r="70"/><path d="M15 30 165 170M15 170 165 30" stroke="#fff9ee" stroke-width="16"/>',
    '<path d="M90 15 175 165H5Z"/><circle cx="90" cy="112" r="25" fill="#fff9ee"/>',
  ];
  // No canvas rectangle: the sponsor strip should demonstrate real transparent cutouts.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="240" viewBox="0 0 640 240"><g transform="translate(8 12)" fill="${color}">${marks[index % marks.length]}</g><g font-family="sans-serif" fill="${color}"><text x="215" y="90" font-size="46" font-weight="700">${xml(first)}</text><text x="215" y="145" font-size="46" font-weight="700">${xml(last)}</text><text x="215" y="195" font-size="25">FICTIONAL DEMO PARTNER</text></g></svg>`;
}

export function createDemoContent(now = new Date()) {
  if (!Number.isFinite(now.valueOf())) throw new Error('Use a valid reference date for demo content.');
  const reference = now.valueOf(), entries: DemoEntry[] = [], assets = new Map<string, string>();
  const date = (daysAgo = 0) => new Date(reference - daysAgo * day).toISOString().slice(0, 10);
  const at = (daysFromNow: number, hour = 16) => {
    const value = new Date(reference + daysFromNow * day);
    value.setUTCHours(hour, 0, 0, 0);
    return value.valueOf();
  };
  const cover = (index: number) => `${mediaBase}demo-poster-${String(index % 10 + 1).padStart(2, '0')}.demo.svg`;
  const photo = (index: number) => `${mediaBase}demo-scene-${String(index % 8 + 1).padStart(2, '0')}.demo.svg`;
  const add = (collection: Collection, key: string, data: Record<string, unknown>, body = '') => {
    const extension = ['events', 'news', 'resources'].includes(collection) ? 'md' : 'json';
    if (collection === 'news' && data.status === 'published') {
      const index = entries.filter((entry) => entry.collection === 'news').length;
      data.sticker = index % 4 === 3 ? '' : sticker(index);
      if (data.image && index % 2 === 0) {
        data.image = photo(index + 2);
        data.imageAlt = `Fictional illustrated cover scene for ${data.title}`;
      }
      const extraPhotos = index % 4 === 0 ? 3 : index % 4 === 1 ? 2 : index % 4 === 2 && !data.image ? 1 : 0;
      data.gallery = Array.from({ length: extraPhotos }, (_, offset) => ({ image: photo(index + offset + 3), alt: `Fictional illustrated scene ${offset + 1} for ${data.title}`, caption: `Demo gallery image ${offset + 1}: another view of this fictional community story.` }));
    }
    entries.push({ collection, filename: `demo-${key}.demo.${extension}`, data, body });
  };
  const download = (filename: string, body: string) => {
    assets.set(filename, body);
    return `${mediaBase}${filename}`;
  };
  const welcomeFile = download('demo-welcome-checklist.demo.txt', 'DEMO WELCOME CHECKLIST\n\nFictional material for a local website preview.\n\n- Find the event information.\n- Choose an activity or come along to listen.\n- Say hello to the welcome team.\n- Share feedback in your own time.\n');
  const plannerFile = download('demo-event-planner.demo.md', '# Demo event planner\n\nFictional material for a local website preview.\n\n## Before the event\n\n- Choose a clear title and description.\n- Share venue and accessibility information.\n- Set aside time for introductions and breaks.\n\n## After the event\n\n- Gather feedback.\n- Share a short recap.\n');
  const notesFile = download('demo-reading-notes.demo.txt', 'DEMO READING NOTES\n\nFictional material for a local website preview.\n\nTitle:\nIdeas to discuss:\nQuestions to bring to the group:\nConnections to other readings:\n');
  const artworkLabels = ['Welcome together', 'Community studio', 'Making space', 'Read & reflect', 'Creative evening', 'Small steps', 'Shared stories', 'Learning together', 'Meet & connect', 'A new chapter'];
  artworkLabels.forEach((label, index) => assets.set(`demo-poster-${String(index + 1).padStart(2, '0')}.demo.svg`, poster(label, index)));
  for (let index = 0; index < 8; index++) assets.set(`demo-scene-${String(index + 1).padStart(2, '0')}.demo.svg`, scene(index));
  assets.set('demo-calendar-sticker.demo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><path d="M120 15 146 70 205 45 180 105 230 135 170 155 175 215 120 185 65 215 70 155 10 135 60 105 35 45 94 70Z" fill="#d36b9b"/><circle cx="120" cy="120" r="48" fill="#fff9ee"/><text x="120" y="130" text-anchor="middle" font-family="sans-serif" font-size="27" font-weight="700">DEMO</text></svg>');
  assets.set('demo-heart-sticker.demo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><path d="M120 220C95 198 15 142 15 78C15 15 90 6 120 56C150 6 225 15 225 78C225 142 145 198 120 220Z" fill="#7568bd"/><text x="120" y="123" text-anchor="middle" font-family="sans-serif" font-size="27" font-weight="700" fill="#fff9ee">DEMO</text></svg>');
  assets.set('demo-flower-sticker.demo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><g fill="#479582"><circle cx="120" cy="52" r="42"/><circle cx="181" cy="87" r="42"/><circle cx="181" cy="157" r="42"/><circle cx="120" cy="192" r="42"/><circle cx="59" cy="157" r="42"/><circle cx="59" cy="87" r="42"/></g><circle cx="120" cy="122" r="55" fill="#fff9ee"/><text x="120" y="132" text-anchor="middle" font-family="sans-serif" font-size="27" font-weight="700" fill="#171717">DEMO</text></svg>');
  assets.set('demo-bubble-sticker.demo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><path d="M30 30H210V170H145L80 220V170H30Z" fill="#d59c47"/><text x="120" y="110" text-anchor="middle" font-family="sans-serif" font-size="29" font-weight="700" fill="#171717">DEMO</text></svg>');
  assets.set('demo-ticket-sticker.demo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><path d="M20 55H220V95Q170 120 220 145V185H20V145Q70 120 20 95Z" fill="#668bb6"/><path d="M70 65V175" stroke="#fff9ee" stroke-width="4" stroke-dasharray="8 8"/><text x="145" y="130" text-anchor="middle" font-family="sans-serif" font-size="27" font-weight="700" fill="#fff9ee">DEMO</text></svg>');
  assets.set('demo-bolt-sticker.demo.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><path d="M135 10 35 140H100L75 230 215 85H140Z" fill="#c67260"/><text x="124" y="130" text-anchor="middle" font-family="sans-serif" font-size="25" font-weight="700" fill="#fff9ee">DEMO</text></svg>');
  const sticker = (index: number) => `${mediaBase}${['demo-calendar-sticker', 'demo-heart-sticker', 'demo-flower-sticker', 'demo-bubble-sticker', 'demo-ticket-sticker', 'demo-bolt-sticker'][index % 6]}.demo.svg`;

  const eventSpecs = [
    { key: 'soon-coffee', title: 'Coffee & conversation — starting soon', days: 0, minutes: 20, variant: 'none', summary: 'A near-term demo event for watching the minute and second countdown boxes.' },
    { key: 'next-creative-meetup', title: 'The next creative meetup', days: 0, minutes: 240, variant: 'open', summary: 'An event a few hours away, with open registration and a separate transparent sticker.' },
    { key: 'tomorrow-social', title: 'A relaxed community social', days: 1, minutes: 1800, variant: 'none', summary: 'A gathering thirty hours away, demonstrating the day and hour countdown digits.' },
    { key: 'welcome-evening', title: 'Welcome evening', days: 2, variant: 'open', summary: 'Meet new people, explore the community, and find an activity that feels right for you.' },
    { key: 'open-studio', title: 'Open studio', days: 0, variant: 'ongoing', summary: 'A relaxed drop-in space for making, chatting, and seeing what others are working on.' },
    { key: 'board-game-night', title: 'Board-game night', days: 4, variant: 'none', summary: 'An evening of cooperative games, friendly introductions, and easy conversation.' },
    { key: 'reading-circle', title: 'A reading circle for curious minds', days: 6, variant: 'scheduled', summary: 'Bring a question, a favourite passage, or simply an interest in listening.' },
    { key: 'print-workshop', title: 'Make your own mini-zine', days: 8, variant: 'open', summary: 'Turn a small idea into a folded zine using words, drawings, and collage.' },
    { key: 'film-evening', title: 'Film evening and discussion', days: 10, variant: 'closed', summary: 'Share a film and a thoughtful conversation in a welcoming group.' },
    { key: 'city-walk', title: 'A slow walk through the city', days: 12, variant: 'cancelled', summary: 'A sample cancelled event showing how a cancellation remains discoverable.' },
    { key: 'community-weekend', title: 'Community weekend: two days of small creative adventures', days: 14, variant: 'none', summary: 'A multi-day programme of making, meeting, and spending time together.' },
    { key: 'skill-share', title: 'A little skill-share', days: 18, variant: 'none', summary: 'Short, friendly introductions to hobbies and skills from people in the group.' },
    { key: 'next-month-meetup', title: 'Next month’s community meetup', days: 35, variant: 'scheduled', summary: 'A future event to explore when moving to another month in the calendar.' },
    { key: 'zine-launch', title: 'Community zine launch', days: -4, variant: 'past', summary: 'A past creative evening with a recap, a gallery, and downloadable materials.' },
    { key: 'information-fair', title: 'A friendly information fair', days: -12, variant: 'past', summary: 'A look back at a relaxed afternoon of questions, introductions, and shared ideas.' },
    { key: 'volunteer-meetup', title: 'Volunteer meetup', days: -24, variant: 'past', summary: 'A past planning session about contributing in small, manageable ways.' },
    { key: 'accessible-workshop', title: 'Designing a more welcoming workshop', days: -45, variant: 'past', summary: 'Notes and materials from a sample workshop on clearer event information.' },
    { key: 'craft-table', title: 'The community craft table', days: 21, variant: 'none', summary: 'Bring a project or try a new craft alongside a friendly group.' },
    { key: 'meet-the-areas', title: 'Meet the Areas', days: 28, variant: 'deadline', summary: 'An upcoming event whose example registration deadline has already passed.' },
    ...['Collage corner', 'Story exchange', 'Listening lounge', 'Sketchbook meetup'].map((title, index) => ({ key: `busy-day-${index + 1}`, title, days: 5, variant: 'none', summary: 'One of four events on the same date, to try the calendar’s stacked stickers.', hour: 12 + index * 2 })),
    ...['Photography walk', 'Poetry table', 'Queer history discussion', 'Drawing club', 'Community kitchen', 'Listening workshop', 'Games and introductions', 'Mini-zine exchange', 'Open rehearsal', 'Accessible design studio', 'Reading picnic', 'Ideas for the next season'].map((title, index) => ({ key: `season-session-${index + 1}`, title, days: index < 6 ? -7 * (index + 1) : 7 * (index - 4), variant: index < 6 ? 'past' : 'none', summary: `A fictional ${title.toLowerCase()} session to fill the chronological agenda across several weeks and months.`, hour: 12 + index % 5 })),
    { key: 'future-festival', title: 'A future community festival', days: 105, variant: 'none', summary: 'A longer-range event showing that the agenda and countdowns can handle dates more than one hundred days away.' },
  ];
  eventSpecs.forEach((spec, index) => {
    const start = spec.variant === 'ongoing' ? reference - 30 * 60 * 1000 : 'minutes' in spec && typeof spec.minutes === 'number' ? reference + spec.minutes * 60000 : at(spec.days, 'hour' in spec ? spec.hour : 16);
    const end = spec.key === 'community-weekend' ? start + 27 * 60 * 60 * 1000 : start + 2 * 60 * 60 * 1000;
    const registered = ['open', 'scheduled', 'closed', 'cancelled', 'deadline'].includes(spec.variant);
    add('events', spec.key, {
      title: `Demo: ${spec.title}`, slug: `demo-${spec.key}`, status: 'published', summary: spec.summary,
      start: iso(start), end: iso(end), location: index % 4 === 0 ? 'Demo community room, Turin' : 'Demo student common room',
      venueUrl: index % 5 === 0 ? 'https://example.org/demo-venue' : '',
      audience: 'Everyone is welcome in this fictional event, including people visiting for the first time.',
      language: index % 3 === 0 ? 'English and Italian' : 'English', cost: index % 4 === 0 ? 'Free (demo)' : '',
      accessibility: 'Demo information: a step-free entrance, seating, breaks, and a quiet corner. Contact the team to discuss what would help you join.',
      attendance: registered ? 'This demo uses an example.org registration destination.' : 'Drop in at any point. You can take part, listen, or simply spend some time with the group.',
      registrationRequired: registered, registrationLabel: 'Try the demo registration link',
      registrationUrl: registered ? `https://example.org/demo-registration?event=${spec.key}` : '',
      registrationOpens: registered ? iso(spec.variant === 'scheduled' ? reference + 2 * day : reference - 10 * day) : '',
      registrationCloses: registered ? iso(spec.variant === 'deadline' ? reference - 60 * 60 * 1000 : start - 60 * 60 * 1000) : '',
      manuallyClosed: spec.variant === 'closed', cancelled: spec.variant === 'cancelled',
      cancellationNotice: spec.variant === 'cancelled' ? 'This fictional event has been cancelled. The original details remain here as an example of the cancellation layout.' : '',
      image: index % 5 === 4 ? '' : index % 2 ? cover(index) : photo(index), imageAlt: index % 5 === 4 ? '' : `Fictional preview illustration for ${spec.title}`,
      calendarImage: index % 11 === 9 ? sticker(index) : '',
      sticker: index % 11 === 9 || index % 11 === 10 ? '' : sticker(index),
      recap: spec.variant === 'past' ? 'In this fictional recap, people shared ideas, tried something new, and left with suggestions for the next gathering.\n\nA longer follow-up records what worked well and what we would change next time.' : '',
      gallery: spec.variant === 'past' || index % 4 === 0 ? [3, 4, 5].map((offset, photoIndex) => ({ image: photo(index + offset), alt: `Fictional gallery scene ${photoIndex + 1} for ${spec.title}`, caption: 'An illustrated image from this fictional event programme.' })) : [],
      materials: spec.variant === 'past' ? [{ title: 'Demo planning notes', url: plannerFile }, { title: 'Explore the demo welcome pack', url: '/resources/demo-welcome-pack-guide/' }] : [],
      seo: { title: `Demo event: ${spec.title}`, description: spec.summary, image: index % 4 === 3 ? '' : cover(index) },
    }, `${sampleNote}\n\n## What to expect\n\n${spec.summary} This sample programme combines an informal welcome with time to join an activity at your own pace.\n\nThere is no single way to take part. You can come with a friend, arrive on your own, or start by listening. The welcome team introduces the space and helps people find a comfortable place to begin.\n\n## The programme\n\n| Part | What happens |\n| --- | --- |\n| Welcome | Introductions and a short explanation of the space |\n| Main activity | A shared activity with room for different interests |\n| Break | Time to pause, chat, or use the quiet corner |\n| Closing | Share ideas for the next gathering |\n\n### Before you come\n\n- Read the time and location above.\n- Bring curiosity rather than any particular experience.\n- Choose the level of participation that suits you.\n\n> A good gathering leaves room for different ways of belonging.\n\nYou can also read the [demo welcome pack](/resources/demo-welcome-pack-guide/) or explore [ways to contribute](/join/).`);
  });
  add('events', 'draft-event', { title: 'Demo: An unfinished event', slug: 'demo-draft-event', status: 'draft' }, 'This incomplete draft should stay out of every public listing.');
  add('events', 'draft-programme', { title: 'Demo: A programme still being planned', slug: 'demo-draft-programme', status: 'draft', summary: 'A hidden draft with a short outline.' }, '## Working outline\n\nThis demo draft is intentionally unpublished.');

  const postGroups = {
    news: [
      ['a-season-of-small-gatherings', 'A season of small gatherings', 'A look at the conversations and activities bringing people together.'],
      ['volunteer-welcome', 'A new volunteer welcome session', 'There are many ways to contribute, including small tasks and occasional help.'],
      ['community-notebook', 'Inside the community notebook', 'Ideas, questions, and plans collected from a month of shared conversations.'],
      ['creative-corner', 'A new creative corner', 'A quiet place to draw, write, fold a zine, or try something unfamiliar.'],
      ['reading-list', 'What we have been reading', 'Short recommendations and questions for the next reading circle.'],
      ['meeting-feedback', 'What we learned from your feedback', 'A few small changes inspired by the ways people use our shared spaces.'],
      ['new-resource-collection', 'A growing collection of useful resources', 'Clearer guides and practical materials for newcomers and volunteers.'],
      ['monthly-roundup', 'The monthly community roundup', 'Stories from recent gatherings and a look ahead to the next month.'],
      ['studio-notes', 'Notes from the shared studio', 'Small creative projects, new ideas, and a few snapshots from an open studio session.'],
      ['welcome-table-update', 'A fresh start at the welcome table', 'Newcomers helped us try a gentler arrival and clearer introductions.'],
      ['autumn-projects', 'Projects for the next season', 'A fictional preview of the reading, making, and community sessions ahead.'],
      ['community-exhibition', 'Scenes from a community exhibition', 'Illustrated highlights from a sample exhibition built by volunteers.'],
    ],
    article: [
      ['first-community-event', 'Going to your first community event', 'Small ways to make arriving somewhere new feel a little easier.'],
      ['making-room-for-listening', 'Making room for listening', 'Why conversation also needs pauses, patience, and different ways to participate.'],
      ['belonging-takes-time', 'Belonging can take time', 'A reflection on returning, finding familiar faces, and feeling at home gradually.'],
      ['welcoming-event-design', 'What makes an event feel welcoming?', 'Clear information, thoughtful pacing, and space for different needs.'],
      ['small-volunteer-tasks', 'The value of small volunteer tasks', 'A few manageable contributions can make a real difference to a shared project.'],
      ['writing-with-care', 'Writing community information with care', 'A practical approach to clear wording, useful details, and friendly invitations.'],
      ['shared-creativity', 'Creativity is something we can share', 'Trying new things together without needing to be an expert.'],
      ['a-longer-conversation', 'A longer conversation about creating spaces where people can arrive, participate, and belong in their own way', 'A longer title and richer article layout for testing narrow screens and readable paragraphs.'],
      ['gentler-introductions', 'A gentler way to introduce ourselves', 'Simple questions and shared activities can take the pressure off a first conversation.'],
      ['making-a-zine', 'Making a zine from a small idea', 'A fictional illustrated story about turning notes and sketches into a shared publication.'],
      ['quiet-participation', 'Quiet participation is participation', 'There is room for observing, listening, making, and returning at your own pace.'],
      ['shared-planning', 'Planning a project together', 'Clear tasks and small decisions can make a shared project easier to begin.'],
    ],
    announcement: [
      ['next-meetup', 'The next community meetup', 'A simple invitation to spend an evening meeting people and exchanging ideas.'],
      ['call-for-zine-contributions', 'Contribute to a community zine', 'Send a drawing, a short text, a question, or an idea for a shared publication.'],
      ['reading-circle-invitation', 'An invitation to the reading circle', 'No preparation is needed to join this fictional discussion session.'],
      ['volunteer-taster', 'Try a volunteer taster session', 'Explore the Areas and discover how small contributions fit together.'],
      ['feedback-invitation', 'Share an idea for our next gathering', 'A short call for suggestions about activities, formats, and meeting spaces.'],
      ['resource-update', 'New demo guides and downloadable materials', 'Browse the populated resources page to see guides, external links, and files.'],
      ['creative-studio-invitation', 'Join the next open studio', 'Bring a sketchbook, a question, or simply an interest in spending time together.'],
      ['exhibition-call', 'A call for exhibition ideas', 'Share an illustration, a short text, or a small creative project for this fictional exhibition.'],
      ['new-season-programme', 'The next season of community sessions', 'The sample calendar now includes gatherings across several months.'],
      ['welcome-volunteers', 'Help at a welcome table', 'Try a manageable task alongside another volunteer at this fictional event.'],
    ],
  };
  for (const [category, topics] of Object.entries(postGroups)) topics.forEach(([key, title, summary], index) => {
    add('news', key, { title: `Demo: ${title}`, slug: `demo-${key}`, status: 'published', category, summary, date: date(index * 3 + (category === 'article' ? 2 : 0)), author: ['Demo editorial team', 'Demo writer Alex', 'Demo writer Sam'][index % 3], image: index % 3 === 2 ? '' : cover(index + 2), imageAlt: index % 3 === 2 ? '' : `Abstract demo illustration for ${title}` }, `${sampleNote}\n\n## ${title}\n\n${summary} In this fictional story, a small group begins with a simple question: what would help people feel more comfortable joining in?\n\nThe answer is not one big gesture. It is a collection of useful details, friendly introductions, and opportunities to return. Some people enjoy talking straight away; others want to observe before deciding how to participate.\n\n## A few ideas to explore\n\n- Share the important information in plain language.\n- Offer more than one way to take part.\n- Leave time for breaks and informal conversation.\n- Listen to feedback without expecting everyone to have the same experience.\n\n### Small changes, shared ownership\n\nA welcome table, a clear programme, and a quieter corner are modest ideas. Together, they can change how a gathering feels. The work becomes easier when people can choose a small task and see how it contributes to the whole.\n\n> Community grows through the ordinary things people do for one another.\n\n| Idea | A small first step |\n| --- | --- |\n| Clearer information | Write a short introduction and answer common questions |\n| A gentler arrival | Explain where to go and who can help |\n| Shared participation | Offer an activity, a conversation, and room to listen |\n\n## Keep the conversation going\n\nThis example leaves room for further paragraphs, links, and reflections as a real article develops. Try the [demo welcome evening](/events/demo-welcome-evening/), browse [resources](/resources/), or explore [ways to contribute](/join/).`);
  });
  const milestoneTitles = ['A shared welcome pack', 'Our first open studio weekend', 'A new chapter of monthly gatherings', 'Room for everyone: quieter spaces, clearer information, and more ways to join', 'A volunteer buddy network', 'Our first community zine', 'A student-led reading circle', 'A shared creative exhibition', 'Introducing accessible event checklists', 'A new community newsletter', 'The first collaborative workshop', 'Beginning a shared journey'];
  milestoneTitles.push('A first community photography walk', 'Opening a shared planning room', 'A new collection of volunteer resources', 'A creative showcase built together');
  milestoneTitles.forEach((title, index) => add('news', `milestone-${index + 1}`, {
    title: `Demo: ${title}`, slug: `demo-milestone-${index + 1}`, status: 'published', category: 'milestone',
    summary: `The fictional story behind ${title.charAt(0).toLowerCase() + title.slice(1)}.`, date: date(index * 2 + 1), milestoneDate: date(index * 140 + 14), author: 'Demo community storytellers', image: index % 3 === 1 ? '' : cover(index + 4), imageAlt: index % 3 === 1 ? '' : `Demo milestone illustration: ${title}`,
  }, `${sampleNote}\n\n## How it began\n\nThis fictional milestone started with people sharing an idea and deciding to try it together. A first conversation became a small plan, and that plan created a new opportunity to meet, contribute, and learn.\n\n## The people and the process\n\nThere was space for several kinds of contribution: organising a practical detail, designing a poster, writing a short introduction, or making sure a newcomer had someone to speak to.\n\n- We began with a manageable first step.\n- We invited feedback from the group.\n- We adjusted the idea as people joined in.\n\n## What came next\n\nThe fictional experience gave the group a starting point for later projects. The useful part was not only the finished activity, but also learning how to share decisions and leave room for different perspectives.\n\nReturn to [the milestone timeline](/milestones/) to explore the other chapters of this demo journey.`));
  for (const category of ['news', 'article', 'announcement', 'milestone']) add('news', `draft-${category}`, { title: `Demo: Unpublished ${category}`, slug: `demo-draft-${category}`, status: 'draft', category }, 'This sample draft stays hidden, including from the milestone timeline.');

  const resourceGuides = [
    ['welcome-pack-guide', 'A newcomer’s welcome pack', 'A friendly starting point for joining a first gathering and finding your way around.'],
    ['event-information-guide', 'Reading event information', 'A sample guide to dates, venues, registration, and practical details.'],
    ['volunteer-guide', 'Finding a small way to contribute', 'Examples of manageable tasks and different kinds of volunteer involvement.'],
    ['group-conversation-guide', 'Making space in a group conversation', 'Thoughtful prompts for listening, introductions, and shared participation.'],
    ['zine-making-guide', 'Your first mini-zine', 'A simple sample project for testing a longer illustrated resource page.'],
    ['clear-writing-guide', 'Writing a clear community invitation', 'A checklist for useful information and friendly, readable language.'],
    ['coming-soon-guide', 'A guide we are still preparing', 'An approved short introduction to a resource whose full text is not yet published.'],
  ];
  resourceGuides.push(['photography-guide', 'A community photography checklist', 'A fictional checklist for preparing a creative walk and sharing its illustrated recap.'], ['project-planning-guide', 'A small shared-project workbook', 'A sample guide to choosing tasks, planning breaks, and keeping useful notes.']);
  resourceGuides.forEach(([key, title, summary], index) => add('resources', key, {
    title: `Demo: ${title}`, slug: `demo-${key}`, summary, status: index === 6 ? 'preview' : 'published', kind: 'guide', order: index + 10, provider: 'Demo community resource team', checked: date(index + 1), image: index % 2 === 0 ? cover(index + 1) : '', imageAlt: index % 2 === 0 ? `Abstract illustration for the demo resource ${title}` : '', url: index === 1 ? 'https://example.org/demo-information' : '',
  }, `${sampleNote}\n\n## Start here\n\n${summary} This example shows how a full resource can combine a short overview, practical steps, and links to other information.\n\n## A few useful steps\n\n1. Read the introduction and decide what information you need.\n2. Look for the date, destination, or practical detail that answers your question.\n3. Take one small step rather than trying to do everything at once.\n4. Return to the resource when you want to explore further.\n\n### Before a gathering\n\nClear information can make arriving easier. In this fictional example, the group explains the space, the programme, and the ways people can take part.\n\n| Question | What a useful guide explains |\n| --- | --- |\n| Where do I go? | A clearly named venue or online destination |\n| What happens first? | A welcome, an introduction, and time to settle in |\n| Can I just listen? | The different ways to participate |\n\n## Keep this handy\n\nYou can open the [demo welcome checklist](${welcomeFile}) or return to [all resources](/resources/).\n\nFor a real question about the community, use the [Contact page](/contact/).`));
  ['Shared reading library', 'Student community directory', 'Creative project inspiration', 'A preview of an external collection', 'A fictional archive of community projects', 'Sample creative workshop directory'].forEach((title, index) => add('resources', `external-${index + 1}`, { title: `Demo: ${title}`, slug: `demo-external-${index + 1}`, status: index === 3 ? 'preview' : 'published', summary: `A sample external resource about ${title.toLowerCase()}.`, kind: 'external', order: 30 + index, provider: `Demo partner ${index + 1}`, checked: date(index + 2), url: `https://example.org/demo-resources/${index + 1}` }, `${sampleNote}\n\n## About this collection\n\nThis fictional resource page shows where a fuller description, provider details, and an external destination appear. The outgoing link uses example.org so you can try the layout without a real partner service.\n\n## What you might find\n\n- A collection of introductory materials.\n- Ideas to explore at your own pace.\n- Further reading and related projects.`));
  [
    { key: 'welcome-checklist', title: 'A printable welcome checklist', summary: 'A small example download with a few prompts for arriving at a first gathering.', file: welcomeFile },
    { key: 'event-planning-kit', title: 'A simple event planning kit', summary: 'A Markdown download with a short programme and an after-event checklist.', file: plannerFile },
    { key: 'reading-notes', title: 'Reading-circle notes template', summary: 'A sample text download for collecting questions and ideas during a discussion.', file: notesFile },
    { key: 'volunteer-checklist', title: 'A volunteer-session checklist', summary: 'A second download example using the demo welcome material.', file: welcomeFile },
    { key: 'shared-project-notes', title: 'Shared-project planning notes', summary: 'A downloadable outline for a small fictional community project.', file: plannerFile },
  ].forEach((item, index) => add('resources', item.key, { title: `Demo: ${item.title}`, slug: `demo-${item.key}`, summary: item.summary, file: item.file, status: index === 2 ? 'preview' : 'published', kind: 'file', order: 40 + index, provider: 'Demo materials team', checked: date(3) }, `${sampleNote}\n\n## Using this material\n\n${item.summary} This fictional resource demonstrates the detail view for a downloadable file.\n\nThe file is stored locally with the other demo media. Open the download below to see a small example of its contents.`));
  add('resources', 'draft-guide', { title: 'Demo: A hidden guide draft', slug: 'demo-draft-guide', status: 'draft', kind: 'guide' }, 'This resource draft should not have a public page.');
  add('resources', 'draft-file', { title: 'Demo: A download still in preparation', slug: 'demo-draft-file', status: 'draft', kind: 'file' });

  const areaNames = ['Creative studio', 'Research & listening', 'Peer welcome', 'Workshops', 'Access & inclusion', 'Digital projects', 'Storytelling & photography', 'Community projects'];
  areaNames.forEach((name, index) => add('areas', `area-${index + 1}`, { name: `Demo: ${name}`, order: 10 + index, visible: true, description: `The fictional ${name.toLowerCase()} Area brings together people who want to develop a shared idea at a manageable pace.\n\nMembers can help plan activities, collect suggestions, and support other Areas when a project needs an extra pair of hands.`, contribute: 'Bring a question, try a small task, or pair up with someone who has worked on a similar project. You can choose your level of involvement as you go.' }));
  add('areas', 'area-hidden', { name: 'Demo: A hidden Area', order: 99, visible: false, description: 'This Area tests the hidden visibility state.' });
  ['Creating a shared welcome pack', 'Starting a regular reading circle', 'Making a community zine together', 'Introducing quieter corners at gatherings', 'Sharing an event planning checklist', 'Building a volunteer buddy network', 'Opening a shared creative studio', 'Collecting useful volunteer resources', 'Trying a community photography walk', 'Preparing an illustrated exhibition'].forEach((title, index) => add('achievements', `achievement-${index + 1}`, { text: `**Demo:** ${title} — a fictional example of a small project built through shared contributions.`, order: 10 + index, published: true, verification: 'confirmed', editorNotes: 'Confirmed only as fictional local demo content; not a historical claim about the association.' }));
  add('achievements', 'achievement-pending', { text: 'Demo: An unverified milestone that should stay hidden.', order: 90, published: true, verification: 'pending', editorNotes: 'A demo of the existing verification gate.' });
  add('achievements', 'achievement-unpublished', { text: 'Demo: A confirmed but unpublished achievement.', order: 91, published: false, verification: 'confirmed' });
  const supporterNames = ['Prism Studio', 'Open Pages Library', 'Common Ground Collective', 'Mosaic Arts Workshop', 'The Welcome Table', 'Shared Horizons', 'Rainbow Print Lab', 'Everyday Archive', 'Studio Without Walls', 'Paper Lanterns', 'Community Canvas', 'Open Door Projects'];
  supporterNames.forEach((name, index) => {
    const filename = `demo-supporter-${index + 1}.demo.svg`;
    assets.set(filename, supporterArtwork(name, index));
    add('supporters', `supporter-${index + 1}`, { name: `Demo: ${name}`, website: `https://example.org/demo-partners/${index + 1}`, logo: `${mediaBase}${filename}`, logoAlt: `Logo for the fictional demo partner ${name}`, relationship: `A fictional supporting organisation used to preview the supporter section. ${name} illustrates how a partner description and website link fit alongside an optional logo.`, order: index + 1, visible: true });
  });
  add('supporters', 'supporter-hidden', { name: 'Demo: A hidden supporter', website: 'https://example.org/demo-hidden-partner', visible: false, order: 99 });
  for (const entry of entries) collectionSchemas[entry.collection].parse(entry.data);
  return { entries, assets, homeHero: demoHomeHero };
}

async function filesIfPresent(path: string) {
  try { return await readdir(path, { withFileTypes: true }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function clearDemoContent(root = resolve(import.meta.dirname, '..')) {
  let records = 0, assets = 0;
  for (const collection of demoCollections) {
    const directory = join(root, 'content', collection);
    for (const file of await filesIfPresent(directory)) if (file.isFile() && /^demo-[a-z0-9-]+\.demo\.(md|json)$/.test(file.name)) {
      await unlink(join(directory, file.name));
      records++;
    }
  }
  await unlink(join(root, demoHomeHeroPath)).then(() => { records++; }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
  const directory = join(root, 'public', 'media', 'demo-content');
  for (const file of await filesIfPresent(directory)) if (file.isFile() && /^demo-[a-z0-9-]+\.demo\.(svg|txt|md)$/.test(file.name)) {
    await unlink(join(directory, file.name));
    assets++;
  }
  try { await rmdir(directory); }
  catch (error) { if (!['ENOENT', 'ENOTEMPTY'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error; }
  return { records, assets };
}

export async function seedDemoContent(root = resolve(import.meta.dirname, '..'), now = new Date()) {
  const demo = createDemoContent(now);
  await clearDemoContent(root);
  for (const collection of demoCollections) await mkdir(join(root, 'content', collection), { recursive: true });
  const media = join(root, 'public', 'media', 'demo-content');
  await mkdir(media, { recursive: true });
  for (const [filename, source] of demo.assets) await writeFile(join(media, filename), source);
  for (const entry of demo.entries) {
    const source = entry.filename.endsWith('.md') ? `---\n${stringify(entry.data)}---\n\n${entry.body}\n` : `${JSON.stringify(entry.data, null, 2)}\n`;
    await writeFile(join(root, 'content', entry.collection, entry.filename), source);
  }
  await mkdir(join(root, 'content/pages'), { recursive: true });
  await writeFile(join(root, demoHomeHeroPath), `${JSON.stringify(demo.homeHero, null, 2)}\n`);
  return demo;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, flag, value, ...extra] = process.argv.slice(2);
  if (!['seed', 'clear'].includes(command ?? '') || (flag && (command !== 'seed' || flag !== '--date' || !value)) || extra.length) {
    throw new Error('Usage: npm run demo:seed [-- --date YYYY-MM-DD] or npm run demo:clear');
  }
  if (command === 'clear') {
    const removed = await clearDemoContent();
    console.log(`Removed ${removed.records} demo records and ${removed.assets} demo assets. Original content is preserved.`);
  } else {
    const now = value ? new Date(`${value}T12:00:00Z`) : new Date();
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(now.valueOf()) || now.toISOString().slice(0, 10) !== value)) throw new Error('Use a real reference date in YYYY-MM-DD format.');
    const demo = await seedDemoContent(undefined, now);
    console.log(`Created ${demo.entries.length} git-ignored collection records, one Home hero preview configuration, and ${demo.assets.size} local demo assets, relative to ${now.toISOString()}.`);
    for (const collection of demoCollections) console.log(`  ${collection}: ${demo.entries.filter((entry) => entry.collection === collection).length}`);
    console.log('Run npm run dev to explore the populated site, or rebuild before using npm run preview.');
  }
}
