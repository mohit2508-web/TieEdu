import React from 'react';
import { useSchool } from '@/context/SchoolContext';

const ProgressScreen: React.FC = () => {
  const { programs, progress, completedCount } = useSchool();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Progress</h1>
      <div className="school-card">
        <span style={{ fontWeight: 700 }}>Completed lessons</span>
        <span style={{ fontSize: 28, fontWeight: 800 }}>{completedCount}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {programs.map((p) => {
          const done = progress[p.program_id] || [];
          return (
            <div key={p.program_id} className="school-card">
              <span style={{ fontWeight: 700 }}>{p.title}</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {done.length}/{p.curriculum.length} lessons
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressScreen;