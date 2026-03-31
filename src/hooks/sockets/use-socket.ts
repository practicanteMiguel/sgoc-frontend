"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAuthStore, getAuthState } from "@/src/stores/auth.store";
import type { Notification } from "@/src/types/module.types";

type NotifResponse = { data: Notification[]; total: number; unread: number };

export function useSocket() {
  const { isAuthenticated } = useAuthStore();
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = getAuthState().accessToken;
    if (!token) return;

   
    const socket = io(
      `${process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3000"}/notifications`,
      {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
      },
    );

    socketRef.current = socket;

    socket.on("notification:new", (notification: Notification) => {
      console.log("[WS] Notificación recibida:", notification.title);

      qc.setQueryData(
        ["notifications", { onlyUnread: false }],
        (old: NotifResponse | undefined): NotifResponse => {
          if (!old) {
            return { data: [notification], total: 1, unread: 1 };
          }

          const exists = old.data.some((n) => n.id === notification.id);
          if (exists) return old;
          return {
            ...old,
            data: [notification, ...old.data],
            total: old.total + 1,
            unread: old.unread + 1,
          };
        },
      );

      qc.setQueryData(
        ["notifications", "unread-count"],
        (old: { count: number } | undefined) => ({
          count: (old?.count ?? 0) + 1,
        }),
      );

      const toastFn =
        notification.priority === "high"
          ? toast.error
          : notification.priority === "medium"
            ? toast.warning
            : toast.info;

      toastFn(notification.title, {
        description:
          notification.message.length > 80
            ? notification.message.slice(0, 80) + "..."
            : notification.message,
        duration: notification.priority === "high" ? 8000 : 5000,
      });
    });

    return () => {
      socket.off("notification:new");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, qc]);

  return socketRef;
}
