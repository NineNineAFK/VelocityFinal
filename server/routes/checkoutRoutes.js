const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const paypalController = require('../controllers/payaplController');
const isAuthenticated = require('../middlewares/isAuthenticated');
const Order = require('../model/order'); // Assuming you have an Order model
const User = require('../model/user');

const { processPayPalCheckout, paypalCheckoutSuccess, paypalCheckoutCancel } = require('../controllers/checkoutController');

const authRoutes = require("../routes/auth")
router.post('/', checkoutController.processCheckout);
router.get('/success', checkoutController.checkoutSuccess);

// New route to send order details to the frontend after successful payment
router.get('/order-summary', async (req, res) => {
    try {
      const userEmail = req.user.email; // Assuming `req.user` contains the authenticated user's details
  
      // Fetch the user details
      const user = await User.findOne({ email: userEmail });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Fetch the orders for the logged-in user using their Google ID
      const orders = await Order.find({ userId: user.googleId });
      if (!orders || orders.length === 0) {
        return res.status(404).json({ error: 'No orders found for this user' });
      }
  
      // Prepare the response
      const response = {
        customer: {
          email: user.email,
          name: user.name,
        },
        orders: orders.map(order => ({
          orderId: order._id,
          paymentMethodTypes: order.paymentMethodTypes,
          purchasedProducts: order.purchasedProducts.map(product => ({
            productName: product.productName,
            licenseKey: order.licenseKeys.find(key => key.productName === product.productName)?.licenseKey,
          })),
        })),
      };
  
      res.json(response);
    } catch (error) {
      console.error('Error fetching order summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
// PayPal Routes
router.post('/paypal', paypalController.processPayPalCheckout);
router.get('/paypal/success', paypalController.paypalCheckoutSuccess);
router.get('/paypal/cancel', paypalController.paypalCheckoutCancel);
module.exports = router;
