import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://vqmhrdjniazlssyywcbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbWhyZGpuaWF6bHNzeXl3Y2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTU4NzksImV4cCI6MjA3NDk5MTg3OX0.wevg4SsCrhb4S_MU03N0-h4AtvMGE0Nz5Kt6pzB_S-o';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getCurrentUser() {
    // UBAH: Gunakan localStorage bukan sessionStorage
    const userId = localStorage.getItem('userId');
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Exception getting current user:', err);
        return null;
    }
}

export async function loginUser(username, password) {
    try {
        // Query untuk mencari user dengan username dan password
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Terjadi kesalahan saat login. Silakan coba lagi.' };
        }

        if (!data) {
            return { success: false, error: 'Username atau password salah' };
        }

        // UBAH: Simpan data user ke localStorage (bukan sessionStorage)
        localStorage.setItem('userId', data.id);
        localStorage.setItem('username', data.username);

        // Mark user as online
        await markUserOnline(data.id, data.username);

        return { success: true, user: data };
    } catch (err) {
        console.error('Exception during login:', err);
        return { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' };
    }
}

export async function signupUser(nik, username, email, password) {
    try {
        // Cek apakah username, email, atau NIK sudah digunakan
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username, email, nik')
            .or(`username.eq.${username},email.eq.${email},nik.eq.${nik}`)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Check existing user error:', checkError);
            return { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' };
        }

        if (existingUser) {
            if (existingUser.username === username) {
                return { success: false, error: 'Username sudah digunakan' };
            }
            if (existingUser.email === email) {
                return { success: false, error: 'Email sudah digunakan' };
            }
            if (existingUser.nik === nik) {
                return { success: false, error: 'NIK sudah digunakan' };
            }
        }

        // Insert user baru
        const { data, error } = await supabase
            .from('users')
            .insert([{ nik, username, email, password }])
            .select()
            .single();

        if (error) {
            console.error('Signup error:', error);
            return { success: false, error: 'Gagal membuat akun. Silakan coba lagi.' };
        }

        return { success: true, user: data };
    } catch (err) {
        console.error('Exception during signup:', err);
        return { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' };
    }
}

export async function logoutUser() {
    try {
        // UBAH: Gunakan localStorage
        const userId = localStorage.getItem('userId');
        if (userId) {
            await supabase
                .from('online_users')
                .delete()
                .eq('user_id', userId);
        }
    } catch (err) {
        console.error('Error during logout:', err);
    } finally {
        // UBAH: Hapus dari localStorage
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = '/login.html';
    }
}

export async function markUserOnline(userId, username) {
    try {
        const { data: existing } = await supabase
            .from('online_users')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('online_users')
                .update({ last_seen: new Date().toISOString() })
                .eq('user_id', userId);
        } else {
            await supabase
                .from('online_users')
                .insert([{ user_id: userId, username }]);
        }
    } catch (err) {
        console.error('Error marking user online:', err);
    }
}

export async function updateUserActivity() {
    // UBAH: Gunakan localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const username = localStorage.getItem('username');
    await markUserOnline(userId, username);
}

export async function getOnlineUsers() {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('online_users')
            .select('username, last_seen')
            .gte('last_seen', fiveMinutesAgo)
            .order('username');

        if (error) {
            console.error('Error getting online users:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception getting online users:', err);
        return [];
    }
}

export function isAuthenticated() {
    // UBAH: Gunakan localStorage
    return localStorage.getItem('userId') !== null;
}

export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}