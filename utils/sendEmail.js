const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Define email options
    const mailOptions = {
      from: `LibraryHub <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html:
        options.html || generateHTMLTemplate(options.subject, options.message),
    };

    //Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Email could not be sent");
  }
};

// Generate HTML email template
const generateHTMLTemplate = (subject, message) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f9f9f9;
            }
          .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }  
          .header {
                text-align: center;
                padding: 20px 0;
                background-color: #3b82f6;
                color: white;
                border-radius: 8px 8px 0 0;
                margin: -20px -20px 20px -20px;
            }
           .logo {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            } 
            .content {
                padding: 20px;
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #3b82f6;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                padding: 20px;
                margin-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .code {
                background-color: #f3f4f6;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 16px;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div>
            <div class="header">
                <div class="logo">LibraryHub</div>
                <h2>${subject}</h2>
            </div>
            <div class="content">
                ${message.replace(/\n/g, "<br>")}
            </div>
            <div class="footer">
                <p>If you didn't request this email, please ignore it.</p>
                <p>&copy; ${new Date().getFullYear()} LibraryHub. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Specific email templates
const emailTemplates = {
  passwordReset: (resetUrl, user) => `
        <h3>Password Reset Request</h3>
        <p>Hello ${user.fullName},</p>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <div class="code">${resetUrl}</div>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
    `,

  welcome: (user) => `
        <h3>Welcome to LibraryHub!</h3>
        <p>Hello ${user.fullName},</p>
        <p>Thank you for joining LibraryHub! Your account has been successfully created.</p>
        <p>You can now:</p>
        <ul>
            <li>Browse our extensive book collection</li>
            <li>Borrow books from our library</li>
            <li>Add books to your favorites</li>
            <li>Write reviews and ratings</li>
        </ul>
        <p>Start exploring our library today!</p>
        <p style="text-align: center">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Get Started</a>
        </p>
    `,

  borrowApproved: (user, book) => {
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 14);
    const formattedReturnDate = returnDate.toLocaleDateString();
    return `
        <h3>Borrow Request Approved</h3>
    <p>Hello ${user.fullName},</p>
    <p>Your request to borrow "<strong>${book.title}</strong>" has been approved!</p>
    <p>Please visit the library to collect your book within the next 24 hours.</p>
    <p><strong>Expected Return Date:</strong> ${formattedReturnDate}</p>
    <p>Thank you for using LibraryHub!</p>
  `;
  },

  borrowRejected: (user, book, reason) => `
    <h3>Borrow Request Update</h3>
    <p>Hello ${user.fullName},</p>
    <p>Your request to borrow "<strong>${
      book.title
    }</strong>" could not be approved at this time.</p>
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
    <p>You can try again later or contact library staff for more information.</p>
    <p>Thank you for your understanding.</p>
  `,
};

module.exports = { sendEmail, emailTemplates };
