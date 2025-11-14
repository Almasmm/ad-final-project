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
    const subject = 'Код для восстановления пароля';
    const text = [
        'Вы запросили восстановление пароля в AD Shop.',
        `Код: ${code}`,
        `Он действителен до ${expiresAt.toLocaleString()}.`,
        'Если вы не запрашивали сброс, просто игнорируйте это письмо.',
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

module.exports = { sendResetEmail };
