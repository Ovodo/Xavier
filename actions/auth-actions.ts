'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    // Simple authentication check
    if (username === 'su-' && password === 'su-') {
        // Set authentication cookie
        (await cookies()).set('auth-token', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        redirect('/');
    }

    return { error: 'Invalid credentials' };
}

export async function logout() {
    (await cookies()).delete('auth-token');
    redirect('/login');
}
