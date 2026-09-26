"use client";

import RoomChat from "@/app/components/rooms/RoomChat";

export default function RoomPage({ params }: { params: { id: string } }) {
  return <RoomChat roomId={params.id} />;
}
