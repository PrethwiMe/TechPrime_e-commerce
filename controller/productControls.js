const { name } = require('ejs');
const productModel = require('../model/productModels')

// add product
exports.renderAddProduct = async (req, res) => {
  try {
    const categories = await productModel.getAllCategories();
    res.render('admin-pages/add-products', { categories });
  } catch (error) {
    console.error('Render Error:', error);
    res.status(500).send('Server error while rendering form.');
  }
};

//adding product
exports.handleAddProduct = async (req, res) => {
  try {
    if (!req.files || req.files.length !== 3) {
      return res.status(400).send('Please upload exactly 3 images.');
    }

    const {
      name,
      companyDetails,
      description,
      originalPrice,
      catagoriesId,
      packageItems,
      OS,
      dimension,
      series,
      isActive,
      variant
    } = req.body;

    const imagePaths = req.files.map(file => '/uploads/products/' + file.filename);

    const productData = {
      name,
      companyDetails,
      description,
      images: imagePaths,
      originalPrice: parseFloat(originalPrice),
      catagoriesId,
      packageItems,
      OS,
      dimension,
      series,
      isActive: isActive === 'true',
      createdAt:new Date()
    };
    const productResult = await productModel.insertProduct(productData);
    const productId = productResult.insertedId;

    const variantData = {
      productId,
      processor: variant.processor,
      ram: variant.ram,
      storage: variant.storage,
      graphics: variant.graphics,
      color: variant.color,
      display: variant.display,
      price: parseFloat(variant.price),
      stock: parseInt(variant.stock)
    };

    const variantResult = await productModel.insertVariant(variantData);
    const variantId = variantResult.insertedId;

    await productModel.updateProductVariantId(productId, variantId);

    res.send(`✅ Product & Variant added successfully!\nProduct ID: ${productId}\nVariant ID: ${variantId}`);
  } catch (err) {
    console.error('Product Upload Error:', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.renderAddCategories = (req, res) => {
  res.render('admin-pages/categories')
}
//add catagories
exports.addCategories = async (req, res) => {
  const  {
    name,
    description,
    status

  }=req.body
const isActive = req.body.isActive === 'on' ? true : false;


  let data = {
    name,
    description,
    isActive,
    createdAt:new Date
  }
  
  try {
    let result = await productModel.insetCategories(data)
    if (result) {
      res.redirect('/admin/view-categories')
    }

  } catch (error) {
    console.log(error);
    res.send(error)

  }

}
//view categories
exports.viewCatagories = async (req, res) => {
  let categories = await productModel.getAllCategories()

  res.render('admin-pages/viewCategories.ejs', { categories })
}
//controll categories
exports.controleCategories = async (req, res) => {
  console.log("call reached here");
  console.log(req.params.id);

  try {
    let result = await productModel.statusOfCategory(req.params.id);

    if (result.modifiedCount === 1) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Not updated' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
//diplay products
exports.displayProducts = async (req,res) =>{
  try {
    let data = await productModel.showProducts()
  let varients = await productModel.showVarients()    
    res.render('admin-pages/allproducts',{data,varients})
    
  } catch (error) {
    console.log(error);
    
  }
}
//product enable or disable tiggle
exports.productStatus = async(req,res) => {
let id=req.params.productId
const{isActive} = req.body;

  try {
    const result = await productModel.toggleProduct(id, isActive);

    if (result.modifiedCount === 1) {
      res.json({ success: true, message: 'Status updated' });
    } else {
      res.json({ success: false, message: 'No changes made' });
    }
  } catch (error) {
    console.error('Toggle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }

}