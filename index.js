
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin and Firestore
admin.initializeApp();
const db = admin.firestore();

// Set SendGrid API key
sgMail.setApiKey('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');

// Directly including Twilio credentials
const twilioSid = 'ACe1cb2ebd86d40e20abc79bb7ba89b44f';
const twilioToken = 'd07789676d0663c1074e34238870a248';
const twilioClient = new twilio(twilioSid, twilioToken);

exports.sendDealEmails = functions.firestore
  .document('deals/{dealId}')
  .onCreate(async (snap, context) => {
    const newDeal = snap.data();
    const { location, headline } = newDeal;

    //Twilio number and SendGrid verified sender email
    const fromPhoneNumber = '+18556196358'; // Replace with your Twilio phone number

    const subscribersSnapshot = await db.collection('subscribers')
      .where('watch_regions', 'array-contains-any', location)
      .get();

    if (subscribersSnapshot.empty) {
      console.log('subscribers not found.');
      return;
    }

    const notificationPromises = [];

    subscribersSnapshot.forEach(doc => {
      const subscriber = doc.data();
      // For SMS
      if (subscriber.phoneNumber) {
        const smsMessage = `We have found a new cheap Deal for ${location.join(', ')}: ${headline}`;
        notificationPromises.push(
          twilioClient.messages.create({
            body: smsMessage,
            from: fromPhoneNumber,
            to: subscriber.phoneNumber,
          })
        );
        console.log(`Message has been sent to ${subscriber.phoneNumber}`);
      }
      sendEmail(subscriber.email_address, headline);
    });

    console.log('Emails has been sent to every matching subscribers.');
  });

function sendEmail(email, headline) {
  const msg = {
    to: email, // Change to your recipient
    from: 'kbhosale@iu.edu', // Change to your verified sender
    subject: '[Kiran Bhosale] Cheap Fly Deals!',
    text: `We have a new fly deal for you: ${headline}`,
    html: `<strong>Please find the deal information at: ${headline}</strong>`,
  };

  sgMail.send(msg).then(() => {
    console.log(`Email sent to ${email}`);
  }).catch(error => {
    console.error(error);
  });
}