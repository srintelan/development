import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://vqmhrdjniazlssyywcbv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbWhyZGpuaWF6bHNzeXl3Y2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTU4NzksImV4cCI6MjA3NDk5MTg3OX0.wevg4SsCrhb4S_MU03N0-h4AtvMGE0Nz5Kt6pzB_S-o';

export const supabase = createClient(supabaseUrl, supabaseKey);

let onlineUsersSubscription = null;
let activityLogsSubscription = null;

export async function getCurrentUser() {
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

        localStorage.setItem('userId', data.id);
        localStorage.setItem('username', data.username);

        await markUserOnline(data.id, data.username);
        await logActivity(data.id, 'LOGIN', 'User logged in');

        return { success: true, user: data };
    } catch (err) {
        console.error('Exception during login:', err);
        return { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' };
    }
}

export async function signupUser(nik, username, email, password) {
    try {
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
        const userId = localStorage.getItem('userId');
        if (userId) {
            await logActivity(userId, 'LOGOUT', 'User logged out');
            
            await supabase
                .from('online_users')
                .delete()
                .eq('user_id', userId);
        }
    } catch (err) {
        console.error('Error during logout:', err);
    } finally {
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
                .insert([{ user_id: userId, username, last_seen: new Date().toISOString() }]);
        }
    } catch (err) {
        console.error('Error marking user online:', err);
    }
}

export async function updateUserActivity() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const username = localStorage.getItem('username');
    await markUserOnline(userId, username);
}

export async function getOnlineUsers() {
    try {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('online_users')
            .select('user_id, username, last_seen')
            .gte('last_seen', twoMinutesAgo)
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

// Activity Logging Functions - FIXED VERSION
export async function logActivity(userId, activityType, description, metadata = null) {
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .insert([{
                user_id: userId,
                activity_type: activityType,
                description: description,
                metadata: metadata,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) {
            console.error('Error logging activity:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
        }
        
        return { success: !error, error };
    } catch (err) {
        console.error('Exception logging activity:', err);
        return { success: false, error: err };
    }
}

export async function getActivityLogs(limit = 50) {
    try {
        console.log('Fetching activity logs...'); // Debug log
        
        // Try simple query first
        const { data, error, count } = await supabase
            .from('activity_logs')
            .select('*, users!activity_logs_user_id_fkey(username, nik)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(limit);

        console.log('Activity logs response:', { data, error, count }); // Debug log

        if (error) {
            console.error('Error getting activity logs:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            // Try alternative query without JOIN if foreign key fails
            const { data: altData, error: altError } = await supabase
                .from('activity_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (altError) {
                console.error('Alternative query also failed:', altError);
                return [];
            }
            
            console.log('Using alternative query, got:', altData?.length, 'records');
            return altData || [];
        }

        console.log('Successfully fetched', data?.length, 'activity logs');
        return data || [];
    } catch (err) {
        console.error('Exception getting activity logs:', err);
        return [];
    }
}

export async function getUserActivityLogs(userId, limit = 20) {
    try {
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error getting user activity logs:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('Exception getting user activity logs:', err);
        return [];
    }
}

// Test function to check activity_logs table
export async function testActivityLogsAccess() {
    try {
        console.log('Testing activity_logs table access...');
        
        const { data, error, count } = await supabase
            .from('activity_logs')
            .select('*', { count: 'exact', head: false })
            .limit(1);
        
        console.log('Test results:', { 
            hasData: !!data, 
            dataLength: data?.length, 
            totalCount: count,
            error: error 
        });
        
        if (error) {
            console.error('Access test failed:', error);
            return { success: false, error };
        }
        
        return { success: true, count, sampleData: data };
    } catch (err) {
        console.error('Test exception:', err);
        return { success: false, error: err };
    }
}

// Realtime Subscriptions
export function subscribeToOnlineUsers(callback) {
    onlineUsersSubscription = supabase
        .channel('online_users_changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'online_users' },
            () => {
                callback();
            }
        )
        .subscribe();
}

export function subscribeToActivityLogs(callback) {
    activityLogsSubscription = supabase
        .channel('activity_logs_changes')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'activity_logs' },
            (payload) => {
                console.log('New activity log received:', payload); // Debug log
                callback(payload.new);
            }
        )
        .subscribe();
}

export function unsubscribeFromOnlineUsers() {
    if (onlineUsersSubscription) {
        supabase.removeChannel(onlineUsersSubscription);
        onlineUsersSubscription = null;
    }
}

export function unsubscribeFromActivityLogs() {
    if (activityLogsSubscription) {
        supabase.removeChannel(activityLogsSubscription);
        activityLogsSubscription = null;
    }
}

// Navigation Tracking
export function trackNavigation(menuName) {
    const userId = localStorage.getItem('userId');
    if (userId) {
        logActivity(userId, 'NAVIGATION', `Accessed ${menuName}`, { menu: menuName });
    }
}

export function isAuthenticated() {
    return localStorage.getItem('userId') !== null;
}

export function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
    }
}

document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
        const userId = localStorage.getItem('userId');
        if (userId) {
            await updateUserActivity();
        }
    } else {
        await updateUserActivity();
    }
});

window.addEventListener('beforeunload', async () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
        const data = JSON.stringify({
            user_id: userId,
            activity_type: 'PAGE_UNLOAD',
            description: 'User left the page',
            created_at: new Date().toISOString()
        });
        
        navigator.sendBeacon(`${supabaseUrl}/rest/v1/activity_logs`, data);
    }
});