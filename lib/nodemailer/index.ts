import nodemailer from 'nodemailer';
import {NEWS_SUMMARY_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE} from "@/lib/nodemailer/template";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace('{{name}}', name).replace('{{intro}}', intro);

    const mailOptions = {
        from : `"Trading Signals" <tradingsignals@mail.com>`,
        to: email,
        subject: `Welcome to Trading Signals - your stock market toolkit is ready!`,
        text: 'Thanks for joining Trading Signals!',
        html: htmlTemplate
    }

    await transporter.sendMail(mailOptions);
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContent);

    const mailOptions = {
        from: `"Trading Signals News" <tradingsignalst@mail.com>>`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from Trading Signals`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};