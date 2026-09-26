"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LogOut, Send, Users } from "lucide-react";
import { animalNameFromAnonId } from "@/lib/avatar";
import { getAnonId } from "@/lib/anon";
import {
  fetchMemberCount,
  fetchMembers,
  fetchMessages,
  fetchRoom,
  isMember,
  joinRoom,
  leaveRoom,
  sendMessage,
  type ConversationRoom,
  type RoomMember,
  type RoomMessage,
} from "@/lib/rooms";
import { supabase } from "@/lib/supabase";

type RoomChatProps = {
  roomId: string;
};

type NameMap = Record<string, string>;

export default function RoomChat({ roomId }: RoomChatProps) {
  const [room, setRoom] = useState<ConversationRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<NameMap>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(
    null,
  );
  const myId = useRef<string>("");
  const namesRef = useRef<NameMap>({});
  namesRef.current = names;

  const resolveNames = useCallback(async (userIds: string[]) => {
    const unique = Array.from(new Set(userIds)).filter(Boolean);
    const missing = unique.filter((id) => !namesRef.current[id]);
    if (missing.length === 0) return;

    const next: NameMap = { ...namesRef.current };
    for (const id of missing) {
      next[id] = animalNameFromAnonId(id);
    }
    setNames(next);
  }, []);

  const refresh = useCallback(async () => {
    const [r, msgs, mems, count, member] = await Promise.all([
      fetchRoom(roomId),
      fetchMessages(roomId),
      fetchMembers(roomId),
      fetchMemberCount(roomId),
      isMember(roomId),
    ]);
    setRoom(r);
    setMessages(msgs);
    setMembers(mems);
    setMemberCount(count);
    setJoined(member);
    await resolveNames([
      ...msgs.map((m) => m.user_id),
      ...mems.map((m) => m.user_id),
    ]);
  }, [roomId, resolveNames]);

  useEffect(() => {
    myId.current = getAnonId();
    void (async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load room");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as RoomMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
          void resolveNames([row.user_id]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_members",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          void (async () => {
            const [mems, count, member] = await Promise.all([
              fetchMembers(roomId),
              fetchMemberCount(roomId),
              isMember(roomId),
            ]);
            setMembers(mems);
            setMemberCount(count);
            setJoined(member);
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, resolveNames]);

  useEffect(() => {
    const uid = getAnonId();
    const channel = supabase.channel(`typing:${roomId}`, {
      config: { presence: { key: uid } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          typing?: boolean;
          user_id: string;
        }>();
        const typing = new Set<string>();
        for (const key of Object.keys(state)) {
          for (const meta of state[key]) {
            if (meta.typing && meta.user_id !== myId.current) {
              typing.add(meta.user_id);
            }
          }
        }
        setTypingIds(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: uid, typing: false });
        }
      });

    typingChannelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [roomId]);

  async function setTyping(typing: boolean) {
    const ch = typingChannelRef.current;
    if (!ch) return;
    await ch.track({ user_id: getAnonId(), typing });
  }

  async function handleJoin() {
    try {
      await joinRoom(roomId);
      setJoined(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    }
  }

  async function handleLeave() {
    try {
      await leaveRoom(roomId);
      setJoined(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not leave");
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!joined || sending || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(roomId, draft);
      setDraft("");
      await setTyping(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  const myJoinedAt = members.find((m) => m.user_id === myId.current)?.joined_at;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ol-canvas text-sm text-ol-muted">
        Loading room…
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ol-canvas px-4">
        <p className="text-sm text-ol-muted">Room not found.</p>
        <Link href="/" className="text-sm font-semibold text-ol-ink underline-offset-2 hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ol-canvas">
      <header className="sticky top-0 z-20 border-b border-ol-border bg-ol-surface">
        <div className="mx-auto flex h-nav max-w-feed items-center gap-3 px-3">
          <Link
            href="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ol-muted hover:bg-black/[0.04]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-ol-ink">
              Discussion Room
            </h1>
            <p className="flex items-center gap-1 text-xs text-ol-muted">
              <Users className="h-3 w-3" />
              {memberCount} {memberCount === 1 ? "member" : "members"}
              {!room.active ? " · inactive" : null}
            </p>
          </div>
          {joined ? (
            <button
              type="button"
              onClick={() => void handleLeave()}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-ol-border px-2.5 text-xs font-semibold text-ol-muted hover:bg-black/[0.03]"
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleJoin()}
              className="h-8 rounded-full bg-ol-primary px-3 text-xs font-semibold text-white hover:bg-ol-primary-hover"
            >
              Join Room
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-feed flex-1 flex-col px-3 py-3">
        {myJoinedAt ? (
          <p className="mb-2 text-center text-[11px] text-ol-faint">
            You joined {new Date(myJoinedAt).toLocaleString()}
          </p>
        ) : null}

        {error ? (
          <p
            className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-ol-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="ol-card flex min-h-[50vh] flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-xs text-ol-muted">
                No messages yet. Say hello.
              </p>
            ) : null}
            {messages.map((msg) => {
              const mine = msg.user_id === myId.current;
              return (
                <div
                  key={msg.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-ol-primary text-white"
                        : "bg-neutral-100 text-ol-ink"
                    }`}
                  >
                    {!mine ? (
                      <p className="mb-0.5 font-mono text-[11px] font-semibold opacity-80">
                        {names[msg.user_id] || animalNameFromAnonId(msg.user_id)}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap break-words font-voice">
                      {msg.message}
                    </p>
                    <p
                      className={`mt-1 text-[10px] ${
                        mine ? "text-white/70" : "text-ol-faint"
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {typingIds.size > 0 ? (
            <p className="border-t border-ol-border px-3 py-1.5 text-[11px] text-ol-muted animate-pulse">
              Someone is typing…
            </p>
          ) : null}

          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 border-t border-ol-border p-2"
          >
            <input
              value={draft}
              disabled={!joined || sending || !room.active}
              onChange={(e) => {
                setDraft(e.target.value);
                void setTyping(e.target.value.length > 0);
              }}
              onBlur={() => void setTyping(false)}
              placeholder={
                joined
                  ? room.active
                    ? "Write a message…"
                    : "Room inactive"
                  : "Join to chat"
              }
              className="h-10 min-w-0 flex-1 rounded-full border border-ol-border bg-neutral-50 px-3 text-sm outline-none focus:border-ol-ink focus:bg-white focus:ring-1 focus:ring-ol-ink/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!joined || sending || !draft.trim() || !room.active}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ol-primary text-white transition hover:bg-ol-primary-hover disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
