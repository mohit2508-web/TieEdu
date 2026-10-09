import React from 'react';
import { useSchool } from '@/context/SchoolContext';
import { Pressable } from '@/components/common/Pressable';

const ProfileScreen: React.FC = () => {
  const { user, school, member, signOut } = useSchool();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>Profile</h1>
      <div className="school-card">
        <span style={{ fontWeight: 700 }}>{user?.name}</span>
        <span style={{ color: 'var(--text-muted)' }}>{school?.name}</span>
        <span style={{ color: 'var(--text-muted)' }}>Class {member?.class_level} • Section {member?.section}</span>
        <span style={{ color: 'var(--text-muted)' }}>Roll {member?.roll_no}</span>
        <span style={{ color: 'var(--text-muted)' }}>XP {user?.xp} • Streak {user?.streak}</span>
      </div>
      <Pressable as="button" onPress={signOut} className="btn-ghost" style={{ padding: '12px 16px', borderRadius: 12 }}>
        Sign out
      </Pressable>
    </div>
  );
};

export default ProfileScreen;