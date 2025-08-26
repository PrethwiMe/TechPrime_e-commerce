const { name } = require('ejs');
const path = require('path');
const fs = require('fs');
const productModel = require('../model/productModels');
const { getDB } = require('../config/mongodb');
const dbVariables = require('../config/databse');
const paginate = require('../utils/paginate');
const { error } = require('console');
const { ObjectId } = require('mongodb');
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
      console.log("data is try first");
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
    console.log("data is try bfore validatoin");

    if (!name?.trim()) return res.json({ error: 'Product name is required.' });
    if (!companyDetails?.trim()) return res.json({ error: 'Company details are required.' });
    if (!description?.trim()) return res.json({ error: 'Description is required.' });
    if (!categoriesId?.trim()) return res.json({ error: 'Category ID is required.' });
    if (!packageItems?.trim()) return res.json({ error: 'Package items are required.' });
    if (!OS?.trim()) return res.json({ error: 'OS is required.' });
    if (!dimension?.trim()) return res.json({ error: 'Dimension is required.' });
    if (!series?.trim()) return res.json({ error: 'Series is required.' });
    if (!originalPrice || isNaN(originalPrice) || parseFloat(originalPrice) <= 0) {
      return res.json({ error: 'Original price must be a positive number.' });
    }
    if (!variant) {
      return res.json({ error: 'Variants must be provided as an array.' });
    }
    const requiredVariantFields = ['processor', 'ram', 'storage', 'graphics', 'color', 'display', 'price', 'stock'];
    for (let v of variant) {
      for (let field of requiredVariantFields) {
        if (!v[field] || (typeof v[field] === 'string' && !v[field].trim())) {
          return res.json({ error: `Variant ${field} is required.` });
        }
      }
      if (isNaN(v.price)) {
        return res.json({ error: 'Variant price must be a positive number.' });
      }
      if (isNaN(v.stock)) {
        return res.json({ error: 'Variant stock must be a non-negative integer.' });
      }
    }
    const imagePaths = req.files.map(file => '/uploads/products/' + file.filename);
    console.log("data is try before object");

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
   let data = await productModel.updateProductVarientsData(productId, variantIds);
    if (data) {
      console.log("added to db");
       res.json({
    success: true,
    message: 'Variants added successfully',
    productId,
    variantIds
  })
    }
  } catch (err) {
    console.error('Product Upload Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.renderAddCategories = (req, res) => {
  res.render('admin-pages/categories', { error: null })
}



//add catagories
exports.addCategories = async (req, res) => {
  const { name, description, status } = req.body;
  const isActive = req.body.isActive === 'on';

  if (!name || name.trim() === '') {
    return res.render('admin-pages/categories', { error: "Category name is required" })
  }
  if (!description || description.trim() === '') {
    return res.render('admin-pages/categories', { error: "Description is required" })
  }

  let data = {
    name: name.trim(),
    description: description.trim(),
    isActive,
    createdAt: new Date()
  };

  try {
    let result = await productModel.insetCategories(data);
    if (result) {
      res.redirect('/admin/view-categories');
    }
  } catch (error) {
    res.send(error);
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
      variants,
      existingImages,
    } = req.body;


    if (
      !name || !name.trim() ||
      !companyDetails || !companyDetails.trim() ||
      !description || !description.trim() ||
      !categoriesId || !categoriesId.trim() ||
      !packageItems || !packageItems.trim() ||
      !OS || !OS.trim() ||
      !dimension || !dimension.trim() ||
      !series || !series.trim()
    ) {
      return res.status(400).json({ success: false, message: 'Please fill in all required product fields.' });
    }

    if (!originalPrice || isNaN(originalPrice) || Number(originalPrice) <= 0) {
      return res.status(400).json({ success: false, message: 'Original price must be a positive number.' });
    }

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ success: false, message: 'Variant details are required.' });
    }

    for (let variant of variants) {
      const requiredFields = ['processor', 'ram', 'storage', 'graphics', 'color', 'display', 'price', 'stock'];
      for (let field of requiredFields) {
        if (!variant[field] || (typeof variant[field] === 'string' && !variant[field].trim())) {
          return res.status(400).json({ success: false, message: 'Please fill in all required variant fields.' });
        }
      }
      if (isNaN(variant.price) || Number(variant.price) <= 0) {
        return res.status(400).json({ success: false, message: 'Variant price must be a positive number.' });
      }
      if (isNaN(variant.stock) || Number(variant.stock) < 0) {
        return res.status(400).json({ success: false, message: 'Variant stock must be a non-negative integer.' });
      }
    }

    const existingProduct = await productModel.showEditProduct(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    let allImages = [];

    if (req.files && req.files.length > 0) {
      allImages = req.files.map(file => '/uploads/products/' + file.filename);
    } else {
      allImages = Array.isArray(existingImages) ? existingImages : [];
    }

    if (allImages.length < 3) {
       imageUploadStats.failedAttempts++;
      imageUploadStats.failures.push({ attemptNo: imageUploadStats.totalAttempts, reason: 'Less than 3 images uploaded' });
      console.log('Image Upload Log:', imageUploadStats);
      return res.status(400).json({ success: false, message: 'At least 3 images are required for a product.' });
    }

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
      isActive: isActive === 'true',
      createdAt: new Date()
    };

    let insert = await productModel.updateProduct(productId, productData);

    console.log("Varients", variants);

    for (let variant of variants) {
      const variantData = {
        processor: variant.processor,
        ram: variant.ram,
        storage: variant.storage,
        graphics: variant.graphics,
        color: variant.color,
        display: variant.display,
        price: Number(variant.price),
        stock: Number(variant.stock),

      };

      await productModel.updateVariantByProductId(new ObjectId(productId), new ObjectId(variant._id),
        variantData);
    }

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
