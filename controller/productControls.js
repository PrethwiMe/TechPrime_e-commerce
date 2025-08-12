const { name } = require('ejs');
const path = require('path');
const fs = require('fs');
const productModel = require('../model/productModels');
const { search } = require('../routes/admin');
const { getDB } = require('../config/mongodb');
const dbVariables = require('../config/databse');
const paginate = require('../utils/paginate');
const { error } = require('console');
// add product
exports.renderAddProduct = async (req, res) => {
  try {
    const categories = await productModel.getAllCategories();
    //res.render('admin-pages/add-products', { categories });
    res.render('admin-pages/add-products', {categories ,formData: req.body || {} });

  } catch (error) {
    console.error('Render Error:', error);
    res.status(500).send('Server error while rendering form.');
  }
};

//adding product
exports.handleAddProduct = async (req, res) => {
  try {
    // Image validation
    if (!req.files || req.files.length !== 3) {
      return res.status(400).json({ error: 'Please upload exactly 3 images.' });
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
    if (!name?.trim()) return res.status(400).json({ error: 'Product name is required.' });
    if (!companyDetails?.trim()) return res.status(400).json({ error: 'Company details are required.' });
    if (!description?.trim()) return res.status(400).json({ error: 'Description is required.' });
    if (!catagoriesId?.trim()) return res.status(400).json({ error: 'Category ID is required.' });
    if (!packageItems?.trim()) return res.status(400).json({ error: 'Package items are required.' });
    if (!OS?.trim()) return res.status(400).json({ error: 'OS is required.' });
    if (!dimension?.trim()) return res.status(400).json({ error: 'Dimension is required.' });
    if (!series?.trim()) return res.status(400).json({ error: 'Series is required.' });

    if (!originalPrice || isNaN(originalPrice) || parseFloat(originalPrice) <= 0) {
      return res.status(400).json({ error: 'Original price must be a positive number.' });
    }

    if (!variant || typeof variant !== 'object') {
      return res.status(400).json({ error: 'Variant details are required.' });
    }
    const requiredVariantFields = ['processor', 'ram', 'storage', 'graphics', 'color', 'display', 'price', 'stock'];
    for (let field of requiredVariantFields) {
      if (!variant[field] || (typeof variant[field] === 'string' && !variant[field].trim())) {
        return res.status(400).json({ error: `Variant ${field} is required.` });
      }
    }
    if (isNaN(variant.price) || parseFloat(variant.price) <= 0) {
      return res.status(400).json({ error: 'Variant price must be a positive number.' });
    }
    if (isNaN(variant.stock) || parseInt(variant.stock) < 0) {
      return res.status(400).json({ error: 'Variant stock must be a non-negative integer.' });
    }

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
      createdAt: new Date()
    };

    // Insert product
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

    // Link product with variant
    await productModel.updateProductVariantId(productId, variantId);

    res.json({
      message: 'Product & Variant added successfully!',
      productId,
      variantId
    });

  } catch (err) {
    console.error('Product Upload Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


exports.renderAddCategories = (req, res) => {
  res.render('admin-pages/categories',{error:null})
}
//add catagories
exports.addCategories = async (req, res) => {
  const { name, description, status } = req.body;
  const isActive = req.body.isActive === 'on';

  if (!name || name.trim() === '') {
   return res.render('admin-pages/categories',{error:"Category name is required"})
  }
  if (!description || description.trim() === '') {
    return res.render('admin-pages/categories',{error:"Description is required"})
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
    console.log(error);
    res.send(error);
  }
};

//view categories
exports.viewCatagories = async (req, res) => {
  let categories = await productModel.getAllCategories()

  res.render('admin-pages/viewCategories.ejs', { categories})
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
//product search
exports.productSearch = async (req,res) => {
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

exports.editProductPage = async (req,res) => {
let productId = req.params.productId;

let result = await productModel.showEditProduct(productId);
let variantData = await productModel.showVarients(result.variantId)


let categories = await productModel.showCate()

res.render('admin-pages/editProduct',{result,variantData,categories})


}
//edit products
exports.handleEditProduct = async (req, res) => {
  try {
    const productId = req.params.productId;

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
      variant,
      existingImages
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Product name is required.' });
    console.log("1");
    if (!companyDetails?.trim()) return res.status(400).json({ error: 'Company details are required.' });
    if (!description?.trim()) return res.status(400).json({ error: 'Description is required.' });
    if (!catagoriesId?.trim()) return res.status(400).json({ error: 'Category ID is required.' });
    if (!packageItems?.trim()) return res.status(400).json({ error: 'Package items are required.' });
    if (!OS?.trim()) return res.status(400).json({ error: 'OS is required.' });
    if (!dimension?.trim()) return res.status(400).json({ error: 'Dimension is required.' });
    if (!series?.trim()) return res.status(400).json({ error: 'Series is required.' });
    if (!originalPrice || isNaN(originalPrice) || parseFloat(originalPrice) <= 0) {
      return res.status(400).json({ error: 'Original price must be a positive number.' });
    }
    if (!variant || typeof variant !== 'object') {
      return res.status(400).json({ error: 'Variant details are required.' });
    }
    const requiredVariantFields = ['processor', 'ram', 'storage', 'graphics', 'color', 'display', 'price', 'stock'];
    for (let field of requiredVariantFields) {
      if (!variant[field] || (typeof variant[field] === 'string' && !variant[field].trim())) {
        return res.status(400).json({ error: `Variant ${field} is required.` });
      }
    }
    if (isNaN(variant.price) || parseFloat(variant.price) <= 0) {
      return res.status(400).json({ error: 'Variant price must be a positive number.' });
    }
    if (isNaN(variant.stock) || parseInt(variant.stock) < 0) {
      return res.status(400).json({ error: 'Variant stock must be a non-negative integer.' });
    }

    const existingProduct = await productModel.showEditProduct(productId);
    if (!existingProduct) return res.status(404).json({ error: 'Product not found.' });

    let imagesToKeep = Array.isArray(existingImages)
      ? existingImages.filter(img => existingProduct.images.includes(img))
      : [];



    const imagesRemoved = existingProduct.images.filter(img => !imagesToKeep.includes(img));
    for (let imgPath of imagesRemoved) {
      const fullPath = path.join(__dirname, '..', 'public', imgPath);
      fs.unlink(fullPath, (err) => {
        if (err) console.error('Failed to delete image:', fullPath, err);
      });
    }

    const newImagePaths = req.files ? req.files.map(file => '/uploads/products/' + file.filename) : [];

    const allImages = [...imagesToKeep, ...newImagePaths];

     if (allImages.length < 3) {
      return res.status(400).json({ error: 'At least 3 images are required for a product.' });
    }

    const productData = {
      name,
      companyDetails,
      description,
      images: allImages,
      originalPrice: parseFloat(originalPrice),
      catagoriesId,
      packageItems,
      OS,
      dimension,
      series,
      isActive: isActive === 'true',
    };

   let d= await productModel.updateProduct(productId, productData);

    const variantData = {
      processor: variant.processor,
      ram: variant.ram,
      storage: variant.storage,
      graphics: variant.graphics,
      color: variant.color,
      display: variant.display,
      price: parseFloat(variant.price),
      stock: parseInt(variant.stock),
    };
    await productModel.updateVariantByProductId(productId, variantData);

    res.json({ message: 'Product and variant updated successfully!' });
  } catch (err) {
    console.error('Update Product Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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
  console.log(req.body);

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
    console.log(changeCategory);
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
