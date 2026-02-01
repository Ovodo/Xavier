import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if user is authenticated
    const authCookie = request.cookies.get('auth-token');
    const isAuthenticated = authCookie?.value === 'authenticated';

    // Allow access to login page without authentication
    if (pathname === '/login') {
        // If already authenticated, redirect to dashboard
        if (isAuthenticated) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Protect all other routes
    if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
