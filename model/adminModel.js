// mongo data 
const dbVariables = require('../config/databse')
const { getDB } = require('../config/mongodb')

exports.adminLogin = async (params) => {
    
    const db=getDB();
    let data =await db.collection(dbVariables.adminCollection).findOne({email:params})
    return data

}