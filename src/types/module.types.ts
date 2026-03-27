export interface AppModule {
  id: string;
  name: string;
  slug: string;
  icon: string;
  route: string;
  order_index: number;
  is_core: boolean;
  is_active: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
}
export interface Notification {
  id: string;
  type: "message" | "system" | "alert";
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    position: string;
  } | null;
}
