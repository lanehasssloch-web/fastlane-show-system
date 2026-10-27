'use client';

import { useEffect, useRef, useState } from 'react';
import { Segment, SegmentAudio } from '@/lib/types';

export type StudioSegment = Segment & { audio: SegmentAudio[] };
type Props = {
  segments: StudioSegment[];
  startId: string;
  onClose: () => void;
  onCue: (cue: SegmentAudio) => void;
  activeCueId: string | null;
  onStopCue: () => void;
};

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span aria-label="Current time">{time}</span>;
}

export function Teleprompter({ segments, startId, onClose, onCue, activeCueId, onStopCue }: Props) {
  const [index, setIndex] = useState(Math.max(0, segments.findIndex((s) => s.id === startId)));
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const current = segments[index];
  const fontSize = current?.presenter_settings_json?.fontSize ?? 34;
  const scrollSpeed = current?.presenter_settings_json?.scrollSpeed ?? 20;
  const title = current?.title?.trim() || 'Untitled segment';

  useEffect(() => {
    setPlaying(false);
    setElapsed(0);
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [index]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null && scroller.current) {
        // 20 on the speed slider is roughly 40 pixels per second.
        scroller.current.scrollTop += Math.max(0, now - last) * (scrollSpeed * 2 / 1000);
      }
      last = now;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, scrollSpeed, index]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'SELECT' || target?.tagName === 'BUTTON') return;
      if (event.key === 'Escape') { event.preventDefault(); onStopCue(); onClose(); }
      if (event.code === 'Space') { event.preventDefault(); setPlaying((v) => !v); }
      if (event.key === 'ArrowRight') setIndex((v) => Math.min(segments.length - 1, v + 1));
      if (event.key === 'ArrowLeft') setIndex((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose, onStopCue, segments.length]);

  if (!current) return null;
  const duration = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0c1118] text-white" role="dialog" aria-label="On-air presenter">
      <header className="flex flex-wrap items-center gap-2 border-b border-white/15 bg-[#1b2530] px-3 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-400">FastLane Studio · On Air</p>
          <h2 className="truncate text-lg font-bold sm:text-xl">{index + 1}/{segments.length} · {title}</h2>
        </div>
        <div className="hidden text-right text-sm text-slate-300 sm:block"><Clock /><div>Elapsed {duration}</div></div>
        <button type="button" onClick={() => setPlaying((p) => !p)} className="studio-btn studio-primary">{playing ? '❚❚ Pause' : '▶ Scroll'}</button>
        <button type="button" onClick={() => { setPlaying(false); onStopCue(); onClose(); }} className="studio-btn studio-muted">✕ Close</button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="relative flex min-h-0 flex-col overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-[#0c1118] to-transparent" />
          <div ref={scroller} className="prompter-scroll min-h-0 flex-1 overflow-y-auto px-6 py-16 sm:px-[8%]" onClick={() => setPlaying((v) => !v)} aria-label="Tap to play or pause scrolling">
            <div className="prompter-script mx-auto max-w-4xl pb-[60vh] leading-[1.65]" style={{ fontSize }} dangerouslySetInnerHTML={{ __html: current.editor_content_html_or_json || '<p>No script yet.</p>' }} />
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/15 bg-[#131b24] px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <button type="button" className="studio-btn studio-muted" disabled={index === 0} onClick={() => setIndex((v) => v - 1)}>← Previous</button>
              <button type="button" className="studio-btn studio-primary" disabled={index === segments.length - 1} onClick={() => setIndex((v) => v + 1)}>Next →</button>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-slate-300 sm:inline">Speed {scrollSpeed}</span>
              <span className="text-slate-300">{fontSize}px</span>
              <span className="text-slate-300 sm:hidden">{duration}</span>
            </div>
          </footer>
        </div>
        <aside className="flex max-h-[32vh] min-h-0 flex-col border-t border-white/15 bg-[#19242e] p-3 lg:max-h-none lg:border-l lg:border-t-0">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-300">Audio cues · {current.audio.length}</h3>
          <div className="space-y-2 overflow-y-auto">
            {current.audio.map((cue) => (
              <button key={cue.id} type="button" className={`w-full rounded-xl border p-3 text-left text-sm transition ${activeCueId === cue.id ? 'border-amber-400 bg-amber-300/15' : 'border-white/15 bg-white/5 hover:bg-white/10'}`} onClick={() => onCue(cue)}>
                <span className="mr-2 text-amber-300">{activeCueId === cue.id ? '■' : '▶'}</span><span className="break-all">{cue.file_name}</span>
              </button>
            ))}
            {!current.audio.length && <p className="text-sm text-slate-400">No cues attached to this segment.</p>}
          </div>
          <p className="mt-auto hidden pt-5 text-xs leading-relaxed text-slate-400 lg:block">Space: pause/resume · ←/→: change segment · Esc: exit. Click the script to pause or resume.</p>
        </aside>
      </div>
    </div>
  );
}
