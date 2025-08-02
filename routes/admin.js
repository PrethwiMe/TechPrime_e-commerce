var express = require('express');
var router = express.Router();
const adminController=require('../controller/admincontroller')

/* GET admin base route */
router.get('/', adminController.sentAdminPage);

router.post('/getLoginData',adminController.loginfunction)
// dashBoard
router.get('/dashboard',adminController.dashBoardHandle)

module.exports = router;
