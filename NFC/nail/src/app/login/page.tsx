'use client'

import { useState } from 'react'
import { sendOtp, loginWithOtp } from '@/actions/auth'

export default function LoginPage() {
    const [step, setStep] = useState<'email' | 'otp'>('email')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSendOtp(formData: FormData) {
        setLoading(true)
        setError('')
        const res = await sendOtp(formData)
        setLoading(false)
        if (res?.error) {
            setError(res.error)
        } else {
            setStep('otp')
        }
    }

    async function handleLogin(formData: FormData) {
        setLoading(true)
        setError('')
        // Append email from state since it might not be in the form if we switched steps effectively?
        // Actually we can include it as hidden input
        const res = await loginWithOtp(formData)
        setLoading(false)
        if (res?.error) {
            setError(res.error)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0] p-4 font-sans text-[#5F6F81]">
            <div className="w-full max-w-sm">

                {/* Header / Logo Area */}
                <div className="text-center mb-10">
                    <p className="text-sm tracking-widest uppercase text-[#8D6E63] mb-2">Nail Link System</p>
                    <h1 className="text-3xl font-serif font-medium text-[#5F6F81]">ログイン</h1>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-8 border border-white">
                    {step === 'email' ? (
                        <form action={handleSendOtp} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold tracking-wide text-[#5F6F81] mb-2 uppercase">メールアドレス</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#F9F9F8] border border-[#E5E5E0] rounded-lg focus:ring-1 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none transition-all placeholder-gray-300"
                                    placeholder="salon@example.com"
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#5F6F81] text-white py-3 rounded-lg hover:bg-[#4B5563] transition-colors disabled:opacity-50 font-medium tracking-wide shadow-sm"
                            >
                                {loading ? '送信中...' : '認証コードを送信'}
                            </button>
                        </form>
                    ) : (
                        <form action={handleLogin} className="space-y-6">
                            <input type="hidden" name="email" value={email} />
                            <div className="text-center mb-6">
                                <p className="text-sm text-gray-500 mb-1">認証コードを送信しました</p>
                                <p className="font-medium text-[#5F6F81]">{email}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold tracking-wide text-[#5F6F81] mb-2 uppercase">認証コード (OTP)</label>
                                <input
                                    name="otp"
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-[#F9F9F8] border border-[#E5E5E0] rounded-lg focus:ring-1 focus:ring-[#8D6E63] focus:border-[#8D6E63] outline-none text-center text-3xl font-mono tracking-[0.5em] text-[#5F6F81]"
                                    placeholder="000000"
                                    autoFocus
                                    maxLength={6}
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</p>}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#8D6E63] text-white py-3 rounded-lg hover:bg-[#7d5f54] transition-colors disabled:opacity-50 font-medium tracking-wide shadow-sm"
                            >
                                {loading ? 'ログイン中...' : 'ログイン'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('email')}
                                className="w-full text-xs text-gray-400 hover:text-[#5F6F81] transition-colors mt-4"
                            >
                                メールアドレスを変更する
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-xs text-gray-400 mt-8">
                    &copy; 2026 Nail Link System
                </p>
            </div>
        </div>
    )
}
