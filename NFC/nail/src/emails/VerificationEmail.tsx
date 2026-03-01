import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Hr,
    Img
} from '@react-email/components';
import * as React from 'react';

interface VerificationEmailProps {
    validationCode: string;
}

export const VerificationEmail = ({
    validationCode,
}: VerificationEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Nail Link ログイン用の認証コードです</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>ログイン認証コード</Heading>

                    <Text style={text}>
                        Nail Linkをご利用いただきありがとうございます。
                        ログインに必要な6桁の認証コード（OTP）は以下の通りです。
                    </Text>

                    <Section style={codeBox}>
                        <Text style={codeText}>{validationCode}</Text>
                    </Section>

                    <Text style={text}>
                        このコードは<strong>10分間</strong>有効です。<br />
                        ログイン画面に戻り、上記のコードを入力してください。
                    </Text>

                    <Text style={warning}>
                        ※このメールに心当たりがない場合は、お手数ですが破棄してください。
                    </Text>

                    <Hr style={hr} />

                    <Text style={footer}>
                        &copy; {new Date().getFullYear()} Nail Link System
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default VerificationEmail;

const main = {
    backgroundColor: '#F5F5F0',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    padding: '40px 0',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '40px 20px',
    borderRadius: '8px',
    border: '1px solid #E5E5E0',
    maxWidth: '480px',
};

const h1 = {
    color: '#5F6F81',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center' as const,
    margin: '0 0 24px',
};

const text = {
    color: '#5F6F81',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 20px',
};

const codeBox = {
    background: '#F9F9F8',
    borderRadius: '8px',
    border: '1px solid #E5E5E0',
    padding: '20px',
    margin: '24px 0',
    textAlign: 'center' as const,
};

const codeText = {
    fontSize: '32px',
    fontWeight: '700',
    letterSpacing: '8px',
    color: '#8D6E63',
    margin: '0',
    fontFamily: 'monospace',
};

const warning = {
    color: '#9CA3AF',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '24px 0 0',
};

const hr = {
    borderColor: '#E5E5E0',
    margin: '32px 0 24px',
};

const footer = {
    color: '#9CA3AF',
    fontSize: '12px',
    textAlign: 'center' as const,
    margin: '0',
};
