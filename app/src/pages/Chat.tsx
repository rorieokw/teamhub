import { useState, useEffect, useRef, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToProjects } from '../services/projects';
import {
  subscribeToMessages,
  sendMessage,
  getGeneralChannelId,
  getProjectChannelId,
  getDMChannelId,
  subscribeToLatestMessageTime,
  parseMentions,
} from '../services/messages';
import { subscribeToUsers } from '../services/users';
import {
  subscribeToReadStatus,
  markChannelAsRead,
  hasUnreadMessages,
} from '../services/readStatus';
import { notifyMention } from '../services/notifications';
import { subscribeToUsersPresence, isUserOnline } from '../services/presence';
import { subscribeToUserStats } from '../services/ranks';
import { subscribeToChannelPolls } from '../services/polls';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import RankBadge from '../components/ranks/RankBadge';
import PollCard from '../components/polls/PollCard';
import type { MessageWithReactions, Project, User, UserPresence, Poll } from '../types';

interface Channel {
  id: string;
  name: string;
  type: 'general' | 'project' | 'dm';
  projectId?: string;
  otherUserId?: string; // For DMs
}

export default function Chat() {
  const { currentUser, userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dmChannels, setDmChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [members, setMembers] = useState<Map<string, User>>(new Map());
  const [allMembers, setAllMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [readStatus, setReadStatus] = useState<Record<string, Timestamp>>({});
  const [latestMessages, setLatestMessages] = useState<Record<string, Timestamp | null>>({});
  const [presenceData, setPresenceData] = useState<Record<string, UserPresence>>({});
  const [userRanks, setUserRanks] = useState<Map<string, import('../types').UserStats>>(new Map());
  const [channelPolls, setChannelPolls] = useState<Poll[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to user ranks for all team members
  useEffect(() => {
    if (allMembers.length === 0) return;

    const memberIds = allMembers.map((m) => m.id);
    const unsubscribes: (() => void)[] = [];

    memberIds.forEach((userId) => {
      const unsubscribe = subscribeToUserStats(userId, (stats) => {
        setUserRanks((prev) => {
          const newMap = new Map(prev);
          newMap.set(userId, stats);
          return newMap;
        });
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [allMembers]);

  // Subscribe to projects - show all projects for team chat
  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Build channels list from projects
  useEffect(() => {
    const channelList: Channel[] = [
      { id: getGeneralChannelId(), name: 'general', type: 'general' },
    ];

    projects.forEach((project) => {
      channelList.push({
        id: getProjectChannelId(project.id),
        name: project.name,
        type: 'project',
        projectId: project.id,
      });
    });

    setChannels(channelList);

    // Set default active channel
    if (!activeChannel && channelList.length > 0) {
      setActiveChannel(channelList[0]);
    }
  }, [projects, activeChannel]);

  // Subscribe to messages for active channel
  useEffect(() => {
    if (!activeChannel) return;

    const unsubscribe = subscribeToMessages(activeChannel.id, setMessages);
    return () => unsubscribe();
  }, [activeChannel]);

  // Subscribe to polls for active channel
  useEffect(() => {
    if (!activeChannel) return;

    const unsubscribe = subscribeToChannelPolls(activeChannel.id, setChannelPolls);
    return () => unsubscribe();
  }, [activeChannel]);

  // Subscribe to members for messages (real-time updates for avatars, names, etc.)
  useEffect(() => {
    const senderIds = Array.from(new Set(messages.map((m) => m.senderId)));

    if (senderIds.length === 0) return;

    const unsubscribe = subscribeToUsers(senderIds, setMembers);
    return () => unsubscribe();
  }, [messages.map(m => m.senderId).join(',')]);

  // Subscribe to all members from all projects for @mentions (real-time updates)
  useEffect(() => {
    const allMemberIds = new Set<string>();
    projects.forEach((p) => {
      p.members.forEach((m) => allMemberIds.add(m));
    });

    if (allMemberIds.size === 0) return;

    const unsubscribe = subscribeToUsers(Array.from(allMemberIds), (usersMap) => {
      setAllMembers(Array.from(usersMap.values()));
    });
    return () => unsubscribe();
  }, [projects.map(p => p.members.join(',')).join('|')]);

  // Subscribe to presence data for all members
  useEffect(() => {
    if (allMembers.length === 0) return;

    const memberIds = allMembers.map((m) => m.id);
    const unsubscribe = subscribeToUsersPresence(memberIds, setPresenceData);
    return () => unsubscribe();
  }, [allMembers]);

  // Scroll to bottom on new messages or polls
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, channelPolls]);

  // Subscribe to read status
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToReadStatus(currentUser.uid, setReadStatus);
    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to latest message times for all channels (including DMs)
  useEffect(() => {
    const allChannels = [...channels, ...dmChannels];
    if (allChannels.length === 0) return;

    const unsubscribes = allChannels.map((channel) =>
      subscribeToLatestMessageTime(channel.id, (timestamp) => {
        setLatestMessages((prev) => ({
          ...prev,
          [channel.id]: timestamp,
        }));
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [channels, dmChannels]);

  // Mark channel as read when viewing it
  useEffect(() => {
    if (!currentUser || !activeChannel) return;

    markChannelAsRead(currentUser.uid, activeChannel.id);
  }, [currentUser, activeChannel]);

  // Helper to check if a channel has unread messages
  function channelHasUnread(channelId: string): boolean {
    return hasUnreadMessages(readStatus[channelId], latestMessages[channelId] ?? undefined);
  }

  async function handleSendMessage(content: string, images?: string[]) {
    if (!currentUser || !activeChannel || !userProfile) return;

    // Parse mentions from the message content
    const mentions = parseMentions(content, allMembers);

    // Send the message with mentions and images
    await sendMessage(activeChannel.id, content, currentUser.uid, mentions, images);

    // Send notifications to mentioned users
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== currentUser.uid) {
        await notifyMention(
          mentionedUserId,
          userProfile.displayName,
          activeChannel.name,
          content || '[Image]',
          activeChannel.id
        );
      }
    }
  }

  // Start or open a DM with a user
  function startDM(otherUser: User) {
    if (!currentUser) return;

    const dmChannelId = getDMChannelId(currentUser.uid, otherUser.id);

    // Check if DM channel already exists in our list
    const existingDM = dmChannels.find((dm) => dm.id === dmChannelId);

    if (existingDM) {
      setActiveChannel(existingDM);
    } else {
      // Create new DM channel entry
      const newDMChannel: Channel = {
        id: dmChannelId,
        name: otherUser.displayName,
        type: 'dm',
        otherUserId: otherUser.id,
      };
      setDmChannels((prev) => [...prev, newDMChannel]);
      setActiveChannel(newDMChannel);
    }
  }

  // Get the display name for a DM channel
  function getDMDisplayName(channel: Channel): string {
    if (!channel.otherUserId) return 'Unknown';
    const otherUser = allMembers.find((m) => m.id === channel.otherUserId);
    return otherUser?.displayName || 'Unknown User';
  }

  // Create a combined timeline of messages and polls sorted by timestamp
  type TimelineItem =
    | { type: 'message'; data: MessageWithReactions; timestamp: Timestamp }
    | { type: 'poll'; data: Poll; timestamp: Timestamp };

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add messages
    messages.forEach((msg) => {
      if (msg.createdAt) {
        items.push({ type: 'message', data: msg, timestamp: msg.createdAt });
      }
    });

    // Add polls
    channelPolls.forEach((poll) => {
      if (poll.createdAt) {
        items.push({ type: 'poll', data: poll, timestamp: poll.createdAt });
      }
    });

    // Sort by timestamp (oldest first)
    items.sort((a, b) => {
      const aTime = a.timestamp?.toMillis() || 0;
      const bTime = b.timestamp?.toMillis() || 0;
      return aTime - bTime;
    });

    return items;
  }, [messages, channelPolls]);

  // Check if we should show avatar for a timeline item
  function shouldShowAvatarForTimeline(index: number): boolean {
    if (index === 0) return true;
    const prevItem = timeline[index - 1];
    const currItem = timeline[index];

    // Always show avatar after a poll
    if (prevItem.type === 'poll') return true;
    // Always show avatar before a message if current is a poll
    if (currItem.type === 'poll') return true;

    // For consecutive messages, check if same sender
    if (prevItem.type === 'message' && currItem.type === 'message') {
      return prevItem.data.senderId !== currItem.data.senderId;
    }

    return true;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 mt-3">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full -m-4 md:-m-6 animate-fade-in">
      {/* Channels Sidebar */}
      <div className="w-64 glass-dark border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {/* General Channels */}
          <div className="mb-4">
            <h3 className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Channels
            </h3>
            {channels
              .filter((c) => c.type === 'general')
              .map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2 group ${
                    activeChannel?.id === channel.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-lg opacity-70">#</span>
                  <span className="font-medium">{channel.name}</span>
                  {channelHasUnread(channel.id) && activeChannel?.id !== channel.id && (
                    <span className="ml-auto w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                  )}
                </button>
              ))}
          </div>

          {/* Project Channels */}
          {channels.filter((c) => c.type === 'project').length > 0 && (
            <div>
              <h3 className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </h3>
              {channels
                .filter((c) => c.type === 'project')
                .map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                      activeChannel?.id === channel.id
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="text-lg opacity-70">#</span>
                    <span className="font-medium truncate">{channel.name}</span>
                    {channelHasUnread(channel.id) && activeChannel?.id !== channel.id && (
                      <span className="ml-auto w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 animate-pulse"></span>
                    )}
                  </button>
                ))}
            </div>
          )}

          {/* Direct Messages */}
          <div className="mt-4">
            <h3 className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Direct Messages
            </h3>
            {dmChannels.length === 0 ? (
              <p className="px-3 py-2 text-xs text-gray-600 italic">
                Click a team member to start a conversation
              </p>
            ) : (
              dmChannels.map((dm) => {
                const otherUser = allMembers.find((m) => m.id === dm.otherUserId);
                const presence = dm.otherUserId ? presenceData[dm.otherUserId] : null;
                const online = isUserOnline(presence || null);

                return (
                  <button
                    key={dm.id}
                    onClick={() => setActiveChannel(dm)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-2 ${
                      activeChannel?.id === dm.id
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
                        {otherUser?.avatarUrl ? (
                          otherUser.avatarUrl.startsWith('http') ? (
                            <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm">{otherUser.avatarUrl}</span>
                          )
                        ) : (
                          otherUser?.displayName?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#2d2a4a] ${
                          online ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      ></span>
                    </div>
                    <span className="font-medium truncate">{getDMDisplayName(dm)}</span>
                    {channelHasUnread(dm.id) && activeChannel?.id !== dm.id && (
                      <span className="ml-auto w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 animate-pulse"></span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="p-4 border-t border-white/10">
          <h3 className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Team ({allMembers.length})
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {allMembers.map((member) => {
              const presence = presenceData[member.id];
              const online = isUserOnline(presence);
              const isCurrentUser = member.id === currentUser?.uid;

              const memberStats = userRanks.get(member.id);

              return (
                <button
                  key={member.id}
                  onClick={() => !isCurrentUser && startDM(member)}
                  disabled={isCurrentUser}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${
                    isCurrentUser
                      ? 'cursor-default'
                      : 'hover:bg-white/10 cursor-pointer'
                  }`}
                  title={isCurrentUser ? undefined : `Message ${member.displayName}`}
                >
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
                      {member.avatarUrl ? (
                        member.avatarUrl.startsWith('http') ? (
                          <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">{member.avatarUrl}</span>
                        )
                      ) : (
                        member.displayName?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#2d2a4a] ${
                        online || isCurrentUser ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    ></span>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <span
                      className="font-medium truncate"
                      style={{
                        color: member.nameColor || (online || isCurrentUser ? '#ffffff' : '#6b7280'),
                      }}
                    >
                      {member.displayName}
                      {isCurrentUser && ' (you)'}
                    </span>
                    {memberStats && (
                      <RankBadge rank={memberStats.rank} size="xs" />
                    )}
                  </div>
                  {!isCurrentUser && (
                    <svg className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 px-5 border-b border-white/10 flex items-center gap-3 glass-dark">
          {activeChannel?.type === 'dm' ? (
            <>
              {(() => {
                const otherUser = allMembers.find((m) => m.id === activeChannel.otherUserId);
                const presence = activeChannel.otherUserId ? presenceData[activeChannel.otherUserId] : null;
                const online = isUserOnline(presence || null);
                return (
                  <>
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold overflow-hidden">
                        {otherUser?.avatarUrl ? (
                          otherUser.avatarUrl.startsWith('http') ? (
                            <img src={otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">{otherUser.avatarUrl}</span>
                          )
                        ) : (
                          otherUser?.displayName?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1a2e] ${
                          online ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      ></span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {getDMDisplayName(activeChannel)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {online ? 'Online' : 'Offline'} • Direct Message
                      </p>
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                #
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {activeChannel?.name || 'Select a channel'}
                </h3>
                {activeChannel?.type === 'project' && (
                  <p className="text-xs text-gray-500">Project channel</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto chat-messages-bg">
          {timeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className={`w-20 h-20 mb-4 rounded-2xl flex items-center justify-center ${
                activeChannel?.type === 'dm'
                  ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20'
                  : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
              }`}>
                <svg className={`w-10 h-10 ${activeChannel?.type === 'dm' ? 'text-blue-400' : 'text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {activeChannel?.type === 'dm' ? 'Start the conversation' : 'No messages yet'}
              </h3>
              <p className="text-gray-400 max-w-sm">
                {activeChannel?.type === 'dm' ? (
                  <>Send a private message to <span className="text-blue-400">{getDMDisplayName(activeChannel)}</span></>
                ) : (
                  <>Be the first to send a message in <span className="text-purple-400">#{activeChannel?.name}</span></>
                )}
              </p>
            </div>
          ) : (
            <div className="py-4">
              {timeline.map((item, index) => {
                if (item.type === 'message') {
                  const message = item.data;
                  return (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      sender={members.get(message.senderId)}
                      currentUserId={currentUser?.uid}
                      isOwnMessage={message.senderId === currentUser?.uid}
                      showAvatar={shouldShowAvatarForTimeline(index)}
                      members={allMembers}
                      senderStats={userRanks.get(message.senderId)}
                      onStartDM={(userId) => {
                        const user = allMembers.find((m) => m.id === userId);
                        if (user) startDM(user);
                      }}
                    />
                  );
                } else {
                  const poll = item.data;
                  return (
                    <div key={`poll-${poll.id}`} className="px-5 py-3">
                      <PollCard poll={poll} compact showActions />
                    </div>
                  );
                }
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <ChatInput
          onSend={handleSendMessage}
          channelId={activeChannel?.id || ''}
          projectId={activeChannel?.projectId}
          placeholder={
            activeChannel?.type === 'dm'
              ? `Message ${getDMDisplayName(activeChannel)}...`
              : `Message #${activeChannel?.name || 'channel'}...`
          }
          disabled={!activeChannel}
          users={allMembers}
        />
      </div>
    </div>
  );
}
