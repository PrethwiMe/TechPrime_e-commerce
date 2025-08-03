// mongo data 
const dbVariables = require('../config/databse')
const { getDB, connectDB } = require('../config/mongodb')

//admin login data
exports.adminLogin = async (params) => {
    
    const db=getDB();
    let data =await db.collection(dbVariables.adminCollection).findOne({email:params})
    return data

}

//user list fetch
exports.userDataFetch = async() =>{
    const db = getDB();
    return await db.collection(dbVariables.userCollection).find().toArray();

}