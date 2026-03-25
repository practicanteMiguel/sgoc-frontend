import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Combina clases de Tailwind sin conflictos
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatea fecha a string legible
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

// Obtiene las iniciales de un nombre completo
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Traduce el slug del rol a nombre legible
export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coordinator: "Coordinador",
  module_manager: "Encargado de Módulo",
  supervisor: "Supervisor",
};

// Traduce la prioridad de notificación
export const PRIORITY_LABELS: Record<string, string> = {
  low: "Informativo",
  medium: "Media prioridad",
  high: "Urgente",
};
