import React, { useState, useEffect } from 'react';
import { getScheduleApi } from '../services/api';
import WebNavBar from '../components/Navbar';
import Footer from '../components/Footer';
import { Clock } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getScheduleApi().then(d => { setSchedule(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const grouped = DAYS.reduce((acc, day) => { acc[day] = schedule.filter(s => s.day_of_week === day); return acc; }, {});

  return (
    <div data-testid="schedule-page">
      <WebNavBar />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <h1 className="text-[24px] sm:text-[28px] font-black text-white tracking-[3px] font-display">SCHEDULE</h1>
        <p className="text-sm text-[#a1a1aa] mt-1">Weekly programming for The Beat 515</p>

        {loading ? (
          <div className="text-center py-16 text-[#71717a]">Loading...</div>
        ) : schedule.length === 0 ? (
          <div className="text-center py-16 text-[#71717a]">No schedule available yet. Check back soon!</div>
        ) : (
          <div className="space-y-4 mt-6">
            {DAYS.map(day => grouped[day].length > 0 && (
              <div key={day} className="bg-[#18181b] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]" data-testid={`schedule-${day.toLowerCase()}`}>
                <div className="px-5 py-3 bg-white/[0.03] border-b border-[rgba(255,255,255,0.05)]">
                  <h3 className="text-sm font-bold text-[#00F0FF]">{day}</h3>
                </div>
                {grouped[day].map(s => (
                  <div key={s.schedule_id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border-b border-[rgba(255,255,255,0.05)] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2 text-xs text-[#71717a] sm:w-40 flex-shrink-0">
                      <Clock size={12} />
                      <span className="font-mono">{s.time_slot}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{s.show_name}</p>
                      <p className="text-xs text-[#a1a1aa]">with {s.dj_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
