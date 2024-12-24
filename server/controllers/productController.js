const Product = require('../model/product');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); 
const listProducts = async (req, res) => {
    try {
        res.render('products', { 
            product1: process.env.PRODUCT_ID_1, 
            product2: process.env.PRODUCT_ID_2 ,
            totalAmount: 0, // Default when cart is empty
            discountedAmount: 0, // Default when no coupon applied
            couponError: null,
            couponCode: req.query.coupon || ''
          });  // You can replace this with rendering a view if needed
        
    } catch (error) {
        res.status(500).send('An error occurred while fetching products');
    }
};

const productDetails = async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.json(product);  // You can replace this with rendering a view if needed
    } catch (error) {
        res.status(500).send('An error occurred while fetching product details');
    }
};

// Controller to get product price by its name
// Controller to get product price from the price ID stored in .env file
const getProductInfo = async (req, res) => {
    const productName = req.params.productName;
  
    try {
      // Fetch the price ID from .env based on the product name
      const priceIdEnvVar = `PRODUCT_ID_${productName.toUpperCase()}`;  // Convert product name to uppercase
      const priceId = process.env[priceIdEnvVar];  // Fetch price ID from .env
  
      if (!priceId) {
        return res.status(404).json({ error: 'Price ID for the product not found' });
      }
  
      // Fetch price information from Stripe using the price ID
      const stripePrice = await stripe.prices.retrieve(priceId);
      const price = stripePrice.unit_amount / 100;  // Convert from cents to dollars
  

      const stripeProduct = await stripe.products.retrieve(stripePrice.product);
      const productNameFromStripe = stripeProduct.name;

      // Log the product info (name and price)
      console.log(`Product: ${productName}, Price ID: ${priceId}, Price: $${price}`);
  
      // Return product info (name and price) to the frontend
      res.json({
        name: productNameFromStripe,
        price: price,
        priceId: priceId
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };
  
module.exports = {
    listProducts,
    productDetails,
    getProductInfo,
};
