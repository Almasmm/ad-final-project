const nodemailer = require('nodemailer');

let transporter;
let transporterReady = false;

function buildTransporter() {
    if (transporterReady) return transporter;

    const {
        MAIL_HOST,
        MAIL_PORT,
        MAIL_SECURE,
        MAIL_USER,
        MAIL_PASS,
        MAIL_FROM,
    } = process.env;

    if (!MAIL_HOST || !MAIL_PORT || !MAIL_USER || !MAIL_PASS || !MAIL_FROM) {
        transporterReady = true;
        transporter = null;
        console.warn('[mailer] SMTP credentials missing. Set MAIL_HOST/PORT/SECURE/USER/PASS/FROM in .env to enable emails.');
        return transporter;
    }

    transporter = nodemailer.createTransport({
        host: MAIL_HOST,
        port: Number(MAIL_PORT),
        secure: MAIL_SECURE === 'true',
        auth: {
            user: MAIL_USER,
            pass: MAIL_PASS,
        },
    });

    transporterReady = true;
    return transporter;
}

async function sendResetEmail({ to, code, expiresAt }) {
    const tx = buildTransporter();
    const subject = 'Password reset code';
    const text = [
        'You requested a password reset in Tenyz Market.',
        `Code: ${code}`,
        `It is valid until ${expiresAt.toLocaleString()}.`,
        'If you did not request this, please ignore this email.',
    ].join('\n');

    if (!tx) {
        console.info(`[mailer] reset code for ${to}: ${code} (expires ${expiresAt.toISOString()})`);
        return false;
    }

    await tx.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
    });

    return true;
}

async function sendVerificationEmail({ to, code, expiresAt }) {
    const tx = buildTransporter();
    const subject = 'Email verification for Tenyz Market';
    const text = [
        'Please verify your email to use Tenyz Market.',
        `Verification code: ${code}`,
        `It is valid until ${expiresAt.toLocaleString()}.`,
    ].join('\n');

    if (!tx) {
        console.info(`[mailer] verification code for ${to}: ${code} (expires ${expiresAt.toISOString()})`);
        return false;
    }

    await tx.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        text,
    });

    return true;
}

module.exports = { sendResetEmail, sendVerificationEmail };
