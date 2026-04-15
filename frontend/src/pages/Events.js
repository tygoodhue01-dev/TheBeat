import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { getEventsApi } from '../services/api';
import { getMonthDayFromIsoDate } from '../utils/time';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventsApi()
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="events-page">
      <WebNavBar />
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-[3px] font-display flex items-center gap-3">
          <Calendar size={24} className="text-[#00F0FF]" /> EVENTS
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-1 mb-6">All upcoming events from The Beat 515</p>

        {loading ? (
          <div className="text-center py-16 text-[#71717a]">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-[#71717a]">No upcoming events available right now.</div>
        ) : (
          <div className="space-y-3" data-testid="events-list">
            {events.map((event, idx) => {
              const eventDate = getMonthDayFromIsoDate(event.date);
              return (
                <div
                  key={event.event_id || `${event.title}-${idx}`}
                  className="bg-[#18181b] rounded-lg border border-[rgba(255,255,255,0.1)] p-4 sm:p-5"
                  data-testid={`events-item-${idx}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-[rgba(255,0,127,0.1)] flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#FF007F] tracking-[1px]">{eventDate.monthShort}</span>
                      <span className="text-xl font-black text-white">{eventDate.day || ''}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-white">{event.title}</h2>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#a1a1aa]">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={13} className="text-[#71717a]" />
                          {event.venue || 'Venue TBA'}
                        </span>
                        {event.time ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={13} className="text-[#71717a]" />
                            {event.time} CT
                          </span>
                        ) : null}
                      </div>
                      {event.description ? (
                        <p className="text-sm text-[#a1a1aa] mt-2 leading-6">{event.description}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
