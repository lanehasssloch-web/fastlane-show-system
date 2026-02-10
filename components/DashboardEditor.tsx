'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Dashboard, LibraryCategory, LibraryItem, Segment, SegmentAudio } from '@/lib/types';
import { RichTextEditor } from './RichTextEditor';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SegmentWithAudio = Segment & { audio: (SegmentAudio & { signedUrl?: string })[]; presenterMode?: boolean; playingScroll?: boolean };

function SortableSegment({
  segment,
  onUpdate,
  onDelete,
  onUpload,
  onPlayAudio,
  onTogglePresenter,
  onToggleScroll,
}: {
  segment: SegmentWithAudio;
  onUpdate: (s: Partial<Segment> & { id: string }) => void;
  onDelete: (id: string) => void;
  onUpload: (segmentId: string, files: FileList | null) => void;
  onPlayAudio: (audio: SegmentAudio & { signedUrl?: string }) => void;
  onTogglePresenter: (id: string) => void;
  onToggleScroll: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: segment.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="rounded border bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <button {...attributes} {...listeners} className="rounded border px-2 py-1">↕</button>
        <input
          value={segment.title || ''}
          placeholder="Segment Title"
          onChange={(e) => onUpdate({ id: segment.id, title: e.target.value })}
          className="flex-1 rounded border p-2"
        />
        <button className="rounded border px-2" onClick={() => onUpdate({ id: segment.id, collapsed: !segment.collapsed })}>{segment.collapsed ? 'Expand' : 'Collapse'}</button>
        <button className="rounded border border-red-400 px-2 text-red-700" onClick={() => onDelete(segment.id)}>Delete</button>
      </div>

      {!segment.collapsed && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-h-[28rem]">
            <RichTextEditor
              content={segment.editor_content_html_or_json || '<p></p>'}
              onChange={(html) => onUpdate({ id: segment.id, editor_content_html_or_json: html })}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded border p-3">
              <button className="mb-2 w-full rounded bg-indigo-600 py-2 text-white" onClick={() => onTogglePresenter(segment.id)}>
                Presenter Mode {segment.presenterMode ? 'ON' : 'OFF'}
              </button>
              <button className="w-full rounded border py-2" onClick={() => onToggleScroll(segment.id)}>
                {segment.playingScroll ? 'Pause' : 'Play'}
              </button>
              <div className="mt-3 text-sm">
                <label className="block">Font Size: {segment.presenter_settings_json?.fontSize ?? 28}px</label>
                <input type="range" min={18} max={72} value={segment.presenter_settings_json?.fontSize ?? 28}
                  onChange={(e) => onUpdate({ id: segment.id, presenter_settings_json: { ...(segment.presenter_settings_json || {}), fontSize: Number(e.target.value), scrollSpeed: segment.presenter_settings_json?.scrollSpeed ?? 20 } })}
                  className="w-full"
                />
                <label className="block">Scroll Speed: {segment.presenter_settings_json?.scrollSpeed ?? 20}</label>
                <input type="range" min={5} max={80} value={segment.presenter_settings_json?.scrollSpeed ?? 20}
                  onChange={(e) => onUpdate({ id: segment.id, presenter_settings_json: { ...(segment.presenter_settings_json || {}), scrollSpeed: Number(e.target.value), fontSize: segment.presenter_settings_json?.fontSize ?? 28 } })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="rounded border p-3">
              <label className="mb-2 block font-medium">Upload Audio</label>
              <input type="file" accept="audio/*" multiple onChange={(e) => onUpload(segment.id, e.target.files)} />
              <ul className="mt-3 space-y-2">
                {segment.audio?.map((audio) => (
                  <li key={audio.id} className="flex items-center justify-between rounded border p-2">
                    <span className="truncate pr-2">{audio.file_name}</span>
                    <button className="rounded bg-emerald-600 px-4 py-2 text-white" onClick={() => onPlayAudio(audio)}>
                      Play / Stop
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {segment.presenterMode && (
        <PresenterOverlay segment={segment} onToggleScroll={() => onToggleScroll(segment.id)} />
      )}
    </div>
  );
}

function PresenterOverlay({ segment, onToggleScroll }: { segment: SegmentWithAudio; onToggleScroll: () => void }) {
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (!segment.playingScroll) return;
    const timer = setInterval(() => {
      setScrollTop((s) => s + Math.max(1, (segment.presenter_settings_json?.scrollSpeed ?? 20) / 10));
    }, 60);
    return () => clearInterval(timer);
  }, [segment.playingScroll, segment.presenter_settings_json?.scrollSpeed]);

  return (
    <div className="fixed inset-0 z-40 bg-black/90 p-6 text-white" onClick={onToggleScroll}>
      <div className="mx-auto mb-2 max-w-4xl text-center text-sm">Tap/click text area to toggle pause/resume</div>
      <div className="mx-auto h-[85vh] max-w-4xl overflow-hidden rounded border border-white/20 p-6">
        <div style={{ transform: `translateY(-${scrollTop}px)`, fontSize: `${segment.presenter_settings_json?.fontSize ?? 28}px` }} dangerouslySetInnerHTML={{ __html: segment.editor_content_html_or_json || '' }} />
      </div>
    </div>
  );
}

export function DashboardEditor({ dashboardId }: { dashboardId: string }) {
  const supabase = createSupabaseBrowserClient();
  const sensors = useSensors(useSensor(PointerSensor));
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [segments, setSegments] = useState<SegmentWithAudio[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const [{ data: dash }, { data: segmentRows }, { data: catRows }, { data: itemRows }] = await Promise.all([
      supabase.from('dashboards').select('*').eq('id', dashboardId).single(),
      supabase.from('segments').select('*').eq('dashboard_id', dashboardId).order('order_index'),
      supabase.from('library_categories').select('*').order('order_index'),
      supabase.from('library_items').select('*').order('created_at', { ascending: false }),
    ]);
    setDashboard(dash as Dashboard);

    const segs = (segmentRows || []) as Segment[];
    const audioRows = await supabase
      .from('segment_audio')
      .select('*')
      .in('segment_id', segs.map((s) => s.id).length ? segs.map((s) => s.id) : ['00000000-0000-0000-0000-000000000000']);

    const audioBySegment = new Map<string, (SegmentAudio & { signedUrl?: string })[]>();
    for (const audio of ((audioRows.data || []) as SegmentAudio[])) {
      const { data } = await supabase.storage.from('segment-audio').createSignedUrl(audio.storage_path, 3600);
      const row = { ...audio, signedUrl: data?.signedUrl };
      audioBySegment.set(audio.segment_id, [...(audioBySegment.get(audio.segment_id) || []), row]);
    }

    setSegments(segs.map((s) => ({ ...s, audio: audioBySegment.get(s.id) || [], presenterMode: false, playingScroll: false })));
    setCategories((catRows || []) as LibraryCategory[]);
    setItems((itemRows || []) as LibraryItem[]);
  };

  useEffect(() => { load(); }, [dashboardId]);

  const persistSegment = async (update: Partial<Segment> & { id: string }) => {
    setSegments((prev) => prev.map((s) => (s.id === update.id ? { ...s, ...update } : s)));
    await supabase.from('segments').update(update).eq('id', update.id);
  };

  const addSegment = async () => {
    const nextOrder = segments.length;
    const { data } = await supabase.from('segments').insert({
      dashboard_id: dashboardId,
      title: '',
      order_index: nextOrder,
      collapsed: false,
      editor_content_html_or_json: '<p></p>',
      presenter_settings_json: { fontSize: 28, scrollSpeed: 20 },
    }).select().single();
    if (data) setSegments((prev) => [...prev, { ...(data as Segment), audio: [], presenterMode: false, playingScroll: false }]);
  };

  const deleteSegment = async (id: string) => {
    await supabase.from('segments').delete().eq('id', id);
    setSegments((prev) => prev.filter((s) => s.id !== id));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = segments.findIndex((s) => s.id === active.id);
    const newIndex = segments.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(segments, oldIndex, newIndex).map((s, idx) => ({ ...s, order_index: idx }));
    setSegments(reordered);
    await Promise.all(reordered.map((s) => supabase.from('segments').update({ order_index: s.order_index }).eq('id', s.id)));
  };

  const uploadAudio = async (segmentId: string, files: FileList | null) => {
    if (!files?.length) return;
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user.id;
    if (!uid) return;

    for (const file of Array.from(files)) {
      const storage_path = `${uid}/${segmentId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('segment-audio').upload(storage_path, file, { upsert: false });
      if (error) continue;
      await supabase.from('segment_audio').insert({ segment_id: segmentId, file_name: file.name, storage_path });
    }
    await load();
  };

  const playAudio = (audio: SegmentAudio & { signedUrl?: string }) => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      setActiveAudio(null);
      if (activeAudio.src.includes(audio.storage_path)) return;
    }
    if (!audio.signedUrl) return;
    const el = new Audio(audio.signedUrl);
    el.play();
    setActiveAudio(el);
  };

  const addCategory = async () => {
    const name = prompt('Category name');
    if (!name) return;
    await supabase.from('library_categories').insert({ name, order_index: categories.length });
    await load();
  };

  const renameCategory = async (category: LibraryCategory) => {
    const name = prompt('Rename category', category.name);
    if (!name) return;
    await supabase.from('library_categories').update({ name }).eq('id', category.id);
    await load();
  };

  const addLibraryItem = async () => {
    const title = prompt('Item title');
    if (!title || !categories[0]) return;
    await supabase.from('library_items').insert({
      title,
      category_id: categories[0].id,
      content_html_or_json: '<p>New library copy</p>',
      metadata_json: {},
      status: 'Available',
    });
    await load();
  };

  const insertIntoSegment = async (item: LibraryItem) => {
    if (!selectedSegmentId) {
      alert('Please choose a target segment first.');
      return;
    }
    const segment = segments.find((s) => s.id === selectedSegmentId);
    if (!segment) return;
    const merged = `${segment.editor_content_html_or_json || ''}<hr/>${item.content_html_or_json}`;
    await supabase.from('segments').update({ editor_content_html_or_json: merged }).eq('id', selectedSegmentId);
    await supabase.from('library_items').update({ used_count: item.used_count + 1, last_used_at: new Date().toISOString() }).eq('id', item.id);
    setMsg('Content copied into segment successfully.');
    await load();
  };

  const togglePresenter = (id: string) => {
    setSegments((prev) => prev.map((s) => s.id === id ? { ...s, presenterMode: !s.presenterMode, playingScroll: false } : { ...s, presenterMode: false, playingScroll: false }));
  };

  const toggleScroll = (id: string) => {
    setSegments((prev) => prev.map((s) => s.id === id ? { ...s, playingScroll: !s.playingScroll } : s));
  };

  const groupedItems = useMemo(() => categories.map((cat) => ({ cat, items: items.filter((i) => i.category_id === cat.id) })), [categories, items]);

  return (
    <main className="p-4">
      <h1 className="mb-3 text-2xl font-bold">{dashboard?.name || 'Dashboard'}</h1>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={addSegment} className="rounded bg-blue-600 px-4 py-2 text-white">Add Segment</button>
        <label className="text-sm">Target segment for library insert:</label>
        <select value={selectedSegmentId} onChange={(e) => setSelectedSegmentId(e.target.value)} className="rounded border p-2">
          <option value="">Select segment</option>
          {segments.map((s, idx) => <option key={s.id} value={s.id}>{idx + 1}. {s.title || 'Untitled segment'}</option>)}
        </select>
        {msg && <span className="text-sm text-emerald-700">{msg}</span>}
      </div>

      <div className="mb-6 rounded bg-white p-4 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Global Content Library</h2>
          <div className="space-x-2">
            <button onClick={addCategory} className="rounded border px-3 py-1">Add Category</button>
            <button onClick={addLibraryItem} className="rounded border px-3 py-1">Add Item</button>
          </div>
        </div>
        <div className="space-y-3">
          {groupedItems.map(({ cat, items: catItems }) => (
            <div key={cat.id} className="rounded border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{cat.name}</h3>
                <button onClick={() => renameCategory(cat)} className="rounded border px-2 text-sm">Rename</button>
              </div>
              <ul className="space-y-2">
                {catItems.map((item) => (
                  <li key={item.id} className="rounded border p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs">Status: {item.status}</p>
                      </div>
                      <button onClick={() => insertIntoSegment(item)} className="rounded bg-emerald-600 px-3 py-2 text-white">Insert Into Segment</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={segments.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {segments.map((segment) => (
              <div key={segment.id} onClick={() => setSelectedSegmentId(segment.id)}>
                <SortableSegment
                  segment={segment}
                  onUpdate={persistSegment}
                  onDelete={deleteSegment}
                  onUpload={uploadAudio}
                  onPlayAudio={playAudio}
                  onTogglePresenter={togglePresenter}
                  onToggleScroll={toggleScroll}
                />
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}
