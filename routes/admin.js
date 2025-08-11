var express = require('express');
var router = express.Router();
const adminController=require('../controller/admincontroller')
const productController=require('../controller/productControls')
const upload = require('../middleware/multer')
const sessionHandle = require('../middleware/adminMiddleWare')

/* GET admin base route */
router.get('/', sessionHandle.isUserLoggedIn ,adminController.sentAdminPage);

router.post('/getLoginData',adminController.loginfunction)
// dashBoard
router.get('/dashboard', sessionHandle.adminConfirmed ,adminController.dashBoardHandle);
//logout
router.get('/logout',adminController.handleLogout);
//users-list
router.get('/users',sessionHandle.adminConfirmed,adminController.displayUsers)
//Disable or enable user
router.post('/users/:id/toggle',adminController.controleUser)
//Add products session needed 
router.get('/add-products',productController.renderAddProduct)
//add products here
router.post('/add-product', upload.array('images', 3), productController.handleAddProduct);
//render catagories
router.get('/categories',productController.renderAddCategories)
//add categories
router.post('/categories/add', productController.addCategories)
//show categories page
router.get('/view-categories',productController.viewCatagories)
//category controll
router.post('/categories/switch/:id',productController.controleCategories)
//view products
router.get('/products',productController.displayProducts)
//enable or disable
router.patch('/products/toggle-status/:productId',productController.productStatus)
//product search
router.get('/products/search',productController.productSearch)
//edit products page render
router.get('/products/edit/:productId',productController.editProductPage)
//edit products
router.post('/edit-product/:productId', upload.array('images', 3), productController.handleEditProduct);


module.exports = router;
