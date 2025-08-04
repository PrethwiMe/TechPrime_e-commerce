var express = require('express');
var router = express.Router();
const adminController=require('../controller/admincontroller')
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
module.exports = router;
