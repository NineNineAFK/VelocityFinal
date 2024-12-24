require("dotenv").config();
const { get } = require("http");
const Cart = require("../model/cart");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const URL = process.env.URL;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PRODUCT_ID_1 = process.env.PRODUCT_ID_1;
const PRODUCT_ID_2 = process.env.PRODUCT_ID_2;

// View Cart Route
const viewCart = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.googleId });

  if (!cart || cart.items.length === 0) {
    // Updated to send JSON response along with HTML
    const cartHTML = "<h1>Your cart is empty.</h1>";
    return res.status(200).json({
      message: "Your cart is empty.",
      totalOriginalPrice: 0,
      totalDiscountedPrice: 0,
      discountAmount: 0,
      discountPercentage: 0,
      items: [],
      cartHTML,
    });
  }

  let totalOriginalPrice = 0;
  let totalDiscountedPrice = 0;
  let discountAmount = 0;
  let discountPercentage = 0;

  // Fetch Stripe coupon details
  const couponCode = req.query.coupon || null; // Assume the coupon code is passed as a query parameter
  if (couponCode) {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      if (coupon.percent_off) {
        discountPercentage = coupon.percent_off;
      } else if (coupon.amount_off) {
        discountAmount = coupon.amount_off / 100; // Convert to dollars
      }
    } catch (error) {
      const cartHTML = "<h1>Invalid Coupon Code</h1>";
      return res.status(400).json({
        message: "Invalid Coupon Code",
        cartHTML,
      });
    }
  }

  // Calculate total and discounted prices
  let cartHTML = `<h1>Your Cart</h1><ul>`;
  const cartItems = cart.items.map((item) => {
    const itemTotalPrice = item.price * item.quantity;
    totalOriginalPrice += itemTotalPrice;

    let itemDiscountedPrice = itemTotalPrice;
    if (discountPercentage) {
      itemDiscountedPrice -= (itemTotalPrice * discountPercentage) / 100;
    } else if (discountAmount) {
      itemDiscountedPrice -= discountAmount;
    }

    itemDiscountedPrice = Math.max(itemDiscountedPrice, 0); // Ensure the price isn't negative
    totalDiscountedPrice += itemDiscountedPrice;

    cartHTML += `
      <li>${item.productName} - $${item.price} x ${item.quantity} = $${itemTotalPrice.toFixed(
      2
    )} 
        <br>Discounted: $${itemDiscountedPrice.toFixed(2)}
        <form action="/cart/cart/decrease" method="POST" style="display:inline;">
          <input type="hidden" name="productName" value="${item.productName}">
          <input type="hidden" name="priceId" value="${item.priceId}">
          <button type="submit">-</button>
        </form>
        <form action="/cart/cart/increase" method="POST" style="display:inline;">
          <input type="hidden" name="productName" value="${item.productName}">
          <input type="hidden" name="priceId" value="${item.priceId}">
          <button type="submit">+</button>
        </form>
      </li>`;

    return {
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      itemTotalPrice,
      itemDiscountedPrice,
    };
  });
  cartHTML += `</ul>`;

  // Add total price and discounted price to HTML
  cartHTML += `
    <h2>Total Price: $${totalOriginalPrice.toFixed(2)}</h2>
    <h2>Discount: ${
      discountPercentage
        ? `${discountPercentage}%`
        : discountAmount
        ? `$${discountAmount.toFixed(2)}`
        : "$0.00"
    }</h2>
    <h2>Discounted Price: $${totalDiscountedPrice.toFixed(2)}</h2>`;

  // Coupon form
  cartHTML += `
    <form action="/cart/cart" method="GET">
      <label for="coupon">Apply Coupon:</label>
      <input type="text" name="coupon" placeholder="Enter coupon code">
      <button type="submit">Apply</button>
    </form>`;

  // Checkout and payment options
  cartHTML += `
    <form action="/checkout" method="POST">
      <input type="hidden" name="CouponCode" value="${couponCode || ''}">
      <input type="submit" value="Buy Now">
    </form>
    <form action="/checkout/choose-payment" method="GET">
      <button type="submit">Choose Payment Method</button>
    </form>`;

    res.send(cartHTML);
};



const viewCartFix = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.googleId });

  if (!cart || cart.items.length === 0) {
    return res.status(200).json({
      msg: "Your Cart is Empty",
      items: [],
    });
  }

  const cartItems = cart.items.map((item, index) => ({
    id: index,
    productName: item.productName,
    quantity: item.quantity,
  }));

  res.status(200).json({
    msg: "Your Cart",
    items: cartItems,
  });
};

// Add to Cart Route
const addToCart = async (req, res) => {
  const { productName, priceId, price } = req.body; // Add price to destructuring

  let cart = await Cart.findOne({ userId: req.user.googleId });

  if (!cart) {
    cart = new Cart({ userId: req.user.googleId, items: [], totalAmount: 0 });
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productName === productName
  );

  if (itemIndex > -1) {
    cart.items[itemIndex].quantity += 1;
  } else {
    cart.items.push({ productName, priceId, price, quantity: 1 }); // Include price here
  }

  await cart.save();
  res.status(200).json({ message: "Item added to cart." });
};

const updateCart = async (req, res) => {
  const { productName } = req.body;

  let cart = await Cart.findOne({ userId: req.user.googleId });

  if (cart) {
    const itemIndex = cart.items.findIndex(
      (item) => item.productName === productName
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += 1;
      await cart.save();
    }
  }

  res.status(200).json({ message: "Cart updated." });
};

const removeFromCart = async (req, res) => {
  const { productName } = req.body;

  let cart = await Cart.findOne({ userId: req.user.googleId });

  if (cart) {
    const itemIndex = cart.items.findIndex(
      (item) => item.productName === productName
    );

    if (itemIndex > -1) {
      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
      } else {
        cart.items.splice(itemIndex, 1); // Remove item if quantity is less than 1
      }
      await cart.save();
    }
  }

  res.status(200).json({ message: "Item removed from cart." });
};

const clearCart = async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.googleId });
  if (!cart) {
    return res.status(404).json({
      msg: "Cart Not Found",
    });
  }

  cart.items = [];
  await cart.save();
  res.status(200).json({ message: "Cart cleared." });
};



const getCartData = async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.googleId });

  if (!cart || cart.items.length === 0) {
    return res.status(200).json({
      message: "Your cart is empty.",
      totalOriginalPrice: 0,
      totalDiscountedPrice: 0,
      discountAmount: 0,
      discountPercentage: 0,
      items: [],
    });
  }

  let totalOriginalPrice = 0;
  let totalDiscountedPrice = 0;
  let discountAmount = 0;
  let discountPercentage = 0;

  const couponCode = req.query.coupon || null;
  if (couponCode) {
    try {
      const coupon = await stripe.coupons.retrieve(couponCode);
      if (coupon.percent_off) {
        discountPercentage = coupon.percent_off;
      } else if (coupon.amount_off) {
        discountAmount = coupon.amount_off / 100;
      }
    } catch (error) {
      return res.status(400).json({ message: "Invalid Coupon Code" });
    }
  }

  const cartItems = cart.items.map((item) => {
    const itemTotalPrice = item.price * item.quantity;
    totalOriginalPrice += itemTotalPrice;

    let itemDiscountedPrice = itemTotalPrice;
    if (discountPercentage) {
      itemDiscountedPrice -= (itemTotalPrice * discountPercentage) / 100;
    } else if (discountAmount) {
      itemDiscountedPrice -= discountAmount;
    }

    itemDiscountedPrice = Math.max(itemDiscountedPrice, 0);
    totalDiscountedPrice += itemDiscountedPrice;

    return {
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      itemTotalPrice,
      itemDiscountedPrice,
    };
  });

  res.status(200).json({
    totalOriginalPrice,
    totalDiscountedPrice,
    discountAmount,
    discountPercentage,
    items: cartItems,
  });
};

// Handle Checkout
const handleCheckout = async (req, res) => {
  const { CouponCode } = req.body;

  const cart = await Cart.findOne({ userId: req.user.googleId });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ msg: "Cart is empty." });
  }

  let discount = null;

  if (CouponCode) {
    try {
      const coupon = await stripe.coupons.retrieve(CouponCode);
      discount = coupon.id;
    } catch (error) {
      return res.status(400).json({ error: "Invalid or expired coupon code." });
    }
  }

  const lineItems = cart.items.map((item) => ({
    price: item.priceId,
    quantity: item.quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      discounts: discount ? [{ coupon: discount }] : undefined,
      success_url: `${URL}/checkout/success`,
      cancel_url: `${URL}/checkout/cancel`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ msg: "Failed to create checkout session." });
  }
};

module.exports = {
  viewCart,
  viewCartFix,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
  handleCheckout,
  getCartData,
 
};
