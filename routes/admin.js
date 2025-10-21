var express = require('express');
var router = express.Router();
const adminController = require('../controller/admincontroller')
const productController = require('../controller/productControls')
const upload = require('../middleware/multer')
const sessionHandle = require('../middleware/adminMiddleWare')

/* GET admin base route */
router.get('/', sessionHandle.isUserLoggedIn, adminController.sentAdminPage);

router.post('/getLoginData', sessionHandle.isUserLoggedIn, adminController.loginfunction)
// dashBoard
router.get('/dashboard', sessionHandle.adminConfirmed, adminController.dashBoardHandle);
//logout
router.get('/logout', adminController.handleLogout);
//users-list
router.get('/users', sessionHandle.adminConfirmed, adminController.displayUsers)
//Disable or enable user
router.post('/users/:id/toggle', sessionHandle.adminConfirmed, adminController.controleUser)
//Add products session needed 
router.get('/add-products', sessionHandle.adminConfirmed, productController.renderAddProduct)
//add products here
router.post('/add-product', upload.array('images', 3), sessionHandle.adminConfirmed, productController.handleAddProduct);
//render catagories
router.get('/categories', sessionHandle.adminConfirmed, productController.renderAddCategories)
//add categories
router.post('/categories/add', sessionHandle.adminConfirmed, productController.addCategories)
//show categories page
router.get('/view-categories', sessionHandle.adminConfirmed, productController.viewCatagories)
//category controll
router.post('/categories/switch/:id', sessionHandle.adminConfirmed, productController.controleCategories)
//view products
router.get('/products', sessionHandle.adminConfirmed, productController.displayProducts)
//enable or disable
router.patch('/products/toggle-status/:productId', sessionHandle.adminConfirmed, productController.productStatus)
//product search
router.get('/products/search', sessionHandle.adminConfirmed, productController.productSearch)
//edit products page render
router.get('/products/edit/:productId', sessionHandle.adminConfirmed, productController.editProductPage)
//edit products
router.post('/edit-product/:productId', sessionHandle.adminConfirmed, upload.array('images', 3), productController.handleEditProduct);
//edit categories view edit pages
router.get('/categories/edit/:Id', sessionHandle.adminConfirmed, productController.editCategories)
router.post('/categories/edit-req', sessionHandle.adminConfirmed, productController.editDataCategories)
//all orders
router.get('/orders',sessionHandle.adminConfirmed,adminController.orderPage)
//edit order
/router.post('/order/updateOrderStatus',sessionHandle.adminConfirmed,adminController.editOrderStatus)
//accept return 
router.post('/orders/update-return-status',sessionHandle.adminConfirmed,adminController.orderAccept)
//update each product
router.post("/orders/update-item-status",sessionHandle.adminConfirmed,adminController.updateItems)
//view offerpage
router.get('/offers',sessionHandle.adminConfirmed,adminController.viewOffer)
///offers/add
router.post('/offers/add',sessionHandle.adminConfirmed,adminController.addOffers)
//disable offer
router.put('/offers/:offerId',sessionHandle.adminConfirmed,adminController.disableOffer)
//view coupons
router.get('/coupons',sessionHandle.adminConfirmed,adminController.couponPage)
//add coupons
router.post('/coupons/add',sessionHandle.adminConfirmed,adminController.addCoupon)
//remoe coupons
router.post('/coupons/delete/:couponId',sessionHandle.adminConfirmed,adminController.deleteCoupon)
//edit coupons
router.post('/coupons/edit/:couponId',sessionHandle.adminConfirmed,adminController.editCoupon)    
module.exports = router;
