import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const handle = searchParams.get('handle') || 'username'
        const name = searchParams.get('name') || handle
        const theme = searchParams.get('theme') || 'STANDARD'

        // テーマに基づいたスタイルと装飾の定義
        let bg = 'white'
        let color = '#333'
        let subColor = '#666'
        let border = 'none'
        let icon = ''
        let containerStyle = {}

        switch (theme) {
            case 'ELEGANT':
                bg = '#FFF5F7'
                color = '#9F1239'
                subColor = '#BE123C'
                border = '8px solid #FFE4E6'
                icon = '✨'
                break
            case 'POP':
                bg = '#FCD34D'
                color = '#000000'
                subColor = '#333333'
                border = '12px solid #000'
                icon = '🌟'
                break
            case 'LUXURY_SAGE':
                bg = '#E0E8E0'
                color = '#2F4F2F'
                subColor = '#556B55'
                border = '8px solid #9CAF9C'
                icon = '🌿'
                break
            case 'LUXURY_GREIGE':
                bg = '#A6A29D'
                color = '#FFFFFF'
                subColor = '#EBE9E5'
                border = '8px solid #EBE9E5'
                icon = '💎'
                break
            case 'LUXURY_NAVY':
                bg = '#182333'
                color = '#FFFFFF'
                subColor = '#C5A065'
                border = '8px solid #C5A065'
                icon = '⚓'
                break
            case 'VALENTINE':
                bg = '#3E2723'
                color = '#FFFFFF'
                subColor = '#FFCDD2'
                border = '8px solid #D32F2F'
                icon = '💝'
                break
            case 'SAKURA':
                bg = '#FCE4EC'
                color = '#880E4F'
                subColor = '#AD1457'
                border = '8px solid #F48FB1'
                icon = '🌸'
                break
            case 'SUMMER':
                bg = '#E1F5FE'
                color = '#0D47A1'
                subColor = '#1565C0'
                border = '8px solid #29B6F6'
                icon = '🌊'
                break
            case 'HALLOWEEN':
                bg = '#4A148C'
                color = '#FF6D00'
                subColor = '#FF9800'
                border = '8px solid #FF6D00'
                icon = '🎃'
                break
            case 'CHRISTMAS':
                bg = '#B71C1C'
                color = '#FFFFFF'
                subColor = '#A5D6A7'
                border = '12px solid #1B5E20'
                icon = '🎄'
                break
            case 'NEW_YEAR':
                bg = '#B71C1C' // 赤
                color = '#FFFFFF'
                subColor = '#FFD54F' // 金
                border = '12px solid #FFFFFF' // 白枠で紅白
                icon = '🎍'
                break
            default: // STANDARD
                bg = 'white'
                color = '#111827'
                subColor = '#6B7280'
                border = '8px solid #E5E7EB'
                icon = '💅'
                break
        }

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: bg,
                        border: border,
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255, 255, 255, 0.15)',
                        padding: '60px 80px',
                        borderRadius: '40px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}>
                        <div style={{
                            fontSize: 100,
                            marginBottom: 20,
                        }}>
                            {icon}
                        </div>
                        <div style={{
                            fontSize: 72,
                            fontWeight: 800,
                            color: color,
                            letterSpacing: '-0.02em',
                            marginBottom: 20,
                            display: 'flex',
                            alignItems: 'center',
                        }}>
                            {name}
                        </div>
                        <div style={{
                            fontSize: 36,
                            color: subColor,
                            fontWeight: 500,
                            letterSpacing: '0.05em',
                            display: 'flex',
                        }}>
                            @{handle}
                        </div>
                    </div>

                    <div style={{
                        position: 'absolute',
                        bottom: 40,
                        right: 50,
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 28,
                        color: subColor,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                    }}>
                        Nail Link
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        )
    } catch (e: any) {
        return new Response(e.message, { status: 500 })
    }
}
