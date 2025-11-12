const { name } = require('ejs');
const path = require('path');
const fs = require('fs');
const productModel = require('../model/productModels');
const { getDB } = require('../config/mongodb');
const dbVariables = require('../config/databse');
const paginate = require('../utils/paginate');
const { error } = require('console');
const { ObjectId } = require('mongodb');
const{productValidation} = require('../utils/validation')
// add product
exports.renderAddProduct = async (req, res) => {
  try {
    const categories = await productModel.getAllCategories();
    //res.render('admin-pages/add-products', { categories });
    res.render('admin-pages/add-products', { categories, formData: req.body || {} });

  } catch (error) {
    console.error('Render Error:', error);
    res.status(500).send('Server error while rendering form.');
  }
};

//adding product
exports.handleAddProduct = async (req, res) => {
  try {
    if (!req.files || req.files.length !== 3) {
      return res.json({ error: 'Please upload exactly 3 images.' });
    }
    const {
      name,
      companyDetails,
      description,
      originalPrice,
      categoriesId,
      packageItems,
      OS,
      dimension,
      series,
      isActive,
      variant
    } = req.body;

    const imagePaths = req.files.map(file => '/uploads/products/' + file.filename);

    const productDataForValidation = {
      name,
      description,
      price: parseFloat(originalPrice),
      stock: variant && variant.length > 0 ? parseInt(variant[0].stock) : 0, 
      categoryId: categoriesId,
      brand: companyDetails || '',
      images: imagePaths
    };

    const { error, value } = productValidation(productDataForValidation);
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.json({ error: messages });
    }

    const productData = {
      name,
      companyDetails,
      description,
      images: imagePaths,
      originalPrice: parseFloat(originalPrice),
      categoriesId,
      packageItems,
      OS,
      dimension,
      series,
      isActive: isActive === 'true',
      createdAt: new Date()
    };
    const productResult = await productModel.insertProduct(productData);
    const productId = productResult.insertedId;

    const variantIds = [];
    if (variant && Array.isArray(variant)) {
      for (let v of variant) {
        const variantData = {
          productId,
          processor: v.processor,
          ram: v.ram,
          storage: v.storage,
          graphics: v.graphics,
          color: v.color,
          display: v.display,
          price: parseFloat(v.price),
          stock: parseInt(v.stock)
        };
        const variantResult = await productModel.insertVariant(variantData);
        variantIds.push(variantResult.insertedId);
      }
    }

    await productModel.updateProductVarientsData(productId, variantIds);

    return res.json({
      success: true,
      message: 'Product and variants added successfully',
      productId,
      variantIds
    });

  } catch (err) {
    console.error('Product Upload Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.renderAddCategories = (req, res) => {
  res.render('admin-pages/categories', { error: null })
}



//add catagories
exports.addCategories = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    let { name, description } = req.body;
    const isActive = req.body.isActive === true;

    name = name.toUpperCase();
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    if (!description || description.trim() === '') {
      return res.status(400).json({ success: false, message: "Description is required" });
    }

    const data = {
      name: name.trim(),
      description: description.trim(),
      isActive,
      createdAt: new Date()
    };

    const result = await productModel.insetCategories(data);

    if (result === "exists") {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }

    if (result.insertedId) {
      return res.status(200).json({ success: true, message: "Category added successfully" });
    }

    res.status(500).json({ success: false, message: "Something went wrong" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

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
      res.json({ success: false, message: 'Not updated' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
//diplay products
exports.displayProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";

    const db = getDB();
    const totalDocs = await db
      .collection(dbVariables.productCollection)
      .countDocuments(
        search ? { name: { $regex: search, $options: "i" } } : {}
      );

    const { skip, totalPages } = paginate({ totalDocs, page, limit });

    let data = await productModel.showProducts({ skip, limit, search });
    let varients = await productModel.showVarients();

    res.render("admin-pages/allProducts", {
      data,
      varients,
      page,
      totalPages,
      search
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Server error while loading products.");
  }
};
//product enable or disable tiggle
exports.productStatus = async (req, res) => {
  let id = req.params.productId
  const { isActive } = req.body;

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
//product search
exports.productSearch = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const search = req.query.search || "";

    const db = getDB();
    const totalDocs = await db
      .collection(dbVariables.productCollection)
      .countDocuments(
        search ? { name: { $regex: search, $options: "i" } } : {}
      );

    const { skip, totalPages } = paginate({ totalDocs, page, limit });

    const data = await productModel.showProducts({ skip, limit, search });

    res.render("admin-pages/allProducts", {
      data,
      page,
      totalPages,
      search,
    });
  } catch (error) {
    console.log(error);
  }
}

exports.editProductPage = async (req, res) => {
  let productId = req.params.productId;

  let result = await productModel.showEditProduct(productId);
  //let variantData = await productModel.showVarients(result.variantId)

  let product = result[0]


  let categories = await productModel.showCate()

  res.render('admin-pages/editProduct', { product, categories })

}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let imageUploadStats = {
  totalAttempts: 0,
  failedAttempts: 0,
  failures: [] // { attemptNo, reason }
};
//edit products
exports.handleEditProduct = async (req, res) => {
  try {
    const productId = req.params.productId;

    // Helper to clean repeated or array values
    const cleanValue = (val) => {
      if (Array.isArray(val)) return val[0];
      return val;
    };

    // Normalize input fields
    const name = cleanValue(req.body.name);
    const companyDetails = cleanValue(req.body.companyDetails);
    const description = cleanValue(req.body.description);
    const originalPrice = cleanValue(req.body.originalPrice);
    const categoriesId = cleanValue(req.body.categoriesId);
    const packageItems = cleanValue(req.body.packageItems);
    const OS = cleanValue(req.body.OS);
    const dimension = cleanValue(req.body.dimension);
    const series = cleanValue(req.body.series);
    const isActive = cleanValue(req.body.isActive);
    const variants = req.body.variants; // keep as is if used elsewhere

    // Image logic remains same
    const allImages = [];
    for (let i = 0; i < 3; i++) {
      const slotKey = `slot${i}`;
      const files = req.files && req.files[slotKey];
      if (files && files.length > 0) {
        const newImgPath = '/uploads/products/' + files[0].filename;
        allImages.push(newImgPath);
      } else if (req.body[slotKey]) {
        allImages.push(req.body[slotKey]);
      } else {
        return res.status(400).json({ success: false, message: `Image slot ${i + 1} is required.` });
      }
    }

    if (allImages.length !== 3) {
      return res.status(400).json({ success: false, message: 'Exactly 3 images are required for a product.' });
    }

    // Check if product exists
    const existingProduct = await productModel.showEditProduct(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Build product data for update
    const productData = {
      name,
      companyDetails,
      description,
      images: allImages,
      originalPrice: parseFloat(originalPrice),
      categoriesId,
      packageItems,
      OS,
      dimension,
      series,
      isActive: isActive === 'true' || isActive === true,
      createdAt: new Date()
    };

    // Update product
    await productModel.updateProduct(productId, productData);

    return res.status(200).json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update Product Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};


//edit categories vieew
exports.editCategories = async (req, res) => {
  console.log(req.params.Id);

  try {
    let data = await productModel.showEditCategory(req.params.Id);

    if (!data) {
      return res.redirect('/admin/view-categories'); // if category not found
    }

    res.render('admin-pages/editCategory.ejs', {
      data,
      error: null
    });

  } catch (err) {
    console.error(err);
    res.redirect('/admin/view-categories');
  }
};

exports.editDataCategories = async (req, res) => {

  const { name, description, _id } = req.body;

  // Basic validation
  if (!name || name.trim() === '') {
    let data = await productModel.showEditCategory(_id);
    return res.render('admin-pages/editCategory.ejs', {
      data,
      error: 'Category name is required'
    });
  }

  if (!description || description.trim() === '') {
    let data = await productModel.showEditCategory(_id);
    return res.render('admin-pages/editCategory.ejs', {
      data,
      error: 'Category description is required'
    });
  }

  try {
    let changeCategory = await productModel.updateCategory(req.body);
    res.redirect('/admin/view-categories');

  } catch (err) {
    console.error(err);
    let data = await productModel.showEditCategory(_id);
    res.render('admin-pages/editCategory.ejs', {
      data,
      error: 'Server error while updating category'
    });
  }
};
