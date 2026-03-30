import {useMutation, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import { api } from '@/src/lib/axios';
import { useAuthStore, getAuthState } from '@/src/stores/auth.store';

export function useUpdateProfile() {
    const { user, updateUser } = useAuthStore();
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (data: {
            first_name: string;
            last_name: string;
            phone?: string | undefined;
            position: string;
        }) => {
            const userId = getAuthState().user?.id;

            if (!userId) {
                throw new Error('Usuario no autenticado');
            }
            const payload = Object.fromEntries(
                Object.entries(data).filter(([,v]) =>v !== undefined && v !== '')
            );
            return api.patch(`/users/${userId}`, payload).then((r) => r.data);
            
        } ,
        
        onSuccess: (updated) => {
            updateUser({
                first_name: updated.first_name,
                last_name: updated.last_name,

            });
            qc.invalidateQueries({ queryKey: ['users'] });
            toast.success('Perfil actualizado correctamente.');

        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al actualizar'));
        },
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (data: { current_password?: string; new_password: string  }) =>
            api.patch('/users/me/change-password', data).then((r) => r.data),
        onSuccess: () => {
            toast.success('Contraseña actualizada correctamente.');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message;
            toast.error(Array.isArray(msg) ? msg[0] : (msg ?? 'Error al cambiar la contraseña'));
        },
    });
}