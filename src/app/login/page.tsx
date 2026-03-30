'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const handleGoogleLogin = async () => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly'
            }
        })
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-2">Creative OS</h1>
                <p className="text-gray-500 mb-8">Accedi per continuare col tuo account Google.</p>
                <button
                    onClick={handleGoogleLogin}
                    className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors w-full font-medium"
                >
                    Accedi con Google
                </button>
            </div>
        </div>
    )
}
