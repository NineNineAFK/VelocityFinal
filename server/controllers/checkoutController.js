require('dotenv').config();
const axios = require('axios'); // Fix for missing axios
const Order = require("../model/order");
const Cart = require("../model/cart");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const URL = process.env.URL;
//const EMAIL_USER = process.env.EMAIL_USER ;
//const EMAIL_PASS = process.env.EMAIL_PASS;

const processCheckout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.googleId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).send('<h1>Your cart is empty.</h1>');
    }

    const { CouponCode } = req.body; // Retrieve coupon code from the request body
    let discount = null;

    // Validate the coupon
    if (CouponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(CouponCode); // Validate the coupon with Stripe
        discount = coupon.id; // Use the coupon ID for the session
      } catch (error) {
        return res.status(400).json({ error: 'Invalid or expired coupon code.' });
      }
    }

    const lineItems = cart.items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity,
    }));

    // Create Stripe Checkout session with the discount
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      discounts: discount ? [{ coupon: discount }] : undefined, // Apply the coupon if available
      success_url: `${process.env.URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL}/checkout/cancel`,
      metadata: {
        googleId: req.user.googleId, // Pass the user ID as metadata
      },
    });

    // Send the session URL to the client
    res.status(200).json(session.url);
  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({ error: error.message });
  }
};


const checkoutSuccess = async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) {
    return res.status(400).send("Session ID is missing.");
  }

  try {
    // Check if an order with the same sessionId already exists
    const existingOrder = await Order.findOne({ checkoutSessionId: sessionId });
    if (existingOrder) {
      console.log('Order already processed. Redirecting to success page.');
      return res.render('success', {
        downloadLinks: existingOrder.purchasedProducts.map(product => ({
          productName: product.productName,
          link: `http://localhost:3000/download/${product.productId}`,
        })),
        licenseKeys: existingOrder.licenseKeys,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });

    if (session.payment_status === 'paid') {
      const userId = session.metadata.googleId;
      const purchasedProducts = session.line_items.data.map(item => ({
        productId: item.price.id,
        productName: item.description,
      }));

      // Generate license keys for the purchased products     
      const licenseKeys = await Promise.all(
        purchasedProducts.map(async product => {
          let mask;
          if (product.productName === 'Basic Utility') {
            mask = 'BASIC-****-*****-****-****';
          } else if (product.productName === 'Premium utility') {
            mask = 'ADVANCED-****-*****-****-****';
          } else {
            mask = 'UNKNOWN-****-*****-****-****';
          }

          const keyAuthResponse = await axios.get('https://keyauth.win/api/seller/', {
            params: {
              sellerkey: 'bfbc36b3dfc52f830a58c24a2f298a8d',
              type: 'add',
              format: 'json',
              expiry: 10,
              mask,
              amount: 1,
              owner: 'EdmsTKiuld',
              character: 2,
              note: `Generated for ${product.productName}`,
            },
          });
          return { productName: product.productName, licenseKey: keyAuthResponse.data.key };
        })
      );

      // Create a new order in the database
      const order = new Order({
        userId,
        checkoutSessionId: sessionId,
        amount: session.amount_total,
        currency: session.currency,
        status: session.payment_status,
        customerEmail: session.customer_details.email,
        customerName: session.customer_details.name,
        paymentMethodTypes: session.payment_method_types,
        purchasedAt: new Date(),
        purchasedProducts,
        licenseKeys,
      });
      await order.save();

      // Send license keys via email
      sendLicenseKeyEmail(session.customer_details.email, licenseKeys);

      // Prepare download links for the purchased products
      const downloadLinks = purchasedProducts.map(product => ({
        productName: product.productName,
        link: `http://localhost:3000/download/${product.productId}`,
      }));

      // Render the success page with download links and license keys
      res.render('success', { downloadLinks, licenseKeys });
    } else {
      res.status(400).send('Payment not completed.');
    }
  } catch (err) {
    console.error('Error processing success route:', err.message);
    res.status(500).send('An error occurred.');
  }
};

const sendLicenseKeyEmail = (email, licenseKeys) => {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Product License Keys',
    html: `
      <h1>Thank you for your purchase!</h1>
      <p>Here are your license keys:</p>
      <ul>
        ${licenseKeys.map(key => `<li>${key.productName}: ${key.licenseKey}</li>`).join('')}
      </ul>
      <p>Enjoy your products!</p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};



module.exports = { processCheckout, checkoutSuccess };
