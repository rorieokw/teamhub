import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  subscribeToUsersPresence,
  getUserStatus,
  getStatusColor,
  getStatusLabel,
} from '../../services/presence';
import StatusSelector from './StatusSelector';
import UserProfileModal from '../profile/UserProfileModal';
import type { User, UserPresence, UserStatus } from '../../types';

interface TeamMember {
  user: User;
  status: UserStatus;
  statusMessage?: string;
}

export default function TeamAvailabilityWidget() {
  const { currentUser } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [myStatus, setMyStatus] = useState<UserStatus>('online');
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: User[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      const userIds = users.map((u) => u.id);

      const presenceUnsubscribe = subscribeToUsersPresence(userIds, (presenceMap) => {
        const members: TeamMember[] = users.map((user) => {
          const presence = presenceMap[user.id] as UserPresence | undefined;
          const status = getUserStatus(presence || null);

          if (user.id === currentUser.uid) {
            setMyStatus(status);
          }

          return {
            user,
            status,
            statusMessage: (presence as { statusMessage?: string })?.statusMessage,
          };
        });

        const statusOrder: Record<UserStatus, number> = {
          online: 0,
          busy: 1,
          away: 2,
          offline: 3,
        };

        members.sort((a, b) => {
          if (a.user.id === currentUser.uid) return -1;
          if (b.user.id === currentUser.uid) return 1;
          return statusOrder[a.status] - statusOrder[b.status];
        });

        setTeamMembers(members);
        setLoading(false);
      });

      return () => presenceUnsubscribe();
    });

    return () => usersUnsubscribe();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/10" />
            <div className="flex-1">
              <div className="h-3 bg-white/10 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const onlineCount = teamMembers.filter((m) => m.status === 'online').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-subtle">{onlineCount} online</span>
        </div>
      </div>

      <div className="space-y-2">
        {teamMembers.slice(0, 5).map((member) => {
          const isCurrentUser = member.user.id === currentUser?.uid;
          const initials = member.user.displayName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <div
              key={member.user.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                isCurrentUser ? 'bg-white/5' : 'hover:bg-white/5'
              } transition-colors`}
            >
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                  style={{
                    background: member.user.nameColor
                      ? `linear-gradient(135deg, ${member.user.nameColor}, ${member.user.nameColor}99)`
                      : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  }}
                >
                  {initials}
                </div>
                {isCurrentUser ? (
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusSelector currentStatus={myStatus} compact />
                  </div>
                ) : (
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(member.status)}`}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => !isCurrentUser && setSelectedUserId(member.user.id)}
                  className={`text-sm text-white/90 truncate block ${!isCurrentUser ? 'hover:underline cursor-pointer' : ''}`}
                >
                  {member.user.displayName}
                  {isCurrentUser && <span className="text-white/50 ml-1">(you)</span>}
                </button>
                <span className={`text-xs ${member.status === 'online' ? 'text-green-400' : 'text-white/40'}`}>
                  {getStatusLabel(member.status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {teamMembers.length > 5 && (
        <p className="text-center text-subtle mt-2">+{teamMembers.length - 5} more</p>
      )}

      {teamMembers.length === 0 && (
        <div className="text-center py-4">
          <p className="empty-state-title">No team members found</p>
          <p className="empty-state-description">Invite your team to get started</p>
        </div>
      )}

      {selectedUserId && (
        <UserProfileModal
          userId={selectedUserId}
          isOpen={!!selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
