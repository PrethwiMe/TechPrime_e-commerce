const { name } = require('ejs');
const path = require('path');
const fs = require('fs');
const productModel = require('../model/productModels');
const { getDB } = require('../config/mongodb');
const dbVariables = require('../config/databse');
const paginate = require('../utils/paginate');
const { error, log } = require('console');
const { ObjectId } = require('mongodb');
const{productValidation,addVariantsValidation} = require('../utils/validation')
const {uploadToCloudinary} = require('../middleware/multer')
const { productEditValidation,variantEditValidation,addVariantValidation } = require('../utils/validation');
const { Status, Message } = require('../utils/constants')

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

exports.handleAddProduct = async (req, res) => {
  try {
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
      variant,
    } = req.body;

   
    const productDataForValidation = {
      name,
      description,
      price: parseFloat(originalPrice),
      stock: variant?.length ? parseInt(variant[0].stock) : 0,
      categoryId: categoriesId,
      brand: companyDetails || "",
      packageItems,
      OS,
      dimension,
      series,
      images: ["dummy1", "dummy2", "dummy3"], 
    };

    const { error: baseError } = productValidation(productDataForValidation);
    if (baseError) {
      return res.json({ error: baseError.details.map((d) => d.message) });
    }


    if (variant && Array.isArray(variant)) {
      for (let v of variant) {
        const variantData = {
          productId: "dummy",
          processor: v.processor,
          ram: v.ram,
          storage: v.storage,
          graphics: v.graphics,
          color: v.color,
          display: v.display,
          price: parseFloat(v.price),
          stock: parseInt(v.stock),
          created: new Date(),
        };

        const { error: variantErr } = addVariantValidation(variantData);
        if (variantErr) {
          return res.json({ error: variantErr.details.map((d) => d.message) });
        }
      }
    }

    if (!req.files || req.files.length !== 3) {
      return res.json({ error: "Please upload exactly 3 images." });
    }


    const imagePaths = [];
    for (const file of req.files) {
      const result = await uploadToCloudinary(file.buffer, "techcart/products");
      imagePaths.push(result.secure_url);
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
      isActive: isActive === "true",
      createdAt: new Date(),
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
          stock: parseInt(v.stock),
          created: new Date(),
        };

        const variantResult = await productModel.insertVariant(variantData);
        variantIds.push(variantResult.insertedId);
      }
    }

  
    await productModel.updateProductVarientsData(productId, variantIds);

    return res.json({
      success: true,
      productId,
      variantIds,
      images: imagePaths,
    });
  } catch (err) {
    console.error("Product Upload Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.renderAddCategories = (req, res) => {
  res.render('admin-pages/categories', { error: null })
}
//add catagories
exports.addCategories = async (req, res) => {
  try {
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
    return res.status(Status.INTERNAL_SERVER_ERROR).json({status:Status.INTERNAL_SERVER_ERROR,message:Message.INTERNAL_ERROR})
  }
};
//add varients
exports.addVarients = async(req,res) => {
  let varients;
  let count=0;
  const productId = req.params.productId
let getProductData = await productModel.addVarient(productId)
 varients =await productModel.getVarients(getProductData._id)

res.render('admin-pages/addVariants.ejs',{product:getProductData || null, variants:varients || null })
}

// add More Variants
exports.addMoreVariants = async (req,res) => {
  try {

    const { error, value } = addVariantsValidation(req.body);
    if(error) return res.status(Status.BAD_REQUEST).json({status:Status.BAD_REQUEST,message:error.details[0].message})
    const { productId,variants} = req.body
    for(let val of variants){
      await productModel.addMoreVarients(productId,val)
    }
    res.status(Status.OK).json({status:Status.OK,message:Message.CREATED})
  } catch (error) {
    res.status(Status.INTERNAL_SERVER_ERROR)
    .json({status:Status.INTERNAL_SERVER_ERROR,message:Message.INTERNAL_ERROR})
  }
}

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
    return res.status(Status.INTERNAL_SERVER_ERROR).json({status:Status.INTERNAL_SERVER_ERROR,message:Message.INTERNAL_ERROR})
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
// let imageUploadStats = {
//   totalAttempts: 0,
//   failedAttempts: 0,
//   failures: [] //
// };

exports.handleEditProduct = async (req, res) => {
  try {

    const productId = req.params.productId;

    const clean = (val) => {
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) return String(val[0] || '').trim();
      return String(val).trim();
    };

    const name           = clean(req.body.name);
    const companyDetails  = clean(req.body.companyDetails);
    const description     = clean(req.body.description);
    const originalPrice   = parseFloat(clean(req.body.originalPrice)) || 0;
    const categoriesId    = clean(req.body.categoriesId);
    const packageItems    = clean(req.body.packageItems);
    const OS              = clean(req.body.OS);
    const dimension       = clean(req.body.dimension);
    const series          = clean(req.body.series);
    const isActive        = clean(req.body.isActive) === 'true';

    const allImages = [];
    for (let i = 0; i < 3; i++) {
      const slotKey = `slot${i}`;
      if (req.files && req.files[slotKey] && req.files[slotKey].length > 0) {
        const file = req.files[slotKey][0];
        const result = await uploadToCloudinary(file.buffer, 'techcart/products');
        allImages.push(result.secure_url);
      } else if (req.body[slotKey]) {
        allImages.push(req.body[slotKey]); 
      } else {
        return res.status(400).json({ success: false, message: `Image slot ${i + 1} is required.` });
      }
    }

    const productData = {
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
      images: allImages,
    };

    const { error } = productEditValidation(productData);
    if (error) {
      const messages = error.details.map(d => d.message);
      return res.status(400).json({ success: false, error: messages });
    }

    await productModel.updateProduct(productId, {
      ...productData,
      updatedAt: new Date(),
    });

    if (req.body.variants && Array.isArray(req.body.variants)) {
      for (const variant of req.body.variants) {
        const variantId = clean(variant._id);
        if (!variantId) continue; 

        const variantData = {
          processor: clean(variant.processor),
          ram:       clean(variant.ram),
          storage:   clean(variant.storage),
          graphics:  clean(variant.graphics),
          color:     clean(variant.color),
          display:   clean(variant.display),
          price:     parseFloat(clean(variant.price)) || 0,
          stock:     parseInt(clean(variant.stock), 10) || 0,
        };

        const{error,value} = variantEditValidation(variantData)
        if (error) {

         return res.status(Status.BAD_REQUEST).json({status:Status.BAD_REQUEST,message:error.details[0].message})
        }

        await productModel.updateVariantByProductId(productId, variantId, variantData);
      }
    }

    return res.status(200).json({ success: true, message: 'Product and variants updated successfully' });

  } catch (error) {
    console.error('Update Product Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
//edit categories vieew
exports.editCategories = async (req, res) => {

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
