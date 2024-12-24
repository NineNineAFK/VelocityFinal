const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.listProducts);
router.get('/:productId', productController.productDetails);
router.get('/info/:productName',productController.getProductInfo);

module.exports = router;
