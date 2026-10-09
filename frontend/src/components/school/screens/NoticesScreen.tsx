import React from 'react';
import { useSchool } from '@/context/SchoolContext';

const NoticesScreen: React.FC = () => {
  const { notices } = useSchool();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Notices</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notices.map((n) => (
          <div key={n.notice_id} className="school-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>{n.title}</span>
              {n.pinned && <span className="school-pill">Pinned</span>}
            </div>
            <span style={{ color: 'var(--text-muted)' }}>{n.body}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(n.published_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoticesScreen;