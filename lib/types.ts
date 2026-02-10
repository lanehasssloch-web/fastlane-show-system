export type Dashboard = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Segment = {
  id: string;
  dashboard_id: string;
  title: string;
  order_index: number;
  collapsed: boolean;
  editor_content_html_or_json: string;
  presenter_settings_json: {
    fontSize: number;
    scrollSpeed: number;
  };
};

export type SegmentAudio = {
  id: string;
  segment_id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

export type LibraryCategory = {
  id: string;
  user_id: string;
  name: string;
  order_index: number;
};

export type LibraryItem = {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  content_html_or_json: string;
  metadata_json: {
    date?: string;
    tone?: string;
    source?: string;
  };
  status: 'Available' | 'Archived';
  created_at: string;
  last_used_at: string | null;
  used_count: number;
};
