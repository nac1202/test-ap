import { fetchAllEvents } from './calendar.js';

export async function exportCalendarData() {
    // Export data from 2010 to present
    // Adjust start date if needed, but 2010 covers most reasonable history
    const start = new Date("2010-01-01T00:00:00Z").toISOString();
    const end = new Date().toISOString();

    try {
        const events = await fetchAllEvents(start, end);
        const text = formatEvents(events);
        const filename = `google_calendar_export_${new Date().toISOString().slice(0, 10)}.txt`;
        downloadFile(text, filename);
        return events.length;
    } catch (e) {
        throw e;
    }
}

function formatEvents(events) {
    if (!events || events.length === 0) return "予定はありませんでした。";

    return events.map(ev => {
        const start = ev.start.dateTime ? new Date(ev.start.dateTime) : new Date(ev.start.date);
        const end = ev.end.dateTime ? new Date(ev.end.dateTime) : (ev.end.date ? new Date(ev.end.date) : null);
        const isAllDay = !ev.start.dateTime;

        const dateStr = start.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            weekday: 'short'
        });

        let timeStr = '終日';
        if (!isAllDay && end) {
            timeStr = `${formatTime(start)} - ${formatTime(end)}`;
        }

        let desc = ev.description || '';

        // Attendees
        const attendees = ev.attendees ? ev.attendees.map(a => {
            return a.displayName ? `${a.displayName} (${a.email})` : a.email;
        }).join(', ') : '';

        const summary = ev.summary || '(タイトルなし)';
        const location = ev.location || '';

        return `--------------------------------------------------
日付: ${dateStr}
時間: ${timeStr}
件名: ${summary}
参加者: ${attendees}
場所: ${location}
詳細:
${desc}
`;
    }).join('\n');
}

function formatTime(date) {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function downloadFile(content, fileName) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
